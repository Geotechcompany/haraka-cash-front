import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  nextApplicationNumber,
  toApplication,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/models/application";
import { toUserProfile, type UserRecord } from "@/lib/models/user";
import { buildLoanQuote } from "@/lib/loan";
import { applicationStatusForReview } from "@/lib/admin-domain";
import { requireAdmin, requireUserId } from "@/server/auth";

async function ensureUser(clerkId: string) {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const existing = await db.collection<UserRecord>("users").findOne({ clerkId });
  if (existing) {
    const { ensureReferralCode } = await import("@/server/referrals");
    return ensureReferralCode(existing);
  }

  const clerk = await clerkClient();
  const profile = await clerk.users.getUser(clerkId).catch(() => null);
  const now = new Date();
  const { allocateReferralCodeForNewUser } = await import("@/server/referrals");
  const referralCode = await allocateReferralCodeForNewUser();
  const doc: UserRecord = {
    clerkId,
    email: profile?.emailAddresses[0]?.emailAddress,
    firstName: profile?.firstName ?? undefined,
    lastName: profile?.lastName ?? undefined,
    phone: profile?.phoneNumbers[0]?.phoneNumber,
    eligibilityScore: 0,
    availableCredit: 0,
    referralCode,
    referralCreditsEarned: 0,
    referralCount: 0,
    profileComplete: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<UserRecord>("users").insertOne(doc);
  return doc;
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) return null;
  const user = await ensureUser(userId);
  return toUserProfile(user);
});

const listApplicationsInput = z
  .object({
    scope: z.enum(["mine", "all"]).default("mine"),
  })
  .optional();

export const listApplications = createServerFn({ method: "GET" })
  .validator((data: unknown) => listApplicationsInput.parse(data))
  .handler(async ({ data }) => {
    const scope = data?.scope ?? "mine";
    if (scope === "all") {
      await requireAdmin();
    }

    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const filter = scope === "all" ? {} : { clerkUserId: (await auth()).userId ?? "__none__" };

    const docs = await db
      .collection<ApplicationRecord>("applications")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return docs.map(toApplication);
  });

export const getApplication = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().min(1).parse(id))
  .handler(async ({ data: applicationNumber }) => {
    const clerkUserId = await requireUserId();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const doc = await db
      .collection<ApplicationRecord>("applications")
      .findOne({ applicationNumber, clerkUserId });

    if (!doc) return null;
    return { ...toApplication(doc), quote: doc.quote ?? null };
  });

export const getAdminApplication = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().min(1).parse(id))
  .handler(async ({ data: applicationNumber }) => {
    await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const doc = await db
      .collection<ApplicationRecord>("applications")
      .findOne({ applicationNumber });
    if (!doc) return null;
    return { ...toApplication(doc), quote: doc.quote ?? null };
  });

const createApplicationInput = z.object({
  amount: z.number().positive(),
  months: z.number().int().positive(),
  purpose: z.string().min(1).default("Personal"),
  county: z.string().optional(),
  employer: z.string().optional(),
  monthlyIncome: z.number().optional(),
  quote: z.object({
    amount: z.number(),
    months: z.number(),
    fee: z.number(),
    interest: z.number(),
    totalPayable: z.number(),
    monthly: z.number(),
  }),
});

export const createApplication = createServerFn({ method: "POST" })
  .validator((data: unknown) => createApplicationInput.parse(data))
  .handler(async ({ data }) => {
    const clerkUserId = await requireUserId();
    const user = await ensureUser(clerkUserId);
    const { readPlatformSettings } = await import("@/server/settings");
    const lendingSettings = await readPlatformSettings();
    if (lendingSettings.maintenanceMode) {
      throw new Error("New applications are temporarily unavailable");
    }
    if (
      data.amount < lendingSettings.minLoanAmount ||
      data.amount > lendingSettings.maxLoanAmount
    ) {
      throw new Error(
        `Loan amount must be between KES ${lendingSettings.minLoanAmount.toLocaleString()} and KES ${lendingSettings.maxLoanAmount.toLocaleString()}`,
      );
    }
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const now = new Date();
    const count = await db.collection("applications").countDocuments();
    const applicationNumber = nextApplicationNumber(count);
    const applicant =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || "HarakaCash user";
    const quote = buildLoanQuote(data.amount, data.months, {
      monthlyInterestRatePercent: lendingSettings.monthlyInterestRate,
      minProcessingFee: lendingSettings.minProcessingFee,
    });

    const doc: ApplicationRecord = {
      applicationNumber,
      clerkUserId,
      applicant,
      phone: user.phone ?? "07xx xxx xxx",
      county: data.county ?? user.county ?? "Nairobi",
      employer: data.employer ?? "Not specified",
      monthlyIncome: data.monthlyIncome ?? 0,
      amount: data.amount,
      months: data.months,
      purpose: data.purpose,
      eligibilityScore: user.eligibilityScore,
      riskScore: 100 - user.eligibilityScore,
      status: "Pending",
      quote: {
        amount: quote.amount,
        months: quote.months,
        fee: quote.fee,
        interest: quote.interest,
        totalPayable: quote.totalPayable,
        monthly: quote.monthly,
      },
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<ApplicationRecord>("applications").insertOne(doc);
    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: applicant,
      action: "Submitted application",
      target: applicationNumber,
    });
    await db.collection("notifications").insertOne({
      clerkUserId,
      title: "Application received",
      body: `We are reviewing your application ${applicationNumber}.`,
      type: "info",
      unread: true,
      createdAt: now,
    });

    return toApplication(doc);
  });

