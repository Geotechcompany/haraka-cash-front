import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampRepaymentMonths,
  DEFAULT_PRODUCT_TYPE,
  formatRepaymentPeriod,
  MAX_REPAYMENT_MONTHS,
  parseProductType,
  parseProductTypeFromSearch,
  productTypeLabel,
} from "@/lib/lending-products";

describe("lending-products", () => {
  it("caps repayment term at one month", () => {
    assert.equal(MAX_REPAYMENT_MONTHS, 1);
    assert.equal(clampRepaymentMonths(12), 1);
    assert.equal(clampRepaymentMonths(0), 1);
    assert.equal(clampRepaymentMonths(1), 1);
  });

  it("formats singular repayment copy", () => {
    assert.equal(formatRepaymentPeriod(1), "1 month repayment");
    assert.equal(formatRepaymentPeriod(2), "1 month repayment");
  });

  it("parses product type from URL aliases", () => {
    assert.equal(parseProductType("salary-advance"), "salary_advance");
    assert.equal(parseProductType("personal-loan"), "personal_loan");
    assert.equal(parseProductTypeFromSearch({ product: "salary-advance" }), "salary_advance");
    assert.equal(parseProductTypeFromSearch({ type: "personal-loan" }), "personal_loan");
    assert.equal(parseProductType("unknown"), null);
  });

  it("labels product types", () => {
    assert.equal(productTypeLabel("salary_advance"), "Salary advance");
    assert.equal(productTypeLabel(DEFAULT_PRODUCT_TYPE), "Personal loan");
  });
});
