"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, APP_BASE } from "@/lib/api";

export async function requestMagicLink(formData: FormData) {
  const email = formData.get("email")?.toString().trim();
  if (!email || !email.includes("@")) {
    redirect("/?error=email-invalid");
  }

  const res = await fetch(`${API_BASE}/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      redirectUrl: `${APP_BASE}/auth/verify`
    }),
    cache: "no-store"
  });
  if (!res.ok) {
    redirect("/?error=request-failed");
  }
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

const DEMO_EMAIL = "demo@cms.app";
const DEMO_PASSWORD = "cms-demo-2026";

async function setSessionFromResponse(res: Response, onFail: string) {
  if (!res.ok) {
    redirect(onFail);
  }
  const data = (await res.json()) as { sessionId: string };
  (await cookies()).set("cms_session", data.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  if (!email || !password) {
    redirect("/?error=credentials-required");
  }
  const res = await fetch(`${API_BASE}/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });
  await setSessionFromResponse(res, "/?error=invalid-credentials");
  redirect("/dashboard");
}

export async function signInAsDemo() {
  const res = await fetch(`${API_BASE}/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    cache: "no-store"
  });
  await setSessionFromResponse(res, "/?error=demo-unavailable");
  redirect("/dashboard");
}

export async function logout() {
  const session = (await cookies()).get("cms_session");
  if (session?.value) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.value}` },
      cache: "no-store"
    });
  }
  (await cookies()).delete("cms_session");
  redirect("/");
}
