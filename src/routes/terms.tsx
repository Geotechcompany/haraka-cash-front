import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — HarakaCash" },
      {
        name: "description",
        content:
          "Terms for using HarakaCash digital loans in Kenya, including eligibility, fees, repayment, and liability.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated="13 July 2026">
      <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-foreground/80">
        These terms are a practical product template for HarakaCash. They are not a substitute for
        advice from Kenyan counsel. If you need a binding commercial agreement, have a lawyer review
        and adapt this text before you rely on it in production.
      </p>

      <LegalSection title="1. Who we are">
        <p>
          HarakaCash is a digital lending service operated from Nairobi, Kenya. We offer short-term
          consumer loans with fees shown before you accept, and payout to your M-Pesa number (or
          another payout channel we support at the time).
        </p>
        <p>
          Questions:{" "}
          <a href="mailto:help@harakacash.co.ke" className="text-foreground underline underline-offset-2">
            help@harakacash.co.ke
          </a>{" "}
          or the in-app Support form.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>To apply you must:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Be at least 18 years old and legally able to enter a contract in Kenya.</li>
          <li>Hold a valid Kenyan national ID (or other ID we accept for KYC).</li>
          <li>Use an active Safaricom M-Pesa number registered in your name (or another payout
            method we list at application).</li>
          <li>Create and maintain an account with accurate personal details.</li>
        </ul>
        <p>
          We may refuse an application, reduce an offer, or close access where we believe risk,
          fraud, sanctions, or regulatory rules require it.
        </p>
      </LegalSection>

      <LegalSection title="3. Account and access">
        <p>
          You sign in through our authentication provider (Clerk). You are responsible for keeping
          your phone, OTP codes, and login credentials private. Tell us promptly if you lose your
          device or suspect unauthorised use.
        </p>
        <p>
          Do not share your account, submit another person&apos;s ID as your own, or use the service
          for money laundering, fraud, or other unlawful activity.
        </p>
      </LegalSection>

      <LegalSection title="4. Loan application">
        <p>
          An application is a request for credit, not a guarantee of approval. We assess
          affordability and risk using information you provide, your repayment history with us (if
          any), and other signals we disclose in the product flow.
        </p>
        <p>
          Limits, tenors, and pricing can change. First-time limits may be lower than the maximum
          advertised on the site. A decision (approve, decline, or counter-offer) is shown in the
          app; declined applications do not create a loan.
        </p>
      </LegalSection>

      <LegalSection title="5. Fees and acceptance">
        <p>
          Before you accept a loan we show the principal, processing fee, interest (if any), total
          repayable, due date or schedule, and payout destination. By accepting you agree to that
          specific offer.
        </p>
        <p>
          The processing fee is charged as described in the offer screen (for example via M-Pesa STK
          push through our payment partner). Funds are disbursed only after the fee step required by
          that offer is completed successfully. We do not add undisclosed fees at payout.
        </p>
      </LegalSection>

      <LegalSection title="6. Disbursement">
        <p>
          Approved and accepted loans are sent to the M-Pesa number (or other channel) you confirmed.
          Timing is usually within minutes after acceptance and any required fee payment, but network
          delays, incorrect numbers, or processor outages can slow or fail a payout. If a transfer
          fails, contact Support with your application or loan reference; we will retry or reverse
          according to the payment trail.
        </p>
      </LegalSection>

      <LegalSection title="7. Repayment">
        <p>
          You must repay the total amount shown on your offer by the due date (or each instalment
          date). You may repay early with no early-repayment penalty unless an offer screen says
          otherwise.
        </p>
        <p>
          Repayments made through M-Pesa or other supported channels must use the reference or
          instructions we give you. Keep confirmation messages until the loan shows as settled in
          your dashboard.
        </p>
      </LegalSection>

      <LegalSection title="8. Late payment">
        <p>
          If you miss a due date we may charge a late fee and/or apply a daily or periodic charge as
          stated on your offer or in-app repayment screen before you accepted. We may also:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Send reminders by SMS, WhatsApp, email, or in-app notification.</li>
          <li>Limit new borrowing until arrears are cleared.</li>
          <li>Use lawful collection steps, including third-party collectors where permitted.</li>
        </ul>
        <p>
          Persistent default may affect your ability to borrow again with HarakaCash and, where we
          are required or permitted, may be reflected in credit reporting practices we use when those
          integrations are live.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to the service">
        <p>
          We may update features, fee ranges, partner processors, or these terms. Material changes
          to terms will be posted on this page with a new &quot;Last updated&quot; date. Continued
          use after that date means you accept the revised terms for new applications; existing
          loans stay on the terms and offer you accepted when you borrowed.
        </p>
      </LegalSection>

      <LegalSection title="10. Liability">
        <p>
          HarakaCash provides the service on an &quot;as available&quot; basis. To the fullest
          extent allowed under Kenyan law we are not liable for indirect, incidental, or
          consequential losses (including lost profits or business interruption) arising from use of
          the app, network failures, or third-party systems such as M-Pesa or payment gateways.
        </p>
        <p>
          Our aggregate liability for a claim related to a specific loan is limited to the fees you
          paid us on that loan, except where liability cannot be limited by law (for example fraud
          or personal injury caused by our negligence).
        </p>
      </LegalSection>

      <LegalSection title="11. Governing law">
        <p>
          These terms are governed by the laws of Kenya. Courts in Kenya have exclusive jurisdiction
          over disputes, without prejudice to any mandatory consumer rights you may have under
          Kenyan statute.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          HarakaCash · Nairobi, Kenya ·{" "}
          <a href="mailto:help@harakacash.co.ke" className="text-foreground underline underline-offset-2">
            help@harakacash.co.ke
          </a>{" "}
          · Support in the app · Phone listed on the Support page (0800 555 000).
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
