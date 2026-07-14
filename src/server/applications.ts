import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  APPLICATION_STATUSES_BLOCKING_NEW_APPLY,
  nextApplicationNumber,
  toApplication,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/models/application";
import {
  toApplicationDraft,
  type ApplicationDraftRecord,
} from "@/lib/models/application-draft";
import { normalizeDraftPayload } from "@/lib/application-draft";
import { clampRepaymentMonths, MAX_REPAYMENT_MONTHS } from "@/lib/lending-products";
import {
  computeProfileComplete,
  splitFullName,
  toUserProfile,
  type UserRecord,
} from "@/lib/models/user";
import { buildLoanQuote } from "@/lib/loan";
import { isValidKenyanNationalId, isValidKenyanPhone } from "@/lib/kenya-format";
import { applicationStatusForReview, statusRequiresConfirmedProcessingFee } from "@/lib/admin-domain";
import { requireAdmin, requireUserId } from "@/server/auth";

/** Application numbers with a confirmed successful processing-fee payment. */
async function successfulProcessingFeeNumbers(applicationNumbers: string[]) {
  if (applicationNumbers.length === 0) return new Set<string>();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const payments = await db
    .collection("payments")
    .find({
      kind: "processing_fee",
      status: "success",
      applicationNumber: { $in: applicationNumbers },
    })
    .project({ applicationNumber: 1 })
    .toArray();
  return new Set(
    payments
      .map((payment) => payment.applicationNumber)
      .filter((value): value is string => Boolean(value)),
  );
}

/**
 * Approved without a confirmed fee → AdditionalActionRequired.
 * Approved with a confirmed fee → UnderReview (fee path should already have done this).
 */
async function reconcileFeeGateStatuses(
  docs: ApplicationRecord[],
  paidNumbers: Set<string>,
) {
  const now = new Date();
  const needsAction = docs.filter(
    (doc) => doc.status === "Approved" && !paidNumbers.has(doc.applicationNumber),
  );
  const needsUnderReview = docs.filter(
    (doc) => doc.status === "Approved" && paidNumbers.has(doc.applicationNumber),
  );

  if (needsAction.length === 0 && needsUnderReview.length === 0) return docs;

  const { getDb } = await import("@/lib/db");
  const db = await getDb();

  if (needsAction.length > 0) {
    const numbers = needsAction.map((doc) => doc.applicationNumber);
    await db.collection<ApplicationRecord>("applications").updateMany(
      { applicationNumber: { $in: numbers }, status: "Approved" },
      { $set: { status: "AdditionalActionRequired", updatedAt: now } },
    );
    for (const doc of needsAction) {
      doc.status = "AdditionalActionRequired";
      doc.updatedAt = now;
    }
  }

  if (needsUnderReview.length > 0) {
    const numbers = needsUnderReview.map((doc) => doc.applicationNumber);
    await db.collection<ApplicationRecord>("applications").updateMany(
      { applicationNumber: { $in: numbers }, status: "Approved" },
      { $set: { status: "UnderReview", updatedAt: now } },
    );
    for (const doc of needsUnderReview) {
      doc.status = "UnderReview";
      doc.updatedAt = now;
    }
  }

  return docs;
}

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
  const profileComplete = computeProfileComplete(user);
  if (profileComplete !== user.profileComplete) {
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    await db
      .collection<UserRecord>("users")
      .updateOne(
        { clerkId: userId },
        { $set: { profileComplete, updatedAt: new Date() } },
      );
    return toUserProfile({ ...user, profileComplete });
  }
  return toUserProfile(user);
});

const optionalKenyanPhone = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === "" || isValidKenyanPhone(value), {
    message: "Enter a valid Kenyan mobile (e.g. 0712 345 678)",
  });

const optionalKenyanNationalId = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === "" || isValidKenyanNationalId(value), {
    message: "Enter a valid National ID (7–8 digits)",
  });

const updateProfileInput = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  nationalId: optionalKenyanNationalId,
  phone: optionalKenyanPhone,
  email: z
    .string()
    .trim()
    .max(160)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  dateOfBirth: z
    .string()
    .trim()
    .max(10)
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Enter a valid date of birth",
    }),
  county: z.string().trim().max(80),
  employer: z.string().trim().max(120),
  jobTitle: z.string().trim().max(80),
  monthlyIncome: z.number().nonnegative().nullable(),
  yearsEmployed: z.number().nonnegative().max(60).nullable(),
  bankName: z.string().trim().max(80),
  accountNumber: z.string().trim().max(40),
  mpesaNumber: optionalKenyanPhone,
});

