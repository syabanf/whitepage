"use client";

import { useState } from "react";
import { Ban } from "lucide-react";

const SWATCHES = [
  { label: "White", value: "#FFFFFF" },
  { label: "Surface", value: "#FAFAFA" },
  { label: "Ink", value: "#0A0A0A" },
  { label: "Brand", value: "#1D4ED8" },
  { label: "Brand dark", value: "#1E40AF" },
  { label: "Success", value: "#16A34A" },
  { label: "Danger", value: "#DC2626" }
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function parseInitial(v: string | undefined): { hex: string; alpha: number } {
  if (!v) return { hex: "#1D4ED8", alpha: 100 };
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(v);
  if (rgba) {
    const [, r, g, b, a] = rgba;
    const hex = "#" + [r, g, b].map((x) => Number(x).toString(16).padStart(2, "0")).join("");
    return { hex, alpha: a !== undefined ? Math.round(Number(a) * 100) : 100 };
  }
  if (/^#?[0-9a-f]{6}$/i.test(v)) return { hex: v.startsWith("#") ? v : `#${v}`, alpha: 100 };
  return { hex: "#1D4ED8", alpha: 100 };
}

function compose(hex: string, alpha: number): string {
  if (alpha >= 100) return hex.toUpperCase();
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha / 100).toFixed(2)})`;
}

export function ColorField({
  name,
  label,
  initial,
  allowAlpha = true
}: {
  name: string;
  label: string;
  initial?: string;
  allowAlpha?: boolean;
}) {
  const start = parseInitial(initial);
  const [value, setValue] = useState<string>(initial ?? "");
  const [hex, setHex] = useState<string>(start.hex);
  const [alpha, setAlpha] = useState<number>(start.alpha);

  function apply(nextHex: string, nextAlpha: number) {
    setHex(nextHex);
    setAlpha(nextAlpha);
    setValue(compose(nextHex, nextAlpha));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="font-mono text-xs text-text-muted">{value || "default"}</span>
      </div>
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap items-center gap-2">
        {/* Clear / use default */}
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Use default"
          title="Use default"
          className={`flex h-7 w-7 items-center justify-center rounded border ${
            value === "" ? "border-brand text-brand" : "border-border text-text-muted hover:border-brand"
          }`}
        >
          <Ban className="h-3.5 w-3.5" />
        </button>

        {SWATCHES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => apply(s.value, 100)}
            aria-label={s.label}
            title={s.label}
            className={`h-7 w-7 rounded border ${
              value.toUpperCase() === s.value ? "ring-2 ring-brand ring-offset-1" : "border-border"
            }`}
            style={{ background: s.value }}
          />
        ))}

        {/* Custom color */}
        <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded border border-border">
          <span
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)"
            }}
          />
          <input
            type="color"
            value={hex}
            onChange={(e) => apply(e.target.value, alpha)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      {allowAlpha && value !== "" && (
        <div className="mt-3 flex items-center gap-3">
          <span className="w-16 text-xs text-text-muted">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={alpha}
            onChange={(e) => apply(hex, Number(e.target.value))}
            className="h-1 flex-1 accent-brand"
          />
          <span className="w-10 text-right text-xs tabular-nums text-text-muted">{alpha}%</span>
        </div>
      )}
    </div>
  );
}
