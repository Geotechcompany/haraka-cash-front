export const PLATFORM_SETTINGS_KEY = "platform-lending" as const;

export type PlatformSettingsRecord = {
  _id?: string;
  key: typeof PLATFORM_SETTINGS_KEY;
  minLoanAmount?: number;
  maxLoanAmount?: number;
  monthlyInterestRate?: number;
  lateFeeRate?: number;
  automatedApprovals?: boolean;
  fraudChecks?: boolean;
  smsNotifications?: boolean;
  maintenanceMode?: boolean;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PlatformSettings = {
  key: typeof PLATFORM_SETTINGS_KEY;
  minLoanAmount: number;
  maxLoanAmount: number;
  monthlyInterestRate: number;
  lateFeeRate: number;
  automatedApprovals: boolean;
  fraudChecks: boolean;
  smsNotifications: boolean;
  maintenanceMode: boolean;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  key: PLATFORM_SETTINGS_KEY,
  minLoanAmount: 1_000,
  maxLoanAmount: 100_000,
  monthlyInterestRate: 6,
  lateFeeRate: 5,
  automatedApprovals: true,
  fraudChecks: true,
  smsNotifications: true,
  maintenanceMode: false,
};

function optionalIsoString(value?: Date): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function toPlatformSettings(doc?: PlatformSettingsRecord | null): PlatformSettings {
  if (!doc) return { ...DEFAULT_PLATFORM_SETTINGS };

  return {
    key: PLATFORM_SETTINGS_KEY,
    minLoanAmount: doc.minLoanAmount ?? DEFAULT_PLATFORM_SETTINGS.minLoanAmount,
    maxLoanAmount: doc.maxLoanAmount ?? DEFAULT_PLATFORM_SETTINGS.maxLoanAmount,
    monthlyInterestRate: doc.monthlyInterestRate ?? DEFAULT_PLATFORM_SETTINGS.monthlyInterestRate,
    lateFeeRate: doc.lateFeeRate ?? DEFAULT_PLATFORM_SETTINGS.lateFeeRate,
    automatedApprovals: doc.automatedApprovals ?? DEFAULT_PLATFORM_SETTINGS.automatedApprovals,
    fraudChecks: doc.fraudChecks ?? DEFAULT_PLATFORM_SETTINGS.fraudChecks,
    smsNotifications: doc.smsNotifications ?? DEFAULT_PLATFORM_SETTINGS.smsNotifications,
    maintenanceMode: doc.maintenanceMode ?? DEFAULT_PLATFORM_SETTINGS.maintenanceMode,
    updatedBy: doc.updatedBy,
    createdAt: optionalIsoString(doc.createdAt),
    updatedAt: optionalIsoString(doc.updatedAt),
  };
}
