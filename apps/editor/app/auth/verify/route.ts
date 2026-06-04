import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing-token", url));
  }

  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store"
  });
  if (!res.ok) {
    const reason = res.status === 401 ? "link-invalid" : "verify-failed";
    return NextResponse.redirect(new URL(`/?error=${reason}`, url));
  }
  const data = (await res.json()) as { sessionId: string };

  const cookieStore = await cookies();
  cookieStore.set("cms_session", data.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return NextResponse.redirect(new URL("/dashboard", url));
}
