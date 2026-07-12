import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationStatusForReview,
  applyRepayment,
  buildRepaymentSchedule,
  isAdminMetadata,
  statusRequiresConfirmedProcessingFee,
} from "@/lib/admin-domain";
import { toPlatformSettings } from "@/lib/models/settings";
import { createReportFileResponse, type ReportRow } from "@/server/reports";

const reportRows: ReportRow[] = [
  {
    reference: "RP-001",
    applicationNumber: "HC-001",
    phone: "254700000001",
    amount: 3_300,
    status: "success",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
];

test("admin authorization accepts only explicit admin metadata", () => {
  assert.equal(isAdminMetadata({ role: "admin" }), true);
  assert.equal(isAdminMetadata({ role: "user" }), false);
  assert.equal(isAdminMetadata({ admin: true }), false);
  assert.equal(isAdminMetadata(null), false);
});

test("application review actions resolve to durable statuses", () => {
  assert.equal(applicationStatusForReview("approve"), "Approved");
  assert.equal(applicationStatusForReview("decline"), "Declined");
  assert.equal(applicationStatusForReview("requestDocuments"), "DocumentsRequired");
});

test("UnderReview and Disbursing require a confirmed processing fee", () => {
  assert.equal(statusRequiresConfirmedProcessingFee("UnderReview"), true);
  assert.equal(statusRequiresConfirmedProcessingFee("Disbursing"), true);
  assert.equal(statusRequiresConfirmedProcessingFee("Approved"), false);
  assert.equal(statusRequiresConfirmedProcessingFee("Pending"), false);
});

test("repayment schedule preserves principal, interest, and total", () => {
  const schedule = buildRepaymentSchedule({
    amount: 10_000,
    interest: 1_800,
    totalPayable: 11_800,
    months: 3,
    startDate: new Date("2026-01-15T00:00:00.000Z"),
  });

  assert.equal(schedule.length, 3);
  assert.equal(
    schedule.reduce((sum, item) => sum + item.principal, 0),
    10_000,
  );
  assert.equal(
    schedule.reduce((sum, item) => sum + item.interest, 0),
    1_800,
  );
  assert.equal(
    schedule.reduce((sum, item) => sum + item.amount, 0),
    11_800,
  );
});

test("repayment caps overpayments and marks covered installments", () => {
  const paidAt = new Date("2026-04-01T00:00:00.000Z");
  const schedule = buildRepaymentSchedule({
    amount: 9_000,
    interest: 900,
    totalPayable: 9_900,
    months: 3,
    startDate: new Date("2026-01-01T00:00:00.000Z"),
  });
  const partial = applyRepayment({
    outstandingBalance: 9_900,
    amount: 3_300,
    schedule,
    reference: "RP-001",
    paidAt,
  });
  assert.equal(partial.outstandingBalance, 6_600);
  assert.deepEqual(partial.paidInstallments, [1]);
  assert.equal(partial.repaymentSchedule[0].paymentReference, "RP-001");

  const final = applyRepayment({
    outstandingBalance: 1_000,
    amount: 5_000,
    schedule: partial.repaymentSchedule,
    reference: "RP-002",
    paidAt,
  });
  assert.equal(final.appliedAmount, 1_000);
  assert.equal(final.outstandingBalance, 0);
  assert.equal(final.status, "Paid");
});

test("platform settings mapper supplies defaults for legacy records", () => {
  const settings = toPlatformSettings({
    key: "platform-lending",
    maxLoanAmount: 75_000,
  });
  assert.equal(settings.minLoanAmount, 1_000);
  assert.equal(settings.maxLoanAmount, 75_000);
  assert.equal(settings.minProcessingFee, 150);
  assert.equal(settings.monthlyInterestRate, 6);
  assert.equal(settings.quoteAiProvider, "auto");
  assert.equal(settings.geminiApiKeyConfigured, false);
  assert.equal(settings.geminiApiKeyMasked, "");
  assert.equal(settings.openaiApiKeyConfigured, false);
  assert.equal(settings.openaiApiKeyMasked, "");
  assert.equal(settings.nvidiaApiKeyConfigured, false);
  assert.equal(settings.nvidiaApiKeyMasked, "");
});

test("platform settings masks Gemini API key and never exposes raw value", () => {
  const settings = toPlatformSettings({
    key: "platform-lending",
    geminiApiKey: "AIzaSySecretKeyValue1234",
  });
  assert.equal(settings.geminiApiKeyConfigured, true);
  assert.equal(settings.geminiApiKeyMasked, "••••••••1234");
  assert.equal("geminiApiKey" in settings, false);
});

test("platform settings masks OpenAI API key and never exposes raw value", () => {
  const settings = toPlatformSettings({
    key: "platform-lending",
    openaiApiKey: "sk-proj-SecretOpenAiKey9999",
    quoteAiProvider: "openai",
  });
  assert.equal(settings.openaiApiKeyConfigured, true);
  assert.equal(settings.openaiApiKeyMasked, "••••••••9999");
  assert.equal(settings.quoteAiProvider, "openai");
  assert.equal("openaiApiKey" in settings, false);
});

test("platform settings masks NVIDIA API key and never exposes raw value", () => {
  const settings = toPlatformSettings({
    key: "platform-lending",
    nvidiaApiKey: "nvapi-SecretNvidiaKeyValueABCD",
    quoteAiProvider: "nvidia",
  });
  assert.equal(settings.nvidiaApiKeyConfigured, true);
  assert.equal(settings.nvidiaApiKeyMasked, "••••••••ABCD");
  assert.equal(settings.quoteAiProvider, "nvidia");
  assert.equal("nvidiaApiKey" in settings, false);
});

test("CSV report response sets download headers and serializes rows", async () => {
  const response = await createReportFileResponse({
    title: "Repayments",
    filename: "repayments.csv",
    format: "csv",
    rows: reportRows,
  });
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="repayments.csv"',
  );
  assert.match(await response.text(), /RP-001,HC-001/);
});

test("PDF report response sets download headers and emits a PDF", async () => {
  const response = await createReportFileResponse({
    title: "Repayments",
    filename: "repayments.pdf",
    format: "pdf",
    rows: reportRows,
  });
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="repayments.pdf"',
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
});
