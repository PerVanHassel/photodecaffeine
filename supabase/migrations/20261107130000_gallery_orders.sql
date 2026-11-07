-- Buying photos in a group gallery that shows watermarked copies. A guest puts
-- photos in a basket and pays at Mollie; once paid they download those photos
-- as originals. The invoice is made only then, as a receipt, so a basket that
-- is never paid leaves nothing in the books. See lib/orders.ts.
--
-- Only the edge function reads and writes these tables, with the service role.

-- The studio's switch on a group link, and the price per photo: the normal
-- price and the lower one guests pay now (start-up korting).
alter table public.gallery_shares
  add column sales boolean not null default true,
  add column photo_price numeric(8, 2) not null default 2.99 check (photo_price between 0.5 and 500),
  add column photo_price_normal numeric(8, 2) not null default 7.50 check (photo_price_normal between 0 and 1000);

create table public.gallery_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  guest_id uuid not null references public.gallery_guests (id) on delete cascade,
  -- The receipt, made once the payment is in. Empty while the basket is at Mollie.
  invoice_id uuid references public.invoices (id) on delete set null,
  -- Per photo, as shown at checkout.
  price numeric(8, 2) not null,
  normal_price numeric(8, 2) not null,
  language text not null default 'nl' check (language in ('nl', 'en')),
  -- What the guest agreed to, word for word, and under which terms.
  statement text not null,
  terms_version text not null,
  created_at timestamptz not null default now()
);
create index gallery_orders_project_idx on public.gallery_orders (project_id, created_at desc);
create index gallery_orders_guest_idx on public.gallery_orders (guest_id);
create unique index gallery_orders_invoice_idx on public.gallery_orders (invoice_id) where invoice_id is not null;

create table public.gallery_order_images (
  order_id uuid not null references public.gallery_orders (id) on delete cascade,
  image_id uuid not null references public.gallery_images (id) on delete cascade,
  primary key (order_id, image_id)
);
create index gallery_order_images_image_idx on public.gallery_order_images (image_id);

-- A payment for a basket has no invoice until it is paid.
alter table public.payments
  alter column invoice_id drop not null,
  add column order_id uuid references public.gallery_orders (id) on delete set null;
create index payments_order_idx on public.payments (order_id, created_at desc) where order_id is not null;

do $$
declare t text;
begin
  foreach t in array array['gallery_orders', 'gallery_order_images'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;
