-- Server-side hard stop for live calls: end any call_sessions row still
-- 'active' after 20 minutes (client vanished or ignored the 15 min cap).
-- Keep 20 min / 15 min in sync with STALE_CALL_SECONDS / MAX_CALL_SECONDS in
-- src/lib/chat-limits.ts. No summary is written for reaped calls.
create or replace function public.reap_stale_calls()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.call_sessions
     set status = 'ended',
         end_reason = 'expired',
         ended_at = now(),
         duration_seconds = 900,
         estimated_cost_usd = round((900 / 60.0) * 0.15, 4)
   where status = 'active'
     and started_at < now() - interval '20 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.reap_stale_calls() from public, anon, authenticated;
grant execute on function public.reap_stale_calls() to service_role;

create extension if not exists pg_cron;

select cron.unschedule('reap-stale-calls')
 where exists (select 1 from cron.job where jobname = 'reap-stale-calls');
select cron.schedule('reap-stale-calls', '*/5 * * * *', $cron$select public.reap_stale_calls();$cron$);
