import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";
import { getMe } from "@/lib/auth/session";

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
  const me = await getMe();
  if (!me) return null;
  return me.memberships.find((m) => m.tenantSlug === tenantSlug)?.tenantId ?? null;
}

async function bearer(): Promise<string | null> {
  return (await cookies()).get("cms_session")?.value ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenantId = await resolveTenantId(tenantSlug);
  const token = await bearer();
  if (!tenantId || !token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/assets`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenantId = await resolveTenantId(tenantSlug);
  const token = await bearer();
  if (!tenantId || !token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pass the multipart form straight through to the Go API.
  const form = await req.formData();
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: "no-store"
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
