import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseRegisterSearch } from "@/lib/register-search";

describe("parseRegisterSearch", () => {
  it("accepts a present ref code", () => {
    assert.deepEqual(parseRegisterSearch({ ref: "CX6DCE6T" }), { ref: "CX6DCE6T" });
  });

  it("treats ref as optional when absent", () => {
    assert.deepEqual(parseRegisterSearch({}), {});
  });

  it("tolerates undefined search (SSR / empty)", () => {
    assert.deepEqual(parseRegisterSearch(undefined), {});
  });

  it("tolerates null search", () => {
    assert.deepEqual(parseRegisterSearch(null), {});
  });
});
