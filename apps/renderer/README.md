# @cms/renderer

Astro renderer for customer sites. Reads a snapshot of published content (locally or from the API) and emits static HTML for the edge CDN.

## Dev

```bash
pnpm install
SNAPSHOT_JSON=./snapshot.local.json pnpm dev   # http://localhost:4321
```

The included `snapshot.local.json` exercises the 3 reference templates with sample content (home page + landing page).

## Build for a real tenant

```bash
RENDERER_API_BASE_URL=http://localhost:8080 \
RENDERER_SNAPSHOT_TOKEN=$RENDERER_SNAPSHOT_TOKEN \
RENDERER_TENANT_ID=<uuid> \
RENDERER_SNAPSHOT_ID=<uuid> \
RENDERER_SITE_URL=https://acme.example.com \
pnpm build
```

Output → `dist/`. The Go worker picks this up and uploads to R2.

## Adding a section template

Section templates live in `packages/templates/`. Each template:

1. Declares `templateKey`, `slotSchema`, and (optionally) a `structuredData()` function.
2. Is registered in `packages/templates/index.ts`.
3. Becomes available to editors automatically once the renderer is redeployed.

The brand-lock contract: editors can change slot values and pick variants. They cannot change fonts, colors, spacing, or the structure of a template.
