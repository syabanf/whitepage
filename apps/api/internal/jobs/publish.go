package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
)

type PublishArgs struct {
	TenantID   uuid.UUID `json:"tenant_id"`
	ProjectID  uuid.UUID `json:"project_id"`
	SnapshotID uuid.UUID `json:"snapshot_id"`
}

func (PublishArgs) Kind() string { return "publish_snapshot" }

type PublishWorker struct {
	river.WorkerDefaults[PublishArgs]
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewPublishWorker(pool *pgxpool.Pool, logger *slog.Logger) *PublishWorker {
	return &PublishWorker{pool: pool, logger: logger}
}

// snapshotPayload mirrors the shape the Astro renderer's snapshot.ts expects.
type snapshotPayload struct {
	TenantID   uuid.UUID         `json:"tenantId"`
	SnapshotID uuid.UUID         `json:"snapshotId"`
	Tenant     snapshotTenant    `json:"tenant"`
	Tracking   map[string]any    `json:"tracking"`
	Entries    []snapshotEntry   `json:"entries"`
	Articles   []snapshotArticle `json:"articles"`
	Redirects  []map[string]any  `json:"redirects"`
}

type snapshotTenant struct {
	ID            uuid.UUID `json:"id"`
	Slug          string    `json:"slug"`
	Name          string    `json:"name"`
	PrimaryDomain *string   `json:"primaryDomain"`
}

type snapshotEntry struct {
	ID          uuid.UUID       `json:"id"`
	Type        string          `json:"type"`
	Slug        *string         `json:"slug"`
	Title       string          `json:"title"`
	Body        json.RawMessage `json:"body"`
	Seo         json.RawMessage `json:"seo"`
	PublishedAt *time.Time      `json:"publishedAt"`
}

type snapshotComment struct {
	AuthorName string    `json:"authorName"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
}

type snapshotArticle struct {
	ID          uuid.UUID         `json:"id"`
	WebPageSlug *string           `json:"webPageSlug"`
	Slug        *string           `json:"slug"`
	Title       string            `json:"title"`
	Body        json.RawMessage   `json:"body"`
	Seo         json.RawMessage   `json:"seo"`
	PublishedAt *time.Time        `json:"publishedAt"`
	Comments    []snapshotComment `json:"comments"`
}

func (w *PublishWorker) Work(ctx context.Context, job *river.Job[PublishArgs]) error {
	logger := w.logger.With(
		"snapshot_id", job.Args.SnapshotID,
		"tenant_id", job.Args.TenantID,
		"project_id", job.Args.ProjectID,
		"job_id", job.ID,
	)
	logger.Info("publish: building")

	if err := w.markBuilding(ctx, job.Args.SnapshotID); err != nil {
		return fmt.Errorf("mark building: %w", err)
	}

	payload, projectSlug, err := w.buildSnapshot(ctx, job.Args.TenantID, job.Args.ProjectID, job.Args.SnapshotID)
	if err != nil {
		_ = w.markFailed(ctx, job.Args.SnapshotID, err.Error())
		return fmt.Errorf("build snapshot: %w", err)
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		_ = w.markFailed(ctx, job.Args.SnapshotID, err.Error())
		return fmt.Errorf("marshal payload: %w", err)
	}

	// Persist the frozen tree on the snapshot row.
	if _, err := w.pool.Exec(ctx,
		`UPDATE publish_snapshots SET content = $1::jsonb WHERE id = $2`,
		string(payloadJSON), job.Args.SnapshotID,
	); err != nil {
		return fmt.Errorf("save snapshot content: %w", err)
	}

	// Dev convenience: write per-project snapshot files the Astro renderer can
	// ingest. In production each project deploys to its own edge site.
	if dir := os.Getenv("RENDERER_SNAPSHOT_DIR"); dir != "" {
		path := filepath.Join(dir, job.Args.ProjectID.String()+".json")
		if err := os.WriteFile(path, payloadJSON, 0o644); err != nil {
			logger.Warn("write project snapshot file", "path", path, "err", err)
		} else {
			logger.Info("snapshot written", "path", path, "bytes", len(payloadJSON))
		}
	}
	// Back-compat: the main project also writes the legacy single-file path so
	// the default dev renderer keeps serving it without reconfiguration.
	if path := os.Getenv("RENDERER_SNAPSHOT_PATH"); path != "" && projectSlug == "main" {
		if err := os.WriteFile(path, payloadJSON, 0o644); err != nil {
			logger.Warn("write renderer snapshot file", "path", path, "err", err)
		}
	}

	artifactKey := fmt.Sprintf("snapshots/%s/dist", job.Args.SnapshotID)
	if _, err := w.pool.Exec(ctx, `
		UPDATE publish_snapshots
		SET status = 'live', finished_at = now(), artifact_key = $2
		WHERE id = $1
	`, job.Args.SnapshotID, artifactKey); err != nil {
		return fmt.Errorf("mark live: %w", err)
	}

	logger.Info("publish: live", "entries", len(payload.Entries))
	return nil
}

func (w *PublishWorker) buildSnapshot(ctx context.Context, tenantID, projectID, snapshotID uuid.UUID) (*snapshotPayload, string, error) {
	payload := &snapshotPayload{
		TenantID:   tenantID,
		SnapshotID: snapshotID,
		Tracking:   map[string]any{},
		Entries:    []snapshotEntry{},
		Articles:   []snapshotArticle{},
		Redirects:  []map[string]any{},
	}

	// Site identity comes from the project; org name still falls back to tenant.
	var projectSlug, projectName string
	var projectDomain *string
	if err := w.pool.QueryRow(ctx, `
		SELECT slug, name, primary_domain FROM projects WHERE id = $1
	`, projectID).Scan(&projectSlug, &projectName, &projectDomain); err != nil {
		return nil, "", fmt.Errorf("load project: %w", err)
	}
	payload.Tenant.ID = projectID
	payload.Tenant.Slug = projectSlug
	payload.Tenant.Name = projectName
	payload.Tenant.PrimaryDomain = projectDomain

	rows, err := w.pool.Query(ctx, `
		SELECT id, type, slug, title, body, seo, published_at
		FROM content_entries
		WHERE project_id = $1 AND status = 'published'
		ORDER BY type, slug NULLS LAST
	`, projectID)
	if err != nil {
		return nil, "", fmt.Errorf("load entries: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var e snapshotEntry
		if err := rows.Scan(&e.ID, &e.Type, &e.Slug, &e.Title, &e.Body, &e.Seo, &e.PublishedAt); err != nil {
			return nil, "", fmt.Errorf("scan entry: %w", err)
		}
		payload.Entries = append(payload.Entries, e)
	}

	// Published articles for THIS project, with their parent web-page slug.
	artRows, err := w.pool.Query(ctx, `
		SELECT a.id, ce.slug, a.slug, a.title, a.body, a.seo, a.published_at
		FROM articles a
		JOIN content_entries ce ON ce.id = a.web_page_id
		WHERE a.status = 'published' AND a.project_id = $1
		ORDER BY a.published_at DESC NULLS LAST
	`, projectID)
	if err != nil {
		return nil, "", fmt.Errorf("load articles: %w", err)
	}
	articleIdx := map[uuid.UUID]int{}
	for artRows.Next() {
		var a snapshotArticle
		a.Comments = []snapshotComment{}
		if err := artRows.Scan(&a.ID, &a.WebPageSlug, &a.Slug, &a.Title, &a.Body, &a.Seo, &a.PublishedAt); err != nil {
			artRows.Close()
			return nil, "", fmt.Errorf("scan article: %w", err)
		}
		articleIdx[a.ID] = len(payload.Articles)
		payload.Articles = append(payload.Articles, a)
	}
	artRows.Close()

	// Approved comments for THIS project's articles, grouped onto each article.
	if len(payload.Articles) > 0 {
		cRows, err := w.pool.Query(ctx, `
			SELECT article_id, author_name, body, created_at
			FROM comments
			WHERE status = 'approved' AND project_id = $1
			ORDER BY created_at
		`, projectID)
		if err != nil {
			return nil, "", fmt.Errorf("load comments: %w", err)
		}
		for cRows.Next() {
			var articleID uuid.UUID
			var c snapshotComment
			if err := cRows.Scan(&articleID, &c.AuthorName, &c.Body, &c.CreatedAt); err != nil {
				cRows.Close()
				return nil, "", fmt.Errorf("scan comment: %w", err)
			}
			if i, ok := articleIdx[articleID]; ok {
				payload.Articles[i].Comments = append(payload.Articles[i].Comments, c)
			}
		}
		cRows.Close()
	}

	// Optional tracking config (still tenant-level for now).
	var ga4, gtm, meta, gads, li, tt, clarity, hotjar *string
	err = w.pool.QueryRow(ctx, `
		SELECT ga4_measurement_id, gtm_container_id, meta_pixel_id,
		       google_ads_conversion_label, linkedin_partner_id, tiktok_pixel_id,
		       clarity_project_id, hotjar_site_id
		FROM tracking_configs WHERE tenant_id = $1
	`, tenantID).Scan(&ga4, &gtm, &meta, &gads, &li, &tt, &clarity, &hotjar)
	if err == nil {
		payload.Tracking["ga4MeasurementId"] = ga4
		payload.Tracking["gtmContainerId"] = gtm
		payload.Tracking["metaPixelId"] = meta
		payload.Tracking["googleAdsConversionLabel"] = gads
		payload.Tracking["linkedinPartnerId"] = li
		payload.Tracking["tiktokPixelId"] = tt
		payload.Tracking["clarityProjectId"] = clarity
		payload.Tracking["hotjarSiteId"] = hotjar
	}

	return payload, projectSlug, nil
}

func (w *PublishWorker) markBuilding(ctx context.Context, snapshotID uuid.UUID) error {
	_, err := w.pool.Exec(ctx, `
		UPDATE publish_snapshots
		SET status = 'building', started_at = now()
		WHERE id = $1
	`, snapshotID)
	return err
}

func (w *PublishWorker) markFailed(ctx context.Context, snapshotID uuid.UUID, msg string) error {
	_, err := w.pool.Exec(ctx, `
		UPDATE publish_snapshots
		SET status = 'failed', finished_at = now(), build_log = $2
		WHERE id = $1
	`, snapshotID, msg)
	return err
}
