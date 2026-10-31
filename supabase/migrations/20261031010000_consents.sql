-- Parents' consent per child for a shoot. A project gets one link that goes to
-- all parents (/toestemming/<token>). Each answer is one row with its own key,
-- which the confirmation mail links to, so it can be changed or withdrawn later.
--
-- Only the edge function reads and writes these tables, with the service role.

create table public.consent_forms (
  project_id uuid primary key references public.projects (id) on delete cascade,
  -- The edge function sets a short random token; this default is a fallback.
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger consent_forms_touch before update on public.consent_forms for each row execute function public.touch_updated_at();

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  key text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  child_name text not null check (length(child_name) between 1 and 120),
  -- full: in photos and on social media. no_social: in photos, not on social
  -- media. no_photo: not in photos.
  answer text not null check (answer in ('full', 'no_social', 'no_photo')),
  -- A photo of the child in the private bucket, to recognise them by. Removed
  -- once the photos are delivered; `note` is the way to recognise them without one.
  photo_path text not null default '',
  note text not null default '' check (length(note) <= 300),
  parent_name text not null check (length(parent_name) between 1 and 120),
  parent_email text not null check (length(parent_email) between 3 and 254),
  -- Word for word what the parent agreed to, in the language they read it in.
  statement text not null,
  language text not null default 'nl' check (language in ('nl', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index consents_project_idx on public.consents (project_id);
create trigger consents_touch before update on public.consents for each row execute function public.touch_updated_at();

do $$
declare t text;
begin
  foreach t in array array['consent_forms', 'consents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- A photo with a child on it who may not be shown or posted, marked by the
-- studio. no_photo: held back from the client and the group link. no_social:
-- stays in the gallery with a label, and says so in its file name.
alter table public.gallery_images
  add column restriction text not null default '' check (restriction in ('', 'no_social', 'no_photo'));
