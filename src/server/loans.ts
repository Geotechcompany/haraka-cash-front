import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ApplicationRecord } from "@/lib/models/application";
import { applyRepayment, buildRepaymentSchedule } from "@/lib/admin-domain";
import { toLoan, type LoanRecord, type RepaymentRecord } from "@/lib/models/loan";
import { paymentReference, type PaymentRecord } from "@/lib/models/payment";
import { requireAdmin } from "@/server/auth";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function ensureLoanForApplication(applicationNumber: string) {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const application = await db
    .collection<ApplicationRecord>("applications")
    .findOne({ applicationNumber });
  if (!application?.clerkUserId) throw new Error("Application borrower is missing");

  const existing = await db.collection<LoanRecord>("loans").findOne({ applicationNumber });
  if (existing) return existing;

  const now = new Date();
  const interest =
    application.quote?.interest ?? Math.round(application.amount * 0.06 * application.months);
  const totalPayable = application.quote?.totalPayable ?? application.amount + interest;
  const loanNumber = `LN-${application.applicationNumber}`;
  const loan: LoanRecord = {
    loanNumber,
    applicationNumber,
    clerkUserId: application.clerkUserId,
    borrowerName: application.applicant,
    amount: application.amount,
    interest,
    totalPayable,
    outstandingBalance: totalPayable,
    months: application.months,
    status: "Disbursing",
    repaymentSchedule: buildRepaymentSchedule({
      totalPayable,
      amount: application.amount,
      interest,
      months: application.months,
      startDate: now,
    }),
    disbursedAt: now,
    dueDate: addMonths(now, application.months),
    createdAt: now,
    updatedAt: now,
  };

  await db
    .collection<LoanRecord>("loans")
    .updateOne({ applicationNumber }, { $setOnInsert: loan }, { upsert: true });
  if (loan.repaymentSchedule?.length) {
    await db.collection<RepaymentRecord>("repayments").bulkWrite(
      loan.repaymentSchedule.map((installment) => ({
        updateOne: {
          filter: {
            loanNumber,
            installmentNumber: installment.installmentNumber,
          },
          update: {
            $setOnInsert: {
              loanNumber,
              clerkUserId: application.clerkUserId,
              installmentNumber: installment.installmentNumber,
              amount: installment.amount,
              dueDate: installment.dueDate,
              status: installment.status,
              createdAt: now,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  return (await db.collection<LoanRecord>("loans").findOne({ applicationNumber })) ?? loan;
}

export async function applySuccessfulRepayment({
  applicationNumber,
  amount,
  reference,
}: {
  applicationNumber: string;
  amount: number;
  reference: string;
}) {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const loan = await db.collection<LoanRecord>("loans").findOne({ applicationNumber });
  if (!loan) throw new Error("Loan not found for repayment");
  if (loan.repaymentSchedule?.some((item) => item.paymentReference === reference)) return loan;

  const now = new Date();
  const repayment = applyRepayment({
    outstandingBalance: loan.outstandingBalance,
    amount,
    schedule: loan.repaymentSchedule ?? [],
    reference,
    paidAt: now,
  });

  await Promise.all([
    db.collection<LoanRecord>("loans").updateOne(
      { loanNumber: loan.loanNumber },
      {
        $set: {
          outstandingBalance: repayment.outstandingBalance,
          repaymentSchedule: repayment.repaymentSchedule,
          status: repayment.status,
          paidAt: repayment.status === "Paid" ? now : loan.paidAt,
          updatedAt: now,
        },
      },
    ),
    repayment.paidInstallments.length
      ? db.collection<RepaymentRecord>("repayments").updateMany(
          {
            loanNumber: loan.loanNumber,
            installmentNumber: { $in: repayment.paidInstallments },
          },
          {
            $set: {
              status: "Paid",
              paidAt: now,
              paymentReference: reference,
              updatedAt: now,
            },
          },
        )
      : Promise.resolve(),
    repayment.status === "Paid"
      ? db
          .collection<ApplicationRecord>("applications")
          .updateOne({ applicationNumber }, { $set: { status: "Completed", updatedAt: now } })
      : Promise.resolve(),
  ]);

  return {
    ...loan,
    outstandingBalance: repayment.outstandingBalance,
    repaymentSchedule: repayment.repaymentSchedule,
    status: repayment.status,
    updatedAt: now,
  };
}

async function refreshOverdueLoans() {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const now = new Date();
  await db
    .collection<LoanRecord>("loans")
    .updateMany(
      { status: "Active", dueDate: { $lt: now }, outstandingBalance: { $gt: 0 } },
      { $set: { status: "Overdue", updatedAt: now } },
    );
  await db.collection<LoanRecord>("loans").updateMany(
    {
      status: { $in: ["Active", "Overdue"] },
      "repaymentSchedule.dueDate": { $lt: now },
      "repaymentSchedule.status": "Pending",
    },
    {
      $set: {
        "repaymentSchedule.$[installment].status": "Overdue",
        updatedAt: now,
      },
    },
    {
      arrayFilters: [{ "installment.status": "Pending", "installment.dueDate": { $lt: now } }],
    },
  );
}

export const getAdminLoanPortfolio = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  await refreshOverdueLoans();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const loans = await db.collection<LoanRecord>("loans").find({}).sort({ createdAt: -1 }).toArray();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const activeLoans = loans.filter((loan) =>
    ["Disbursing", "Active", "Overdue"].includes(loan.status),
  );

  return {
    stats: {
      outstanding: activeLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0),
      disbursedToday: loans
        .filter((loan) => loan.disbursedAt >= startOfToday)
        .reduce((sum, loan) => sum + loan.amount, 0),
      overdue: loans
        .filter((loan) => loan.status === "Overdue")
        .reduce((sum, loan) => sum + loan.outstandingBalance, 0),
      avgTenureMonths: loans.length
        ? Math.round((loans.reduce((sum, loan) => sum + loan.months, 0) / loans.length) * 10) / 10
        : 0,
    },
    loans: loans.map(toLoan),
  };
});

const loanNumberInput = z.string().min(1);

export const markLoanDisbursed = createServerFn({ method: "POST" })
  .validator((input: unknown) => loanNumberInput.parse(input))
  .handler(async ({ data: loanNumber }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const now = new Date();
    const loan = await db.collection<LoanRecord>("loans").findOne({ loanNumber });
    if (!loan) throw new Error("Loan not found");

    await Promise.all([
      db.collection<LoanRecord>("loans").updateOne(
        { loanNumber },
        {
          $set: {
            status: "Active",
            disbursedAt: now,
            dueDate: addMonths(now, loan.months),
            updatedAt: now,
          },
        },
      ),
      db
        .collection<ApplicationRecord>("applications")
        .updateOne(
          { applicationNumber: loan.applicationNumber },
          { $set: { status: "Disbursing", updatedAt: now } },
        ),
      db.collection<PaymentRecord>("payments").updateOne(
        { reference: `DIS-${loan.loanNumber}` },
        {
          $setOnInsert: {
            reference: `DIS-${loan.loanNumber}`,
            kind: "disbursement",
            amount: loan.amount,
            phone: "",
            status: "success",
            provider: "smply_pay",
            clerkUserId: loan.clerkUserId,
            applicationNumber: loan.applicationNumber,
            description: `Loan disbursement for ${loan.loanNumber}`,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      ),
    ]);

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({ actor: adminId, action: "Marked loan disbursed", target: loanNumber });
    return { ok: true };
  });

const recordRepaymentInput = z.object({
  loanNumber: z.string().min(1),
  amount: z.number().positive(),
  reference: z.string().trim().min(1).max(100).optional(),
});

export const recordLoanRepayment = createServerFn({ method: "POST" })
  .validator((input: unknown) => recordRepaymentInput.parse(input))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const loan = await db.collection<LoanRecord>("loans").findOne({ loanNumber: data.loanNumber });
    if (!loan) throw new Error("Loan not found");
    if (loan.status === "Paid") throw new Error("Loan is already paid");

    const reference = data.reference ?? paymentReference("RP");
    const existingPayment = await db.collection<PaymentRecord>("payments").findOne({ reference });
    if (existingPayment)
      return { ok: true, reference, outstandingBalance: loan.outstandingBalance };

    const now = new Date();
    const repayment = applyRepayment({
      outstandingBalance: loan.outstandingBalance,
      amount: data.amount,
      schedule: loan.repaymentSchedule ?? [],
      reference,
      paidAt: now,
    });

    await Promise.all([
      db.collection<LoanRecord>("loans").updateOne(
        { loanNumber: data.loanNumber },
        {
          $set: {
            outstandingBalance: repayment.outstandingBalance,
            status: repayment.status,
            repaymentSchedule: repayment.repaymentSchedule,
            paidAt: repayment.status === "Paid" ? now : undefined,
            updatedAt: now,
          },
        },
      ),
      db.collection<PaymentRecord>("payments").insertOne({
        reference,
        kind: "repayment",
        amount: repayment.appliedAmount,
        phone: "",
        status: "success",
        provider: "smply_pay",
        clerkUserId: loan.clerkUserId,
        applicationNumber: loan.applicationNumber,
        description: `Repayment for ${loan.loanNumber}`,
        createdAt: now,
        updatedAt: now,
      }),
      repayment.status === "Paid"
        ? db
            .collection<ApplicationRecord>("applications")
            .updateOne(
              { applicationNumber: loan.applicationNumber },
              { $set: { status: "Completed", updatedAt: now } },
            )
        : Promise.resolve(),
      repayment.paidInstallments.length
        ? db.collection<RepaymentRecord>("repayments").updateMany(
            {
              loanNumber: data.loanNumber,
              installmentNumber: { $in: repayment.paidInstallments },
            },
            {
              $set: {
                status: "Paid",
                paidAt: now,
                paymentReference: reference,
                updatedAt: now,
              },
            },
          )
        : Promise.resolve(),
    ]);

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: `Recorded repayment of KES ${repayment.appliedAmount}`,
      target: data.loanNumber,
    });
    return { ok: true, reference, outstandingBalance: repayment.outstandingBalance };
  });
