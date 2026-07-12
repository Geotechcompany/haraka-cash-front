import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  toSupportTicket,
  toSupportTicketDetail,
  type SupportTicketRecord,
} from "@/lib/models/support";
import { requireAdmin } from "@/server/auth";

export const listSupportTickets = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const tickets = await db
    .collection<SupportTicketRecord>("support_tickets")
    .find({})
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
  return tickets.map(toSupportTicket);
});

export const getSupportTicketDetail = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.string().min(1).parse(input))
  .handler(async ({ data: ticketNumber }) => {
    await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const ticket = await db
      .collection<SupportTicketRecord>("support_tickets")
      .findOne({ ticketNumber });
    if (!ticket) return null;
    return toSupportTicketDetail(ticket);
  });

const createTicketInput = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
});

export const createSupportTicket = createServerFn({ method: "POST" })
  .validator((data: unknown) => createTicketInput.parse(data))
  .handler(async ({ data }) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const user = await db.collection("users").findOne({ clerkId: userId });
    const userName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
    const now = new Date();
    const ticketNumber = `TKT-${Date.now()}`;

    await db.collection<SupportTicketRecord>("support_tickets").insertOne({
      ticketNumber,
      clerkUserId: userId,
      subject: data.subject,
      userName,
      status: "Open",
      initialMessage: data.message,
      messages: [
        {
          id: crypto.randomUUID(),
          author: "User",
          authorName: userName,
          message: data.message,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: userName,
      action: "Opened support ticket",
      target: ticketNumber,
    });

    return { ticketNumber };
  });

const updateTicketInput = z.object({
  ticketNumber: z.string().min(1),
  status: z.enum(["Open", "In progress", "Waiting", "Resolved"]).optional(),
  message: z.string().trim().min(1).max(2_000).optional(),
});

export const updateSupportTicket = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateTicketInput.parse(input))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const ticket = await db
      .collection<SupportTicketRecord>("support_tickets")
      .findOne({ ticketNumber: data.ticketNumber });
    if (!ticket) throw new Error("Support ticket not found");

    const now = new Date();
    const update: {
      $set: Partial<SupportTicketRecord>;
      $push?: { messages: NonNullable<SupportTicketRecord["messages"]>[number] };
    } = {
      $set: {
        status: data.status ?? ticket.status,
        updatedAt: now,
        assignment: {
          assignedTo: adminId,
          assignedBy: adminId,
          assignedAt: now,
        },
      },
    };
    if (data.message) {
      update.$push = {
        messages: {
          id: crypto.randomUUID(),
          author: "Support",
          authorName: "HarakaCash Support",
          message: data.message,
          createdAt: now,
        },
      };
    }

    await db
      .collection<SupportTicketRecord>("support_tickets")
      .updateOne({ ticketNumber: data.ticketNumber }, update);

    if (ticket.clerkUserId && (data.message || data.status)) {
      await db.collection("notifications").insertOne({
        clerkUserId: ticket.clerkUserId,
        title: data.message ? "Support replied" : "Support ticket updated",
        body: data.message ?? `Ticket ${data.ticketNumber} is now ${data.status?.toLowerCase()}.`,
        type: "info",
        unread: true,
        createdAt: now,
      });
    }

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: data.message ? "Replied to support ticket" : `Set ticket status to ${data.status}`,
      target: data.ticketNumber,
    });

    return { ok: true };
  });
