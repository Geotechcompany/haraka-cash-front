import "@/lib/server-only";

import type { AuditLogRecord } from "@/lib/models/audit";

export async function logAuditEvent(input: {
  actor: string;
  action: string;
  target: string;
}) {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  await db.collection<AuditLogRecord>("audit_logs").insertOne({
    actor: input.actor,
    action: input.action,
    target: input.target,
    createdAt: new Date(),
  });
}
