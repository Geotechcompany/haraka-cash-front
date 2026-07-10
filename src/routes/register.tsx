import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ClerkSignUp } from "@/components/auth/clerk-auth-form";
import { RedirectIfSignedIn } from "@/components/auth/auth-redirect";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — HarakaCash" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <RedirectIfSignedIn>
      <AuthLayout
        title="Create your account"
        subtitle="Join HarakaCash and apply for your first loan in minutes."
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
