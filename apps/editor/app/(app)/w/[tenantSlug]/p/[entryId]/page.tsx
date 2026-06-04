import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Eye, EyeOff, FileText, Plus } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { getEntry, listArticles, type Article } from "@/lib/cms-client";
import { DocumentBuilder } from "@/components/DocumentBuilder";
import { DeleteButton } from "@/components/DeleteButton";
import {
  addSection,
  createArticleAction,
  deleteArticleAction,
  moveSection,
  publishPage,
  removeSection,
  savePage
} from "../../actions";

export default async function PageEditor({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string; entryId: string }>;
  searchParams: Promise<{ saved?: string; removed?: string; articleDeleted?: string }>;
}) {
  const { tenantSlug, entryId } = await params;
  const { saved, removed } = await searchParams;

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  let entry;
  try {
    entry = await getEntry(membership.tenantId, entryId);
  } catch {
    notFound();
  }
  const articles = await listArticles(membership.tenantId, entryId).catch(() => [] as Article[]);

  const isLanding = entry.type === "landing_page";
  const previewPath = entry.slug === "home" || entry.slug === null ? "" : `/${entry.slug}`;
  const isPublished = entry.status === "published";

  const publishToggle = (
    <button
      type="submit"
      formAction={publishPage.bind(null, tenantSlug, entryId)}
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
      kindLabel={isLanding ? "Landing page" : "Page"}
      title={entry.title}
      slug={entry.slug}
      status={entry.status}
      updatedAt={entry.updatedAt}
      sections={entry.body?.sections ?? []}
      seo={entry.seo ?? {}}
      tenantSlug={tenantSlug}
      previewUrl={`http://localhost:4321/preview/${entryId}`}
      externalPreviewHref={`http://localhost:4321${previewPath}`}
      backHref={`/w/${tenantSlug}`}
      backLabel="Back to workspace"
      formId="page-builder-form"
      slugHint="URL path. Use 'home' for the root page."
      saved={Boolean(saved)}
      removed={Boolean(removed)}
      headerExtra={publishToggle}
      actions={{
        save: savePage.bind(null, tenantSlug, entryId),
        addSection: addSection.bind(null, tenantSlug, entryId),
        moveSection: moveSection.bind(null, tenantSlug, entryId),
        removeSection: removeSection.bind(null, tenantSlug, entryId)
      }}
    >
      <ArticlesPanel tenantSlug={tenantSlug} webPageId={entryId} articles={articles} />
    </DocumentBuilder>
  );
}

function ArticlesPanel({
  tenantSlug,
  webPageId,
  articles
}: {
  tenantSlug: string;
  webPageId: string;
  articles: Article[];
}) {
  return (
    <div className="mb-8 border border-border bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <h3 className="text-h3 text-text">Articles</h3>
          <span className="text-sm text-text-muted">{articles.length}</span>
        </div>
        {/* Lives inside the builder form → submit to createArticleAction. */}
        <button
          type="submit"
          formAction={createArticleAction.bind(null, tenantSlug, webPageId)}
          className="inline-flex h-9 items-center rounded-md border border-border-emphasis bg-bg px-3 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New article
        </button>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        Posts under this page (e.g. a blog). Each uses the same section builder and supports public comments.
      </p>

      {articles.length > 0 && (
        <div className="mt-5 divide-y divide-border border-y border-border">
          {articles.map((a) => (
            <div
              key={a.id}
              className="group relative flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface"
            >
              <div className="min-w-0">
                <Link
                  href={`/w/${tenantSlug}/p/${webPageId}/a/${a.id}`}
                  className="block truncate text-sm font-medium text-text transition-colors group-hover:text-brand after:absolute after:inset-0 after:content-['']"
                >
                  {a.title}
                </Link>
                <p className="mt-0.5 text-xs text-text-muted">
                  {a.slug ? `/${a.slug}` : "no slug"} · {a.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-text transition-colors group-hover:text-brand">
                  Edit <ArrowRight className="h-3.5 w-3.5 nudge" />
                </span>
                <span className="relative z-10">
                  <DeleteButton
                    label="Delete"
                    confirmText={`Delete article "${a.title}"?`}
                    formAction={deleteArticleAction.bind(null, tenantSlug, webPageId, a.id)}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
