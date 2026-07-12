export type SupportTicketStatus = "Open" | "In progress" | "Waiting" | "Resolved";

export type SupportMessageAuthor = "User" | "Support";

export type SupportMessageRecord = {
  id: string;
  author: SupportMessageAuthor;
  authorName: string;
  message: string;
  createdAt: Date;
};

export type SupportAssignmentRecord = {
  assignedTo: string;
  assignedBy?: string;
  assignedAt: Date;
};

export type SupportTicketRecord = {
  _id?: string;
  ticketNumber: string;
  clerkUserId?: string;
  subject: string;
  userName: string;
  status: SupportTicketStatus;
  initialMessage?: string;
  messages?: SupportMessageRecord[];
  assignment?: SupportAssignmentRecord;
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

export type SupportMessage = {
  id: string;
  author: SupportMessageAuthor;
  authorName: string;
  message: string;
  createdAt: string;
};

export type SupportAssignment = {
  assignedTo: string;
  assignedBy?: string;
  assignedAt: string;
};

export type SupportTicketDetail = SupportTicket & {
  clerkUserId?: string;
  initialMessage: string;
  messages: SupportMessage[];
  assignment?: SupportAssignment;
  createdAt: string;
  updatedAt: string;
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

export function toSupportTicketDetail(doc: SupportTicketRecord): SupportTicketDetail {
  const createdAt =
    doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt);
  const updatedAt =
    doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt);

  return {
    ...toSupportTicket(doc),
    clerkUserId: doc.clerkUserId,
    initialMessage: doc.initialMessage ?? "",
    messages: (doc.messages ?? []).map((message) => ({
      id: message.id,
      author: message.author,
      authorName: message.authorName,
      message: message.message,
      createdAt:
        message.createdAt instanceof Date
          ? message.createdAt.toISOString()
          : String(message.createdAt),
    })),
    assignment: doc.assignment
      ? {
          assignedTo: doc.assignment.assignedTo,
          assignedBy: doc.assignment.assignedBy,
          assignedAt:
            doc.assignment.assignedAt instanceof Date
              ? doc.assignment.assignedAt.toISOString()
              : String(doc.assignment.assignedAt),
        }
      : undefined,
    createdAt,
    updatedAt,
  };
}
