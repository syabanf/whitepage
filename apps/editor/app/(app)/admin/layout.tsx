import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { AdminTabs } from "@/components/AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");
  if (!me.user.isPlatformAdmin) redirect("/dashboard?error=not-admin");

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-brand">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform admin
          </div>
          <h1 className="mt-4 text-h1 text-text">SaaS console</h1>
          <p className="mt-2 text-sm text-text-muted">
            Cross-tenant overview of the whole platform. Signed in as {me.user.email}.
          </p>
          <div className="mt-6">
            <AdminTabs />
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
