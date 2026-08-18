import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Images } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { listAssets, type Asset } from "@/lib/cms-client";
import { HeroScene } from "@/components/HeroScene";
import { MediaLibrary } from "@/components/MediaLibrary";
import { refreshMedia, removeAsset, saveAssetMeta } from "./actions";

export default async function MediaPage({
  params
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === tenantSlug);
  if (!membership) notFound();

  const assets = await listAssets(membership.tenantId).catch(() => [] as Asset[]);
  const totalBytes = assets.reduce((n, a) => n + a.byteSize, 0);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <HeroScene className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16 stagger-children">
          <Link
            href={`/w/${tenantSlug}`}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text motion-safe:animate-fade-up"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
          <div className="mt-4 flex items-center gap-2 motion-safe:animate-fade-up">
            <Images className="h-6 w-6 text-text-muted" aria-hidden="true" />
            <h1 className="text-h1 text-text">Media library</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-text-muted motion-safe:animate-fade-up">
            Brand-approved images for every page and article in{" "}
            <span className="font-medium text-text">{membership.tenantName}</span>. Alt text is
            required for SEO and accessibility — fill it in here once and every use inherits it.
          </p>
          <p className="mt-3 text-xs text-text-muted motion-safe:animate-fade-up">
            {assets.length} image{assets.length === 1 ? "" : "s"} · {formatBytes(totalBytes)}
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-12">
          <MediaLibrary
            tenantSlug={tenantSlug}
            initialAssets={assets}
            actions={{ saveAssetMeta, removeAsset, refreshMedia }}
          />
        </div>
      </section>
    </main>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
