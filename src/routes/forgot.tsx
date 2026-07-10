import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Reset password — HarakaCash" }] }),
  component: () => {
    const [sent, setSent] = useState(false);
    return (
      <AuthLayout title="Reset password" subtitle="We'll send a reset link to your phone or email." footer={<>Remembered it? <Link to="/login" className="font-semibold text-primary">Sign in</Link></>}>
        {sent ? (
          <div className="rounded-2xl border p-6 text-center bg-primary-soft/40">
            <p className="font-semibold">Check your inbox</p>
            <p className="text-sm text-muted-foreground mt-1">If an account exists, a reset link is on its way.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Reset link sent"); setSent(true); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e">Email or phone</Label>
              <Input id="e" className="h-11 rounded-xl" placeholder="you@example.com" required />
            </div>
            <Button className="w-full h-11 rounded-xl gradient-brand text-white font-semibold">Send reset link</Button>
          </form>
        )}
      </AuthLayout>
    );
  },
});
