import { createFileRoute } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { kes } from "@/lib/loan";
import { listApplications } from "@/server/applications";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  loader: () => listApplications({ data: { scope: "all" } }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const applications = Route.useLoaderData();
  const users = Array.from(new Map(applications.map((a) => [a.applicant, a])).values());
  return (
      <AdminShell title="Users" subtitle={`${users.length} unique borrowers`}>
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users" className="pl-9 h-11 rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <div key={u.applicant} className="card-soft p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl gradient-brand text-white grid place-items-center font-semibold shrink-0">{u.applicant[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{u.applicant}</p>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{u.county}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.phone}</p>
                <p className="text-xs text-muted-foreground truncate">{u.employer} · {kes(u.monthlyIncome)}/mo</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="font-bold tabular-nums">{u.eligibilityScore}</p>
              </div>
            </div>
          ))}
        </div>
        {users.length === 0 && (
          <div className="text-center py-16"><Users className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-semibold">No users yet</p></div>
        )}
      </AdminShell>
    );
}
