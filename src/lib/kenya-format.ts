/** Kenyan mobile / M-Pesa: 07xx / 01xx / +254 / 254… */
export function isValidKenyanPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) {
    return /^254[17]\d{8}$/.test(digits);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return /^0[17]\d{8}$/.test(digits);
  }
  if (digits.length === 9) {
    return /^[17]\d{8}$/.test(digits);
  }
  return false;
}

/** Kenyan national ID: 7–8 digits. */
export function isValidKenyanNationalId(value: string): boolean {
  return /^\d{7,8}$/.test(value.trim());
}

export function kenyanPhoneError(value: string): string | null {
  if (!value.trim()) return "Phone number is required";
  if (!isValidKenyanPhone(value)) return "Enter a valid Kenyan mobile (e.g. 0712 345 678)";
  return null;
}

export function kenyanNationalIdError(value: string): string | null {
  if (!value.trim()) return "National ID is required";
  if (!isValidKenyanNationalId(value)) return "Enter a valid National ID (7–8 digits)";
  return null;
}
