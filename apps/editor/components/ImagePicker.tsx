"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import type { Asset, ImageRef } from "@/lib/cms-client";

interface Props {
  /** Hidden input name, e.g. `section.{id}.image.{slot}` — value is JSON. */
  name: string;
  label: string;
  tenantSlug: string;
  initial: ImageRef | null;
}

export function ImagePicker({ name, label, tenantSlug, initial }: Props) {
  const [value, setValue] = useState<ImageRef | null>(initial);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>

      {/* Carries the selection into the page <form>. Empty string = cleared. */}
      <input type="hidden" name={name} value={value ? JSON.stringify(value) : ""} />

      <div className="flex items-start gap-4">
        <div
          className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0,0 6px,6px -6px,-6px 0"
          }}
        >
          {value?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt={value.alt ?? ""}
              className={`h-full w-full ${value.fit === "contain" ? "object-contain" : "object-cover"}`}
              style={{ opacity: (value.opacity ?? 100) / 100 }}
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-text-muted" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center rounded-md border border-border-emphasis bg-bg px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
          >
            {value ? "Replace image" : "Choose image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => setValue(null)}
              className="text-left text-xs text-text-muted transition-colors hover:text-danger"
            >
              Remove
            </button>
          )}
          {value?.width ? (
            <p className="text-xs text-text-muted">
              {value.width}×{value.height}px
            </p>
          ) : null}
        </div>
      </div>

      {/* Image style controls */}
      {value && (
        <div className="mt-4 space-y-3 border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="w-16 text-xs text-text-muted">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={value.opacity ?? 100}
              onChange={(e) => setValue({ ...value, opacity: Number(e.target.value) })}
              className="h-1 flex-1 accent-brand"
            />
            <span className="w-10 text-right text-xs tabular-nums text-text-muted">
              {value.opacity ?? 100}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="mb-1 block text-text-muted">Corners</span>
              <select
                value={value.radius ?? "md"}
                onChange={(e) => setValue({ ...value, radius: e.target.value as ImageRef["radius"] })}
                className="h-9 w-full rounded-md border border-border-emphasis bg-bg px-2 text-sm text-text"
              >
                <option value="none">Square</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="full">Round</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-text-muted">Fit</span>
              <select
                value={value.fit ?? "cover"}
                onChange={(e) => setValue({ ...value, fit: e.target.value as ImageRef["fit"] })}
                className="h-9 w-full rounded-md border border-border-emphasis bg-bg px-2 text-sm text-text"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {open && (
        <AssetModal
          tenantSlug={tenantSlug}
          onClose={() => setOpen(false)}
          onPick={(asset) => {
            setValue({
              assetId: asset.id,
              url: asset.publicUrl,
              width: asset.width ?? undefined,
              height: asset.height ?? undefined,
              alt: asset.altText ?? ""
            });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AssetModal({
  tenantSlug,
  onClose,
  onPick
}: {
  tenantSlug: string;
  onClose: () => void;
  onPick: (asset: Asset) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${tenantSlug}/assets`, { cache: "no-store" });
      if (!res.ok) throw new Error(`load failed (${res.status})`);
      setAssets((await res.json()) as Asset[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/w/${tenantSlug}/assets`, { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `upload failed (${res.status})`);
      }
      const asset = (await res.json()) as Asset;
      setAssets((prev) => [asset, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col border border-border bg-bg shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Asset library
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-text">Choose an image</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border-emphasis text-text-muted hover:text-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="border border-dashed border-border bg-surface p-10 text-center">
              <ImagePlus className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-text">No assets yet</p>
              <p className="mt-1 text-sm text-text-muted">Upload an image to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onPick(asset)}
                  className="group flex flex-col overflow-hidden border border-border bg-bg text-left transition-colors hover:border-brand"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.publicUrl}
                      alt={asset.altText ?? asset.filename}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs text-text-body">{asset.filename}</p>
                    {asset.width ? (
                      <p className="text-xs text-text-muted">
                        {asset.width}×{asset.height}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
