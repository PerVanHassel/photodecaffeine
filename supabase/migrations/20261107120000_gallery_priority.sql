-- Voorrang in a group gallery: a guest asks for the photos of one person (a
-- player, usually) before the rest. The studio first looks whether there are
-- enough photos of them. Then it sends a payment link (an invoice), or with too
-- few photos an offer for a shoot of their own. Paid and picked, the guest can
-- download those photos straight away. See lib/priority.ts and routes/priority.ts.
--
-- Only the edge function reads and writes these tables, with the service role.

-- The studio's switch on a group link, with what it costs and how fast it comes.
alter table public.gallery_shares
  add column priority boolean not null default false,
  add column priority_price numeric(8, 2) not null default 5 check (priority_price between 1 and 500),
  add column priority_days int not null default 2 check (priority_days between 1 and 30);

create table public.gallery_priority (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- Goes with the guest: a guest who is forgotten takes their requests along.
  -- An invoice that was made stays, with its own copy of name and amount.
  guest_id uuid not null references public.gallery_guests (id) on delete cascade,
  person text not null check (length(person) between 1 and 120),
  number text not null default '' check (length(number) <= 8),
  -- How to recognise them: "keeper, yellow boots".
  note text not null default '' check (length(note) <= 300),
  language text not null default 'nl' check (language in ('nl', 'en')),
  -- new: waiting for the studio. offered: enough photos, payment link sent.
  -- delivered: photos picked and sent. booking: too few, a shoot of their own
  -- offered instead. closed: stopped by the studio.
  status text not null default 'new' check (status in ('new', 'offered', 'delivered', 'booking', 'closed')),
  -- What the guest agreed to when asking, word for word, and under which terms.
  price numeric(8, 2) not null,
  days int not null,
  statement text not null,
  terms_version text not null,
  -- How many photos the studio found, as the offer says.
  photos int check (photos between 0 and 10000),
  invoice_id uuid references public.invoices (id) on delete set null,
  answered_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gallery_priority_project_idx on public.gallery_priority (project_id, created_at desc);
create index gallery_priority_guest_idx on public.gallery_priority (guest_id);
create unique index gallery_priority_invoice_idx on public.gallery_priority (invoice_id) where invoice_id is not null;
create trigger gallery_priority_touch before update on public.gallery_priority for each row execute function public.touch_updated_at();

-- The photos the studio picked for one request.
create table public.gallery_priority_images (
  priority_id uuid not null references public.gallery_priority (id) on delete cascade,
  image_id uuid not null references public.gallery_images (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (priority_id, image_id)
);
create index gallery_priority_images_image_idx on public.gallery_priority_images (image_id);

do $$
declare t text;
begin
  foreach t in array array['gallery_priority', 'gallery_priority_images'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;
