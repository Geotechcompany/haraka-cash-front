import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/smply-pay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, reason: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { handleSmplyPayWebhook } = await import("@/server/payments");
        const result = await handleSmplyPayWebhook(payload);
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 404,
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, service: "smply-pay-webhook" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
