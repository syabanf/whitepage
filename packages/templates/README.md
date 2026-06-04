# @cms/templates

Section templates for the Astro renderer. Each template = an `.astro` component + a `.meta.ts` file declaring its slot schema, variant choices, heading level, and structured-data contribution.

## Brand-lock contract

Editors can:
- Set slot values (text, links, images from approved library)
- Pick from declared variant options (background, alignment, layout)

Editors cannot:
- Change fonts, colors outside the variant choices, or spacing
- Reorder or add elements inside a section
- Inject HTML, custom CSS, or arbitrary JS

If a template needs a layout an editor can't currently produce, **add a new template**. Do not open an escape hatch.

## Adding a template

1. Create `sections/MyTemplate.astro` — the renderable component. Use CSS variables (`var(--brand)`, `var(--ink)`, etc.) so it restyles per tenant.
2. Create `sections/MyTemplate.meta.ts` — the metadata:
   - `key` (snake_case, stable forever)
   - `label`, `description`, `category`, `headingLevel`
   - `slotSchema` (JSON Schema for editor-validated slots)
   - `variants` (declared option lists)
   - `structuredData(section)` (optional; emit JSON-LD for SEO rich results)
3. Register in `index.ts` by adding to `templateRegistry`.

Run `pnpm --filter @cms/renderer dev` to see it.

## SEO note

Templates that emit structured data (FAQAccordion → `FAQPage`, Team → `Person`, Service → `Service`) get rich snippets for free in Google search. This is the SEO superpower of the brand-lock approach — editors get rich results without touching schema.org.
