-- Logboek: every change anyone makes through the edge function, written by a
-- middleware in lib/activity.ts after the request succeeded. Only the owner
-- reads it, through the function; RLS is on with no policies, so the
-- anon/authenticated keys cannot reach it.

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Who: a signed-in user (owner, team, client) or someone without a login
  -- (a guest on a share link, a visitor on the contact form).
  actor_id uuid,
  actor_name text not null default '',
  actor_email text not null default '',
  actor_kind text not null check (actor_kind in ('owner', 'team', 'client', 'guest', 'visitor')),
  -- What: a sentence, the thing it happened to, and the project it belongs to.
  area text not null,
  action text not null,
  target_id text not null default '',
  target_label text not null default '',
  project_id uuid,
  project_title text not null default '',
  detail text not null default '',
  -- [{ field, from, to }] for edits; values are left out when they are long,
  -- structured or an id.
  changes jsonb not null default '[]',
  link text not null default '',
  method text not null,
  path text not null,
  status int not null
);
alter table public.activity_log enable row level security;

create index activity_log_created_at on public.activity_log (created_at desc);
create index activity_log_actor on public.activity_log (actor_id, created_at desc);

-- Everyone who appears in the log, for the "wie" filter.
create or replace function public.activity_actors()
returns table (actor_id uuid, actor_name text, actor_email text, actor_kind text, entries bigint, last_at timestamptz)
language sql stable set search_path = '' as $$
  select actor_id, max(actor_name), max(actor_email), max(actor_kind), count(*), max(created_at)
  from public.activity_log
  group by actor_id, case when actor_id is null then lower(actor_email) || actor_name end
  order by max(created_at) desc
$$;
revoke execute on function public.activity_actors() from public, anon, authenticated;
