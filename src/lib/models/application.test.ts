import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationNeedsProcessingFee,
  isActiveDisbursedLoan,
  isPendingOfferPipeline,
  pendingOfferHeadline,
} from "@/lib/models/application";

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
