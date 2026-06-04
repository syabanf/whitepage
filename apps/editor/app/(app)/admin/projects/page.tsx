import { listAdminProjects } from "@/lib/cms-client";

export default async function AdminProjectsPage() {
  const projects = await listAdminProjects();

  return (
    <main>
      <section>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="text-h2 text-text">Projects</h2>
            <span className="text-sm text-text-muted">{projects.length}</span>
          </div>
          <div className="overflow-x-auto border border-border bg-bg">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-[0.14em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Pages</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-text">{p.name}</td>
                    <td className="px-4 py-3 text-text-body">{p.tenantName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{p.slug}</td>
                    <td className="px-4 py-3 tabular-nums text-text-body">{p.pages}</td>
                    <td className="px-4 py-3 text-text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
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
