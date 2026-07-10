import "dotenv/config";

import { MongoClient } from "mongodb";

import { ensureIndexes } from "../src/lib/db";
import type { ApplicationRecord } from "../src/lib/models/application";
import type { NotificationRecord } from "../src/lib/models/notification";
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

async function seed() {
  const client = new MongoClient(uri);
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

  const now = new Date();
  const applications: ApplicationRecord[] = SEED_APPLICATIONS.map((app) => ({
    applicationNumber: app.id,
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

  await db.collection("applications").insertMany(applications);

  const notifications: NotificationRecord[] = SEED_NOTIFICATIONS.map((n) => ({
    title: n.title,
    body: n.body,
    type: n.type,
    unread: n.unread,
    createdAt: new Date(Date.now() - Math.random() * 5 * 86400000),
  }));

  await db.collection("notifications").insertMany(notifications);

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

  console.log(`Seeded ${applications.length} applications and ${notifications.length} notifications into ${dbName}`);
  await client.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
