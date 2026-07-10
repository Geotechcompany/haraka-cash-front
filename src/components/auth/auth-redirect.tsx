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

  if (isLoaded && isSignedIn) {
    return <Navigate to={to} />;
  }

  return children;
}
