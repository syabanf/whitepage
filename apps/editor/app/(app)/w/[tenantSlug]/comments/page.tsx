import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, MessageSquare, ShieldAlert, Trash2 } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { listComments, type Comment } from "@/lib/cms-client";
import { moderateComment } from "../actions";

const TABS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "spam", label: "Spam" }
];

export default async function CommentsPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { tenantSlug } = await params;
  const { status } = await searchParams;
  const active = TABS.some((t) => t.key === status) ? status! : "pending";

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  const comments = await listComments(membership.tenantId, active).catch(() => [] as Comment[]);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
          <Link
            href={`/w/${tenantSlug}`}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-text-muted" aria-hidden="true" />
            <h1 className="text-h1 text-text">Comments</h1>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Public comments on published articles. Approve to show them on the site.
          </p>

          <div className="mt-8 flex border-b border-border">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/w/${tenantSlug}/comments?status=${t.key}`}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active === t.key ? "border-brand text-text" : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {t.label}
                {active === t.key ? ` · ${comments.length}` : ""}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
          {comments.length === 0 ? (
            <div className="border border-dashed border-border bg-bg p-10 text-center">
              <p className="text-sm font-medium text-text">Nothing here</p>
              <p className="mt-1 text-sm text-text-muted">No {active} comments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <article key={c.id} className="border border-border bg-bg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold text-text">{c.authorName}</span>
                        {c.authorEmail && <span className="text-xs text-text-muted">{c.authorEmail}</span>}
                        <span className="text-xs text-text-muted">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-text-body">{c.body}</p>
                      {c.articleTitle && (
                        <p className="mt-2 text-xs text-text-muted">on: {c.articleTitle}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {active !== "approved" && (
                        <ModBtn action={moderateComment.bind(null, tenantSlug, c.id, "approved")} label="Approve" tone="ok">
                          <Check className="h-4 w-4" />
                        </ModBtn>
                      )}
                      {active !== "spam" && (
                        <ModBtn action={moderateComment.bind(null, tenantSlug, c.id, "spam")} label="Mark spam" tone="warn">
                          <ShieldAlert className="h-4 w-4" />
                        </ModBtn>
                      )}
                      <ModBtn action={moderateComment.bind(null, tenantSlug, c.id, "deleted")} label="Delete" tone="danger">
                        <Trash2 className="h-4 w-4" />
                      </ModBtn>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ModBtn({
  action,
  label,
  tone,
  children
}: {
  action: () => void | Promise<void>;
  label: string;
  tone: "ok" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const hover =
    tone === "ok"
      ? "hover:border-success hover:text-success"
      : tone === "warn"
        ? "hover:border-warning hover:text-warning"
        : "hover:border-danger hover:text-danger";
  return (
    <form action={action}>
      <button
        type="submit"
        aria-label={label}
        title={label}
        className={`flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted transition-colors ${hover}`}
      >
        {children}
      </button>
    </form>
  );
}
