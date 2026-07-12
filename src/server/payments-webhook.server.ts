import type { PaymentRecord, PaymentStatus } from "@/lib/models/payment";

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
