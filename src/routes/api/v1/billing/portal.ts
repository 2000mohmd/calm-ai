import { createFileRoute } from "@tanstack/react-router";
import { handleBillingPortal } from "../-billing-handlers";

// POST /api/v1/billing/portal — see handleBillingPortal.
export const Route = createFileRoute("/api/v1/billing/portal")({
  server: {
    handlers: {
      POST: ({ request }) => handleBillingPortal(request),
    },
  },
});
