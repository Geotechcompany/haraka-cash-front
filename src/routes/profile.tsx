import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Upload, Shield, Bell, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { kenyanNationalIdError, kenyanPhoneError } from "@/lib/kenya-format";
import { getCurrentUser, updateCurrentUserProfile } from "@/server/applications";
import type { UserProfile } from "@/lib/models/user";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — HarakaCash" }] }),
  loader: () => getCurrentUser(),
  component: ProfilePage,
});

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.4 };

type ProfileFormState = {
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  county: string;
  employer: string;
  jobTitle: string;
  monthlyIncome: string;
  yearsEmployed: string;
  bankName: string;
  accountNumber: string;
  mpesaNumber: string;
};

function profileToForm(user: UserProfile | null): ProfileFormState {
  return {
    fullName: user?.name && user.name !== "HarakaCash user" ? user.name : "",
    nationalId: user?.nationalId ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    dateOfBirth: user?.dateOfBirth ?? "",
    county: user?.county ?? "",
    employer: user?.employer ?? "",
    jobTitle: user?.jobTitle ?? "",
    monthlyIncome:
      typeof user?.monthlyIncome === "number" && Number.isFinite(user.monthlyIncome)
        ? String(user.monthlyIncome)
        : "",
    yearsEmployed:
      typeof user?.yearsEmployed === "number" && Number.isFinite(user.yearsEmployed)
        ? String(user.yearsEmployed)
        : "",
    bankName: user?.bankName ?? "",
    accountNumber: user?.accountNumber ?? "",
    mpesaNumber: user?.mpesaNumber ?? user?.phone ?? "",
  };
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "HC"
  );
}

function stripServerPrefix(raw: string) {
  return raw.replace(/^.*?Server Fn Error:\s*/i, "").trim() || raw;
}

function validateForm(form: ProfileFormState): Partial<Record<keyof ProfileFormState, string>> {
  const errors: Partial<Record<keyof ProfileFormState, string>> = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required";
  }

  if (form.nationalId.trim()) {
    const idErr = kenyanNationalIdError(form.nationalId);
    if (idErr) errors.nationalId = idErr;
  }

  if (form.phone.trim()) {
    const phoneErr = kenyanPhoneError(form.phone);
    if (phoneErr) errors.phone = phoneErr;
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (form.mpesaNumber.trim()) {
    const mpesaErr = kenyanPhoneError(form.mpesaNumber);
    if (mpesaErr) errors.mpesaNumber = mpesaErr.replace("Phone number", "M-Pesa number");
  }

  if (form.monthlyIncome.trim() !== "") {
    const income = Number(form.monthlyIncome);
    if (!Number.isFinite(income) || income < 0) {
      errors.monthlyIncome = "Enter a valid monthly income";
    }
  }

  if (form.yearsEmployed.trim() !== "") {
    const years = Number(form.yearsEmployed);
    if (!Number.isFinite(years) || years < 0 || years > 60) {
      errors.yearsEmployed = "Enter years employed between 0 and 60";
    }
  }

  return errors;
}

