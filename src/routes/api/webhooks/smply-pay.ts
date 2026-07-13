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

        console.info("[smply-pay webhook]", JSON.stringify(payload).slice(0, 2000));
        const { handleSmplyPayWebhook } = await import("@/server/payments-webhook.server");
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
