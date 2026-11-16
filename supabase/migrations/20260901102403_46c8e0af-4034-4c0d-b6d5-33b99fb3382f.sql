-- Originally also scheduled the sweep against the old hosted URL with a secret
-- stored in this file. Removed: configure the schedule with your own URL and
-- secret via docs/SELF_HOSTING.md. Only the grants are kept.
revoke all on function public.claim_jobs(integer) from public;
grant execute on function public.claim_jobs(integer) to service_role;
