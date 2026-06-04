"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth/session";
import { addDomain, deleteDomain, setPrimaryDomain, verifyDomain } from "@/lib/cms-client";

async function resolveTenant(slug: string) {
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  const m = me.memberships.find((x) => x.tenantSlug === slug);
  if (!m) redirect("/dashboard?error=no-membership");
  return m;
}

function back(tenantSlug: string, projectId: string, extra = "") {
  redirect(`/w/${tenantSlug}/domains?project=${projectId}${extra}`);
}

export async function addDomainAction(tenantSlug: string, projectId: string, formData: FormData) {
  const m = await resolveTenant(tenantSlug);
  const hostname = formData.get("hostname")?.toString().trim() ?? "";
  if (!hostname) back(tenantSlug, projectId, "&error=hostname-required");
  try {
    await addDomain(m.tenantId, projectId, hostname);
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("409") ? "taken" : "add-failed";
    back(tenantSlug, projectId, `&error=${msg}`);
  }
  revalidatePath(`/w/${tenantSlug}/domains`);
  back(tenantSlug, projectId);
}

export async function verifyDomainAction(tenantSlug: string, projectId: string, domainId: string) {
  const m = await resolveTenant(tenantSlug);
  const res = await verifyDomain(m.tenantId, projectId, domainId);
  revalidatePath(`/w/${tenantSlug}/domains`);
  back(tenantSlug, projectId, res.status === "active" ? "&verified=1" : "&error=verify-failed");
}

export async function setPrimaryDomainAction(tenantSlug: string, projectId: string, domainId: string) {
  const m = await resolveTenant(tenantSlug);
  await setPrimaryDomain(m.tenantId, projectId, domainId);
  revalidatePath(`/w/${tenantSlug}/domains`);
  back(tenantSlug, projectId);
}

export async function removeDomainAction(tenantSlug: string, projectId: string, domainId: string) {
  const m = await resolveTenant(tenantSlug);
  await deleteDomain(m.tenantId, projectId, domainId);
  revalidatePath(`/w/${tenantSlug}/domains`);
  back(tenantSlug, projectId, "&removed=1");
}
