import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ExternalLink, FileText, FolderPlus, Globe, Images, Layers, Megaphone, MessageSquare, Plus, RefreshCw } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { listEntries, listProjects, listPublishes, type Entry, type Project } from "@/lib/cms-client";
import { DeleteButton } from "@/components/DeleteButton";
import { deletePage, publishProject } from "./actions";

export default async function WorkspacePage({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ published?: string; deleted?: string; project?: string }>;
}) {
  const { tenantSlug } = await params;
  const { published, deleted, project } = await searchParams;

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  const projects = await listProjects(membership.tenantId).catch(() => [] as Project[]);
  const active =
    projects.find((p) => p.id === project) ?? projects.find((p) => p.slug === "main") ?? projects[0];
  const activeId = active?.id;

  const [entries, publishes] = await Promise.all([
    listEntries(membership.tenantId, undefined, activeId),
    listPublishes(membership.tenantId, activeId)
  ]);

  const pages = entries.filter((e) => e.type === "page");
  const landingPages = entries.filter((e) => e.type === "landing_page");
  const projQS = activeId ? `?project=${activeId}` : "";

  return (
    <main>
      {/* Workspace header */}
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16 stagger-children">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted motion-safe:animate-fade-up">Project</p>
          <div className="mt-3 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end motion-safe:animate-fade-up">
            <div>
              <h1 className="text-h1 text-text">{active?.name ?? membership.tenantName}</h1>
              <p className="mt-2 text-sm text-text-muted">
                {membership.tenantName} workspace · role:{" "}
                <span className="font-medium text-text">{membership.role}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/w/${tenantSlug}/domains${activeId ? `?project=${activeId}` : ""}`}
                className="inline-flex h-10 items-center rounded-md border border-border-emphasis bg-bg px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                <Globe className="mr-2 h-4 w-4" />
                Domains
              </Link>
              <Link
                href={`/w/${tenantSlug}/comments`}
                className="inline-flex h-10 items-center rounded-md border border-border-emphasis bg-bg px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments
              </Link>
              <Link
                href={`/w/${tenantSlug}/media`}
                className="inline-flex h-10 items-center rounded-md border border-border-emphasis bg-bg px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                <Images className="mr-2 h-4 w-4" />
                Media
              </Link>
              <a
                href="http://localhost:4321"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-md border border-border-emphasis bg-bg px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View live site
              </a>
              <form action={publishProject.bind(null, tenantSlug, activeId ?? "")}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Publish project
                </button>
              </form>
            </div>
          </div>

          {/* Project switcher */}
          <div className="mt-8 flex flex-wrap items-center gap-2 motion-safe:animate-fade-up">
            <Layers className="h-4 w-4 text-text-muted" aria-hidden="true" />
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/w/${tenantSlug}?project=${p.id}`}
                className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                  p.id === activeId
                    ? "border-brand bg-brand-subtle text-brand"
                    : "border-border text-text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {p.name}
              </Link>
            ))}
            <Link
              href={`/w/${tenantSlug}/projects/new`}
              className="inline-flex h-8 items-center rounded-md border border-dashed border-border-emphasis px-3 text-sm font-medium text-text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
              New project
            </Link>
          </div>

          {published && (
            <Banner tone="success" title="Publish enqueued.">
              Snapshot <code className="font-mono text-xs">{published.slice(0, 8)}</code> is building.{" "}
              <a className="text-brand hover:text-brand-hover" href="http://localhost:4321" target="_blank" rel="noreferrer">
                View the site
              </a>
              .
            </Banner>
          )}
          {deleted && (
            <Banner tone="muted" title="Page deleted.">
              The page was removed. Publish to update the live site.
            </Banner>
          )}
        </div>
      </section>

      <EntrySection
        title="Pages"
        emptyIcon={FileText}
        emptyLabel="No pages yet"
        emptyBody="Pages compose your company site — Home, About, Services, etc."
        entries={pages}
        tenantSlug={tenantSlug}
        newType="page"
        newQS={projQS}
      />

      <EntrySection
        title="Landing pages"
        emptyIcon={Megaphone}
        emptyLabel="No landing pages yet"
        emptyBody="Landing pages target paid traffic — ad-ready with form capture and tracking."
        entries={landingPages}
        tenantSlug={tenantSlug}
        newType="landing_page"
        newQS={projQS}
      />

      {/* Publish history */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-h2 text-text">Publish history</h2>
            <span className="text-sm text-text-muted">{publishes.length} total</span>
          </div>
          {publishes.length === 0 ? (
            <p className="text-sm text-text-muted">
              No publishes yet. Click <em>Publish all</em> to ship the current draft to the edge.
            </p>
          ) : (
            <div className="overflow-hidden border border-border bg-bg">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-[0.14em] text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Finished</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {publishes.slice(0, 10).map((p, i) => (
                    <tr
                      key={p.id}
                      className="motion-safe:animate-fade-in"
                      style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <PublishStatus status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-text-body">{fmtTime(p.startedAt)}</td>
                      <td className="px-4 py-3 text-text-body">{fmtTime(p.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function EntrySection({
  title,
  emptyIcon: EmptyIcon,
  emptyLabel,
  emptyBody,
  entries,
  tenantSlug,
  newType,
  newQS
}: {
  title: string;
  emptyIcon: typeof FileText;
  emptyLabel: string;
  emptyBody: string;
  entries: Entry[];
  tenantSlug: string;
  newType: string;
  newQS: string;
}) {
  const projParam = newQS.startsWith("?project=") ? `&project=${newQS.slice("?project=".length)}` : "";
  const newHref = `/w/${tenantSlug}/new?type=${newType}${projParam}`;
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-h2 text-text">{title}</h2>
            <span className="text-sm text-text-muted">{entries.length}</span>
          </div>
          <Link
            href={newHref}
            className="inline-flex h-9 items-center rounded-md border border-border-emphasis bg-bg px-3 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="border border-dashed border-border bg-bg p-10 text-center">
            <EmptyIcon className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-text">{emptyLabel}</p>
            <p className="mt-1 text-sm text-text-muted">{emptyBody}</p>
            <Link
              href={newHref}
              className="mt-5 inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create one
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, i) => (
              <EntryCard key={entry.id} entry={entry} tenantSlug={tenantSlug} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EntryCard({ entry, tenantSlug, index = 0 }: { entry: Entry; tenantSlug: string; index?: number }) {
  const sectionCount = Array.isArray(entry.body?.sections) ? entry.body.sections.length : 0;
  // Whole card is clickable via a stretched link; Delete sits above it (z-10).
  return (
    <div
      className="group card-interactive relative flex flex-col border border-border bg-bg p-6 motion-safe:animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          {entry.type === "landing_page" ? "Landing page" : "Page"}
        </span>
        <StatusBadge status={entry.status} />
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-text transition-colors group-hover:text-brand">
        <Link href={`/w/${tenantSlug}/p/${entry.id}`} className="after:absolute after:inset-0 after:content-['']">
          {entry.title}
        </Link>
      </h3>
      {entry.slug && <p className="mt-1 text-xs text-text-muted">/{entry.slug}</p>}
      <p className="mt-2 text-xs text-text-muted">
        {sectionCount} section{sectionCount === 1 ? "" : "s"} · updated {fmtTime(entry.updatedAt)}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text transition-colors group-hover:text-brand">
          Edit
          <ArrowRight className="h-4 w-4 nudge" />
        </span>
        {/* z-10 keeps Delete above the stretched link so it stays independently clickable. */}
        <form action={deletePage.bind(null, tenantSlug, entry.id)} className="relative z-10">
          <DeleteButton confirmText={`Delete "${entry.title}"? This can't be undone.`} />
        </form>
      </div>
    </div>
  );
}

function Banner({
  tone,
  title,
  children
}: {
  tone: "success" | "muted";
  title: string;
  children: React.ReactNode;
}) {
  const cls = tone === "success" ? "border-success/30 bg-success/5" : "border-border-emphasis bg-surface";
  const titleCls = tone === "success" ? "text-success" : "text-text";
  return (
    <div className={`mt-6 border p-4 text-sm ${cls}`}>
      <p className={`font-medium ${titleCls}`}>{title}</p>
      <p className="mt-1 text-text-body">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "border-border-emphasis text-text-muted",
    published: "border-success/40 text-success",
    archived: "border-border-emphasis text-text-muted opacity-60"
  };
  return (
    <span className={`border px-2 py-0.5 text-xs uppercase tracking-wide ${map[status] ?? "border-border text-text-muted"}`}>
      {status}
    </span>
  );
}

function PublishStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-border-emphasis text-text-muted",
    building: "border-warning/40 text-warning",
    live: "border-success/40 text-success",
    failed: "border-danger/40 text-danger",
    rolled_back: "border-border-emphasis text-text-muted"
  };
  return (
    <span className={`inline-flex items-center gap-2 border px-2 py-0.5 text-xs uppercase tracking-wide ${map[status] ?? "border-border text-text-muted"}`}>
      {status}
    </span>
  );
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}
