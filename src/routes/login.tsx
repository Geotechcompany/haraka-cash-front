import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, Lock, ArrowRight } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — HarakaCash" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { toast.success("Welcome back!"); navigate({ to: "/dashboard" }); }, 800);
  };
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your HarakaCash account."
      footer={<>Don't have an account? <Link to="/register" className="font-semibold text-primary">Create one</Link></>}
    >
      <Tabs defaultValue="phone">
        <TabsList className="grid grid-cols-2 w-full rounded-xl">
          <TabsTrigger value="phone" className="rounded-lg"><Phone className="h-4 w-4 mr-1.5" /> Phone</TabsTrigger>
          <TabsTrigger value="email" className="rounded-lg"><Mail className="h-4 w-4 mr-1.5" /> Email</TabsTrigger>
        </TabsList>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <TabsContent value="phone" className="space-y-4 mt-0">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+254</span>
                <Input id="phone" inputMode="tel" placeholder="712 345 678" className="pl-14 h-11 rounded-xl" required />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="email" className="space-y-4 mt-0">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" className="h-11 rounded-xl" required />
            </div>
          </TabsContent>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot" className="text-xs font-medium text-primary hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="••••••••" className="pl-9 h-11 rounded-xl" required />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-brand text-white text-base font-semibold shadow-soft">
            {loading ? "Signing in..." : <>Sign in <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <span className="relative flex justify-center text-xs uppercase text-muted-foreground bg-background px-2 mx-auto w-fit">or continue with</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl">Google</Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl">Apple</Button>
          </div>
        </form>
      </Tabs>
    </AuthLayout>
  );
}
