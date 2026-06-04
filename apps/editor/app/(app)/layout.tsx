import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/?error=not-signed-in");

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold tracking-tight text-text">
            <span className="inline-block h-3 w-3 bg-brand" aria-hidden="true" />
            Company<span className="text-brand">CMS</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-text-body md:flex">
            <Link href="/dashboard" className="transition-colors hover:text-text">Dashboard</Link>
            {me.memberships.length > 0 && (
              <Link
                href={`/w/${me.memberships[0].tenantSlug}`}
                className="transition-colors hover:text-text"
              >
                Workspace
              </Link>
            )}
            <Link href="/docs" className="transition-colors hover:text-text">Docs</Link>
            {me.user.isPlatformAdmin && (
              <Link href="/admin" className="font-medium text-brand transition-colors hover:text-brand-hover">
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-text-muted md:inline">{me.user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md border border-border-emphasis px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
