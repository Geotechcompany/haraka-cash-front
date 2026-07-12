import { createServerFn } from "@tanstack/react-start";

import { toAuditLog, type AuditLogRecord } from "@/lib/models/audit";
import { requireAdmin } from "@/server/auth";

export const listAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const logs = await db
    .collection<AuditLogRecord>("audit_logs")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return logs.map(toAuditLog);
});
