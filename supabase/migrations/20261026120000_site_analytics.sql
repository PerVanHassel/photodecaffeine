-- Bezoekersstatistieken: the public site's own analytics, in place of
-- Plausible. The site sends what a visitor does in batches to POST /v
-- (routes/analytics.ts), which hands each batch to track_batch() below. One
-- row per visit in site_sessions, one row per pageview, click, form step or
-- named event in site_events. Only the edge function reads or writes them:
-- RLS is on with no policies, and the functions are not executable by the
-- anon/authenticated keys.

create table public.site_sessions (
  -- Made in the visitor's browser, so every batch of a visit names the same row.
  id uuid primary key,
  -- A random id kept in the browser, to recognise a second visit.
  visitor_id uuid not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_page text not null default '',
  -- Where they came from: the referring site's host, and source, medium and
  -- campaign from the link (?ref=, utm_*) or worked out from the referrer.
  referrer text not null default '',
  source text not null default '',
  medium text not null default '',
  campaign text not null default '',
  content text not null default '',
  term text not null default '',
  -- Came in through an ad: a ?ref= link, a click id or a paid utm_medium.
  paid boolean not null default false,
  device text not null default '',
  browser text not null default '',
  os text not null default '',
  screen text not null default '',
  language text not null default '',
  timezone text not null default '',
  returning_visitor boolean not null default false,
  pageviews int not null default 0,
  active_seconds int not null default 0,
  -- Sent an inquiry during this visit.
  converted_at timestamptz
);
alter table public.site_sessions enable row level security;
create index site_sessions_started on public.site_sessions (started_at desc);
create index site_sessions_campaign on public.site_sessions (campaign, started_at desc) where campaign <> '';
create index site_sessions_visitor on public.site_sessions (visitor_id, started_at desc);

create table public.site_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.site_sessions (id) on delete cascade,
  -- The pageview an event happened on; on a pageview row, its own id.
  view_id text not null default '',
  at timestamptz not null default now(),
  type text not null check (type in ('pageview', 'click', 'form', 'event')),
  path text not null default '',
  -- Click: the text of what was clicked. Form: which form. Event: its name.
  label text not null default '',
  -- Click: the link's address, or the kind of element.
  target text not null default '',
  -- Click: where on the page, as a share of its width and of its height.
  x real,
  y real,
  -- Pageview: how far down it got (percent) and how long it was looked at.
  scroll smallint,
  duration_ms int,
  props jsonb not null default '{}'
);
alter table public.site_events enable row level security;
create index site_events_session on public.site_events (session_id, at);

-- The visit an inquiry was sent from, so its whole route through the site can
-- be read back. No foreign key: the form can arrive before the visit's first batch.
alter table public.inquiries add column site_session_id uuid;
create index inquiries_site_session on public.inquiries (site_session_id) where site_session_id is not null;

-- ---------------------------------------------------------------------------
-- Writing
-- ---------------------------------------------------------------------------

