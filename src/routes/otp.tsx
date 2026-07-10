import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify OTP — HarakaCash" }] }),
  component: () => {
    const [v, setV] = useState("");
    const navigate = useNavigate();
    return (
      <AuthLayout title="Verify your phone" subtitle="Enter the 6-digit code we sent to +254 712 345 678.">
        <form onSubmit={(e) => { e.preventDefault(); if (v.length === 6) { toast.success("Verified"); navigate({ to: "/dashboard" }); } }} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={v} onChange={setV}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg rounded-xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full h-11 rounded-xl gradient-brand text-white font-semibold" disabled={v.length < 6}>Verify</Button>
          <p className="text-center text-sm text-muted-foreground">Didn't get it? <button type="button" className="text-primary font-semibold hover:underline">Resend code</button></p>
        </form>
      </AuthLayout>
    );
  },
});
