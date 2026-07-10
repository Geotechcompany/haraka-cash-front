import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone, Mail, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSupportTicket } from "@/server/support";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — HarakaCash" }] }),
  component: SupportPage,
});

function SupportPage() {
  const submitTicket = useServerFn(createSupportTicket);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitTicket({ data: { subject, message } });
      toast.success(`Ticket ${result.ticketNumber} created — we'll be in touch shortly`);
      setSubject("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">We're here to help</h1>
        <p className="mt-1 text-muted-foreground">Reach us through your preferred channel.</p>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: MessageCircle, t: "Live chat", d: "Avg reply 1 min", c: "primary" as const },
            { icon: Phone, t: "Call support", d: "0800 555 000", c: "muted" as const },
            { icon: MessageCircle, t: "WhatsApp", d: "+254 700 000 000", c: "success" as const },
            { icon: Mail, t: "Email us", d: "help@harakacash.co.ke", c: "muted" as const },
          ].map((o) => (
            <button key={o.t} type="button" className="card-soft p-5 text-left hover:shadow-elevated transition-shadow">
              <div className={`h-10 w-10 rounded-xl grid place-items-center ${o.c === "primary" ? "bg-primary-soft text-primary" : o.c === "success" ? "bg-success/15 text-success" : "bg-muted"}`}>
                <o.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold">{o.t}</p>
              <p className="text-xs text-muted-foreground">{o.d}</p>
            </button>
          ))}
        </div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="card-soft p-6 space-y-4">
            <h2 className="text-lg font-semibold">Send us a message</h2>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input className="h-11 rounded-xl" placeholder="I need help with..." value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={5} className="rounded-xl" placeholder="Tell us what's going on" value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl gradient-brand text-white font-semibold">
              {submitting ? "Sending..." : "Send message"}
            </Button>
          </form>

          <div className="card-soft p-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <p className="font-semibold">Popular help topics</p>
            </div>
            <ul className="mt-4 divide-y">
              {["How do I repay early?", "Why was my application declined?", "How is my eligibility score calculated?", "How do I update my M-Pesa number?", "What happens if I miss a payment?"].map((q) => (
                <li key={q}><Link to="/" className="flex items-center justify-between py-3 text-sm hover:text-primary">{q}<span aria-hidden>→</span></Link></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
