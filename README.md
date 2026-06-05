# whitepage

A hosted-SaaS CMS for **company websites and ad-campaign landing pages** — a
WordPress alternative built for **marketing teams**, not developers.

**The wedge — brand-locked editing.** Designers/devs define section templates in
code; marketing editors swap content, images, and approved variants but
**cannot break the brand**: no custom CSS, no rogue fonts, no layout drift.
Every published page is **SEO-grade and Core-Web-Vitals-green** out of the box —
the renderer ships zero JS by default and the templates own the structured data
(JSON-LD).

> Not Webflow (no visual designer — designers work in code), not Strapi/Sanity
> (the renderer is bundled, not headless), not a blog platform, and —
> deliberately — **no plugin ecosystem, ever** (WordPress's biggest curse).

## Content hierarchy

```
Tenant            org / billing / members
 └─ Project       one website under a tenant            [projects]
     └─ Web Page  routable page, composed of sections   [web_pages]
         └─ Article   doc under a web page (e.g. /blog)  [articles]
             └─ Comment   public, moderated              [comments]
```

A tenant has many projects; each project is a website. Article URL =
`/{web-page-slug}/{article-slug}`. Web pages and articles share the same
brand-locked section builder.

## Architecture

```
   editors ──▶ editor (Next.js admin, auth-gated)
                  │  REST + cookie session
                  ▼
              api (Go · chi · pgx) ──┬── Postgres
                  │                  └── river worker ──▶ publish snapshot (JSON, per project)
                  │                                              │
  visitors ──▶ edge (Go TLS/ACME) ── host routing ──▶ renderer (Astro SSR) ── reads snapshot
                  on-demand certs, gated to resolvable hosts     (zero JS by default)
```

- **Publishing** freezes a per-project snapshot to JSON; the renderer serves
  that — no runtime DB hit on the public path. The river worker runs in-process
  in the API.
- **Multi-site**: the edge terminates HTTPS (Let's Encrypt on-demand certs,
  gated to hosts the API can resolve) and routes each `Host` → project, covering
  both tenant subdomains and verified custom domains.

## Stack

| Layer | Tech |
|---|---|
| API / worker | Go 1.25 · chi · pgx/v5 · river · `log/slog` |
| Database | PostgreSQL 16+ |
| API contract | OpenAPI 3.1 (`oapi-codegen` + `openapi-typescript`) |
| Editor | Next.js 15 (App Router) · React 19 · Tailwind · TanStack Query |
| Renderer | Astro 5 (SSR, zero JS by default) |
| TLS edge | Go · `golang.org/x/crypto/acme/autocert` |
| Storage / hosting | Cloudflare R2 · Pages |

## Repo layout

```
apps/
  api/        Go HTTP API + in-process river worker (handlers, jobs, config)
  editor/     Next.js admin app
  renderer/   Astro SSR renderer (host-routed multi-site)
  edge/       Go TLS edge gateway (ACME / self-signed dev mode)
packages/
  templates/  Astro section templates (slot schema + variants + JSON-LD)
  openapi/    OpenAPI 3.1 spec + generated TS client
  ui/         Admin component library
migrations/   golang-migrate SQL (000001 … 000008)
deploy/       Dockerfiles, docker-compose.prod.yml, DEPLOY.md runbook
```

## Quickstart (local dev)

Prereqs: **Go 1.25+**, **Node 20+**, **pnpm 9+**, **PostgreSQL 16+**, and
[`golang-migrate`](https://github.com/golang-migrate/migrate).

```bash
pnpm install
cp .env.example .env          # then set DATABASE_URL to your local Postgres

# apply the schema
migrate -path migrations -database "$DATABASE_URL" up

# run the services (separate terminals); the API needs the env from .env
(cd apps/api && go run ./cmd/api)     # :8080  API + worker
pnpm --filter @cms/editor dev         # :3000  editor admin
pnpm --filter @cms/renderer dev       # :4321  renderer
(cd apps/edge && go run ./cmd/edge)   # :8443  TLS edge (optional, dev = self-signed)
```

Seeded demo login: **demo@cms.app** / **cms-demo-2026**.

A `Taskfile.yml` wraps the common commands (`task dev:api`, `task db:up`,
`task db:new NAME=...`) if you have [Task](https://taskfile.dev) installed.

## Production deploy

VPS + Docker + Let's Encrypt is fully scripted. See
**[`deploy/DEPLOY.md`](deploy/DEPLOY.md)** (DNS records, staging→prod ACME flow,
custom-domain onboarding) and `deploy/docker-compose.prod.yml`.

## License

All rights reserved. This source is published for reference only; it is **not**
licensed for reuse, modification, or redistribution.
