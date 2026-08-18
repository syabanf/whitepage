import { API_BASE } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";

export interface Entry {
  id: string;
  tenantId: string;
  type: string;
  slug: string | null;
  status: "draft" | "published" | "archived";
  title: string;
  body: {
    sections?: Section[];
    [k: string]: unknown;
  };
  seo: SeoMeta;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SectionStyle {
  bgColor?: string;
  textColor?: string;
  paddingY?: "none" | "sm" | "md" | "lg" | "xl";
}

export interface CTAValue {
  label?: string;
  href?: string;
  style?: "solid" | "outline" | "ghost";
  color?: string;
}

export interface Section {
  id: string;
  templateKey: string;
  slots: Record<string, unknown>;
  variants?: Record<string, unknown>;
  style?: SectionStyle;
}

export interface SeoMeta {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  [k: string]: unknown;
}

export interface Publish {
  id: string;
  tenantId: string;
  status: "pending" | "building" | "live" | "failed" | "rolled_back";
  triggeredBy: string | null;
  artifactKey: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

async function authed(): Promise<HeadersInit> {
  const token = await getSessionToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export interface Project {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  primaryDomain: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listProjects(tenantId: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`list projects failed: ${res.status}`);
  return (await res.json()) as Project[];
}

export async function createProject(
  tenantId: string,
  input: { name: string; slug: string; primaryDomain?: string | null }
): Promise<Project> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects`, {
    method: "POST",
    headers: await authed(),
    body: JSON.stringify(input),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`create project failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Project;
}

export async function listEntries(tenantId: string, type?: string, projectId?: string): Promise<Entry[]> {
  const url = new URL(`${API_BASE}/tenants/${tenantId}/entries`);
  if (type) url.searchParams.set("type", type);
  if (projectId) url.searchParams.set("projectId", projectId);
  const res = await fetch(url.toString(), { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`list entries failed: ${res.status}`);
  const body = (await res.json()) as { items: Entry[] };
  return body.items;
}

export async function getEntry(tenantId: string, entryId: string): Promise<Entry> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/entries/${entryId}`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`get entry failed: ${res.status}`);
  return (await res.json()) as Entry;
}

export async function updateEntry(
  tenantId: string,
  entryId: string,
  patch: Partial<Pick<Entry, "title" | "slug" | "status" | "body" | "seo">>
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/entries/${entryId}`, {
    method: "PATCH",
    headers: await authed(),
    body: JSON.stringify(patch),
    cache: "no-store"
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`update entry failed: ${res.status} ${text}`);
  }
  return (await res.json()) as Entry;
}

export async function createEntry(
  tenantId: string,
  input: { type: string; title: string; slug?: string | null; projectId?: string; body?: unknown; seo?: unknown }
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/entries`, {
    method: "POST",
    headers: await authed(),
    body: JSON.stringify(input),
    cache: "no-store"
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create entry failed: ${res.status} ${text}`);
  }
  return (await res.json()) as Entry;
}

export async function deleteEntry(tenantId: string, entryId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/entries/${entryId}`, {
    method: "DELETE",
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`delete entry failed: ${res.status}`);
  }
}

// --- Articles ---------------------------------------------------------------
export interface Article {
  id: string;
  projectId: string;
  webPageId: string;
  slug: string | null;
  title: string;
  status: "draft" | "published" | "archived";
  excerpt: string | null;
  body: { sections?: Section[]; [k: string]: unknown };
  seo: SeoMeta;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listArticles(tenantId: string, webPageId: string): Promise<Article[]> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/entries/${webPageId}/articles`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`list articles failed: ${res.status}`);
  return ((await res.json()) as { items: Article[] }).items;
}

