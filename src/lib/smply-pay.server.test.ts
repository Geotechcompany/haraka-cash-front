import assert from "node:assert/strict";
import test from "node:test";

import { buildStkPushBody, buildWithdrawBody, toSmplyPhoneNumber } from "@/lib/smply-pay.server";

test("toSmplyPhoneNumber normalizes 254 and bare 9-digit to local 07…", () => {
  assert.equal(toSmplyPhoneNumber("254757344328"), "0757344328");
  assert.equal(toSmplyPhoneNumber("0757344328"), "0757344328");
  assert.equal(toSmplyPhoneNumber("757344328"), "0757344328");
});

test("buildWithdrawBody matches STK Postman shape including projectCode", () => {
  process.env.SMPLY_PAY_PROJECT_CODE = "WLT-CD-1MRWANZ";

  const stk = buildStkPushBody({
    phone: "254757344328",
    amount: 5,
    reference: "WD-TEST-1",
  });
  const withdraw = buildWithdrawBody({
    phone: "254757344328",
    amount: 5,
    reference: "WD-TEST-1",
  });

  assert.deepEqual(withdraw, {
    phoneNumber: "0757344328",
    amount: "5",
    projectCode: "WLT-CD-1MRWANZ",
    orderCode: "",
    transactionId: "WD-TEST-1",
  });
  assert.deepEqual(withdraw, stk);
});

test("buildWithdrawBody rejects missing project code", () => {
  delete process.env.SMPLY_PAY_PROJECT_CODE;
  assert.throws(
    () =>
      buildWithdrawBody({
        phone: "0757344328",
        amount: 1,
        reference: "WD-MISSING",
      }),
    /SMPLY_PAY_PROJECT_CODE/,
  );
});
