import type { Entry, SeoMeta, Snapshot } from "./snapshot";

export interface PageHead {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  twitterCard: "summary" | "summary_large_image";
  robots: { index: boolean; follow: boolean };
}

export function buildPageHead(entry: Entry, snapshot: Snapshot, pageUrl: URL): PageHead {
  const seo: SeoMeta = entry.seo ?? {};
  const title = seo.title ?? entry.title;
  const description =
    seo.description ?? (typeof entry.body === "object" ? deriveDescription(entry) : "");
  const canonical = seo.canonical ?? pageUrl.toString();
  const ogTitle = seo.ogTitle ?? title;
  const ogDescription = seo.ogDescription ?? description;
  const twitterCard = seo.twitterCard ?? "summary_large_image";
  const robots = {
    index: seo.robots?.index ?? true,
    follow: seo.robots?.follow ?? true
  };

  return { title, description, canonical, ogTitle, ogDescription, twitterCard, robots };
}

function deriveDescription(entry: Entry): string {
  const firstText = entry.body.sections
    .flatMap((s) => Object.values(s.slots ?? {}))
    .filter((v): v is string => typeof v === "string" && v.length > 40)[0];
  return firstText?.slice(0, 155) ?? "";
}
