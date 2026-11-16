// Live voice call UI. Starts a session through POST /api/v1/calls/sessions,
// opens a WebRTC connection to the realtime voice provider with the short-lived
// token that endpoint returns, then ends the session on hang-up so the backend
// can store duration, transcript turns and cost.
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KalmLogo } from "@/components/KalmLogo";
import { useDialogA11y } from "@/components/useDialogA11y";
import { useTranslation } from "@/lib/i18n";

type StartResponse = {
  session: { id: string };
  realtime: {
    model: string;
    voice: string;
    client_secret: string;
    webrtc_url: string;
    max_duration_seconds: number;
  };
};

type Status = "connecting" | "live" | "ended" | "error";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function VoiceCallOverlay({
  threadId,
  onClose,
}: {
  threadId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("connecting");
  const [message, setMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Set by the start effect; idempotent, so hang-up and unmount can both call it.
  const releaseRef = useRef<(reason: string) => Promise<void>>(async () => {});
  const hangingUpRef = useRef(false);

  useEffect(() => {
    // Everything this run creates is local, so a StrictMode double-mount (or a
    // fast unmount) cleans up exactly its own resources and nothing else.
    let cancelled = false;
    let sessionId: string | null = null;
    let stream: MediaStream | null = null;
    let pc: RTCPeerConnection | null = null;

    const release = async (reason: string) => {
      pc?.close();
      pc = null;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      const id = sessionId;
      sessionId = null;
      if (!id) return;
      try {
        await fetch(`/api/v1/calls/sessions/${id}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ end_reason: reason }),
        });
      } catch {
        // The session sweeper closes abandoned calls; nothing to show the person.
      }
    };
    releaseRef.current = release;

    void (async () => {
      try {
        const response = await fetch("/api/v1/calls/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ thread_id: threadId }),
        });
        const payload = (await response.json()) as StartResponse & { error?: string };
        if (!response.ok) {
          if (cancelled) return;
          setStatus("error");
          setMessage(payload.error ?? t("call.startFailed"));
          return;
        }
        sessionId = payload.session.id;
        if (cancelled) {
          await release("client_closed");
          return;
        }

        const media = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream = media;
        if (cancelled) {
          await release("client_closed");
          return;
        }

        const connection = new RTCPeerConnection();
        pc = connection;
        connection.ontrack = (event) => {
          if (audioRef.current) audioRef.current.srcObject = event.streams[0] ?? null;
        };
        media.getTracks().forEach((track) => connection.addTrack(track, media));
        connection.onconnectionstatechange = () => {
          if (cancelled) return;
          if (connection.connectionState === "connected") setStatus("live");
          if (
            connection.connectionState === "failed" ||
            connection.connectionState === "disconnected"
          ) {
            setStatus("error");
            setMessage(t("call.dropped"));
          }
        };

        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        const sdpResponse = await fetch(
          `${payload.realtime.webrtc_url}?model=${encodeURIComponent(payload.realtime.model)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${payload.realtime.client_secret}`,
              "Content-Type": "application/sdp",
            },
            body: offer.sdp ?? "",
          },
        );
        if (!sdpResponse.ok) {
          if (!cancelled) {
            setStatus("error");
            setMessage(t("call.startFailed"));
          }
          await release("provider_error");
          return;
        }
        const answer = await sdpResponse.text();
        if (cancelled) {
          await release("client_closed");
          return;
        }
        await connection.setRemoteDescription({ type: "answer", sdp: answer });
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(t("call.micBlocked"));
        }
        await release(cancelled ? "client_closed" : "client_error");
      }
    })();

    return () => {
      cancelled = true;
      void release("client_closed");
    };
    // Start once per mount; t/threadId changes must not restart a live call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "live") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // AI disclosure: a voice that sounds human is easy to mistake for one, so the
  // reminder is repeated on screen every five minutes, plus once near the cutoff.
  const [reminder, setReminder] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "live" || seconds === 0) return;
    if (seconds === 25 * 60) setReminder(t("call.aiReminderLate"));
    else if (seconds % (5 * 60) === 0) setReminder(t("call.aiReminder"));
  }, [seconds, status, t]);

  useEffect(() => {
    if (!reminder) return;
    const hide = setTimeout(() => setReminder(null), 12_000);
    return () => clearTimeout(hide);
  }, [reminder]);

  const hangUp = async () => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;
    setStatus("ended");
    await releaseRef.current("user_ended");
    onClose();
  };

  const dialogRef = useDialogA11y(() => void hangUp());

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-call-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 px-6 text-center outline-none backdrop-blur"
    >
      <h2 id="voice-call-title" className="sr-only">
        {t("call.aiLabel")}
      </h2>
      {/* Permanent, unmissable: this voice is not a person. */}
      <p className="absolute top-5 rounded-full border border-border bg-card px-3 py-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {t("call.aiLabel")}
      </p>
      {reminder && (
        <p
          role="status"
          className="absolute top-16 max-w-sm rounded-2xl border border-primary/25 bg-primary/5 px-4 py-2 text-xs leading-relaxed"
        >
          {reminder}
        </p>
      )}
      <span className="flex size-16 items-center justify-center rounded-3xl bg-secondary">
        <KalmLogo className="size-8 text-primary" aria-hidden />
      </span>

      {status === "connecting" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {t("call.connecting")}
        </p>
      )}
      {status === "live" && (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mic className="size-4 text-primary" aria-hidden /> {t("call.live")}
          </p>
          <p className="font-display text-3xl tabular-nums">{clock}</p>
        </>
      )}
      {status === "error" && (
        <p role="alert" className="max-w-sm text-sm text-destructive">
          {message ?? t("call.startFailed")}
        </p>
      )}

      <button
        type="button"
        onClick={() => void hangUp()}
        className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm text-destructive-foreground"
      >
        <PhoneOff className="size-4" aria-hidden />
        {status === "error" ? t("common.close") : t("call.end")}
      </button>

      <p className="max-w-sm text-[0.7rem] text-muted-foreground">{t("call.disclaimer")}</p>
      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
}
