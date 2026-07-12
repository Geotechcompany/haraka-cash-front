import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

import { toNotification, type NotificationRecord } from "@/lib/models/notification";

export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const { getDb } = await import("@/lib/db");
  const db = await getDb();

  const docs = await db
    .collection<NotificationRecord>("notifications")
    .find({ clerkUserId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return docs.map((doc, index) => toNotification(doc, index));
});

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  await db.collection("notifications").updateMany(
    { clerkUserId: userId, unread: true },
    { $set: { unread: false } },
  );

  return { ok: true };
});
