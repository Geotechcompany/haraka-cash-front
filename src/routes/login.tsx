import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RedirectIfSignedIn } from "@/components/auth/auth-redirect";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — HarakaCash" }] }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <RedirectIfSignedIn>
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to access your HarakaCash account."
        footer={
          <>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-primary">
              Create one
            </Link>
          </>
        }
      >
        <SignIn
          routing="virtual"
          signUpUrl="/register"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      </AuthLayout>
    </RedirectIfSignedIn>
  );
}
