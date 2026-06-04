package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/netip"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Comments struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewComments(pool *pgxpool.Pool, logger *slog.Logger) *Comments {
	return &Comments{pool: pool, logger: logger}
}

type commentDTO struct {
	ID          uuid.UUID  `json:"id"`
	ArticleID   uuid.UUID  `json:"articleId"`
	ProjectID   uuid.UUID  `json:"projectId"`
	ParentID    *uuid.UUID `json:"parentId"`
	AuthorName  string     `json:"authorName"`
	AuthorEmail *string    `json:"authorEmail"`
	Body        string     `json:"body"`
	Status      string     `json:"status"`
	ArticleTitle *string   `json:"articleTitle,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// ---------------------------------------------------------------------------
// Public submission (no auth). Honeypot field "website" must be empty.
// ---------------------------------------------------------------------------
type commentSubmit struct {
	AuthorName  string `json:"authorName"`
	AuthorEmail string `json:"authorEmail"`
	Body        string `json:"body"`
	Website     string `json:"website"` // honeypot
}

func (h *Comments) Submit(w http.ResponseWriter, r *http.Request) {
	articleID, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid articleId"))
		return
	}
	var req commentSubmit
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}

	// Honeypot tripped → pretend success, drop silently.
	if strings.TrimSpace(req.Website) != "" {
		w.WriteHeader(http.StatusAccepted)
		return
	}
	req.AuthorName = strings.TrimSpace(req.AuthorName)
	req.Body = strings.TrimSpace(req.Body)
	if req.AuthorName == "" || req.Body == "" {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "name and comment are required"))
		return
	}

	// Resolve the article's project; only published articles accept comments.
	var projectID uuid.UUID
	err = h.pool.QueryRow(r.Context(),
		`SELECT project_id FROM articles WHERE id = $1 AND status = 'published'`, articleID).Scan(&projectID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "article not found"))
			return
		}
		h.logger.Error("comment article lookup", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not submit comment"))
		return
	}

	var email any
	if strings.TrimSpace(req.AuthorEmail) != "" {
		email = strings.TrimSpace(req.AuthorEmail)
	}
	var ip any
	if addr, err := netip.ParseAddr(clientIP(r)); err == nil {
		ip = addr.String()
	}

	if _, err := h.pool.Exec(r.Context(), `
		INSERT INTO comments (article_id, project_id, author_name, author_email, body, status, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
	`, articleID, projectID, req.AuthorName, email, req.Body, ip, r.UserAgent()); err != nil {
		h.logger.Error("insert comment", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not submit comment"))
		return
	}

	// 202: received, awaiting moderation.
	WriteJSON(w, http.StatusAccepted, map[string]string{"status": "pending_moderation"})
}

// ---------------------------------------------------------------------------
// Moderation (tenant-scoped, auth required)
// ---------------------------------------------------------------------------
func (h *Comments) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	status := r.URL.Query().Get("status") // optional filter

	q := `
		SELECT c.id, c.article_id, c.project_id, c.parent_id, c.author_name, c.author_email,
		       c.body, c.status::text, a.title, c.created_at
		FROM comments c
		JOIN articles a ON a.id = c.article_id
		WHERE c.project_id IN (SELECT id FROM projects WHERE tenant_id = $1)`
	args := []any{tenantID}
	if status != "" {
		q += " AND c.status = $2::comment_status"
		args = append(args, status)
	}
	q += " ORDER BY c.created_at DESC LIMIT 200"

	rows, err := h.pool.Query(r.Context(), q, args...)
	if err != nil {
		h.logger.Error("list comments", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list comments"))
		return
	}
	defer rows.Close()
	items := make([]commentDTO, 0)
	for rows.Next() {
		var c commentDTO
		if err := rows.Scan(&c.ID, &c.ArticleID, &c.ProjectID, &c.ParentID, &c.AuthorName, &c.AuthorEmail,
			&c.Body, &c.Status, &c.ArticleTitle, &c.CreatedAt); err == nil {
			items = append(items, c)
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

type commentModerate struct {
	Status string `json:"status"`
}

func (h *Comments) Moderate(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "commentId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid commentId"))
		return
	}
	var req commentModerate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	switch req.Status {
	case "approved", "pending", "spam", "deleted":
	default:
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "invalid status"))
		return
	}

	cmd, err := h.pool.Exec(r.Context(), `
		UPDATE comments SET status = $1::comment_status
		WHERE id = $2 AND project_id IN (SELECT id FROM projects WHERE tenant_id = $3)
	`, req.Status, id, tenantID)
	if err != nil {
		h.logger.Error("moderate comment", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not update comment"))
		return
	}
	if cmd.RowsAffected() == 0 {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "comment not found"))
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i >= 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	host := r.RemoteAddr
	if i := strings.LastIndexByte(host, ':'); i >= 0 {
		host = host[:i]
	}
	return host
}