export const updateCurrentUserProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateProfileInput.parse(input))
  .handler(async ({ data }) => {
    const clerkUserId = await requireUserId();
    await ensureUser(clerkUserId);

    const { firstName, lastName } = splitFullName(data.fullName);
    const monthlyIncome = data.monthlyIncome;
    const yearsEmployed = data.yearsEmployed;

    const profileComplete = computeProfileComplete({
      firstName,
      lastName,
      nationalId: data.nationalId,
      phone: data.phone,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      county: data.county,
      employer: data.employer,
      jobTitle: data.jobTitle,
      monthlyIncome: monthlyIncome ?? undefined,
      yearsEmployed: yearsEmployed ?? undefined,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      mpesaNumber: data.mpesaNumber,
    });

    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const now = new Date();

    const $set: Record<string, unknown> = {
      firstName,
      lastName,
      nationalId: data.nationalId,
      phone: data.phone,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      county: data.county,
      employer: data.employer,
      jobTitle: data.jobTitle,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      mpesaNumber: data.mpesaNumber,
      profileComplete,
      updatedAt: now,
    };
    const $unset: Record<string, ""> = {};

    if (monthlyIncome === null) $unset.monthlyIncome = "";
    else $set.monthlyIncome = monthlyIncome;

    if (yearsEmployed === null) $unset.yearsEmployed = "";
    else $set.yearsEmployed = yearsEmployed;

    const result = await db.collection<UserRecord>("users").findOneAndUpdate(
      { clerkId: clerkUserId },
      {
        $set,
        ...(Object.keys($unset).length > 0 ? { $unset } : {}),
      },
      { returnDocument: "after" },
    );

    if (!result) throw new Error("Could not save profile");
    return toUserProfile(result);
  });

const draftFormSchema = z.object({
  fullName: z.string().max(120).default(""),
  nationalId: z.string().max(20).default(""),
  phone: z.string().max(20).default(""),
  mpesaNumber: z.string().max(20).default(""),
  employmentStatus: z.string().max(80).default("Employed"),
  employer: z.string().max(120).default(""),
  jobTitle: z.string().max(80).default(""),
  yearsAtEmployer: z.string().max(10).default(""),
  monthlyIncome: z.string().max(20).default(""),
  monthlyExpenses: z.string().max(20).default(""),
  existingLoans: z.string().max(20).default(""),
  rentMortgage: z.string().max(20).default(""),
  purpose: z.string().max(80).default("Business"),
  additionalDetails: z.string().max(2000).default(""),
});

const productTypeSchema = z.enum(["personal_loan", "salary_advance"]);

const saveApplicationDraftInput = z.object({
  step: z.number().int().min(0).max(10),
  amount: z.number().positive(),
  months: z.number().int().min(1).max(MAX_REPAYMENT_MONTHS),
  productType: productTypeSchema.default("personal_loan"),
  form: draftFormSchema,
});

export const getApplicationDraft = createServerFn({ method: "GET" }).handler(async () => {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) return null;

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const doc = await db.collection<ApplicationDraftRecord>("application_drafts").findOne({
    clerkId: userId,
  });
  if (!doc) return null;

  const { readPlatformSettings } = await import("@/server/settings");
  const lendingSettings = await readPlatformSettings();
  const payload = normalizeDraftPayload(
    {
      step: doc.step,
      amount: doc.amount,
      months: doc.months,
      productType: doc.productType ?? "personal_loan",
      form: doc.form,
    },
    {
      maxStep: 3,
      minAmount: lendingSettings.minLoanAmount,
      maxAmount: lendingSettings.maxLoanAmount,
    },
  );

  return toApplicationDraft({
    ...doc,
    ...payload,
  });
});

