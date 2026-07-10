import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { resolve } from "node:path";

import {
  buildStkPushBody,
  getSmplyAuthHeaders,
  getSmplyPayConfigSummary,
  initiateProcessingFeeStkPush,
  normalizeKenyanPhone,
} from "../src/lib/smply-pay";

for (const file of [".env", ".ENV"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) loadEnv({ path, override: false });
}

type CliArgs = {
  phone?: string;
  amount: number;
  dryRun: boolean;
  probe: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { amount: 1, dryRun: false, probe: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--probe") args.probe = true;
    else if (token === "--phone") args.phone = argv[++i];
    else if (token === "--amount") args.amount = Number(argv[++i]);
    else if (token === "--help" || token === "-h") {
      console.log(`Usage: npm run debug:stk -- [options]

Options:
  --phone <number>   M-Pesa phone (e.g. 0712345678 or 254712345678)
  --amount <kes>     STK amount in KES (default: 1)
  --dry-run          Print config + request preview without calling SMPLY Pay
  --probe            Try common STK/withdraw paths and auth styles; report non-404 responses
`);
      process.exit(0);
    }
  }
  return args;
}

function fail(message: string) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function pass(message: string) {
  console.log(`✓ ${message}`);
}

function info(label: string, value: string) {
  console.log(`  ${label}: ${value}`);
}

async function testDns(hostname: string) {
  try {
    const records = await lookup(hostname);
    pass(`DNS resolves ${hostname} → ${records.address}`);
    return true;
  } catch {
    fail(`DNS does not resolve for ${hostname}`);
    console.error("  → Set SMPLY_PAY_API_BASE to the host from your SMPLY Pay dashboard.");
    console.error("  → api.smplypay.com is not a valid hostname (NXDOMAIN).");
    return false;
  }
}

