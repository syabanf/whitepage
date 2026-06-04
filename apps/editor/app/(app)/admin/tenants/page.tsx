import { listAdminTenants } from "@/lib/cms-client";

export default async function AdminTenantsPage() {
  const tenants = await listAdminTenants();

  return (
    <main>
      <section>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="text-h2 text-text">Tenants</h2>
            <span className="text-sm text-text-muted">{tenants.length}</span>
          </div>
          <div className="overflow-x-auto border border-border bg-bg">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-[0.14em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Projects</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Members</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Pages</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-text">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{t.slug}</td>
                    <td className="px-4 py-3 tabular-nums text-text-body">{t.projects}</td>
                    <td className="px-4 py-3 tabular-nums text-text-body">{t.members}</td>
                    <td className="px-4 py-3 tabular-nums text-text-body">{t.pages}</td>
                    <td className="px-4 py-3 text-text-muted">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
