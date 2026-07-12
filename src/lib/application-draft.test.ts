import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clampDraftStep, isDraftWorthSaving, normalizeDraftPayload } from "@/lib/application-draft";

const emptyForm = {
  fullName: "Ada",
  nationalId: "",
  phone: "0712345678",
  mpesaNumber: "0712345678",
  employmentStatus: "Employed",
  employer: "",
  jobTitle: "",
  yearsAtEmployer: "",
  monthlyIncome: "",
  monthlyExpenses: "",
  existingLoans: "",
  rentMortgage: "",
  purpose: "Business",
  additionalDetails: "",
  idDocumentName: "",
};

describe("isDraftWorthSaving", () => {
  it("skips empty first paint at step 0 with defaults", () => {
    assert.equal(
      isDraftWorthSaving({
        step: 0,
        amount: 10_000,
        months: 3,
        form: emptyForm,
        defaultAmount: 10_000,
      }),
      false,
    );
  });

  it("saves when step advanced", () => {
    assert.equal(
      isDraftWorthSaving({
        step: 1,
        amount: 10_000,
        months: 3,
        form: emptyForm,
        defaultAmount: 10_000,
      }),
      true,
    );
  });

  it("saves when a meaningful field is filled", () => {
    assert.equal(
      isDraftWorthSaving({
        step: 0,
        amount: 10_000,
        months: 3,
        form: { ...emptyForm, nationalId: "12345678" },
        defaultAmount: 10_000,
      }),
      true,
    );
  });

  it("saves when amount changes from default", () => {
    assert.equal(
      isDraftWorthSaving({
        step: 0,
        amount: 15_000,
        months: 3,
        form: emptyForm,
        defaultAmount: 10_000,
      }),
      true,
    );
  });
});

describe("clampDraftStep", () => {
  it("clamps to range", () => {
    assert.equal(clampDraftStep(-1, 4), 0);
    assert.equal(clampDraftStep(9, 4), 4);
    assert.equal(clampDraftStep(2.7, 4), 2);
  });
});

describe("normalizeDraftPayload", () => {
  it("fills missing form keys and clamps amount", () => {
    const normalized = normalizeDraftPayload(
      {
        step: 99,
        amount: 1,
        months: 99,
        form: { ...emptyForm, employmentStatus: "", purpose: "" },
      },
      { maxStep: 4, minAmount: 5_000, maxAmount: 50_000 },
    );
    assert.equal(normalized.step, 4);
    assert.equal(normalized.amount, 5_000);
    assert.equal(normalized.months, 12);
    assert.equal(normalized.form.employmentStatus, "Employed");
    assert.equal(normalized.form.purpose, "Business");
  });
});
