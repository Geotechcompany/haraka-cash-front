import { createFileRoute } from "@tanstack/react-router";

import {
  createAdminReportResponse,
  isAdminReportFormat,
  isAdminReportType,
} from "@/server/reports";

export const Route = createFileRoute("/api/admin/reports/$report/$format")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isAdminReportType(params.report) || !isAdminReportFormat(params.format)) {
          return new Response("Report not found", { status: 404 });
        }

        try {
          return await createAdminReportResponse({
            report: params.report,
            format: params.format,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unauthorized";
          const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
          return new Response(status === 500 ? "Report generation failed" : message, { status });
        }
      },
    },
  },
});
