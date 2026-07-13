import { loadProjectEnv } from "./load-env";
import { getSmplyAuthHeaders, getWalletBalancePath } from "../src/lib/smply-pay.server";

loadProjectEnv({ quiet: true });

const apiKey = process.env.SMPLY_PAY_API_KEY;
const baseUrl = (process.env.SMPLY_PAY_API_BASE ?? "https://smplypay.com").replace(/\/$/, "");
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

function fail(message: string) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function pass(message: string) {
  console.log(`✓ ${message}`);
}

async function testDns(host: string) {
  const { lookup } = await import("node:dns/promises");
  try {
    await lookup(host);
    pass(`DNS resolves for ${host}`);
    return true;
  } catch {
    fail(`DNS does not resolve for ${host}`);
    return false;
  }
}

async function testWalletBalance() {
  const walletPath = getWalletBalancePath();
  console.log(`  GET ${baseUrl}${walletPath}`);
  const response = await fetch(`${baseUrl}${walletPath}`, {
    headers: {
      ...getSmplyAuthHeaders(),
      Accept: "application/json",
    },
  });
  const text = await response.text();
  console.log(`  HTTP ${response.status}: ${text.slice(0, 200)}`);
  if (response.ok) {
    pass("Wallet balance endpoint reachable");
  } else {
    fail(`Wallet balance request failed (${response.status})`);
  }
}

async function testWebhookHealth() {
  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/webhooks/smply-pay`);
  const text = await response.text();
  console.log(`  HTTP ${response.status}: ${text.slice(0, 200)}`);
  if (response.ok) {
    pass("Webhook health check reachable");
  } else {
    fail(`Webhook health check failed (${response.status})`);
  }
}

async function main() {
  console.log("HarakaCash M-Pesa gateway test\n");

  if (!apiKey) {
    fail("SMPLY_PAY_API_KEY is not set");
    return;
  }
  pass("SMPLY_PAY_API_KEY is set");

  const host = new URL(baseUrl).hostname;
  console.log(`\nBase URL: ${baseUrl}`);
  console.log(`App URL: ${appUrl}\n`);

  const dnsOk = await testDns(host);
  if (dnsOk) {
    console.log("\nWallet balance:");
    try {
      await testWalletBalance();
    } catch (error) {
      fail(error instanceof Error ? error.message : "Wallet balance request error");
    }
  }

  console.log("\nWebhook:");
  try {
    await testWebhookHealth();
  } catch (error) {
    fail(error instanceof Error ? error.message : "Webhook health check error");
  }

  console.log("\nDone.");
}

main();
