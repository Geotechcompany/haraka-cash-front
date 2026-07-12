export type NotificationType = "success" | "warning" | "info";

export type NotificationRecord = {
  _id?: string;
  clerkUserId?: string;
  title: string;
  body: string;
  type: NotificationType;
  unread: boolean;
  createdAt: Date;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: NotificationType;
  unread: boolean;
};

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function toNotification(doc: NotificationRecord, index: number): Notification {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  return {
    id: doc._id != null ? String(doc._id) : String(index + 1),
    title: doc.title,
    body: doc.body,
    type: doc.type,
    unread: doc.unread,
    time: formatRelativeTime(createdAt),
  };
}
