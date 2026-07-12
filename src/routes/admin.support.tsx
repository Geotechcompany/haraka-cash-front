import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSupportTicketDetail, listSupportTickets, updateSupportTicket } from "@/server/support";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support — Admin" }] }),
  loader: () => listSupportTickets(),
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const tickets = Route.useLoaderData();
  const router = useRouter();
  const getDetail = useServerFn(getSupportTicketDetail);
  const updateTicket = useServerFn(updateSupportTicket);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getDetail>>>();
  const [status, setStatus] = useState<"Open" | "In progress" | "Waiting" | "Resolved">("Open");
  const [reply, setReply] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openTicket = async (ticketNumber: string) => {
    try {
      const ticket = await getDetail({ data: ticketNumber });
      setDetail(ticket);
      if (ticket) setStatus(ticket.status);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load support ticket");
    }
  };

  const saveTicket = async () => {
    if (!detail) return;
    setIsSaving(true);
    try {
      await updateTicket({
        data: {
          ticketNumber: detail.id,
          status,
          message: reply.trim() || undefined,
        },
      });
      toast.success("Support ticket updated");
      setReply("");
      setDetail(await getDetail({ data: detail.id }));
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update ticket");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Support" subtitle="Live conversations with borrowers.">
      <div className="card-soft divide-y">
        {tickets.map((t) => (
          <div key={t.id} className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t.id} · {t.user} · {t.updated}
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
              {t.status}
            </span>
            <Button
              onClick={() => openTicket(t.id)}
              size="sm"
              variant="outline"
              className="rounded-lg"
            >
              Open
            </Button>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-20">
            <LifeBuoy className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Inbox zero</p>
          </div>
        )}
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.subject}</DialogTitle>
            <DialogDescription>
              {detail?.id} · {detail?.user}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <div className="max-h-72 space-y-3 overflow-auto rounded-xl border p-4">
                {detail.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.author === "Support"
                        ? "ml-8 rounded-xl bg-primary-soft p-3"
                        : "mr-8 rounded-xl bg-muted p-3"
                    }
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{message.authorName}</span>
                      <span>{new Date(message.createdAt).toLocaleString("en-KE")}</span>
                    </div>
                    <p className="mt-1 text-sm">{message.message}</p>
                  </div>
                ))}
                {detail.messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {detail.initialMessage || "No message was saved for this legacy ticket."}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-status">Status</Label>
                  <select
                    id="ticket-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as typeof status)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option>Open</option>
                    <option>In progress</option>
                    <option>Waiting</option>
                    <option>Resolved</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-reply">Reply</Label>
                  <Textarea
                    id="support-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Write a response to the borrower"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={isSaving} onClick={saveTicket}>
                  {isSaving ? "Saving..." : "Save and send"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
