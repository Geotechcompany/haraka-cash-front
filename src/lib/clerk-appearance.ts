import type { Appearance } from "@clerk/types";

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#0057FF",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorBackground: "var(--background)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    borderRadius: "0.75rem",
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "shadow-none p-0 bg-transparent border-0 gap-4",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "rounded-xl border h-11",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground uppercase text-xs",
    formFieldLabel: "text-sm font-medium",
    formFieldInput: "rounded-xl h-11",
    formButtonPrimary:
      "rounded-xl h-11 bg-[#0057FF] hover:bg-[#0046cc] text-white font-semibold shadow-sm",
    footer: "hidden",
    footerAction: "hidden",
    identityPreview: "rounded-xl",
    formResendCodeLink: "text-primary font-semibold",
    otpCodeFieldInput: "rounded-xl",
    alternativeMethodsBlockButton: "rounded-xl",
    backLink: "text-primary font-medium",
  },
};
