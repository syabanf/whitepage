# Project context for Claude

This file orients future Claude sessions. The authoritative MVP plan lives at `/Users/syabanf/.claude/plans/if-i-want-to-reflective-hare.md` — read it before making non-trivial changes.

## What this is

Hosted-SaaS CMS for **company websites + ad-campaign landing pages**, positioned as a WordPress alternative. Target user is **marketing teams at companies** (non-technical editors). The wedge is **brand-locked editing + SEO/CWV-ready output**.

## What it is NOT

- Not Webflow (no visual designer mode — designers work in code).
- Not Strapi/Sanity (not headless; renderer is bundled).
- Not a blogging platform.
- Not multi-site for agencies.
- No plugin ecosystem. Ever. (This is WordPress's biggest curse; do not replicate.)

Full non-goals list lives in the plan and in memory (`mvp_wedge.md`).

## Data hierarchy (locked in)

```
Tenant            org / billing / members (users join via memberships)
 └─ Project       a single website under a tenant (many per tenant)   [table: projects]
     └─ Web Page  routable page, composed of sections                 [table: content_entries]
         └─ Article   content doc under a web page, uses section builder + SEO  [table: articles]
             └─ Comment   public visitor comment, moderated            [table: comments]
```

- `projects.tenant_id` → tenant. Each tenant has a default project (`slug='main'`).
- "Web page" == `content_entries` (type `page`/`landing_page`). It carries `project_id`
  (nullable during migration; backfilled to the tenant's main project). The
  `content_entries` → `web_pages` rename + full project repointing of
  assets/redirects/publishes/forms/tracking is a planned coordinated refactor —
  not done yet, so the table is still named `content_entries`.
- `articles.web_page_id` → parent web page (e.g. a `/blog` page lists many articles).
  Article URL = `/{web-page-slug}/{article-slug}`. Body uses the same section
  templates as web pages (brand-lock + JSON-LD still apply).
- `comments` are public + moderated: status `pending` → `approved` / `spam` / `deleted`.
  `parent_id` supports threaded replies. Public submit endpoint + honeypot antispam
  (to be built in the app layer).

Migration: `migrations/000004_project_article_comment.up.sql` (additive, non-breaking).

## Stack (locked in)

- **Backend:** Go 1.21+ (chi + pgx + sqlc + river) + Postgres
- **API contract:** OpenAPI 3.1 → `oapi-codegen` (Go server) + `openapi-typescript` (TS client)
- **Editor:** Next.js 15 App Router + React + Tailwind + shadcn/ui
- **Customer site renderer:** Astro (zero JS default for green Core Web Vitals)
- **Object storage:** Cloudflare R2
- **Hosting:** Cloudflare Pages (customer sites), Fly.io / Vercel (api + editor)

## Repo layout

```
apps/
  api/          Go HTTP API (chi + pgx + sqlc + river)
  editor/       Next.js admin (auth-gated, uses brand tokens — see below)
  renderer/     Astro renderer for customer sites
packages/
  openapi/      OpenAPI 3.1 spec + generated TS client
  ui/           Admin component library (React + Tailwind)
  templates/    Astro section templates (declares slot schema + JSON-LD)
  schemas/      Shared JSON Schemas
migrations/     golang-migrate format Postgres migrations
scripts/        Dev tooling
```

## Conventions

### Go (apps/api, apps/worker)
- Tab indentation (Go default).
- `log/slog` for logging — pass `*slog.Logger` via context or struct fields.
- `pgx/v5` directly; no `database/sql`.
- `sqlc` queries live next to migrations; never hand-write `pgx` query strings outside generated code unless dynamic.
- One handler per file in `internal/api/handlers/`.
- Errors: wrap with `fmt.Errorf("doing X: %w", err)`. Don't swallow.

### TypeScript (apps/editor, packages/*)
- 2-space indent.
- Strict mode TypeScript (`strict: true`).
- React Server Components by default in Next.js; mark client components explicitly.
- TanStack Query for API state; no separate global store unless local state insufficient.
- Use OpenAPI-generated client types — never hand-write API request shapes.

### Astro (apps/renderer, packages/templates)
- Each section template is a `.astro` file in `packages/templates/`.
- Template exports a `slotSchema` JSON Schema and a `structuredData(content)` function.
- No client-side JS unless the template explicitly opts in via Astro islands.

## Brand tokens (CMS's own UI only — NOT customer sites)

Customer sites use each customer's own design system. The CMS's editor admin + marketing site use these tokens:

| Token | Value |
|---|---|
| Background | `#FFFFFF` |
| Surface | `#FAFAFA` |
| Border subtle | `#E5E7EB` |
| Border emphasis | `#CBD5E1` |
| Text primary | `#0A0A0A` |
| Text body | `#1F2937` |
| Text muted | `#6B7280` |
| Brand blue primary | `#1D4ED8` |
| Brand blue hover | `#1E40AF` |
| Brand blue subtle bg | `#EFF6FF` |
| Success / Warning / Danger | `#16A34A` / `#D97706` / `#DC2626` |

- Font: **Inter** (display + body).
- Radii: **4–6px max** — sharp, not rounded.
- **No drop shadows in core UI** — 1px borders only.
- Inspiration: `withwhite.id` (clean, generous whitespace, large display type, no shadows).

## Verification bars (the plan's success metrics)

When evaluating any change, ask whether it preserves these:

1. Marketing-team editors can ship safe edits **without involving a developer**.
2. Every published page hits **Lighthouse Perf ≥ 90, SEO = 100, A11y ≥ 95** on mobile.
3. **Core Web Vitals**: LCP < 2.5s, CLS < 0.1, INP < 200ms.
4. GA4 / Meta Pixel / GTM fire correctly with **zero manual JS pasting**.
5. Form submissions deliver to CRM with **UTM attribution preserved**.

A "feature" that breaks any of these is the wrong feature.

## Dev commands

See `Taskfile.yml`. Common ones:

- `task install`
- `task dev:api` / `task dev:editor` / `task dev:renderer`
- `task codegen`
- `task db:up` / `task db:new NAME=description`
- `task test:api`
