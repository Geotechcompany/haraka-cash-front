import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Upload, Loader2, CheckCircle2, Wallet, Banknote } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { isDraftWorthSaving } from "@/lib/application-draft";
import { computeAffordabilityCeiling } from "@/lib/assessment-policy";
import { buildLoanQuote, kes } from "@/lib/loan";
import { kenyanNationalIdError, kenyanPhoneError } from "@/lib/kenya-format";
import { cn } from "@/lib/utils";
import {
  clampRepaymentMonths,
  DEFAULT_PRODUCT_TYPE,
  DEFAULT_REPAYMENT_MONTHS,
  defaultAmountForProduct,
  formatRepaymentMonths,
  formatRepaymentPeriod,
  parseProductTypeFromSearch,
  productTypeLabel,
  type ProductType,
} from "@/lib/lending-products";
import {
  createApplication,
  getApplicationDraft,
  getCurrentUser,
  saveApplicationDraft,
} from "@/server/applications";
import { generateLoanQuote, type GeneratedLoanQuote } from "@/server/quote";
import { getPublicLendingPolicy } from "@/server/settings";

const applySearchSchema = z.object({
  product: z.string().optional(),
  type: z.string().optional(),
});

export const Route = createFileRoute("/apply")({
  validateSearch: applySearchSchema,
  loaderDeps: ({ search }) => ({
    product: search?.product,
    type: search?.type,
  }),
  loader: async ({ deps }) => {
    const [user, lendingPolicy, draft] = await Promise.all([
      getCurrentUser(),
      getPublicLendingPolicy(),
      getApplicationDraft(),
    ]);
    const preselectedProduct = parseProductTypeFromSearch(deps);
    return { user, lendingPolicy, draft, preselectedProduct };
  },
  head: ({ loaderData }) => {
    const isSalaryAdvance = loaderData?.preselectedProduct === "salary_advance";
    return {
      meta: [
        {
          title: isSalaryAdvance
            ? "Apply for salary advance — HarakaCash"
            : "Apply for a loan — HarakaCash",
        },
        {
          name: "description",
          content: isSalaryAdvance
            ? "Request a salary advance repaid on your next pay. M-Pesa payout after approval and CRB clearance."
            : "Apply for a personal loan with clear fees and M-Pesa payout after approval.",
        },
      ],
    };
  },
  component: ApplyPage,
});

const steps = [
  { key: "personal", title: "Personal", desc: "Confirm your details" },
  { key: "employment", title: "Employment", desc: "Where you work" },
  { key: "financial", title: "Financial", desc: "Income & expenses" },
  { key: "request", title: "Loan Request", desc: "Amount & purpose" },
  { key: "documents", title: "Documents", desc: "Upload verification" },
] as const;

