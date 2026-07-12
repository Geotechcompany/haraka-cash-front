/**
 * One-off live probe of HarakaCash AI loan assessment.
 * Usage: npx tsx scripts/debug-assessment-ai.ts
 *        npx tsx scripts/debug-assessment-ai.ts --provider=nvidia
 *
 * Never prints full API keys — only presence, length, and last 4 chars.
 */
import { loadProjectEnv } from "./load-env";

const envSummary = loadProjectEnv();
console.log("Env files:", envSummary.join("; "));

type ProbeLabel = "gemini" | "openai" | "nvidia";
type ProviderArg = "auto" | "gemini" | "openai" | "nvidia" | "off";

function parseProviderArg(): ProviderArg | undefined {
  const raw = process.argv.find((arg) => arg.startsWith("--provider="));
  if (!raw) return undefined;
  const value = raw.slice("--provider=".length) as ProviderArg;
  if (["auto", "gemini", "openai", "nvidia", "off"].includes(value)) return value;
  console.error(`Unknown --provider=${value}. Use auto|gemini|openai|nvidia|off`);
  process.exit(1);
}

function keyReport(name: string, value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    console.log(`  ${name}: not set`);
    return;
  }
  console.log(`  ${name}: set, length ${trimmed.length}, last4 …${trimmed.slice(-4)}`);
}

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/sk-[a-zA-Z0-9_-]+/g, "sk-***")
    .replace(/nvapi-[a-zA-Z0-9_-]+/g, "nvapi-***")
    .replace(/AIza[a-zA-Z0-9_-]+/g, "AIza***")
    .replace(/key[=:]\s*[^\s&]+/gi, "key=***");
}

function sampleInput(policy: {
  minLoanAmount: number;
  maxLoanAmount: number;
  minProcessingFee: number;
  monthlyInterestRate: number;
  automatedApprovals: boolean;
}) {
  const amount = Math.min(
    Math.max(25_000, policy.minLoanAmount),
    policy.maxLoanAmount,
  );
  return {
    applicant: "Jane Wanjiku Otieno",
    phone: "0712345678",
    mpesaNumber: "254712345678",
    county: "Nairobi",
    employer: "Safaricom PLC",
    employmentStatus: "employed" as const,
    jobTitle: "Customer Care Agent",
    yearsAtEmployer: 3,
    monthlyIncome: 85_000,
    monthlyExpenses: 42_000,
    existingLoans: 8_500,
    amount,
    months: 6,
    purpose: "School fees",
    baselineEligibilityScore: 72,
    minLoanAmount: policy.minLoanAmount,
    maxLoanAmount: policy.maxLoanAmount,
    minProcessingFee: policy.minProcessingFee,
    monthlyInterestRate: policy.monthlyInterestRate,
    automatedApprovals: policy.automatedApprovals,
    quoteMonthly: Math.round((amount * (1 + (policy.monthlyInterestRate / 100) * 6)) / 6),
  };
}

async function probeProvider(label: ProbeLabel) {
  const {
    generateJsonWithGemini,
    generateJsonWithOpenAi,
    generateJsonWithNvidia,
    DEFAULT_NVIDIA_BASE_URL,
    DEFAULT_NVIDIA_MODEL,
  } = await import("../src/server/ai-provider.server");
  const prompt =
    'Return ONLY JSON: {"ok":true,"provider":"' + label + '","ping":1}';
  try {
    let text: string | null = null;
    if (label === "gemini") {
      text = await generateJsonWithGemini({ prompt, temperature: 0 });
    } else if (label === "openai") {
      text = await generateJsonWithOpenAi({
        system: "Return only valid JSON.",
        prompt,
        temperature: 0,
      });
    } else {
      const base =
        process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_NVIDIA_BASE_URL;
      const model = process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
      console.log(`  nvidia config: base=${base} model=${model}`);
      text = await generateJsonWithNvidia({
        system: "Return only valid JSON.",
        prompt,
        temperature: 0,
        maxTokens: 64,
      });
    }
    if (!text) {
      console.log(`  ${label} probe: skipped (no API key resolved)`);
      return { ok: false as const, reason: "no_key" };
    }
    console.log(`  ${label} probe: ok (${text.slice(0, 80).replace(/\s+/g, " ")}…)`);
    return { ok: true as const };
  } catch (error) {
    console.log(`  ${label} probe: FAILED — ${sanitizeError(error)}`);
    return { ok: false as const, reason: sanitizeError(error) };
  }
}

