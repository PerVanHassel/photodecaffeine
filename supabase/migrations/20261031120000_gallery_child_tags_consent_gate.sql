-- A parent pointing out, photo by photo, that their child is on it. Only that
-- parent and the studio ever see these; the studio sees right away when a child
-- who may not be shown or posted is on a photo (see lib/consents.ts).
--
-- Only the edge function reads and writes this table, with the service role.

create table public.gallery_child_tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  image_id uuid not null references public.gallery_images (id) on delete cascade,
  guest_id uuid not null references public.gallery_guests (id) on delete cascade,
  -- As the parent gave it, or from their consent form. Matched to the answers
  -- when it is read, so a later change of answer counts straight away.
  child_name text not null check (length(child_name) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (image_id, guest_id, child_name)
);
create index gallery_child_tags_project_idx on public.gallery_child_tags (project_id);
create index gallery_child_tags_guest_idx on public.gallery_child_tags (guest_id);

alter table public.gallery_child_tags enable row level security;
create policy "admins manage gallery_child_tags" on public.gallery_child_tags for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- The studio's switch on a group link: whoever has not given consent for a child
-- gets the consent form first, and the photos after that.
alter table public.gallery_shares
  add column consent_required boolean not null default false;
