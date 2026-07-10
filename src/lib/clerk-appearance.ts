import { dark } from "@clerk/themes";
import type { Appearance } from "@clerk/types";

const brand = {
  primary: "#0057FF",
  primaryHover: "#0046cc",
} as const;

const hidden = { display: "none" } as const;

const palette = {
  light: {
    text: "#1a1f36",
    textSecondary: "#64748b",
    background: "#fafbfc",
    surface: "#ffffff",
    border: "#e2e8f0",
    inputBg: "#ffffff",
    inputText: "#1a1f36",
    inputPlaceholder: "#64748b",
    inputIcon: "#64748b",
    surfaceHover: "#f8fafc",
  },
  dark: {
    text: "#f5f6f8",
    textSecondary: "#b4bac5",
    background: "#1a1d2b",
    surface: "#242836",
    border: "rgba(255, 255, 255, 0.12)",
    inputBg: "#242836",
    inputText: "#f5f6f8",
    inputPlaceholder: "#b4bac5",
    inputIcon: "#b4bac5",
    surfaceHover: "#2d3344",
  },
} as const;

export function getClerkAppearance(theme: "light" | "dark"): Appearance {
  const colors = palette[theme];
  const inputFieldStyles = {
    backgroundColor: colors.inputBg,
    color: colors.inputText,
    "&::placeholder": {
      color: colors.inputPlaceholder ?? colors.textSecondary,
      opacity: 1,
    },
  };

  return {
    baseTheme: theme === "dark" ? dark : undefined,
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    variables: {
      colorPrimary: brand.primary,
      colorText: colors.text,
      colorTextSecondary: colors.textSecondary,
      colorBackground: colors.background,
      colorInputBackground: colors.inputBg,
      colorInputText: colors.inputText,
      colorInputForeground: colors.inputText,
      colorNeutral: colors.textSecondary,
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
      socialButtonsBlockButton: {
        borderRadius: "0.75rem",
        height: "2.75rem",
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        "&:hover": {
          backgroundColor: colors.surfaceHover,
        },
      },
      socialButtonsBlockButtonText: {
        fontWeight: 500,
        color: colors.text,
      },
      dividerLine: {
        backgroundColor: colors.border,
      },
      dividerText: {
        color: colors.textSecondary,
        fontSize: "0.75rem",
        textTransform: "uppercase",
      },
      formFieldLabel: {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: colors.text,
      },
      formFieldInput: {
        borderRadius: "0.75rem",
        height: "2.75rem",
        backgroundColor: colors.inputBg,
        color: colors.inputText,
        border: `1px solid ${colors.border}`,
        "& input": inputFieldStyles,
        "&::placeholder": {
          color: colors.inputPlaceholder ?? colors.textSecondary,
          opacity: 1,
        },
      },
      formFieldInput__input: inputFieldStyles,
      input: inputFieldStyles,
      formFieldInputShowPasswordButton: {
        color: colors.inputIcon ?? colors.textSecondary,
        "&:hover": {
          color: colors.inputText,
        },
      },
      phoneInputBox: {
        backgroundColor: colors.inputBg,
        border: `1px solid ${colors.border}`,
        borderRadius: "0.75rem",
        color: colors.inputText,
      },
      phoneInputInput: inputFieldStyles,
      phoneInputCountrySelector: {
        backgroundColor: colors.inputBg,
        color: colors.inputText,
      },
      phoneInputCountrySelectorButton: {
        color: colors.inputIcon ?? colors.textSecondary,
        "&:hover": {
          color: colors.inputText,
        },
      },
      formButtonPrimary: {
        borderRadius: "0.75rem",
        height: "2.75rem",
        backgroundColor: brand.primary,
        color: "#ffffff",
        fontWeight: 600,
        boxShadow: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        "&:hover": {
          backgroundColor: brand.primaryHover,
        },
      },
      footer: hidden,
      footerItem: hidden,
      footerAction: hidden,
      footerActionText: hidden,
      footerActionLink: hidden,
      footerPages: hidden,
      footerPagesLink: hidden,
      identityPreview: {
        borderRadius: "0.75rem",
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
      },
      formResendCodeLink: {
        color: brand.primary,
        fontWeight: 600,
      },
      otpCodeFieldInput: {
        borderRadius: "0.75rem",
        backgroundColor: colors.inputBg,
        color: colors.inputText,
        border: `1px solid ${colors.border}`,
        ...inputFieldStyles,
      },
      alternativeMethodsBlockButton: {
        borderRadius: "0.75rem",
        color: colors.text,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
      },
      backLink: {
        color: brand.primary,
        fontWeight: 500,
      },
    },
  };
}
