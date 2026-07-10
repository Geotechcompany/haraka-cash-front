import { createFileRoute } from "@tanstack/react-router";
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "HC";
}

function ProfilePage() {
  const user = Route.useLoaderData();
  const name = user?.name ?? "HarakaCash user";
  const email = user?.email ?? "";
  const phone = user?.phone ?? "";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="card-soft p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl gradient-brand text-white grid place-items-center text-2xl font-bold shadow-soft">{initials(name)}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {[email, phone].filter(Boolean).join(" · ") || "Complete your profile below"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user?.eligibilityScore ? (
                <Badge className="rounded-full bg-success/15 text-success border-success/30" variant="outline">
                  Score {user.eligibilityScore}/100
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">Profile incomplete</Badge>
              )}
            </div>
          </div>
          <Button variant="outline" className="rounded-xl"><Upload className="mr-1 h-4 w-4" /> Change photo</Button>
        </div>

        <Tabs defaultValue="personal" className="mt-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="personal" className="rounded-lg">Personal</TabsTrigger>
            <TabsTrigger value="employment" className="rounded-lg">Employment</TabsTrigger>
            <TabsTrigger value="banking" className="rounded-lg">Banking</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg">Documents</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <div className="card-soft p-6 grid gap-4 sm:grid-cols-2">
              <F label="Full name" defaultValue={name} placeholder="Your full name" />
              <F label="National ID" placeholder="12345678" />
              <F label="Phone" defaultValue={phone} placeholder="07xx xxx xxx" />
              <F label="Email" defaultValue={email} placeholder="you@example.com" />
              <F label="Date of birth" type="date" />
              <F label="County" placeholder="Your county" />
            </div>
          </TabsContent>

          <TabsContent value="employment" className="mt-4">
            <div className="card-soft p-6 grid gap-4 sm:grid-cols-2">
              <F label="Employer" placeholder="Company name" />
              <F label="Job title" placeholder="Your role" />
              <F label="Monthly income (KES)" type="number" placeholder="0" />
              <F label="Years employed" type="number" placeholder="0" />
            </div>
          </TabsContent>

          <TabsContent value="banking" className="mt-4">
            <div className="card-soft p-6 grid gap-4 sm:grid-cols-2">
              <F label="Bank" placeholder="Bank name" />
              <F label="Account number" placeholder="Account number" />
              <F label="M-Pesa number" defaultValue={phone} placeholder="07xx xxx xxx" />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <div className="card-soft p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary grid place-items-center">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">National ID</p>
                <p className="text-xs text-muted-foreground">Not uploaded</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-lg">Upload</Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <div className="card-soft divide-y">
              {[
                { icon: KeyRound, t: "Password", d: "Managed through your sign-in provider", cta: "Change" },
                { icon: Shield, t: "Two-factor authentication", d: "Add extra security to your account", toggle: true },
                { icon: Bell, t: "Notification preferences", d: "Email, SMS and in-app alerts", cta: "Manage" },
              ].map((s, i) => (
                <div key={i} className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center"><s.icon className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.t}</p>
                    <p className="text-xs text-muted-foreground">{s.d}</p>
                  </div>
                  {s.toggle ? <Switch /> : <Button variant="outline" size="sm" className="rounded-lg">{s.cta}</Button>}
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
