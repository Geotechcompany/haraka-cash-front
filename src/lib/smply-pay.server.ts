// api.smplypay.com does not resolve; SMPLY Pay serves API from the main domain.
const DEFAULT_BASE_URL = "https://smplypay.com";

const DEFAULT_PATHS = {
  /** Postman: GET /api/v1/provider-one/wallet/{walletCode}/balance */
  wallet: "/api/v1/provider-one/wallet/{projectCode}/balance",
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
  available: boolean;
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

function getProjectCode() {
  const projectCode = process.env.SMPLY_PAY_PROJECT_CODE?.trim();
  if (!projectCode) {
    throw new Error("SMPLY_PAY_PROJECT_CODE is not configured");
  }
  return projectCode;
}

/** Resolve wallet balance path; `{projectCode}` is replaced with SMPLY_PAY_PROJECT_CODE. */
export function getWalletBalancePath(projectCode = getProjectCode()) {
  const template = getApiPath("wallet");
  if (template.includes("{projectCode}")) {
    return template.replaceAll("{projectCode}", encodeURIComponent(projectCode));
  }
  // Legacy override without placeholder — append wallet code segment if it looks like the Postman base.
  if (/\/wallet\/?$/i.test(template.replace(/\/$/, ""))) {
    return `${template.replace(/\/$/, "")}/${encodeURIComponent(projectCode)}/balance`;
  }
  if (template.includes("projectCode=")) {
    return template;
  }
  const separator = template.includes("?") ? "&" : "?";
  return `${template}${separator}projectCode=${encodeURIComponent(projectCode)}`;
}

/** SMPLY Pay STK docs use local 07… numbers, not 254… */
export function toSmplyPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

export function getSmplyPayConfigSummary() {
  const key = process.env.SMPLY_PAY_API_KEY;
  const clientId = process.env.SMPLY_PAY_CLIENT_ID;
  const projectCode = process.env.SMPLY_PAY_PROJECT_CODE;
  const withdrawPath = getApiPath("withdraw");
  const walletPath = projectCode ? getWalletBalancePath(projectCode) : getApiPath("wallet");
  return {
    baseUrl: getBaseUrl(),
    apiKeySet: Boolean(key),
    apiKeyMasked: key ? maskApiKey(key) : undefined,
    clientIdSet: Boolean(clientId),
    clientIdMasked: clientId ? maskApiKey(clientId) : undefined,
    projectCode: projectCode || undefined,
    appUrl: process.env.APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:3000",
    callbackUrl: getCallbackUrl("/api/webhooks/smply-pay"),
    authStyle: getAuthStyle(),
    paths: {
      wallet: walletPath,
      stk: getApiPath("stk"),
      withdraw: withdrawPath,
    },
    stkUrl: getStkUrl(),
    withdrawUrl: `${getBaseUrl()}${withdrawPath}`,
    walletUrl: `${getBaseUrl()}${walletPath}`,
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
    const providerMessage = extractProviderErrorMessage(payload);
    const message = providerMessage ?? `SMPLY Pay request failed (${response.status})`;
    throw new Error(`${message} [${method} ${url} → HTTP ${response.status}]`);
  }

  return payload as T;
}

function extractProviderErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim().slice(0, 300);
  }
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;
  for (const key of ["message", "error", "detail", "ResponseDescription", "error_description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 300);
  }

  const nested = record.data ?? record.error;
  if (nested && typeof nested === "object") {
    return extractProviderErrorMessage(nested);
  }

  return undefined;
}

/** Brand prefix for STK `transactionId` (hyphenated — spaces return HTTP 400 from SMPLY). */
export const STK_TRANSACTION_BRAND = "HARAKA-CASH-KENYA";

/** SMPLY STK `transactionId`: branded unique string embedding the internal payment reference. */
export function toStkTransactionId(reference: string): string {
  const trimmed = reference.trim();
  if (!trimmed) {
    throw new Error("STK transactionId requires a non-empty payment reference");
  }
  if (
    trimmed.startsWith(`${STK_TRANSACTION_BRAND}-`) ||
    trimmed.startsWith("HARAKA CASH KENYA ")
  ) {
    return trimmed;
  }
  return `${STK_TRANSACTION_BRAND}-${trimmed}`;
}

