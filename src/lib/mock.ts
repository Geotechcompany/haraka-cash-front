export const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu", "Machakos",
  "Kajiado", "Kilifi", "Nyeri", "Meru", "Kakamega", "Bungoma", "Trans Nzoia",
  "Kericho", "Bomet", "Nandi", "Laikipia", "Muranga", "Kirinyaga",
];

export const KENYAN_EMPLOYERS = [
  "Safaricom PLC", "Equity Bank", "KCB Group", "Kenya Airways", "Bidco Africa",
  "East African Breweries", "Britam", "Jumia Kenya", "Twiga Foods", "M-KOPA",
  "Sendy", "Cellulant", "iPay Africa", "Kenya Power", "Tuskys", "Naivas",
];

export const FIRST_NAMES = ["Wanjiru", "Otieno", "Kamau", "Achieng", "Mutua", "Njeri", "Kiprop", "Wambui", "Omondi", "Mwangi", "Chebet", "Kariuki", "Adhiambo", "Kiptoo", "Nyambura", "Waweru"];
export const LAST_NAMES = ["Mwangi", "Odhiambo", "Kariuki", "Kimani", "Ochieng", "Ndegwa", "Wanjala", "Ruto", "Kenyatta", "Muthoni", "Onyango", "Chege", "Wafula", "Owino"];

export function ksh(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) / 100) * 100;
}
function pick<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }

export function mockPhone() {
  const prefix = pick(["0711", "0722", "0733", "0740", "0754", "0768", "0790", "0798"]);
  return `${prefix} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
}

export type ApplicationStatus = "Pending" | "Approved" | "Declined" | "Completed" | "Disbursing";

export interface Application {
  id: string;
  applicant: string;
  phone: string;
  county: string;
  employer: string;
  monthlyIncome: number;
  amount: number;
  months: number;
  purpose: string;
  eligibilityScore: number;
  riskScore: number;
  status: ApplicationStatus;
  createdAt: string;
}

let seed = 42;
function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function pickS<T>(a: T[]) { return a[Math.floor(rand() * a.length)]; }

export const APPLICATIONS: Application[] = Array.from({ length: 24 }).map((_, i) => {
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

export const MONTHLY_LOAN_VOLUME = [
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

export const USER_LOAN_HISTORY = [
  { month: "Apr", borrowed: 8000, repaid: 8000 },
  { month: "May", borrowed: 12000, repaid: 12000 },
  { month: "Jun", borrowed: 15000, repaid: 15000 },
  { month: "Jul", borrowed: 10000, repaid: 10000 },
  { month: "Aug", borrowed: 20000, repaid: 14000 },
  { month: "Sep", borrowed: 25000, repaid: 8000 },
];

export const NOTIFICATIONS = [
  { id: 1, title: "Offer ready", body: "Your KES 25,000 loan has been pre-approved.", time: "2m ago", type: "success" as const, unread: true },
  { id: 2, title: "Repayment reminder", body: "KES 4,200 due on 12 Oct 2026.", time: "1h ago", type: "warning" as const, unread: true },
  { id: 3, title: "Verification complete", body: "Your identity has been verified.", time: "Yesterday", type: "info" as const, unread: false },
  { id: 4, title: "Loan disbursed", body: "KES 15,000 sent to M-Pesa 0722 •••• 341.", time: "3d ago", type: "success" as const, unread: false },
  { id: 5, title: "Application received", body: "We are reviewing your application HC-10236.", time: "5d ago", type: "info" as const, unread: false },
];

export const ASSESSMENT_STEPS = [
  "Identity Verification",
  "Application Review",
  "Employment Check",
  "Income Assessment",
  "Existing Loans Check",
  "Repayment Behaviour",
  "Credit Assessment Simulation",
  "Risk Indicators",
  "Internal Rules Engine",
  "Calculating Score",
  "Determining Eligibility",
];
