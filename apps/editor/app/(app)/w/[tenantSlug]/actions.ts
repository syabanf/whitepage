"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createArticle as apiCreateArticle,
  createEntry,
  createProject,
  createPublish,
  deleteArticle as apiDeleteArticle,
  deleteEntry,
  getArticle,
  getEntry,
  moderateComment as apiModerateComment,
  updateArticle,
  updateEntry,
  TEMPLATE_FIELDS,
  type Article,
  type Entry,
  type Section
} from "@/lib/cms-client";
import { applyFormToSections } from "@/lib/sections";
import { getMe } from "@/lib/auth/session";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function resolveTenant(slug: string) {
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === slug);
  if (!membership) redirect("/dashboard?error=no-membership");
  return membership;
}

function sectionsOf(doc: { body?: { sections?: Section[] } }): Section[] {
  return Array.isArray(doc.body?.sections) ? doc.body!.sections! : [];
}

async function persist(
  tenantId: string,
  entry: Entry,
  sections: Section[],
  extra: { title?: string; slug?: string | null; seo?: Record<string, unknown> } = {}
) {
  await updateEntry(tenantId, entry.id, {
    title: extra.title ?? entry.title,
    slug: extra.slug !== undefined ? extra.slug : entry.slug,
    body: { ...entry.body, sections },
    seo: extra.seo ?? entry.seo
  });
}

export async function savePage(tenantSlug: string, entryId: string, formData: FormData) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getEntry(membership.tenantId, entryId);

  const title = formData.get("title")?.toString().trim() || current.title;
  const slug = formData.get("slug")?.toString().trim() || null;
  const seoTitle = formData.get("seo.title")?.toString() ?? "";
  const seoDescription = formData.get("seo.description")?.toString() ?? "";

  const sections = applyFormToSections(sectionsOf(current), formData);

  await persist(membership.tenantId, current, sections, {
    title,
    slug,
    seo: { ...current.seo, title: seoTitle || null, description: seoDescription || null }
  });

  revalidatePath(`/w/${tenantSlug}/p/${entryId}`);
  redirect(`/w/${tenantSlug}/p/${entryId}?saved=1`);
}

export async function addSection(
  tenantSlug: string,
  entryId: string,
  templateKey: string,
  formData: FormData
) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getEntry(membership.tenantId, entryId);
  // Preserve any in-progress edits before adding.
  const sections = applyFormToSections(sectionsOf(current), formData);

  const schema = TEMPLATE_FIELDS[templateKey];
  const newSection: Section = {
    id: randomUUID().slice(0, 8),
    templateKey,
    slots: schema ? structuredClone(schema.defaultSlots) : {},
    variants: schema ? structuredClone(schema.defaultVariants) : {}
  };

  await persist(membership.tenantId, current, [...sections, newSection]);
  // No redirect — revalidate so the inspector + live preview update in place.
  revalidatePath(`/w/${tenantSlug}/p/${entryId}`);
}

export async function moveSection(
  tenantSlug: string,
  entryId: string,
  sectionId: string,
  direction: "up" | "down",
  formData: FormData
) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getEntry(membership.tenantId, entryId);
  const sections = applyFormToSections(sectionsOf(current), formData);

  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) redirect(`/w/${tenantSlug}/p/${entryId}`);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith >= 0 && swapWith < sections.length) {
    [sections[idx], sections[swapWith]] = [sections[swapWith], sections[idx]];
  }

  await persist(membership.tenantId, current, sections);
  revalidatePath(`/w/${tenantSlug}/p/${entryId}`);
  redirect(`/w/${tenantSlug}/p/${entryId}#section-${sectionId}`);
}

export async function removeSection(
  tenantSlug: string,
  entryId: string,
  sectionId: string,
  formData: FormData
) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getEntry(membership.tenantId, entryId);
  const sections = applyFormToSections(sectionsOf(current), formData).filter(
    (s) => s.id !== sectionId
  );

  await persist(membership.tenantId, current, sections);
  revalidatePath(`/w/${tenantSlug}/p/${entryId}`);
  redirect(`/w/${tenantSlug}/p/${entryId}?removed=1`);
}