-- One batch from the site: the visit (stored the first time it is seen) and
-- its events. 'progress' events are not stored as rows: they raise the scroll
-- depth and time of a pageview that was stored earlier. Times arrive as an
-- age in milliseconds, so a wrong clock in the browser does not matter.
create or replace function public.track_batch(p_session jsonb, p_events jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := (p_session ->> 'id')::uuid;
  fresh int;
begin
  insert into public.site_sessions (
    id, visitor_id, started_at, last_seen_at, landing_page, referrer, source, medium, campaign, content, term,
    paid, device, browser, os, screen, language, timezone, returning_visitor
  ) values (
    sid, (p_session ->> 'visitor')::uuid,
    now() - make_interval(secs => coalesce((p_session ->> 'age')::numeric, 0) / 1000), now(),
    coalesce(p_session ->> 'landing', ''), coalesce(p_session ->> 'referrer', ''),
    coalesce(p_session ->> 'source', ''), coalesce(p_session ->> 'medium', ''),
    coalesce(p_session ->> 'campaign', ''), coalesce(p_session ->> 'content', ''), coalesce(p_session ->> 'term', ''),
    coalesce((p_session ->> 'paid')::boolean, false),
    coalesce(p_session ->> 'device', ''), coalesce(p_session ->> 'browser', ''), coalesce(p_session ->> 'os', ''),
    coalesce(p_session ->> 'screen', ''), coalesce(p_session ->> 'language', ''), coalesce(p_session ->> 'timezone', ''),
    coalesce((p_session ->> 'returning')::boolean, false)
  )
  on conflict (id) do nothing;
  get diagnostics fresh = row_count;

  if fresh = 1 then
    -- The older campaign counter, which the app's Advertenties screen still reads.
    if coalesce(p_session ->> 'campaign', '') <> '' then
      insert into public.ad_visits (ref, page) values (left(p_session ->> 'campaign', 100), left(coalesce(p_session ->> 'landing', ''), 300));
    end if;
    -- Statistics are kept for two years (see the privacy policy).
    if random() < 0.01 then
      delete from public.site_sessions where started_at < now() - interval '2 years';
    end if;
  end if;

  insert into public.site_events (session_id, view_id, at, type, path, label, target, x, y, scroll, duration_ms, props)
  select sid, coalesce(e ->> 'v', ''),
         now() - make_interval(secs => coalesce((e ->> 'age')::numeric, 0) / 1000),
         e ->> 't', coalesce(e ->> 'path', ''), coalesce(e ->> 'label', ''), coalesce(e ->> 'target', ''),
         (e ->> 'x')::real, (e ->> 'y')::real, (e ->> 'scroll')::smallint, (e ->> 'ms')::int,
         coalesce(e -> 'props', '{}')
  from jsonb_array_elements(p_events) e
  where e ->> 't' in ('pageview', 'click', 'form', 'event');

  update public.site_events pv
  set scroll = greatest(pv.scroll, p.scroll), duration_ms = greatest(pv.duration_ms, p.ms)
  from (
    select e ->> 'v' as v, max((e ->> 'scroll')::smallint) as scroll, max((e ->> 'ms')::int) as ms
    from jsonb_array_elements(p_events) e
    where e ->> 't' = 'progress'
    group by 1
  ) p
  where pv.session_id = sid and pv.type = 'pageview' and pv.view_id = p.v;

  update public.site_sessions s set
    last_seen_at = now(),
    pageviews = (select count(*) from public.site_events where session_id = sid and type = 'pageview'),
    active_seconds = (select coalesce(sum(duration_ms), 0) / 1000 from public.site_events where session_id = sid and type = 'pageview'),
    converted_at = coalesce(s.converted_at, case when exists (
      select 1 from jsonb_array_elements(p_events) e where e ->> 't' = 'event' and e ->> 'label' = 'Aanvraag'
    ) then now() end)
  where s.id = sid;
end $$;
revoke execute on function public.track_batch(jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reading, for the Advertenties page in the admin
-- ---------------------------------------------------------------------------

-- Periods are whole days in Dutch time: 7 means today and the six days before.
create or replace function public.analytics_since(p_days int)
returns timestamptz
language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Europe/Amsterdam') - (greatest(p_days, 1) - 1) * interval '1 day')
    at time zone 'Europe/Amsterdam'
$$;

-- The visits in a period that match the page's filter: any of campaign,
-- source, device and paid.
create or replace function public.analytics_sessions(p_since timestamptz, p_until timestamptz, p_filter jsonb)
returns setof public.site_sessions
language sql stable set search_path = '' as $$
  select * from public.site_sessions s
  where s.started_at >= p_since and s.started_at < p_until
    and (p_filter ->> 'campaign' is null or s.campaign = p_filter ->> 'campaign')
    and (p_filter ->> 'source' is null or s.source = p_filter ->> 'source')
    and (p_filter ->> 'device' is null or s.device = p_filter ->> 'device')
    and (p_filter ->> 'paid' is null or s.paid = (p_filter ->> 'paid')::boolean)
$$;

-- Everything the overview and the campaign list show, in one call. A bounce
-- is a visit of one page, under ten seconds, without an inquiry.
create or replace function public.analytics_summary(p_days int, p_filter jsonb)
returns jsonb
language sql stable set search_path = '' as $$
  with bounds as (
    select b.since, now() as until, b.since - (now() - b.since) as prev_since
    from (select public.analytics_since(p_days) as since) b
  ),
  s as (select x.* from bounds, public.analytics_sessions(bounds.since, bounds.until, p_filter) x),
  prev as (select x.* from bounds, public.analytics_sessions(bounds.prev_since, bounds.since, p_filter) x),
  ev as (select e.* from public.site_events e where e.session_id in (select id from s)),
  per as (
    select ev.session_id,
      count(*) filter (where ev.type = 'click' and ev.props ->> 'kind' in ('link', 'button', 'field')) as clicks,
      count(*) filter (where ev.type = 'form' and ev.props ->> 'step' = 'start') as form_starts
    from ev group by ev.session_id
  ),
  landing as (
    select distinct on (ev.session_id) ev.session_id, ev.scroll
    from ev where ev.type = 'pageview'
    order by ev.session_id, ev.at
  ),
  x as (
    select s.*,
      coalesce(per.clicks, 0) as clicks,
      coalesce(per.form_starts, 0) as form_starts,
      landing.scroll as landing_scroll,
      (s.pageviews <= 1 and s.active_seconds < 10 and s.converted_at is null) as bounce
    from s
    left join per on per.session_id = s.id
    left join landing on landing.session_id = s.id
  ),
  views as (
    select ev.*, row_number() over (partition by ev.session_id order by ev.at desc) = 1 as last
    from ev where ev.type = 'pageview'
  )
  select jsonb_build_object(
    'since', (select since from bounds),
    'totals', (select jsonb_build_object(
      'sessions', count(*),
      'visitors', count(distinct visitor_id),
      'pageviews', coalesce(sum(pageviews), 0),
      'bounces', count(*) filter (where bounce),
      'seconds', coalesce(round(avg(active_seconds)), 0),
      'conversions', count(*) filter (where converted_at is not null),
      'returning', count(*) filter (where returning_visitor),
      'paid', count(*) filter (where paid)
    ) from x),
    'previous', (select jsonb_build_object(
      'sessions', count(*),
      'visitors', count(distinct visitor_id),
      'pageviews', coalesce(sum(pageviews), 0),
      'bounces', count(*) filter (where pageviews <= 1 and active_seconds < 10 and converted_at is null),
      'seconds', coalesce(round(avg(active_seconds)), 0),
      'conversions', count(*) filter (where converted_at is not null)
    ) from prev),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', g.ts::date, 'sessions', coalesce(c.sessions, 0), 'paid', coalesce(c.paid, 0), 'conversions', coalesce(c.conversions, 0)
      ) order by g.ts), '[]')
      from generate_series(((select since from bounds) at time zone 'Europe/Amsterdam')::date::timestamp, (now() at time zone 'Europe/Amsterdam')::date::timestamp, interval '1 day') g(ts)
        left join (
          select (started_at at time zone 'Europe/Amsterdam')::date as day, count(*) as sessions,
            count(*) filter (where paid) as paid, count(*) filter (where converted_at is not null) as conversions
          from x group by 1
        ) c on c.day = g.ts::date
    ),
    'funnel', (select jsonb_build_object(
      'sessions', count(*),
      'engaged', count(*) filter (where not bounce),
      -- Each step is part of the one before, so the funnel only narrows.
      'clicked', count(*) filter (where not bounce and (clicks > 0 or form_starts > 0 or converted_at is not null)),
      'form', count(*) filter (where not bounce and (form_starts > 0 or converted_at is not null)),
      'converted', count(*) filter (where converted_at is not null)
    ) from x),
    'sources', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select source, medium, count(*) as sessions, count(distinct visitor_id) as visitors,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds)) as seconds,
        round(avg(pageviews), 1) as pages, count(*) filter (where converted_at is not null) as conversions
      from x group by source, medium order by count(*) desc limit 25
    ) t),
    'campaigns', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select campaign, mode() within group (order by landing_page) as page,
        count(*) as sessions, count(distinct visitor_id) as visitors,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds)) as seconds,
        round(avg(landing_scroll)) as scroll,
        count(*) filter (where clicks > 0) as clicked,
        count(*) filter (where form_starts > 0) as forms,
        count(*) filter (where converted_at is not null) as conversions,
        min(started_at) as first, max(started_at) as last
      from x where campaign <> '' group by campaign
    ) t),
    'variants', (select coalesce(jsonb_agg(t order by t.campaign, t.sessions desc), '[]') from (
      select campaign, content, count(*) as sessions,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds)) as seconds,
        round(avg(landing_scroll)) as scroll,
        count(*) filter (where converted_at is not null) as conversions
      from x where campaign <> '' and content <> '' group by campaign, content
    ) t),
    'landing', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select landing_page as path, count(*) as sessions,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds)) as seconds,
        round(avg(landing_scroll)) as scroll,
        count(*) filter (where converted_at is not null) as conversions
      from x group by landing_page order by count(*) desc limit 25
    ) t),
    'pages', (select coalesce(jsonb_agg(t order by t.views desc), '[]') from (
      select path, count(*) as views, count(distinct session_id) as sessions,
        round(avg(scroll)) as scroll, round(avg(duration_ms) / 1000.0) as seconds,
        count(*) filter (where last) as exits
      from views group by path order by count(*) desc limit 50
    ) t),
    'devices', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select device, count(*) as sessions, count(*) filter (where bounce) as bounces,
        count(*) filter (where converted_at is not null) as conversions
      from x group by device
    ) t),
    'hours', (select coalesce(jsonb_agg(jsonb_build_array(t.d, t.h, t.n)), '[]') from (
      select extract(isodow from started_at at time zone 'Europe/Amsterdam')::int as d,
        extract(hour from started_at at time zone 'Europe/Amsterdam')::int as h, count(*) as n
      from x group by 1, 2
    ) t),
    'events', (select coalesce(jsonb_agg(t order by t.count desc), '[]') from (
      select label, count(*) as count, count(distinct session_id) as sessions
      from ev where type = 'event' group by label
    ) t),
    'referrers', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select referrer, count(*) as sessions, count(*) filter (where converted_at is not null) as conversions
      from x where referrer <> '' group by referrer order by count(*) desc limit 15
    ) t)
  )
