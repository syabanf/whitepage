import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { TEMPLATE_FIELDS } from "@/lib/cms-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPage } from "../actions";

export default async function NewPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ type?: string; error?: string; project?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  const defaultType = sp.type === "landing_page" ? "landing_page" : "page";
  const projectId = sp.project ?? "";
  const create = createPage.bind(null, tenantSlug);
  const palette = Object.entries(TEMPLATE_FIELDS);

  const errorMsg =
    sp.error === "title-required"
      ? "A title is required."
      : sp.error === "slug-taken"
        ? "A page with that slug already exists."
        : sp.error === "create-failed"
          ? "Could not create the page. Please try again."
          : null;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-8 md:px-10">
          <Link
            href={`/w/${tenantSlug}`}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Create
          </p>
          <h1 className="mt-3 text-h1 text-text">New page</h1>
          <p className="mt-3 text-base text-text-body">
            Pick a type and an optional starting section. You can add, reorder, and edit sections
            in the builder.
          </p>

          {errorMsg && (
            <div className="mt-6 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {errorMsg}
            </div>
          )}

          <form action={create} className="mt-10 space-y-8">
            <input type="hidden" name="projectId" value={projectId} />
            {/* Type */}
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-text">Type</legend>
              <div className="grid grid-cols-2 gap-3">
                <TypeCard
                  value="page"
                  defaultType={defaultType}
                  title="Page"
                  body="Part of the company site — Home, About, Services."
                />
                <TypeCard
                  value="landing_page"
                  defaultType={defaultType}
                  title="Landing page"
                  body="For paid traffic — ad-ready with form capture."
                />
              </div>
            </fieldset>

            {/* Title + slug */}
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium text-text">
                Title
              </label>
              <Input id="title" name="title" required placeholder="About us" autoFocus />
            </div>
            <div>
              <label htmlFor="slug" className="mb-2 block text-sm font-medium text-text">
                Slug <span className="text-text-muted">(optional)</span>
              </label>
              <Input id="slug" name="slug" placeholder="about-us" />
              <p className="mt-1.5 text-xs text-text-muted">
                Leave blank to derive from the title. Use <code>home</code> for the root page.
              </p>
            </div>

            {/* Starter */}
            <div>
              <label htmlFor="starter" className="mb-2 block text-sm font-medium text-text">
                Starting section <span className="text-text-muted">(optional)</span>
              </label>
              <select
                id="starter"
                name="starter"
                defaultValue=""
                className="block h-10 w-full rounded-md border border-border-emphasis bg-bg px-3 text-sm text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2"
              >
                <option value="">Start empty</option>
                {palette.map(([key, schema]) => (
                  <option key={key} value={key}>
                    {schema.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-6">
              <Button type="submit" size="lg">
                Create page
              </Button>
              <Link href={`/w/${tenantSlug}`} className="text-sm text-text-muted hover:text-text">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function TypeCard({
  value,
  defaultType,
  title,
  body
}: {
  value: string;
  defaultType: string;
  title: string;
  body: string;
}) {
  return (
    <label className="group relative flex cursor-pointer flex-col border border-border bg-bg p-4 transition-colors hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-subtle">
      <input
        type="radio"
        name="type"
        value={value}
        defaultChecked={defaultType === value}
        className="peer sr-only"
      />
      <span className="text-sm font-semibold text-text">{title}</span>
      <span className="mt-1 text-xs leading-relaxed text-text-muted">{body}</span>
    </label>
  );
}
