import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isTransientAuthError,
  withTransientAuthRetry,
} from "@/lib/transient-auth-retry";

describe("isTransientAuthError", () => {
  it("matches auth bootstrap errors", () => {
    assert.equal(isTransientAuthError(new Error("Unauthorized")), true);
    assert.equal(isTransientAuthError(new Error("User not found")), true);
  });

  it("ignores permanent failures", () => {
    assert.equal(isTransientAuthError(new Error("Forbidden")), false);
    assert.equal(isTransientAuthError("Unauthorized"), false);
  });
});

describe("withTransientAuthRetry", () => {
  it("retries transient errors then succeeds", async () => {
    let calls = 0;
    const result = await withTransientAuthRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error("Unauthorized");
      return "ok";
    }, { baseDelayMs: 1 });

    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  it("does not retry non-transient errors", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withTransientAuthRetry(async () => {
          calls += 1;
          throw new Error("Forbidden");
        }),
      /Forbidden/,
    );
    assert.equal(calls, 1);
  });
});
