import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { toSupportTicket, type SupportTicketRecord } from "@/lib/models/support";

export const listSupportTickets = createServerFn({ method: "GET" }).handler(async () => {
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
    const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
    const now = new Date();
    const ticketNumber = `TKT-${Date.now()}`;

    await db.collection<SupportTicketRecord>("support_tickets").insertOne({
      ticketNumber,
      clerkUserId: userId,
      subject: data.subject,
      userName,
      status: "Open",
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
