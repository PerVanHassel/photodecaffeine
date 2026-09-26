-- One-off copy of the studio data from kv_store_0951c59e into the new tables.
-- The kv rows are left in place as a backup. KV values are sometimes a JSON
-- object and sometimes JSON stored as a string; kv_json() reads both.

create or replace function pg_temp.kv_json(v jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(v) = 'string' then (v #>> '{}')::jsonb else v end
$$;

create or replace function pg_temp.ts(t text) returns timestamptz language plpgsql immutable as $$
begin
  return nullif(trim(t), '')::timestamptz;
exception when others then
  return null;
end $$;

-- Clients: every portal user who is not staff.
insert into public.clients (id, user_id, name, email, company, created_at)
select u.id, u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), u.email),
       coalesce(u.email, ''),
       coalesce(u.raw_user_meta_data ->> 'company', ''),
       u.created_at
from auth.users u
where coalesce(u.raw_app_meta_data ->> 'role', '') <> 'admin'
  and u.email <> 'pervanhassel@gmail.com'
on conflict do nothing;

-- Projects
with p as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key ~ '^portal:project:[^:]+$'
)
insert into public.projects (
  id, title, type, stage, status, phase, description, due_date, briefing, briefing_updated_at,
  deliverables, gallery_settings, demos, demo_url, demo_notes, created_at
)
select (j ->> 'id')::uuid,
       coalesce(nullif(j ->> 'title', ''), 'Naamloos project'),
       case when j ->> 'type' = 'web' then 'web' else 'photo' end,
       case j ->> 'status' when 'delivered' then 'delivered' when 'in_review' then 'editing' else 'booked' end,
       case when j ->> 'status' in ('in_progress', 'in_review', 'delivered', 'on_hold') then j ->> 'status' else 'in_progress' end,
       coalesce(j ->> 'phase', ''),
       coalesce(j ->> 'description', ''),
       pg_temp.ts(left(j ->> 'dueDate', 10))::date,
       coalesce(j ->> 'briefing', ''),
       pg_temp.ts(j ->> 'briefingUpdatedAt'),
       coalesce(j -> 'deliverables', '[]'),
       coalesce(j -> 'gallerySettings', '{}'),
       coalesce(j -> 'demos', '[]'),
       coalesce(j ->> 'demoUrl', ''),
       coalesce(j ->> 'demoNotes', ''),
       coalesce(pg_temp.ts(j ->> 'createdAt'), now())
from p;

-- Project <-> client links, in the order they were stored.
with p as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key ~ '^portal:project:[^:]+$'
), ids as (
  select (j ->> 'id')::uuid project_id, x.cid, x.ord
  from p, jsonb_array_elements_text(
    case when jsonb_typeof(j -> 'clientIds') = 'array' and jsonb_array_length(j -> 'clientIds') > 0
         then j -> 'clientIds' else jsonb_build_array(j ->> 'clientId') end
  ) with ordinality as x(cid, ord)
  where x.cid is not null and x.cid <> ''
)
insert into public.project_clients (project_id, client_id, position)
select ids.project_id, ids.cid::uuid, ids.ord - 1
from ids join public.clients c on c.id = ids.cid::uuid
on conflict do nothing;

-- Meetings become events.
with p as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key ~ '^portal:project:[^:]+$'
)
insert into public.events (project_id, kind, title, starts_at, location_text, link, notes)
select (j ->> 'id')::uuid, 'meeting', 'Meeting',
       pg_temp.ts(j -> 'meeting' ->> 'date'),
       coalesce(j -> 'meeting' ->> 'location', ''),
       coalesce(j -> 'meeting' ->> 'link', ''),
       coalesce(j -> 'meeting' ->> 'notes', '')
from p
where pg_temp.ts(j -> 'meeting' ->> 'date') is not null;

-- Gallery images, in gallery order.
with p as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key ~ '^portal:project:[^:]+$'
)
insert into public.gallery_images (project_id, url, file_name, sort)
select (j ->> 'id')::uuid, g.url, regexp_replace(g.url, '^.*/', ''), g.ord - 1
from p, jsonb_array_elements_text(coalesce(j -> 'galleryUrls', '[]')) with ordinality as g(url, ord);

-- Messages
with m as (
  select regexp_replace(key, '^portal:project:([^:]+):messages$', '\1')::uuid project_id,
         pg_temp.kv_json(value) arr
  from public.kv_store_0951c59e where key ~ '^portal:project:[^:]+:messages$'
)
insert into public.messages (id, project_id, sender_id, sender_name, sender_role, content, created_at)
select case when e ->> 'id' ~ '^[0-9a-f-]{36}$' then (e ->> 'id')::uuid else gen_random_uuid() end,
       m.project_id,
       coalesce(e ->> 'senderId', ''),
       coalesce(e ->> 'senderName', ''),
       case when e ->> 'senderRole' = 'client' then 'client' else 'pdc' end,
       e ->> 'content',
       coalesce(pg_temp.ts(e ->> 'createdAt'), now())
