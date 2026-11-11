import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { enforceBurst } from "./burst-limit";

const TranscribeInput = z.object({
  // ~5 MB of audio once decoded: a voice note, not an upload channel.
  audio_base64: z.string().min(1).max(7_000_000),
  mime_type: z.string().min(1).max(64),
});

export const transcribeVoiceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data, context }) => {
    enforceBurst(`transcribe:${context.userId}`, 6, 60_000);
    const { transcribeAudioCore } = await import("./voice.server");
    return transcribeAudioCore(data);
  });
