import { createFileRoute, Outlet } from "@tanstack/react-router";

import { assertAdminRoute } from "@/server/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => assertAdminRoute(),
  component: () => <Outlet />,
});
