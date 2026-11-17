import { createFileRoute } from "@tanstack/react-router";
import { handleWaitlist } from "@/lib/waitlist.server";

// Landing-page "get notified" form. Public by design; abuse is bounded by the
// hashed per-client and global burst limits inside handleWaitlist. Non-POST -> 405.
export const Route = createFileRoute("/api/public/waitlist")({
  server: {
    handlers: {
      GET: ({ request }) => handleWaitlist(request),
      POST: ({ request }) => handleWaitlist(request),
      PUT: ({ request }) => handleWaitlist(request),
      PATCH: ({ request }) => handleWaitlist(request),
      DELETE: ({ request }) => handleWaitlist(request),
    },
  },
});
