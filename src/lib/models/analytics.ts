export type MonthlyLoanVolume = {
  month: string;
  volume: number;
  applications: number;
};

export type LoanHistoryPoint = {
  month: string;
  borrowed: number;
  repaid: number;
};

export type LoanHistoryRecord = {
  clerkUserId: string;
  points: LoanHistoryPoint[];
};
