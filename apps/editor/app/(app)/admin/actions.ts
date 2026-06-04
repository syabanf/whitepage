"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth/session";
import { setUserPlatformAdmin } from "@/lib/cms-client";

async function requirePlatformAdmin() {
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  if (!me.user.isPlatformAdmin) redirect("/dashboard?error=not-admin");
  return me;
}

export async function toggleUserAdmin(userId: string, makeAdmin: boolean) {
  await requirePlatformAdmin();
  await setUserPlatformAdmin(userId, makeAdmin);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