export async function createPage(tenantSlug: string, formData: FormData) {
  const membership = await resolveTenant(tenantSlug);

  const title = formData.get("title")?.toString().trim() ?? "";
  const type = formData.get("type")?.toString() === "landing_page" ? "landing_page" : "page";
  const slugInput = formData.get("slug")?.toString().trim() ?? "";
  const starter = formData.get("starter")?.toString() ?? "";
  const projectId = formData.get("projectId")?.toString() || undefined;
  const projectQS = projectId ? `&project=${projectId}` : "";

  if (!title) {
    redirect(`/w/${tenantSlug}/new?error=title-required&type=${type}${projectQS}`);
  }
  const slug = slugInput ? slugify(slugInput) : slugify(title);

  const sections: Section[] = [];
  if (starter && TEMPLATE_FIELDS[starter]) {
    const schema = TEMPLATE_FIELDS[starter];
    sections.push({
      id: randomUUID().slice(0, 8),
      templateKey: starter,
      slots: structuredClone(schema.defaultSlots),
      variants: structuredClone(schema.defaultVariants)
    });
  }

  let entry: Entry;
  try {
    entry = await createEntry(membership.tenantId, {
      type,
      title,
      slug,
      projectId,
      body: { sections },
      seo: { title, description: null }
    });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("409") ? "slug-taken" : "create-failed";
    redirect(`/w/${tenantSlug}/new?error=${msg}&type=${type}${projectQS}`);
  }

  revalidatePath(`/w/${tenantSlug}`);
  redirect(`/w/${tenantSlug}/p/${entry.id}`);
}

export async function deletePage(tenantSlug: string, entryId: string) {
  const membership = await resolveTenant(tenantSlug);
  await deleteEntry(membership.tenantId, entryId);
  revalidatePath(`/w/${tenantSlug}`);
  redirect(`/w/${tenantSlug}?deleted=1`);
}

export async function publishPage(tenantSlug: string, entryId: string) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getEntry(membership.tenantId, entryId);
  const next = current.status === "published" ? "draft" : "published";
  await updateEntry(membership.tenantId, entryId, { status: next });
  revalidatePath(`/w/${tenantSlug}/p/${entryId}`);
  redirect(`/w/${tenantSlug}/p/${entryId}?status=${next}`);
}

export async function createProjectAction(tenantSlug: string, formData: FormData) {
  const membership = await resolveTenant(tenantSlug);
  const name = formData.get("name")?.toString().trim() ?? "";
  const slugInput = formData.get("slug")?.toString().trim() ?? "";
  if (!name) {
    redirect(`/w/${tenantSlug}/projects/new?error=name-required`);
  }
  const slug = slugInput ? slugify(slugInput) : slugify(name);

  let project;
  try {
    project = await createProject(membership.tenantId, { name, slug });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("409") ? "slug-taken" : "create-failed";
    redirect(`/w/${tenantSlug}/projects/new?error=${msg}`);
  }
  revalidatePath(`/w/${tenantSlug}`);
  revalidatePath(`/dashboard`);
  redirect(`/w/${tenantSlug}?project=${project.id}`);
}

export async function publishProject(tenantSlug: string, projectId: string) {
  const membership = await resolveTenant(tenantSlug);
  const publish = await createPublish(membership.tenantId, projectId || undefined);
  revalidatePath(`/w/${tenantSlug}`);
  const projQS = projectId ? `&project=${projectId}` : "";
  redirect(`/w/${tenantSlug}?published=${publish.id}${projQS}`);
}

// ===========================================================================
// Articles — reuse the same section builder via DocumentBuilder.
// ===========================================================================

async function persistArticle(
  tenantId: string,
  article: Article,
  sections: Section[],
  extra: { title?: string; slug?: string | null; seo?: Record<string, unknown> } = {}
) {
  await updateArticle(tenantId, article.id, {
    title: extra.title ?? article.title,
    slug: extra.slug !== undefined ? extra.slug : article.slug,
    body: { ...article.body, sections },
    seo: extra.seo ?? article.seo
  });
}

