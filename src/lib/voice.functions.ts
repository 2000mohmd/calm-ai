import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { enforceBurst } from "./burst-limit";
import { dailyVoiceNoteCap } from "./chat-limits";
import { UserInputError } from "./user-input-error";

const TranscribeInput = z.object({
  // ~5 MB of audio once decoded: a voice note, not an upload channel.
  audio_base64: z.string().min(1).max(7_000_000),
  mime_type: z.string().min(1).max(64),
});

export const transcribeVoiceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data, context }) => {
    // Held teens (awaiting guardian consent) get no companion features. Fails
    // open on a lookup error, matching the other companion gates.
    const { companionAllowed } = await import("./guardian-consent.server");
    const consent = await companionAllowed(context.supabase, context.userId).catch(() => ({
      allowed: true,
    }));
    if (!consent.allowed) {
      throw new UserInputError("Voice isn't available until a guardian approves your account.");
    }
    await enforceBurst(`transcribe:${context.userId}`, 6, 60_000);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", context.userId)
      .maybeSingle();
    await enforceBurst(
      `transcribe-day:${context.userId}`,
      dailyVoiceNoteCap(profile?.subscription_tier),
      86_400_000,
    );
    const { transcribeAudioCore } = await import("./voice.server");
    return transcribeAudioCore(data);
  });
