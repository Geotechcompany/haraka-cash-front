const DEFAULT_BASE_URL = "https://api.smplypay.com";

type SmplyRequestOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export type SmplyWalletBalance = {
  balance: number;
  currency: string;
  raw: unknown;
};

export type SmplyStkPushResult = {
  reference: string;
  providerRef?: string;
  status: "pending" | "success" | "failed";
  message?: string;
  raw: unknown;
};

export type SmplyWithdrawResult = {
  reference: string;
  providerRef?: string;
  status: "pending" | "success" | "failed";
  message?: string;
  raw: unknown;
};

function getApiKey() {
  const key = process.env.SMPLY_PAY_API_KEY;
  if (!key) {
    throw new Error("SMPLY_PAY_API_KEY is not configured");
  }
  return key;
}

function getBaseUrl() {
  return process.env.SMPLY_PAY_API_BASE ?? DEFAULT_BASE_URL;
}

function getCallbackUrl(path: string) {
  const appUrl = process.env.APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}${path}`;
}

export function normalizeKenyanPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

async function smplyRequest<T>(path: string, options: SmplyRequestOptions = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `SMPLY Pay request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function pickString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function pickNumber(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

export async function getSmplyWalletBalance(): Promise<SmplyWalletBalance> {
  const raw = await smplyRequest<Record<string, unknown>>("/v1/wallet/balance");
  const balance =
    pickNumber(raw, ["balance", "available_balance", "wallet_balance", "amount"]) ?? 0;
  const currency = pickString(raw, ["currency", "currency_code"]) ?? "KES";
  return { balance, currency, raw };
}

export async function initiateProcessingFeeStkPush(input: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
}) {
  const raw = await smplyRequest<Record<string, unknown>>("/v1/stk/push", {
    method: "POST",
    body: {
      phone: normalizeKenyanPhone(input.phone),
      amount: Math.round(input.amount),
      reference: input.reference,
      description: input.description,
      callback_url: getCallbackUrl("/api/webhooks/smply-pay"),
    },
  });

  const providerRef = pickString(raw, [
    "transaction_id",
    "checkout_request_id",
    "CheckoutRequestID",
    "order_number",
    "orderNumber",
    "id",
  ]);
  const message = pickString(raw, ["message", "CustomerMessage", "ResponseDescription"]);
  const statusValue = pickString(raw, ["status", "state"]);
  const status: SmplyStkPushResult["status"] =
    statusValue === "success" || statusValue === "completed" ? "success" : "pending";

  return {
    reference: input.reference,
    providerRef,
    status,
    message,
    raw,
  } satisfies SmplyStkPushResult;
}

export async function initiateSmplyWithdrawal(input: {
  phone: string;
  amount: number;
  reference: string;
  description?: string;
}) {
  const raw = await smplyRequest<Record<string, unknown>>("/v1/withdraw", {
    method: "POST",
    body: {
      phone: normalizeKenyanPhone(input.phone),
      msisdn: normalizeKenyanPhone(input.phone),
      amount: Math.round(input.amount),
      reference: input.reference,
      description: input.description ?? "HarakaCash admin withdrawal",
      callback_url: getCallbackUrl("/api/webhooks/smply-pay"),
    },
  });

  const providerRef = pickString(raw, [
    "transaction_id",
    "withdrawal_id",
    "ConversationID",
    "OriginatorConversationID",
    "id",
  ]);
  const message = pickString(raw, ["message", "ResponseDescription"]);
  const statusValue = pickString(raw, ["status", "state"]);
  const status: SmplyWithdrawResult["status"] =
    statusValue === "success" || statusValue === "completed" ? "success" : "pending";

  return {
    reference: input.reference,
    providerRef,
    status,
    message,
    raw,
  } satisfies SmplyWithdrawResult;
}

export function parseSmplyWebhook(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { reference: undefined, status: "failed" as const, providerRef: undefined, reason: "Invalid callback payload" };
  }

  const data = payload as Record<string, unknown>;
  const reference = pickString(data, ["reference", "account_reference", "AccountReference"]);
  const providerRef = pickString(data, [
    "transaction_id",
    "checkout_request_id",
    "CheckoutRequestID",
    "withdrawal_id",
    "MpesaReceiptNumber",
    "id",
  ]);
  const resultCode = pickString(data, ["result_code", "ResultCode", "code"]);
  const statusValue = pickString(data, ["status", "state", "ResultDesc"]);
  const reason = pickString(data, ["reason", "message", "ResultDesc", "error"]);

  const success =
    resultCode === "0" ||
    statusValue === "success" ||
    statusValue === "completed" ||
    statusValue === "The service request is processed successfully.";

  const failed =
    (resultCode !== undefined && resultCode !== "0") ||
    statusValue === "failed" ||
    statusValue === "cancelled";

  return {
    reference,
    providerRef,
    status: success ? ("success" as const) : failed ? ("failed" as const) : ("pending" as const),
    reason,
  };
}
