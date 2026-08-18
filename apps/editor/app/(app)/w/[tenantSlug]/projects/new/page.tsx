import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "../../actions";

export default async function NewProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { error } = await searchParams;

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  const create = createProjectAction.bind(null, tenantSlug);
  const errorMsg =
    error === "name-required"
      ? "A project name is required."
      : error === "slug-taken"
        ? "A project with that slug already exists."
        : error === "create-failed"
          ? "Could not create the project. Please try again."
          : null;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene subtle className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-8 md:px-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Create</p>
          <h1 className="mt-3 text-h1 text-text">New project</h1>
          <p className="mt-3 text-base text-text-body">
            A project is one website under <span className="font-medium text-text">{membership.tenantName}</span> —
            its own pages, articles, and (later) its own domain.
          </p>

          {errorMsg && (
            <div className="mt-6 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{errorMsg}</div>
          )}

          <form action={create} className="mt-10 space-y-6">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-text">
                Project name
              </label>
              <Input id="name" name="name" required placeholder="Acme Marketing Site" autoFocus />
            </div>
            <div>
              <label htmlFor="slug" className="mb-2 block text-sm font-medium text-text">
                Slug <span className="text-text-muted">(optional)</span>
              </label>
              <Input id="slug" name="slug" placeholder="marketing" />
              <p className="mt-1.5 text-xs text-text-muted">Leave blank to derive from the name.</p>
            </div>
            <div className="flex items-center gap-3 border-t border-border pt-6">
              <Button type="submit" size="lg">
                Create project
              </Button>
              <Link href="/dashboard" className="text-sm text-text-muted hover:text-text">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
