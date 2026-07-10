import { createFileRoute } from "@tanstack/react-router";
import { Upload, Shield, Bell, KeyRound, Smartphone, CreditCard } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — HarakaCash" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="card-soft p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl gradient-brand text-white grid place-items-center text-2xl font-bold shadow-soft">WM</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">Wanjiru Mwangi</h1>
            <p className="text-sm text-muted-foreground">wanjiru@example.com · +254 712 345 678</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-success/15 text-success border-success/30" variant="outline">Verified</Badge>
              <Badge variant="secondary" className="rounded-full">Nairobi</Badge>
              <Badge variant="secondary" className="rounded-full">Tier 2 borrower</Badge>
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
              <F label="Full name" defaultValue="Wanjiru Mwangi" />
              <F label="National ID" defaultValue="29348571" />
              <F label="Phone" defaultValue="0712 345 678" />
              <F label="Email" defaultValue="wanjiru@example.com" />
              <F label="Date of birth" type="date" defaultValue="1994-06-12" />
              <F label="County" defaultValue="Nairobi" />
            </div>
          </TabsContent>

          <TabsContent value="employment" className="mt-4">
            <div className="card-soft p-6 grid gap-4 sm:grid-cols-2">
              <F label="Employer" defaultValue="Safaricom PLC" />
              <F label="Job title" defaultValue="Sales Executive" />
              <F label="Monthly income (KES)" defaultValue="65000" />
              <F label="Years employed" defaultValue="3" />
            </div>
          </TabsContent>

          <TabsContent value="banking" className="mt-4">
            <div className="card-soft p-6 grid gap-4 sm:grid-cols-2">
              <F label="Bank" defaultValue="Equity Bank" />
              <F label="Account number" defaultValue="0110123456789" />
              <F label="M-Pesa number" defaultValue="0712 345 678" />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { t: "National ID", s: "Verified", icon: Shield },
                { t: "Selfie", s: "Verified", icon: Smartphone },
                { t: "Payslip (Sep 2026)", s: "Uploaded", icon: CreditCard },
                { t: "Bank statement", s: "Pending", icon: Upload },
              ].map((d) => (
                <div key={d.t} className="card-soft p-5 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary grid place-items-center">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{d.t}</p>
                    <p className="text-xs text-muted-foreground">{d.s}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-lg">Update</Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <div className="card-soft divide-y">
              {[
                { icon: KeyRound, t: "Password", d: "Last changed 3 months ago", cta: "Change" },
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
