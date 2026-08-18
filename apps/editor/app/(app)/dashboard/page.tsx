import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { ArrowRight, ExternalLink, FolderPlus, Layers } from "lucide-react";
import { getMe, type Membership } from "@/lib/auth/session";
import { listProjects, type Project } from "@/lib/cms-client";

export default async function DashboardPage() {
  const me = (await getMe())!;
  const greeting = me.user.name?.split(" ")[0] ?? me.user.email.split("@")[0];

  // Fetch projects for each workspace in parallel.
  const groups = await Promise.all(
    me.memberships.map(async (m) => ({
      membership: m,
      projects: await listProjects(m.tenantId).catch(() => [] as Project[])
    }))
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20 stagger-children">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted motion-safe:animate-fade-up">Signed in</p>
          <h1 className="mt-3 text-h1 text-text motion-safe:animate-fade-up">
            Welcome back, <span className="text-brand">{greeting}</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-body motion-safe:animate-fade-up">
            Pick a project to start editing, or spin up a new one.
          </p>
        </div>
      </section>

      {me.memberships.length === 0 ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
            <div className="border border-dashed border-border bg-bg p-10 text-center">
              <p className="text-sm font-medium text-text">You don&apos;t have any workspaces yet.</p>
              <p className="mt-1 text-sm text-text-muted">Reach out to your brand admin to be added.</p>
            </div>
          </div>
        </section>
      ) : (
        groups.map(({ membership, projects }) => (
          <WorkspaceProjects key={membership.tenantId} membership={membership} projects={projects} />
        ))
      )}

      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between md:px-10 md:py-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Account</p>
            <h2 className="mt-2 text-h3 text-text">{me.user.email}</h2>
          </div>
          <a
            href="http://localhost:4321"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-md border border-border-emphasis bg-bg px-5 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View live renderer
          </a>
        </div>
      </section>
    </main>
  );
}

function WorkspaceProjects({ membership, projects }: { membership: Membership; projects: Project[] }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Workspace</p>
            <h2 className="mt-1 text-h2 text-text">{membership.tenantName}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {projects.length} project{projects.length === 1 ? "" : "s"} · role:{" "}
              <span className="font-medium text-text">{membership.role}</span>
            </p>
          </div>
          <Link
            href={`/w/${membership.tenantSlug}/projects/new`}
            className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-border bg-bg p-10 text-center">
            <p className="text-sm font-medium text-text">No projects yet.</p>
            <p className="mt-1 text-sm text-text-muted">Create your first website project.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Link
                key={p.id}
                href={`/w/${membership.tenantSlug}?project=${p.id}`}
                className="group card-interactive flex flex-col border border-border bg-bg p-8 motion-safe:animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <Layers className="h-6 w-6 text-brand transition-transform duration-200 ease-out group-hover:scale-110" aria-hidden="true" />
                <h3 className="mt-5 text-h3 text-text transition-colors group-hover:text-brand">{p.name}</h3>
                <p className="mt-2 text-sm text-text-muted">
                  {p.primaryDomain ?? `${membership.tenantSlug}-${p.slug}.cms.app`}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-8 text-sm font-medium text-text group-hover:text-brand">
                  Open project
                  <ArrowRight className="h-4 w-4 nudge" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
