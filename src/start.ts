import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const clerkAuth = clerkMiddleware({
  signInUrl: "/login",
  signUpUrl: "/register",
  signInFallbackRedirectUrl: "/dashboard",
  signUpFallbackRedirectUrl: "/dashboard",
});

const authMiddleware = createMiddleware().server(async ({ request, next, context }) => {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/api/webhooks/")) {
    return next();
  }
  const runClerk = clerkAuth.options.server;
  if (!runClerk) return next();
  return runClerk({ request, next, context });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware, errorMiddleware],
}));
