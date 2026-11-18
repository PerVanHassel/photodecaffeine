-- Meta checks every ad link: it opens the page several times within a second,
-- each time pretending to be another phone or computer, without consent and
-- without doing anything. Those visits made the ads look worse than they are
-- (52 of them up to 18 November 2026, 33 on paid links). They are kept, but
-- marked, left out of every sum and counted on their own as "meta_checks".
-- A visitor who said yes to cookies or sent an inquiry is never marked.

alter table public.site_sessions add column if not exists meta_check boolean not null default false;

update public.site_sessions s set meta_check = true
where s.referrer ~ '(^|\.)(facebook|instagram)\.com$' and s.screen = '' and s.converted_at is null
  and exists (
    select 1 from public.site_sessions o
    where o.id <> s.id and o.referrer ~ '(^|\.)(facebook|instagram)\.com$' and o.screen = ''
      and o.started_at between s.started_at - interval '1.5 seconds' and s.started_at + interval '1.5 seconds'
  );

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
    -- Meta checks an ad link by opening it a few times within a second, each
    -- time as another phone or computer. Real people do not arrive like that.
    if p_session ->> 'referrer' ~ '(^|\.)(facebook|instagram)\.com$' and coalesce(p_session ->> 'screen', '') = '' then
      -- The first batch can come in up to half a minute after the visit began,
      -- so the window is around the start of the visit, not around now.
      update public.site_sessions o set meta_check = true
      from (select started_at from public.site_sessions where id = sid) me
      where o.referrer ~ '(^|\.)(facebook|instagram)\.com$' and o.screen = '' and o.converted_at is null
        and o.started_at between me.started_at - interval '1.5 seconds' and me.started_at + interval '1.5 seconds'
        and o.id <> sid;
      if found then
        update public.site_sessions set meta_check = true where id = sid;
      end if;
    end if;
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

  -- Whoever sends an inquiry is a person, whatever the start looked like.
  update public.site_sessions set meta_check = false where id = sid and meta_check and converted_at is not null;
end $$;
revoke execute on function public.track_batch(jsonb, jsonb) from public, anon, authenticated;

-- Every visit in a period that matches the filter, Meta's checks included.
create or replace function public.analytics_sessions_all(p_since timestamptz, p_until timestamptz, p_filter jsonb)
returns setof public.site_sessions
language sql stable set search_path = '' as $$
  select * from public.site_sessions s
  where s.started_at >= p_since and s.started_at < p_until
    and (p_filter ->> 'campaign' is null or s.campaign = p_filter ->> 'campaign')
    and (p_filter ->> 'source' is null or s.source = p_filter ->> 'source')
    and (p_filter ->> 'device' is null or s.device = p_filter ->> 'device')
    and (p_filter ->> 'paid' is null or s.paid = (p_filter ->> 'paid')::boolean)
$$;

-- The visits the statistics count: without Meta's checks.
create or replace function public.analytics_sessions(p_since timestamptz, p_until timestamptz, p_filter jsonb)
returns setof public.site_sessions
language sql stable set search_path = '' as $$
  select * from public.analytics_sessions_all(p_since, p_until, p_filter) s where not s.meta_check
$$;

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
      'meta_checks', (select count(*) from bounds, public.analytics_sessions_all(bounds.since, bounds.until, p_filter) m where m.meta_check),
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

revoke execute on function public.analytics_sessions_all(timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_sessions(timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_summary(int, jsonb) from public, anon, authenticated;
