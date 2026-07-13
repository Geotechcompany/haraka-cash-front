import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { applicationStkPhone, type ApplicationRecord } from "@/lib/models/application";
import {
  paymentReference,
  toPayment,
  type PaymentRecord,
  type PaymentStatus,
} from "@/lib/models/payment";
import { requireAdmin, requireUserId } from "@/server/auth";

/** Confirmed processing-fee payment for an application, or null. */
export async function findSuccessfulProcessingFee(applicationNumber: string) {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  return db.collection<PaymentRecord>("payments").findOne({
    applicationNumber,
    kind: "processing_fee",
    status: "success",
  });
}

export async function requireSuccessfulProcessingFee(applicationNumber: string) {
  const payment = await findSuccessfulProcessingFee(applicationNumber);
  if (!payment) {
    throw new Error(
      "Processing fee payment has not been confirmed. The applicant must complete M-Pesa payment first.",
    );
  }
  return payment;
}

export const getWalletBalance = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getSmplyWalletBalance } = await import("@/lib/smply-pay.server");
  const wallet = await getSmplyWalletBalance();
  return {
    balance: wallet.balance,
    currency: wallet.currency,
    available: wallet.available,
    raw: null,
  };
});

export const listPaymentTransactions = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const payments = await db
    .collection<PaymentRecord>("payments")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const applicationNumbers = payments
    .map((payment) => payment.applicationNumber)
    .filter(Boolean) as string[];

  const applications = applicationNumbers.length
    ? await db
        .collection<ApplicationRecord>("applications")
        .find({ applicationNumber: { $in: applicationNumbers } })
        .toArray()
    : [];

  const applicantByApp = new Map(applications.map((app) => [app.applicationNumber, app.applicant]));

  return payments.map((payment) =>
    toPayment(
      payment,
      payment.applicationNumber ? applicantByApp.get(payment.applicationNumber) : undefined,
    ),
  );
});

const processingFeeInput = z.object({
  applicationNumber: z.string().min(1),
});

export const initiateProcessingFeePayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => processingFeeInput.parse(data))
  .handler(async ({ data }) => {
    const clerkUserId = await requireUserId();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const application = await db.collection<ApplicationRecord>("applications").findOne({
      applicationNumber: data.applicationNumber,
      clerkUserId,
    });

    if (!application) throw new Error("Application not found");
    if (application.status !== "Approved") {
      throw new Error("Application must be approved before paying the processing fee");
    }

    const fee = application.quote?.fee;
    if (!fee || fee <= 0) throw new Error("Processing fee is not available for this application");

    const stkPhone = applicationStkPhone(application);
    if (!stkPhone) {
      throw new Error(
        "No M-Pesa number on this application. Re-apply with your M-Pesa number or contact support.",
      );
    }

    const reference = paymentReference("FEE");
    const { normalizeKenyanPhone, initiateProcessingFeeStkPush } =
      await import("@/lib/smply-pay.server");
    const phone = normalizeKenyanPhone(stkPhone);
    const now = new Date();

    const provider = await initiateProcessingFeeStkPush({
      phone,
      amount: fee,
      reference,
      description: `HarakaCash processing fee for ${application.applicationNumber}`,
    });

    // Never advance on STK-sent alone — webhook / confirmed status owns UnderReview.
    const paymentStatus: PaymentStatus =
      provider.status === "failed" ? "failed" : "pending";

    const payment: PaymentRecord = {
      reference,
      kind: "processing_fee",
      amount: fee,
      phone,
      status: paymentStatus,
      provider: "smply_pay",
      providerRef: provider.providerRef,
      clerkUserId,
      applicationNumber: application.applicationNumber,
      description: `Processing fee for ${application.applicationNumber}`,
      providerResponse: provider.raw,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<PaymentRecord>("payments").insertOne(payment);

    if (paymentStatus === "failed") {
      return {
        reference,
        status: paymentStatus,
        message: provider.message ?? "STK push failed. You can try again.",
      };
    }

    return {
      reference,
      status: paymentStatus,
      message:
        "Enter M-Pesa PIN on your phone. We'll continue when the fee is received.",
    };
  });

const walletTransferInput = z.object({
  phone: z.string().min(9),
  amount: z.number().positive().max(1_000_000),
});

export const initiateAdminDeposit = createServerFn({ method: "POST" })
  .validator((data: unknown) => walletTransferInput.parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const reference = paymentReference("DEP");
    const { normalizeKenyanPhone, initiateProcessingFeeStkPush, getSmplyWalletBalance } =
      await import("@/lib/smply-pay.server");
    const phone = normalizeKenyanPhone(data.phone);
    const now = new Date();

    const provider = await initiateProcessingFeeStkPush({
      phone,
      amount: data.amount,
      reference,
      description: "HarakaCash admin wallet deposit",
      pendingMessage:
        "STK prompt sent. Enter M-Pesa PIN on the phone. This is not a deposit confirmation.",
    });

    if (provider.status === "failed") {
      throw new Error(provider.message ?? "Deposit STK push failed.");
    }

    const payment: PaymentRecord = {
      reference,
      kind: "deposit",
      amount: data.amount,
      phone,
      status: "pending",
      provider: "smply_pay",
      providerRef: provider.providerRef,
      description: "Admin wallet deposit",
      providerResponse: provider.raw,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<PaymentRecord>("payments").insertOne(payment);
    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: `Initiated deposit of KES ${data.amount}`,
      target: reference,
    });

    const wallet = await getSmplyWalletBalance();

    return {
      reference,
      status: "pending" as const,
      message:
        provider.message ??
        "STK prompt sent. Enter M-Pesa PIN on the phone. This is not a deposit confirmation.",
      walletAvailable: wallet.available,
      walletBalance: wallet.available ? wallet.balance : undefined,
    };
  });