export const saveApplicationDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) => saveApplicationDraftInput.parse(data))
  .handler(async ({ data }) => {
    const clerkId = await requireUserId();
    const { readPlatformSettings } = await import("@/server/settings");
    const lendingSettings = await readPlatformSettings();
    const payload = normalizeDraftPayload(data, {
      maxStep: 3,
      minAmount: lendingSettings.minLoanAmount,
      maxAmount: lendingSettings.maxLoanAmount,
    });

    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const now = new Date();
    await db.collection<ApplicationDraftRecord>("application_drafts").updateOne(
      { clerkId },
      {
        $set: {
          ...payload,
          clerkId,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return { ok: true as const, updatedAt: now.toISOString() };
  });

export const clearApplicationDraft = createServerFn({ method: "POST" }).handler(async () => {
  const clerkId = await requireUserId();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  await db.collection("application_drafts").deleteOne({ clerkId });
  return { ok: true as const };
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
    const filter = scope === "mine" ? { clerkUserId: (await auth()).userId ?? "__none__" } : {};

    const docs = await db
      .collection<ApplicationRecord>("applications")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const paidNumbers = await successfulProcessingFeeNumbers(
      docs.map((doc) => doc.applicationNumber),
    );

    await reconcileFeeGateStatuses(docs, paidNumbers);

    return docs.map((doc) =>
      toApplication(doc, {
        feesPaid:
          paidNumbers.has(doc.applicationNumber) ||
          doc.status === "UnderReview" ||
          doc.status === "Disbursing" ||
          doc.status === "Completed",
      }),
    );
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
    const paidNumbers = await successfulProcessingFeeNumbers([applicationNumber]);
    return {
      ...toApplication(doc, {
        feesPaid:
          paidNumbers.has(applicationNumber) ||
          doc.status === "UnderReview" ||
          doc.status === "Disbursing" ||
          doc.status === "Completed",
      }),
      quote: doc.quote ?? null,
    };
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
    const paidNumbers = await successfulProcessingFeeNumbers([applicationNumber]);
    return {
      ...toApplication(doc, {
        feesPaid:
          paidNumbers.has(applicationNumber) ||
          doc.status === "UnderReview" ||
          doc.status === "Disbursing" ||
          doc.status === "Completed",
      }),
      quote: doc.quote ?? null,
    };
  });

const kenyanMobile = z
  .string()
  .min(9)
  .refine((value) => isValidKenyanPhone(value), {
    message: "Enter a valid Kenyan mobile number",
  });

const kenyanNationalId = z
  .string()
  .trim()
  .min(1, "National ID is required")
  .refine((value) => isValidKenyanNationalId(value), {
    message: "Enter a valid National ID (7–8 digits)",
  });

const createApplicationInput = z.object({
  amount: z.number().positive(),
  months: z.number().int().min(1).max(MAX_REPAYMENT_MONTHS),
  productType: productTypeSchema.default("personal_loan"),
  purpose: z.string().min(1).default("Personal"),
  nationalId: kenyanNationalId,
  phone: kenyanMobile,
  mpesaNumber: kenyanMobile,
  county: z.string().optional(),
  employer: z.string().optional(),
  employmentStatus: z.string().max(80).optional(),
  jobTitle: z.string().max(80).optional(),
  yearsAtEmployer: z.number().min(0).max(60).optional(),
  monthlyIncome: z.number().optional(),
  monthlyExpenses: z.number().nonnegative().optional(),
  existingLoans: z.number().nonnegative().optional(),
  rentMortgage: z.number().nonnegative().optional(),
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
    const openApplication = await db.collection<ApplicationRecord>("applications").findOne(
      {
        clerkUserId,
        status: { $in: APPLICATION_STATUSES_BLOCKING_NEW_APPLY },
      },
      { sort: { createdAt: -1 } },
    );
    if (openApplication) {
      throw new Error(
        `You already have an open application (${openApplication.applicationNumber}). Finish it before starting a new one.`,
      );
    }
    const now = new Date();
    const count = await db.collection("applications").countDocuments();
    const applicationNumber = nextApplicationNumber(count);
    const applicant =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || "HarakaCash user";
    const months = clampRepaymentMonths(data.months);
    const productType = data.productType ?? "personal_loan";
    const quote = buildLoanQuote(data.amount, months, {
      monthlyInterestRatePercent: lendingSettings.monthlyInterestRate,
      minProcessingFee: lendingSettings.minProcessingFee,
      feeSeed: applicationNumber,
    });

    const { toSmplyPhoneNumber } = await import("@/lib/smply-pay.server");
    const contactPhone = toSmplyPhoneNumber(data.phone);
    const mpesaNumber = toSmplyPhoneNumber(data.mpesaNumber);

    const doc: ApplicationRecord = {
      applicationNumber,
      clerkUserId,
      applicant,
      nationalId: data.nationalId,
      phone: contactPhone,
      mpesaNumber,
      county: data.county ?? user.county ?? "Nairobi",
      employer: data.employer ?? "Not specified",
      employmentStatus: data.employmentStatus?.trim() || undefined,
      jobTitle: data.jobTitle?.trim() || undefined,
      yearsAtEmployer: data.yearsAtEmployer,
      monthlyIncome: data.monthlyIncome ?? 0,
      monthlyExpenses: data.monthlyExpenses,
      existingLoans: data.existingLoans,
      rentMortgage: data.rentMortgage,
      amount: data.amount,
      months,
      productType,
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
    await db.collection("application_drafts").deleteOne({ clerkId: clerkUserId });
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

    return toApplication(doc, { feesPaid: false });
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

    const { runAiAssessmentWithPolicy } = await import("@/server/assessment-ai.server");
    const { clamped, source } = await runAiAssessmentWithPolicy(
      {
        applicant: doc.applicant,
        phone: doc.phone,
        mpesaNumber: doc.mpesaNumber,
        county: doc.county,
        employer: doc.employer,
        employmentStatus: doc.employmentStatus,
        jobTitle: doc.jobTitle,
        yearsAtEmployer: doc.yearsAtEmployer,
        monthlyIncome: doc.monthlyIncome,
        monthlyExpenses: doc.monthlyExpenses,
        existingLoans: doc.existingLoans,
        rentMortgage: doc.rentMortgage,
        amount: doc.amount,
        months: doc.months,
        purpose: doc.purpose,
        baselineEligibilityScore: doc.eligibilityScore,
        minLoanAmount: lendingSettings.minLoanAmount,
        maxLoanAmount: lendingSettings.maxLoanAmount,
        minProcessingFee: lendingSettings.minProcessingFee,
        monthlyInterestRate: lendingSettings.monthlyInterestRate,
        automatedApprovals: lendingSettings.automatedApprovals,
        quoteMonthly: doc.quote?.monthly,
        applicationNumber,
      },
      lendingSettings.quoteAiProvider,
    );

    const { approved, status, eligibilityScore, steps, notes, decisionHint, eligible, approvedAmount, isPartialOffer } =
      clamped;

    // Offer ready requires fee payment before CRB / final approval.
    const persistedStatus: ApplicationStatus =
      status === "Approved" ? "AdditionalActionRequired" : status;

    const offerQuote = buildLoanQuote(approvedAmount, doc.months, {
      monthlyInterestRatePercent: lendingSettings.monthlyInterestRate,
      minProcessingFee: lendingSettings.minProcessingFee,
      feeSeed: applicationNumber,
    });

    await db.collection<ApplicationRecord>("applications").updateOne(
      { applicationNumber },
      {
        $set: {
          status: persistedStatus,
          eligibilityScore,
          riskScore: 100 - eligibilityScore,
          approvedAmount,
          assessmentNotes: notes,
          assessmentSource: source,
          quote: {
            amount: offerQuote.amount,
            months: offerQuote.months,
            fee: offerQuote.fee,
            interest: offerQuote.interest,
            totalPayable: offerQuote.totalPayable,
            monthly: offerQuote.monthly,
          },
          updatedAt: new Date(),
        },
      },
    );

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: "credit-engine",
      action: isPartialOffer
        ? `Approved partial offer ${approvedAmount} of ${doc.amount} (${source})`
        : `Approved application (${source})`,
      target: applicationNumber,
    });
    await db.collection("notifications").insertOne({
      clerkUserId,
      title: "Offer ready",
      body: isPartialOffer
        ? `Based on your profile we can offer ${approvedAmount.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 })} of your ${doc.amount.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 })} request.`
        : `Your ${approvedAmount.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 })} loan has been pre-approved.`,
      type: "success",
      unread: true,
      createdAt: new Date(),
    });

    return {
      applicationNumber,
      status: persistedStatus,
      approved: true,
      approvedAmount,
      requestedAmount: doc.amount,
      isPartialOffer,
      eligibilityScore,
      source,
      steps,
      overallScore: eligibilityScore,
      eligible,
      decisionHint,
      notes,
    };
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
    "AdditionalActionRequired",
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

    // Final approval (disbursement) is only allowed after fee → UnderReview.
    if (data.action === "approve" && application.status !== "UnderReview") {
      if (application.status === "AdditionalActionRequired" || application.status === "Approved") {
        throw new Error(
          "Processing fee must be paid before this application can be approved for disbursement.",
        );
      }
    }

    // Fee paid + CRB queue: admin approve starts disbursement (does not re-open offer).
    if (data.action === "approve" && application.status === "UnderReview") {
      const { markApplicationDisbursing, requireSuccessfulProcessingFee } =
        await import("@/server/payments");
      await requireSuccessfulProcessingFee(data.applicationNumber);
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
        status === "AdditionalActionRequired"
          ? {
              title: "Loan offer ready",
              body: `Your application ${data.applicationNumber} was accepted. Pay the processing fee to continue to under review.`,
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
        status === "AdditionalActionRequired"
          ? "Accepted offer — awaiting processing fee"
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
    if (statusRequiresConfirmedProcessingFee(data.status)) {
      const { requireSuccessfulProcessingFee } = await import("@/server/payments");
      await requireSuccessfulProcessingFee(data.applicationNumber);
    }
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
