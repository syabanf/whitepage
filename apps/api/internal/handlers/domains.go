package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Domains struct {
	pool           *pgxpool.Pool
	logger         *slog.Logger
	platformDomain string
	autoVerify     bool
}

func NewDomains(pool *pgxpool.Pool, logger *slog.Logger, platformDomain string, autoVerify bool) *Domains {
	return &Domains{pool: pool, logger: logger, platformDomain: platformDomain, autoVerify: autoVerify}
}

type domainDTO struct {
	ID         uuid.UUID  `json:"id"`
	ProjectID  uuid.UUID  `json:"projectId"`
	Hostname   string     `json:"hostname"`
	Type       string     `json:"type"`
	Status     string     `json:"status"`
	IsPrimary  bool       `json:"isPrimary"`
	VerifiedAt *time.Time `json:"verifiedAt"`
	CreatedAt  time.Time  `json:"createdAt"`
	// DNS guidance for custom domains awaiting setup.
	DNS *dnsInstructions `json:"dns,omitempty"`
}

type dnsInstructions struct {
	CnameTarget string `json:"cnameTarget"`
	TxtName     string `json:"txtName"`
	TxtValue    string `json:"txtValue"`
}

var hostnameRe = regexp.MustCompile(`^([a-z0-9](-*[a-z0-9])*\.)+[a-z]{2,}$`)

// ensureProjectInTenant returns 404-style false if the project isn't the tenant's.
func (h *Domains) projectInTenant(r *http.Request) (uuid.UUID, bool) {
	tenantID, _ := TenantIDFromContext(r.Context())
	projectID, err := uuid.Parse(chi.URLParam(r, "projectId"))
	if err != nil {
		return uuid.Nil, false
	}
	var ok bool
	if err := h.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND tenant_id = $2)`, projectID, tenantID,
	).Scan(&ok); err != nil || !ok {
		return uuid.Nil, false
	}
	return projectID, true
}

func (h *Domains) decorate(d *domainDTO, token *string) {
	if d.Type == "custom" && d.Status != "active" && token != nil {
		d.DNS = &dnsInstructions{
			CnameTarget: "cname." + h.platformDomain,
			TxtName:     "_cms-verify." + d.Hostname,
			TxtValue:    *token,
		}
	}
}

func (h *Domains) List(w http.ResponseWriter, r *http.Request) {
	projectID, ok := h.projectInTenant(r)
	if !ok {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "project not found"))
		return
	}
	rows, err := h.pool.Query(r.Context(), `
		SELECT id, project_id, hostname, type::text, status::text, is_primary, verification_token, verified_at, created_at
		FROM domains WHERE project_id = $1
		ORDER BY type, created_at
	`, projectID)
	if err != nil {
		h.logger.Error("list domains", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not list domains"))
		return
	}
	defer rows.Close()
	items := make([]domainDTO, 0)
	for rows.Next() {
		var d domainDTO
		var token *string
		if err := rows.Scan(&d.ID, &d.ProjectID, &d.Hostname, &d.Type, &d.Status, &d.IsPrimary, &token, &d.VerifiedAt, &d.CreatedAt); err == nil {
			h.decorate(&d, token)
			items = append(items, d)
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "platformDomain": h.platformDomain})
}

type domainAdd struct {
	Hostname string `json:"hostname"`
}

func (h *Domains) Add(w http.ResponseWriter, r *http.Request) {
	projectID, ok := h.projectInTenant(r)
	if !ok {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "project not found"))
		return
	}
	var req domainAdd
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	host := strings.ToLower(strings.TrimSpace(req.Hostname))
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimSuffix(host, "/")
	if !hostnameRe.MatchString(host) {
		WriteJSON(w, http.StatusBadRequest, errBody("invalid_hostname", "enter a valid domain, e.g. www.example.com"))
		return
	}
	if strings.HasSuffix(host, "."+h.platformDomain) {
		WriteJSON(w, http.StatusBadRequest, errBody("reserved", "platform subdomains are assigned automatically"))
		return
	}

	tokenBytes := make([]byte, 16)
	_, _ = rand.Read(tokenBytes)
	token := "cms-verify-" + hex.EncodeToString(tokenBytes)

	var d domainDTO
	var tok *string
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO domains (project_id, hostname, type, status, verification_token)
		VALUES ($1, $2, 'custom', 'pending', $3)
		RETURNING id, project_id, hostname, type::text, status::text, is_primary, verification_token, verified_at, created_at
	`, projectID, host, token).Scan(&d.ID, &d.ProjectID, &d.Hostname, &d.Type, &d.Status, &d.IsPrimary, &tok, &d.VerifiedAt, &d.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "domains_hostname_idx") {
			WriteJSON(w, http.StatusConflict, errBody("taken", "that domain is already connected"))
			return
		}
		h.logger.Error("add domain", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not add domain"))
		return
	}
	h.decorate(&d, tok)
	WriteJSON(w, http.StatusCreated, d)
}

