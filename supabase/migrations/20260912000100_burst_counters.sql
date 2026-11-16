-- Shared burst-limit counters (serverless-safe; replaces per-instance memory).
create table if not exists public.burst_counters (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

alter table public.burst_counters enable row level security;
-- No policies: only the service role (which bypasses RLS) can touch it.

revoke all on table public.burst_counters from anon, authenticated;
grant all on table public.burst_counters to service_role;

create or replace function public.burst_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.burst_counters as b (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when b.window_start + make_interval(secs => p_window_seconds) <= now() then 1
          else b.count + 1
        end,
        window_start = case
          when b.window_start + make_interval(secs => p_window_seconds) <= now() then now()
          else b.window_start
        end
  returning b.count into v_count;

  return v_count <= p_max;
end;
$$;

revoke execute on function public.burst_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.burst_hit(text, integer, integer) to service_role;
