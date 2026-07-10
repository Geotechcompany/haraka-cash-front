// api.smplypay.com does not resolve; SMPLY Pay serves API from the main domain.
const DEFAULT_BASE_URL = "https://smplypay.com";

const DEFAULT_PATHS = {
  wallet: "/v1/wallet/balance",
  stk: "/api/v1/provider-one/externalstk",
  withdraw: "/api/v1/provider-one/externalb2c",
} as const;

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

function getClientId() {
  const id = process.env.SMPLY_PAY_CLIENT_ID;
  if (!id) {
    throw new Error("SMPLY_PAY_CLIENT_ID is not configured");
  }
  return id;
}

function getAuthStyle() {
  if (process.env.SMPLY_PAY_AUTH_STYLE) {
    return process.env.SMPLY_PAY_AUTH_STYLE;
  }
  return process.env.SMPLY_PAY_CLIENT_ID ? "client-id" : "bearer";
}

function getBaseUrl() {
  return (process.env.SMPLY_PAY_API_BASE ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getApiPath(kind: keyof typeof DEFAULT_PATHS) {
  const envKey = `SMPLY_PAY_${kind.toUpperCase()}_PATH` as const;
  return process.env[envKey] ?? DEFAULT_PATHS[kind];
}

function getStkUrl() {
  const fullUrl = process.env.SMPLY_PAY_STK_URL?.trim();
  if (fullUrl) return fullUrl.replace(/\/$/, "");
  return `${getBaseUrl()}${getApiPath("stk")}`;
}

export function getSmplyAuthHeaders(): Record<string, string> {
  const key = getApiKey();
  const style = getAuthStyle();
  if (style === "client-id") {
    return { client_id: getClientId(), api_key: key };
  }
  if (style === "raw") {
    return { Authorization: key };
  }
  if (style === "api-key") {
    return { "X-API-KEY": key };
  }
  return { Authorization: `Bearer ${key}` };
}

export function maskApiKey(key: string) {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function getSmplyPayConfigSummary() {
  const key = process.env.SMPLY_PAY_API_KEY;
  const clientId = process.env.SMPLY_PAY_CLIENT_ID;
  const withdrawPath = getApiPath("withdraw");
  return {
    baseUrl: getBaseUrl(),
    apiKeySet: Boolean(key),
    apiKeyMasked: key ? maskApiKey(key) : undefined,
    clientIdSet: Boolean(clientId),
    clientIdMasked: clientId ? maskApiKey(clientId) : undefined,
    appUrl: process.env.APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:3000",
    callbackUrl: getCallbackUrl("/api/webhooks/smply-pay"),
    authStyle: getAuthStyle(),
    paths: {
      wallet: getApiPath("wallet"),
      stk: getApiPath("stk"),
      withdraw: withdrawPath,
    },
    stkUrl: getStkUrl(),
    withdrawUrl: `${getBaseUrl()}${withdrawPath}`,
  };
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

async function smplyRequest<T>(
  pathOrUrl: string,
  options: SmplyRequestOptions = {},
  requestUrl?: string,
) {
  const url = requestUrl ?? `${getBaseUrl()}${pathOrUrl}`;
  const method = options.method ?? "GET";
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...getSmplyAuthHeaders(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network error";
    throw new Error(
      `Cannot reach SMPLY Pay at ${getBaseUrl()} (${reason}). Set SMPLY_PAY_API_BASE to the URL from your SMPLY Pay dashboard.`,
    );
  }

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const providerMessage =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : undefined;
    const message =
      providerMessage ??
      `SMPLY Pay request failed (${response.status})`;
    throw new Error(
      `${message} [${method} ${url} → HTTP ${response.status}]`,
    );
  }

  return payload as T;
}

export function buildStkPushBody(input: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
  callbackUrl: string;
}) {
  const phone = normalizeKenyanPhone(input.phone);
  const amount = Math.round(input.amount);
  return {
    phone,
    PhoneNumber: phone,
    PartyA: phone,
    amount,
    Amount: amount,
    reference: input.reference,
    AccountReference: input.reference,
    description: input.description,
    TransactionDesc: input.description,
    callback_url: input.callbackUrl,
    CallBackURL: input.callbackUrl,
  };
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
  const raw = await smplyRequest<Record<string, unknown>>(getApiPath("wallet"));
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
  const callbackUrl = getCallbackUrl("/api/webhooks/smply-pay");
  const raw = await smplyRequest<Record<string, unknown>>(
    getApiPath("stk"),
    {
      method: "POST",
      body: buildStkPushBody({
        phone: input.phone,
        amount: input.amount,
        reference: input.reference,
        description: input.description,
        callbackUrl,
      }),
    },
    getStkUrl(),
  );

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
  const raw = await smplyRequest<Record<string, unknown>>(getApiPath("withdraw"), {
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
