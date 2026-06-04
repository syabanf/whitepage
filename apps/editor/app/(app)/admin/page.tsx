import { Building2, FileText, FolderTree, MessageSquare, Newspaper, RefreshCw, Users } from "lucide-react";
import { getAdminStats, type AdminStats } from "@/lib/cms-client";

export default async function AdminOverview() {
  const stats = await getAdminStats();

  const cards: Array<{ icon: typeof Users; label: string; value: number; sub?: string }> = [
    { icon: Building2, label: "Tenants", value: stats.tenants },
    { icon: Users, label: "Users", value: stats.users, sub: `${stats.platformAdmins} platform admin${stats.platformAdmins === 1 ? "" : "s"}` },
    { icon: FolderTree, label: "Projects", value: stats.projects },
    { icon: FileText, label: "Web pages", value: stats.webPages, sub: `${stats.publishedPages} published` },
    { icon: Newspaper, label: "Articles", value: stats.articles },
    { icon: MessageSquare, label: "Comments", value: stats.comments, sub: `${stats.pendingComments} pending` },
    { icon: RefreshCw, label: "Publishes (live)", value: stats.livePublishes, sub: `${stats.failedPublishes} failed` }
  ];

  return (
    <main>
      <section>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, label, value, sub }, i) => (
              <div
                key={label}
                className="flex flex-col border border-border bg-bg p-6 motion-safe:animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">{label}</span>
                  <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
                </div>
                <span className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-text">{value}</span>
                {sub && <span className="mt-1 text-xs text-text-muted">{sub}</span>}
              </div>
            ))}
          </div>

          {stats.pendingComments > 0 && (
            <div className="mt-8 border border-warning/30 bg-warning/5 p-4 text-sm text-text-body">
              <span className="font-medium text-warning">{stats.pendingComments} comment(s) awaiting moderation</span>{" "}
              across the platform.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
