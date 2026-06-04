import { ShieldCheck } from "lucide-react";
import { getMe } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/cms-client";
import { toggleUserAdmin } from "../actions";

export default async function AdminUsersPage() {
  const [me, users] = await Promise.all([getMe(), listAdminUsers()]);
  const selfId = me?.user.id;

  return (
    <main>
      <section>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="text-h2 text-text">Users</h2>
            <span className="text-sm text-text-muted">{users.length}</span>
          </div>
          <div className="overflow-x-auto border border-border bg-bg">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-[0.14em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Workspaces</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium text-right">Platform admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u.id === selfId;
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-3 font-medium text-text">
                        {u.email}
                        {isSelf && <span className="ml-2 text-xs text-text-muted">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-text-body">{u.name ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-text-body">{u.workspaces}</td>
                      <td className="px-4 py-3">
                        {u.isPlatformAdmin ? (
                          <span className="inline-flex items-center gap-1 border border-brand/40 bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">Member</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSelf ? (
                          <span className="text-xs text-text-muted">—</span>
                        ) : (
                          <form action={toggleUserAdmin.bind(null, u.id, !u.isPlatformAdmin)}>
                            <button
                              type="submit"
                              className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                                u.isPlatformAdmin
                                  ? "border-border-emphasis text-text hover:border-danger hover:text-danger"
                                  : "border-border-emphasis text-text hover:border-brand hover:text-brand"
                              }`}
                            >
                              {u.isPlatformAdmin ? "Revoke" : "Grant admin"}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
