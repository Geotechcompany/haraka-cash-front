type ZodIssue = {
  code?: string;
  message?: string;
  path?: (string | number)[];
  minimum?: number;
  maximum?: number;
  type?: string;
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  nationalId: "National ID",
  phone: "Phone",
  mpesaNumber: "M-Pesa number",
  employmentStatus: "Employment status",
  employer: "Employer",
  jobTitle: "Job title",
  yearsAtEmployer: "Years at employer",
  yearsEmployed: "Years employed",
  monthlyIncome: "Monthly income",
  monthlyExpenses: "Monthly expenses",
  existingLoans: "Existing loans",
  rentMortgage: "Rent or mortgage",
  amount: "Loan amount",
  months: "Repayment period",
  purpose: "Purpose",
  county: "County",
  email: "Email",
  dateOfBirth: "Date of birth",
  bankName: "Bank name",
  accountNumber: "Account number",
  productType: "Product type",
  applicationNumber: "Application number",
  action: "Action",
  notes: "Notes",
  status: "Status",
  reference: "Reference",
};

const GENERIC_FALLBACK = "Something went wrong. Please try again.";

const SERVER_PREFIX = /^.*?(?:Server Fn Error|Server Error):\s*/i;

function labelForPath(path: (string | number)[]): string {
  const key = String(path[0] ?? "");
  return FIELD_LABELS[key] ?? humanizeFieldKey(key);
}

function humanizeFieldKey(key: string): string {
  if (!key) return "This field";
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function isGenericZodMessage(message: string): boolean {
  return /^(Required|String must|Number must|Invalid input|Expected|Invalid enum)/i.test(message);
}

function formatZodIssue(issue: ZodIssue): string {
  const label = labelForPath(issue.path ?? []);
  const code = issue.code ?? "";
  const message = issue.message?.trim() ?? "";

  if (code === "too_big" && issue.maximum !== undefined) {
    if (issue.type === "string") {
      const unit = issue.maximum === 1 ? "character" : "characters";
      return `${label} must be ${issue.maximum} ${unit} or fewer.`;
    }
    return `${label} must be ${issue.maximum} or less.`;
  }

  if (code === "too_small" && issue.minimum !== undefined) {
    if (issue.type === "string") {
      const unit = issue.minimum === 1 ? "character" : "characters";
      return `${label} must be at least ${issue.minimum} ${unit}.`;
    }
    return `${label} must be at least ${issue.minimum}.`;
  }

  if (code === "invalid_type") {
    return `${label} must be a valid value.`;
  }

  if (message && !isGenericZodMessage(message)) {
    if (message.includes(label)) {
      return message.endsWith(".") ? message : `${message}.`;
    }
    const lower = message.toLowerCase();
    if (lower.startsWith("enter ") || lower.startsWith("select ") || lower.includes(" is required")) {
      return message.endsWith(".") ? message : `${message}.`;
    }
    return `${label}: ${message.replace(/\.$/, "")}.`;
  }

  return `${label} is invalid.`;
}

function tryParseZodIssues(raw: string): ZodIssue[] | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item === "object") as ZodIssue[];
    }
    if (parsed && typeof parsed === "object" && "code" in parsed) {
      return [parsed as ZodIssue];
    }
  } catch {
    return null;
  }

  return null;
}

function stripServerPrefix(raw: string): string {
  return raw.replace(SERVER_PREFIX, "").trim() || raw.trim();
}

function looksUserSafe(message: string): boolean {
  if (!message || message.length > 240) return false;
  if (/^[\[{]/.test(message)) return false;
  if (/\bat\s+\S+\.(ts|js|tsx|jsx):\d+/i.test(message)) return false;
  if (/^(TypeError|ReferenceError|SyntaxError|ZodError):/i.test(message)) return false;
  return /[a-zA-Z]/.test(message);
}

export function formatUserFacingError(
  raw: string,
  fallback = GENERIC_FALLBACK,
): string {
  const stripped = stripServerPrefix(raw);
  const issues = tryParseZodIssues(stripped);

  if (issues?.length) {
    return issues.map(formatZodIssue).join("; ");
  }

  if (looksUserSafe(stripped)) {
    return stripped;
  }

  return fallback;
}

export function getUserFacingError(
  error: unknown,
  fallback = GENERIC_FALLBACK,
): string {
  if (error instanceof Error) {
    return formatUserFacingError(error.message, fallback);
  }
  if (typeof error === "string") {
    return formatUserFacingError(error, fallback);
  }
  return fallback;
}
