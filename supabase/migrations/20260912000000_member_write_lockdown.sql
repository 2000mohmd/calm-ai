-- Member write lockdown.
--
-- Members could call PostgREST directly with their JWT and reset their own
-- limits or forge records, because these tables were member-writable under RLS.
-- All writes now go through the server (service-role client), which sets
-- user_id itself and owns severity / status / usage numbers. Members keep
-- SELECT only.

-- 1. Members can no longer insert support requests or crisis events directly:
--    severity, status and the crisis audit trail are server-decided.
DROP POLICY IF EXISTS "Members create their own human support requests"
  ON public.human_support_requests;
DROP POLICY IF EXISTS "Users log own crisis events" ON public.crisis_events;

-- 2. Usage counters, rate-limit windows and call sessions are server-written
--    only (a member could otherwise zero their counters or forge a call row).
REVOKE INSERT, UPDATE, DELETE ON public.chat_rate_limits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.chat_usage FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.call_sessions FROM authenticated;

-- Reads stay (own-row SELECT policies are unchanged); re-grant to be safe.
GRANT SELECT ON public.chat_rate_limits TO authenticated;
GRANT SELECT ON public.chat_usage TO authenticated;
GRANT SELECT ON public.call_sessions TO authenticated;

-- service_role keeps full access.
GRANT ALL ON public.chat_rate_limits TO service_role;
GRANT ALL ON public.chat_usage TO service_role;
GRANT ALL ON public.call_sessions TO service_role;
GRANT ALL ON public.human_support_requests TO service_role;
GRANT ALL ON public.crisis_events TO service_role;
