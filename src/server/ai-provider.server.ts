/**
 * Shared Gemini / OpenAI / NVIDIA JSON generation for quote notes and loan assessment.
 * Never import from client routes — use createServerFn wrappers only.
 */
import "@/lib/server-only";

import type { QuoteAiProvider } from "@/lib/models/settings";

export type AiProviderSource = "gemini" | "openai" | "nvidia";

/** Default wall-clock budget for a single provider call. */
export const AI_REQUEST_TIMEOUT_MS = 12_000;

export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL = "meta/llama-3.1-8b-instruct";

/**
 * Provider attempt order from admin `quoteAiProvider`.
 *
 * Auto: Gemini → OpenAI → NVIDIA (first key that works wins).
 * Explicit pick: try that provider first, then the remaining two in auto order.
 */
export function aiProviderOrder(provider: QuoteAiProvider): AiProviderSource[] {
  const auto: AiProviderSource[] = ["gemini", "openai", "nvidia"];
  switch (provider) {
    case "off":
      return [];
    case "openai":
      return ["openai", "gemini", "nvidia"];
    case "nvidia":
      return ["nvidia", "gemini", "openai"];
    case "gemini":
      return ["gemini", "openai", "nvidia"];
    case "auto":
    default:
      return auto;
  }
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "AI request",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateJsonWithGemini(options: {
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const { resolveGeminiApiKey } = await import("@/server/settings");
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey) return null;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      responseMimeType: "application/json",
    },
  });

  const result = await withTimeout(
    model.generateContent(options.prompt),
    options.timeoutMs ?? AI_REQUEST_TIMEOUT_MS,
    "Gemini",
  );
  return result.response.text();
}

export async function generateJsonWithOpenAi(options: {
  system: string;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const { resolveOpenAiApiKey } = await import("@/server/settings");
  const apiKey = await resolveOpenAiApiKey();
  if (!apiKey) return null;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const completion = await withTimeout(
    client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: options.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
    }),
    options.timeoutMs ?? AI_REQUEST_TIMEOUT_MS,
    "OpenAI",
  );

  return completion.choices[0]?.message?.content ?? null;
}

/**
 * NVIDIA NIM OpenAI-compatible chat completions.
 * Base URL / model: NVIDIA_BASE_URL, NVIDIA_MODEL env (with defaults).
 * Does not use response_format — many NIM models reject json_object mode.
 */
export async function generateJsonWithNvidia(options: {
  system: string;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<string | null> {
  const { resolveNvidiaApiKey } = await import("@/server/settings");
  const apiKey = await resolveNvidiaApiKey();
  if (!apiKey) return null;

  const baseURL =
    process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_NVIDIA_BASE_URL;
  const model = process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey, baseURL });

  const completion = await withTimeout(
    client.chat.completions.create({
      model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
      messages: [
        {
          role: "system",
          content: `${options.system} Respond with a single JSON object only. No markdown fences.`,
        },
        { role: "user", content: options.prompt },
      ],
    }),
    options.timeoutMs ?? 25_000,
    "NVIDIA",
  );

  return completion.choices[0]?.message?.content ?? null;
}
