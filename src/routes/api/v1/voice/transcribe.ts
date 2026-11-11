import { createFileRoute } from "@tanstack/react-router";
import { transcribeVoiceNote } from "@/lib/voice.functions";
import { ApiError, handle, json } from "../-shared";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

// POST /api/v1/voice/transcribe { audio_base64, mime_type } → the transcript.
// Send the text as a normal chat message afterwards; this does not post it.
export const Route = createFileRoute("/api/v1/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handle(async () => json(await transcribeVoiceNote({ data: await readJsonBody(request) }))),
    },
  },
});
