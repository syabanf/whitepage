import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { ArrowRight, Book, Code2, Compass, FileCode, LineChart, Lock, Megaphone, Sparkles } from "lucide-react";

const sections = [
  {
    icon: Compass,
    title: "Getting started",
    description: "Sign up, claim your subdomain, invite your team, and ship the first page in 15 minutes.",
    items: ["Account setup", "Inviting collaborators", "First page walkthrough", "Publishing & rollback"]
  },
  {
    icon: Book,
    title: "Editor guide",
    description: "Everything marketing teams need to know to ship safely without breaking the brand.",
    items: ["Inline editing", "Adding sections", "SEO metadata", "Asset library", "Draft vs publish"]
  },
  {
    icon: FileCode,
    title: "Template authoring",
    description: "How designers and devs ship new section templates that editors can use without re-training.",
    items: ["Slot schemas", "Variant choices", "Heading-level rules", "Structured-data contributions", "Per-tenant tokens"]
  },
  {
    icon: Sparkles,
    title: "SEO",
    description: "How the platform delivers 90+ Lighthouse and rich snippets without plugins.",
    items: ["Per-page metadata", "JSON-LD per template", "Sitemap & robots", "Slug change & redirects", "IndexNow"]
  },
  {
    icon: Megaphone,
    title: "Ads & tracking",
    description: "Wire up GA4, Meta Pixel, GTM, LinkedIn, and TikTok — without pasting JavaScript.",
    items: ["Tracking configs", "Per-landing-page toggles", "UTM preservation", "Consent banner", "Conversion events"]
  },
  {
    icon: Lock,
    title: "Auth & roles",
    description: "Magic-link sign-in, brand-admin vs editor permissions, and (Business) SSO.",
    items: ["Magic-link flow", "Roles", "Removing users", "SSO via SAML"]
  },
  {
    icon: LineChart,
    title: "Analytics",
    description: "Read-only access to your form submissions, traffic, and Core Web Vitals.",
    items: ["Form inbox", "CWV dashboard", "Traffic source breakdown", "Webhooks to CRM"]
  },
  {
    icon: Code2,
    title: "API reference",
    description: "OpenAPI 3.1 spec for everything you can do programmatically.",
    items: ["Authentication", "Content entries", "Assets", "Publishing", "Internal snapshot API"]
  }
];

export default function DocsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(60%_55%_at_12%_-10%,#EFF6FF,transparent_55%)]">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="max-w-3xl motion-safe:animate-fade-up">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Documentation
            </p>
            <h1 className="text-display text-text">
              Docs.
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-text-body">
              Short, opinionated, and complete. Start with the editor guide if you&apos;re
              shipping content; the template-authoring section if you&apos;re a designer or dev.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
            {sections.map(({ icon: Icon, title, description, items }) => (
              <article key={title} className="flex flex-col bg-bg p-8 transition-colors hover:bg-surface">
                <Icon className="h-6 w-6 text-brand" aria-hidden="true" />
                <h2 className="mt-5 text-h3 text-text">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-body">{description}</p>
                <ul className="mt-6 space-y-1.5 text-sm text-text-muted">
                  {items.map((item) => (
                    <li key={item}>
                      <Link href="/docs" className="transition-colors hover:text-brand">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between md:px-10 md:py-24">
          <div>
            <h2 className="text-h2 text-text">Can&apos;t find what you need?</h2>
            <p className="mt-3 text-text-body">Support replies within one business day on every paid plan.</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-md bg-brand px-6 text-base font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Contact support
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
