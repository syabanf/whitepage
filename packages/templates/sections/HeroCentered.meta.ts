import type { TemplateMeta } from "../types";
import Component from "./HeroCentered.astro";

export const HeroCenteredMeta: TemplateMeta = {
  key: "hero_centered",
  label: "Hero — Centered",
  description: "Centered hero with optional eyebrow, primary CTA, and secondary CTA. Always renders the page H1.",
  category: "hero",
  headingLevel: "h1",
  slotSchema: {
    type: "object",
    required: ["headline"],
    properties: {
      eyebrow: { type: "string", maxLength: 80 },
      headline: { type: "string", minLength: 1, maxLength: 200 },
      subhead: { type: "string", maxLength: 320 },
      primaryCta: {
        type: "object",
        required: ["label", "href"],
        properties: {
          label: { type: "string", maxLength: 40 },
          href: { type: "string" }
        }
      },
      secondaryCta: {
        type: "object",
        required: ["label", "href"],
        properties: {
          label: { type: "string", maxLength: 40 },
          href: { type: "string" }
        }
      }
    },
    additionalProperties: false
  },
  variants: [
    {
      key: "background",
      label: "Background",
      default: "white",
      options: [
        { value: "white", label: "White" },
        { value: "gray", label: "Surface" },
        { value: "brand", label: "Brand" }
      ]
    },
    {
      key: "align",
      label: "Alignment",
      default: "center",
      options: [
        { value: "center", label: "Center" },
        { value: "left", label: "Left" }
      ]
    }
  ],
  component: Component
};
