import { notFound, redirect } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { getArticle } from "@/lib/cms-client";
import { DocumentBuilder } from "@/components/DocumentBuilder";
import {
  addArticleSection,
  moveArticleSection,
  publishArticle,
  removeArticleSection,
  saveArticle
} from "../../../../actions";

export default async function ArticleEditor({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string; entryId: string; articleId: string }>;
  searchParams: Promise<{ saved?: string; removed?: string; status?: string }>;
}) {
  const { tenantSlug, entryId, articleId } = await params;
  const { saved, removed } = await searchParams;

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  let article;
  try {
    article = await getArticle(membership.tenantId, articleId);
  } catch {
    notFound();
  }

  const isPublished = article.status === "published";
  const previewUrl = `http://localhost:4321/preview/article/${articleId}`;

  const publishToggle = (
    <button
      type="submit"
      formAction={publishArticle.bind(null, tenantSlug, articleId)}
      className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
        isPublished
          ? "border border-border-emphasis bg-bg text-text hover:border-brand hover:text-brand"
          : "bg-brand text-white hover:bg-brand-hover"
      }`}
    >
      {isPublished ? (
        <>
          <EyeOff className="mr-2 h-3.5 w-3.5" />
          Unpublish
        </>
      ) : (
        <>
          <Eye className="mr-2 h-3.5 w-3.5" />
          Publish
        </>
      )}
    </button>
  );

  return (
    <DocumentBuilder
      kindLabel="Article"
      title={article.title}
      slug={article.slug}
      status={article.status}
      updatedAt={article.updatedAt}
      sections={article.body?.sections ?? []}
      seo={article.seo ?? {}}
      tenantSlug={tenantSlug}
      previewUrl={previewUrl}
      externalPreviewHref={previewUrl}
      backHref={`/w/${tenantSlug}/p/${entryId}`}
      backLabel="Back to page"
      formId="article-builder-form"
      slugHint="URL path within the page, e.g. my-post"
      saved={Boolean(saved)}
      removed={Boolean(removed)}
      headerExtra={publishToggle}
      actions={{
        save: saveArticle.bind(null, tenantSlug, articleId),
        addSection: addArticleSection.bind(null, tenantSlug, articleId),
        moveSection: moveArticleSection.bind(null, tenantSlug, articleId),
        removeSection: removeArticleSection.bind(null, tenantSlug, articleId)
      }}
    />
  );
}
