// Package edge implements the TLS edge gateway: it terminates HTTPS for tenant
// subdomains and verified custom domains, gating certificate issuance to hosts
// the API recognizes, then reverse-proxies to the renderer.
package edge

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// Resolver decides whether a hostname is allowed to get a certificate by asking
// the API's internal resolve endpoint. Results are cached briefly so a TLS
// handshake doesn't hit the API every time. This is the abuse guard: we only
// ever issue certs for domains a tenant has connected + verified.
type Resolver struct {
	base   string
	token  string
	client *http.Client
	logger *slog.Logger

	ttl   time.Duration
	mu    sync.Mutex
	cache map[string]cacheEntry
}

type cacheEntry struct {
	allowed bool
	expires time.Time
}

func NewResolver(base, token string, logger *slog.Logger) *Resolver {
	return &Resolver{
		base:   base,
		token:  token,
		client: &http.Client{Timeout: 5 * time.Second},
		logger: logger,
		ttl:    60 * time.Second,
		cache:  map[string]cacheEntry{},
	}
}

// Allowed reports whether host maps to a known project (subdomain or active
// custom domain). Negative results are cached for a shorter window so a freshly
// verified domain starts working quickly.
func (r *Resolver) Allowed(ctx context.Context, host string) bool {
	if host == "" {
		return false
	}
	r.mu.Lock()
	if e, ok := r.cache[host]; ok && time.Now().Before(e.expires) {
		r.mu.Unlock()
		return e.allowed
	}
	r.mu.Unlock()

	allowed := r.lookup(ctx, host)

	r.mu.Lock()
	ttl := r.ttl
	if !allowed {
		ttl = 15 * time.Second
	}
	r.cache[host] = cacheEntry{allowed: allowed, expires: time.Now().Add(ttl)}
	r.mu.Unlock()
	return allowed
}

func (r *Resolver) lookup(ctx context.Context, host string) bool {
	u := r.base + "/internal/resolve?host=" + url.QueryEscape(host)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+r.token)
	resp, err := r.client.Do(req)
	if err != nil {
		r.logger.Warn("resolve lookup failed", "host", host, "err", err)
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
