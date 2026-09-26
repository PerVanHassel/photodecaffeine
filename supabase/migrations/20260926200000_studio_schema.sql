-- Studio data: clients, projects and everything that hangs off them.
--
-- The edge function talks to these tables with the service role. RLS is on for
-- every table so the anon/authenticated keys cannot reach them directly, with
-- read policies only where the portal subscribes through Realtime (messages)
-- or reads its own rows.
--
-- Public site content (portfolio, settings, reviews, feedback, declarations,
-- roles, notifications) stays in kv_store_0951c59e.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- Document numbers (OF-2026-004, FA-2026-012) come from one counter row per
-- prefix and year; the upsert takes a row lock, so two quotes made at the same
-- moment never get the same number and deleting one never causes a repeat.
create table public.document_counters (
  prefix text not null,
  year int not null,
  value int not null default 0,
  primary key (prefix, year)
);
alter table public.document_counters enable row level security;

create or replace function public.next_document_number(p_prefix text) returns text
language plpgsql set search_path = '' as $$
declare
  y int := extract(year from now() at time zone 'Europe/Amsterdam');
  n int;
begin
  insert into public.document_counters (prefix, year, value) values (p_prefix, y, 1)
  on conflict (prefix, year) do update set value = public.document_counters.value + 1
  returning value into n;
  return p_prefix || '-' || y || '-' || lpad(n::text, 3, '0');
