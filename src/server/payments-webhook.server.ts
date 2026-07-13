import type { PaymentRecord, PaymentStatus } from "@/lib/models/payment";

async function findPaymentForWebhook(input: {
  reference?: string;
  providerRef?: string;
}) {
  const { getDb } = await import("@/lib/db");
  const { toStkTransactionId } = await import("@/lib/smply-pay.server");
  const db = await getDb();
  const payments = db.collection<PaymentRecord>("payments");

  if (input.reference) {
    const branded = toStkTransactionId(input.reference);
    const byReference = await payments.findOne({
      reference: { $in: [input.reference, branded] },
    });
    if (byReference) return byReference;
  }

  if (input.providerRef) {
    const byProvider = await payments.findOne({ providerRef: input.providerRef });
    if (byProvider) return byProvider;
  }

  return null;
}

export async function handleSmplyPayWebhook(payload: unknown) {
  const { parseSmplyWebhook } = await import("@/lib/smply-pay.server");
  const parsed = parseSmplyWebhook(payload);
  if (!parsed.reference && !parsed.providerRef) {
    return { ok: false, reason: "Missing payment reference" };
  }

  const payment = await findPaymentForWebhook({
    reference: parsed.reference,
    providerRef: parsed.providerRef,
  });
  if (!payment) {
    return {
      ok: false,
      reason: "Payment not found",
      reference: parsed.reference,
      providerRef: parsed.providerRef,
    };
  }

  const status: PaymentStatus =
    parsed.status === "success"
      ? "success"
      : parsed.status === "failed"
        ? "failed"
        : payment.status;

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
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
    const { markApplicationUnderReview } = await import("@/server/payments");
    await markApplicationUnderReview(payment.applicationNumber);
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
