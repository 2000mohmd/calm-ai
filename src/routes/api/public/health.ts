import { createFileRoute } from "@tanstack/react-router";

/**
 * Uptime probe. 200 {ok:true,db:true} when the app is up and Supabase answers;
 * 503 {ok:false,db:false} otherwise. Never returns error text, config or secrets.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        let db = false;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("sweep_state").select("name").limit(1);
          db = !error;
        } catch {
          db = false;
        }
        return new Response(JSON.stringify({ ok: db, db }), {
          status: db ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
