import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatUserFacingError, getUserFacingError } from "@/lib/user-facing-error";

const yearsAtEmployerFixture =
  '[ { "code": "too_big", "maximum": 60, "type": "number", "inclusive": true, "exact": false, "message": "Number must be less than or equal to 60", "path": [ "yearsAtEmployer" ] } ]';

describe("formatUserFacingError", () => {
  it("formats yearsAtEmployer too_big Zod JSON", () => {
    assert.equal(
      formatUserFacingError(yearsAtEmployerFixture),
      "Years at employer must be 60 or less.",
    );
  });

  it("strips Server Fn Error prefix before parsing Zod JSON", () => {
    assert.equal(
      formatUserFacingError(`Server Fn Error: ${yearsAtEmployerFixture}`),
      "Years at employer must be 60 or less.",
    );
  });

  it("maps nationalId path to National ID", () => {
    const raw =
      '[{"code":"custom","message":"Enter a valid National ID (7–8 digits)","path":["nationalId"]}]';
    assert.equal(
      formatUserFacingError(raw),
      "Enter a valid National ID (7–8 digits).",
    );
  });

  it("joins multiple issues with semicolons", () => {
    const raw =
      '[{"code":"too_small","minimum":1,"type":"string","message":"String must contain at least 1 character(s)","path":["fullName"]},{"code":"too_big","maximum":60,"type":"number","message":"Number must be less than or equal to 60","path":["yearsAtEmployer"]}]';
    assert.equal(
      formatUserFacingError(raw),
      "Full name must be at least 1 character.; Years at employer must be 60 or less.",
    );
  });

  it("passes through readable server messages", () => {
    assert.equal(
      formatUserFacingError("New applications are temporarily unavailable"),
      "New applications are temporarily unavailable",
    );
  });

  it("falls back for opaque technical messages", () => {
    assert.equal(
      formatUserFacingError("TypeError: Cannot read properties of undefined"),
      "Something went wrong. Please try again.",
    );
  });

  it("uses custom fallback when provided", () => {
    assert.equal(
      formatUserFacingError("undefined is not an object", "Could not submit application"),
      "Could not submit application",
    );
  });
});

describe("getUserFacingError", () => {
  it("reads message from Error instances", () => {
    assert.equal(
      getUserFacingError(new Error(yearsAtEmployerFixture)),
      "Years at employer must be 60 or less.",
    );
  });

  it("returns fallback for non-error values", () => {
    assert.equal(getUserFacingError(null, "Could not save profile"), "Could not save profile");
  });
});
