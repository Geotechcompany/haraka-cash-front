import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { PaymentKind, PaymentRecord } from "@/lib/models/payment";
import { requireAdmin } from "@/server/auth";

export type AdminReportType = "disbursements" | "repayments" | "fees";
export type AdminReportFormat = "csv" | "pdf";

export type ReportRow = {
  reference: string;
  applicationNumber: string;
  phone: string;
  amount: number;
  status: string;
  createdAt: string;
};

const REPORT_CONFIG: Record<
  AdminReportType,
  { title: string; filename: string; paymentKind: PaymentKind }
> = {
  disbursements: {
    title: "Monthly disbursement report",
    filename: "monthly-disbursements",
    paymentKind: "disbursement",
  },
  repayments: {
    title: "Repayment performance",
    filename: "repayment-performance",
    paymentKind: "repayment",
  },
  fees: {
    title: "Fees and revenue",
    filename: "fees-and-revenue",
    paymentKind: "processing_fee",
  },
};

export function isAdminReportType(value: string): value is AdminReportType {
  return value in REPORT_CONFIG;
}

export function isAdminReportFormat(value: string): value is AdminReportFormat {
  return value === "csv" || value === "pdf";
}

export async function createAdminReportResponse({
  report,
  format,
}: {
  report: AdminReportType;
  format: AdminReportFormat;
}) {
  await requireAdmin();

  const config = REPORT_CONFIG[report];
  const rows = await loadReportRows(config.paymentKind);
  const date = new Date().toISOString().slice(0, 10);
  return createReportFileResponse({
    title: config.title,
    filename: `${config.filename}-${date}.${format}`,
    format,
    rows,
  });
}

export async function createReportFileResponse({
  title,
  filename,
  format,
  rows,
}: {
  title: string;
  filename: string;
  format: AdminReportFormat;
  rows: ReportRow[];
}) {
  if (format === "csv") {
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = await toPdf(title, rows);
  const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new Response(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function loadReportRows(kind: PaymentKind): Promise<ReportRow[]> {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const payments = await db
    .collection<PaymentRecord>("payments")
    .find({ kind })
    .sort({ createdAt: -1 })
    .limit(5_000)
    .toArray();

  return payments.map((payment) => ({
    reference: payment.reference,
    applicationNumber: payment.applicationNumber ?? "",
    phone: payment.phone,
    amount: payment.amount,
    status: payment.status,
    createdAt:
      payment.createdAt instanceof Date
        ? payment.createdAt.toISOString()
        : String(payment.createdAt),
  }));
}

function escapeCsv(value: string | number) {
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function toCsv(rows: ReportRow[]) {
  const header = ["Reference", "Application", "Phone", "Amount (KES)", "Status", "Created at"];
  const body = rows.map((row) =>
    [row.reference, row.applicationNumber, row.phone, row.amount, row.status, row.createdAt]
      .map(escapeCsv)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

async function toPdf(title: string, rows: ReportRow[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [842, 595];
  const margin = 36;
  const rowHeight = 18;
  let page = document.addPage(pageSize);
  let y = page.getHeight() - margin;

  const drawHeader = () => {
    page.drawText(title, { x: margin, y, size: 18, font: bold, color: rgb(0.02, 0.2, 0.55) });
    y -= 28;
    page.drawText("Reference", { x: margin, y, size: 9, font: bold });
    page.drawText("Application", { x: 190, y, size: 9, font: bold });
    page.drawText("Phone", { x: 300, y, size: 9, font: bold });
    page.drawText("Amount", { x: 405, y, size: 9, font: bold });
    page.drawText("Status", { x: 485, y, size: 9, font: bold });
    page.drawText("Created at", { x: 560, y, size: 9, font: bold });
    y -= rowHeight;
  };

  drawHeader();

  for (const row of rows) {
    if (y < margin) {
      page = document.addPage(pageSize);
      y = page.getHeight() - margin;
      drawHeader();
    }
    page.drawText(row.reference.slice(0, 24), { x: margin, y, size: 8, font: regular });
    page.drawText(row.applicationNumber.slice(0, 16), { x: 190, y, size: 8, font: regular });
    page.drawText(row.phone.slice(0, 16), { x: 300, y, size: 8, font: regular });
    page.drawText(row.amount.toLocaleString("en-KE"), { x: 405, y, size: 8, font: regular });
    page.drawText(row.status.slice(0, 12), { x: 485, y, size: 8, font: regular });
    page.drawText(row.createdAt.slice(0, 19).replace("T", " "), {
      x: 560,
      y,
      size: 8,
      font: regular,
    });
    y -= rowHeight;
  }

  if (rows.length === 0) {
    page.drawText("No records found for this report.", {
      x: margin,
      y,
      size: 10,
      font: regular,
    });
  }

  return document.save();
}
