import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Designer ships the system in code.",
    body: "Section templates live as typed components in a versioned package. Each declares which fields editors can change, which variants are allowed, and what structured data it contributes to the page. Brand tokens (color, type, spacing) are CSS variables — one source of truth."
  },
  {
    number: "02",
    title: "Editor edits within the locked surface.",
    body: "The admin shows only the approved templates as cards. Editors swap text, pick from the brand-approved asset library, toggle declared variants, and reorder whole sections. There is no HTML field, no custom CSS, no font picker. The brand cannot be broken because the broken state is unreachable."
  },
  {
    number: "03",
    title: "Publish renders static and ships SEO.",
    body: "A publish freezes a content snapshot, runs the Astro build, uploads to the edge CDN, regenerates sitemap.xml + robots.txt + redirect table, and pings IndexNow. Every page is static HTML, ≤200ms TTFB, Lighthouse 90+ on mobile, with JSON-LD per template (FAQPage, Service, Person…) emitted automatically."
  }
];

const pipeline = [
  { label: "Snapshot", detail: "Freeze published entries into a JSONB tree" },
  { label: "Render", detail: "Astro emits static HTML + responsive images" },
  { label: "Upload", detail: "Push to Cloudflare R2 / Pages at the edge" },
  { label: "SEO", detail: "Sitemap, redirects, IndexNow ping" },
  { label: "Verify", detail: "Optional Lighthouse + structured-data lint" }
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              How it works
            </p>
            <h1 className="text-display text-text">
              How the brand stays.<br />
              <span className="text-brand">How pages ship.</span>
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-text-body">
              Three actors, three surfaces, one promise: marketing teams ship faster than they
              ever could on WordPress, and every published page is SEO-grade by construction.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-px bg-border md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="bg-bg p-8 md:p-10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                  Step {step.number}
                </p>
                <h2 className="mt-3 text-h3 text-text">{step.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-text-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Publish pipeline */}
      <section id="tracking" className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              The publish pipeline
            </p>
            <h2 className="text-h1 text-text">
              From draft to edge in seconds.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-text-body">
              When an editor clicks publish, the snapshot is sealed and every downstream
              artifact is regenerated. No partial states. No drift between draft and live.
            </p>
          </div>
          <ol className="grid gap-px bg-border md:grid-cols-5">
            {pipeline.map((step, i) => (
              <li key={step.label} className="flex flex-col gap-3 bg-bg p-6">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-semibold text-text">{step.label}</span>
                <span className="text-sm text-text-body">{step.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between md:px-10 md:py-24">
          <div>
            <h2 className="text-h2 text-text">Ready to lock the brand?</h2>
            <p className="mt-3 text-text-body">See the section templates we ship with.</p>
          </div>
          <Link
            href="/templates"
            className="inline-flex h-12 items-center rounded-md bg-brand px-6 text-base font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Explore templates
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
