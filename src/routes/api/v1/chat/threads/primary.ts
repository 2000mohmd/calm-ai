import { createFileRoute } from "@tanstack/react-router";
import { getOrCreatePrimaryThread, getThreadHistoryCore } from "@/lib/chat.functions";
import { handle, json, requireAuth } from "../../-shared";

// GET /api/v1/chat/threads/primary — the conversation the web chat opens on
// (created if they have none), with its messages. Use this for the main chat screen.
// Returns { thread, messages } as documented in docs/MOBILE_API.md §5.3.
export const Route = createFileRoute("/api/v1/chat/threads/primary")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(async () => {
          const { supabase, userId } = await requireAuth(request);
          const primary = await getOrCreatePrimaryThread(supabase, userId);
          return json(await getThreadHistoryCore(supabase, userId, { thread_id: primary.id }));
        }),
    },
  },
});
