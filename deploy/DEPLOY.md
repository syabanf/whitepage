# Production deploy — VPS / Docker + Let's Encrypt

Stand up the whole stack on one VPS with automatic HTTPS for tenant subdomains
**and** customer custom domains. The edge gateway issues Let's Encrypt certs on
demand, gated to domains the API recognizes.

```
            ┌────────── edge (:80 ACME+redirect, :443 TLS) ──────────┐
visitor ──► │  on-demand cert (gated by /internal/resolve)           │
            │  Host == api.cms.app  → api:8080                        │
            │  any other host       → renderer:4321 (routes by Host) │
            └────────────────────────────────────────────────────────┘
                              api ── postgres
                              renderer ── shared "snapshots" volume ── api(worker)
```

## 0. Prerequisites

- A VPS with a **public IPv4** (call it `GATEWAY_IP`), Docker + Docker Compose.
- **Ports 80 and 443 open** to the internet. Port 80 is required — Let's Encrypt
  HTTP‑01 validates over it. (TLS‑ALPN‑01 on 443 also works; keep 80 open for the
  redirect regardless.)
- You control DNS for your platform domain (this guide uses `cms.app`).

## 1. DNS records (at your registrar)

Replace `GATEWAY_IP` with your VPS IP and `cms.app` with your platform domain.

| Type | Name (host) | Value | Why |
|---|---|---|---|
| `A` | `*.cms.app` | `GATEWAY_IP` | **Wildcard** — every tenant subdomain (`acme-main.cms.app`, …) resolves to the gateway |
| `A` | `cname.cms.app` | `GATEWAY_IP` | The CNAME target customers point their custom domains at |
| `A` | `api.cms.app` | `GATEWAY_IP` | API over HTTPS (forms/comments from published sites) |
| `A` | `app.cms.app` | `GATEWAY_IP` (or your editor host) | The editor/admin app (optional, if you also front it here) |
| `A` | `cms.app` | `GATEWAY_IP` | Apex / marketing (optional) |

Add `AAAA` records too if the VPS has IPv6.

> Wildcard `*.cms.app` is a plain A record — no wildcard **certificate** needed.
> The edge mints a normal per-host cert for each subdomain on first request via
> HTTP‑01, which works because the host resolves to the gateway.

## 2. Configure

```bash
git clone <your-repo> && cd company-profile-cms
cp deploy/.env.prod.example deploy/.env.prod
# edit deploy/.env.prod: strong POSTGRES_PASSWORD + INTERNAL_TOKEN, your
# PLATFORM_DOMAIN, ACME_EMAIL, API_HOSTNAME, PUBLIC_API_BASE.
```

## 3. Dry run with Let's Encrypt **staging** first

LE production has strict rate limits; validate the whole flow against staging
(certs will be "untrusted" — that's expected).

```bash
# in deploy/.env.prod:
ACME_DIRECTORY=https://acme-staging-v02.api.letsencrypt.org/directory

docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml logs -f edge
```

Verify issuance (staging cert returned, chain from "(STAGING) Let's Encrypt"):

```bash
curl -vk https://api.cms.app/healthz            # 200, staging cert
curl -vk https://<tenant>-main.cms.app/         # serves the project, staging cert
```

## 4. Go to production certs

```bash
# in deploy/.env.prod: blank it out
ACME_DIRECTORY=

# wipe the staging certs so real ones are issued, then restart edge
docker compose -f deploy/docker-compose.prod.yml down
docker volume rm cms_certs
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build
```

Now `https://<tenant>-main.cms.app` and `https://api.cms.app` serve **trusted**
certs. First hit to a new host is slightly slow (cert issuance), then cached.

## 5. Custom domains (what a customer does)

In the editor: **Workspace → Domains → add `www.theircompany.com`**. We show two
DNS records; the customer adds them at *their* registrar:

| Type | Name | Value |
|---|---|---|
| `CNAME` | `www.theircompany.com` | `cname.cms.app` |
| `TXT` | `_cms-verify.www.theircompany.com` | `cms-verify-…` (shown in the UI) |

Then they click **Verify**. With `DOMAIN_DEV_AUTOVERIFY=false` (prod), the API
checks the TXT record via DNS; once it matches, the domain goes **active**, the
gateway issues a cert on the next HTTPS request, and the site is live on it.

## 6. Operations

- **Renewal**: automatic. `autocert` renews ~30 days before expiry. The `certs`
  volume persists certs across restarts — **back it up** (or you'll re-issue and
  risk LE rate limits).
- **Firewall**: allow inbound 80 + 443 only. Keep 8080/4321 internal (they're on
  the compose network, not published).
- **Migrations**: the `migrate` service runs `up` on every `up` and exits; safe
  (no-op when already applied).
- **Assets**: this compose stores uploads on a local volume + serves them from
  the API. At scale, move to Cloudflare R2 (S3 envs already in `.env.example`)
  and set `ASSET_PUBLIC_BASE` to the CDN.
- **Scaling note**: `snapshots` is a shared local volume between api + renderer.
  To run them on separate hosts, switch publish output to object storage (R2) and
  have the renderer read from there.

## Alternative: Cloudflare for SaaS

If you'd rather not operate ACME yourself, put Cloudflare in front: use their
**Custom Hostnames** API (call it from the domain `verify` step) — Cloudflare
terminates TLS and issues/renews certs. Then the edge gateway is optional and
the renderer sits behind Cloudflare. The `/internal/resolve` gate + per-project
snapshots stay exactly the same.
