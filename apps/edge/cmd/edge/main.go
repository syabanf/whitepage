// edge is the TLS gateway in front of the renderer. It terminates HTTPS for
// tenant subdomains + verified custom domains, issuing certificates on demand
// and ONLY for hostnames the API recognizes, then reverse-proxies to the
// renderer (which serves the right project by Host).
//
// Modes (TLS_MODE):
//   - selfsigned (default): mint local certs from an in-process CA so HTTPS
//     works on a laptop without a public domain. Use a local hosts entry or
//     `curl --resolve ... -k`.
//   - acme: real Let's Encrypt certificates via autocert (production). Set
//     ACME_EMAIL; optionally ACME_DIRECTORY to use the LE staging endpoint.
package main

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"golang.org/x/crypto/acme"
	"golang.org/x/crypto/acme/autocert"

	"github.com/syabanf/company-profile-cms/apps/edge/internal/edge"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "edge fatal: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	mode := env("TLS_MODE", "selfsigned")
	httpsAddr := env("HTTPS_ADDR", ":8443")
	httpAddr := env("HTTP_ADDR", ":8081")
	upstreamRaw := env("RENDERER_UPSTREAM", "http://localhost:4321")
	resolveBase := env("RESOLVE_API_BASE", "http://localhost:8080")
	resolveToken := env("RESOLVE_TOKEN", "dev_only_not_secret")
	publicHTTPSPort := env("PUBLIC_HTTPS_PORT", portFromAddr(httpsAddr))

	upstream, err := url.Parse(upstreamRaw)
	if err != nil {
		return fmt.Errorf("invalid RENDERER_UPSTREAM: %w", err)
	}

	resolver := edge.NewResolver(resolveBase, resolveToken, logger)
	proxy := edge.NewProxy(upstream)

	// Optional: route a dedicated API hostname (e.g. api.cms.app) to the API so
	// published sites can POST forms/comments over HTTPS. Everything else → renderer.
	apiHostname := strings.ToLower(env("API_HOSTNAME", ""))
	var apiProxy http.Handler
	if apiHostname != "" {
		apiURL, err := url.Parse(env("API_UPSTREAM", "http://api:8080"))
		if err != nil {
			return fmt.Errorf("invalid API_UPSTREAM: %w", err)
		}
		apiProxy = edge.NewProxy(apiURL)
		logger.Info("edge: API hostname routing enabled", "host", apiHostname)
	}

	// Single gate used by both TLS issuance and request routing: a host is
	// allowed if it's the API hostname or a project domain the API resolves.
	allow := func(ctx context.Context, host string) bool {
		if apiHostname != "" && strings.EqualFold(host, apiHostname) {
			return true
		}
		return resolver.Allowed(ctx, host)
	}

	var tlsConfig *tls.Config
	var httpHandler http.Handler

	switch mode {
	case "acme":
		m := &autocert.Manager{
			Prompt: autocert.AcceptTOS,
			Cache:  autocert.DirCache(env("CERT_CACHE_DIR", "./.certs")),
			Email:  os.Getenv("ACME_EMAIL"),
			// Issuance is gated: ACME only runs for hostnames the API knows.
			HostPolicy: func(ctx context.Context, host string) error {
				if allow(ctx, host) {
					return nil
				}
				return fmt.Errorf("host %q is not a provisioned domain", host)
			},
		}
		if dir := os.Getenv("ACME_DIRECTORY"); dir != "" {
			m.Client = &acme.Client{DirectoryURL: dir}
		}
		tlsConfig = m.TLSConfig()
		// Serves ACME HTTP-01 challenges + redirects everything else to HTTPS.
		httpHandler = m.HTTPHandler(redirectHandler(publicHTTPSPort))
		logger.Info("edge TLS: ACME mode", "email", m.Email, "directory", firstNonEmpty(os.Getenv("ACME_DIRECTORY"), "letsencrypt-production"))

	default: // selfsigned
		ss, err := edge.NewSelfSigned()
		if err != nil {
			return fmt.Errorf("self-signed CA: %w", err)
		}
		tlsConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
			GetCertificate: func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
				host := strings.ToLower(hello.ServerName)
				if host == "" {
					return nil, errors.New("missing SNI")
				}
				// Same gate as production: refuse the handshake for unknown hosts.
				if !allow(hello.Context(), host) {
					logger.Warn("refused TLS for unprovisioned host", "host", host)
					return nil, fmt.Errorf("host %q is not a provisioned domain", host)
				}
				return ss.GetCertificate(host)
			},
		}
		httpHandler = redirectHandler(publicHTTPSPort)
		logger.Info("edge TLS: self-signed mode (dev)")
	}

	// Route by Host: API hostname → API, everything else → renderer.
	var handler http.Handler = proxy
	if apiProxy != nil {
		rendererProxy := proxy
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host := r.Host
			if i := strings.IndexByte(host, ':'); i >= 0 {
				host = host[:i]
			}
			if strings.EqualFold(host, apiHostname) {
				apiProxy.ServeHTTP(w, r)
				return
			}
			rendererProxy.ServeHTTP(w, r)
		})
	}

	httpsSrv := &http.Server{
		Addr:              httpsAddr,
		Handler:           handler,
		TLSConfig:         tlsConfig,
		ReadHeaderTimeout: 10 * time.Second,
	}
	httpSrv := &http.Server{
		Addr:              httpAddr,
		Handler:           httpHandler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 2)
	go func() {
		logger.Info("edge HTTP listening (redirect/ACME)", "addr", httpAddr)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("http: %w", err)
		}
	}()
	go func() {
		logger.Info("edge HTTPS listening", "addr", httpsAddr, "upstream", upstream.String())
		if err := httpsSrv.ListenAndServeTLS("", ""); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("https: %w", err)
		}
	}()

	select {
	case <-ctx.Done():
		logger.Info("edge shutting down")
	case err := <-errCh:
		return err
	}
	sh, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = httpsSrv.Shutdown(sh)
	_ = httpSrv.Shutdown(sh)
	return nil
}

func redirectHandler(httpsPort string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if i := strings.IndexByte(host, ':'); i >= 0 {
			host = host[:i]
		}
		target := "https://" + host
		if httpsPort != "" && httpsPort != "443" {
			target += ":" + httpsPort
		}
		target += r.URL.RequestURI()
		http.Redirect(w, r, target, http.StatusMovedPermanently)
	})
}

func portFromAddr(addr string) string {
	if i := strings.LastIndexByte(addr, ':'); i >= 0 {
		return addr[i+1:]
	}
	return "443"
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
