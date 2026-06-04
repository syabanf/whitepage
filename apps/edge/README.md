# @cms/edge — TLS gateway

Terminates HTTPS for tenant **subdomains** and **verified custom domains**, then
reverse-proxies to the Astro renderer (which serves the right project by `Host`).

Certificates are issued **on demand and only for hostnames the API recognizes**
(`GET /internal/resolve?host=…`). That gate is the abuse guard — without it,
anyone pointing a domain at us could mint a cert.

## Modes (`TLS_MODE`)

| Mode | Use | Certs |
|---|---|---|
| `selfsigned` (default) | local dev | minted by an in-process CA so HTTPS works without a public domain |
| `acme` | production | real **Let's Encrypt** certs via `autocert` (HTTP-01 / TLS-ALPN-01) |

## Config (env)

| Var | Default | Notes |
|---|---|---|
| `TLS_MODE` | `selfsigned` | `acme` in prod |
| `HTTPS_ADDR` | `:8443` | `:443` in prod |
| `HTTP_ADDR` | `:8081` | `:80` in prod (ACME challenges + redirect) |
| `RENDERER_UPSTREAM` | `http://localhost:4321` | where to proxy |
| `RESOLVE_API_BASE` | `http://localhost:8080` | API base for host resolution |
| `RESOLVE_TOKEN` | `dev_only_not_secret` | bearer for `/internal/resolve` |
| `PUBLIC_HTTPS_PORT` | derived from `HTTPS_ADDR` | used in HTTP→HTTPS redirects (`443` ⇒ omitted) |
| `ACME_EMAIL` | — | required for `acme` mode |
| `ACME_DIRECTORY` | — | set to LE **staging** while testing to avoid rate limits |
| `CERT_CACHE_DIR` | `./.certs` | acme cert storage (persist this volume in prod) |

## Run (dev)

```bash
task dev:edge      # TLS_MODE=selfsigned on :8443

# Visit a project's site over HTTPS (no /etc/hosts edit needed):
curl -k --resolve demo-main.cms.app:8443:127.0.0.1 https://demo-main.cms.app:8443/
curl -k --resolve www.acme-demo.com:8443:127.0.0.1 https://www.acme-demo.com:8443/
# An unprovisioned host is refused at the TLS handshake:
curl -k --resolve nope.example.com:8443:127.0.0.1 https://nope.example.com:8443/   # fails
```

## Production notes

- DNS: a wildcard `*.cms.app` → the gateway's IP (subdomains); customers add a
  CNAME (`cname.cms.app`) + the `_cms-verify` TXT for custom domains.
- Run `TLS_MODE=acme HTTPS_ADDR=:443 HTTP_ADDR=:80 ACME_EMAIL=ops@cms.app`,
  persist `CERT_CACHE_DIR`.
- Managed alternative: **Cloudflare for SaaS** custom hostnames (call their API
  on domain verify) — then this gateway isn't needed; the renderer sits behind
  Cloudflare. The `/internal/resolve` gate stays useful either way.
