# Build context = repo root (pnpm workspace: renderer depends on @cms/templates).
#   docker build -f apps/renderer/Dockerfile -t cms-renderer .
# Runs the Astro node SSR server so each request is routed to a project by Host.
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cms/renderer build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app /app
EXPOSE 4321
# Astro @astrojs/node standalone entrypoint; honors HOST/PORT.
CMD ["node", "apps/renderer/dist/server/entry.mjs"]