export const runAssessment = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().min(1).parse(id))
  .handler(async ({ data: applicationNumber }) => {
    const clerkUserId = await requireUserId();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const doc = await db.collection<ApplicationRecord>("applications").findOne({
      applicationNumber,
      clerkUserId,
    });

    if (!doc) throw new Error("Application not found");

    const { readPlatformSettings } = await import("@/server/settings");
    const lendingSettings = await readPlatformSettings();
    const approved =
      lendingSettings.automatedApprovals && doc.amount <= lendingSettings.maxLoanAmount;
    const status: ApplicationStatus = approved ? "Approved" : "Declined";
    const eligibilityScore = approved
      ? Math.min(95, doc.eligibilityScore + 8)
      : Math.max(25, doc.eligibilityScore - 15);

    await db.collection<ApplicationRecord>("applications").updateOne(
      { applicationNumber },
      {
        $set: {
          status,
          eligibilityScore,
          riskScore: 100 - eligibilityScore,
          updatedAt: new Date(),
        },
      },
    );

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: "credit-engine",
      action: approved ? "Approved application" : "Declined application",
      target: applicationNumber,
    });
    await db.collection("notifications").insertOne({
      clerkUserId,
      title: approved ? "Offer ready" : "Application update",
      body: approved
        ? `Your ${doc.amount.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 })} loan has been pre-approved.`
        : `Application ${applicationNumber} was not approved at this time.`,
      type: approved ? "success" : "warning",
      unread: true,
      createdAt: new Date(),
    });

    return { applicationNumber, status, approved, eligibilityScore };
  });

const updateStatusInput = z.object({
  applicationNumber: z.string(),
  status: z.enum([
    "Pending",
    "Approved",
    "Declined",
    "Completed",
    "Disbursing",
    "DocumentsRequired",
    "UnderReview",
  ]),
});

const reviewApplicationInput = z.object({
  applicationNumber: z.string().min(1),
  action: z.enum(["approve", "decline", "requestDocuments"]),
  note: z.string().trim().max(500).optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
});

export const reviewApplication = createServerFn({ method: "POST" })
  .validator((input: unknown) => reviewApplicationInput.parse(input))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const application = await db
      .collection<ApplicationRecord>("applications")
      .findOne({ applicationNumber: data.applicationNumber });
    if (!application) throw new Error("Application not found");

    const now = new Date();

    // Fee paid + CRB queue: admin approve starts disbursement (does not re-open offer).
    if (data.action === "approve" && application.status === "UnderReview") {
      const { markApplicationDisbursing } = await import("@/server/payments");
      await db.collection<ApplicationRecord>("applications").updateOne(
        { applicationNumber: data.applicationNumber },
        {
          $set: {
            reviewedBy: adminId,
            reviewedAt: now,
            reviewNotes: data.note,
            requiredDocuments: [],
            updatedAt: now,
          },
        },
      );
      await markApplicationDisbursing(data.applicationNumber);

      const { logAuditEvent } = await import("@/server/internal/audit-events");
      await logAuditEvent({
        actor: adminId,
        action: "Cleared CRB review and started disbursement",
        target: data.applicationNumber,
      });

      return { ok: true, status: "Disbursing" as ApplicationStatus };
    }

    const status = applicationStatusForReview(data.action);
    const requiredDocuments =
      data.action === "requestDocuments"
        ? data.requiredDocuments?.length
          ? data.requiredDocuments
          : ["National ID", "Proof of income"]
        : [];

    await db.collection<ApplicationRecord>("applications").updateOne(
      { applicationNumber: data.applicationNumber },
      {
        $set: {
          status,
          reviewedBy: adminId,
          reviewedAt: now,
          reviewNotes: data.note,
          requiredDocuments,
          updatedAt: now,
        },
      },
    );

    if (application.clerkUserId) {
      const notification =
        status === "Approved"
          ? {
              title: "Loan application approved",
              body: `Your application ${data.applicationNumber} has been approved. Pay the processing fee to continue.`,
              type: "success",
            }
          : status === "Declined"
            ? {
                title: "Loan application declined",
                body:
                  data.note ||
                  `Your application ${data.applicationNumber} was not approved at this time.`,
                type: "warning",
              }
            : {
                title: "Documents required",
                body: `Please provide: ${requiredDocuments.join(", ")}.${data.note ? ` ${data.note}` : ""}`,
                type: "info",
              };
      await db.collection("notifications").insertOne({
        clerkUserId: application.clerkUserId,
        ...notification,
        unread: true,
        createdAt: now,
      });
    }

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action:
        status === "Approved"
          ? "Approved application"
          : status === "Declined"
            ? "Declined application"
            : "Requested application documents",
      target: data.applicationNumber,
    });

    return { ok: true, status };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateStatusInput.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    await db
      .collection<ApplicationRecord>("applications")
      .updateOne(
        { applicationNumber: data.applicationNumber },
        { $set: { status: data.status, updatedAt: new Date() } },
      );
    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: "admin",
      action: `Set status to ${data.status}`,
      target: data.applicationNumber,
    });
    return { ok: true };
  });
