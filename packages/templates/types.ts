import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export interface SlotSchema {
  $schema?: string;
  type: "object";
  required?: string[];
  properties: Record<string, unknown>;
  additionalProperties?: boolean;
}

export interface VariantChoice {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  default: string;
}

export interface SectionData {
  id: string;
  templateKey: string;
  slots: Record<string, unknown>;
  variants?: Record<string, unknown>;
}

export interface TemplateMeta {
  key: string;
  label: string;
  description: string;
  category: "hero" | "content" | "social-proof" | "cta" | "form" | "media";
  headingLevel: "h1" | "h2" | "h3";
  slotSchema: SlotSchema;
  variants: VariantChoice[];
  structuredData?: (section: SectionData) => Record<string, unknown> | null;
  component: AstroComponentFactory;
}

export type TemplateRegistry = Record<string, TemplateMeta>;
