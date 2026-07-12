import "@/lib/server-only";

import { MongoClient, type Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB ?? "harakacash";

declare global {
  var __mongoClient: MongoClient | undefined;
  var __mongoIndexes: Promise<void> | undefined;
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!globalThis.__mongoClient) {
    globalThis.__mongoClient = new MongoClient(uri);
    await globalThis.__mongoClient.connect();
  }

  const db = globalThis.__mongoClient.db(DB_NAME);
  globalThis.__mongoIndexes ??= createIndexes(db);
  await globalThis.__mongoIndexes;
  return db;
}

async function createIndexes(db: Db) {
  await Promise.all([
    db.collection("applications").createIndex({ applicationNumber: 1 }, { unique: true }),
    db.collection("applications").createIndex({ clerkUserId: 1, createdAt: -1 }),
    db.collection("applications").createIndex({ status: 1, updatedAt: -1 }),
    db.collection("application_drafts").createIndex({ clerkId: 1 }, { unique: true }),
    db.collection("users").createIndex({ clerkId: 1 }, { unique: true }),
    db.collection("users").createIndex({ status: 1 }),
    db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ referralCode: 1 }, { unique: true, sparse: true }),
    db.collection("referrals").createIndex({ refereeClerkId: 1 }, { unique: true }),
    db.collection("referrals").createIndex({ referrerClerkId: 1, createdAt: -1 }),
    db.collection("referrals").createIndex({ createdAt: -1 }),
    db.collection("loans").createIndex({ loanNumber: 1 }, { unique: true }),
    db.collection("loans").createIndex({ applicationNumber: 1 }, { unique: true }),
    db.collection("loans").createIndex({ clerkUserId: 1, createdAt: -1 }),
    db.collection("loans").createIndex({ status: 1, dueDate: 1 }),
    db
      .collection("repayments")
      .createIndex({ loanNumber: 1, installmentNumber: 1 }, { unique: true }),
    db.collection("repayments").createIndex({ clerkUserId: 1, dueDate: 1 }),
    db.collection("repayments").createIndex({ status: 1, dueDate: 1 }),
    db.collection("settings").createIndex({ key: 1 }, { unique: true }),
    db.collection("notifications").createIndex({ clerkUserId: 1, createdAt: -1 }),
    db.collection("loan_history").createIndex({ clerkUserId: 1 }, { unique: true }),
    db.collection("analytics").createIndex({ key: 1 }, { unique: true }),
    db.collection("payments").createIndex({ reference: 1 }, { unique: true }),
    db.collection("payments").createIndex({ kind: 1, createdAt: -1 }),
    db.collection("payments").createIndex({ applicationNumber: 1 }),
    db.collection("payments").createIndex({ clerkUserId: 1, createdAt: -1 }),
    db.collection("audit_logs").createIndex({ createdAt: -1 }),
    db.collection("support_tickets").createIndex({ ticketNumber: 1 }, { unique: true }),
    db.collection("support_tickets").createIndex({ updatedAt: -1 }),
    db.collection("support_tickets").createIndex({ status: 1, clerkUserId: 1 }),
  ]);
}

export async function ensureIndexes() {
  await getDb();
}
