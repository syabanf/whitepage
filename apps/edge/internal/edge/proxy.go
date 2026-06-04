package edge

import (
	"net/http"
	"net/http/httputil"
	"net/url"
)

// NewProxy reverse-proxies to the renderer upstream. It sends the upstream's
// own Host (so dev servers' host guard is satisfied) and communicates the
// visitor's real host via X-Forwarded-Host — the renderer routes to the right
// project off that header (falling back to Host in production).
func NewProxy(upstream *url.URL) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(upstream)
	inner := proxy.Director
	proxy.Director = func(req *http.Request) {
		origHost := req.Host
		inner(req) // sets scheme/host to upstream
		req.Host = upstream.Host
		req.Header.Set("X-Forwarded-Host", origHost)
		req.Header.Set("X-Forwarded-Proto", "https")
	}
	return proxy
}
