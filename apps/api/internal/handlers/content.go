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

type Content struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewContent(pool *pgxpool.Pool, logger *slog.Logger) *Content {
	return &Content{pool: pool, logger: logger}
}

type entryDTO struct {
	ID          uuid.UUID       `json:"id"`
	TenantID    uuid.UUID       `json:"tenantId"`
	Type        string          `json:"type"`
	Slug        *string         `json:"slug"`
	Title       string          `json:"title"`
	Status      string          `json:"status"`
	Body        json.RawMessage `json:"body"`
	Seo         json.RawMessage `json:"seo"`
	PublishedAt *time.Time      `json:"publishedAt"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

func (c *Content) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := TenantIDFromContext(r.Context())
	if !ok {
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "no tenant in context"))
		return
	}

	typeFilter := r.URL.Query().Get("type")
	statusFilter := r.URL.Query().Get("status")
	projectFilter := r.URL.Query().Get("projectId")

	q := `
		SELECT id, tenant_id, type, slug, status::text, title, body, seo, published_at, created_at, updated_at
		FROM content_entries
		WHERE tenant_id = $1
	`
	args := []any{tenantID}
	if typeFilter != "" {
		q += " AND type = $" + intToStr(len(args)+1)
		args = append(args, typeFilter)
	}
	if statusFilter != "" {
		q += " AND status = $" + intToStr(len(args)+1) + "::content_status"
		args = append(args, statusFilter)
	}
	if projectFilter != "" {
		q += " AND project_id = $" + intToStr(len(args)+1) + "::uuid"
		args = append(args, projectFilter)
	}
	q += " ORDER BY updated_at DESC LIMIT 200"

	rows, err := c.pool.Query(r.Context(), q, args...)
	if err != nil {
		c.logger.Error("list entries", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list entries"))
		return
	}
	defer rows.Close()

	items := make([]entryDTO, 0)
	for rows.Next() {
		var e entryDTO
		if err := rows.Scan(&e.ID, &e.TenantID, &e.Type, &e.Slug, &e.Status, &e.Title, &e.Body, &e.Seo, &e.PublishedAt, &e.CreatedAt, &e.UpdatedAt); err != nil {
			c.logger.Error("scan entry", "err", err)
			continue
		}
		items = append(items, e)
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (c *Content) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid entryId"))
		return
	}

	var e entryDTO
	err = c.pool.QueryRow(r.Context(), `
		SELECT id, tenant_id, type, slug, status::text, title, body, seo, published_at, created_at, updated_at
		FROM content_entries
		WHERE id = $1 AND tenant_id = $2
	`, entryID, tenantID).Scan(&e.ID, &e.TenantID, &e.Type, &e.Slug, &e.Status, &e.Title, &e.Body, &e.Seo, &e.PublishedAt, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "entry not found"))
			return
		}
		c.logger.Error("get entry", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load entry"))
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

type entryUpdate struct {
	Title  *string          `json:"title,omitempty"`
	Slug   *string          `json:"slug,omitempty"`
	Status *string          `json:"status,omitempty"`
	Body   *json.RawMessage `json:"body,omitempty"`
	Seo    *json.RawMessage `json:"seo,omitempty"`
}

func (c *Content) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	userID, _ := UserIDFromContext(r.Context())
	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid entryId"))
		return
	}

	var req entryUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}

	// Dynamic SET clause based on what was provided.
	setClauses := []string{"updated_by = $1"}
	args := []any{userID}
	idx := 2
	if req.Title != nil {
		setClauses = append(setClauses, "title = $"+intToStr(idx))
		args = append(args, *req.Title)
		idx++
	}
	if req.Slug != nil {
		setClauses = append(setClauses, "slug = $"+intToStr(idx))
		args = append(args, *req.Slug)
		idx++
	}
	if req.Status != nil {
		setClauses = append(setClauses, "status = $"+intToStr(idx)+"::content_status")
		args = append(args, *req.Status)
		idx++
		// Stamp first-publish time so the renderer (which gates on publishedAt) shows it.
		if *req.Status == "published" {
			setClauses = append(setClauses, "published_at = COALESCE(published_at, now())")
		}
	}
	if req.Body != nil {
		setClauses = append(setClauses, "body = $"+intToStr(idx)+"::jsonb")
		args = append(args, string(*req.Body))
		idx++
	}
	if req.Seo != nil {
		setClauses = append(setClauses, "seo = $"+intToStr(idx)+"::jsonb")
		args = append(args, string(*req.Seo))
		idx++
	}

	args = append(args, entryID, tenantID)
	q := "UPDATE content_entries SET " + strings.Join(setClauses, ", ") +
		" WHERE id = $" + intToStr(idx) + " AND tenant_id = $" + intToStr(idx+1) +
		" RETURNING id, tenant_id, type, slug, status::text, title, body, seo, published_at, created_at, updated_at"

	var e entryDTO
	err = c.pool.QueryRow(r.Context(), q, args...).Scan(&e.ID, &e.TenantID, &e.Type, &e.Slug, &e.Status, &e.Title, &e.Body, &e.Seo, &e.PublishedAt, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "entry not found"))
			return
		}
		c.logger.Error("update entry", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not update entry"))
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

type entryCreate struct {
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	Slug      *string `json:"slug"`
	ProjectID *string `json:"projectId"`
	Body      *json.RawMessage `json:"body"`
	Seo       *json.RawMessage `json:"seo"`
}

func (c *Content) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	userID, _ := UserIDFromContext(r.Context())

	var req entryCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	req.Type = strings.TrimSpace(req.Type)
	req.Title = strings.TrimSpace(req.Title)
	if req.Type != "page" && req.Type != "landing_page" {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "type must be page or landing_page"))
		return
	}
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
	var projectID any
	if req.ProjectID != nil && strings.TrimSpace(*req.ProjectID) != "" {
		projectID = strings.TrimSpace(*req.ProjectID)
	}

	var e entryDTO
	// Use the requested project if it belongs to this tenant, else the main project.
	err := c.pool.QueryRow(r.Context(), `
		INSERT INTO content_entries (tenant_id, project_id, type, slug, status, title, body, seo, created_by, updated_by)
		VALUES (
			$1,
			COALESCE(
				(SELECT id FROM projects WHERE tenant_id = $1 AND id = $8::uuid),
				(SELECT id FROM projects WHERE tenant_id = $1 AND slug = 'main' LIMIT 1)
			),
			$2, $3, 'draft', $4, $5::jsonb, $6::jsonb, $7, $7)
		RETURNING id, tenant_id, type, slug, status::text, title, body, seo, published_at, created_at, updated_at
	`, tenantID, req.Type, slug, req.Title, body, seo, userID, projectID).
		Scan(&e.ID, &e.TenantID, &e.Type, &e.Slug, &e.Status, &e.Title, &e.Body, &e.Seo, &e.PublishedAt, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		// Unique violation on (tenant, type, slug)
		if strings.Contains(err.Error(), "content_entries_tenant_type_slug_idx") {
			WriteJSON(w, http.StatusConflict, errBody("slug_taken", "a page with that slug already exists"))
			return
		}
		c.logger.Error("create entry", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create entry"))
		return
	}
	WriteJSON(w, http.StatusCreated, e)
}

func (c *Content) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid entryId"))
		return
	}
	cmd, err := c.pool.Exec(r.Context(),
		`DELETE FROM content_entries WHERE id = $1 AND tenant_id = $2`, entryID, tenantID)
	if err != nil {
		c.logger.Error("delete entry", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not delete entry"))
		return
	}
	if cmd.RowsAffected() == 0 {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "entry not found"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// PreviewByID returns an entry (any status) plus its tenant. Token-guarded;
// consumed by the renderer's draft-preview route. Not tenant-scoped in the URL.
func (c *Content) PreviewByID(w http.ResponseWriter, r *http.Request) {
	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid entryId"))
		return
	}

	var e entryDTO
	var tName, tSlug string
	var tPrimary *string
	err = c.pool.QueryRow(r.Context(), `
		SELECT e.id, e.tenant_id, e.type, e.slug, e.status::text, e.title, e.body, e.seo,
		       e.published_at, e.created_at, e.updated_at,
		       t.name, t.slug, t.primary_domain
		FROM content_entries e
		JOIN tenants t ON t.id = e.tenant_id
		WHERE e.id = $1
	`, entryID).Scan(&e.ID, &e.TenantID, &e.Type, &e.Slug, &e.Status, &e.Title, &e.Body, &e.Seo,
		&e.PublishedAt, &e.CreatedAt, &e.UpdatedAt, &tName, &tSlug, &tPrimary)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "entry not found"))
			return
		}
		c.logger.Error("preview entry", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load entry"))
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"tenant": map[string]any{
			"id":            e.TenantID,
			"name":          tName,
			"slug":          tSlug,
			"primaryDomain": tPrimary,
		},
		"entry": e,
	})
}

func intToStr(i int) string {
	// Tiny strconv shim — keeps imports light at the call site.
	const digits = "0123456789"
	if i == 0 {
		return "0"
	}
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	buf := make([]byte, 0, 10)
	for i > 0 {
		buf = append([]byte{digits[i%10]}, buf...)
		i /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}
