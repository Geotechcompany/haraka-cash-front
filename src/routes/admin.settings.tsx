import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: () => (
    <AdminShell title="Settings" subtitle="Platform-level configuration.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-soft p-6">
          <p className="font-semibold">Lending policy</p>
          <p className="text-xs text-muted-foreground">Adjust product-wide limits.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Min amount (KES)" defaultValue="1000" />
            <Field label="Max amount (KES)" defaultValue="100000" />
            <Field label="Monthly interest %" defaultValue="6" />
            <Field label="Late fee %" defaultValue="5" />
          </div>
          <Button className="mt-4 rounded-xl gradient-brand text-white">Save changes</Button>
        </div>
        <div className="card-soft divide-y">
          {[
            ["Automated approvals", "Auto-approve loans below KES 20,000 for tier-2 borrowers."],
            ["Fraud checks", "Enable enhanced fraud screening for new users."],
            ["SMS notifications", "Send SMS updates to all borrowers."],
            ["Maintenance mode", "Temporarily disable new applications."],
          ].map(([t, d]) => (
            <div key={t} className="p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0"><p className="font-semibold">{t}</p><p className="text-xs text-muted-foreground">{d}</p></div>
              <Switch defaultChecked={t !== "Maintenance mode"} />
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  ),
});

function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (<div className="space-y-1.5"><Label>{label}</Label><Input className="h-11 rounded-xl" {...rest} /></div>);
}
