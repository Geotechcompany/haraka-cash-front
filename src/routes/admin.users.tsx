import { createFileRoute } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { getUserFacingError } from "@/lib/user-facing-error";
import { AdminShell } from "@/components/layout/admin-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kes } from "@/lib/loan";
import { listAdminUsers, updateAdminUserStatus } from "@/server/users";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  loader: () => listAdminUsers(),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const users = Route.useLoaderData();
  const router = useRouter();
  const updateStatus = useServerFn(updateAdminUserStatus);
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string>();
  const filteredUsers = users.filter((user) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return [user.name, user.email, user.phone, user.id].some((value) =>
      value.toLowerCase().includes(search),
    );
  });

  const toggleStatus = async (user: (typeof users)[number]) => {
    setUpdatingId(user.id);
    try {
      const status = user.status === "Active" ? "Suspended" : "Active";
      await updateStatus({ data: { clerkId: user.id, status } });
      toast.success(`User ${status.toLowerCase()}`);
      await router.invalidate();
    } catch (error) {
      toast.error(getUserFacingError(error, "Could not update user"));
    } finally {
      setUpdatingId(undefined);
    }
  };

  return (
    <AdminShell title="Users" subtitle={`${users.length} unique borrowers`}>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9 h-11 rounded-xl"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredUsers.map((user) => (
          <div key={user.id} className="card-soft p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl gradient-brand text-white grid place-items-center font-semibold shrink-0">
                {user.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{user.name}</p>
                  <Badge
                    variant={user.status === "Active" ? "secondary" : "destructive"}
                    className="rounded-full text-[10px]"
                  >
                    {user.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email || user.phone}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.applicationCount} applications · {kes(user.totalBorrowed)} · credit{" "}
                  {kes(user.availableCredit)}
                </p>
                {(user.referralCreditsEarned > 0 || user.referralCount > 0) && (
                  <p className="text-xs text-primary truncate">
                    Referral bonus {kes(user.referralCreditsEarned)} · {user.referralCount}{" "}
                    invites
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="font-bold tabular-nums">{user.eligibilityScore}</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={user.status === "Active" ? "destructive" : "outline"}
              disabled={updatingId === user.id}
              onClick={() => toggleStatus(user)}
              className="mt-4 w-full rounded-lg"
            >
              {user.status === "Active" ? "Suspend user" : "Restore user"}
            </Button>
          </div>
        ))}
      </div>
      {filteredUsers.length === 0 && (
        <div className="text-center py-16">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No users yet</p>
        </div>
      )}
    </AdminShell>
  );
}
