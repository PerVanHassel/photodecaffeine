-- Online payments of invoices through Mollie (routes/payments.ts). One row per
-- attempt; the invoice itself says whether it is paid. Only what the admin
-- shows and the administration must keep: never a card or account number.
-- Unpaid attempts go after 12 months (lib/retention.ts); paid ones stay with
-- their invoice, and an invoice with a paid one cannot be deleted.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  mollie_id text not null unique,
  mode text not null check (mode in ('test', 'live')),
  status text not null default 'open',
  method text not null default '',
  amount numeric(12, 2) not null,
  amount_refunded numeric(12, 2) not null default 0,
  amount_charged_back numeric(12, 2) not null default 0,
  checkout_url text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_invoice_idx on public.payments (invoice_id, created_at desc);
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

alter table public.payments enable row level security;
create policy "admins manage payments" on public.payments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
