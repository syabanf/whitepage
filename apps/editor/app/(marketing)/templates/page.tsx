import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { ArrowRight, Check } from "lucide-react";

const templates = [
  {
    key: "hero_centered",
    label: "Hero — Centered",
    category: "Hero",
    description:
      "Centered hero with optional eyebrow, primary CTA, and secondary CTA. Always renders the page H1.",
    contributes: ["H1 element", "Page-level entry point"],
    available: true
  },
  {
    key: "faq_accordion",
    label: "FAQ — Accordion",
    category: "Content",
    description:
      "Expandable FAQ list with zero JavaScript (native details/summary). Emits FAQPage JSON-LD for rich snippets.",
    contributes: ["FAQPage schema.org JSON-LD", "Zero-JS interaction"],
    available: true
  },
  {
    key: "lead_form_hero",
    label: "Lead Form — Hero",
    category: "Form",
    description:
      "Hero with inline lead capture. Honeypot spam guard, UTM-preserving submit, thank-you redirect.",
    contributes: ["UTM-preserved form post", "Honeypot spam guard"],
    available: true
  },
  {
    key: "team_grid",
    label: "Team — Grid",
    category: "Content",
    description: "Responsive grid of team members with name, role, photo, and link. Emits Person JSON-LD per entry.",
    contributes: ["Person schema.org JSON-LD"],
    available: false
  },
  {
    key: "services_grid",
    label: "Services — Grid",
    category: "Content",
    description: "Card grid of services with icon, headline, and description. Emits Service / Offer JSON-LD.",
    contributes: ["Service & Offer schema.org JSON-LD"],
    available: false
  },
  {
    key: "logo_cloud",
    label: "Logo Cloud",
    category: "Social proof",
    description: "Trusted-by row of grayscale client logos. Auto-aligns at any count from 4 to 12.",
    contributes: [],
    available: false
  },
  {
    key: "cta_banner",
    label: "CTA Banner",
    category: "CTA",
    description: "Full-width call-to-action band with headline + button, white or brand background.",
    contributes: [],
    available: false
  },
  {
    key: "pricing_table",
    label: "Pricing Table",
    category: "Content",
    description: "Three- or four-column tier comparison with feature list and CTA per column.",
    contributes: ["Offer schema.org JSON-LD"],
    available: false
  }
];

export default function TemplatesPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(60%_55%_at_12%_-10%,#EFF6FF,transparent_55%)]">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="max-w-3xl motion-safe:animate-fade-up">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Template library
            </p>
            <h1 className="text-display text-text">
              Sections that ship<br />
              <span className="text-brand">rich snippets.</span>
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-text-body">
              Every template declares its editable slots, allowed variants, and the structured
              data it emits to the page head. Editors get rich results for free; designers
              never re-explain what a section can and can&apos;t do.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <article
                key={tpl.key}
                className="flex flex-col bg-bg p-8 transition-colors hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                    {tpl.category}
                  </p>
                  {!tpl.available && (
                    <span className="border border-border px-2 py-0.5 text-xs uppercase tracking-wider text-text-muted">
                      Roadmap
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-h3 text-text">{tpl.label}</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-body">{tpl.description}</p>

                {tpl.contributes.length > 0 && (
                  <ul className="mt-5 space-y-1.5">
                    {tpl.contributes.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-xs text-text-muted"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-6">
                  <code className="text-xs text-text-muted">{tpl.key}</code>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between md:px-10 md:py-24">
          <div>
            <h2 className="text-h2 text-text">Need a template we don&apos;t ship?</h2>
            <p className="mt-3 text-text-body">
              Customers on the Business tier get bespoke templates authored against their design system.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center rounded-md bg-brand px-6 text-base font-medium text-white transition-colors hover:bg-brand-hover"
          >
            See pricing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
