import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildLoanQuote, processingFee } from "@/lib/loan";
import {
  isValidKenyanNationalId,
  isValidKenyanPhone,
  kenyanNationalIdError,
  kenyanPhoneError,
} from "@/lib/kenya-format";
import { applicationStkPhone } from "@/lib/models/application";

describe("kenya-format", () => {
  it("accepts common Kenyan mobile formats", () => {
    assert.equal(isValidKenyanPhone("0712345678"), true);
    assert.equal(isValidKenyanPhone("0112345678"), true);
    assert.equal(isValidKenyanPhone("+254712345678"), true);
    assert.equal(isValidKenyanPhone("254712345678"), true);
    assert.equal(isValidKenyanPhone("712345678"), true);
  });

  it("rejects invalid phones", () => {
    assert.equal(isValidKenyanPhone("0512345678"), false);
    assert.equal(isValidKenyanPhone("123"), false);
    assert.ok(kenyanPhoneError(""));
  });

  it("validates national ID length", () => {
    assert.equal(isValidKenyanNationalId("12345678"), true);
    assert.equal(isValidKenyanNationalId("1234567"), true);
    assert.equal(isValidKenyanNationalId("123"), false);
    assert.ok(kenyanNationalIdError("abc"));
  });
});

describe("buildLoanQuote", () => {
  it("matches fee schedule and interest math", () => {
    const quote = buildLoanQuote(20_000, 3, 6);
    assert.equal(quote.fee, processingFee(20_000));
    assert.equal(quote.interest, Math.round(20_000 * 0.06 * 3));
    assert.equal(quote.totalPayable, quote.amount + quote.fee + quote.interest);
    assert.equal(quote.monthly, Math.round(quote.totalPayable / 3));
  });

  it("never goes below minProcessingFee floor", () => {
    assert.equal(processingFee(3_000, 400), 400);
    const quote = buildLoanQuote(3_000, 2, {
      monthlyInterestRatePercent: 6,
      minProcessingFee: 400,
    });
    assert.equal(quote.fee, 400);
  });
});

describe("applicationStkPhone", () => {
  it("prefers mpesaNumber over contact phone", () => {
    assert.equal(
      applicationStkPhone({ mpesaNumber: "0712345678", phone: "0112345678" }),
      "0712345678",
    );
  });

  it("falls back to contact phone when mpesa is missing", () => {
    assert.equal(applicationStkPhone({ phone: "0712345678" }), "0712345678");
    assert.equal(applicationStkPhone({ mpesaNumber: "", phone: "0712345678" }), "0712345678");
  });

  it("returns empty when no usable number exists", () => {
    assert.equal(applicationStkPhone({ phone: "07xx xxx xxx" }), "");
    assert.equal(applicationStkPhone({ phone: "" }), "");
  });
});
