import { useAuth } from "@clerk/tanstack-react-start";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function RedirectIfSignedIn({
  to = "/dashboard",
  children,
}: {
  to?: string;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to={to} />;
  }

  return children;
}
