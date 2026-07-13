import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStkPushBody,
  buildWithdrawBody,
  getWalletBalancePath,
  interpretSmplyStkResponse,
  interpretSmplyWithdrawResponse,
  toSmplyPhoneNumber,
} from "@/lib/smply-pay.server";

test("toSmplyPhoneNumber normalizes 254 and bare 9-digit to local 07…", () => {
  assert.equal(toSmplyPhoneNumber("254757344328"), "0757344328");
  assert.equal(toSmplyPhoneNumber("0757344328"), "0757344328");
  assert.equal(toSmplyPhoneNumber("757344328"), "0757344328");
});

test("buildWithdrawBody matches Postman B2C shape including remarks", () => {
  process.env.SMPLY_PAY_PROJECT_CODE = "WLT-CD-1MRWANZ";

  const withdraw = buildWithdrawBody({
    phone: "254719671440",
    amount: 5,
    reference: "WD-TEST-1",
    remarks: "spec test",
  });

  assert.deepEqual(withdraw, {
    phoneNumber: "0719671440",
    amount: "5",
    projectCode: "WLT-CD-1MRWANZ",
    orderCode: "",
    transactionId: "WD-TEST-1",
    remarks: "spec test",
  });
});

test("buildWithdrawBody defaults remarks when omitted", () => {
  process.env.SMPLY_PAY_PROJECT_CODE = "WLT-CD-1MRWANZ";
  const withdraw = buildWithdrawBody({
    phone: "0757344328",
    amount: 1,
    reference: "WD-DEFAULT",
  });
  assert.equal(withdraw.remarks, "withdrawal");
  assert.notDeepEqual(
    withdraw,
    buildStkPushBody({
      phone: "0757344328",
      amount: 1,
      reference: "WD-DEFAULT",
    }),
  );
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

test("interpretSmplyWithdrawResponse treats bare Success as pending, not paid", () => {
  const result = interpretSmplyWithdrawResponse({
    reference: "WD-1",
    raw: { code: 1, message: "Success", data: "" },
  });
  assert.equal(result.status, "pending");
  assert.match(result.message, /Waiting for M-Pesa/i);
  assert.notEqual(result.message, "Success");
});

test("interpretSmplyWithdrawResponse flags insufficient-funds wording as failed", () => {
  const result = interpretSmplyWithdrawResponse({
    reference: "WD-2",
    raw: { message: "Insufficient wallet balance" },
  });
  assert.equal(result.status, "failed");
  assert.match(result.message, /Insufficient/i);
});

test("getWalletBalancePath uses Postman wallet code segment", () => {
  process.env.SMPLY_PAY_PROJECT_CODE = "WLT-CD-1MRWANZ";
  delete process.env.SMPLY_PAY_WALLET_PATH;
  assert.equal(
    getWalletBalancePath(),
    "/api/v1/provider-one/wallet/WLT-CD-1MRWANZ/balance",
  );
});

test("buildStkPushBody uses DEP reference for admin deposits", () => {
  process.env.SMPLY_PAY_PROJECT_CODE = "WLT-CD-1MRWANZ";
  assert.deepEqual(
    buildStkPushBody({
      phone: "0757344328",
      amount: 1,
      reference: "DEP-TEST-1",
    }),
    {
      phoneNumber: "0757344328",
      amount: "1",
      projectCode: "WLT-CD-1MRWANZ",
      orderCode: "",
      transactionId: "DEP-TEST-1",
    },
  );
});

test("interpretSmplyStkResponse treats bare Success as pending prompt, not paid", () => {
  const result = interpretSmplyStkResponse({
    reference: "DEP-1",
    raw: { code: 1, message: "Success", data: "" },
    pendingMessage:
      "STK prompt sent. Enter M-Pesa PIN on the phone. This is not a deposit confirmation.",
  });
  assert.equal(result.status, "pending");
  assert.match(result.message, /not a deposit confirmation/i);
  assert.notEqual(result.message, "Success");
});

test("interpretSmplyStkResponse flags failed STK wording", () => {
  const result = interpretSmplyStkResponse({
    reference: "DEP-2",
    raw: { message: "Invalid phone number", status: "failed" },
  });
  assert.equal(result.status, "failed");
  assert.match(result.message, /Invalid phone/i);
});