func (h *Domains) Verify(w http.ResponseWriter, r *http.Request) {
	projectID, ok := h.projectInTenant(r)
	if !ok {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "project not found"))
		return
	}
	domainID, err := uuid.Parse(chi.URLParam(r, "domainId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid domainId"))
		return
	}

	var hostname, dtype string
	var token *string
	err = h.pool.QueryRow(r.Context(),
		`SELECT hostname, type::text, verification_token FROM domains WHERE id = $1 AND project_id = $2`,
		domainID, projectID).Scan(&hostname, &dtype, &token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "domain not found"))
			return
		}
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "lookup failed"))
		return
	}
	if dtype == "subdomain" {
		WriteJSON(w, http.StatusOK, map[string]string{"status": "active"})
		return
	}

	verified := h.autoVerify
	if !verified && token != nil {
		// Real DNS check: look for the TXT token on _cms-verify.{hostname}.
		txts, _ := net.LookupTXT("_cms-verify." + hostname)
		for _, t := range txts {
			if strings.TrimSpace(t) == *token {
				verified = true
				break
			}
		}
	}
	if !verified {
		_, _ = h.pool.Exec(r.Context(), `UPDATE domains SET status = 'error' WHERE id = $1`, domainID)
		WriteJSON(w, http.StatusOK, map[string]any{"status": "error", "message": "TXT record not found yet — DNS can take a few minutes"})
		return
	}

	_, _ = h.pool.Exec(r.Context(),
		`UPDATE domains SET status = 'active', verified_at = now() WHERE id = $1`, domainID)
	WriteJSON(w, http.StatusOK, map[string]string{"status": "active"})
}

func (h *Domains) SetPrimary(w http.ResponseWriter, r *http.Request) {
	projectID, ok := h.projectInTenant(r)
	if !ok {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "project not found"))
		return
	}
	domainID, err := uuid.Parse(chi.URLParam(r, "domainId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid domainId"))
		return
	}
	// Only an active domain can be primary.
	tag, err := h.pool.Exec(r.Context(), `
		WITH cleared AS (UPDATE domains SET is_primary = false WHERE project_id = $1)
		UPDATE domains SET is_primary = true
		WHERE id = $2 AND project_id = $1 AND status = 'active'
	`, projectID, domainID)
	if err != nil {
		h.logger.Error("set primary domain", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not set primary"))
		return
	}
	if tag.RowsAffected() == 0 {
		WriteJSON(w, http.StatusBadRequest, errBody("not_active", "domain must be active before it can be primary"))
		return
	}
	WriteJSON(w, http.StatusOK, map[string]bool{"isPrimary": true})
}

func (h *Domains) Delete(w http.ResponseWriter, r *http.Request) {
	projectID, ok := h.projectInTenant(r)
	if !ok {
		WriteJSON(w, http.StatusNotFound, errBody("not_found", "project not found"))
		return
	}
	domainID, err := uuid.Parse(chi.URLParam(r, "domainId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid domainId"))
		return
	}
	// Subdomains are platform-managed and can't be removed.
	tag, err := h.pool.Exec(r.Context(),
		`DELETE FROM domains WHERE id = $1 AND project_id = $2 AND type = 'custom'`, domainID, projectID)
	if err != nil {
		h.logger.Error("delete domain", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not delete domain"))
		return
	}
	if tag.RowsAffected() == 0 {
		WriteJSON(w, http.StatusBadRequest, errBody("not_removable", "only custom domains can be removed"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Resolve maps an incoming Host (subdomain or custom domain) to its project.
// Token-guarded; consumed by the renderer for host-based routing.
func (h *Domains) Resolve(w http.ResponseWriter, r *http.Request) {
	host := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("host")))
	if i := strings.IndexByte(host, ':'); i >= 0 {
		host = host[:i] // strip port
	}
	if host == "" {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "host required"))
		return
	}
	var projectID uuid.UUID
	var projectSlug string
	err := h.pool.QueryRow(r.Context(), `
		SELECT p.id, p.slug
		FROM domains d JOIN projects p ON p.id = d.project_id
		WHERE lower(d.hostname) = $1 AND d.status IN ('active','verified')
		LIMIT 1
	`, host).Scan(&projectID, &projectSlug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusNotFound, errBody("not_found", "no site for that host"))
			return
		}
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "resolve failed"))
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"projectId": projectID, "projectSlug": projectSlug})
}
