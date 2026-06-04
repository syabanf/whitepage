package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/syabanf/company-profile-cms/apps/api/internal/jobs"
)

type Publishes struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
	queue  *jobs.Runtime
}

func NewPublishes(pool *pgxpool.Pool, logger *slog.Logger, queue *jobs.Runtime) *Publishes {
	return &Publishes{pool: pool, logger: logger, queue: queue}
}

type publishDTO struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	Status       string     `json:"status"`
	TriggeredBy  *uuid.UUID `json:"triggeredBy"`
	BuildLog     *string    `json:"buildLog"`
	ArtifactKey  *string    `json:"artifactKey"`
	StartedAt    *time.Time `json:"startedAt"`
	FinishedAt   *time.Time `json:"finishedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
}

func (p *Publishes) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	projectFilter := r.URL.Query().Get("projectId")

	q := `
		SELECT id, tenant_id, status::text, triggered_by, build_log, artifact_key, started_at, finished_at, created_at
		FROM publish_snapshots
		WHERE tenant_id = $1`
	args := []any{tenantID}
	if projectFilter != "" {
		q += " AND project_id = $2::uuid"
		args = append(args, projectFilter)
	}
	q += " ORDER BY created_at DESC LIMIT 50"

	rows, err := p.pool.Query(r.Context(), q, args...)
	if err != nil {
		p.logger.Error("list publishes", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list publishes"))
		return
	}
	defer rows.Close()

	items := make([]publishDTO, 0)
	for rows.Next() {
		var d publishDTO
		if err := rows.Scan(&d.ID, &d.TenantID, &d.Status, &d.TriggeredBy, &d.BuildLog, &d.ArtifactKey, &d.StartedAt, &d.FinishedAt, &d.CreatedAt); err == nil {
			items = append(items, d)
		}
	}
	WriteJSON(w, http.StatusOK, items)
}

func (p *Publishes) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "publishId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid publishId"))
		return
	}
	var d publishDTO
	err = p.pool.QueryRow(r.Context(), `
		SELECT id, tenant_id, status::text, triggered_by, build_log, artifact_key, started_at, finished_at, created_at
		FROM publish_snapshots
		WHERE id = $1 AND tenant_id = $2
	`, id, tenantID).Scan(&d.ID, &d.TenantID, &d.Status, &d.TriggeredBy, &d.BuildLog, &d.ArtifactKey, &d.StartedAt, &d.FinishedAt, &d.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "publish not found"))
			return
		}
		p.logger.Error("get publish", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load publish"))
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

type publishCreate struct {
	ProjectID string `json:"projectId"`
}

func (p *Publishes) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	userID, _ := UserIDFromContext(r.Context())

	var req publishCreate
	_ = json.NewDecoder(r.Body).Decode(&req) // body optional; defaults to main

	// Resolve the target project (requested if it belongs to the tenant, else main).
	var projectID uuid.UUID
	if err := p.pool.QueryRow(r.Context(), `
		SELECT COALESCE(
			(SELECT id FROM projects WHERE tenant_id = $1 AND id = $2::uuid),
			(SELECT id FROM projects WHERE tenant_id = $1 AND slug = 'main' LIMIT 1)
		)
	`, tenantID, nullableString(req.ProjectID)).Scan(&projectID); err != nil || projectID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, errBody("no_project", "no project to publish"))
		return
	}

	var snapshotID uuid.UUID
	err := p.pool.QueryRow(r.Context(), `
		INSERT INTO publish_snapshots (tenant_id, project_id, content, status, triggered_by)
		VALUES ($1, $2, '{}'::jsonb, 'pending', $3)
		RETURNING id
	`, tenantID, projectID, userID).Scan(&snapshotID)
	if err != nil {
		p.logger.Error("publish insert", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create publish"))
		return
	}

	if _, err := p.queue.InsertPublish(r.Context(), jobs.PublishArgs{
		TenantID:   tenantID,
		ProjectID:  projectID,
		SnapshotID: snapshotID,
	}); err != nil {
		p.logger.Error("publish enqueue", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not enqueue publish"))
		return
	}

	WriteJSON(w, http.StatusAccepted, map[string]any{
		"id":          snapshotID,
		"tenantId":    tenantID,
		"projectId":   projectID,
		"status":      "pending",
		"triggeredBy": userID,
		"createdAt":   time.Now().UTC(),
	})
}
