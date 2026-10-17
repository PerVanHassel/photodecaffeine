-- Group links: one link per project gallery that the studio, and the client
-- from inside their gallery, can pass around a group (a team, a class, the
-- guests at a wedding). Whoever opens it leaves a name and an e-mail address
-- first; that is how the studio sees who used the link and how often.
--
-- Only the edge function reads and writes these tables, with the service role.

create table public.gallery_shares (
  project_id uuid primary key references public.projects (id) on delete cascade,
  -- The edge function sets a short random token; this default is a fallback.
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  active boolean not null default true,
  -- Whether guests get download buttons. What they may download then follows
  -- the project, as for the client (watermarked before delivery, and so on).
  downloads boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger gallery_shares_touch before update on public.gallery_shares for each row execute function public.touch_updated_at();

-- Everyone who came in through a group link: one row per e-mail address per
-- project. `key` is what their browser keeps instead of a login. A visit is
-- counted when someone comes back after half an hour or more away.
create table public.gallery_guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) between 3 and 254),
  key text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  visits int not null default 0,
  downloads int not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (project_id, email)
);

-- A guest's hearts. Separate from gallery_favorites, which is the client's
-- own selection for the studio.
create table public.gallery_guest_hearts (
  image_id uuid not null references public.gallery_images (id) on delete cascade,
  guest_id uuid not null references public.gallery_guests (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (image_id, guest_id)
);
create index gallery_guest_hearts_guest_idx on public.gallery_guest_hearts (guest_id);

do $$
declare t text;
begin
  foreach t in array array['gallery_shares', 'gallery_guests', 'gallery_guest_hearts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- Hearts per photo and per guest for one project, as one row: a plain select
-- would stop at the API's row limit on a large, popular gallery.
create or replace function public.gallery_guest_heart_counts(p_project uuid) returns jsonb
language sql stable set search_path = '' as $$
  with h as (
    select h.image_id, h.guest_id
    from public.gallery_guest_hearts h
    join public.gallery_images g on g.id = h.image_id
    where g.project_id = p_project
  )
  select jsonb_build_object(
    'images', coalesce((select jsonb_object_agg(image_id, n) from (select image_id, count(*) as n from h group by image_id) s), '{}'::jsonb),
    'guests', coalesce((select jsonb_object_agg(guest_id, n) from (select guest_id, count(*) as n from h group by guest_id) s), '{}'::jsonb)
  )
$$;
-- Only the edge function (service role) asks for these.
revoke execute on function public.gallery_guest_heart_counts(uuid) from public, anon, authenticated;
