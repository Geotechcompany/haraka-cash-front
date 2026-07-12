import { lookup } from "node:dns/promises";

import {
  buildStkPushBody,
  buildWithdrawBody,
  getSmplyAuthHeaders,
  getSmplyPayConfigSummary,
  initiateProcessingFeeStkPush,
  initiateSmplyWithdrawal,
} from "../src/lib/smply-pay.server";
import { loadProjectEnv } from "./load-env";

const envSummary = loadProjectEnv();
console.log("Env files:", envSummary.join("; "));

type CliArgs = {
  phone?: string;
  amount: number;
  dryRun: boolean;
  probe: boolean;
  withdraw: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { amount: 1, dryRun: false, probe: false, withdraw: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--probe") args.probe = true;
    else if (token === "--withdraw") args.withdraw = true;
    else if (token === "--phone") args.phone = argv[++i];
    else if (token === "--amount") args.amount = Number(argv[++i]);
    else if (token === "--help" || token === "-h") {
      console.log(`Usage: npm run debug:stk -- [options]

Options:
  --phone <number>   M-Pesa phone (e.g. 0712345678 or 254712345678)
  --amount <kes>     Amount in KES (default: 1)
  --dry-run          Print config + request preview without calling SMPLY Pay
  --withdraw         Test B2C withdrawal instead of STK push
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
    "/api/v1/provider-one/externalc2b",
    "/api/v1/provider-one/externalc2b/",
    "/api/v1/provider-one/stkpush",
    "/api/v1/provider-one/stk-push",
    "/api/v1/provider-one/lipanampesa",
    "/api/v1/provider-one/mpesa",
    "/api/v1/provider-one/c2b",
    "/v1/provider-one/externalc2b",
    "/api/v1/provider-one/externalstk",
    "/api/v1/provider-one/externalstk/",
    "/v1/provider-one/externalstk",
    "/api/v1/provider-one",
    "/api/v1/provider-one/",
    "/v1/provider-one",
    "/v1/provider-one/",
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
  const body = buildWithdrawBody({
    phone,
    amount,
    reference: `PROBE-WD-${Date.now()}`,
  });
  const found = await probeEndpoint("Withdrawal endpoint", paths, baseUrl, apiKey, body, clientId);
  if (!found) {
    fail("All probed withdrawal paths returned 404 — confirm the route with SMPLY Pay support.");
  }
}

async function probeWalletEndpoints(baseUrl: string, configuredPath: string) {
  const paths = [
    configuredPath,
    "/api/v1/provider-one/balance",
    "/api/v1/provider-one/wallet",
    "/api/v1/wallet/balance",
    "/v1/wallet/balance",
    "/v1/provider-one/balance",
    "/v1/provider-one/wallet",
  ];
  const uniquePaths = [...new Set(paths)];

  console.log("\nWallet probe (GET, client_id+api_key):");
  let found = false;
  for (const path of uniquePaths) {
    const url = `${baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        headers: {
          ...getSmplyAuthHeaders(),
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });
      const text = await response.text();
      const short = text.slice(0, 160).replace(/\s+/g, " ");
      console.log(`  ${path} → HTTP ${response.status}: ${short}`);
      if (response.status !== 404) {
        found = true;
        pass(`Non-404 wallet response for ${path}`);
      }
    } catch (error) {
      console.log(
        `  ${path} → error: ${error instanceof Error ? error.message : "request failed"}`,
      );
    }
  }
  if (!found) {
    fail("All probed wallet paths returned 404 — set SMPLY_PAY_WALLET_PATH from SMPLY Pay support.");
  }
  return found;
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
  info("Project code", config.projectCode ?? "(not set)");
  info("App URL", config.appUrl);
  info("Callback URL", config.callbackUrl);
  info("STK path", config.paths.stk);
  info("STK URL", config.stkUrl);
  info("Withdraw path", config.paths.withdraw);
  info("Withdraw URL", config.withdrawUrl);
  info("Auth style", config.authStyle);
  info("Wallet path", config.paths.wallet);
  console.log();

  if (!config.projectCode) {
    fail("SMPLY_PAY_PROJECT_CODE is not set (wallet project code, e.g. WLT-CD-1MRWANZ)");
    return;
  }

  const hostname = new URL(config.baseUrl).hostname;
  const dnsOk = await testDns(hostname);
  if (!dnsOk) return;

  await testHttpsReachable(config.baseUrl);
  if (config.authStyle === "client-id" && !config.clientIdSet) {
    console.log("\nSkipping wallet probe — set SMPLY_PAY_CLIENT_ID for client-id auth.");
  } else {
    await probeWalletEndpoints(config.baseUrl, config.paths.wallet);
  }

  const phone = args.phone ?? "0700000000";
  const reference = `DEBUG-${Date.now()}`;
  const requestBody = args.withdraw
    ? buildWithdrawBody({ phone, amount: args.amount, reference })
    : buildStkPushBody({ phone, amount: args.amount, reference });

  console.log(
    `\n${args.withdraw ? "B2C withdraw" : "STK push"} target: POST ${
      args.withdraw ? config.withdrawUrl : config.stkUrl
    }`,
  );
  console.log("Request body:", JSON.stringify(requestBody, null, 2));

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
    pass(`Dry run — no ${args.withdraw ? "B2C" : "STK"} request sent`);
    console.log("\nTo send a real test:");
    console.log("  npm run debug:stk -- --phone 0712345678 --amount 1");
    console.log("  npm run debug:stk -- --withdraw --phone 0712345678 --amount 1");
    console.log("\nWarning: --withdraw moves real wallet funds if the API accepts the request.");
    return;
  }

  if (!args.phone) {
    fail(
      `Pass --phone to send a real ${args.withdraw ? "B2C withdrawal" : "STK push"}, or use --dry-run to preview only.`,
    );
    return;
  }

  if (args.withdraw) {
    console.log("\nSending B2C withdrawal (real money if wallet has balance)...");
    console.log("  Note: wallet balance Ksh 0 will often still return HTTP 500 from the provider.");
    try {
      const result = await initiateSmplyWithdrawal({
        phone,
        amount: args.amount,
        reference,
        description: "HarakaCash B2C debug",
      });
      pass(`B2C withdrawal accepted (status: ${result.status})`);
      if (result.message) info("Provider message", result.message);
      if (result.providerRef) info("Provider ref", result.providerRef);
      console.log("\nRaw response:", JSON.stringify(result.raw, null, 2).slice(0, 500));
    } catch (error) {
      fail(error instanceof Error ? error.message : "B2C withdrawal failed");
    }
    return;
  }

  console.log("\nSending STK push...");
  try {
    const result = await initiateProcessingFeeStkPush({
      phone,
      amount: args.amount,
      reference,
      description: "HarakaCash STK debug",
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