async function main() {
  const forcedProvider = parseProviderArg();

  console.log("\n=== Env API keys ===");
  keyReport("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
  keyReport("GOOGLE_GENERATIVE_AI_API_KEY", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  keyReport("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  keyReport("NVIDIA_API_KEY", process.env.NVIDIA_API_KEY);
  keyReport("NVIDIA_BASE_URL", process.env.NVIDIA_BASE_URL);
  keyReport("NVIDIA_MODEL", process.env.NVIDIA_MODEL);

  const {
    resolveGeminiApiKey,
    resolveOpenAiApiKey,
    resolveNvidiaApiKey,
    readPlatformSettings,
  } = await import("../src/server/settings");

  let adminGemini = false;
  let adminOpenAi = false;
  let adminNvidia = false;
  let quoteAiProvider: ProviderArg = "auto";
  let policy = {
    minLoanAmount: 1_000,
    maxLoanAmount: 100_000,
    minProcessingFee: 150,
    monthlyInterestRate: 6,
    automatedApprovals: true,
  };

  try {
    const settings = await readPlatformSettings();
    quoteAiProvider = settings.quoteAiProvider;
    policy = {
      minLoanAmount: settings.minLoanAmount,
      maxLoanAmount: settings.maxLoanAmount,
      minProcessingFee: settings.minProcessingFee,
      monthlyInterestRate: settings.monthlyInterestRate,
      automatedApprovals: settings.automatedApprovals,
    };
    adminGemini = settings.geminiApiKeyConfigured;
    adminOpenAi = settings.openaiApiKeyConfigured;
    adminNvidia = settings.nvidiaApiKeyConfigured;
    console.log("\n=== Platform settings (DB) ===");
    console.log(`  quoteAiProvider: ${quoteAiProvider}`);
    console.log(`  admin Gemini key configured: ${adminGemini}`);
    console.log(`  admin OpenAI key configured: ${adminOpenAi}`);
    console.log(`  admin NVIDIA key configured: ${adminNvidia}`);
    console.log(
      `  loan band: ${policy.minLoanAmount}–${policy.maxLoanAmount} KES, auto=${policy.automatedApprovals}`,
    );
  } catch (error) {
    console.log("\n=== Platform settings (DB) ===");
    console.log(`  unavailable — ${sanitizeError(error)}`);
    console.log("  using DEFAULT_PLATFORM_SETTINGS for sample payload");
  }

  if (forcedProvider) {
    quoteAiProvider = forcedProvider;
    console.log(`\n=== Forced provider (--provider=${forcedProvider}) ===`);
  }

  const geminiResolved = await resolveGeminiApiKey().catch(() => "");
  const openaiResolved = await resolveOpenAiApiKey().catch(() => "");
  const nvidiaResolved = await resolveNvidiaApiKey().catch(() => "");
  console.log("\n=== Resolved keys (admin → env) ===");
  keyReport("Gemini (resolved)", geminiResolved || undefined);
  keyReport("OpenAI (resolved)", openaiResolved || undefined);
  keyReport("NVIDIA (resolved)", nvidiaResolved || undefined);

  console.log("\n=== Provider ping ===");
  const geminiPing = await probeProvider("gemini");
  const openaiPing = await probeProvider("openai");
  const nvidiaPing = await probeProvider("nvidia");

  const input = sampleInput(policy);
  console.log("\n=== Sample application ===");
  console.log(
    `  ${input.applicant} | ${input.phone} | ${input.county} | income ${input.monthlyIncome} | amount ${input.amount} / ${input.months}m`,
  );

  console.log("\n=== runAiAssessmentWithPolicy ===");
  console.log(`  using provider: ${quoteAiProvider}`);
  const started = Date.now();
  const { runAiAssessmentWithPolicy } = await import("../src/server/assessment-ai.server");
  const { clamped, source } = await runAiAssessmentWithPolicy(input, quoteAiProvider);
  const elapsedMs = Date.now() - started;

  console.log(`  provider/source: ${source}`);
  console.log(`  elapsed: ${elapsedMs}ms`);
  console.log(`  overallScore (eligibilityScore): ${clamped.eligibilityScore}`);
  console.log(`  eligible: ${clamped.eligible}`);
  console.log(`  decisionHint: ${clamped.decisionHint}`);
  console.log(`  approved/status: ${clamped.approved} / ${clamped.status}`);
  console.log(`  policyBlocked: ${clamped.policyBlocked}`);
  console.log(`  notes: ${clamped.notes ?? "(none)"}`);
  console.log("  steps:");
  for (const step of clamped.steps) {
    const note = step.note ? ` — ${step.note}` : "";
    console.log(`    - ${step.id}: ${step.status}${note}`);
  }

  if (source === "local") {
    console.log("\n=== Fallback note ===");
    console.log(
      `  AI returned null; used local policy. geminiPing=${geminiPing.ok ? "ok" : geminiPing.reason}; openaiPing=${openaiPing.ok ? "ok" : openaiPing.reason}; nvidiaPing=${nvidiaPing.ok ? "ok" : nvidiaPing.reason}`,
    );
  }

  const nvidiaForced = forcedProvider === "nvidia";
  if (nvidiaForced && source !== "nvidia") {
    console.log("\n=== NVIDIA assessment FAILED ===");
    console.log(`  expected source=nvidia, got ${source}`);
    console.log(`  nvidiaPing=${nvidiaPing.ok ? "ok" : nvidiaPing.reason}`);
    process.exitCode = 1;
  } else if (source === "local" && !geminiPing.ok && !openaiPing.ok && !nvidiaPing.ok) {
    process.exitCode = 1;
  }

  // Mongo client keeps the event loop alive — exit explicitly after the probe.
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error("Fatal:", sanitizeError(error));
  process.exit(1);
});
