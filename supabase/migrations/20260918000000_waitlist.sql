-- "Get notified" list from the landing page. Written only by the server
-- (service role) through POST /api/public/waitlist; no client access at all.
create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'final',
  created_at timestamptz not null default now(),
  constraint waitlist_signups_email_length check (length(email) <= 254),
  constraint waitlist_signups_source_check check (source in ('plans', 'final', 'footer'))
);

create unique index waitlist_signups_email_lower_idx on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

revoke all on table public.waitlist_signups from anon, authenticated;
grant all on table public.waitlist_signups to service_role;
