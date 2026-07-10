import { getDb } from "@/lib/db";
import { toAuditLog, type AuditLogRecord } from "@/lib/models/audit";

export async function logAuditEvent(input: {
  actor: string;
  action: string;
  target: string;
}) {
  const db = await getDb();
  await db.collection<AuditLogRecord>("audit_logs").insertOne({
    actor: input.actor,
    action: input.action,
    target: input.target,
    createdAt: new Date(),
  });
}

export async function listAuditLogs() {
  const db = await getDb();
  const logs = await db
    .collection<AuditLogRecord>("audit_logs")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return logs.map(toAuditLog);
}
