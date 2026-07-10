export type SupportTicketStatus = "Open" | "In progress" | "Waiting" | "Resolved";

export type SupportTicketRecord = {
  _id?: string;
  ticketNumber: string;
  clerkUserId?: string;
  subject: string;
  userName: string;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SupportTicket = {
  id: string;
  subject: string;
  user: string;
  status: SupportTicketStatus;
  updated: string;
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

export function toSupportTicket(doc: SupportTicketRecord): SupportTicket {
  const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt);
  return {
    id: doc.ticketNumber,
    subject: doc.subject,
    user: doc.userName,
    status: doc.status,
    updated: formatRelativeTime(updatedAt),
  };
}
