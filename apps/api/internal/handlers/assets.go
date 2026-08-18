package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/syabanf/company-profile-cms/apps/api/internal/assets"
)

type Assets struct {
	pool       *pgxpool.Pool
	logger     *slog.Logger
	store      *assets.Store
	publicBase string
}

func NewAssets(pool *pgxpool.Pool, logger *slog.Logger, store *assets.Store, publicBase string) *Assets {
	return &Assets{pool: pool, logger: logger, store: store, publicBase: publicBase}
}

type assetDTO struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	StorageKey  string    `json:"storageKey"`
	PublicURL   string    `json:"publicUrl"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"contentType"`
	ByteSize    int64     `json:"byteSize"`
	Width       *int      `json:"width"`
	Height      *int      `json:"height"`
	AltText     *string   `json:"altText"`
	Tags        []string  `json:"tags"`
	Approved    bool      `json:"approved"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (a *Assets) publicURL(key string) string {
	return a.publicBase + "/files/" + key
}

func (a *Assets) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())

	rows, err := a.pool.Query(r.Context(), `
		SELECT id, tenant_id, storage_key, filename, content_type, byte_size,
		       width, height, alt_text, tags, approved, created_at
		FROM assets
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 200
	`, tenantID)
	if err != nil {
		a.logger.Error("list assets", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list assets"))
		return
	}
	defer rows.Close()

	items := make([]assetDTO, 0)
	for rows.Next() {
		var d assetDTO
		if err := rows.Scan(&d.ID, &d.TenantID, &d.StorageKey, &d.Filename, &d.ContentType,
			&d.ByteSize, &d.Width, &d.Height, &d.AltText, &d.Tags, &d.Approved, &d.CreatedAt); err != nil {
			a.logger.Error("scan asset", "err", err)
			continue
		}
		d.PublicURL = a.publicURL(d.StorageKey)
		items = append(items, d)
	}
	WriteJSON(w, http.StatusOK, items)
}

func (a *Assets) Upload(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	userID, _ := UserIDFromContext(r.Context())

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "could not parse upload"))
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "missing file field"))
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !assets.IsImageContentType(contentType) {
		WriteJSON(w, http.StatusBadRequest, errBody("unsupported_type", "only image uploads are allowed"))
		return
	}

	data, err := io.ReadAll(io.LimitReader(file, 32<<20))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "could not read file"))
		return
	}

	storageKey, err := a.store.Save(tenantID, header.Filename, data)
	if err != nil {
		a.logger.Error("store save", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not store file"))
		return
	}

	width, height := assets.Dimensions(data)
	var wPtr, hPtr *int
	if width > 0 {
		wPtr = &width
	}
	if height > 0 {
		hPtr = &height
	}
	altText := r.FormValue("altText")
	var altPtr *string
	if altText != "" {
		altPtr = &altText
	}

	var d assetDTO
	err = a.pool.QueryRow(r.Context(), `
		INSERT INTO assets (tenant_id, storage_key, filename, content_type, byte_size, width, height, alt_text, approved, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
		RETURNING id, tenant_id, storage_key, filename, content_type, byte_size, width, height, alt_text, tags, approved, created_at
	`, tenantID, storageKey, header.Filename, contentType, int64(len(data)), wPtr, hPtr, altPtr, userID).
		Scan(&d.ID, &d.TenantID, &d.StorageKey, &d.Filename, &d.ContentType, &d.ByteSize,
			&d.Width, &d.Height, &d.AltText, &d.Tags, &d.Approved, &d.CreatedAt)
	if err != nil {
		a.logger.Error("asset insert", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not save asset"))
		return
	}
	d.PublicURL = a.publicURL(d.StorageKey)

	WriteJSON(w, http.StatusCreated, d)
}

type assetUpdate struct {
	AltText *string   `json:"altText,omitempty"`
	Tags    *[]string `json:"tags,omitempty"`
}

// Update edits an asset's editable metadata (alt text, tags). Tenant-scoped.
func (a *Assets) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	assetID, err := uuid.Parse(chi.URLParam(r, "assetId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid assetId"))
		return
	}
	var req assetUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	if req.AltText == nil && req.Tags == nil {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "nothing to update"))
		return
	}

	setClauses := []string{}
	args := []any{}
	if req.AltText != nil {
		alt := strings.TrimSpace(*req.AltText)
		var altPtr *string
		if alt != "" {
			altPtr = &alt
		}
		setClauses = append(setClauses, "alt_text = $"+intToStr(len(args)+1))
		args = append(args, altPtr)
	}
	if req.Tags != nil {
		tags := make([]string, 0, len(*req.Tags))
		for _, t := range *req.Tags {
			if t = strings.TrimSpace(t); t != "" {
				tags = append(tags, t)
			}
		}
		setClauses = append(setClauses, "tags = $"+intToStr(len(args)+1))
		args = append(args, tags)
	}
	args = append(args, assetID, tenantID)
	q := "UPDATE assets SET " + strings.Join(setClauses, ", ") +
		" WHERE id = $" + intToStr(len(args)-1) + " AND tenant_id = $" + intToStr(len(args)) +
		" RETURNING id, tenant_id, storage_key, filename, content_type, byte_size, width, height, alt_text, tags, approved, created_at"

	var d assetDTO
	err = a.pool.QueryRow(r.Context(), q, args...).Scan(&d.ID, &d.TenantID, &d.StorageKey, &d.Filename,
		&d.ContentType, &d.ByteSize, &d.Width, &d.Height, &d.AltText, &d.Tags, &d.Approved, &d.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "asset not found"))
			return
		}
		a.logger.Error("update asset", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not update asset"))
		return
	}
	d.PublicURL = a.publicURL(d.StorageKey)
	WriteJSON(w, http.StatusOK, d)
}

// Delete removes the asset row and its stored file. Tenant-scoped.
func (a *Assets) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := TenantIDFromContext(r.Context())
	assetID, err := uuid.Parse(chi.URLParam(r, "assetId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid assetId"))
		return
	}
	var key string
	err = a.pool.QueryRow(r.Context(),
		`DELETE FROM assets WHERE id = $1 AND tenant_id = $2 RETURNING storage_key`, assetID, tenantID).Scan(&key)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "asset not found"))
			return
		}
		a.logger.Error("delete asset", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not delete asset"))
		return
	}
	// Row is gone; a file-removal failure is logged but doesn't fail the request.
	if err := a.store.Delete(key); err != nil {
		a.logger.Warn("delete asset file", "key", key, "err", err)
	}
	w.WriteHeader(http.StatusNoContent)
}
