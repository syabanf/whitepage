import { cookies } from "next/headers";
import { cache } from "react";
import { API_BASE } from "@/lib/api";

export interface Membership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: "brand_admin" | "editor";
}

export interface Me {
  user: { id: string; email: string; name: string | null; isPlatformAdmin?: boolean };
  memberships: Membership[];
}

/**
 * Fetch the signed-in user + memberships. Cached per request via React.cache,
 * so multiple server components in the same render dedupe to one API call.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const session = (await cookies()).get("cms_session");
  if (!session?.value) return null;

  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${session.value}` },
    cache: "no-store"
  });
  if (!res.ok) return null;
  return (await res.json()) as Me;
});

/**
 * Returns the bearer token to attach to upstream API calls. Cached per request.
 */
export const getSessionToken = cache(async (): Promise<string | null> => {
  const session = (await cookies()).get("cms_session");
  return session?.value ?? null;
});