from m join public.projects pr on pr.id = m.project_id,
     jsonb_array_elements(case when jsonb_typeof(m.arr) = 'array' then m.arr else '[]' end) e
where coalesce(e ->> 'content', '') <> '';

-- Inquiries; ad clicks go to their own table.
with i as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key like 'contact:inquiry:%'
)
insert into public.inquiries (id, name, email, phone, brand, message, package, created_at)
select (j ->> 'id')::uuid, j ->> 'name', coalesce(j ->> 'email', ''), coalesce(j ->> 'phone', ''),
       coalesce(j ->> 'brand', ''), coalesce(j ->> 'message', ''), coalesce(j ->> 'package', ''),
       coalesce(pg_temp.ts(j ->> 'createdAt'), now())
from i
where j ->> 'name' <> '__ad_visit__';

with i as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key like 'contact:inquiry:%'
)
insert into public.ad_visits (ref, page, created_at)
select coalesce(j ->> 'brand', ''),
       coalesce(case when j ->> 'message' like '{%' then (j ->> 'message')::jsonb ->> 'page' end, ''),
       coalesce(pg_temp.ts(j ->> 'createdAt'), now())
from i
where j ->> 'name' = '__ad_visit__';

-- Quotes
with q as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key like 'quotes:quote:%'
)
insert into public.quotes (
  id, number, type, status, title, subtitle, intro, notes, client_id, client_name, client_email,
  monthly, one_time, included, terms, vat_basis, vat_rate, valid_until, token, sent_at, send_count,
  responded_at, response, created_by, created_at, updated_at
)
select (j ->> 'id')::uuid, j ->> 'number',
       case when j ->> 'type' = 'photo' then 'photo' else 'web' end,
       coalesce(nullif(j ->> 'status', ''), 'draft'),
       coalesce(nullif(j ->> 'title', ''), 'Prijsopgave'),
       coalesce(j ->> 'subtitle', ''), coalesce(j ->> 'intro', ''), coalesce(j ->> 'notes', ''),
       (select c.id from public.clients c where c.id::text = j ->> 'clientId'),
       coalesce(j ->> 'clientName', ''), lower(coalesce(j ->> 'clientEmail', '')),
       coalesce(j -> 'monthly', '[]'), coalesce(j -> 'oneTime', '[]'),
       coalesce(j -> 'included', '[]'), coalesce(j -> 'terms', '[]'),
       case when j ->> 'vatBasis' = 'incl' then 'incl' else 'excl' end,
       coalesce((j ->> 'vatRate')::numeric, 21),
       pg_temp.ts(j ->> 'validUntil')::date,
       coalesce(nullif(j ->> 'token', ''), encode(extensions.gen_random_bytes(16), 'hex')),
       pg_temp.ts(j ->> 'sentAt'),
       coalesce((j ->> 'sendCount')::int, 0),
       pg_temp.ts(j ->> 'respondedAt'),
       coalesce(j ->> 'response', ''),
       coalesce(j -> 'createdBy', '{}'),
       coalesce(pg_temp.ts(j ->> 'createdAt'), now()),
       coalesce(pg_temp.ts(j ->> 'updatedAt'), now())
from q;

-- Quote numbering carries on from the highest number already given out.
insert into public.document_counters (prefix, year, value)
select split_part(number, '-', 1), split_part(number, '-', 2)::int, max(split_part(number, '-', 3)::int)
from public.quotes
where number ~ '^[A-Z]+-[0-9]{4}-[0-9]+$'
group by 1, 2
on conflict (prefix, year) do update set value = greatest(public.document_counters.value, excluded.value);

-- Reminders become tasks.
with r as (
  select pg_temp.kv_json(value) j from public.kv_store_0951c59e where key ~ '^reminder:[0-9a-f-]{36}$'
)
insert into public.tasks (id, title, notes, due_at, done_at, kind, created_at)
select (j ->> 'id')::uuid, j ->> 'title', coalesce(j ->> 'description', ''),
       pg_temp.ts(j ->> 'dueDate'),
       case when (j ->> 'completed')::boolean then now() end,
       coalesce(j ->> 'type', 'general'),
       coalesce(pg_temp.ts(j ->> 'createdAt'), now())
from r;
