import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — HarakaCash" }] }),
  component: () => {
    const faqs = [
      { q: "How much can I borrow?", a: "First-time borrowers can access up to KES 20,000. Your limit grows as you build a repayment history." },
      { q: "How fast is disbursement?", a: "Approved loans are sent to M-Pesa or your bank account within 5 minutes." },
      { q: "What are the fees?", a: "A one-time processing fee is displayed before you accept. Fees range from KES 150 to KES 2,000." },
      { q: "Do you access CRB?", a: "HarakaCash uses an internal responsible assessment. This demo does not integrate with official credit bureau systems." },
      { q: "Can I repay early?", a: "Yes — repay any time with no penalties." },
      { q: "What if I lose my phone?", a: "Contact support to secure your account and disable access." },
    ];
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Frequently asked questions</h1>
          <p className="mt-1 text-muted-foreground">Everything you need to know about borrowing with HarakaCash.</p>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`i${i}`} className="border-b">
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </AppShell>
    );
  },
});
