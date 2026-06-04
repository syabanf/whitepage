import type { TemplateMeta } from "../types";
import Component from "./ImageFeature.astro";

export const ImageFeatureMeta: TemplateMeta = {
  key: "image_feature",
  label: "Image + Text",
  description: "Image beside a heading, body copy, and optional CTA. Image renders with explicit dimensions (no CLS) and lazy loading.",
  category: "media",
  headingLevel: "h2",
  slotSchema: {
    type: "object",
    required: ["headline"],
    properties: {
      eyebrow: { type: "string", maxLength: 80 },
      headline: { type: "string", minLength: 1, maxLength: 160 },
      body: { type: "string", maxLength: 600 },
      image: {
        type: "object",
        properties: {
          url: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          alt: { type: "string", maxLength: 160 }
        }
      },
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
      key: "imagePosition",
      label: "Image position",
      default: "right",
      options: [
        { value: "right", label: "Right" },
        { value: "left", label: "Left" }
      ]
    },
    {
      key: "background",
      label: "Background",
      default: "white",
      options: [
        { value: "white", label: "White" },
        { value: "gray", label: "Surface" }
      ]
    }
  ],
  component: Component
};