export async function createArticleAction(tenantSlug: string, webPageId: string) {
  const membership = await resolveTenant(tenantSlug);
  // This button lives inside the page builder form, so we don't read a title
  // from it (that field is the page's). Create a draft, then open it to edit.
  const title = "Untitled article";
  const slug = `article-${randomUUID().slice(0, 6)}`;

  let article: Article;
  try {
    article = await apiCreateArticle(membership.tenantId, webPageId, {
      title,
      slug,
      body: { sections: [] },
      seo: { title }
    });
  } catch {
    redirect(`/w/${tenantSlug}/p/${webPageId}?articleError=create-failed`);
  }
  revalidatePath(`/w/${tenantSlug}/p/${webPageId}`);
  redirect(`/w/${tenantSlug}/p/${webPageId}/a/${article.id}`);
}

export async function deleteArticleAction(tenantSlug: string, webPageId: string, articleId: string) {
  const membership = await resolveTenant(tenantSlug);
  await apiDeleteArticle(membership.tenantId, articleId);
  revalidatePath(`/w/${tenantSlug}/p/${webPageId}`);
  redirect(`/w/${tenantSlug}/p/${webPageId}?articleDeleted=1`);
}

export async function saveArticle(tenantSlug: string, articleId: string, formData: FormData) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getArticle(membership.tenantId, articleId);

  const title = formData.get("title")?.toString().trim() || current.title;
  const slug = formData.get("slug")?.toString().trim() || null;
  const seoTitle = formData.get("seo.title")?.toString() ?? "";
  const seoDescription = formData.get("seo.description")?.toString() ?? "";
  const sections = applyFormToSections(sectionsOf(current), formData);

  await persistArticle(membership.tenantId, current, sections, {
    title,
    slug,
    seo: { ...current.seo, title: seoTitle || null, description: seoDescription || null }
  });
  revalidatePath(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}`);
  redirect(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}?saved=1`);
}

export async function publishArticle(tenantSlug: string, articleId: string) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getArticle(membership.tenantId, articleId);
  const next = current.status === "published" ? "draft" : "published";
  await updateArticle(membership.tenantId, articleId, { status: next });
  revalidatePath(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}`);
  redirect(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}?status=${next}`);
}

export async function addArticleSection(tenantSlug: string, articleId: string, templateKey: string, formData: FormData) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getArticle(membership.tenantId, articleId);
  const sections = applyFormToSections(sectionsOf(current), formData);
  const schema = TEMPLATE_FIELDS[templateKey];
  sections.push({
    id: randomUUID().slice(0, 8),
    templateKey,
    slots: schema ? structuredClone(schema.defaultSlots) : {},
    variants: schema ? structuredClone(schema.defaultVariants) : {}
  });
  await persistArticle(membership.tenantId, current, sections);
  // No redirect — revalidate so the inspector + live preview update in place.
  revalidatePath(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}`);
}

export async function moveArticleSection(
  tenantSlug: string,
  articleId: string,
  sectionId: string,
  direction: "up" | "down",
  formData: FormData
) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getArticle(membership.tenantId, articleId);
  const sections = applyFormToSections(sectionsOf(current), formData);
  const idx = sections.findIndex((s) => s.id === sectionId);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx !== -1 && swap >= 0 && swap < sections.length) {
    [sections[idx], sections[swap]] = [sections[swap], sections[idx]];
  }
  await persistArticle(membership.tenantId, current, sections);
  redirect(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}#section-${sectionId}`);
}

export async function removeArticleSection(tenantSlug: string, articleId: string, sectionId: string, formData: FormData) {
  const membership = await resolveTenant(tenantSlug);
  const current = await getArticle(membership.tenantId, articleId);
  const sections = applyFormToSections(sectionsOf(current), formData).filter((s) => s.id !== sectionId);
  await persistArticle(membership.tenantId, current, sections);
  redirect(`/w/${tenantSlug}/p/${current.webPageId}/a/${articleId}?removed=1`);
}

// ===========================================================================
// Comment moderation
// ===========================================================================
export async function moderateComment(
  tenantSlug: string,
  commentId: string,
  status: "approved" | "spam" | "deleted" | "pending"
) {
  const membership = await resolveTenant(tenantSlug);
  await apiModerateComment(membership.tenantId, commentId, status);
  revalidatePath(`/w/${tenantSlug}/comments`);
  redirect(`/w/${tenantSlug}/comments`);
}
