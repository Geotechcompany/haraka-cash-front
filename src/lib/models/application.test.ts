import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationBlocksNewApply,
  applicationNeedsProcessingFee,
  blockingApplicationDestination,
  findBlockingApplication,
  isActiveDisbursedLoan,
  isPendingOfferPipeline,
  pendingOfferHeadline,
  type Application,
} from "@/lib/models/application";

const sampleApp = (status: Application["status"], feesPaid = false): Application => ({
  id: "HC-10234",
  applicant: "Test User",
  phone: "0712345678",
  mpesaNumber: "0712345678",
  county: "Nairobi",
  employer: "Acme",
  monthlyIncome: 50000,
  amount: 10000,
  months: 3,
  purpose: "Business",
  eligibilityScore: 70,
  riskScore: 30,
  status,
  feesPaid,
  requiredDocuments: [],
  createdAt: new Date().toISOString(),
});

test("applicationBlocksNewApply blocks pipeline statuses only", () => {
  for (const status of [
    "Pending",
    "DocumentsRequired",
    "Approved",
    "AdditionalActionRequired",
    "UnderReview",
    "Disbursing",
  ] as const) {
    assert.equal(applicationBlocksNewApply(status), true, status);
  }
  assert.equal(applicationBlocksNewApply("Declined"), false);
  assert.equal(applicationBlocksNewApply("Completed"), false);
});

test("findBlockingApplication returns the first open application", () => {
  assert.equal(findBlockingApplication([]), undefined);
  assert.equal(findBlockingApplication([sampleApp("Completed")]), undefined);
  const blocking = findBlockingApplication([
    sampleApp("Completed"),
    sampleApp("Pending"),
    sampleApp("UnderReview"),
  ]);
  assert.equal(blocking?.status, "Pending");
});

test("blockingApplicationDestination prefers decision for fee or offer pipeline", () => {
  assert.deepEqual(blockingApplicationDestination(sampleApp("Pending")), { to: "/loans" });
  assert.deepEqual(blockingApplicationDestination(sampleApp("DocumentsRequired")), {
    to: "/loans",
  });
  assert.deepEqual(
    blockingApplicationDestination(sampleApp("AdditionalActionRequired", false)),
    { to: "/decision", search: { applicationId: "HC-10234" } },
  );
  assert.deepEqual(blockingApplicationDestination(sampleApp("UnderReview", true)), {
    to: "/decision",
    search: { applicationId: "HC-10234" },
  });
});

test("isActiveDisbursedLoan is true only during disbursement/repayment", () => {
  assert.equal(isActiveDisbursedLoan("Disbursing"), true);
  assert.equal(isActiveDisbursedLoan("Approved"), false);
  assert.equal(isActiveDisbursedLoan("AdditionalActionRequired"), false);
  assert.equal(isActiveDisbursedLoan("UnderReview"), false);
  assert.equal(isActiveDisbursedLoan("Completed"), false);
  assert.equal(isActiveDisbursedLoan("Pending"), false);
});

test("isPendingOfferPipeline covers pre-disbursement offer stages", () => {
  assert.equal(isPendingOfferPipeline("Approved"), true);
  assert.equal(isPendingOfferPipeline("AdditionalActionRequired"), true);
  assert.equal(isPendingOfferPipeline("UnderReview"), true);
  assert.equal(isPendingOfferPipeline("Disbursing"), false);
  assert.equal(isPendingOfferPipeline("Pending"), false);
  assert.equal(isPendingOfferPipeline("DocumentsRequired"), false);
});

test("pendingOfferHeadline reflects fee and CRB state", () => {
  assert.equal(
    pendingOfferHeadline({ status: "AdditionalActionRequired", feesPaid: false }),
    "Offer pending",
  );
  assert.equal(
    pendingOfferHeadline({ status: "UnderReview", feesPaid: true }),
    "Under review",
  );
  assert.equal(applicationNeedsProcessingFee({ status: "Approved", feesPaid: false }), true);
});