export async function getArticle(tenantId: string, articleId: string): Promise<Article> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/articles/${articleId}`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`get article failed: ${res.status}`);
  return (await res.json()) as Article;
}

export async function createArticle(
  tenantId: string,
  webPageId: string,
  input: { title: string; slug?: string | null; excerpt?: string | null; body?: unknown; seo?: unknown }
): Promise<Article> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/entries/${webPageId}/articles`, {
    method: "POST",
    headers: await authed(),
    body: JSON.stringify(input),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`create article failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Article;
}

export async function updateArticle(
  tenantId: string,
  articleId: string,
  patch: Partial<Pick<Article, "title" | "slug" | "status" | "excerpt" | "body" | "seo">>
): Promise<Article> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/articles/${articleId}`, {
    method: "PATCH",
    headers: await authed(),
    body: JSON.stringify(patch),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`update article failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Article;
}

export async function deleteArticle(tenantId: string, articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/articles/${articleId}`, {
    method: "DELETE",
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok && res.status !== 204) throw new Error(`delete article failed: ${res.status}`);
}

// --- Comments ---------------------------------------------------------------
export interface Comment {
  id: string;
  articleId: string;
  projectId: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string | null;
  body: string;
  status: "pending" | "approved" | "spam" | "deleted";
  articleTitle?: string | null;
  createdAt: string;
}

export async function listComments(tenantId: string, status?: string): Promise<Comment[]> {
  const url = new URL(`${API_BASE}/tenants/${tenantId}/comments`);
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString(), { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`list comments failed: ${res.status}`);
  return ((await res.json()) as { items: Comment[] }).items;
}

export async function moderateComment(tenantId: string, commentId: string, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/comments/${commentId}`, {
    method: "PATCH",
    headers: await authed(),
    body: JSON.stringify({ status }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`moderate comment failed: ${res.status}`);
}

// --- Platform (SaaS) admin -------------------------------------------------
export interface AdminStats {
  tenants: number;
  users: number;
  platformAdmins: number;
  projects: number;
  webPages: number;
  publishedPages: number;
  articles: number;
  comments: number;
  pendingComments: number;
  livePublishes: number;
  failedPublishes: number;
}

export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  projects: number;
  members: number;
  pages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isPlatformAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  workspaces: number;
}

export interface AdminProject {
  id: string;
  slug: string;
  name: string;
  tenantName: string;
  createdAt: string;
  pages: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`admin stats failed: ${res.status}`);
  return (await res.json()) as AdminStats;
}

export async function listAdminTenants(): Promise<AdminTenant[]> {
  const res = await fetch(`${API_BASE}/admin/tenants`, { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`admin tenants failed: ${res.status}`);
  return ((await res.json()) as { items: AdminTenant[] }).items;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`admin users failed: ${res.status}`);
  return ((await res.json()) as { items: AdminUser[] }).items;
}

export async function listAdminProjects(): Promise<AdminProject[]> {
  const res = await fetch(`${API_BASE}/admin/projects`, { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`admin projects failed: ${res.status}`);
  return ((await res.json()) as { items: AdminProject[] }).items;
}

export async function setUserPlatformAdmin(userId: string, isPlatformAdmin: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "PATCH",
    headers: await authed(),
    body: JSON.stringify({ isPlatformAdmin }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`set platform admin failed: ${res.status}`);
}

// --- Domains ---------------------------------------------------------------
export interface DomainDNS {
  cnameTarget: string;
  txtName: string;
  txtValue: string;
}

export interface Domain {
  id: string;
  projectId: string;
  hostname: string;
  type: "subdomain" | "custom";
  status: "pending" | "verified" | "active" | "error";
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
  dns?: DomainDNS;
}

export async function listDomains(
  tenantId: string,
  projectId: string
): Promise<{ items: Domain[]; platformDomain: string }> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects/${projectId}/domains`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`list domains failed: ${res.status}`);
  return (await res.json()) as { items: Domain[]; platformDomain: string };
}

export async function addDomain(tenantId: string, projectId: string, hostname: string): Promise<Domain> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects/${projectId}/domains`, {
    method: "POST",
    headers: await authed(),
    body: JSON.stringify({ hostname }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`add domain failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Domain;
}

export async function verifyDomain(
  tenantId: string,
  projectId: string,
  domainId: string
): Promise<{ status: string; message?: string }> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects/${projectId}/domains/${domainId}/verify`, {
    method: "POST",
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`verify domain failed: ${res.status}`);
  return (await res.json()) as { status: string; message?: string };
}

export async function setPrimaryDomain(tenantId: string, projectId: string, domainId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects/${projectId}/domains/${domainId}/primary`, {
    method: "POST",
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`set primary failed: ${res.status} ${await res.text()}`);
}

export async function deleteDomain(tenantId: string, projectId: string, domainId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/projects/${projectId}/domains/${domainId}`, {
    method: "DELETE",
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok && res.status !== 204) throw new Error(`delete domain failed: ${res.status}`);
}

export async function listPublishes(tenantId: string, projectId?: string): Promise<Publish[]> {
  const url = new URL(`${API_BASE}/tenants/${tenantId}/publishes`);
  if (projectId) url.searchParams.set("projectId", projectId);
  const res = await fetch(url.toString(), { headers: await authed(), cache: "no-store" });
  if (!res.ok) throw new Error(`list publishes failed: ${res.status}`);
  return (await res.json()) as Publish[];
}

export async function createPublish(tenantId: string, projectId?: string): Promise<Publish> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/publishes`, {
    method: "POST",
    headers: await authed(),
    body: JSON.stringify(projectId ? { projectId } : {}),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`create publish failed: ${res.status}`);
  return (await res.json()) as Publish;
}

