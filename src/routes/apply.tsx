import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Upload, Sparkles, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { kes, loanQuote } from "@/lib/loan";
import { cn } from "@/lib/utils";
import { createApplication, getCurrentUser } from "@/server/applications";

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Apply for a loan — HarakaCash" }] }),
  loader: () => getCurrentUser(),
  component: ApplyPage,
});

const steps = [
  { key: "personal", title: "Personal", desc: "Confirm your details" },
  { key: "employment", title: "Employment", desc: "Where you work" },
  { key: "financial", title: "Financial", desc: "Income & expenses" },
  { key: "request", title: "Loan Request", desc: "Amount & purpose" },
  { key: "documents", title: "Documents", desc: "Upload verification" },
] as const;

function ApplyPage() {
  const user = Route.useLoaderData();
  const navigate = useNavigate();
  const createApplicationFn = useServerFn(createApplication);
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(10000);
  const [months, setMonths] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const quote = useMemo(() => loanQuote(amount, months), [amount, months]);

  const next = () => setStep((s) => (s < steps.length - 1 ? s + 1 : s));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const application = await createApplicationFn({
        data: {
          amount,
          months,
          purpose: "Personal",
          quote,
        },
      });
      navigate({ to: "/assessment", search: { applicationId: application.id } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Apply for a loan</h1>
          <p className="mt-2 text-muted-foreground">Answer a few quick questions to get a decision.</p>
        </div>

        {/* Stepper */}
        <ol className="hidden md:flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2 flex-1">
              <div className={cn("h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0",
                i < step ? "bg-success text-white" : i === step ? "gradient-brand text-white shadow-soft" : "bg-muted text-muted-foreground")}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <div className="min-w-0 hidden lg:block">
                <p className={cn("text-xs font-semibold truncate", i === step ? "text-foreground" : "text-muted-foreground")}>{s.title}</p>
              </div>
              {i < steps.length - 1 && <div className={cn("flex-1 h-px", i < step ? "bg-success" : "bg-border")} />}
            </li>
          ))}
        </ol>
        <div className="md:hidden mb-6">
          <div className="flex justify-between text-xs mb-2 font-medium">
            <span>Step {step + 1} of {steps.length}</span>
            <span className="text-muted-foreground">{steps[step].title}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full gradient-brand" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="card-soft p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">{steps[step].title}</h2>
                  <p className="text-sm text-muted-foreground">{steps[step].desc}</p>
                </div>

                {step === 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" placeholder="Your full name" defaultValue={user?.name ?? ""} />
                    <Field label="National ID" placeholder="12345678" />
                    <Field label="Phone" placeholder="07xx xxx xxx" defaultValue={user?.phone ?? ""} />
                    <Field label="M-Pesa number" placeholder="07xx xxx xxx" defaultValue={user?.phone ?? ""} />
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Employment status</Label>
                      <Select defaultValue="Employed"><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Employed", "Self-employed", "Business owner", "Contract", "Casual"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Field label="Employer" placeholder="Company name" />
                    <Field label="Job title" placeholder="Your role" />
                    <Field label="Years at employer" type="number" placeholder="0" />
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Monthly income (KES)" type="number" placeholder="0" />
                    <Field label="Monthly expenses (KES)" type="number" placeholder="0" />
                    <Field label="Existing loans (KES)" type="number" placeholder="0" />
                    <Field label="Rent / mortgage (KES)" type="number" placeholder="0" />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between">
                        <Label>Loan amount</Label>
                        <span className="text-lg font-bold tabular-nums">{kes(amount)}</span>
                      </div>
                      <Slider className="mt-3" value={[amount]} onValueChange={([v]) => setAmount(v)} min={1000} max={100000} step={500} />
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{kes(1000)}</span><span>{kes(100000)}</span></div>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label>Repayment period</Label>
                        <span className="text-lg font-bold">{months} month{months > 1 ? "s" : ""}</span>
                      </div>
                      <Slider className="mt-3" value={[months]} onValueChange={([v]) => setMonths(v)} min={1} max={12} step={1} />
                    </div>
                    <div>
                      <Label>Loan purpose</Label>
                      <Select defaultValue="Business"><SelectTrigger className="h-11 rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Business", "School Fees", "Medical", "Rent", "Emergency", "Personal"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Additional details</Label>
                      <Textarea className="mt-1.5 rounded-xl" rows={3} placeholder="Optional context for our review team" />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="grid gap-3">
                    <button type="button" className="card-soft p-5 text-left hover:border-primary hover:shadow-elevated transition-all group">
                      <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center group-hover:scale-105 transition-transform">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-3 font-semibold">National ID</p>
                      <p className="text-xs text-muted-foreground">Front & back photo</p>
                      <p className="mt-2 text-xs text-primary font-medium">Click to upload</p>
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-2">
              {step > 0 && <Button variant="outline" onClick={back} className="rounded-xl h-11"><ArrowLeft className="mr-1 h-4 w-4" /> Previous</Button>}
              <div className="ml-auto">
                {step < steps.length - 1 ? (
                  <Button onClick={next} className="rounded-xl h-11 gradient-brand text-white font-semibold shadow-soft">Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>
                ) : (
                  <Button disabled={submitting} onClick={submit} className="rounded-xl h-11 gradient-brand text-white font-semibold shadow-soft"><Sparkles className="mr-1 h-4 w-4" /> {submitting ? "Submitting..." : "Submit application"}</Button>
                )}
              </div>
            </div>
          </div>

          {/* Live quote */}
          <aside className="card-soft p-6 h-fit sticky top-24">
            <p className="text-sm font-semibold text-muted-foreground">Your quote</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{kes(amount)}</p>
            <p className="text-xs text-muted-foreground">{months} month repayment</p>
            <div className="mt-5 space-y-3 text-sm">
              <Row label="Principal" value={kes(amount)} />
              <Row label={`Interest (${months}mo)`} value={kes(quote.interest)} />
              <Row label="Processing fee" value={kes(quote.fee)} />
              <div className="h-px bg-border my-1" />
              <Row label="Monthly payment" value={kes(quote.monthly)} bold />
              <Row label="Total payable" value={kes(quote.totalPayable)} bold />
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Final terms subject to eligibility assessment.</p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-11 rounded-xl" {...rest} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold && "font-semibold text-foreground text-base")}>{value}</span>
    </div>
  );
}
