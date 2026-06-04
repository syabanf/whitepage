import type { TemplateMeta } from "../types";
import Component from "./LeadFormHero.astro";

export const LeadFormHeroMeta: TemplateMeta = {
  key: "lead_form_hero",
  label: "Lead Form — Hero",
  description: "Hero with inline lead capture form. Honeypot spam protection; preserves UTM params on submit.",
  category: "form",
  headingLevel: "h1",
  slotSchema: {
    type: "object",
    required: ["headline", "formId", "fields", "submitLabel", "thankYouRedirect"],
    properties: {
      eyebrow: { type: "string", maxLength: 80 },
      headline: { type: "string", minLength: 1, maxLength: 160 },
      subhead: { type: "string", maxLength: 320 },
      benefits: {
        type: "array",
        maxItems: 6,
        items: { type: "string", maxLength: 120 }
      },
      formId: { type: "string", pattern: "^[a-z0-9_]+$" },
      fields: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          required: ["name", "label", "type"],
          properties: {
            name: { type: "string", pattern: "^[a-z][a-z0-9_]*$" },
            label: { type: "string", minLength: 1, maxLength: 80 },
            type: { type: "string", enum: ["text", "email", "tel", "textarea", "select"] },
            required: { type: "boolean" },
            options: { type: "array", items: { type: "string" } }
          }
        }
      },
      submitLabel: { type: "string", minLength: 1, maxLength: 40 },
      thankYouRedirect: { type: "string", pattern: "^/" }
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
        { value: "brand", label: "Brand" }
      ]
    },
    {
      key: "layout",
      label: "Layout",
      default: "left-form-right",
      options: [
        { value: "left-form-right", label: "Text left, form right" },
        { value: "top-form-bottom", label: "Text top, form bottom" }
      ]
    }
  ],
  component: Component
};
