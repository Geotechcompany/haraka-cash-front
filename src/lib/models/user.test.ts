import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeProfileComplete,
  displayNameFromParts,
  splitFullName,
  toUserProfile,
  type UserRecord,
} from "@/lib/models/user";

describe("splitFullName", () => {
  it("splits first and remaining words", () => {
    assert.deepEqual(splitFullName("Geoffrey Audia"), {
      firstName: "Geoffrey",
      lastName: "Audia",
    });
    assert.deepEqual(splitFullName("Mary Anne Wanjiku"), {
      firstName: "Mary",
      lastName: "Anne Wanjiku",
    });
  });

  it("handles single names and blank input", () => {
    assert.deepEqual(splitFullName("Geoffrey"), { firstName: "Geoffrey", lastName: "" });
    assert.deepEqual(splitFullName("   "), { firstName: "", lastName: "" });
  });
});

describe("computeProfileComplete", () => {
  it("returns 0 for an empty profile", () => {
    assert.equal(computeProfileComplete({}), 0);
  });

  it("counts personal fields toward completion", () => {
    const pct = computeProfileComplete({
      firstName: "Geoffrey",
      lastName: "Audia",
      nationalId: "12345678",
      phone: "0712345678",
      email: "geoffrey@example.com",
      dateOfBirth: "1990-01-15",
      county: "Nairobi",
    });
    assert.equal(pct, Math.round((6 / 13) * 100));
  });

  it("reaches 100 when all tracked fields are set", () => {
    assert.equal(
      computeProfileComplete({
        name: "Geoffrey Audia",
        nationalId: "12345678",
        phone: "0712345678",
        email: "geoffrey@example.com",
        dateOfBirth: "1990-01-15",
        county: "Nairobi",
        employer: "Geotech",
        jobTitle: "Engineer",
        monthlyIncome: 80_000,
        yearsEmployed: 3,
        bankName: "Equity",
        accountNumber: "1234567890",
        mpesaNumber: "0712345678",
      }),
      100,
    );
  });

  it("treats zero income as incomplete but zero years as complete", () => {
    const withZeroIncome = computeProfileComplete({
      name: "A B",
      nationalId: "12345678",
      phone: "0712345678",
      email: "a@b.co",
      dateOfBirth: "1990-01-01",
      county: "Nairobi",
      employer: "Co",
      jobTitle: "Dev",
      monthlyIncome: 0,
      yearsEmployed: 0,
      bankName: "KCB",
      accountNumber: "1",
      mpesaNumber: "0712345678",
    });
    assert.equal(withZeroIncome, Math.round((12 / 13) * 100));
  });
});

describe("toUserProfile", () => {
  it("maps stored profile fields for the UI", () => {
    const doc: UserRecord = {
      clerkId: "user_1",
      email: "arthurbreck417@gmail.com",
      firstName: "Geoffrey",
      lastName: "Audia",
      phone: "0712345678",
      nationalId: "12345678",
      dateOfBirth: "1992-04-01",
      county: "Nairobi",
      employer: "Geotech",
      jobTitle: "Developer",
      monthlyIncome: 90_000,
      yearsEmployed: 2,
      bankName: "Equity",
      accountNumber: "998877",
      mpesaNumber: "0712345678",
      eligibilityScore: 0,
      availableCredit: 0,
      profileComplete: 100,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    };

    const profile = toUserProfile(doc);
    assert.equal(profile.name, "Geoffrey Audia");
    assert.equal(profile.nationalId, "12345678");
    assert.equal(profile.county, "Nairobi");
    assert.equal(profile.mpesaNumber, "0712345678");
    assert.equal(profile.profileComplete, 100);
  });

  it("falls back to a default display name", () => {
    assert.equal(displayNameFromParts(undefined, undefined), "HarakaCash user");
  });
});
