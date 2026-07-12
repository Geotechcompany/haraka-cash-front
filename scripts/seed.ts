import "dotenv/config";

import { MongoClient } from "mongodb";

import { ensureIndexes } from "../src/lib/db";
import type { ApplicationRecord } from "../src/lib/models/application";
import type { LoanRecord, RepaymentRecord } from "../src/lib/models/loan";
import type { NotificationRecord } from "../src/lib/models/notification";
import type { PaymentRecord } from "../src/lib/models/payment";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_KEY,
  type PlatformSettingsRecord,
} from "../src/lib/models/settings";
import type { SupportTicketRecord } from "../src/lib/models/support";
import type { UserRecord } from "../src/lib/models/user";
import {
  MONTHLY_LOAN_VOLUME,
  SEED_APPLICATIONS,
  SEED_NOTIFICATIONS,
  USER_LOAN_HISTORY,
} from "./seed-data";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "harakacash";

if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}
const mongoUri = uri;

async function seed() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  globalThis.__mongoClient = client;
  await ensureIndexes();

  await db.collection("applications").deleteMany({});
  await db.collection("notifications").deleteMany({});
  await db.collection("analytics").deleteMany({});
  await db.collection("loan_history").deleteMany({});
  await db.collection("audit_logs").deleteMany({});
  await db.collection("support_tickets").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("loans").deleteMany({});
  await db.collection("repayments").deleteMany({});
  await db.collection("payments").deleteMany({});
  await db.collection("settings").deleteMany({});

  const now = new Date();
  const applications: ApplicationRecord[] = SEED_APPLICATIONS.map((app, index) => ({
    applicationNumber: app.id,
    clerkUserId: `demo-user-${(index % 4) + 1}`,
    applicant: app.applicant,
    phone: app.phone,
    county: app.county,
    employer: app.employer,
    monthlyIncome: app.monthlyIncome,
    amount: app.amount,
    months: app.months,
    purpose: app.purpose,
    eligibilityScore: app.eligibilityScore,
    riskScore: app.riskScore,
    status: app.status,
    createdAt: new Date(app.createdAt),
    updatedAt: now,
  }));

  await db.collection<ApplicationRecord>("applications").insertMany(applications);

  const users: UserRecord[] = Array.from({ length: 4 }, (_, index) => ({
    clerkId: `demo-user-${index + 1}`,
    email: `borrower${index + 1}@example.test`,
    firstName: `Demo`,
    lastName: `Borrower ${index + 1}`,
    phone: `25470000000${index + 1}`,
    county: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"][index],
    status: index === 3 ? "Suspended" : "Active",
    eligibilityScore: 70 + index * 5,
    availableCredit: 50_000,
    profileComplete: 100,
    createdAt: new Date(Date.now() - (index + 1) * 86400000),
    updatedAt: now,
  }));
  await db.collection<UserRecord>("users").insertMany(users);

  const loanApplication =
    applications.find((application) => application.status === "Disbursing") ??
    applications.find((application) => application.status === "Approved") ??
    applications[0];
  const loanNumber = `LN-${loanApplication.applicationNumber}`;
  const installmentAmount = Math.round((loanApplication.amount * 1.18) / loanApplication.months);
  const repaymentSchedule = Array.from({ length: loanApplication.months }, (_, index) => ({
    installmentNumber: index + 1,
    dueDate: new Date(now.getFullYear(), now.getMonth() + index + 1, now.getDate()),
    amount: installmentAmount,
    principal: Math.round(loanApplication.amount / loanApplication.months),
    interest: Math.round((loanApplication.amount * 0.18) / loanApplication.months),
    status: index === 0 ? ("Paid" as const) : ("Pending" as const),
    paidAt: index === 0 ? now : undefined,
    paymentReference: index === 0 ? "RP-DEMO-001" : undefined,
  }));
  const loan: LoanRecord = {
    loanNumber,
    applicationNumber: loanApplication.applicationNumber,
    clerkUserId: loanApplication.clerkUserId ?? "demo-user-1",
    borrowerName: loanApplication.applicant,
    amount: loanApplication.amount,
    interest: Math.round(loanApplication.amount * 0.18),
    totalPayable: installmentAmount * loanApplication.months,
    outstandingBalance: installmentAmount * Math.max(0, loanApplication.months - 1),
    months: loanApplication.months,
    status: "Active",
    repaymentSchedule,
    disbursedAt: new Date(Date.now() - 15 * 86400000),
    dueDate: repaymentSchedule.at(-1)?.dueDate ?? now,
    createdAt: new Date(Date.now() - 16 * 86400000),
    updatedAt: now,
  };
  await db.collection<LoanRecord>("loans").insertOne(loan);

  const repayments: RepaymentRecord[] = repaymentSchedule.map((installment) => ({
    loanNumber,
    clerkUserId: loan.clerkUserId,
    installmentNumber: installment.installmentNumber,
    amount: installment.amount,
    dueDate: installment.dueDate,
    status: installment.status,
    paidAt: installment.paidAt,
    paymentReference: installment.paymentReference,
    createdAt: loan.createdAt,
    updatedAt: now,
  }));
  await db.collection<RepaymentRecord>("repayments").insertMany(repayments);

  const payments: PaymentRecord[] = [
    {
      reference: "FEE-DEMO-001",
      kind: "processing_fee",
      amount: 500,
      phone: users[0].phone ?? "",
      status: "success",
      provider: "smply_pay",
      clerkUserId: loan.clerkUserId,
      applicationNumber: loan.applicationNumber,
      createdAt: loan.createdAt,
      updatedAt: now,
    },
    {
      reference: "RP-DEMO-001",
      kind: "repayment",
      amount: installmentAmount,
      phone: users[0].phone ?? "",
      status: "success",
      provider: "smply_pay",
      clerkUserId: loan.clerkUserId,
      applicationNumber: loan.applicationNumber,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.collection<PaymentRecord>("payments").insertMany(payments);

  const ticket: SupportTicketRecord = {
    ticketNumber: "TKT-DEMO-001",
    clerkUserId: users[0].clerkId,
    subject: "Repayment confirmation",
    userName: `${users[0].firstName} ${users[0].lastName}`,
    status: "Open",
    initialMessage: "Please confirm that my latest repayment was received.",
    messages: [
      {
        id: "MSG-DEMO-001",
        author: "User",
        authorName: `${users[0].firstName} ${users[0].lastName}`,
        message: "Please confirm that my latest repayment was received.",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<SupportTicketRecord>("support_tickets").insertOne(ticket);

  const settings: PlatformSettingsRecord = {
    key: PLATFORM_SETTINGS_KEY,
    minLoanAmount: DEFAULT_PLATFORM_SETTINGS.minLoanAmount,
    maxLoanAmount: DEFAULT_PLATFORM_SETTINGS.maxLoanAmount,
    minProcessingFee: DEFAULT_PLATFORM_SETTINGS.minProcessingFee,
    monthlyInterestRate: DEFAULT_PLATFORM_SETTINGS.monthlyInterestRate,
    lateFeeRate: DEFAULT_PLATFORM_SETTINGS.lateFeeRate,
    automatedApprovals: DEFAULT_PLATFORM_SETTINGS.automatedApprovals,
    fraudChecks: DEFAULT_PLATFORM_SETTINGS.fraudChecks,
    smsNotifications: DEFAULT_PLATFORM_SETTINGS.smsNotifications,
    maintenanceMode: DEFAULT_PLATFORM_SETTINGS.maintenanceMode,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<PlatformSettingsRecord>("settings").insertOne(settings);

  const notifications: NotificationRecord[] = SEED_NOTIFICATIONS.map((n) => ({
    title: n.title,
    body: n.body,
    type: n.type,
    unread: n.unread,
    createdAt: new Date(Date.now() - Math.random() * 5 * 86400000),
  }));

  await db.collection<NotificationRecord>("notifications").insertMany(notifications);

  await db.collection("analytics").insertOne({
    key: "monthly_loan_volume",
    data: MONTHLY_LOAN_VOLUME,
  });

  await db.collection("loan_history").insertOne({
    clerkUserId: "__demo__",
    points: USER_LOAN_HISTORY,
  });

  await db.collection("audit_logs").insertMany(
    applications.slice(0, 8).map((app, i) => ({
      actor: ["admin@haraka.co", "system", "credit-engine"][i % 3],
      action: ["Approved loan", "Declined application", "Application received"][i % 3],
      target: app.applicationNumber,
      createdAt: new Date(Date.now() - i * 3600000),
    })),
  );

  console.log(
    `Seeded ${applications.length} applications, ${users.length} users, one loan, one ticket, and ${payments.length} payments into ${dbName}`,
  );
  await client.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
