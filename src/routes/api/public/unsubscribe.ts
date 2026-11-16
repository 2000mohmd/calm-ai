import { createFileRoute } from "@tanstack/react-router";
import { unsubscribeApply, unsubscribeConfirm } from "@/lib/unsubscribe.server";

// GET (link click) only shows a confirmation page; the opt-out is applied by
// POST (the page's button, or the RFC 8058 one-click request from mail clients).
// No login: the token is an HMAC of the user id, so it can't be forged.
export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      GET: ({ request }) => unsubscribeConfirm(request),
      POST: ({ request }) => unsubscribeApply(request),
    },
  },
});
