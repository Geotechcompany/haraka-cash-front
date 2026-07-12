import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ClerkSignUp } from "@/components/auth/clerk-auth-form";
import { RedirectIfSignedIn } from "@/components/auth/auth-redirect";
import { useEffect } from "react";
import { persistReferralCode } from "@/lib/referral";

const registerSearchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: registerSearchSchema,
  head: () => ({ meta: [{ title: "Create account — HarakaCash" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { ref } = Route.useSearch();

  useEffect(() => {
    if (ref) persistReferralCode(ref);
  }, [ref]);

  return (
    <RedirectIfSignedIn>
      <AuthLayout
        title="Create your account"
        subtitle={
          ref
            ? "You were invited. Join HarakaCash and apply for your first loan in minutes."
            : "Join HarakaCash and apply for your first loan in minutes."
        }
        footer={
          <>
            Already have one?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </>
        }
      >
        <ClerkSignUp
          routing="virtual"
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
        />
      </AuthLayout>
    </RedirectIfSignedIn>
  );
}
