-- The shirt number a parent can give with their answer: at a match the quickest
-- way to recognise a child, and it tells two children with the same first name
-- apart when both parents' answers are put together (see lib/consents.ts).

alter table public.consents
  add column shirt_number text not null default '' check (shirt_number ~ '^[0-9]{0,3}$');
