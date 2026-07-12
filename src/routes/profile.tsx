import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Upload, Shield, Bell, KeyRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/applications";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — HarakaCash" }] }),
  loader: () => getCurrentUser(),
  component: ProfilePage,
});

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.4 };

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

function ProfilePage() {
  const user = Route.useLoaderData();
  const reduceMotion = useReducedMotion();
  const name = user?.name ?? "HarakaCash user";
  const email = user?.email ?? "";
  const phone = user?.phone ?? "";

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
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {[email, phone].filter(Boolean).join(" · ") || "Add contact details below"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user?.eligibilityScore ? (
                <Badge
                  className="rounded-full border-success/30 bg-success/15 text-success"
                  variant="outline"
                >
                  Score {user.eligibilityScore}/100
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">
                  Profile incomplete
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" className="rounded-xl">
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
            <TabsTrigger value="documents" className="rounded-lg">
              Documents
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 md:p-6">
              <F label="Full name" defaultValue={name} placeholder="Your full name" />
              <F label="National ID" placeholder="12345678" />
              <F label="Phone" defaultValue={phone} placeholder="07xx xxx xxx" />
              <F label="Email" defaultValue={email} placeholder="you@example.com" />
              <F label="Date of birth" type="date" />
              <F label="County" placeholder="Your county" />
            </div>
          </TabsContent>

          <TabsContent value="employment" className="mt-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 md:p-6">
              <F label="Employer" placeholder="Company name" />
              <F label="Job title" placeholder="Your role" />
              <F label="Monthly income (KES)" type="number" placeholder="0" />
              <F label="Years employed" type="number" placeholder="0" />
            </div>
          </TabsContent>

          <TabsContent value="banking" className="mt-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 md:p-6">
              <F label="Bank" placeholder="Bank name" />
              <F label="Account number" placeholder="Account number" />
              <F label="M-Pesa number" defaultValue={phone} placeholder="07xx xxx xxx" />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">National ID</p>
                <p className="text-xs text-muted-foreground">Not uploaded</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-lg">
                Upload
              </Button>
            </div>
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
                    <Switch />
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-lg">
                      {s.cta}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function F({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-11 rounded-xl" {...rest} />
    </div>
  );
}
