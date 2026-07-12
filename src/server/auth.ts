import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { isAdminMetadata } from "@/lib/admin-domain";

export const requireUserId = createServerOnlyFn(async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const user = await db
    .collection<{ clerkId: string; status?: "Active" | "Suspended" }>("users")
    .findOne({ clerkId: userId }, { projection: { status: 1 } });
  if (user?.status === "Suspended") throw new Error("Account suspended");
  return userId;
});

export const requireAdmin = createServerOnlyFn(async () => {
  const userId = await requireUserId();
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  if (!isAdminMetadata(user.publicMetadata)) {
    throw new Error("Forbidden");
  }

  return userId;
});

export const assertAdminRoute = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await auth();
  if (!userId) {
    throw redirect({ to: "/login" });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  if (!isAdminMetadata(user.publicMetadata)) {
    throw redirect({ to: "/dashboard" });
  }

  return { userId };
});
