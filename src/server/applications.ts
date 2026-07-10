import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getDb } from "@/lib/db";
import {
  nextApplicationNumber,
  toApplication,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/models/application";
import { toUserProfile, type UserRecord } from "@/lib/models/user";
import { logAuditEvent } from "@/server/audit";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

async function ensureUser(clerkId: string) {
  const db = await getDb();
  const existing = await db.collection<UserRecord>("users").findOne({ clerkId });
  if (existing) return existing;

  const clerk = await clerkClient();
  const profile = await clerk.users.getUser(clerkId).catch(() => null);
  const now = new Date();
  const doc: UserRecord = {
    clerkId,
    email: profile?.emailAddresses[0]?.emailAddress,
    firstName: profile?.firstName ?? undefined,
    lastName: profile?.lastName ?? undefined,
    phone: profile?.phoneNumbers[0]?.phoneNumber,
    eligibilityScore: 0,
    availableCredit: 0,
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
    const db = await getDb();
    const scope = data?.scope ?? "mine";
    const filter =
      scope === "all"
        ? {}
        : { clerkUserId: (await auth()).userId ?? "__none__" };

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
    const db = await getDb();
    const now = new Date();
    const count = await db.collection("applications").countDocuments();
    const applicationNumber = nextApplicationNumber(count);
    const applicant = [user.firstName, user.lastName].filter(Boolean).join(" ") || "HarakaCash user";

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
      quote: data.quote,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<ApplicationRecord>("applications").insertOne(doc);
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
    const db = await getDb();
    const doc = await db.collection<ApplicationRecord>("applications").findOne({
      applicationNumber,
      clerkUserId,
    });

    if (!doc) throw new Error("Application not found");

    const approved = doc.amount <= 100000;
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
  status: z.enum(["Pending", "Approved", "Declined", "Completed", "Disbursing"]),
});

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateStatusInput.parse(data))
  .handler(async ({ data }) => {
    await requireUserId();
    const db = await getDb();
    await db.collection<ApplicationRecord>("applications").updateOne(
      { applicationNumber: data.applicationNumber },
      { $set: { status: data.status, updatedAt: new Date() } },
    );
    await logAuditEvent({
      actor: "admin",
      action: `Set status to ${data.status}`,
      target: data.applicationNumber,
    });
    return { ok: true };
  });