function ProfilePage() {
  const loaded = Route.useLoaderData();
  const router = useRouter();
  const saveProfile = useServerFn(updateCurrentUserProfile);
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState<ProfileFormState>(() => profileToForm(loaded));
  const [profileComplete, setProfileComplete] = useState(loaded?.profileComplete ?? 0);
  const [eligibilityScore, setEligibilityScore] = useState(loaded?.eligibilityScore ?? 0);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const displayName = form.fullName.trim() || loaded?.name || "HarakaCash user";
  const headerContact = [form.email.trim(), form.phone.trim()].filter(Boolean).join(" · ");

  const setField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fix the highlighted fields, then save again");
      return;
    }

    setSaving(true);
    try {
      const monthlyRaw = form.monthlyIncome.trim();
      const yearsRaw = form.yearsEmployed.trim();
      const saved = await saveProfile({
        data: {
          fullName: form.fullName.trim(),
          nationalId: form.nationalId.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          dateOfBirth: form.dateOfBirth.trim(),
          county: form.county.trim(),
          employer: form.employer.trim(),
          jobTitle: form.jobTitle.trim(),
          monthlyIncome: monthlyRaw === "" ? null : Number(monthlyRaw),
          yearsEmployed: yearsRaw === "" ? null : Number(yearsRaw),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          mpesaNumber: form.mpesaNumber.trim(),
        },
      });

      setForm(profileToForm(saved));
      setProfileComplete(saved.profileComplete);
      setEligibilityScore(saved.eligibilityScore);
      toast.success("Profile saved");
      await router.invalidate();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Could not save profile";
      toast.error(stripServerPrefix(raw));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.2 } : springEnter}
          className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center md:p-6"
        >
          <div className="grid h-20 w-20 place-items-center rounded-2xl gradient-brand text-2xl font-bold text-white shadow-soft">
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {headerContact || "Add contact details below"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {eligibilityScore > 0 ? (
                <Badge
                  className="rounded-full border-success/30 bg-success/15 text-success"
                  variant="outline"
                >
                  Score {eligibilityScore}/100
                </Badge>
              ) : null}
              {profileComplete >= 100 ? (
                <Badge
                  className="rounded-full border-success/30 bg-success/15 text-success"
                  variant="outline"
                >
                  Profile complete
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">
                  Profile incomplete · {profileComplete}%
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" className="rounded-xl" type="button" disabled>
            <Upload className="mr-1 h-4 w-4" /> Change photo
          </Button>
        </motion.div>

        <Tabs defaultValue="personal" className="mt-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="personal" className="rounded-lg">
              Personal
            </TabsTrigger>
            <TabsTrigger value="employment" className="rounded-lg">
              Employment
            </TabsTrigger>
            <TabsTrigger value="banking" className="rounded-lg">
              Banking
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4 space-y-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 md:p-6">
              <Field
                label="Full name"
                name="fullName"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="Your full name"
                required
                error={errors.fullName}
              />
              <Field
                label="National ID"
                name="nationalId"
                value={form.nationalId}
                onChange={(e) => setField("nationalId", e.target.value)}
                placeholder="12345678"
                inputMode="numeric"
                error={errors.nationalId}
              />
              <Field
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="07xx xxx xxx"
                inputMode="tel"
                autoComplete="tel"
                error={errors.phone}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email}
              />
              <Field
                label="Date of birth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
                error={errors.dateOfBirth}
              />
              <Field
                label="County"
                name="county"
                value={form.county}
                onChange={(e) => setField("county", e.target.value)}
                placeholder="Your county"
                error={errors.county}
              />
            </div>
            <SaveBar saving={saving} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="employment" className="mt-4 space-y-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 md:p-6">
              <Field
                label="Employer"
                name="employer"
                value={form.employer}
                onChange={(e) => setField("employer", e.target.value)}
                placeholder="Company name"
                error={errors.employer}
              />
              <Field
                label="Job title"
                name="jobTitle"
                value={form.jobTitle}
                onChange={(e) => setField("jobTitle", e.target.value)}
                placeholder="Your role"
                error={errors.jobTitle}
              />
              <Field
                label="Monthly income (KES)"
                name="monthlyIncome"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.monthlyIncome}
                onChange={(e) => setField("monthlyIncome", e.target.value)}
                placeholder="0"
                error={errors.monthlyIncome}
              />
              <Field
                label="Years employed"
                name="yearsEmployed"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={form.yearsEmployed}
                onChange={(e) => setField("yearsEmployed", e.target.value)}
                placeholder="0"
                error={errors.yearsEmployed}
              />
            </div>
            <SaveBar saving={saving} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="banking" className="mt-4 space-y-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 md:p-6">
              <Field
                label="Bank"
                name="bankName"
                value={form.bankName}
                onChange={(e) => setField("bankName", e.target.value)}
                placeholder="Bank name"
                error={errors.bankName}
              />
              <Field
                label="Account number"
                name="accountNumber"
                value={form.accountNumber}
                onChange={(e) => setField("accountNumber", e.target.value)}
                placeholder="Account number"
                error={errors.accountNumber}
              />
              <Field
                label="M-Pesa number"
                name="mpesaNumber"
                value={form.mpesaNumber}
                onChange={(e) => setField("mpesaNumber", e.target.value)}
                placeholder="07xx xxx xxx"
                inputMode="tel"
                error={errors.mpesaNumber}
              />
            </div>
            <SaveBar saving={saving} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
              {[
                {
                  icon: KeyRound,
                  t: "Password",
                  d: "Managed through your sign-in provider",
                  cta: "Change",
                },
                {
                  icon: Shield,
                  t: "Two-factor authentication",
                  d: "Add extra security to your account",
                  toggle: true,
                },
                {
                  icon: Bell,
                  t: "Notification preferences",
                  d: "Email, SMS and in-app alerts",
                  cta: "Manage",
                },
              ].map((s) => (
                <div key={s.t} className="flex items-center gap-4 p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.t}</p>
                    <p className="text-xs text-muted-foreground">{s.d}</p>
                  </div>
                  {s.toggle ? (
                    <Switch disabled />
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-lg" type="button" disabled>
                      {s.cta}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <p className="font-semibold">Sign out</p>
            <p className="text-sm text-muted-foreground">End your session on this device.</p>
          </div>
          <SignOutButton className="rounded-xl sm:shrink-0" />
        </div>
      </div>
    </AppShell>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <Button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="h-11 rounded-xl gradient-brand px-6 font-semibold text-white"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </div>
  );
}

function Field({
  label,
  error,
  required: isRequired,
  id,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>
        {label}
        {isRequired ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={fieldId}
        className={cn(
          "h-11 rounded-xl",
          error && "border-destructive focus-visible:ring-destructive",
        )}
        aria-invalid={Boolean(error)}
        required={isRequired}
        {...rest}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
