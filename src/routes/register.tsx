import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { KENYAN_COUNTIES, KENYAN_EMPLOYERS } from "@/lib/mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — HarakaCash" }] }),
  component: RegisterPage,
});

const steps = ["Personal", "Location", "Employment", "Banking", "Security"];

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < steps.length - 1) return next();
    setLoading(true);
    setTimeout(() => { toast.success("Account created!"); navigate({ to: "/otp" }); }, 900);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={`Step ${step + 1} of ${steps.length} · ${steps[step]}`}
      footer={<>Already have one? <Link to="/login" className="font-semibold text-primary">Sign in</Link></>}
    >
      <div className="flex gap-1.5 mb-6" aria-hidden>
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
            {step === 0 && (
              <>
                <Field label="Full name" id="name" placeholder="Wanjiru Mwangi" required />
                <Field label="National ID" id="nid" placeholder="12345678" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" id="phone" placeholder="0712 345 678" required />
                  <Field label="Date of birth" id="dob" type="date" required />
                </div>
                <Field label="Email" id="email" type="email" placeholder="you@example.com" required />
              </>
            )}
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label>County</Label>
                  <Select><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent>{KENYAN_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Field label="Town / estate" id="town" placeholder="Westlands" required />
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label>Employment status</Label>
                  <Select><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {["Employed", "Self-employed", "Business owner", "Contract", "Casual"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Employer</Label>
                  <Select><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select employer" /></SelectTrigger>
                    <SelectContent>{KENYAN_EMPLOYERS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Field label="Monthly income (KES)" id="income" type="number" placeholder="45000" required />
              </>
            )}
            {step === 3 && (
              <>
                <Field label="Bank name" id="bank" placeholder="Equity Bank" required />
                <Field label="Bank account number" id="bacc" placeholder="0110123456789" required />
                <Field label="M-Pesa number" id="mpesa" placeholder="0712 345 678" required />
              </>
            )}
            {step === 4 && (
              <>
                <Field label="Password" id="pw" type="password" required />
                <Field label="Confirm password" id="pw2" type="password" required />
                <label className="flex items-start gap-2 pt-2 text-sm">
                  <Checkbox required className="mt-0.5" />
                  <span className="text-muted-foreground">I accept the Terms of Service and Privacy Policy.</span>
                </label>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={back} className="h-11 rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl gradient-brand text-white font-semibold shadow-soft">
            {loading ? "Creating..." : step === steps.length - 1 ? (<>Create account <CheckCircle2 className="ml-1 h-4 w-4" /></>) : (<>Continue <ArrowRight className="ml-1 h-4 w-4" /></>)}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

function Field({ label, id, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11 rounded-xl" {...rest} />
    </div>
  );
}