export async function getPublish(tenantId: string, publishId: string): Promise<Publish> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/publishes/${publishId}`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`get publish failed: ${res.status}`);
  return (await res.json()) as Publish;
}

/**
 * Known template field schemas — used by the editor to render slot inputs.
 * Duplicated from packages/templates because that package is Astro-only.
 */
export interface ImageRef {
  assetId?: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  opacity?: number; // 0–100
  radius?: "none" | "sm" | "md" | "lg" | "full";
  fit?: "cover" | "contain";
}

export interface TemplateSchema {
  label: string;
  category: string;
  description: string;
  textSlots: Array<{ name: string; label: string; multiline?: boolean }>;
  imageSlots: Array<{ name: string; label: string }>;
  ctaSlots: Array<{ name: string; label: string }>;
  variants: Array<{ name: string; label: string; options: string[] }>;
  /** Default slot/variant values used when adding a fresh section. */
  defaultSlots: Record<string, unknown>;
  defaultVariants: Record<string, unknown>;
}

export const TEMPLATE_FIELDS: Record<string, TemplateSchema> = {
  hero_centered: {
    label: "Hero — Centered",
    category: "Hero",
    description: "Large centered headline with up to two call-to-action buttons.",
    textSlots: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "headline", label: "Headline" },
      { name: "subhead", label: "Subhead", multiline: true }
    ],
    imageSlots: [],
    ctaSlots: [
      { name: "primaryCta", label: "Primary button" },
      { name: "secondaryCta", label: "Secondary button" }
    ],
    variants: [
      { name: "background", label: "Background", options: ["white", "gray", "brand"] },
      { name: "align", label: "Alignment", options: ["center", "left"] }
    ],
    defaultSlots: {
      eyebrow: "Eyebrow",
      headline: "A headline that sells",
      subhead: "Supporting sentence that explains the value in one breath.",
      primaryCta: { label: "Get started", href: "/contact" }
    },
    defaultVariants: { background: "white", align: "center" }
  },
  image_feature: {
    label: "Image + Text",
    category: "Media",
    description: "An image beside a heading, body copy, and an optional button.",
    textSlots: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "headline", label: "Headline" },
      { name: "body", label: "Body", multiline: true }
    ],
    imageSlots: [{ name: "image", label: "Image" }],
    ctaSlots: [{ name: "cta", label: "Button" }],
    variants: [
      { name: "imagePosition", label: "Image position", options: ["right", "left"] },
      { name: "background", label: "Background", options: ["white", "gray"] }
    ],
    defaultSlots: {
      headline: "Show, don't tell",
      body: "Pair a strong visual with a tight paragraph that earns the click.",
      image: null
    },
    defaultVariants: { imagePosition: "right", background: "white" }
  },
  faq_accordion: {
    label: "FAQ — Accordion",
    category: "Content",
    description: "Expandable Q&A list. Emits FAQPage rich-result markup automatically.",
    textSlots: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "headline", label: "Headline" }
    ],
    imageSlots: [],
    ctaSlots: [],
    variants: [{ name: "background", label: "Background", options: ["white", "gray"] }],
    defaultSlots: {
      eyebrow: "FAQ",
      headline: "Common questions",
      items: [
        { question: "First question?", answer: "First answer." },
        { question: "Second question?", answer: "Second answer." }
      ]
    },
    defaultVariants: { background: "gray" }
  },
  cta_banner: {
    label: "CTA Banner",
    category: "CTA",
    description: "Full-width band with a headline and a single button.",
    textSlots: [
      { name: "headline", label: "Headline" },
      { name: "subhead", label: "Subhead" }
    ],
    imageSlots: [],
    ctaSlots: [{ name: "cta", label: "Button" }],
    variants: [{ name: "background", label: "Background", options: ["brand", "white"] }],
    defaultSlots: {
      headline: "Ready to get started?",
      cta: { label: "Talk to us", href: "/contact" }
    },
    defaultVariants: { background: "brand" }
  },
  lead_form_hero: {
    label: "Lead Form — Hero",
    category: "Form",
    description: "Hero with an inline lead-capture form. UTM-preserving, spam-guarded.",
    textSlots: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "headline", label: "Headline" },
      { name: "subhead", label: "Subhead", multiline: true },
      { name: "submitLabel", label: "Submit button label" }
    ],
    imageSlots: [],
    ctaSlots: [],
    variants: [
      { name: "background", label: "Background", options: ["white", "brand"] },
      { name: "layout", label: "Layout", options: ["left-form-right", "top-form-bottom"] }
    ],
    defaultSlots: {
      eyebrow: "Free analysis",
      headline: "Get your free quote",
      subhead: "Tell us what you need and we'll respond within one business day.",
      submitLabel: "Request a quote",
      formId: "lead_default",
      thankYouRedirect: "/thank-you",
      benefits: ["No obligation", "Fast turnaround"],
      fields: [
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "email", label: "Work email", type: "email", required: true }
      ]
    },
    defaultVariants: { background: "brand", layout: "left-form-right" }
  }
};

export interface Asset {
  id: string;
  tenantId: string;
  storageKey: string;
  publicUrl: string;
  filename: string;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  tags: string[];
  approved: boolean;
  createdAt: string;
}

export async function listAssets(tenantId: string): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/assets`, {
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`list assets failed: ${res.status}`);
  return (await res.json()) as Asset[];
}

export async function updateAsset(
  tenantId: string,
  assetId: string,
  patch: { altText?: string; tags?: string[] }
): Promise<Asset> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/assets/${assetId}`, {
    method: "PATCH",
    headers: await authed(),
    body: JSON.stringify(patch),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`update asset failed: ${res.status}`);
  return (await res.json()) as Asset;
}

export async function deleteAsset(tenantId: string, assetId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/assets/${assetId}`, {
    method: "DELETE",
    headers: await authed(),
    cache: "no-store"
  });
  if (!res.ok && res.status !== 404) throw new Error(`delete asset failed: ${res.status}`);
}
