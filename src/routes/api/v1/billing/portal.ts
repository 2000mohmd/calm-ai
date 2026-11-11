import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appBaseUrl } from "@/lib/app-url";
import { enforceBurst } from "@/lib/burst-limit";
import { createBillingPortalSession } from "@/lib/billing/stripe.server";
import { safeReturnUrl } from "@/lib/safe-url";
import { ApiError, handle, json, readJson, requireAuth } from "../-shared";

const Body = z.object({ returnUrl: z.string().url().optional() });

/**
 * POST /api/v1/billing/portal — hosted Stripe page where an already-subscribed
 * user can update their card or cancel. Requires the user to already have a
 * stripe_customer_id (i.e. they've been through checkout at least once).
 */
export const Route = createFileRoute("/api/v1/billing/portal")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handle(async () => {
          const { supabase, userId } = await requireAuth(request);
          enforceBurst(`portal:${userId}`, 10, 600_000);
          const body = await readJson(request, Body);

          const profile = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", userId)
            .maybeSingle();
          const customerId = (profile.data as Record<string, unknown> | null)?.[
            "stripe_customer_id"
          ] as string | null | undefined;
          if (!customerId) {
            throw new ApiError(400, "No billing account yet — subscribe first.");
          }

          const returnUrl = safeReturnUrl(body.returnUrl, `${appBaseUrl()}/settings`);

          const session = await createBillingPortalSession({ customerId, returnUrl });
          return json({ portalUrl: session.url });
        }),
    },
  },
});
