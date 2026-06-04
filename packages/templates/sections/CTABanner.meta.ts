import type { TemplateMeta } from "../types";
import Component from "./CTABanner.astro";

export const CTABannerMeta: TemplateMeta = {
  key: "cta_banner",
  label: "CTA Banner",
  description: "Full-width call-to-action band with a headline and a single button. White or brand background.",
  category: "cta",
  headingLevel: "h2",
  slotSchema: {
    type: "object",
    required: ["headline"],
    properties: {
      headline: { type: "string", minLength: 1, maxLength: 120 },
      subhead: { type: "string", maxLength: 200 },
      cta: {
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
      default: "brand",
      options: [
        { value: "brand", label: "Brand" },
        { value: "white", label: "White" }
      ]
    }
  ],
  component: Component
};
