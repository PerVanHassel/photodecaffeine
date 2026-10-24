-- The quote builder: everything a quote needs beyond its lines (payment
-- schedule, planning, revisions, ownership or licence, what the client
-- delivers, internal open points) lives in one JSON column, so a new kind of
-- agreement does not need a new column.
alter table public.quotes add column if not exists details jsonb not null default '{}';

-- A quote that a newer one replaces stays readable but can no longer be
-- accepted.
alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'declined', 'replaced'));
