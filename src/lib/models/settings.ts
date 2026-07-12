export const PLATFORM_SETTINGS_KEY = "platform-lending" as const;

export const QUOTE_AI_PROVIDERS = ["auto", "gemini", "openai", "off"] as const;
export type QuoteAiProvider = (typeof QUOTE_AI_PROVIDERS)[number];

export type PlatformSettingsRecord = {
  _id?: string;
  key: typeof PLATFORM_SETTINGS_KEY;
  minLoanAmount?: number;
  maxLoanAmount?: number;
  minProcessingFee?: number;
  monthlyInterestRate?: number;
  lateFeeRate?: number;
  automatedApprovals?: boolean;
  fraudChecks?: boolean;
  smsNotifications?: boolean;
  maintenanceMode?: boolean;
  /** Server-only. Never include in public/client DTOs. */
  geminiApiKey?: string;
  /** Server-only. Never include in public/client DTOs. */
  openaiApiKey?: string;
  /** Which AI provider enriches loan quote notes. Default: auto. */
  quoteAiProvider?: QuoteAiProvider;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Safe settings shape for admin UI (API keys are masked, never full). */
export type PlatformSettings = {
  key: typeof PLATFORM_SETTINGS_KEY;
  minLoanAmount: number;
  maxLoanAmount: number;
  minProcessingFee: number;
  monthlyInterestRate: number;
  lateFeeRate: number;
  automatedApprovals: boolean;
  fraudChecks: boolean;
  smsNotifications: boolean;
  maintenanceMode: boolean;
  quoteAiProvider: QuoteAiProvider;
  geminiApiKeyConfigured: boolean;
  geminiApiKeyMasked: string;
  openaiApiKeyConfigured: boolean;
  openaiApiKeyMasked: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  key: PLATFORM_SETTINGS_KEY,
  minLoanAmount: 1_000,
  maxLoanAmount: 100_000,
  minProcessingFee: 150,
  monthlyInterestRate: 6,
  lateFeeRate: 5,
  automatedApprovals: true,
  fraudChecks: true,
  smsNotifications: true,
  maintenanceMode: false,
  quoteAiProvider: "auto",
  geminiApiKeyConfigured: false,
  geminiApiKeyMasked: "",
  openaiApiKeyConfigured: false,
  openaiApiKeyMasked: "",
};

function optionalIsoString(value?: Date): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function maskSecret(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "••••";
  return `••••••••${trimmed.slice(-4)}`;
}

export function normalizeQuoteAiProvider(value?: string | null): QuoteAiProvider {
  if (value && (QUOTE_AI_PROVIDERS as readonly string[]).includes(value)) {
    return value as QuoteAiProvider;
  }
  return DEFAULT_PLATFORM_SETTINGS.quoteAiProvider;
}

export function toPlatformSettings(doc?: PlatformSettingsRecord | null): PlatformSettings {
  if (!doc) return { ...DEFAULT_PLATFORM_SETTINGS };

  const geminiApiKey = doc.geminiApiKey?.trim() ?? "";
  const openaiApiKey = doc.openaiApiKey?.trim() ?? "";

  return {
    key: PLATFORM_SETTINGS_KEY,
    minLoanAmount: doc.minLoanAmount ?? DEFAULT_PLATFORM_SETTINGS.minLoanAmount,
    maxLoanAmount: doc.maxLoanAmount ?? DEFAULT_PLATFORM_SETTINGS.maxLoanAmount,
    minProcessingFee: doc.minProcessingFee ?? DEFAULT_PLATFORM_SETTINGS.minProcessingFee,
    monthlyInterestRate: doc.monthlyInterestRate ?? DEFAULT_PLATFORM_SETTINGS.monthlyInterestRate,
    lateFeeRate: doc.lateFeeRate ?? DEFAULT_PLATFORM_SETTINGS.lateFeeRate,
    automatedApprovals: doc.automatedApprovals ?? DEFAULT_PLATFORM_SETTINGS.automatedApprovals,
    fraudChecks: doc.fraudChecks ?? DEFAULT_PLATFORM_SETTINGS.fraudChecks,
    smsNotifications: doc.smsNotifications ?? DEFAULT_PLATFORM_SETTINGS.smsNotifications,
    maintenanceMode: doc.maintenanceMode ?? DEFAULT_PLATFORM_SETTINGS.maintenanceMode,
    quoteAiProvider: normalizeQuoteAiProvider(doc.quoteAiProvider),
    geminiApiKeyConfigured: Boolean(geminiApiKey),
    geminiApiKeyMasked: maskSecret(geminiApiKey),
    openaiApiKeyConfigured: Boolean(openaiApiKey),
    openaiApiKeyMasked: maskSecret(openaiApiKey),
    updatedBy: doc.updatedBy,
    createdAt: optionalIsoString(doc.createdAt),
    updatedAt: optionalIsoString(doc.updatedAt),
  };
}
