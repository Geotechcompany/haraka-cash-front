import type { ApplicationStatus } from "@/lib/models/application";
import type { LoanHistoryPoint, MonthlyLoanVolume } from "@/lib/models/analytics";

export const MONTHLY_LOAN_VOLUME: MonthlyLoanVolume[] = [
  { month: "Jan", volume: 2.1, applications: 320 },
  { month: "Feb", volume: 2.6, applications: 380 },
  { month: "Mar", volume: 3.1, applications: 420 },
  { month: "Apr", volume: 3.8, applications: 510 },
  { month: "May", volume: 4.4, applications: 580 },
  { month: "Jun", volume: 5.2, applications: 640 },
  { month: "Jul", volume: 6.1, applications: 720 },
  { month: "Aug", volume: 6.9, applications: 810 },
  { month: "Sep", volume: 7.8, applications: 880 },
];

export const USER_LOAN_HISTORY: LoanHistoryPoint[] = [
  { month: "Apr", borrowed: 8000, repaid: 8000 },
  { month: "May", borrowed: 12000, repaid: 12000 },
  { month: "Jun", borrowed: 15000, repaid: 15000 },
  { month: "Jul", borrowed: 10000, repaid: 10000 },
  { month: "Aug", borrowed: 20000, repaid: 14000 },
  { month: "Sep", borrowed: 25000, repaid: 8000 },
];

const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu", "Machakos",
  "Kajiado", "Kilifi", "Nyeri", "Meru", "Kakamega", "Bungoma", "Trans Nzoia",
  "Kericho", "Bomet", "Nandi", "Laikipia", "Muranga", "Kirinyaga",
];

const KENYAN_EMPLOYERS = [
  "Safaricom PLC", "Equity Bank", "KCB Group", "Kenya Airways", "Bidco Africa",
  "East African Breweries", "Britam", "Jumia Kenya", "Twiga Foods", "M-KOPA",
  "Sendy", "Cellulant", "iPay Africa", "Kenya Power", "Tuskys", "Naivas",
];

const FIRST_NAMES = ["Wanjiru", "Otieno", "Kamau", "Achieng", "Mutua", "Njeri", "Kiprop", "Wambui", "Omondi", "Mwangi", "Chebet", "Kariuki", "Adhiambo", "Kiptoo", "Nyambura", "Waweru"];
const LAST_NAMES = ["Mwangi", "Odhiambo", "Kariuki", "Kimani", "Ochieng", "Ndegwa", "Wanjala", "Ruto", "Kenyatta", "Muthoni", "Onyango", "Chege", "Wafula", "Owino"];

let seed = 42;
function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function pickS<T>(a: T[]) { return a[Math.floor(rand() * a.length)]; }

export const SEED_APPLICATIONS = Array.from({ length: 24 }).map((_, i) => {
  const amount = [5000, 10000, 15000, 20000, 30000, 50000, 75000, 100000][Math.floor(rand() * 8)];
  const status = pickS<ApplicationStatus>(["Pending", "Approved", "Approved", "Declined", "Completed", "Disbursing"]);
  const eligibility = Math.floor(45 + rand() * 55);
  return {
    id: `HC-${(10234 + i).toString()}`,
    applicant: `${pickS(FIRST_NAMES)} ${pickS(LAST_NAMES)}`,
    phone: `07${Math.floor(10 + rand() * 89)} ${Math.floor(100 + rand() * 899)} ${Math.floor(100 + rand() * 899)}`,
    county: pickS(KENYAN_COUNTIES),
    employer: pickS(KENYAN_EMPLOYERS),
    monthlyIncome: Math.round((25000 + rand() * 200000) / 1000) * 1000,
    amount,
    months: [1, 2, 3, 6, 12][Math.floor(rand() * 5)],
    purpose: pickS(["Business", "School Fees", "Medical", "Rent", "Emergency", "Personal"]),
    eligibilityScore: eligibility,
    riskScore: 100 - eligibility,
    status,
    createdAt: new Date(Date.now() - i * 86400000 * (0.4 + rand())).toISOString(),
  };
});

export const SEED_NOTIFICATIONS = [
  { title: "Offer ready", body: "Your KES 25,000 loan has been pre-approved.", type: "success" as const, unread: true },
  { title: "Repayment reminder", body: "KES 4,200 due on 12 Oct 2026.", type: "warning" as const, unread: true },
  { title: "Verification complete", body: "Your identity has been verified.", type: "info" as const, unread: false },
  { title: "Loan disbursed", body: "KES 15,000 sent to M-Pesa.", type: "success" as const, unread: false },
  { title: "Application received", body: "We are reviewing your application HC-10236.", type: "info" as const, unread: false },
];