$$;

-- One page: how far down people get, what they click and where, and where
-- they came from and went next. Click points carry the device, so the admin
-- can split the map between phone and desktop without asking again.
create or replace function public.analytics_page(p_days int, p_filter jsonb, p_path text)
returns jsonb
language sql stable set search_path = '' as $$
  with s as (select x.* from public.analytics_sessions(public.analytics_since(p_days), now(), p_filter) x),
  ev as (select e.* from public.site_events e where e.session_id in (select id from s)),
  seq as (
    select ev.*, s.device,
      lag(ev.path) over w as prev_path,
      lead(ev.path) over w as next_path
    from ev join s on s.id = ev.session_id
    where ev.type = 'pageview'
    window w as (partition by ev.session_id order by ev.at)
  ),
  v as (select * from seq where path = p_path),
  c as (select ev.*, s.device from ev join s on s.id = ev.session_id where ev.type = 'click' and ev.path = p_path)
  select jsonb_build_object(
    'views', (select count(*) from v),
    'sessions', (select count(distinct session_id) from v),
    'seconds', (select coalesce(round(avg(duration_ms) / 1000.0), 0) from v),
    'scroll', (select coalesce(round(avg(scroll)), 0) from v),
    'entries', (select count(*) from v where prev_path is null),
    'exits', (select count(*) from v where next_path is null),
    -- [depth, all views, phone views, other views] that got at least that far.
    'reach', (select jsonb_agg(jsonb_build_array(d,
        (select count(*) from v where coalesce(v.scroll, 0) >= d),
        (select count(*) from v where coalesce(v.scroll, 0) >= d and v.device = 'mobile'),
        (select count(*) from v where coalesce(v.scroll, 0) >= d and v.device <> 'mobile')
      ) order by d) from generate_series(0, 100, 5) d),
    'clicks', (select count(*) from c),
    'rage', (select count(*) from c where c.props ? 'rage'),
    'targets', (select coalesce(jsonb_agg(t order by t.count desc), '[]') from (
      select label, target, coalesce(props ->> 'kind', '') as kind, count(*) as count, count(distinct session_id) as sessions
      from c group by 1, 2, 3 order by count(*) desc limit 30
    ) t),
    'points', (select coalesce(jsonb_agg(jsonb_build_array(round(p.x::numeric, 4), round(p.y::numeric, 4), p.device)), '[]') from (
      select x, y, device from c where x is not null and y is not null order by at desc limit 5000
    ) p),
    'from', (select coalesce(jsonb_agg(t order by t.count desc), '[]') from (
      select coalesce(prev_path, '') as path, count(*) as count from v group by 1 order by 2 desc limit 10
    ) t),
    'next', (select coalesce(jsonb_agg(t order by t.count desc), '[]') from (
      select coalesce(next_path, '') as path, count(*) as count from v group by 1 order by 2 desc limit 10
    ) t)
  )
