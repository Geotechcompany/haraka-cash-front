import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/tanstack-react-start";import { Moon, Globe, Bell, Lock, Shield, LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/theme";
function SignOutButton() {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className="text-destructive hover:text-destructive rounded-xl"
      onClick={() => signOut(() => navigate({ to: "/" }))}
    >
      <LogOut className="mr-1 h-4 w-4" /> Sign out
    </Button>
  );
}

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — HarakaCash" }] }),
  component: () => {
    const { theme, toggle } = useTheme();
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Personalize your HarakaCash experience.</p>

          <div className="card-soft divide-y mt-6">
            <Row icon={Moon} title="Dark mode" desc="Switch between light and dark themes">
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </Row>
            <Row icon={Globe} title="Language" desc="Choose your preferred language">
              <Select defaultValue="en"><SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Kiswahili</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row icon={Bell} title="Push notifications" desc="Loan updates and reminders"><Switch defaultChecked /></Row>
            <Row icon={Bell} title="Email notifications" desc="Statements and marketing"><Switch /></Row>
            <Row icon={Lock} title="Privacy" desc="Manage data sharing">
              <Button variant="outline" size="sm" className="rounded-lg">Manage</Button>
            </Row>
            <Row icon={Shield} title="Security" desc="Password, 2FA, sessions">
              <Button variant="outline" size="sm" className="rounded-lg" asChild><Link to="/profile">Open</Link></Button>
            </Row>
          </div>

          <div className="mt-6 flex justify-end">
            <SignOutButton />
          </div>
        </div>
      </AppShell>
    );
  },
});

function Row({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center"><Icon className="h-5 w-5" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
