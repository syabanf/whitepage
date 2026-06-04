import type { Entry, Snapshot } from "./snapshot";

interface PreviewResponse {
  tenant: {
    id: string;
    slug: string;
    name: string;
    primaryDomain: string | null;
  };
  entry: Entry;
}

function previewEnv() {
  return {
    base: process.env.PREVIEW_API_BASE ?? process.env.RENDERER_API_BASE_URL ?? "http://localhost:8080",
    token: process.env.PREVIEW_TOKEN ?? process.env.RENDERER_SNAPSHOT_TOKEN ?? "dev_only_not_secret"
  };
}

/**
 * Fetch a single document (web page or article — any status, draft included)
 * from the API's internal token-guarded endpoint. Used by the editor's live
 * preview iframe.
 */
async function fetchPreview(path: string): Promise<{ entry: Entry; snapshot: Snapshot }> {
  const { base, token } = previewEnv();
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`preview fetch failed: ${res.status}`);
  const data = (await res.json()) as PreviewResponse;
  const snapshot: Snapshot = {
    tenantId: data.tenant.id,
    snapshotId: "preview",
    tenant: data.tenant,
    tracking: {},
    entries: [data.entry],
    redirects: []
  };
  return { entry: data.entry, snapshot };
}

export function loadPreview(entryId: string) {
  return fetchPreview(`/internal/entries/${entryId}`);
}

export function loadArticlePreview(articleId: string) {
  return fetchPreview(`/internal/articles/${articleId}`);
}
