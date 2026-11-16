-- Voice call sessions. This table was originally created by hand in the old
-- hosted database and never recorded as a migration; recreated here from the
-- columns the app reads and writes (see src/lib/call-session.server.ts).
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL DEFAULT '',
  voice text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  turn_count integer NOT NULL DEFAULT 0,
  end_reason text,
  summary text,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  crisis_triggered boolean NOT NULL DEFAULT false,
  crisis_severity text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_sessions_user_started_idx
  ON public.call_sessions (user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own call sessions"
  ON public.call_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members create their own call sessions"
  ON public.call_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update their own call sessions"
  ON public.call_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