export const initiateAdminWithdrawal = createServerFn({ method: "POST" })
  .validator((data: unknown) => walletTransferInput.parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const reference = paymentReference("WD");
    const { normalizeKenyanPhone, initiateSmplyWithdrawal, getSmplyWalletBalance } =
      await import("@/lib/smply-pay.server");
    const phone = normalizeKenyanPhone(data.phone);
    const now = new Date();

    const wallet = await getSmplyWalletBalance();
    if (wallet.available && wallet.balance < data.amount) {
      throw new Error(
        `Insufficient wallet balance (KES ${wallet.balance.toLocaleString("en-KE")} available). Fund the SMPLY Pay wallet before withdrawing.`,
      );
    }

    const provider = await initiateSmplyWithdrawal({
      phone,
      amount: data.amount,
      reference,
      description: "HarakaCash admin wallet withdrawal",
    });

    if (provider.status === "failed") {
      throw new Error(provider.message ?? "Withdrawal failed.");
    }

    const payment: PaymentRecord = {
      reference,
      kind: "withdrawal",
      amount: data.amount,
      phone,
      status: provider.status,
      provider: "smply_pay",
      providerRef: provider.providerRef,
      description: "Admin wallet withdrawal",
      providerResponse: provider.raw,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<PaymentRecord>("payments").insertOne(payment);
    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: `Initiated withdrawal of KES ${data.amount}`,
      target: reference,
    });

    return {
      reference,
      status: provider.status,
      message: provider.message ?? "Withdrawal submitted. Waiting for M-Pesa confirmation.",
      walletAvailable: wallet.available,
      walletBalance: wallet.available ? wallet.balance : undefined,
    };
  });

export const getPaymentStatus = createServerFn({ method: "GET" })
  .validator((reference: string) => z.string().min(1).parse(reference))
  .handler(async ({ data: reference }) => {
    const clerkUserId = await requireUserId();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const payment = await db.collection<PaymentRecord>("payments").findOne({
      reference,
      clerkUserId,
    });
    if (!payment) return null;

    // If webhook already marked success, ensure application moves to UnderReview.
    if (
      payment.status === "success" &&
      payment.kind === "processing_fee" &&
      payment.applicationNumber
    ) {
      await markApplicationUnderReview(payment.applicationNumber);
    }

    return { reference: payment.reference, status: payment.status };
  });

