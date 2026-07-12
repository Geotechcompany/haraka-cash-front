import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — HarakaCash" },
      {
        name: "description",
        content:
          "How HarakaCash collects, uses, and stores personal data for digital lending in Kenya.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="13 July 2026">
      <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-foreground/80">
        This policy describes how HarakaCash handles personal data when you use our website and app.
        It is a product-facing template, not a certified legal opinion. Have counsel align it with
        the Kenya Data Protection Act, 2019 and your actual processors before go-live.
      </p>

      <LegalSection title="1. Who controls your data">
        <p>
          HarakaCash (Nairobi, Kenya) determines why and how personal data is processed for lending,
          accounts, and support. Contact:{" "}
          <a href="mailto:help@harakacash.co.ke" className="text-foreground underline underline-offset-2">
            help@harakacash.co.ke
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Data we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-foreground">Identity:</span> name, national ID or other
            KYC documents, date of birth, and photos or scans you upload for verification.
          </li>
          <li>
            <span className="font-medium text-foreground">Contact &amp; M-Pesa:</span> phone number,
            email, and the M-Pesa MSISDN used for disbursement and repayment.
          </li>
          <li>
            <span className="font-medium text-foreground">Application &amp; loan data:</span> amount
            requested, tenure, income or affordability answers, offers shown, acceptances, balances,
            repayment history, and support tickets.
          </li>
          <li>
            <span className="font-medium text-foreground">Account auth:</span> authentication records
            managed by Clerk (sign-in events, session tokens, and profile fields synced to our
            backend).
          </li>
          <li>
            <span className="font-medium text-foreground">Device &amp; cookies:</span> IP address,
            browser type, basic diagnostics, theme preference, and cookie consent choice. See
            Cookies below.
          </li>
          <li>
            <span className="font-medium text-foreground">Payments:</span> transaction references,
            amounts, status, and phone numbers sent to our payment processors for STK push and
            settlement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Create and secure your account.</li>
          <li>Underwrite applications and present loan offers.</li>
          <li>Collect fees, disburse funds to M-Pesa, and record repayments.</li>
          <li>Send service messages (OTP, offer status, repayment reminders).</li>
          <li>Handle support tickets and investigate fraud or abuse.</li>
          <li>Meet bookkeeping, audit, and regulatory obligations where they apply.</li>
        </ul>
        <p>
          We rely on contract performance (providing the loan service you request), legitimate
          interests such as fraud prevention and product security, and consent where the law
          requires it (for example non-essential cookies).
        </p>
      </LegalSection>

      <LegalSection title="4. Auth, payments, and processors">
        <p>
          <span className="font-medium text-foreground">Clerk</span> authenticates users and may
          process email, phone, and session data under their terms and privacy policy.
        </p>
        <p>
          <span className="font-medium text-foreground">Smply Pay</span> and{" "}
          <span className="font-medium text-foreground">M-Pesa (Safaricom)</span> process payment
          instructions (including STK push) using the phone number and amounts you confirm. They
          receive only what is needed to complete or reconcile a transaction.
        </p>
        <p>
          Hosting, database, and email providers we use may store encrypted or access-controlled
          copies of application data solely to run the service. We do not sell your personal data.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention">
        <p>
          Account and loan records are kept for as long as your account is active and for a further
          period needed for disputes, recovery, tax, and regulatory retention (often several years
          after the last activity on a loan). Support tickets are retained while useful for the
          enquiry and audit. Auth session cookies expire according to Clerk&apos;s session settings.
          You can ask us to delete or anonymise data that is no longer required; we will say when
          law requires us to keep a copy.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights">
        <p>Under the Kenya Data Protection Act you may request to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate details.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Request deletion where the law allows.</li>
          <li>Withdraw consent for processing that relies on consent (this does not undo processing
            already done lawfully).</li>
        </ul>
        <p>
          Email{" "}
          <a href="mailto:help@harakacash.co.ke" className="text-foreground underline underline-offset-2">
            help@harakacash.co.ke
          </a>{" "}
          or open a Support ticket. We may need to verify your identity before responding. You may
          also complain to the Office of the Data Protection Commissioner (ODPC) in Kenya.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies">
        <p>We use:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-foreground">Essential:</span> sign-in and session
            security (Clerk), CSRF/session continuity, and load balancing where applicable.
          </li>
          <li>
            <span className="font-medium text-foreground">Preferences:</span> theme (light/dark) and
            your cookie consent choice stored in <code className="text-xs">localStorage</code> as{" "}
            <code className="text-xs">haraka-cookie-consent</code>.
          </li>
        </ul>
        <p>
          We do not currently run third-party advertising or analytics pixels. If we add them later,
          we will update this section and ask again where consent is required. You can change cookie
          preference by clearing site data for HarakaCash; the consent banner will return.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use HTTPS, access controls on admin tools, and processor-side safeguards. No online
          service is perfectly secure; protect your phone and OTPs, and contact us if you suspect
          misuse.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We will post updates on this page with a new date. For significant changes that affect
          rights, we may also notify you in-app or by email when practical.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Privacy enquiries:{" "}
          <a href="mailto:help@harakacash.co.ke" className="text-foreground underline underline-offset-2">
            help@harakacash.co.ke
          </a>
          . Product support:{" "}
          <Link to="/support" className="text-foreground underline underline-offset-2">
            Support
          </Link>
          . Related:{" "}
          <Link to="/terms" className="text-foreground underline underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
