import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Reset password — HarakaCash" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => (
    <p className="p-8 text-center text-sm text-muted-foreground">
      Redirecting to sign in...{" "}
      <Link to="/login" className="font-semibold text-primary">
        Continue
      </Link>
    </p>
  ),
});