type FormState = {
  fullName: string;
  nationalId: string;
  phone: string;
  mpesaNumber: string;
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  yearsAtEmployer: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  existingLoans: string;
  rentMortgage: string;
  purpose: string;
  additionalDetails: string;
  idDocumentName: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function ApplyPage() {
  const { user, lendingPolicy, draft } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const createApplicationFn = useServerFn(createApplication);
  const saveApplicationDraftFn = useServerFn(saveApplicationDraft);
  const generateLoanQuoteFn = useServerFn(generateLoanQuote);
  const urlProductType = parseProductTypeFromSearch(search);
  const policyDefaultAmount = Math.min(
    Math.max(10_000, lendingPolicy.minLoanAmount),
    lendingPolicy.maxLoanAmount,
  );
  const initialProductType: ProductType =
    draft?.productType ?? urlProductType ?? DEFAULT_PRODUCT_TYPE;
  const defaultAmount = defaultAmountForProduct(
    initialProductType,
    policyDefaultAmount,
    lendingPolicy.minLoanAmount,
  );
  const [productType, setProductType] = useState<ProductType>(initialProductType);
  const [step, setStep] = useState(() => draft?.step ?? 0);
  const [amount, setAmount] = useState(() => draft?.amount ?? defaultAmount);
  const [amountInput, setAmountInput] = useState(() =>
    String(draft?.amount ?? defaultAmount),
  );
  const [months, setMonths] = useState(() =>
    clampRepaymentMonths(draft?.months ?? DEFAULT_REPAYMENT_MONTHS),
  );
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [quoteUpdating, setQuoteUpdating] = useState(false);
  const [serverQuote, setServerQuote] = useState<GeneratedLoanQuote | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftHydrated, setDraftHydrated] = useState(!draft);
  const skipNextAutosaveRef = useRef(Boolean(draft));
  const restoredToastShownRef = useRef(false);

  const [form, setForm] = useState<FormState>(() => ({
    fullName: draft?.form.fullName || user?.name || "",
    nationalId: draft?.form.nationalId ?? "",
    phone: draft?.form.phone || user?.phone || "",
    mpesaNumber: draft?.form.mpesaNumber || user?.phone || "",
    employmentStatus: draft?.form.employmentStatus || "Employed",
    employer: draft?.form.employer ?? "",
    jobTitle: draft?.form.jobTitle ?? "",
    yearsAtEmployer: draft?.form.yearsAtEmployer ?? "",
    monthlyIncome: draft?.form.monthlyIncome ?? "",
    monthlyExpenses: draft?.form.monthlyExpenses ?? "",
    existingLoans: draft?.form.existingLoans ?? "",
    rentMortgage: draft?.form.rentMortgage ?? "",
    purpose: draft?.form.purpose || "Business",
    additionalDetails: draft?.form.additionalDetails ?? "",
    idDocumentName: draft?.form.idDocumentName ?? "",
  }));

  const latestDraftRef = useRef({
    step: draft?.step ?? 0,
    amount: draft?.amount ?? defaultAmount,
    months: clampRepaymentMonths(draft?.months ?? DEFAULT_REPAYMENT_MONTHS),
    productType: initialProductType,
    form,
  });

  const localQuote = useMemo(
    () =>
      buildLoanQuote(amount, months, {
        monthlyInterestRatePercent: lendingPolicy.monthlyInterestRate,
        minProcessingFee: lendingPolicy.minProcessingFee,
      }),
    [amount, lendingPolicy.minProcessingFee, lendingPolicy.monthlyInterestRate, months],
  );

  /** Money always from local policy math; server may add notes / riskBand. */
  const quote = {
    ...localQuote,
    notes: serverQuote?.notes,
    riskBand: serverQuote?.riskBand,
    source: serverQuote?.source ?? ("local" as const),
  };

  const maxEligiblePrincipal = useMemo(() => {
    const income = Number(form.monthlyIncome);
    if (!Number.isFinite(income) || income <= 0) return null;
    const expenses = Number(form.monthlyExpenses);
    const loans = Number(form.existingLoans);
    const rent = Number(form.rentMortgage);
    const ceiling = computeAffordabilityCeiling({
      profile: {
        monthlyIncome: income,
        monthlyExpenses: Number.isFinite(expenses) ? expenses : 0,
        existingLoans: Number.isFinite(loans) ? loans : 0,
        rentMortgage: Number.isFinite(rent) ? rent : 0,
      },
      minLoanAmount: lendingPolicy.minLoanAmount,
      maxLoanAmount: lendingPolicy.maxLoanAmount,
      months,
      monthlyInterestRatePercent: lendingPolicy.monthlyInterestRate,
      minProcessingFee: lendingPolicy.minProcessingFee,
    });
    if (ceiling < lendingPolicy.minLoanAmount) return null;
    return ceiling;
  }, [
    form.monthlyIncome,
    form.monthlyExpenses,
    form.existingLoans,
    form.rentMortgage,
    lendingPolicy.maxLoanAmount,
    lendingPolicy.minLoanAmount,
    lendingPolicy.minProcessingFee,
    lendingPolicy.monthlyInterestRate,
    months,
  ]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const errors = useMemo(() => validateStep(step, form), [step, form]);
  const stepValid = Object.keys(errors).length === 0;

  const clampAmountToPolicy = (raw: number) =>
    Math.min(
      Math.max(Math.round(raw), lendingPolicy.minLoanAmount),
      lendingPolicy.maxLoanAmount,
    );

  const setAmountSynced = (next: number) => {
    const clamped = clampAmountToPolicy(next);
    setAmount(clamped);
    setAmountInput(String(clamped));
  };

  const onAmountInputChange = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    setAmountInput(digits);
    if (digits === "") return;
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= lendingPolicy.minLoanAmount && parsed <= lendingPolicy.maxLoanAmount) {
      setAmount(Math.round(parsed));
    }
  };

  const onAmountInputBlur = () => {
    if (amountInput.trim() === "") {
      setAmountSynced(amount);
      return;
    }
    const parsed = Number(amountInput);
    setAmountSynced(Number.isFinite(parsed) ? parsed : amount);
  };

  const onProductTypeChange = (next: ProductType) => {
    setProductType(next);
    setMonths(DEFAULT_REPAYMENT_MONTHS);
    const nextDefault = defaultAmountForProduct(
      next,
      policyDefaultAmount,
      lendingPolicy.minLoanAmount,
    );
    if (next === "salary_advance" && amount > nextDefault) {
      setAmountSynced(nextDefault);
    }
  };

  useEffect(() => {
    if (draft?.productType) return;
    if (!urlProductType || urlProductType === productType) return;
    onProductTypeChange(urlProductType);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync URL preselect once on load
  }, [urlProductType]);

  useEffect(() => {
    setAttempted(false);
  }, [step]);

  useEffect(() => {
    if (!draft) {
      setDraftHydrated(true);
      return;
    }
    if (!restoredToastShownRef.current) {
      restoredToastShownRef.current = true;
      toast.message("Draft restored");
    }
    skipNextAutosaveRef.current = true;
    setDraftHydrated(true);
  }, [draft]);

  useEffect(() => {
    latestDraftRef.current = { step, amount, months, productType, form };
  }, [step, amount, months, productType, form]);

  useEffect(() => {
    if (!user || !draftHydrated) return;

    const worthSaving = isDraftWorthSaving({
      step,
      amount,
      months,
      productType,
      form,
      defaultAmount,
    });
    if (!worthSaving) return;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveStatus("saving");
      void saveApplicationDraftFn({ data: { step, amount, months, productType, form } })
        .then(() => {
          setSaveStatus("saved");
        })
        .catch(() => {
          setSaveStatus("error");
        });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    user,
    draftHydrated,
    step,
    amount,
    months,
    productType,
    form,
    defaultAmount,
    saveApplicationDraftFn,
  ]);

  useEffect(() => {
    if (!user) return;

    const flushDraft = () => {
      const snapshot = latestDraftRef.current;
      if (
        !isDraftWorthSaving({
          step: snapshot.step,
          amount: snapshot.amount,
          months: snapshot.months,
          productType: snapshot.productType,
          form: snapshot.form,
          defaultAmount,
        })
      ) {
        return;
      }
      void saveApplicationDraftFn({
        data: {
          step: snapshot.step,
          amount: snapshot.amount,
          months: snapshot.months,
          productType: snapshot.productType,
          form: snapshot.form,
        },
      }).catch(() => {
        /* best-effort flush on leave */
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushDraft);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushDraft);
    };
  }, [user, defaultAmount, saveApplicationDraftFn]);

  useEffect(() => {
    const income = Number(form.monthlyIncome);
    const expenses = Number(form.monthlyExpenses);
    const loans = Number(form.existingLoans);
    const rent = Number(form.rentMortgage);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setQuoteUpdating(true);
      try {
        const next = await generateLoanQuoteFn({
          data: {
            amount,
            months,
            monthlyIncome: Number.isFinite(income) ? income : undefined,
            monthlyExpenses: Number.isFinite(expenses) ? expenses : undefined,
            existingLoans: Number.isFinite(loans) ? loans : undefined,
            rentMortgage: Number.isFinite(rent) ? rent : undefined,
            employmentStatus: form.employmentStatus || undefined,
            purpose: form.purpose || undefined,
          },
        });
        if (!cancelled) setServerQuote(next);
      } catch {
        if (!cancelled) {
          setServerQuote({
            ...buildLoanQuote(amount, months, {
              monthlyInterestRatePercent: lendingPolicy.monthlyInterestRate,
              minProcessingFee: lendingPolicy.minProcessingFee,
            }),
            source: "local",
          });
        }
      } finally {
        if (!cancelled) setQuoteUpdating(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    amount,
    months,
    form.monthlyIncome,
    form.monthlyExpenses,
    form.existingLoans,
    form.rentMortgage,
    form.employmentStatus,
    form.purpose,
    generateLoanQuoteFn,
    lendingPolicy.monthlyInterestRate,
    lendingPolicy.minProcessingFee,
  ]);

  const next = () => {
    setAttempted(true);
    if (!stepValid) return;
    setStep((s) => (s < steps.length - 1 ? s + 1 : s));
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    setAttempted(true);
    if (!stepValid) return;
    setSubmitting(true);
    try {
      const application = await createApplicationFn({
        data: {
          amount,
          months,
          productType,
          purpose: form.purpose,
          phone: form.phone.trim(),
          mpesaNumber: form.mpesaNumber.trim(),
          employer: form.employer.trim(),
          employmentStatus: form.employmentStatus.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          yearsAtEmployer: Number(form.yearsAtEmployer) || undefined,
          monthlyIncome: Number(form.monthlyIncome) || 0,
          monthlyExpenses: Number(form.monthlyExpenses) || 0,
          existingLoans: Number(form.existingLoans) || 0,
          rentMortgage: Number(form.rentMortgage) || 0,
          quote: {
            amount: quote.amount,
            months: quote.months,
            fee: quote.fee,
            interest: quote.interest,
            totalPayable: quote.totalPayable,
            monthly: quote.monthly,
          },
        },
      });
      navigate({ to: "/assessment", search: { applicationId: application.id } });
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (key: keyof FormState) => {
    const message = errors[key];
    if (!message) return undefined;
    if (attempted) return message;
    const value = form[key];
    if (value.trim() !== "" && (key === "phone" || key === "mpesaNumber" || key === "nationalId")) {
      return message;
    }
    return undefined;
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Apply for {productType === "salary_advance" ? "a salary advance" : "a loan"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {productType === "salary_advance"
                  ? "Short-term cash against your next salary, repaid in one month."
                  : "Answer a few quick questions to get a decision."}
              </p>
            </div>
            {user && saveLabel ? (
              <p
                className={cn(
                  "mt-1 shrink-0 text-xs font-medium",
                  saveStatus === "error" ? "text-destructive" : "text-muted-foreground",
                  saveStatus === "saving" && "animate-pulse",
                )}
                aria-live="polite"
              >
                {saveLabel}
              </p>
            ) : null}
          </div>
        </div>

        <ol className="hidden md:flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0",
                  i < step
                    ? "bg-success text-white"
                    : i === step
                      ? "gradient-brand text-white shadow-soft"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <div className="min-w-0 hidden lg:block">
                <p
                  className={cn(
                    "text-xs font-semibold truncate",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("flex-1 h-px", i < step ? "bg-success" : "bg-border")} />
              )}
            </li>
          ))}
        </ol>
        <div className="md:hidden mb-6">
          <div className="flex justify-between text-xs mb-2 font-medium">
            <span>
              Step {step + 1} of {steps.length}
            </span>
            <span className="text-muted-foreground">{steps[step].title}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full gradient-brand"
              animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="card-soft p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-semibold">{steps[step].title}</h2>
                  <p className="text-sm text-muted-foreground">{steps[step].desc}</p>
                </div>

                {step === 0 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Product type</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ProductTypeOption
                          selected={productType === "personal_loan"}
                          onSelect={() => onProductTypeChange("personal_loan")}
                          icon={Wallet}
                          title="Personal loan"
                          description="For business, school fees, rent, or emergencies. Repaid in one month."
                        />
                        <ProductTypeOption
                          selected={productType === "salary_advance"}
                          onSelect={() => onProductTypeChange("salary_advance")}
                          icon={Banknote}
                          title="Salary advance"
                          description="Cash until your next pay day. One-month term, M-Pesa payout."
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Full name"
                      name="fullName"
                      placeholder="Your full name"
                      value={form.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                      required
                      error={showError("fullName")}
                    />
                    <Field
                      label="National ID"
                      name="nationalId"
                      placeholder="12345678"
                      inputMode="numeric"
                      value={form.nationalId}
                      onChange={(e) => setField("nationalId", e.target.value)}
                      required
                      error={showError("nationalId")}
                    />
                    <Field
                      label="Phone"
                      name="phone"
                      placeholder="07xx xxx xxx"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      required
                      error={showError("phone")}
                    />
                    <Field
                      label="M-Pesa number"
                      name="mpesaNumber"
                      placeholder="07xx xxx xxx"
                      inputMode="tel"
                      value={form.mpesaNumber}
                      onChange={(e) => setField("mpesaNumber", e.target.value)}
                      required
                      error={showError("mpesaNumber")}
                    />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="employmentStatus">
                        Employment status <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.employmentStatus}
                        onValueChange={(v) => setField("employmentStatus", v)}
                      >
                        <SelectTrigger id="employmentStatus" className="h-11 rounded-xl">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Employed",
                            "Self-employed",
                            "Business owner",
                            "Contract",
                            "Casual",
                          ].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showError("employmentStatus") && (
                        <p className="text-xs text-destructive">{showError("employmentStatus")}</p>
                      )}
                    </div>
                    <Field
                      label="Employer"
                      name="employer"
                      placeholder="Company name"
                      value={form.employer}
                      onChange={(e) => setField("employer", e.target.value)}
                      required
                      error={showError("employer")}
                    />
                    <Field
                      label="Job title"
                      name="jobTitle"
                      placeholder="Your role"
                      value={form.jobTitle}
                      onChange={(e) => setField("jobTitle", e.target.value)}
                      required
                      error={showError("jobTitle")}
                    />
                    <Field
                      label="Years at employer"
                      name="yearsAtEmployer"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={form.yearsAtEmployer}
                      onChange={(e) => setField("yearsAtEmployer", e.target.value)}
                      required
                      error={showError("yearsAtEmployer")}
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Monthly income (KES)"
                      name="monthlyIncome"
                      type="number"
                      min={1}
                      placeholder="0"
                      value={form.monthlyIncome}
                      onChange={(e) => setField("monthlyIncome", e.target.value)}
                      required
                      error={showError("monthlyIncome")}
                    />
                    <Field
                      label="Monthly expenses (KES)"
                      name="monthlyExpenses"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.monthlyExpenses}
                      onChange={(e) => setField("monthlyExpenses", e.target.value)}
                      required
                      error={showError("monthlyExpenses")}
                    />
                    <Field
                      label="Existing loans (KES)"
                      name="existingLoans"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.existingLoans}
                      onChange={(e) => setField("existingLoans", e.target.value)}
                      required
                      error={showError("existingLoans")}
                    />
                    <Field
                      label="Rent / mortgage (KES)"
                      name="rentMortgage"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.rentMortgage}
                      onChange={(e) => setField("rentMortgage", e.target.value)}
                      required
                      error={showError("rentMortgage")}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    {productType === "salary_advance" ? (
                      <p className="rounded-xl border border-primary/20 bg-primary-soft/40 px-4 py-3 text-sm text-muted-foreground">
                        This advance is repaid from your next salary within one month. Amount should
                        fit what you can clear on pay day.
                      </p>
                    ) : null}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <Label htmlFor="loanAmount">Loan amount (KES)</Label>
                        <div className="relative w-full sm:w-44">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            KES
                          </span>
                          <Input
                            id="loanAmount"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            className="h-11 rounded-xl pl-12 text-right tabular-nums text-lg font-bold"
                            value={amountInput}
                            onChange={(e) => onAmountInputChange(e.target.value)}
                            onBlur={onAmountInputBlur}
                            aria-describedby="loanAmountHint"
                          />
                        </div>
                      </div>
                      <Slider
                        value={[amount]}
                        onValueChange={([v]) => setAmountSynced(v)}
                        min={lendingPolicy.minLoanAmount}
                        max={lendingPolicy.maxLoanAmount}
                        step={500}
                      />
                      <div
                        id="loanAmountHint"
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>{kes(lendingPolicy.minLoanAmount)}</span>
                        <span>{kes(lendingPolicy.maxLoanAmount)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label>Repayment period</Label>
                        <span className="text-lg font-bold">{formatRepaymentMonths(months)}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        All HarakaCash products repay in one month.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="purpose">
                        Loan purpose <span className="text-destructive">*</span>
                      </Label>
                      <Select value={form.purpose} onValueChange={(v) => setField("purpose", v)}>
                        <SelectTrigger id="purpose" className="h-11 rounded-xl">
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Business",
                            "School Fees",
                            "Medical",
                            "Rent",
                            "Emergency",
                            "Personal",
                          ].map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showError("purpose") && (
                        <p className="text-xs text-destructive">{showError("purpose")}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="additionalDetails">Additional details</Label>
                      <Textarea
                        id="additionalDetails"
                        className="mt-1.5 rounded-xl"
                        rows={3}
                        placeholder="Optional context for our review team"
                        value={form.additionalDetails}
                        onChange={(e) => setField("additionalDetails", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="grid gap-3">
                    <label
                      className={cn(
                        "card-soft p-5 text-left hover:border-primary hover:shadow-elevated transition-all group cursor-pointer block",
                        showError("idDocumentName") && "border-destructive",
                      )}
                    >
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="sr-only"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setField("idDocumentName", file?.name ?? "");
                        }}
                      />
                      <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center group-hover:scale-105 transition-transform">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-3 font-semibold">
                        National ID <span className="text-destructive">*</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Front & back photo</p>
                      <p className="mt-2 text-xs text-primary font-medium">
                        {form.idDocumentName
                          ? `Selected: ${form.idDocumentName}`
                          : "Click to upload"}
                      </p>
                      {showError("idDocumentName") && (
                        <p className="mt-2 text-xs text-destructive">{showError("idDocumentName")}</p>
                      )}
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex flex-col gap-2">
              {attempted && !stepValid && (
                <p className="text-xs text-destructive text-right">
                  Fix the highlighted fields before continuing.
                </p>
              )}
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={back} className="rounded-xl h-11">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                )}
                <div className="ml-auto">
                  {step < steps.length - 1 ? (
                    <Button
                      onClick={next}
                      aria-disabled={!stepValid}
                      className={cn(
                        "rounded-xl h-11 gradient-brand text-white font-semibold shadow-soft",
                        !stepValid && "opacity-70",
                      )}
                    >
                      Continue <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      disabled={submitting}
                      aria-disabled={!stepValid || submitting}
                      onClick={submit}
                      className={cn(
                        "rounded-xl h-11 gradient-brand text-white font-semibold shadow-soft",
                        !stepValid && "opacity-70",
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit application"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="card-soft p-6 h-fit sticky top-24">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-muted-foreground">Your quote</p>
              {quoteUpdating && (
                <span className="text-[11px] text-muted-foreground animate-pulse">
                  Updating quote…
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{productTypeLabel(productType)}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{kes(quote.amount)}</p>
            <p className="text-xs text-muted-foreground">{formatRepaymentPeriod(quote.months)}</p>
            <div className="mt-5 space-y-3 text-sm">
              <Row label="Principal" value={kes(quote.amount)} />
              <Row label={`Interest (${quote.months}mo)`} value={kes(quote.interest)} />
              <Row label="Processing fee" value={kes(quote.fee)} />
              <div className="h-px bg-border my-1" />
              <Row label="Monthly payment" value={kes(quote.monthly)} bold />
              <Row label="Total payable" value={kes(quote.totalPayable)} bold />
            </div>
            {quote.notes && (
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{quote.notes}</p>
            )}
            {maxEligiblePrincipal != null && maxEligiblePrincipal > amount && (
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Based on your finances, you may qualify for up to {kes(maxEligiblePrincipal)}.
              </p>
            )}
            <p className="mt-5 text-xs text-muted-foreground">
              Final terms subject to eligibility assessment.
            </p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function requiredText(value: string, label: string) {
  if (!value.trim()) return `${label} is required`;
  return null;
}

function requiredNonNegative(value: string, label: string) {
  if (value.trim() === "") return `${label} is required`;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return `Enter a valid ${label.toLowerCase()}`;
  return null;
}

function validateStep(step: number, form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    const nameErr = requiredText(form.fullName, "Full name");
    if (nameErr) errors.fullName = nameErr;
    const idErr = kenyanNationalIdError(form.nationalId);
    if (idErr) errors.nationalId = idErr;
    const phoneErr = kenyanPhoneError(form.phone);
    if (phoneErr) errors.phone = phoneErr;
    const mpesaErr = kenyanPhoneError(form.mpesaNumber);
    if (mpesaErr) errors.mpesaNumber = mpesaErr.replace("Phone number", "M-Pesa number");
  }

  if (step === 1) {
    if (!form.employmentStatus.trim()) errors.employmentStatus = "Employment status is required";
    const employerErr = requiredText(form.employer, "Employer");
    if (employerErr) errors.employer = employerErr;
    const titleErr = requiredText(form.jobTitle, "Job title");
    if (titleErr) errors.jobTitle = titleErr;
    if (form.yearsAtEmployer.trim() === "") {
      errors.yearsAtEmployer = "Years at employer is required";
    } else {
      const years = Number(form.yearsAtEmployer);
      if (!Number.isFinite(years) || years < 0) {
        errors.yearsAtEmployer = "Enter a valid number of years";
      }
    }
  }

  if (step === 2) {
    if (form.monthlyIncome.trim() === "") {
      errors.monthlyIncome = "Monthly income is required";
    } else {
      const income = Number(form.monthlyIncome);
      if (!Number.isFinite(income) || income <= 0) {
        errors.monthlyIncome = "Enter a monthly income greater than zero";
      }
    }
    const expensesErr = requiredNonNegative(form.monthlyExpenses, "Monthly expenses");
    if (expensesErr) errors.monthlyExpenses = expensesErr;
    const loansErr = requiredNonNegative(form.existingLoans, "Existing loans");
    if (loansErr) errors.existingLoans = loansErr;
    const rentErr = requiredNonNegative(form.rentMortgage, "Rent / mortgage");
    if (rentErr) errors.rentMortgage = rentErr;
  }

  if (step === 3) {
    if (!form.purpose.trim()) errors.purpose = "Loan purpose is required";
  }

  if (step === 4) {
    if (!form.idDocumentName.trim()) {
      errors.idDocumentName = "Upload your National ID to continue";
    }
  }

  return errors;
}

function ProductTypeOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "card-soft p-4 text-left transition-all hover:border-primary hover:shadow-elevated",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-xl grid place-items-center",
          selected ? "gradient-brand text-white" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

function Field({
  label,
  error,
  required: isRequired,
  id,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>
        {label}
        {isRequired ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={fieldId}
        className={cn("h-11 rounded-xl", error && "border-destructive focus-visible:ring-destructive")}
        aria-invalid={Boolean(error)}
        required={isRequired}
        {...rest}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold && "font-semibold text-foreground text-base")}>
        {value}
      </span>
    </div>
  );
}
