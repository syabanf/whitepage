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

type Projects struct {
	pool           *pgxpool.Pool
	logger         *slog.Logger
	platformDomain string
}

func NewProjects(pool *pgxpool.Pool, logger *slog.Logger, platformDomain string) *Projects {
	return &Projects{pool: pool, logger: logger, platformDomain: platformDomain}
}

type projectDTO struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	Slug          string    `json:"slug"`
	Name          string    `json:"name"`
	PrimaryDomain *string   `json:"primaryDomain"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func scanProject(row pgx.Row) (projectDTO, error) {
	var p projectDTO
	err := row.Scan(&p.ID, &p.TenantID, &p.Slug, &p.Name, &p.PrimaryDomain, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

const projectCols = `id, tenant_id, slug, name, primary_domain, created_at, updated_at`

func (h *Projects) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	rows, err := h.pool.Query(r.Context(),
		`SELECT `+projectCols+` FROM projects WHERE tenant_id = $1 ORDER BY created_at`, tenantID)
	if err != nil {
		h.logger.Error("list projects", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list projects"))
		return
	}
	defer rows.Close()
	items := make([]projectDTO, 0)
	for rows.Next() {
		if p, err := scanProject(rows); err == nil {
			items = append(items, p)
		}
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Projects) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "projectId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid projectId"))
		return
	}
	p, err := scanProject(h.pool.QueryRow(r.Context(),
		`SELECT `+projectCols+` FROM projects WHERE id = $1 AND tenant_id = $2`, id, tenantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "project not found"))
			return
		}
		h.logger.Error("get project", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load project"))
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

type projectCreate struct {
	Name          string  `json:"name"`
	Slug          string  `json:"slug"`
	PrimaryDomain *string `json:"primaryDomain"`
}

func (h *Projects) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	userID, _ := UserIDFromContext(r.Context())

	var req projectCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Slug = strings.TrimSpace(req.Slug)
	if req.Name == "" || req.Slug == "" {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "name and slug are required"))
		return
	}

	p, err := scanProject(h.pool.QueryRow(r.Context(), `
		INSERT INTO projects (tenant_id, slug, name, primary_domain, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+projectCols, tenantID, req.Slug, req.Name, req.PrimaryDomain, userID))
	if err != nil {
		if strings.Contains(err.Error(), "projects_tenant_slug_idx") {
			WriteJSON(w, http.StatusConflict, errBody("slug_taken", "a project with that slug already exists"))
			return
		}
		h.logger.Error("create project", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create project"))
		return
	}

	// Auto-assign the platform subdomain: {tenant-slug}-{project-slug}.{platform}.
	if _, err := h.pool.Exec(r.Context(), `
		INSERT INTO domains (project_id, hostname, type, status, is_primary)
		SELECT $1, (SELECT slug FROM tenants WHERE id = $2) || '-' || $3 || '.' || $4, 'subdomain', 'active', true
		ON CONFLICT DO NOTHING
	`, p.ID, tenantID, req.Slug, h.platformDomain); err != nil {
		h.logger.Warn("auto subdomain create", "err", err, "project", p.ID)
	}

	WriteJSON(w, http.StatusCreated, p)
}
