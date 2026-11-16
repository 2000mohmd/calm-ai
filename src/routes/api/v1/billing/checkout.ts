import { createFileRoute } from "@tanstack/react-router";
import { handleBillingCheckout } from "../-billing-handlers";

// POST /api/v1/billing/checkout — see handleBillingCheckout.
export const Route = createFileRoute("/api/v1/billing/checkout")({
  server: {
    handlers: {
      POST: ({ request }) => handleBillingCheckout(request),
    },
  },
});
