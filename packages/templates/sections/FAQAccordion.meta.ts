import type { SectionData, TemplateMeta } from "../types";
import Component from "./FAQAccordion.astro";

export const FAQAccordionMeta: TemplateMeta = {
  key: "faq_accordion",
  label: "FAQ — Accordion",
  description: "Expandable FAQ list. Emits FAQPage JSON-LD for rich results. Zero JS (uses native <details>).",
  category: "content",
  headingLevel: "h2",
  slotSchema: {
    type: "object",
    required: ["items"],
    properties: {
      eyebrow: { type: "string", maxLength: 80 },
      headline: { type: "string", maxLength: 120 },
      items: {
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: {
          type: "object",
          required: ["question", "answer"],
          properties: {
            question: { type: "string", minLength: 1, maxLength: 200 },
            answer: { type: "string", minLength: 1, maxLength: 1200 }
          }
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
        { value: "gray", label: "Surface" }
      ]
    }
  ],
  structuredData(section: SectionData) {
    const items = section.slots.items as Array<{ question: string; answer: string }> | undefined;
    if (!items?.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    };
  },
  component: Component
};
