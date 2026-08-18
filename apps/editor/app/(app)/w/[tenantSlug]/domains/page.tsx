import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Globe, Plus, ShieldAlert } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { listDomains, listProjects, type Domain, type Project } from "@/lib/cms-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/DeleteButton";
import {
  addDomainAction,
  removeDomainAction,
  setPrimaryDomainAction,
  verifyDomainAction
} from "./actions";

const RENDERER_BASE = "http://localhost:4321";

export default async function DomainsPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ project?: string; error?: string; verified?: string; removed?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;

  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  const projects = await listProjects(membership.tenantId).catch(() => [] as Project[]);
  const active = projects.find((p) => p.id === sp.project) ?? projects.find((p) => p.slug === "main") ?? projects[0];
  if (!active) notFound();

  const { items: domains } = await listDomains(membership.tenantId, active.id);
  const subdomain = domains.find((d) => d.type === "subdomain");
  const customs = domains.filter((d) => d.type === "custom");

  const errorMsg = errorMessage(sp.error);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-10 md:px-10 md:py-14">
          <Link
            href={`/w/${tenantSlug}?project=${active.id}`}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {active.name}
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <Globe className="h-6 w-6 text-text-muted" aria-hidden="true" />
            <h1 className="text-h1 text-text">Domains</h1>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Where <span className="font-medium text-text">{active.name}</span> is published. Each project gets a free
            subdomain; connect your own domain to go live on it.
          </p>

          {errorMsg && (
            <div className="mt-6 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{errorMsg}</div>
          )}
          {sp.verified && (
            <div className="mt-6 border border-success/30 bg-success/5 p-3 text-sm text-success">
              Domain verified and live.
            </div>
          )}
          {sp.removed && (
            <div className="mt-6 border border-border-emphasis bg-surface p-3 text-sm text-text-muted">
              Domain removed.
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:px-10">
          {/* Subdomain */}
          {subdomain && (
            <div>
              <h2 className="text-h3 text-text">Platform subdomain</h2>
              <p className="mt-1 text-sm text-text-muted">Always on, no setup. Great for staging or as a permanent address.</p>
              <div className="mt-4 flex items-center justify-between border border-border bg-bg p-5">
                <div className="flex items-center gap-3">
                  <StatusDot status={subdomain.status} />
                  <div>
                    <p className="font-mono text-sm text-text">{subdomain.hostname}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {subdomain.isPrimary ? "Primary · " : ""}Active
                    </p>
                  </div>
                </div>
                <a
                  href={`${RENDERER_BASE}/?__host=${encodeURIComponent(subdomain.hostname)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-md border border-border-emphasis bg-bg px-3 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Open
                </a>
              </div>
            </div>
          )}

          {/* Custom domains */}
          <div>
            <h2 className="text-h3 text-text">Custom domains</h2>
            <p className="mt-1 text-sm text-text-muted">Connect a domain you own. Add DNS records, then verify.</p>

            <div className="mt-4 space-y-4">
              {customs.length === 0 && (
                <p className="border border-dashed border-border bg-bg p-6 text-center text-sm text-text-muted">
                  No custom domains yet.
                </p>
              )}
              {customs.map((d) => (
                <DomainCard key={d.id} domain={d} tenantSlug={tenantSlug} projectId={active.id} />
              ))}
            </div>

            {/* Add */}
            <form action={addDomainAction.bind(null, tenantSlug, active.id)} className="mt-6 flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="hostname" className="mb-2 block text-sm font-medium text-text">
                  Add a domain
                </label>
                <Input id="hostname" name="hostname" placeholder="www.yourcompany.com" required />
              </div>
              <Button type="submit" size="md">
                <Plus className="mr-1.5 h-4 w-4" />
                Connect
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function DomainCard({ domain, tenantSlug, projectId }: { domain: Domain; tenantSlug: string; projectId: string }) {
  const live = domain.status === "active";
  return (
    <div className="border border-border bg-bg">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <StatusDot status={domain.status} />
          <div>
            <p className="font-mono text-sm text-text">{domain.hostname}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {domain.isPrimary ? "Primary · " : ""}
              {statusLabel(domain.status)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {live ? (
            <a
              href={`${RENDERER_BASE}/?__host=${encodeURIComponent(domain.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border border-border-emphasis bg-bg px-3 text-xs font-medium text-text transition-colors hover:border-brand hover:text-brand"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open
            </a>
          ) : (
            <form action={verifyDomainAction.bind(null, tenantSlug, projectId, domain.id)}>
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
              >
                Verify
              </button>
            </form>
          )}
          {live && !domain.isPrimary && (
            <form action={setPrimaryDomainAction.bind(null, tenantSlug, projectId, domain.id)}>
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md border border-border-emphasis bg-bg px-3 text-xs font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                Make primary
              </button>
            </form>
          )}
          <form action={removeDomainAction.bind(null, tenantSlug, projectId, domain.id)} className="relative z-10">
            <DeleteButton label="" confirmText={`Disconnect ${domain.hostname}?`} />
          </form>
        </div>
      </div>

      {/* DNS instructions while not live */}
      {domain.dns && (
        <div className="border-t border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">DNS records to add</p>
          <p className="mt-2 text-xs text-text-muted">
            At your domain registrar, add these two records, then click Verify. (Dev mode auto-verifies.)
          </p>
          <div className="mt-3 space-y-2">
            <DnsRow type="CNAME" name={domain.hostname} value={domain.dns.cnameTarget} />
            <DnsRow type="TXT" name={domain.dns.txtName} value={domain.dns.txtValue} />
          </div>
        </div>
      )}
    </div>
  );
}

function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 border border-border bg-bg p-3 text-xs md:grid-cols-[64px_1fr_2fr]">
      <span className="font-semibold text-text">{type}</span>
      <span className="truncate font-mono text-text-body" title={name}>{name}</span>
      <span className="truncate font-mono text-text-muted md:col-span-1" title={value}>{value}</span>
    </div>
  );
}

function StatusDot({ status }: { status: Domain["status"] }) {
  const cls =
    status === "active"
      ? "bg-success"
      : status === "error"
        ? "bg-danger"
        : "bg-warning";
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} aria-hidden="true" />;
}

function statusLabel(status: Domain["status"]): string {
  switch (status) {
    case "active": return "Live";
    case "verified": return "Verified";
    case "error": return "Verification failed — check DNS";
    default: return "Pending verification";
  }
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "hostname-required": return "Enter a domain.";
    case "taken": return "That domain is already connected to a site.";
    case "add-failed": return "Could not add that domain. Check the format (e.g. www.example.com).";
    case "verify-failed": return "Couldn't find the DNS records yet. They can take a few minutes to propagate.";
    default: return null;
  }
}
