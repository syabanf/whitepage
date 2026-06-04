import { ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";

const trustStrip = [
  "Brand-locked editing",
  "Lighthouse 90+ by default",
  "GA4, Meta Pixel, GTM in minutes"
];

const featureCards = [
  {
    eyebrow: "Brand-lock",
    title: "Marketing edits. The brand stays.",
    body: "Designers define the system in code. Editors can swap content and pick variants — but cannot change fonts, colors, or spacing. Every published page is on-brand by construction."
  },
  {
    eyebrow: "SEO out of the box",
    title: "Lighthouse green, sitemap, JSON-LD.",
    body: "Static HTML, edge-served, with structured data emitted automatically per template. FAQ schemas, breadcrumbs, OG tags — no plugins, no Yoast tax."
  },
  {
    eyebrow: "Ads-ready",
    title: "GA4, Meta Pixel, GTM in minutes.",
    body: "Tracking is a workspace toggle, not a JS paste. Forms preserve UTM attribution to your CRM. Consent banner gates pixels in EU traffic by default."
  }
];

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = errorMessage(params.error);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-20 md:grid-cols-[1.2fr_1fr] md:gap-20 md:px-10 md:py-28">
          <div className="flex flex-col justify-center">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Hosted CMS for marketing teams
            </p>
            <h1 className="text-display text-text">
              No broken pages.<br />
              <span className="text-brand">No SEO debt.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-text-body">
              Your marketing team ships pages without a developer. Your brand stays locked.
              Every page renders static, hits 90+ Lighthouse, and is wired for ads on day one.
            </p>
            <ul className="mt-10 flex flex-col gap-3 text-sm text-text-body">
              {trustStrip.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-brand" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center">
            <AuthCard error={errorMsg} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-6 text-sm text-text-muted md:px-10">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-text">
            Built for marketing teams who ship paid traffic
          </span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-text-body">
            <span>WordPress alternative</span>
            <span className="text-text-muted/50">·</span>
            <span>Static-first renderer</span>
            <span className="text-text-muted/50">·</span>
            <span>Per-page CWV gates</span>
            <span className="text-text-muted/50">·</span>
            <span>No plugin sprawl</span>
          </div>
        </div>
      </section>

      {/* Three-up feature grid */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              What you get
            </p>
            <h2 className="text-h1 text-text">
              The promise, in three guarantees.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card, i) => {
              const href = ["/how-it-works", "/templates", "/how-it-works#tracking"][i] ?? "/";
              return (
                <a
                  key={card.eyebrow}
                  href={href}
                  className="group card-interactive flex flex-col border border-border bg-bg p-8 motion-safe:animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-brand">
                    {card.eyebrow}
                  </p>
                  <h3 className="text-h3 text-text transition-colors group-hover:text-brand">{card.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-text-body">{card.body}</p>
                  <div className="mt-auto pt-8">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-text transition-colors group-hover:text-brand">
                      Learn more
                      <ArrowRight className="h-4 w-4 nudge" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quote / closing CTA */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:px-10 md:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Why we built this
          </p>
          <blockquote className="mt-6 text-3xl font-semibold leading-[1.2] tracking-tight text-text md:text-4xl">
            &ldquo;Marketing should be able to ship a campaign landing page on a Tuesday.
            <span className="text-brand"> Without breaking the brand, the site, or the Quality Score.&rdquo;</span>
          </blockquote>
          <p className="mt-6 text-sm text-text-muted">
            Built as the WordPress alternative we wished existed.
          </p>
        </div>
      </section>
    </>
  );
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "email-invalid": return "Please enter a valid email address.";
    case "email-required": return "Email is required.";
    case "credentials-required": return "Email and password are required.";
    case "invalid-credentials": return "Email or password is incorrect.";
    case "demo-unavailable": return "Demo sign-in is unavailable. Please contact support.";
    case "request-failed": return "Could not send magic link. Please try again.";
    case "link-invalid": return "That link is invalid or has already been used. Please request a new one.";
    case "missing-token": return "The verify link is missing its token. Please request a new one.";
    case "verify-failed": return "Could not verify the link. Please request a new one.";
    case "not-signed-in": return "Please sign in to continue.";
    case "session-invalid": return "Your session has expired. Please sign in again.";
    default: return null;
  }
}
