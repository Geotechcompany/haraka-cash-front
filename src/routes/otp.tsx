import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { AuthLayout } from "@/components/auth/auth-layout";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify OTP — HarakaCash" }] }),
  component: OtpPage,
});

function OtpPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <AuthLayout
      title="Verify your account"
      subtitle="Complete sign-up to finish email or phone verification."
      footer={
        <>
          Back to{" "}
          <Link to="/register" className="font-semibold text-primary">
            sign up
          </Link>
        </>
      }
    >
      <div className="rounded-2xl border bg-primary-soft/40 p-6 text-center">
        <p className="font-semibold">Verification is handled during sign-up</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Clerk sends and verifies your one-time code as part of account creation.
        </p>
        <Link
          to="/register"
          className="mt-4 inline-flex items-center justify-center rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft"
        >
          Continue sign up
        </Link>
      </div>
    </AuthLayout>
  );
}
