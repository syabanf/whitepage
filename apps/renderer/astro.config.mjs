import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

// Site URL is per-tenant in production. Pass via RENDERER_SITE_URL env var when building.
const site = process.env.RENDERER_SITE_URL ?? "http://localhost:4321";

// SSR for dev so the snapshot file is re-read on every request (live preview
// after a publish, no restart needed). Production builds should run with
// `astro build` against output: 'static' for the green-CWV story — toggle via
// RENDERER_OUTPUT env var.
const output = process.env.RENDERER_OUTPUT === "static" ? "static" : "server";

export default defineConfig({
  site,
  output,
  adapter: output === "server" ? node({ mode: "standalone" }) : undefined,
  trailingSlash: "never",
  build: {
    inlineStylesheets: "auto",
    assets: "_assets"
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap()
  ],
  vite: {
    // Dev only: the edge gateway proxies real Host headers (tenant subdomains +
    // custom domains) to this dev server; Vite otherwise blocks unknown hosts.
    // Production serves a static build, where this guard doesn't apply.
    server: {
      allowedHosts: true
    },
    ssr: {
      // Templates are .astro files — keep them in the bundle, not externalized.
      noExternal: ["@cms/templates"]
    }
  }
});
