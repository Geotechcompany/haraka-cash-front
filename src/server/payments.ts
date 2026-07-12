import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ApplicationRecord } from "@/lib/models/application";
import {
  paymentReference,
  toPayment,
  type PaymentRecord,
  type PaymentStatus,
} from "@/lib/models/payment";
import { requireAdmin, requireUserId } from "@/server/auth";

export const getWalletBalance = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getSmplyWalletBalance } = await import("@/lib/smply-pay.server");
  const wallet = await getSmplyWalletBalance();
  return { balance: wallet.balance, currency: wallet.currency, raw: null };
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
  phone: z.string().min(9),
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

    const reference = paymentReference("FEE");
    const { normalizeKenyanPhone, initiateProcessingFeeStkPush } =
      await import("@/lib/smply-pay.server");
    const phone = normalizeKenyanPhone(data.phone);
    const now = new Date();

    const provider = await initiateProcessingFeeStkPush({
      phone,
      amount: fee,
      reference,
      description: `HarakaCash processing fee for ${application.applicationNumber}`,
    });

    const payment: PaymentRecord = {
      reference,
      kind: "processing_fee",
      amount: fee,
      phone,
      status: provider.status,
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

    if (provider.status === "success") {
      await markApplicationDisbursing(application.applicationNumber);
    }

    return {
      reference,
      status: provider.status,
      message: provider.message ?? "STK push sent. Check your phone to enter your M-Pesa PIN.",
    };
  });

const withdrawInput = z.object({
  phone: z.string().min(9),
  amount: z.number().positive().max(1_000_000),
});

export const initiateAdminWithdrawal = createServerFn({ method: "POST" })
  .validator((data: unknown) => withdrawInput.parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const reference = paymentReference("WD");
    const { normalizeKenyanPhone, initiateSmplyWithdrawal } =
      await import("@/lib/smply-pay.server");
    const phone = normalizeKenyanPhone(data.phone);
    const now = new Date();

    const provider = await initiateSmplyWithdrawal({
      phone,
      amount: data.amount,
      reference,
      description: "HarakaCash admin wallet withdrawal",
    });

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
      message: provider.message ?? "Withdrawal initiated to M-Pesa.",
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
    return { reference: payment.reference, status: payment.status };
  });

async function markApplicationDisbursing(applicationNumber: string) {
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
      title: "Processing fee received",
      body: `Your processing fee for ${applicationNumber} was received. Disbursement is in progress.`,
      type: "success",
      unread: true,
      createdAt: new Date(),
    });
  }
}

export async function handleSmplyPayWebhook(payload: unknown) {
  const { parseSmplyWebhook } = await import("@/lib/smply-pay.server");
  const parsed = parseSmplyWebhook(payload);
  if (!parsed.reference) return { ok: false, reason: "Missing payment reference" };

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const payment = await db.collection<PaymentRecord>("payments").findOne({
    reference: parsed.reference,
  });
  if (!payment) return { ok: false, reason: "Payment not found" };

  const status: PaymentStatus =
    parsed.status === "success"
      ? "success"
      : parsed.status === "failed"
        ? "failed"
        : payment.status;

  await db.collection<PaymentRecord>("payments").updateOne(
    { reference: payment.reference },
    {
      $set: {
        status,
        providerRef: parsed.providerRef ?? payment.providerRef,
        failureReason: parsed.reason,
        updatedAt: new Date(),
      },
    },
  );

  if (
    status === "success" &&
    payment.status !== "success" &&
    payment.kind === "processing_fee" &&
    payment.applicationNumber
  ) {
    await markApplicationDisbursing(payment.applicationNumber);
  }
  if (
    status === "success" &&
    payment.status !== "success" &&
    payment.kind === "repayment" &&
    payment.applicationNumber
  ) {
    const { applySuccessfulRepayment } = await import("@/server/loans");
    await applySuccessfulRepayment({
      applicationNumber: payment.applicationNumber,
      amount: payment.amount,
      reference: payment.reference,
    });
  }

  return { ok: true, reference: payment.reference, status };
}
