# Company Profile CMS

A hosted-SaaS CMS for company websites and ad-campaign landing pages. Positioned as a WordPress alternative for marketing teams.

**Wedge:** brand-locked design system — designers/devs define templates in code; editors swap content/images/variants but cannot break the brand. Every page is SEO-grade and CWV-green out of the box.

Full plan: [`.claude/plans/if-i-want-to-reflective-hare.md`](.claude/plans/if-i-want-to-reflective-hare.md) (in the global Claude plans directory).

## Stack

| Layer | Tech |
|---|---|
| Backend / API | Go 1.21+ + chi + pgx + sqlc + river |
| Database | PostgreSQL 16+ |
| API contract | OpenAPI 3.1 (oapi-codegen + openapi-typescript) |
| Editor (admin) | Next.js 15 (App Router) + React + Tailwind + shadcn/ui |
| Customer site renderer | Astro (zero JS by default → green Core Web Vitals) |
| Object storage | Cloudflare R2 (S3-compatible) |
| CDN / static hosting | Cloudflare Pages |
| Background jobs | river (Postgres-backed) |

## Repo layout

```
apps/
  api/          Go HTTP API
  editor/       Next.js admin app
  renderer/     Astro static-site renderer
packages/
  openapi/      OpenAPI 3.1 spec + generated TS client
  ui/           Admin component library (React + Tailwind, brand-styled)
  templates/    Astro section templates with slot schemas + JSON-LD declarations
  schemas/      JSON Schemas for content types
migrations/     Postgres migrations (golang-migrate format)
scripts/        Tooling and dev scripts
```

## Prerequisites

- Go 1.21+ (1.22+ recommended)
- Node.js 20+ (pin via `.nvmrc`)
- pnpm 9+
- PostgreSQL 16+ (local or managed)
- [Task](https://taskfile.dev) (optional, for cross-language orchestration)
- [sqlc](https://sqlc.dev/) (for SQL → Go codegen)
- [golang-migrate](https://github.com/golang-migrate/migrate) (for DB migrations)

## Setup

```bash
# Clone and install
pnpm install
go mod tidy

# Configure env
cp .env.example .env  # then edit DATABASE_URL etc.

# Run migrations
task db:up

# Run everything (in separate terminals)
task dev:api
task dev:editor
task dev:renderer
```

## Available tasks

Run `task` to see the full list. Common ones:

- `task install` — install all dependencies
- `task dev:api` / `task dev:editor` / `task dev:renderer` — run each app
- `task codegen` — regenerate OpenAPI client and sqlc Go code
- `task db:up` / `task db:down` / `task db:new NAME=...` — manage migrations
- `task test:api` — run Go tests

## License

TBD.
