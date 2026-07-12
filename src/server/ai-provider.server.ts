/**
 * Shared Gemini / OpenAI JSON generation for quote notes and loan assessment.
 * Never import from client routes — use createServerFn wrappers only.
 */
import "@/lib/server-only";

import type { QuoteAiProvider } from "@/lib/models/settings";

export type AiProviderSource = "gemini" | "openai";

/** Default wall-clock budget for a single provider call. */
export const AI_REQUEST_TIMEOUT_MS = 12_000;

/**
 * Provider attempt order from admin `quoteAiProvider`.
 * Prefer Gemini in auto mode; always fall back to the other provider when a key exists.
 */
export function aiProviderOrder(provider: QuoteAiProvider): AiProviderSource[] {
  switch (provider) {
    case "off":
      return [];
    case "openai":
      return ["openai", "gemini"];
    case "gemini":
      return ["gemini", "openai"];
    case "auto":
    default:
      return ["gemini", "openai"];
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
