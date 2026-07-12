import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatReferralClickLocation,
  toReferralClickSummary,
} from "@/lib/models/referral-click";
import { hashReferralIp, isPrivateOrLocalIp } from "@/server/referral-clicks.server";

describe("hashReferralIp", () => {
  it("returns a stable sha256 hex digest", () => {
    process.env.REFERRAL_IP_HASH_SECRET = "test-secret";
    const first = hashReferralIp("203.0.113.10");
    const second = hashReferralIp("203.0.113.10");
    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
  });

  it("does not echo the raw ip", () => {
    process.env.REFERRAL_IP_HASH_SECRET = "test-secret";
    const hashed = hashReferralIp("203.0.113.10");
    assert.doesNotMatch(hashed, /203\.0\.113\.10/);
  });
});

describe("isPrivateOrLocalIp", () => {
  it("flags local and private ranges", () => {
    assert.equal(isPrivateOrLocalIp("127.0.0.1"), true);
    assert.equal(isPrivateOrLocalIp("192.168.1.4"), true);
    assert.equal(isPrivateOrLocalIp("203.0.113.4"), false);
  });
});

describe("referral click summaries", () => {
  it("formats location from geo fields", () => {
    assert.equal(
      formatReferralClickLocation({
        city: "Nairobi",
        region: "Nairobi County",
        country: "Kenya",
      }),
      "Nairobi, Nairobi County, Kenya",
    );
    assert.equal(formatReferralClickLocation({}), "Unknown location");
  });

  it("maps records without exposing ip hash in summary", () => {
    const summary = toReferralClickSummary({
      _id: "abc",
      code: "ABCD1234",
      referrerClerkId: "user_1",
      ipHash: "hidden-hash",
      city: "Mombasa",
      country: "Kenya",
      source: "register",
      converted: true,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
    });

    assert.equal(summary.location, "Mombasa, Kenya");
    assert.equal(summary.converted, true);
    assert.equal("ipHash" in summary, false);
  });
});
