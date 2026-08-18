"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth/session";
import { deleteAsset, updateAsset } from "@/lib/cms-client";

async function resolveTenant(slug: string) {
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const membership = me.memberships.find((m) => m.tenantSlug === slug);
  if (!membership) redirect("/dashboard?error=no-membership");
  return membership;
}

/** Update an asset's alt text (and optionally tags). Called from the media grid. */
export async function saveAssetMeta(
  tenantSlug: string,
  assetId: string,
  patch: { altText?: string; tags?: string[] }
) {
  const m = await resolveTenant(tenantSlug);
  await updateAsset(m.tenantId, assetId, patch);
  revalidatePath(`/w/${tenantSlug}/media`);
}

/** Delete an asset (row + stored file). */
export async function removeAsset(tenantSlug: string, assetId: string) {
  const m = await resolveTenant(tenantSlug);
  await deleteAsset(m.tenantId, assetId);
  revalidatePath(`/w/${tenantSlug}/media`);
}

/** Called after client-side uploads land so the server-rendered grid refreshes. */
export async function refreshMedia(tenantSlug: string) {
  await resolveTenant(tenantSlug);
  revalidatePath(`/w/${tenantSlug}/media`);
}