async function testHttpsReachable(baseUrl: string) {
  try {
    const response = await fetch(baseUrl, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
    pass(`HTTPS reachable at ${baseUrl} (HTTP ${response.status})`);
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "connection failed";
    fail(`HTTPS unreachable at ${baseUrl} (${reason})`);
    return false;
  }
}

function buildAuthStyleVariants(apiKey: string, clientId?: string) {
  const styles: Array<{ label: string; headers: Record<string, string> }> = [];
  if (clientId) {
    styles.push({
      label: "client_id+api_key",
      headers: { client_id: clientId, api_key: apiKey },
    });
  }
  styles.push(
    { label: "Bearer", headers: { Authorization: `Bearer ${apiKey}` } },
    { label: "raw Authorization", headers: { Authorization: apiKey } },
    { label: "X-API-KEY", headers: { "X-API-KEY": apiKey } },
  );
  return styles;
}

async function probeEndpoint(
  label: string,
  paths: string[],
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
  clientId?: string,
) {
  const authStyles = buildAuthStyleVariants(apiKey, clientId);
  console.log(`\n${label} probe (POST, masked key):`);
  let found = false;
  for (const path of paths) {
    for (const auth of authStyles) {
      const url = `${baseUrl}${path}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            ...auth.headers,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
        const text = await response.text();
        const short = text.slice(0, 160).replace(/\s+/g, " ");
        console.log(`  ${auth.label} ${path} → HTTP ${response.status}: ${short}`);
        if (response.status !== 404) {
          found = true;
          pass(`Non-404 response for ${path} with ${auth.label}`);
        }
      } catch (error) {
        console.log(
          `  ${auth.label} ${path} → error: ${error instanceof Error ? error.message : "request failed"}`,
        );
      }
    }
  }
  return found;
}

async function probeStkEndpoints(
  baseUrl: string,
  apiKey: string,
  callbackUrl: string,
  phone: string,
  amount: number,
  clientId?: string,
) {
  const paths = [
    "/v1/provider-one",
    "/v1/provider-one/",
    "/api/v1/provider-one",
    "/api/v1/provider-one/",
    "/api/v1/provider_one",
    "/api/v1/stk-push/smplypay",
    "/api/v1/stk-push",
    "/api/v1/stk/push",
    "/api/v1/mpesa/stk-push",
    "/v1/stk/push",
  ];
  const body = buildStkPushBody({
    phone,
    amount,
    reference: `PROBE-${Date.now()}`,
    description: "HarakaCash STK probe",
    callbackUrl,
  });
  const found = await probeEndpoint("STK endpoint", paths, baseUrl, apiKey, body, clientId);
  if (!found) {
    fail("All probed STK paths returned 404 — confirm the route with SMPLY Pay support.");
  }
}

async function probeWithdrawEndpoints(
  baseUrl: string,
  apiKey: string,
  callbackUrl: string,
  phone: string,
  amount: number,
  clientId?: string,
) {
  const paths = [
    "/api/v1/provider-one/externalb2c",
    "/api/v1/provider-one/externalb2c/",
    "/v1/provider-one/externalb2c",
    "/v1/provider-one/externalb2c/",
    "/v1/withdraw",
    "/api/v1/withdraw",
  ];
  const body = {
    phone,
    msisdn: phone,
    amount: Math.round(amount),
    reference: `PROBE-WD-${Date.now()}`,
    description: "HarakaCash withdraw probe",
    callback_url: callbackUrl,
  };
  const found = await probeEndpoint("Withdrawal endpoint", paths, baseUrl, apiKey, body, clientId);
  if (!found) {
    fail("All probed withdrawal paths returned 404 — confirm the route with SMPLY Pay support.");
  }
}

async function testWalletEndpoint(baseUrl: string, walletPath: string) {
  const url = `${baseUrl}${walletPath}`;
  console.log(`\nWallet probe: GET ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        ...getSmplyAuthHeaders(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    console.log(`  HTTP ${response.status}: ${text.slice(0, 240)}`);
    if (response.status === 404) {
      fail("Wallet route not found — set SMPLY_PAY_WALLET_PATH to the path from SMPLY Pay docs.");
      return false;
    }
    if (response.status === 401 || response.status === 403) {
      fail("Auth rejected — verify SMPLY_PAY_API_KEY with SMPLY Pay support.");
      return false;
    }
    if (response.ok) {
      pass("Wallet endpoint responded OK");
      return true;
    }
    fail(`Wallet endpoint returned HTTP ${response.status}`);
    return false;
  } catch (error) {
    fail(error instanceof Error ? error.message : "Wallet probe failed");
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = getSmplyPayConfigSummary();
  const apiKey = process.env.SMPLY_PAY_API_KEY;

  console.log("HarakaCash STK push debug\n");

  if (!apiKey) {
    fail("SMPLY_PAY_API_KEY is not set in .env / .ENV");
    return;
  }

  console.log("Config summary:");
  info("API base", config.baseUrl);
  info("API key", config.apiKeyMasked ?? "(not set)");
  info("Client ID", config.clientIdMasked ?? (config.clientIdSet ? "(set)" : "(not set)"));
  info("App URL", config.appUrl);
  info("Callback URL", config.callbackUrl);
  info("STK path", config.paths.stk);
  info("STK URL", config.stkUrl);
  info("Withdraw path", config.paths.withdraw);
  info("Withdraw URL", config.withdrawUrl);
  info("Auth style", config.authStyle);
  info("Wallet path", config.paths.wallet);
  console.log();

  const hostname = new URL(config.baseUrl).hostname;
  const dnsOk = await testDns(hostname);
  if (!dnsOk) return;

  await testHttpsReachable(config.baseUrl);
  if (config.authStyle === "client-id" && !config.clientIdSet) {
    console.log("\nSkipping wallet probe — set SMPLY_PAY_CLIENT_ID for client-id auth.");
  } else {
    await testWalletEndpoint(config.baseUrl, config.paths.wallet);
  }

  const phone = args.phone ? normalizeKenyanPhone(args.phone) : "254700000000";
  const reference = `DEBUG-${Date.now()}`;
  const stkBody = buildStkPushBody({
    phone,
    amount: args.amount,
    reference,
    description: "HarakaCash STK debug",
    callbackUrl: config.callbackUrl,
  });

  console.log(`\nSTK push target: POST ${config.stkUrl}`);
  console.log("Request body:", JSON.stringify(stkBody, null, 2));

  if (args.probe) {
    const clientId = process.env.SMPLY_PAY_CLIENT_ID;
    if (!clientId) {
      console.log("  Note: SMPLY_PAY_CLIENT_ID not set — client_id+api_key probe skipped.");
    }
    await probeStkEndpoints(
      config.baseUrl,
      apiKey,
      config.callbackUrl,
      phone,
      args.amount,
      clientId || undefined,
    );
    await probeWithdrawEndpoints(
      config.baseUrl,
      apiKey,
      config.callbackUrl,
      phone,
      args.amount,
      clientId || undefined,
    );
    return;
  }

  if (args.dryRun) {
    pass("Dry run — no STK request sent");
    console.log("\nTo send a real test STK push:");
    console.log("  npm run debug:stk -- --phone 0712345678 --amount 1");
    return;
  }

  if (!args.phone) {
    fail("Pass --phone to send a real STK push, or use --dry-run to preview only.");
    return;
  }

  console.log("\nSending STK push...");
  try {
    const result = await initiateProcessingFeeStkPush({
      phone,
      amount: args.amount,
      reference,
      description: stkBody.description,
    });
    pass(`STK push accepted (status: ${result.status})`);
    if (result.message) info("Provider message", result.message);
    if (result.providerRef) info("Provider ref", result.providerRef);
    console.log("\nRaw response:", JSON.stringify(result.raw, null, 2).slice(0, 500));
  } catch (error) {
    const message = error instanceof Error ? error.message : "STK push failed";
    fail(message);
    if (message.includes("404") || message.includes("route")) {
      console.error("  → Set SMPLY_PAY_STK_PATH to the path SMPLY Pay gave you.");
      console.error("  → Chessbuzzer's /api/v1/stk-push/smplypay is their own backend route, not SMPLY Pay's external API.");
    }
  }
}

main();
