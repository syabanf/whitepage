import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface Section {
  id: string;
  templateKey: string;
  slots: Record<string, unknown>;
  variants?: Record<string, unknown>;
  style?: {
    bgColor?: string;
    textColor?: string;
    paddingY?: "none" | "sm" | "md" | "lg" | "xl";
  };
}

export interface SeoMeta {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageAssetId?: string | null;
  twitterCard?: "summary" | "summary_large_image" | null;
  robots?: { index?: boolean; follow?: boolean };
}

export interface Entry {
  id: string;
  type: string;
  slug: string | null;
  title: string;
  body: { sections: Section[] };
  seo: SeoMeta;
  publishedAt: string | null;
}

export interface SnapshotComment {
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SnapshotArticle {
  id: string;
  webPageSlug: string | null;
  slug: string | null;
  title: string;
  body: { sections: Section[] };
  seo: SeoMeta;
  publishedAt: string | null;
  comments: SnapshotComment[];
}

export interface Snapshot {
  tenantId: string;
  snapshotId: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    primaryDomain: string | null;
  };
  tracking: Record<string, string | null>;
  entries: Entry[];
  articles?: SnapshotArticle[];
  redirects: Array<{ fromPath: string; toPath: string; kind: "permanent" | "temporary" }>;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const localFile = process.env.SNAPSHOT_JSON;
  if (localFile) {
    const path = localFile.startsWith("/") ? localFile : join(process.cwd(), localFile);
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as Snapshot;
  }

  const base = process.env.RENDERER_API_BASE_URL;
  const token = process.env.RENDERER_SNAPSHOT_TOKEN;
  const tenantId = process.env.RENDERER_TENANT_ID;
  const snapshotId = process.env.RENDERER_SNAPSHOT_ID;

  if (!base || !token || !tenantId || !snapshotId) {
    throw new Error(
      "snapshot: set SNAPSHOT_JSON for local builds, or RENDERER_API_BASE_URL + RENDERER_SNAPSHOT_TOKEN + RENDERER_TENANT_ID + RENDERER_SNAPSHOT_ID for remote builds"
    );
  }

  const url = `${base}/internal/tenants/${tenantId}/snapshots/${snapshotId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`snapshot fetch failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Snapshot;
}

/**
 * Host-based routing: resolve the incoming Host (subdomain or custom domain) to
 * its project via the API, then load that project's published snapshot file.
 * Falls back to the legacy single-file snapshot (main project / localhost dev).
 */
export async function loadSnapshotForHost(host?: string): Promise<Snapshot> {
  const dir = process.env.RENDERER_SNAPSHOT_DIR;
  const base = process.env.PREVIEW_API_BASE ?? process.env.RENDERER_API_BASE_URL;
  const token = process.env.PREVIEW_TOKEN ?? process.env.RENDERER_SNAPSHOT_TOKEN;
  const cleanHost = (host ?? "").split(":")[0].toLowerCase();

  if (cleanHost && cleanHost !== "localhost" && cleanHost !== "127.0.0.1" && dir && base && token) {
    try {
      const res = await fetch(`${base}/internal/resolve?host=${encodeURIComponent(cleanHost)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const { projectId } = (await res.json()) as { projectId: string };
        const raw = await readFile(join(dir, `${projectId}.json`), "utf-8");
        return JSON.parse(raw) as Snapshot;
      }
    } catch {
      /* fall through to default snapshot */
    }
  }
  return loadSnapshot();
}
