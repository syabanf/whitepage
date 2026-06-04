import type { Entry, Snapshot } from "./snapshot";
import { templateRegistry } from "@cms/templates";

export function buildJsonLd(entry: Entry, snapshot: Snapshot, pageUrl: URL): Record<string, unknown>[] {
  const docs: Record<string, unknown>[] = [];

  // Organization (site-level)
  docs.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: snapshot.tenant.name,
    url: pageUrl.origin
  });

  if (entry.type === "article") {
    // BlogPosting envelope for articles
    docs.push({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: entry.title,
      url: pageUrl.toString(),
      datePublished: entry.publishedAt ?? undefined,
      publisher: {
        "@type": "Organization",
        name: snapshot.tenant.name
      }
    });
  } else {
    // WebPage envelope
    docs.push({
      "@context": "https://schema.org",
      "@type": pageTypeFor(entry.type),
      name: entry.title,
      url: pageUrl.toString()
    });
  }

  // Template-specific contributions
  for (const section of entry.body.sections) {
    const meta = templateRegistry[section.templateKey];
    if (!meta?.structuredData) continue;
    const contribution = meta.structuredData(section);
    if (contribution) docs.push(contribution);
  }

  return docs;
}

function pageTypeFor(entryType: string): string {
  switch (entryType) {
    case "about":
    case "page-about":
      return "AboutPage";
    case "contact":
    case "page-contact":
      return "ContactPage";
    default:
      return "WebPage";
  }
}
