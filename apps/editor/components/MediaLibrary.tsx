"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Copy, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import type { Asset } from "@/lib/cms-client";

interface Actions {
  saveAssetMeta: (tenantSlug: string, assetId: string, patch: { altText?: string; tags?: string[] }) => Promise<void>;
  removeAsset: (tenantSlug: string, assetId: string) => Promise<void>;
  refreshMedia: (tenantSlug: string) => Promise<void>;
}

type UploadJob = { id: string; name: string; status: "uploading" | "done" | "error"; error?: string };

/**
 * Manageable media library: drag-and-drop / multi-file upload, search, inline
 * alt-text editing, copy URL, delete. Uploads stream through the existing
 * /api/w/{slug}/assets proxy; metadata edits + deletes go through server
 * actions and revalidate the route so the list stays server-authoritative.
 */
export function MediaLibrary({
  tenantSlug,
  initialAssets,
  actions
}: {
  tenantSlug: string;
  initialAssets: Asset[];
  actions: Actions;
}) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Keep local list in sync when the server re-renders with fresh data.
  useEffect(() => setAssets(initialAssets), [initialAssets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.filename.toLowerCase().includes(q) ||
        (a.altText ?? "").toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [assets, query]);

  const missingAlt = assets.filter((a) => !a.altText).length;

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;
      const newJobs: UploadJob[] = list.map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, name: f.name, status: "uploading" }));
      setJobs((j) => [...newJobs, ...j]);

      await Promise.all(
        list.map(async (file, i) => {
          const job = newJobs[i];
          try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`/api/w/${tenantSlug}/assets`, { method: "POST", body: fd });
            if (!res.ok) throw new Error(`upload failed (${res.status})`);
            const created = (await res.json()) as Asset;
            setAssets((prev) => [created, ...prev]);
            setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, status: "done" } : x)));
          } catch (e) {
            setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, status: "error", error: (e as Error).message } : x)));
          }
        })
      );
      // Sync the server-rendered list; clear finished jobs after a beat.
      startTransition(async () => {
        await actions.refreshMedia(tenantSlug);
      });
      window.setTimeout(() => setJobs((j) => j.filter((x) => x.status === "error")), 1800);
    },
    [tenantSlug, actions]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) void upload(e.dataTransfer.files);
  }

  function saveAlt(asset: Asset, altText: string) {
    const trimmed = altText.trim();
    if ((asset.altText ?? "") === trimmed) return;
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, altText: trimmed || null } : a)));
    startTransition(async () => {
      await actions.saveAssetMeta(tenantSlug, asset.id, { altText: trimmed });
    });
  }

  function remove(asset: Asset) {
    if (!window.confirm(`Delete "${asset.filename}"? Pages using it will show a broken image.`)) return;
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    startTransition(async () => {
      await actions.removeAsset(tenantSlug, asset.id);
    });
  }

  async function copyUrl(asset: Asset) {
    try {
      await navigator.clipboard.writeText(asset.publicUrl);
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId((c) => (c === asset.id ? null : c)), 1400);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename, alt text, tag…"
            className="h-10 w-full rounded-md border border-border-emphasis bg-bg pl-9 pr-3 text-sm text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2"
          />
        </label>
        <div className="flex items-center gap-3">
          {missingAlt > 0 && (
            <span className="inline-flex items-center gap-1.5 border border-warning/40 bg-warning/5 px-2.5 py-1 text-xs font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {missingAlt} missing alt text
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="press inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload images
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mb-8 border border-dashed p-6 text-center text-sm transition-[border-color,background-color] duration-200 ${
          dragOver ? "border-brand bg-brand-subtle text-brand" : "border-border bg-surface text-text-muted"
        }`}
      >
        <Upload className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
        Drag & drop images here, or use <span className="font-medium text-text">Upload images</span>. PNG, JPG, GIF, WebP, SVG · up to 32MB each.
      </div>

      {/* Upload progress */}
      {jobs.length > 0 && (
        <ul className="mb-6 space-y-1.5">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center gap-2 text-xs motion-safe:animate-fade-in">
              {j.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
              {j.status === "done" && <Check className="h-3.5 w-3.5 text-success" />}
              {j.status === "error" && <X className="h-3.5 w-3.5 text-danger" />}
              <span className={j.status === "error" ? "text-danger" : "text-text-body"}>
                {j.name}
                {j.status === "error" ? ` — ${j.error}` : j.status === "done" ? " — uploaded" : " — uploading…"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-border bg-bg p-12 text-center">
          <p className="text-sm font-medium text-text">{assets.length === 0 ? "No images yet" : "No matches"}</p>
          <p className="mt-1 text-sm text-text-muted">
            {assets.length === 0 ? "Upload your first brand image above." : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((a, i) => (
            <MediaCard
              key={a.id}
              asset={a}
              index={i}
              busy={pending}
              copied={copiedId === a.id}
              onSaveAlt={(alt) => saveAlt(a, alt)}
              onRemove={() => remove(a)}
              onCopy={() => copyUrl(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({
  asset,
  index,
  busy,
  copied,
  onSaveAlt,
  onRemove,
  onCopy
}: {
  asset: Asset;
  index: number;
  busy: boolean;
  copied: boolean;
  onSaveAlt: (alt: string) => void;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const [alt, setAlt] = useState(asset.altText ?? "");
  useEffect(() => setAlt(asset.altText ?? ""), [asset.altText]);
  const missing = !asset.altText;

  return (
    <article
      className={`group card-interactive flex flex-col overflow-hidden border bg-bg motion-safe:animate-fade-up ${
        missing ? "border-warning/50" : "border-border"
      }`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.publicUrl}
          alt={asset.altText ?? ""}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onCopy}
            title="Copy URL"
            aria-label="Copy URL"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg text-text-muted transition-colors hover:border-brand hover:text-brand"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            title="Delete"
            aria-label="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {missing && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 border border-warning/40 bg-bg px-2 py-0.5 text-[11px] font-medium text-warning">
            <AlertTriangle className="h-3 w-3" />
            No alt text
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-xs font-medium text-text" title={asset.filename}>
          {asset.filename}
        </p>
        <p className="text-[11px] text-text-muted">
          {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
          {formatBytes(asset.byteSize)}
        </p>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => onSaveAlt(alt)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Describe this image (alt text)…"
          aria-label={`Alt text for ${asset.filename}`}
          className={`mt-auto h-8 w-full rounded-md border bg-bg px-2 text-xs text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 ${
            missing ? "border-warning/50" : "border-border-emphasis"
          }`}
        />
      </div>
    </article>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
