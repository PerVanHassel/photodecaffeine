-- The team's file pool: whatever one admin wants to hand to another. A bucket of
-- its own, because it takes every file type, unlike the galleries' private bucket.
-- The browser uploads straight to it with a signed URL; only the edge function
-- signs those, and only the edge function reads and writes these rows.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-files-0951c59e', 'team-files-0951c59e', false, 52428800, null)
on conflict (id) do nothing;

create table public.team_files (
  -- Also the folder the file sits in: <id>/<clean file name>.
  id uuid primary key,
  path text not null unique,
  name text not null check (length(name) between 1 and 255),
  size bigint not null check (size >= 0),
  type text not null default '',
  note text not null default '' check (length(note) <= 500),
  from_id uuid not null,
  from_name text not null,
  -- Empty: for the whole team.
  to_id uuid,
  to_name text not null default '',
  created_at timestamptz not null default now()
);
create index team_files_created_idx on public.team_files (created_at desc);

alter table public.team_files enable row level security;
create policy "admins manage team_files" on public.team_files for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- All storage together, the site's photos included: what the plan's limit counts.
create function public.storage_used_bytes() returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)::bigint from storage.objects
$$;
revoke execute on function public.storage_used_bytes() from public, anon, authenticated;
