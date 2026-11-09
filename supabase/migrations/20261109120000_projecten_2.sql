-- Projecten 2.0 and the new gallery.
--
-- 1. A project is made of parts: Foto, Video and Website, alone or together.
--    Each part has its own steps, and can wait, pause or stop on its own. The
--    project's own stage, status and type stay, written from its first part,
--    so the phone app and older screens keep working (lib/parts.ts).
-- 2. Archiving is a date on the project instead of a step, so it never mails.
-- 3. The gallery: sets of photos, a light copy to look at (the original is
--    only for downloading), a log of every download, and accounts for people
--    who buy photos (gallery_guests.user_id).
-- 4. Selling: a bundle price, an end date for the start-up price, and the
--    amount of each basket, now that a bundle makes it more than price x count.
--
-- Everything is added; nothing is taken away. Only the edge function reads and
-- writes these tables, with the service role.

-- ---------------------------------------------------------------------------
-- Parts
-- ---------------------------------------------------------------------------

create table public.project_parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'web')),
  -- Portret, Sport, Automotive, Nieuwe website... Free text the admin picks from a list.
  category text not null default '' check (length(category) <= 60),
  -- Which steps fit which kind is checked in lib/parts.ts.
  stage text not null default 'booked' check (stage in (
    'lead', 'quote', 'booked', 'shoot', 'editing', 'delivered', 'done',
    'intake', 'design', 'build', 'review', 'live'
  )),
  -- Waiting for the client, paused, or stopped for good.
  hold text not null default '' check (hold in ('', 'waiting', 'paused', 'stopped')),
  hold_note text not null default '' check (length(hold_note) <= 300),
  hold_since timestamptz,
  sort integer not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, kind)
);
create index project_parts_project_idx on public.project_parts (project_id, sort);

alter table public.projects add column archived_at timestamptz;

-- Every project gets the part of its own kind, on the matching step.
insert into public.project_parts (project_id, kind, stage, sort, delivered_at, created_at)
select
  p.id,
  p.type,
  case
    when p.type = 'web' then case p.stage
      when 'lead' then 'lead' when 'quote' then 'quote' when 'booked' then 'booked'
      when 'shoot' then 'intake' when 'editing' then 'build' else 'live' end
    else case p.stage
      when 'review' then 'done' when 'archived' then 'done' else p.stage end
  end,
  0,
  case
    when p.stage in ('delivered', 'review', 'archived')
      then coalesce((p.gallery_settings ->> 'deliveredAt')::timestamptz, p.updated_at)
  end,
  p.created_at
from public.projects p
where p.type in ('photo', 'video', 'web');

-- A website with photos in its gallery gets a Foto part for them too.
insert into public.project_parts (project_id, kind, stage, sort, delivered_at, created_at)
select p.id, 'photo',
  case when p.stage in ('delivered', 'review', 'archived') then 'done' else 'editing' end,
  1,
  case when p.stage in ('delivered', 'review', 'archived')
    then coalesce((p.gallery_settings ->> 'deliveredAt')::timestamptz, p.updated_at) end,
  p.created_at
from public.projects p
where p.type = 'web' and exists (select 1 from public.gallery_images g where g.project_id = p.id);

update public.projects set archived_at = updated_at where stage = 'archived';

-- ---------------------------------------------------------------------------
-- Gallery
-- ---------------------------------------------------------------------------

alter table public.gallery_images
  -- A chapter of the gallery, such as "Eerste helft" or "Ceremonie". Empty: none.
  add column set_name text not null default '' check (length(set_name) <= 60),
  -- A light copy of at most 2048 px to look at, made in the admin's browser.
  add column display_path text not null default '';

-- Someone who bought photos signs in with an account (Supabase Auth). Their
-- guest row in each gallery points at that account.
alter table public.gallery_guests
  add column user_id uuid references auth.users (id) on delete set null;
create unique index gallery_guests_project_user_idx on public.gallery_guests (project_id, user_id) where user_id is not null;
create index gallery_guests_user_idx on public.gallery_guests (user_id) where user_id is not null;

-- Every download, by whom and of what. A zip writes one row per photo, with
-- the same batch.
create table public.gallery_downloads (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  image_id uuid references public.gallery_images (id) on delete set null,
  guest_id uuid references public.gallery_guests (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  -- The name at the time, so the list still reads after a client is gone.
  who text not null default '' check (length(who) <= 254),
  source text not null check (source in ('portal', 'link', 'account')),
  version text not null check (version in ('original', 'watermark')),
  batch uuid,
  created_at timestamptz not null default now()
);
create index gallery_downloads_project_idx on public.gallery_downloads (project_id, created_at desc);
create index gallery_downloads_image_idx on public.gallery_downloads (image_id) where image_id is not null;
create index gallery_downloads_guest_idx on public.gallery_downloads (guest_id) where guest_id is not null;

-- ---------------------------------------------------------------------------
-- Selling
-- ---------------------------------------------------------------------------

alter table public.gallery_shares
  -- "5 foto's voor €20". 0 is no bundle.
  add column bundle_size integer not null default 0 check (bundle_size between 0 and 50),
  add column bundle_price numeric(8, 2) not null default 0 check (bundle_price between 0 and 5000),
  -- The start-up price runs until this day; after it guests pay the normal price.
  add column discount_until date;

alter table public.gallery_orders
  -- What the basket came to, bundles included. Empty for baskets from before bundles: price x count.
  add column amount numeric(10, 2),
  add column bundle_size integer not null default 0,
  add column bundle_price numeric(8, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

-- The account behind an e-mail address, for signing in with a code (routes/account.ts).
create or replace function public.auth_user_by_email(p_email text)
returns table (id uuid, confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at is not null
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1
$$;
revoke all on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;

do $$
declare t text;
begin
  foreach t in array array['project_parts', 'gallery_downloads'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;
