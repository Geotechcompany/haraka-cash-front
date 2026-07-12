import type { ApplicationStatus } from "@/lib/models/application";
import type { RepaymentScheduleRecord } from "@/lib/models/loan";

export type ApplicationReviewAction = "approve" | "decline" | "requestDocuments";

export function isAdminMetadata(metadata: unknown) {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "role" in metadata &&
    metadata.role === "admin"
  );
}

export function applicationStatusForReview(action: ApplicationReviewAction): ApplicationStatus {
  if (action === "approve") return "Approved";
  if (action === "decline") return "Declined";
  return "DocumentsRequired";
}

/** Post-fee statuses require a confirmed successful processing-fee payment. */
export function statusRequiresConfirmedProcessingFee(status: ApplicationStatus): boolean {
  return status === "UnderReview" || status === "Disbursing";
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function buildRepaymentSchedule({
  totalPayable,
  amount,
  interest,
  months,
  startDate,
}: {
  totalPayable: number;
  amount: number;
  interest: number;
  months: number;
  startDate: Date;
}): RepaymentScheduleRecord[] {
  const installmentAmount = Math.round(totalPayable / months);
  const principalAmount = Math.round(amount / months);
  const interestAmount = Math.round(interest / months);

  return Array.from({ length: months }, (_, index) => {
    const isLast = index === months - 1;
    return {
      installmentNumber: index + 1,
      dueDate: addMonths(startDate, index + 1),
      amount: isLast ? totalPayable - installmentAmount * (months - 1) : installmentAmount,
      principal: isLast ? amount - principalAmount * (months - 1) : principalAmount,
      interest: isLast ? interest - interestAmount * (months - 1) : interestAmount,
      status: "Pending",
    };
  });
}

export function applyRepayment({
  outstandingBalance,
  amount,
  schedule,
  reference,
  paidAt,
}: {
  outstandingBalance: number;
  amount: number;
  schedule: RepaymentScheduleRecord[];
  reference: string;
  paidAt: Date;
}) {
  const appliedAmount = Math.min(Math.round(amount), outstandingBalance);
  const nextOutstandingBalance = Math.max(0, outstandingBalance - appliedAmount);
  let unallocatedAmount = appliedAmount;
  const paidInstallments: number[] = [];
  const repaymentSchedule = schedule.map((installment) => {
    if (installment.status !== "Pending" && installment.status !== "Overdue") {
      return installment;
    }
    if (unallocatedAmount < installment.amount) return installment;
    unallocatedAmount -= installment.amount;
    paidInstallments.push(installment.installmentNumber);
    return {
      ...installment,
      status: "Paid" as const,
      paidAt,
      paymentReference: reference,
    };
  });

  return {
    appliedAmount,
    outstandingBalance: nextOutstandingBalance,
    status: nextOutstandingBalance === 0 ? ("Paid" as const) : ("Active" as const),
    repaymentSchedule,
    paidInstallments,
  };
}