/** Recover internal payment reference from a branded STK transactionId (or passthrough). */
export function fromStkTransactionId(transactionId: string): string {
  const trimmed = transactionId.trim();
  const hyphenPrefix = `${STK_TRANSACTION_BRAND}-`;
  if (trimmed.startsWith(hyphenPrefix)) {
    return trimmed.slice(hyphenPrefix.length).trim();
  }
  const spacedPrefix = "HARAKA CASH KENYA ";
  if (trimmed.startsWith(spacedPrefix)) {
    return trimmed.slice(spacedPrefix.length).trim();
  }
  return trimmed;
}

export function buildStkPushBody(input: {
  phone: string;
  amount: number;
  reference: string;
  description?: string;
  orderCode?: string;
  projectCode?: string;
}) {
  return {
    phoneNumber: toSmplyPhoneNumber(input.phone),
    amount: String(Math.round(input.amount)),
    projectCode: input.projectCode ?? getProjectCode(),
    orderCode: input.orderCode ?? "",
    transactionId: toStkTransactionId(input.reference),
  };
}

/** Postman B2C body: phoneNumber, amount, projectCode, orderCode, transactionId, remarks. */
export function buildWithdrawBody(input: {
  phone: string;
  amount: number;
  reference: string;
  remarks?: string;
  orderCode?: string;
  projectCode?: string;
}) {
  return {
    phoneNumber: toSmplyPhoneNumber(input.phone),
    amount: String(Math.round(input.amount)),
    projectCode: input.projectCode ?? getProjectCode(),
    orderCode: input.orderCode ?? "",
    transactionId: input.reference,
    remarks: input.remarks?.trim() || "withdrawal",
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
  const path = getWalletBalancePath();
  try {
    const raw = await smplyRequest<Record<string, unknown>>(path);
    const nested =
      raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : undefined;
    const balance =
      pickNumber(raw, ["balance", "available_balance", "wallet_balance", "amount"]) ??
      (nested
        ? pickNumber(nested, ["balance", "available_balance", "wallet_balance", "amount"])
        : undefined);
    if (balance === undefined) {
      return { balance: 0, currency: "KES", available: false, raw };
    }
    const currency =
      pickString(raw, ["currency", "currency_code"]) ??
      (nested ? pickString(nested, ["currency", "currency_code"]) : undefined) ??
      "KES";
    return { balance, currency, available: true, raw };
  } catch {
    return { balance: 0, currency: "KES", available: false, raw: null };
  }
}

/** Map provider B2C JSON into status + user-facing copy (never echo bare "Success"). */
export function interpretSmplyWithdrawResponse(input: {
  reference: string;
  raw: Record<string, unknown>;
}): SmplyWithdrawResult {
  const nested =
    input.raw.data && typeof input.raw.data === "object"
      ? (input.raw.data as Record<string, unknown>)
      : undefined;
  const providerRef =
    pickString(input.raw, [
      "transaction_id",
      "withdrawal_id",
      "ConversationID",
      "OriginatorConversationID",
      "order_number",
      "orderNumber",
      "id",
    ]) ??
    (nested
      ? pickString(nested, [
          "transaction_id",
          "withdrawal_id",
          "ConversationID",
          "OriginatorConversationID",
          "order_number",
          "orderNumber",
          "id",
        ])
      : undefined);

  const providerMessage = pickString(input.raw, [
    "message",
    "ResponseDescription",
    "CustomerMessage",
    "error",
  ]);
  const statusValue =
    pickString(input.raw, ["status", "state"]) ??
    (nested ? pickString(nested, ["status", "state"]) : undefined);

  const failed =
    statusValue === "failed" ||
    statusValue === "cancelled" ||
    (typeof providerMessage === "string" &&
      /insufficient|no.?funds|low.?balance|failed|error|denied/i.test(providerMessage));

  // Provider "Success" / code 1 only means the request was accepted — payout is still pending.
  const completed =
    !failed &&
    (statusValue === "completed" ||
      statusValue === "paid" ||
      (statusValue === "success" && Boolean(providerRef)));

  const status: SmplyWithdrawResult["status"] = failed
    ? "failed"
    : completed
      ? "success"
      : "pending";

  const message = failed
    ? providerMessage && !/^success$/i.test(providerMessage.trim())
      ? providerMessage
      : "Withdrawal failed. Check wallet balance and try again."
    : status === "success"
      ? "Withdrawal completed."
      : "Withdrawal submitted. Waiting for M-Pesa confirmation — this is not a paid-out confirmation.";

  return {
    reference: input.reference,
    providerRef,
    status,
    message,
    raw: input.raw,
  };
}

/** Map provider STK JSON into status + copy (never treat bare "Success" as money received). */
export function interpretSmplyStkResponse(input: {
  reference: string;
  raw: Record<string, unknown>;
  pendingMessage?: string;
}): SmplyStkPushResult {
  const nested =
    input.raw.data && typeof input.raw.data === "object"
      ? (input.raw.data as Record<string, unknown>)
      : undefined;
  const providerRef =
    pickString(input.raw, [
      "transaction_id",
      "checkout_request_id",
      "CheckoutRequestID",
      "order_number",
      "orderNumber",
      "id",
    ]) ??
    (nested
      ? pickString(nested, [
          "transaction_id",
          "checkout_request_id",
          "CheckoutRequestID",
          "order_number",
          "orderNumber",
          "id",
        ])
      : undefined);

  const providerMessage =
    pickString(input.raw, ["message", "CustomerMessage", "ResponseDescription", "error"]) ??
    (nested
      ? pickString(nested, ["message", "CustomerMessage", "ResponseDescription", "error"])
      : undefined);
  const statusValue =
    pickString(input.raw, ["status", "state"]) ??
    (nested ? pickString(nested, ["status", "state"]) : undefined);

  const failed =
    statusValue === "failed" ||
    statusValue === "cancelled" ||
    (typeof providerMessage === "string" &&
      /failed|error|denied|invalid|rejected/i.test(providerMessage) &&
      !/^success$/i.test(providerMessage.trim()));

  // Provider "Success" only means the STK prompt was accepted — payment is still pending.
  const status: SmplyStkPushResult["status"] = failed ? "failed" : "pending";

  const message = failed
    ? providerMessage && !/^success$/i.test(providerMessage.trim())
      ? providerMessage
      : "STK push failed. Check the phone number and try again."
    : (input.pendingMessage ??
      "STK prompt sent. Enter M-Pesa PIN on the phone. This is not a payment confirmation.");

  return {
    reference: input.reference,
    providerRef,
    status,
    message,
    raw: input.raw,
  };
}

export async function initiateProcessingFeeStkPush(input: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
  pendingMessage?: string;
}) {
  const raw = await smplyRequest<Record<string, unknown>>(
    getApiPath("stk"),
    {
      method: "POST",
      body: buildStkPushBody({
        phone: input.phone,
        amount: input.amount,
        reference: input.reference,
        description: input.description,
      }),
    },
    getStkUrl(),
  );

  return interpretSmplyStkResponse({
    reference: input.reference,
    raw,
    pendingMessage:
      input.pendingMessage ??
      "Enter M-Pesa PIN on your phone. We'll continue when the fee is received.",
  });
}

export async function initiateSmplyWithdrawal(input: {
  phone: string;
  amount: number;
  reference: string;
  description?: string;
}) {
  const raw = await smplyRequest<Record<string, unknown>>(getApiPath("withdraw"), {
    method: "POST",
    body: buildWithdrawBody({
      phone: input.phone,
      amount: input.amount,
      reference: input.reference,
      remarks: input.description,
    }),
  });

  return interpretSmplyWithdrawResponse({ reference: input.reference, raw });
}

export function parseSmplyWebhook(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { reference: undefined, status: "failed" as const, providerRef: undefined, reason: "Invalid callback payload" };
  }

  const data = payload as Record<string, unknown>;
  const rawReference = pickString(data, [
    "reference",
    "transactionId",
    "transaction_id",
    "account_reference",
    "AccountReference",
  ]);
  const reference = rawReference ? fromStkTransactionId(rawReference) : undefined;
  const providerRef = pickString(data, [
    "transaction_id",
    "transactionId",
    "checkout_request_id",
    "CheckoutRequestID",
    "withdrawal_id",
    "MpesaReceiptNumber",
    "orderCode",
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
