import { ClerkProvider } from "@clerk/tanstack-react-start";
import type { ReactNode } from "react";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { getClerkPublishableKey } from "@/lib/clerk-config";
import { useTheme } from "@/lib/theme";

export function ThemedClerkProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <ClerkProvider
      appearance={getClerkAppearance(theme)}
      publishableKey={getClerkPublishableKey()}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