/**
 * When SMPLY never posts webhooks, align pending deposit/withdrawal rows with the
 * live wallet balance (exact gap match preferred).
 */
export const reconcilePendingWalletPayments = createServerFn({ method: "POST" }).handler(
  async () => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const { getSmplyWalletBalance, planWalletReconcile } = await import("@/lib/smply-pay.server");
    const db = await getDb();
    const wallet = await getSmplyWalletBalance();
    if (!wallet.available) {
      return {
        ok: false as const,
        updated: [] as string[],
        reason: "Wallet balance unavailable from SMPLY Pay",
        walletBalance: undefined as number | undefined,
      };
    }

    const payments = await db.collection<PaymentRecord>("payments").find({}).toArray();
    const successfulDeposits = payments
      .filter((p) => p.kind === "deposit" && p.status === "success")
      .reduce((sum, p) => sum + p.amount, 0);
    const successfulWithdrawals = payments
      .filter((p) => p.kind === "withdrawal" && p.status === "success")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingDeposits = payments
      .filter((p) => p.kind === "deposit" && p.status === "pending")
      .map((p) => ({ reference: p.reference, amount: p.amount, createdAt: p.createdAt }));

    const plan = planWalletReconcile({
      walletBalance: wallet.balance,
      successfulDeposits,
      successfulWithdrawals,
      pendingDeposits,
    });

    if (plan.markSuccess.length === 0) {
      return {
        ok: true as const,
        updated: [] as string[],
        reason: plan.reason,
        walletBalance: wallet.balance,
      };
    }

    const now = new Date();
    await db.collection<PaymentRecord>("payments").updateMany(
      { reference: { $in: plan.markSuccess }, status: "pending" },
      {
        $set: {
          status: "success",
          failureReason: `Reconciled from wallet balance (${plan.reason})`,
          updatedAt: now,
        },
      },
    );

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: `Reconciled ${plan.markSuccess.length} payment(s) from wallet`,
      target: plan.markSuccess.join(", "),
    });

    return {
      ok: true as const,
      updated: plan.markSuccess,
      reason: plan.reason,
      walletBalance: wallet.balance,
    };
  },
);

/** After processing fee success: queue for team CRB checks (do not disburse). */
export async function markApplicationUnderReview(applicationNumber: string) {
  await requireSuccessfulProcessingFee(applicationNumber);

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const application = await db
    .collection<ApplicationRecord>("applications")
    .findOne({ applicationNumber });
  if (!application) throw new Error("Application not found");

  if (application.status === "UnderReview" || application.status === "Disbursing") {
    return;
  }

  await db
    .collection<ApplicationRecord>("applications")
    .updateOne(
      { applicationNumber },
      { $set: { status: "UnderReview", updatedAt: new Date() } },
    );

  if (application.clerkUserId) {
    await db.collection("notifications").insertOne({
      clerkUserId: application.clerkUserId,
      title: "Processing fee received",
      body: `Your processing fee for ${applicationNumber} was received. Your application is with our team for CRB (credit bureau) checks. We will notify you once the review is complete.`,
      type: "info",
      unread: true,
      createdAt: new Date(),
    });
  }
}

/** After team CRB clearance: start disbursement and create the loan record. */
export async function markApplicationDisbursing(applicationNumber: string) {
  await requireSuccessfulProcessingFee(applicationNumber);

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const application = await db
    .collection<ApplicationRecord>("applications")
    .findOne({ applicationNumber });
  if (!application) throw new Error("Application not found");

  await db
    .collection<ApplicationRecord>("applications")
    .updateOne({ applicationNumber }, { $set: { status: "Disbursing", updatedAt: new Date() } });
  const { ensureLoanForApplication } = await import("@/server/loans");
  await ensureLoanForApplication(applicationNumber);

  if (application.clerkUserId && application.status !== "Disbursing") {
    await db.collection("notifications").insertOne({
      clerkUserId: application.clerkUserId,
      title: "Disbursement in progress",
      body: `CRB review for ${applicationNumber} is complete. Your loan is being disbursed to M-Pesa.`,
      type: "success",
      unread: true,
      createdAt: new Date(),
    });
  }
}

