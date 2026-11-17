-- Time on the site is only measured after a yes in the cookie banner
-- (src/app/lib/analytics.ts). Without one a visit is stored with 0 seconds,
-- which made ad visits from the Instagram app look like they left at once.
-- Averages now only use the visits that were measured, and the admin shows
-- the rest as "niet gemeten". A measured visit always has a screen size.

alter table public.site_sessions
  add column if not exists measured boolean generated always as (screen <> '') stored;

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
      'measured', count(*) filter (where measured),
      'visitors', count(distinct visitor_id),
      'pageviews', coalesce(sum(pageviews), 0),
      'bounces', count(*) filter (where bounce),
      'seconds', round(avg(active_seconds) filter (where measured)),
      'conversions', count(*) filter (where converted_at is not null),
      'returning', count(*) filter (where returning_visitor),
      'paid', count(*) filter (where paid)
    ) from x),
    'previous', (select jsonb_build_object(
      'sessions', count(*),
      'visitors', count(distinct visitor_id),
      'pageviews', coalesce(sum(pageviews), 0),
      'bounces', count(*) filter (where pageviews <= 1 and active_seconds < 10 and converted_at is null),
      'seconds', round(avg(active_seconds) filter (where measured)),
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
        count(*) filter (where bounce) as bounces, round(avg(active_seconds) filter (where measured)) as seconds,
        round(avg(pageviews), 1) as pages, count(*) filter (where converted_at is not null) as conversions
      from x group by source, medium order by count(*) desc limit 25
    ) t),
    'campaigns', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select campaign, mode() within group (order by landing_page) as page,
        count(*) as sessions, count(*) filter (where measured) as measured, count(distinct visitor_id) as visitors,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds) filter (where measured)) as seconds,
        round(avg(landing_scroll)) as scroll,
        count(*) filter (where clicks > 0) as clicked,
        count(*) filter (where form_starts > 0) as forms,
        count(*) filter (where converted_at is not null) as conversions,
        min(started_at) as first, max(started_at) as last
      from x where campaign <> '' group by campaign
    ) t),
    'variants', (select coalesce(jsonb_agg(t order by t.campaign, t.sessions desc), '[]') from (
      select campaign, content, count(*) as sessions,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds) filter (where measured)) as seconds,
        round(avg(landing_scroll)) as scroll,
        count(*) filter (where converted_at is not null) as conversions
      from x where campaign <> '' and content <> '' group by campaign, content
    ) t),
    'landing', (select coalesce(jsonb_agg(t order by t.sessions desc), '[]') from (
      select landing_page as path, count(*) as sessions,
        count(*) filter (where bounce) as bounces, round(avg(active_seconds) filter (where measured)) as seconds,
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

create or replace function public.analytics_visits(p_days int, p_filter jsonb, p_converted boolean, p_offset int, p_limit int)
returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(t order by t.started_at desc), '[]') from (
    select s.id, s.started_at, s.last_seen_at, s.landing_page, s.referrer, s.source, s.medium, s.campaign, s.content,
      s.paid, s.device, s.browser, s.os, s.returning_visitor, s.pageviews, s.active_seconds, s.measured, s.converted_at,
      (select count(*) from public.site_events e where e.session_id = s.id and e.type = 'click') as clicks,
      (select max(e.scroll) from public.site_events e where e.session_id = s.id and e.type = 'pageview') as scroll,
      (select i.name from public.inquiries i where i.site_session_id = s.id order by i.created_at limit 1) as inquiry
    from public.analytics_sessions(public.analytics_since(p_days), now(), p_filter) s
    where not p_converted or s.converted_at is not null
    order by s.started_at desc
    offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 200)
  ) t
$$;

revoke execute on function public.analytics_summary(int, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_visits(int, jsonb, boolean, int, int) from public, anon, authenticated;
