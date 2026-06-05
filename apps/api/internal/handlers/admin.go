package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Admin struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewAdmin(pool *pgxpool.Pool, logger *slog.Logger) *Admin {
	return &Admin{pool: pool, logger: logger}
}

func (a *Admin) Stats(w http.ResponseWriter, r *http.Request) {
	var s struct {
		Tenants          int `json:"tenants"`
		Users            int `json:"users"`
		PlatformAdmins   int `json:"platformAdmins"`
		Projects         int `json:"projects"`
		WebPages         int `json:"webPages"`
		PublishedPages   int `json:"publishedPages"`
		Articles         int `json:"articles"`
		Comments         int `json:"comments"`
		PendingComments  int `json:"pendingComments"`
		LivePublishes    int `json:"livePublishes"`
		FailedPublishes  int `json:"failedPublishes"`
	}
	err := a.pool.QueryRow(r.Context(), `
		SELECT
			(SELECT count(*) FROM tenants),
			(SELECT count(*) FROM users),
			(SELECT count(*) FROM users WHERE is_platform_admin),
			(SELECT count(*) FROM projects),
			(SELECT count(*) FROM web_pages),
			(SELECT count(*) FROM web_pages WHERE status = 'published'),
			(SELECT count(*) FROM articles),
			(SELECT count(*) FROM comments),
			(SELECT count(*) FROM comments WHERE status = 'pending'),
			(SELECT count(*) FROM publish_snapshots WHERE status = 'live'),
			(SELECT count(*) FROM publish_snapshots WHERE status = 'failed')
	`).Scan(&s.Tenants, &s.Users, &s.PlatformAdmins, &s.Projects, &s.WebPages,
		&s.PublishedPages, &s.Articles, &s.Comments, &s.PendingComments, &s.LivePublishes, &s.FailedPublishes)
	if err != nil {
		a.logger.Error("admin stats", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load stats"))
		return
	}
	WriteJSON(w, http.StatusOK, s)
}

func (a *Admin) Tenants(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(r.Context(), `
		SELECT t.id, t.slug, t.name, t.created_at,
			(SELECT count(*) FROM projects p WHERE p.tenant_id = t.id),
			(SELECT count(*) FROM memberships m WHERE m.tenant_id = t.id),
			(SELECT count(*) FROM web_pages ce WHERE ce.tenant_id = t.id)
		FROM tenants t
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		a.logger.Error("admin tenants", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list tenants"))
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	for rows.Next() {
		var id uuid.UUID
		var slug, name string
		var createdAt time.Time
		var projects, members, pages int
		if err := rows.Scan(&id, &slug, &name, &createdAt, &projects, &members, &pages); err == nil {
			items = append(items, map[string]any{
				"id": id, "slug": slug, "name": name, "createdAt": createdAt,
				"projects": projects, "members": members, "pages": pages,
			})
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *Admin) Users(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(r.Context(), `
		SELECT u.id, u.email, u.name, u.is_platform_admin, u.last_login_at, u.created_at,
			(SELECT count(*) FROM memberships m WHERE m.user_id = u.id)
		FROM users u
		ORDER BY u.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		a.logger.Error("admin users", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list users"))
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	for rows.Next() {
		var id uuid.UUID
		var email string
		var name *string
		var isAdmin bool
		var lastLogin *time.Time
		var createdAt time.Time
		var workspaces int
		if err := rows.Scan(&id, &email, &name, &isAdmin, &lastLogin, &createdAt, &workspaces); err == nil {
			items = append(items, map[string]any{
				"id": id, "email": email, "name": name, "isPlatformAdmin": isAdmin,
				"lastLoginAt": lastLogin, "createdAt": createdAt, "workspaces": workspaces,
			})
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *Admin) Projects(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(r.Context(), `
		SELECT p.id, p.slug, p.name, p.created_at, t.name,
			(SELECT count(*) FROM web_pages ce WHERE ce.project_id = p.id)
		FROM projects p
		JOIN tenants t ON t.id = p.tenant_id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		a.logger.Error("admin projects", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list projects"))
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	for rows.Next() {
		var id uuid.UUID
		var slug, name, tenantName string
		var createdAt time.Time
		var pages int
		if err := rows.Scan(&id, &slug, &name, &createdAt, &tenantName, &pages); err == nil {
			items = append(items, map[string]any{
				"id": id, "slug": slug, "name": name, "tenantName": tenantName,
				"createdAt": createdAt, "pages": pages,
			})
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

type setAdminReq struct {
	IsPlatformAdmin bool `json:"isPlatformAdmin"`
}

func (a *Admin) SetUserPlatformAdmin(w http.ResponseWriter, r *http.Request) {
	actingUser, _ := UserIDFromContext(r.Context())
	targetID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid userId"))
		return
	}
	var req setAdminReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	// Guard against removing your own admin rights (lockout protection).
	if targetID == actingUser && !req.IsPlatformAdmin {
		WriteJSON(w, http.StatusBadRequest, errBody("self_demote", "you can't remove your own platform-admin access"))
		return
	}
	cmd, err := a.pool.Exec(r.Context(),
		`UPDATE users SET is_platform_admin = $1 WHERE id = $2`, req.IsPlatformAdmin, targetID)
	if err != nil {
		a.logger.Error("set platform admin", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not update user"))
		return
	}
	if cmd.RowsAffected() == 0 {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "user not found"))
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"isPlatformAdmin": req.IsPlatformAdmin})
}
