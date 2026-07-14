import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStkPushBody,
  buildWithdrawBody,
  fromStkTransactionId,
  getWalletBalancePath,
  interpretSmplyStkResponse,
  interpretSmplyWithdrawResponse,
  parseSmplyWebhook,
  planWalletReconcile,
  toSmplyPhoneNumber,
  toStkTransactionId,
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

test("toStkTransactionId brands internal payment references", () => {
  assert.equal(toStkTransactionId("DEP-TEST-1"), "HARAKA-CASH-KENYA-DEP-TEST-1");
  assert.equal(toStkTransactionId("FEE-ABC"), "HARAKA-CASH-KENYA-FEE-ABC");
  assert.equal(
    toStkTransactionId("HARAKA-CASH-KENYA-DEP-ALREADY"),
    "HARAKA-CASH-KENYA-DEP-ALREADY",
  );
});

test("fromStkTransactionId recovers internal refs from branded or bare ids", () => {
  assert.equal(fromStkTransactionId("HARAKA-CASH-KENYA-DEP-TEST-1"), "DEP-TEST-1");
  assert.equal(fromStkTransactionId("HARAKA CASH KENYA FEE-1"), "FEE-1");
  assert.equal(fromStkTransactionId("DEP-BARE"), "DEP-BARE");
});

test("buildStkPushBody uses branded Haraka Cash Kenya transactionId", () => {
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
      transactionId: "HARAKA-CASH-KENYA-DEP-TEST-1",
    },
  );
});

test("parseSmplyWebhook maps branded STK transactionId to internal reference", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-FEE-99-XYZ",
    status: "success",
    ResultCode: "0",
  });
  assert.equal(parsed.reference, "FEE-99-XYZ");
  assert.equal(parsed.status, "success");
});

test("parseSmplyWebhook treats branded deposit callback as success without confusing code:1", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-DEP-173935882861-SK4I8T",
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully.",
    MpesaReceiptNumber: "ABC123",
    code: 1,
    message: "Success",
  });
  assert.equal(parsed.reference, "DEP-173935882861-SK4I8T");
  assert.equal(parsed.status, "success");
  assert.equal(parsed.providerRef, "ABC123");
});

test("parseSmplyWebhook does not mark bare message Success as paid", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-DEP-PENDING",
    code: 1,
    message: "Success",
  });
  assert.equal(parsed.reference, "DEP-PENDING");
  assert.equal(parsed.status, "pending");
});

test("parseSmplyWebhook reads nested Body/stkCallback envelopes", () => {
  const parsed = parseSmplyWebhook({
    Body: {
      stkCallback: {
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        transactionId: "HARAKA-CASH-KENYA-DEP-NESTED-1",
      },
    },
  });
  assert.equal(parsed.reference, "DEP-NESTED-1");
  assert.equal(parsed.status, "success");
});

test("parseSmplyWebhook treats SmplypayCallback success shape as paid", () => {
  const parsed = parseSmplyWebhook({
    name: "Jane Doe",
    phoneNumber: "0757344328",
    amount: 500,
    projectCode: "WLT-CD-1MRWANZ",
    transactionId: "HARAKA-CASH-KENYA-FEE-ABC",
    receiptNumber: "QGH7X8Y9Z",
    action: "stk_callback",
    status: 0,
  });
  assert.equal(parsed.reference, "FEE-ABC");
  assert.equal(parsed.providerRef, "QGH7X8Y9Z");
  assert.equal(parsed.status, "success");
  assert.equal(parsed.amount, 500);
  assert.equal(parsed.phoneNumber, "0757344328");
  assert.equal(parsed.action, "stk_callback");
});

test("parseSmplyWebhook keeps status 1 without receipt as pending", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-DEP-PEND-2",
    phoneNumber: "0757344328",
    amount: 100,
    status: 1,
    message: "Success",
  });
  assert.equal(parsed.reference, "DEP-PEND-2");
  assert.equal(parsed.status, "pending");
});

test("parseSmplyWebhook treats SmplypayCallback failure status as failed", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-DEP-FAIL",
    status: 2,
    message: "Cancelled by user",
  });
  assert.equal(parsed.reference, "DEP-FAIL");
  assert.equal(parsed.status, "failed");
});

test("parseSmplyWebhook maps receiptNumber to providerRef", () => {
  const parsed = parseSmplyWebhook({
    receiptNumber: "QGH123456",
    transactionId: "HARAKA-CASH-KENYA-DEP-1",
    status: 0,
  });
  assert.equal(parsed.providerRef, "QGH123456");
  assert.equal(parsed.reference, "DEP-1");
});

test("parseSmplyWebhook reads nested transactionData JSON", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-DEP-TD",
    status: 1,
    transactionData: JSON.stringify({
      receiptNumber: "REC999",
      status: 0,
      ResultCode: 0,
    }),
  });
  assert.equal(parsed.providerRef, "REC999");
  assert.equal(parsed.status, "success");
});

test("parseSmplyWebhook accepts camelCase receiptNumber on Safaricom-style payload", () => {
  const parsed = parseSmplyWebhook({
    transactionId: "HARAKA-CASH-KENYA-DEP-CAMEL",
    receiptNumber: "XYZ987",
    ResultCode: 0,
    status: 1,
  });
  assert.equal(parsed.providerRef, "XYZ987");
  assert.equal(parsed.status, "success");
});

test("planWalletReconcile marks exact pending deposit matching wallet gap", () => {
  const plan = planWalletReconcile({
    walletBalance: 5,
    successfulDeposits: 0,
    successfulWithdrawals: 0,
    pendingDeposits: [
      { reference: "DEP-10", amount: 10, createdAt: "2026-01-01T00:00:00.000Z" },
      { reference: "DEP-5", amount: 5, createdAt: "2026-01-02T00:00:00.000Z" },
    ],
  });
  assert.deepEqual(plan.markSuccess, ["DEP-5"]);
});

test("planWalletReconcile never auto-marks withdrawals when books exceed wallet", () => {
  const plan = planWalletReconcile({
    walletBalance: 10,
    successfulDeposits: 15,
    successfulWithdrawals: 0,
    pendingDeposits: [],
    pendingWithdrawals: [
      { reference: "WD-5", amount: 5, createdAt: "2026-01-02T00:00:00.000Z" },
    ],
  });
  assert.deepEqual(plan.markSuccess, []);
  assert.match(plan.reason, /Withdrawals stay pending|exceed wallet/i);
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
