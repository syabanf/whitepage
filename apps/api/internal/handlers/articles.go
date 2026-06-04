package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Articles struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewArticles(pool *pgxpool.Pool, logger *slog.Logger) *Articles {
	return &Articles{pool: pool, logger: logger}
}

type articleDTO struct {
	ID          uuid.UUID       `json:"id"`
	ProjectID   uuid.UUID       `json:"projectId"`
	WebPageID   uuid.UUID       `json:"webPageId"`
	Slug        *string         `json:"slug"`
	Title       string          `json:"title"`
	Status      string          `json:"status"`
	Excerpt     *string         `json:"excerpt"`
	Body        json.RawMessage `json:"body"`
	Seo         json.RawMessage `json:"seo"`
	PublishedAt *time.Time      `json:"publishedAt"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

const articleCols = `id, project_id, web_page_id, slug, title, status::text, excerpt, body, seo, published_at, created_at, updated_at`

func scanArticle(row pgx.Row) (articleDTO, error) {
	var a articleDTO
	err := row.Scan(&a.ID, &a.ProjectID, &a.WebPageID, &a.Slug, &a.Title, &a.Status, &a.Excerpt,
		&a.Body, &a.Seo, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt)
	return a, err
}

// tenantOwnsArticle bounds article access to the requesting tenant's projects.
const articleTenantGuard = `project_id IN (SELECT id FROM projects WHERE tenant_id = $2)`

func (h *Articles) ListForWebPage(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	webPageID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid entryId"))
		return
	}
	rows, err := h.pool.Query(r.Context(),
		`SELECT `+articleCols+` FROM articles WHERE web_page_id = $1 AND `+articleTenantGuard+` ORDER BY updated_at DESC`,
		webPageID, tenantID)
	if err != nil {
		h.logger.Error("list articles", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list articles"))
		return
	}
	defer rows.Close()
	items := make([]articleDTO, 0)
	for rows.Next() {
		if a, err := scanArticle(rows); err == nil {
			items = append(items, a)
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

type articleCreate struct {
	Title   string           `json:"title"`
	Slug    *string          `json:"slug"`
	Excerpt *string          `json:"excerpt"`
	Body    *json.RawMessage `json:"body"`
	Seo     *json.RawMessage `json:"seo"`
}

func (h *Articles) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	userID, _ := UserIDFromContext(r.Context())
	webPageID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid entryId"))
		return
	}

	// Resolve the web page's project (fall back to the tenant's main project).
	var projectID uuid.UUID
	err = h.pool.QueryRow(r.Context(), `
		SELECT COALESCE(
			(SELECT project_id FROM content_entries WHERE id = $1 AND tenant_id = $2),
			(SELECT id FROM projects WHERE tenant_id = $2 AND slug = 'main' LIMIT 1)
		)
	`, webPageID, tenantID).Scan(&projectID)
	if err != nil || projectID == uuid.Nil {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "web page not found in this tenant"))
		return
	}

	var req articleCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "title is required"))
		return
	}
	body := `{"sections":[]}`
	if req.Body != nil {
		body = string(*req.Body)
	}
	seo := `{}`
	if req.Seo != nil {
		seo = string(*req.Seo)
	}
	var slug any
	if req.Slug != nil && strings.TrimSpace(*req.Slug) != "" {
		slug = strings.TrimSpace(*req.Slug)
	}

	a, err := scanArticle(h.pool.QueryRow(r.Context(), `
		INSERT INTO articles (project_id, web_page_id, slug, title, status, excerpt, body, seo, author_user_id)
		VALUES ($1, $2, $3, $4, 'draft', $5, $6::jsonb, $7::jsonb, $8)
		RETURNING `+articleCols, projectID, webPageID, slug, req.Title, req.Excerpt, body, seo, userID))
	if err != nil {
		if strings.Contains(err.Error(), "articles_page_slug_idx") {
			WriteJSON(w, http.StatusConflict, errBody("slug_taken", "an article with that slug already exists on this page"))
			return
		}
		h.logger.Error("create article", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create article"))
		return
	}
	WriteJSON(w, http.StatusCreated, a)
}

func (h *Articles) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid articleId"))
		return
	}
	a, err := scanArticle(h.pool.QueryRow(r.Context(),
		`SELECT `+articleCols+` FROM articles WHERE id = $1 AND `+articleTenantGuard, id, tenantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "article not found"))
			return
		}
		h.logger.Error("get article", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load article"))
		return
	}
	WriteJSON(w, http.StatusOK, a)
}

type articleUpdate struct {
	Title   *string          `json:"title,omitempty"`
	Slug    *string          `json:"slug,omitempty"`
	Status  *string          `json:"status,omitempty"`
	Excerpt *string          `json:"excerpt,omitempty"`
	Body    *json.RawMessage `json:"body,omitempty"`
	Seo     *json.RawMessage `json:"seo,omitempty"`
}

func (h *Articles) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid articleId"))
		return
	}
	var req articleUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}

	set := []string{}
	args := []any{}
	idx := 1
	add := func(expr string, val any) {
		set = append(set, expr+" = $"+intToStr(idx))
		args = append(args, val)
		idx++
	}
	if req.Title != nil {
		add("title", *req.Title)
	}
	if req.Slug != nil {
		add("slug", *req.Slug)
	}
	if req.Status != nil {
		set = append(set, "status = $"+intToStr(idx)+"::content_status")
		args = append(args, *req.Status)
		idx++
		// publish timestamp bookkeeping
		if *req.Status == "published" {
			set = append(set, "published_at = COALESCE(published_at, now())")
		}
	}
	if req.Excerpt != nil {
		add("excerpt", *req.Excerpt)
	}
	if req.Body != nil {
		set = append(set, "body = $"+intToStr(idx)+"::jsonb")
		args = append(args, string(*req.Body))
		idx++
	}
	if req.Seo != nil {
		set = append(set, "seo = $"+intToStr(idx)+"::jsonb")
		args = append(args, string(*req.Seo))
		idx++
	}
	if len(set) == 0 {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "no fields to update"))
		return
	}

	args = append(args, id, tenantID)
	q := "UPDATE articles SET " + strings.Join(set, ", ") +
		" WHERE id = $" + intToStr(idx) + " AND project_id IN (SELECT id FROM projects WHERE tenant_id = $" + intToStr(idx+1) + ")" +
		" RETURNING " + articleCols

	a, err := scanArticle(h.pool.QueryRow(r.Context(), q, args...))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "article not found"))
			return
		}
		if strings.Contains(err.Error(), "articles_page_slug_idx") {
			WriteJSON(w, http.StatusConflict, errBody("slug_taken", "an article with that slug already exists on this page"))
			return
		}
		h.logger.Error("update article", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not update article"))
		return
	}
	WriteJSON(w, http.StatusOK, a)
}

// PreviewByID returns an article (any status) + its tenant, in the same
// {tenant, entry} shape the renderer's web-page preview uses. Token-guarded.
func (h *Articles) PreviewByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid articleId"))
		return
	}
	var a articleDTO
	var tName, tSlug string
	var tPrimary *string
	err = h.pool.QueryRow(r.Context(), `
		SELECT a.id, a.project_id, a.web_page_id, a.slug, a.title, a.status::text, a.excerpt,
		       a.body, a.seo, a.published_at, a.created_at, a.updated_at,
		       t.name, t.slug, t.primary_domain
		FROM articles a
		JOIN projects p ON p.id = a.project_id
		JOIN tenants t ON t.id = p.tenant_id
		WHERE a.id = $1
	`, id).Scan(&a.ID, &a.ProjectID, &a.WebPageID, &a.Slug, &a.Title, &a.Status, &a.Excerpt,
		&a.Body, &a.Seo, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt, &tName, &tSlug, &tPrimary)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "article not found"))
			return
		}
		h.logger.Error("preview article", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load article"))
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"tenant": map[string]any{
			"id": a.ProjectID, "name": tName, "slug": tSlug, "primaryDomain": tPrimary,
		},
		"entry": map[string]any{
			"id": a.ID, "type": "article", "slug": a.Slug, "title": a.Title,
			"body": a.Body, "seo": a.Seo, "publishedAt": a.PublishedAt,
		},
	})
}

func (h *Articles) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid articleId"))
		return
	}
	cmd, err := h.pool.Exec(r.Context(),
		`DELETE FROM articles WHERE id = $1 AND `+articleTenantGuard, id, tenantID)
	if err != nil {
		h.logger.Error("delete article", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not delete article"))
		return
	}
	if cmd.RowsAffected() == 0 {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "article not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