$$;

-- The visits themselves, newest first, with the inquiry each one led to.
create or replace function public.analytics_visits(p_days int, p_filter jsonb, p_converted boolean, p_offset int, p_limit int)
returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(t order by t.started_at desc), '[]') from (
    select s.id, s.started_at, s.last_seen_at, s.landing_page, s.referrer, s.source, s.medium, s.campaign, s.content,
      s.paid, s.device, s.browser, s.os, s.returning_visitor, s.pageviews, s.active_seconds, s.converted_at,
      (select count(*) from public.site_events e where e.session_id = s.id and e.type = 'click') as clicks,
      (select max(e.scroll) from public.site_events e where e.session_id = s.id and e.type = 'pageview') as scroll,
      (select i.name from public.inquiries i where i.site_session_id = s.id order by i.created_at limit 1) as inquiry
    from public.analytics_sessions(public.analytics_since(p_days), now(), p_filter) s
    where not p_converted or s.converted_at is not null
    order by s.started_at desc
    offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 200)
  ) t
$$;

revoke execute on function public.analytics_since(int) from public, anon, authenticated;
revoke execute on function public.analytics_sessions(timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_summary(int, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_page(int, jsonb, text) from public, anon, authenticated;
revoke execute on function public.analytics_visits(int, jsonb, boolean, int, int) from public, anon, authenticated;
