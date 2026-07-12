export type LoanStatus = "Disbursing" | "Active" | "Paid" | "Overdue" | "Defaulted";

export type RepaymentStatus = "Pending" | "Paid" | "Overdue" | "Waived";

export type RepaymentScheduleRecord = {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  principal: number;
  interest: number;
  status: RepaymentStatus;
  paidAt?: Date;
  paymentReference?: string;
};

export type RepaymentScheduleItem = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: RepaymentStatus;
  paidAt?: string;
  paymentReference?: string;
};

export type LoanRecord = {
  _id?: string;
  loanNumber: string;
  applicationNumber: string;
  clerkUserId: string;
  borrowerName: string;
  amount: number;
  interest: number;
  totalPayable: number;
  outstandingBalance: number;
  months: number;
  status: LoanStatus;
  repaymentSchedule?: RepaymentScheduleRecord[];
  disbursedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Loan = {
  id: string;
  applicationNumber: string;
  clerkUserId: string;
  borrowerName: string;
  amount: number;
  interest: number;
  totalPayable: number;
  outstandingBalance: number;
  months: number;
  status: LoanStatus;
  repaymentSchedule: RepaymentScheduleItem[];
  disbursedAt: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RepaymentRecord = {
  _id?: string;
  loanNumber: string;
  clerkUserId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: RepaymentStatus;
  paidAt?: Date;
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
};

function toIsoString(value: Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toRepaymentScheduleItem(repayment: RepaymentScheduleRecord): RepaymentScheduleItem {
  return {
    installmentNumber: repayment.installmentNumber,
    dueDate: toIsoString(repayment.dueDate),
    amount: repayment.amount,
    principal: repayment.principal,
    interest: repayment.interest,
    status: repayment.status,
    paidAt: repayment.paidAt ? toIsoString(repayment.paidAt) : undefined,
    paymentReference: repayment.paymentReference,
  };
}

export function toLoan(doc: LoanRecord): Loan {
  return {
    id: doc.loanNumber,
    applicationNumber: doc.applicationNumber,
    clerkUserId: doc.clerkUserId,
    borrowerName: doc.borrowerName,
    amount: doc.amount,
    interest: doc.interest,
    totalPayable: doc.totalPayable,
    outstandingBalance: doc.outstandingBalance,
    months: doc.months,
    status: doc.status,
    repaymentSchedule: (doc.repaymentSchedule ?? []).map(toRepaymentScheduleItem),
    disbursedAt: toIsoString(doc.disbursedAt),
    dueDate: toIsoString(doc.dueDate),
    paidAt: doc.paidAt ? toIsoString(doc.paidAt) : undefined,
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  };
}
