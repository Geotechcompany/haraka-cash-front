/**
 * One-shot: list payments, optionally simulate a branded STK success webhook,
 * and reconcile pending deposits against the live SMPLY wallet (deposits only).
 *
 * Usage:
 *   npx tsx scripts/reconcile-pending-payments.ts
 *   npx tsx scripts/reconcile-pending-payments.ts --simulate DEP-1783935082861-SK4I8T
 *   npx tsx scripts/reconcile-pending-payments.ts --revert WD-1783931944247-05878I
 */
import { MongoClient } from "mongodb";

import { loadProjectEnv } from "./load-env";
import {
  getSmplyWalletBalance,
  planWalletReconcile,
} from "../src/lib/smply-pay.server";

loadProjectEnv();

type PaymentDoc = {
  reference: string;
  kind: string;
  amount: number;
  status: string;
  createdAt: Date;
  failureReason?: string;
};

async function main() {
  const simulateIdx = process.argv.indexOf("--simulate");
  const simulateRef = simulateIdx >= 0 ? process.argv[simulateIdx + 1] : undefined;
  const revertIdx = process.argv.indexOf("--revert");
  const revertRef = revertIdx >= 0 ? process.argv[revertIdx + 1] : undefined;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const dbName = process.env.MONGODB_DB ?? "harakacash";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const payments = db.collection<PaymentDoc>("payments");

  if (revertRef) {
    const result = await payments.updateOne(
      { reference: revertRef },
      {
        $set: {
          status: "pending",
          failureReason: "Reverted mistaken wallet reconcile",
          updatedAt: new Date(),
        },
      },
    );
    console.log(
      `Revert ${revertRef}: matched=${result.matchedCount} modified=${result.modifiedCount}`,
    );
  }

  if (simulateRef) {
    const appUrl = (process.env.APP_URL ?? "http://127.0.0.1:3102").replace(/\/$/, "");
    const payload = {
      transactionId: `HARAKA-CASH-KENYA-${simulateRef}`,
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      status: "success",
      MpesaReceiptNumber: `SIM-${Date.now()}`,
    };
    console.log(`Simulating webhook POST → ${appUrl}/api/webhooks/smply-pay`);
    console.log(JSON.stringify(payload));
    const response = await fetch(`${appUrl}/api/webhooks/smply-pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    console.log(`Webhook HTTP ${response.status}: ${text}`);
  }

  const wallet = await getSmplyWalletBalance();
  console.log("Wallet:", wallet.available ? `KES ${wallet.balance}` : "unavailable");

  const all = await payments.find({}).sort({ createdAt: -1 }).limit(50).toArray();
  for (const p of all.slice(0, 15)) {
    console.log(`${p.reference} | ${p.kind} | ${p.status} | ${p.amount}`);
  }

  const successfulDeposits = all
    .filter((p) => p.kind === "deposit" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const successfulWithdrawals = all
    .filter((p) => p.kind === "withdrawal" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingDeposits = all
    .filter((p) => p.kind === "deposit" && p.status === "pending")
    .map((p) => ({ reference: p.reference, amount: p.amount, createdAt: p.createdAt }));

  console.log(
    "Pending deposits:",
    pendingDeposits.map((p) => `${p.reference}=${p.amount}`).join(", ") || "(none)",
  );
  console.log(
    "Booked net (success dep − success wd):",
    successfulDeposits - successfulWithdrawals,
  );

  if (!wallet.available) {
    await client.close();
    process.exitCode = 1;
    return;
  }

  const plan = planWalletReconcile({
    walletBalance: wallet.balance,
    successfulDeposits,
    successfulWithdrawals,
    pendingDeposits,
  });
  console.log("Plan:", plan.reason, plan.markSuccess);

  if (plan.markSuccess.length > 0) {
    const now = new Date();
    const result = await payments.updateMany(
      { reference: { $in: plan.markSuccess }, status: "pending" },
      {
        $set: {
          status: "success",
          failureReason: `Reconciled from wallet balance (${plan.reason})`,
          updatedAt: now,
        },
      },
    );
    console.log(`Updated ${result.modifiedCount} payment(s) to success`);
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
