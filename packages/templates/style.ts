// Shared style resolution for section templates. Lets editors override
// container background/text color + padding, per-button style + color, and
// image opacity/radius/fit — while every template keeps a safe on-brand default.

export interface SectionStyle {
  bgColor?: string;
  textColor?: string;
  paddingY?: "none" | "sm" | "md" | "lg" | "xl";
}

export interface CTA {
  label?: string;
  href?: string;
  style?: "solid" | "outline" | "ghost";
  color?: string;
}

export interface ImageRef {
  assetId?: string;
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
  opacity?: number; // 0–100
  radius?: "none" | "sm" | "md" | "lg" | "full";
  fit?: "cover" | "contain";
}

const PADDING: Record<string, string> = {
  none: "py-0",
  sm: "py-12",
  md: "py-20",
  lg: "py-28",
  xl: "py-36"
};

/** Build the root <section> class + inline style from variant bg + overrides. */
export function sectionShell(
  opts: { bgClass: string; defaultPadding: keyof typeof PADDING },
  style?: SectionStyle
): { sectionClass: string; sectionStyle: string } {
  const pad = PADDING[style?.paddingY ?? opts.defaultPadding] ?? PADDING.lg;
  const inline: string[] = [];
  if (style?.bgColor) inline.push(`background:${style.bgColor}`);
  if (style?.textColor) inline.push(`color:${style.textColor}`);
  return { sectionClass: `px-6 ${pad} ${opts.bgClass}`, sectionStyle: inline.join(";") };
}

/** Resolve an <a> button's classes + inline style from a CTA + a fallback. */
export function ctaAttrs(
  cta: CTA | undefined,
  fallback: { kind: "primary" | "secondary"; onBrand: boolean }
): { cls: string; style: string } {
  const base = "inline-flex h-12 items-center rounded-md px-6 text-base font-medium transition-colors";
  const variant = cta?.style ?? (fallback.kind === "primary" ? "solid" : "outline");
  const color = cta?.color;

  if (variant === "solid") {
    if (color) return { cls: `${base}`, style: `background:${color};color:#fff` };
    return {
      cls: `${base} ${fallback.onBrand ? "bg-white text-brand hover:bg-surface" : "bg-brand text-brand-fg hover:bg-brand-hover"}`,
      style: ""
    };
  }
  if (variant === "outline") {
    if (color) return { cls: `${base} border`, style: `border-color:${color};color:${color}` };
    return {
      cls: `${base} border ${fallback.onBrand ? "border-white/40 text-brand-fg hover:bg-white/10" : "border-brand text-brand hover:bg-brand/5"}`,
      style: ""
    };
  }
  // ghost
  if (color) return { cls: base, style: `color:${color}` };
  return { cls: `${base} ${fallback.onBrand ? "text-brand-fg hover:bg-white/10" : "text-brand hover:bg-brand/5"}`, style: "" };
}

const RADIUS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full"
};

/** Resolve an <img>'s classes + inline style (opacity/radius/fit). */
export function imageAttrs(img: ImageRef): { cls: string; style: string } {
  const radius = RADIUS[img.radius ?? "md"] ?? RADIUS.md;
  const fit = img.fit === "contain" ? "object-contain" : "object-cover";
  const style =
    typeof img.opacity === "number" && img.opacity < 100 ? `opacity:${img.opacity / 100}` : "";
  return { cls: `${radius} ${fit}`, style };
}
