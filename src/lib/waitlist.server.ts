import { createHash } from "node:crypto";
import { burstAllowed } from "@/lib/burst-limit";
import { isValidEmail, normalizeEmail, parseSource } from "@/lib/waitlist";

const HOUR_MS = 60 * 60 * 1000;
const PER_CLIENT_MAX = 5;
const GLOBAL_MAX = 300;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(body: unknown, status: number, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
}

const invalid = () => json({ error: "Please enter a valid email address." }, 400);

/** Hashed client key (never the raw IP). Header order: Vercel, x-real-ip, first XFF hop. */
function clientKey(request: Request): string {
  const h = request.headers;
  const ip =
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `waitlist:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

export async function handleWaitlist(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  }
  try {
    if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return invalid();
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalid();
    }
    if (typeof body !== "object" || body === null) return invalid();
    const { email: rawEmail, source } = body as { email?: unknown; source?: unknown };
    if (typeof rawEmail !== "string" || rawEmail.length > 1000) return invalid();
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) return invalid();

    const allowed =
      (await burstAllowed(clientKey(request), PER_CLIENT_MAX, HOUR_MS)) &&
      (await burstAllowed("waitlist-global", GLOBAL_MAX, HOUR_MS));
    if (!allowed) return json({ error: "Too many requests. Please try again later." }, 429);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Table is newer than the generated DB types, so type the one call we make.
    const db = supabaseAdmin as unknown as {
      from: (t: "waitlist_signups") => {
        insert: (row: {
          email: string;
          source: string;
        }) => PromiseLike<{ error: { code?: string } | null }>;
      };
    };
    const { error } = await db
      .from("waitlist_signups")
      .insert({ email, source: parseSource(source) });
    // 23505 = already on the list: same answer, so existence is never revealed.
    if (error && error.code !== "23505") {
      console.error("[waitlist] insert failed", error.code ?? "unknown");
      return json({ error: "Something went wrong." }, 500);
    }
    return json({ ok: true }, 200);
  } catch {
    console.error("[waitlist] unexpected failure");
    return json({ error: "Something went wrong." }, 500);
  }
}
