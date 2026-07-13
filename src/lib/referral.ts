/** Referral program constants and client-side ref capture helpers. */

/** Credit added to referrer's availableCredit per successful signup (KES). */
export const REFERRAL_CREDIT_PER_SIGNUP = 1_000;

/** Max successful referrals that earn credit for one referrer. */
export const REFERRAL_MAX_AWARDS = 10;

/** Cap on total referral credit a referrer can earn (KES). */
export const REFERRAL_MAX_CREDIT = REFERRAL_CREDIT_PER_SIGNUP * REFERRAL_MAX_AWARDS;

export const REFERRAL_CODE_LENGTH = 8;

export const REFERRAL_STORAGE_KEY = "haraka_ref";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function isValidReferralCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(code);
}

export function generateReferralCode(length = REFERRAL_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return code;
}

export function referralInvitePath(code: string): string {
  return `/register?ref=${encodeURIComponent(code)}`;
}

export function referralShortLinkPath(code: string): string {
  return `/r/${encodeURIComponent(code)}`;
}

/** Ready-to-paste invite text for WhatsApp, X, Facebook, SMS, etc. */
export function buildReferralShareMessage(params: {
  inviteUrl: string;
  code: string;
}): string {
  return [
    "Need a salary advance, a personal loan, or working capital for your business? HarakaCash is built for Kenya — you apply online with just your national ID, and funds hit M-Pesa with instant disbursement.",
    "",
    `Apply with my invite: ${params.inviteUrl}`,
    `Code: ${params.code}`,
  ].join("\n");
}

export function persistReferralCode(raw: string): string | null {
  if (typeof window === "undefined") return null;
  const code = normalizeReferralCode(raw);
  if (!isValidReferralCodeFormat(code)) return null;
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  return code;
}

export function readStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!raw) return null;
  const code = normalizeReferralCode(raw);
  return isValidReferralCodeFormat(code) ? code : null;
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
