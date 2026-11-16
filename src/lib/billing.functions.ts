// Member-facing billing actions for the web app. The /api/v1/billing/* routes are
// the same operations for the mobile client (bearer-token API). Gateway-neutral:
// see src/lib/billing/provider.ts. Return URLs are built here from appBaseUrl(),
// never taken from the browser, so there is no open redirect.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingStatus = {
  /** False until PAYMENT_PROVIDER names a registered gateway. */
  enabled: boolean;
  /** The real enforced allowances (chat-limits.ts), so plan copy can't drift. */
  limits: {
    freeIntroMessages: number;
    pro: { dailyMessages: number; weeklyCalls: number };
    premium: { dailyMessages: number; weeklyCalls: number };
  };
};

export const getBillingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<BillingStatus> => {
    const [{ billingEnabled }, limits] = await Promise.all([
      import("./billing/provider"),
      import("./chat-limits"),
    ]);
    return {
      enabled: billingEnabled(),
      limits: {
        freeIntroMessages: limits.FREE_INTRO_MESSAGE_CAP,
        pro: {
          dailyMessages: limits.dailyMessageCap("pro"),
          weeklyCalls: limits.weeklyCallAllowance("pro"),
        },
        premium: {
          dailyMessages: limits.dailyMessageCap("premium"),
          weeklyCalls: limits.weeklyCallAllowance("premium"),
        },
      },
    };
  });

/** Start a checkout for the signed-in member; the client redirects to `url`. */
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tier: z.enum(["pro", "premium"]),
        interval: z.enum(["monthly", "yearly"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { startCheckoutCore } = await import("./billing/checkout.server");
    const authUser = await context.supabase.auth.getUser();
    return startCheckoutCore(context.supabase, context.userId, {
      email: authUser.data.user?.email ?? null,
      tier: data.tier,
      interval: data.interval,
    });
  });

/** Open the gateway's self-service billing page (manage / cancel). */
export const openPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { openPortalCore } = await import("./billing/checkout.server");
    return openPortalCore(context.userId, {});
  });
