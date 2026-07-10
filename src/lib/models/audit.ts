export type AuditLogRecord = {
  _id?: string;
  actor: string;
  action: string;
  target: string;
  createdAt: Date;
};

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
};

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function toAuditLog(doc: AuditLogRecord, index: number): AuditLog {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  return {
    id: doc._id?.toString() ?? String(index),
    actor: doc.actor,
    action: doc.action,
    target: doc.target,
    time: formatRelativeTime(createdAt),
  };
}
