import { isPublishableKey } from "@clerk/shared/keys";

type ClerkInitWindow = Window & {
  __clerk_init_state?: {
    __internal_clerk_state?: {
      __publishableKey?: string;
    };
  };
};

export type ClerkKeyIssue = "missing" | "placeholder" | "invalid";

export type ClerkKeyStatus =
  | { ok: true; publishableKey: string }
  | { ok: false; issue: ClerkKeyIssue };

const PLACEHOLDER_MARKERS = ["...", "your_publishable", "your-publishable", "replace_me", "replace-me"];

export function isClerkKeyPlaceholder(key: string): boolean {
  const trimmed = key.trim().toLowerCase();
  if (!trimmed) return true;
  if (/^pk_(test|live)_$/.test(trimmed)) return true;
  return PLACEHOLDER_MARKERS.some((marker) => trimmed.includes(marker));
}

export function getClerkPublishableKey(): string | undefined {
  const viteKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (typeof viteKey === "string" && viteKey.trim()) return viteKey.trim();

  if (typeof window !== "undefined") {
    const fromState = (window as ClerkInitWindow).__clerk_init_state?.__internal_clerk_state
      ?.__publishableKey;
    if (typeof fromState === "string" && fromState.trim()) return fromState.trim();
  }

  const envKey = import.meta.env.CLERK_PUBLISHABLE_KEY;
  if (typeof envKey === "string" && envKey.trim()) return envKey.trim();

  return undefined;
}

export function validateClerkPublishableKey(key = getClerkPublishableKey()): ClerkKeyStatus {
  if (!key) return { ok: false, issue: "missing" };
  if (isClerkKeyPlaceholder(key)) return { ok: false, issue: "placeholder" };
  if (!isPublishableKey(key)) return { ok: false, issue: "invalid" };
  return { ok: true, publishableKey: key };
}

export const clerkDashboardKeysUrl = "https://dashboard.clerk.com/last-active?path=api-keys";

export function isClerkConfigured(): boolean {
  return validateClerkPublishableKey().ok;
}
