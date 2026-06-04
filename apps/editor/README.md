# @cms/editor

Next.js 15 App Router admin app for company-profile-cms. Auth-gated; uses brand tokens (white + #1D4ED8 blue, Inter, sharp corners, no shadows).

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

API base URL: `NEXT_PUBLIC_API_BASE_URL` (see root `.env.example`).

API types are consumed from `@cms/openapi` (workspace package — regenerated via `pnpm --filter @cms/openapi generate`).
