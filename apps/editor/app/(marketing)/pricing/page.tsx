import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    eyebrow: "For one company site",
    price: "$49",
    cadence: "/ month",
    description: "Everything a small marketing team needs to ship a company site and a few campaigns.",
    cta: "Start free trial",
    href: "/",
    featured: false,
    features: [
      "1 site (company profile)",
      "Up to 3 editors",
      "All 25 stock section templates",
      "100GB CDN traffic / month",
      "Subdomain on cms.app",
      "Email support"
    ]
  },
  {
    name: "Growth",
    eyebrow: "For paid-traffic teams",
    price: "$249",
    cadence: "/ month",
    description: "Designed for marketing teams running real ad spend and shipping landing pages weekly.",
    cta: "Start free trial",
    href: "/",
    featured: true,
    features: [
      "Everything in Starter",
      "Unlimited landing pages",
      "Unlimited editors",
      "Custom domain + auto-SSL",
      "A/B variants (v1.1)",
      "1TB CDN traffic / month",
      "GA4, Meta Pixel, GTM, LinkedIn, TikTok wired",
      "Priority support"
    ]
  },
  {
    name: "Business",
    eyebrow: "For brand-owned sites",
    price: "Custom",
    cadence: "",
    description: "Bespoke templates authored against your design system. White-glove migration off WordPress.",
    cta: "Talk to us",
    href: "/",
    featured: false,
    features: [
      "Everything in Growth",
      "Bespoke section templates",
      "Custom design tokens",
      "SSO (SAML / Okta)",
      "Unlimited traffic",
      "SLA + DPA",
      "WordPress migration assistance",
      "Dedicated support"
    ]
  }
];

const faqs = [
  {
    q: "Can I export my content if I leave?",
    a: "Yes. Every publish snapshot is a self-contained JSON tree you can download. We don't lock content in proprietary plugins the way WordPress does."
  },
  {
    q: "Do you charge per editor?",
    a: "Starter caps at 3 editors. Growth and Business are unlimited. We don't believe in punishing collaboration."
  },
  {
    q: "What if I exceed the CDN traffic cap?",
    a: "We email you before billing — you can upgrade or pay overage at $0.01/GB. We never throttle without notice."
  },
  {
    q: "Is there a free tier?",
    a: "No, but every paid plan has a 14-day free trial. We'd rather charge a fair price than fund the platform with ads or upsell rugpulls."
  }
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(60%_55%_at_12%_-10%,#EFF6FF,transparent_55%)]">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="max-w-3xl motion-safe:animate-fade-up">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Pricing
            </p>
            <h1 className="text-display text-text">
              One promise.<br />
              <span className="text-brand">Three tiers.</span>
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-text-body">
              No per-seat editor pricing. No plugin marketplace markup. No surprise overages.
              Pick the tier that fits your traffic volume and ship.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
          <div className="grid gap-px bg-border md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col bg-bg p-8 md:p-10 ${tier.featured ? "md:border-t-2 md:border-brand md:-mt-px" : ""}`}
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                  {tier.eyebrow}
                </p>
                <h2 className="mt-3 text-h2 text-text">{tier.name}</h2>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-text">{tier.price}</span>
                  {tier.cadence && (
                    <span className="text-sm text-text-muted">{tier.cadence}</span>
                  )}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-text-body">{tier.description}</p>

                <Link
                  href={tier.href}
                  className={`mt-8 inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors ${
                    tier.featured
                      ? "bg-brand text-white hover:bg-brand-hover"
                      : "border border-border-emphasis text-text hover:border-brand hover:text-brand"
                  }`}
                >
                  {tier.cta}
                </Link>

                <ul className="mt-10 space-y-3 border-t border-border pt-8 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-text-body">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Frequently asked
          </p>
          <h2 className="mt-3 text-h1 text-text">Pricing questions.</h2>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <h3 className="text-lg font-medium leading-snug text-text">{faq.q}</h3>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center border border-border text-text-muted transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-base leading-relaxed text-text-body">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