end $$;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
-- A client exists before they have a portal account (a lead that gets a quote).
-- user_id links the portal login once they sign up. Clients migrated from the
-- old store keep id = user_id, so ids already stored elsewhere stay valid.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null default '',
  email text not null default '',
  company text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clients_email_key on public.clients (lower(email)) where email <> '';
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'urban' check (kind in ('urban', 'nature', 'beach', 'indoor', 'studio', 'other')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address text not null default '',
  notes text not null default '',
  parking text not null default '',
  permit_required boolean not null default false,
  best_light text not null default '' check (best_light in ('', 'morning', 'midday', 'evening', 'night', 'any')),
  tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger locations_touch before update on public.locations for each row execute function public.touch_updated_at();

create table public.location_photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  url text not null,
  caption text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index location_photos_location_idx on public.location_photos (location_id, sort);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
-- stage is the pipeline column; status is the older, coarser field the mobile
-- app and portal still read, kept in step by the edge function.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'photo' check (type in ('photo', 'video', 'web')),
  stage text not null default 'booked' check (stage in ('lead', 'quote', 'booked', 'shoot', 'editing', 'delivered', 'review', 'archived')),
  status text not null default 'in_progress' check (status in ('in_progress', 'in_review', 'delivered', 'on_hold')),
  phase text not null default '',
  description text not null default '',
  due_date date,
  location_id uuid references public.locations (id) on delete set null,
  briefing text not null default '',
  briefing_updated_at timestamptz,
  deliverables jsonb not null default '[]',
  gallery_settings jsonb not null default '{}',
  demos jsonb not null default '[]',
  demo_url text not null default '',
  demo_notes text not null default '',
  value_cents int,
  inquiry_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_stage_idx on public.projects (stage);
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

create table public.project_clients (
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  position int not null default 0,
  primary key (project_id, client_id)
);
create index project_clients_client_idx on public.project_clients (client_id);

-- ---------------------------------------------------------------------------
-- events: shoots, meetings, deadlines, editing blocks
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  kind text not null default 'shoot' check (kind in ('shoot', 'meeting', 'deadline', 'edit', 'other')),
  title text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location_text text not null default '',
  link text not null default '',
  notes text not null default '',
  -- Shown to the project's clients in the portal (and in their .ics).
  client_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_idx on public.events (starts_at);
create index events_project_idx on public.events (project_id);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

create table public.shot_list_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  required boolean not null default false,
  done boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index shot_list_project_idx on public.shot_list_items (project_id, sort);

-- ---------------------------------------------------------------------------
-- gallery
-- ---------------------------------------------------------------------------

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  url text not null,
  storage_path text not null default '',
  file_name text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index gallery_images_project_idx on public.gallery_images (project_id, sort);

create table public.gallery_favorites (
  image_id uuid not null references public.gallery_images (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (image_id, client_id)
);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_id text not null default '',
  sender_name text not null default '',
  sender_role text not null check (sender_role in ('client', 'pdc')),
  content text not null check (length(content) between 1 and 10000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_project_idx on public.messages (project_id, created_at);

-- ---------------------------------------------------------------------------
-- inquiries and ad visits
-- ---------------------------------------------------------------------------

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  brand text not null default '',
  message text not null default '',
  package text not null default '',
  handled_at timestamptz,
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inquiries_created_idx on public.inquiries (created_at desc);
alter table public.projects add constraint projects_inquiry_fk foreign key (inquiry_id) references public.inquiries (id) on delete set null;

create table public.ad_visits (
  id uuid primary key default gen_random_uuid(),
  ref text not null default '',
  page text not null default '',
  created_at timestamptz not null default now()
);
create index ad_visits_ref_idx on public.ad_visits (ref, created_at);

create table public.ad_campaigns (
  ref text primary key,
  label text not null default '',
  active boolean not null default true,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text not null default '',
  due_at timestamptz,
  done_at timestamptz,
  kind text not null default 'general',
  project_id uuid references public.projects (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tasks_open_idx on public.tasks (due_at) where done_at is null;

-- ---------------------------------------------------------------------------
-- quotes and invoices
-- ---------------------------------------------------------------------------
-- Line items stay jsonb ({label, amount, note}): they are always read and
-- written as one document and never queried line by line.

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  type text not null default 'web' check (type in ('photo', 'web')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  title text not null,
  subtitle text not null default '',
  intro text not null default '',
  notes text not null default '',
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null default '',
  client_email text not null default '',
  project_id uuid references public.projects (id) on delete set null,
  monthly jsonb not null default '[]',
  one_time jsonb not null default '[]',
  included jsonb not null default '[]',
  terms jsonb not null default '[]',
  vat_basis text not null default 'excl' check (vat_basis in ('incl', 'excl')),
  vat_rate numeric(5, 2) not null default 21,
  valid_until date,
  token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  sent_at timestamptz,
  send_count int not null default 0,
  viewed_at timestamptz,
  view_count int not null default 0,
  responded_at timestamptz,
  response text not null default '',
  created_by jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger quotes_touch before update on public.quotes for each row execute function public.touch_updated_at();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  quote_id uuid references public.quotes (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null default '',
  client_email text not null default '',
  client_address text not null default '',
  lines jsonb not null default '[]',
  vat_basis text not null default 'excl' check (vat_basis in ('incl', 'excl')),
  vat_rate numeric(5, 2) not null default 21,
  issued_on date not null default (now() at time zone 'Europe/Amsterdam')::date,
  due_on date not null default ((now() at time zone 'Europe/Amsterdam')::date + 14),
  notes text not null default '',
  token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  sent_at timestamptz,
  reminded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_status_idx on public.invoices (status, due_on);
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();

-- Private calendar feed for the studio (subscribe in Google/Apple Calendar).
create table public.calendar_feeds (
  token text primary key default encode(extensions.gen_random_bytes(24), 'hex'),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'locations', 'location_photos', 'projects', 'project_clients', 'events',
    'shot_list_items', 'gallery_images', 'gallery_favorites', 'messages', 'inquiries',
    'ad_visits', 'ad_campaigns', 'tasks', 'quotes', 'invoices', 'calendar_feeds'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- The project ids the signed-in client is attached to.
create or replace function public.my_project_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select pc.project_id
  from public.project_clients pc
  join public.clients c on c.id = pc.client_id
  where c.user_id = auth.uid()
$$;
revoke all on function public.my_project_ids() from public, anon;
grant execute on function public.my_project_ids() to authenticated;

create policy "clients read own messages" on public.messages for select to authenticated
  using (project_id in (select public.my_project_ids()));

alter publication supabase_realtime add table public.messages;
