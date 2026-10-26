// Development only: three months of made-up visits for the Advertenties page,
// summed the way the SQL functions in 20261026120000_site_analytics.sql do.

type Json = any;

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;
const DAY = 86400000;

const SOURCES = [
  { source: "Instagram", medium: "paid", campaign: "insta-automotive-1", content: "video-1", paid: true, w: 26, landing: "/services/fotografie/automotive" },
  { source: "Instagram", medium: "paid", campaign: "insta-automotive-1", content: "carrousel", paid: true, w: 14, landing: "/services/fotografie/automotive" },
  { source: "Facebook", medium: "paid", campaign: "fb-sport-najaar", content: "", paid: true, w: 12, landing: "/services/fotografie/sport" },
  { source: "Google", medium: "organic", campaign: "", content: "", paid: false, w: 18, landing: "/" },
  { source: "Direct", medium: "direct", campaign: "", content: "", paid: false, w: 15, landing: "/" },
  { source: "Instagram", medium: "social", campaign: "", content: "", paid: false, w: 9, landing: "/portfolio" },
  { source: "ChatGPT", medium: "ai", campaign: "", content: "", paid: false, w: 2, landing: "/services/fotografie" },
  { source: "autoweek.nl", medium: "referral", campaign: "", content: "", paid: false, w: 3, landing: "/services/fotografie/automotive" },
];
const PAGES = ["/", "/services/fotografie", "/services/fotografie/automotive", "/services/fotografie/sport", "/portfolio", "/about", "/services/social-media"];
const BUTTONS = [
  { label: "Bekijk pakketten", kind: "button", target: "button", x: 0.5, y: 0.18 },
  { label: "Premium", kind: "button", target: "button", x: 0.7, y: 0.42 },
  { label: "Basis", kind: "button", target: "button", x: 0.3, y: 0.42 },
  { label: "Portfolio", kind: "link", target: "/portfolio", x: 0.62, y: 0.02 },
  { label: "Foto", kind: "other", target: "img", x: 0.45, y: 0.3 },
  { label: "+31 6 36112514", kind: "link", target: "tel:+31636112514", x: 0.5, y: 0.96 },
  { label: "Naam", kind: "field", target: "text", x: 0.5, y: 0.72 },
];

function weighted() {
  const total = SOURCES.reduce((s, x) => s + x.w, 0);
  let r = rand() * total;
  for (const s of SOURCES) if ((r -= s.w) < 0) return s;
  return SOURCES[0];
}

type Session = Json & { events: Json[] };

const sessions: Session[] = [];
const now = Date.now();
for (let i = 0; i < 900; i++) {
  const src = weighted();
  const ageDays = Math.floor(Math.pow(rand(), 1.4) * 90);
  const hour = pick([9, 10, 12, 13, 17, 19, 20, 20, 21, 21, 22, 8, 15]);
  const start = new Date(now - ageDays * DAY);
  start.setHours(hour, Math.floor(rand() * 60), 0, 0);
  if (+start > now) start.setTime(now - 3600_000);
  const device = rand() < 0.74 ? "mobile" : rand() < 0.85 ? "desktop" : "tablet";
  const bounce = rand() < (src.paid ? 0.48 : 0.36);
  const pages = bounce ? 1 : 1 + Math.floor(rand() * 4);
  const events: Json[] = [];
  let t = +start;
  let path = src.landing;
  let total = 0;
  let converted: string | null = null;
  for (let p = 0; p < pages; p++) {
    const ms = bounce ? 2000 + rand() * 6000 : 8000 + rand() * 90000;
    const v = `v${i}-${p}`;
    events.push({ type: "pageview", view_id: v, at: new Date(t).toISOString(), path, label: "", target: "", scroll: bounce ? 10 + Math.floor(rand() * 25) : 30 + Math.floor(rand() * 71), duration_ms: Math.round(ms), props: {} });
    const clicks = bounce ? (rand() < 0.2 ? 1 : 0) : Math.floor(rand() * 5);
    for (let c = 0; c < clicks; c++) {
      const b = pick(BUTTONS);
      t += 1500 + rand() * 6000;
      events.push({ type: "click", view_id: v, at: new Date(t).toISOString(), path, label: b.label, target: b.target, x: Math.min(1, Math.max(0, b.x + (rand() - 0.5) * 0.2)), y: Math.min(1, Math.max(0, b.y + (rand() - 0.5) * 0.06)), props: { kind: b.kind, ...(rand() < 0.03 ? { rage: "1" } : {}) } });
      if (b.label === "Premium" || b.label === "Basis") events.push({ type: "event", view_id: v, at: new Date(t).toISOString(), path, label: "Pakket gekozen", target: "", props: { pakket: b.label } });
    }
    if (!bounce && path.startsWith("/services") && rand() < 0.3) {
      t += 4000;
      events.push({ type: "form", view_id: v, at: new Date(t).toISOString(), path, label: "Aanvraagformulier", target: "", props: { step: "start", field: "Naam" } });
      if (rand() < 0.45) {
        t += 40000;
        events.push({ type: "form", view_id: v, at: new Date(t).toISOString(), path, label: "Aanvraagformulier", target: "", props: { step: "submit" } });
        events.push({ type: "event", view_id: v, at: new Date(t).toISOString(), path, label: "Aanvraag", target: "", props: { formulier: "automotive" } });
        converted = new Date(t).toISOString();
      } else {
        events.push({ type: "form", view_id: v, at: new Date(t + 20000).toISOString(), path, label: "Aanvraagformulier", target: "", props: { step: "abandon", field: pick(["E-mail", "Telefoon", "Bericht"]) } });
      }
    }
    total += ms;
    t += ms;
    path = pick(PAGES.filter((x) => x !== path));
  }
  sessions.push({
    id: id(i), visitor_id: id(5000 + Math.floor(rand() * 700)), started_at: start.toISOString(), last_seen_at: new Date(t).toISOString(),
    landing_page: src.landing, referrer: src.medium === "referral" ? src.source : src.medium === "organic" ? "google.com" : src.paid ? "l.instagram.com" : "",
    source: src.source, medium: src.medium, campaign: src.campaign, content: src.content, term: "", paid: src.paid,
    device, browser: device === "mobile" ? pick(["Instagram-app", "Safari", "Chrome"]) : pick(["Chrome", "Safari", "Edge"]),
    os: device === "desktop" ? pick(["Windows", "macOS"]) : pick(["iOS", "Android"]), screen: device === "mobile" ? "390x844" : "1920x1080",
    language: "nl-NL", timezone: "Europe/Amsterdam", returning_visitor: rand() < 0.18, pageviews: pages, active_seconds: Math.round(total / 1000),
    converted_at: converted, inquiry: converted ? pick(["Daan de Vries", "Sven Jansen", "Lotte Bakker", "Mo Ait"]) : null, events,
  });
}

function since(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return +d - (days - 1) * DAY;
}

function filtered(s: URLSearchParams, from: number, to = Date.now()) {
  const seg = s.get("segment") || "";
  const device = s.get("device") || "";
  return sessions.filter((x) => {
    const t = +new Date(x.started_at);
    if (t < from || t >= to) return false;
    if (seg === "ads" && !x.paid) return false;
    if (seg === "organic" && x.paid) return false;
    if (seg.startsWith("c:") && x.campaign !== seg.slice(2)) return false;
    if (seg.startsWith("s:") && x.source !== seg.slice(2)) return false;
    if (device && x.device !== device) return false;
    return true;
  });
}

const isBounce = (x: Session) => x.pageviews <= 1 && x.active_seconds < 10 && !x.converted_at;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
function groupBy<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) || []), x]);
  return m;
}
const landingScroll = (x: Session) => x.events.find((e: Json) => e.type === "pageview")?.scroll ?? null;
const clicked = (x: Session) => x.events.some((e: Json) => e.type === "click" && ["link", "button", "field"].includes(e.props.kind));
const formed = (x: Session) => x.events.some((e: Json) => e.type === "form" && e.props.step === "start");

function totals(xs: Session[]) {
  return {
    sessions: xs.length, visitors: new Set(xs.map((x) => x.visitor_id)).size, pageviews: xs.reduce((s, x) => s + x.pageviews, 0),
    bounces: xs.filter(isBounce).length, seconds: avg(xs.map((x) => x.active_seconds)), conversions: xs.filter((x) => x.converted_at).length,
    returning: xs.filter((x) => x.returning_visitor).length, paid: xs.filter((x) => x.paid).length,
  };
}

function summary(s: URLSearchParams) {
  const days = Number(s.get("days") || 30);
  const from = since(days);
  const xs = filtered(s, from);
  const prev = filtered(s, from - (Date.now() - from), from);
  const views = xs.flatMap((x) => x.events.filter((e: Json) => e.type === "pageview").map((e: Json, i: number, all: Json[]) => ({ ...e, last: i === all.length - 1 })));
  const daily = [];
  for (let t = from; t <= Date.now(); t += DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    const on = xs.filter((x) => new Date(x.started_at).toISOString().slice(0, 10) === day);
    daily.push({ day, sessions: on.length, paid: on.filter((x) => x.paid).length, conversions: on.filter((x) => x.converted_at).length });
  }
  const camp = [...groupBy(xs.filter((x) => x.campaign), (x) => x.campaign)].map(([campaign, g]) => ({
    campaign, page: g[0].landing_page, sessions: g.length, visitors: new Set(g.map((x) => x.visitor_id)).size, bounces: g.filter(isBounce).length,
    seconds: avg(g.map((x) => x.active_seconds)), scroll: avg(g.map(landingScroll)), clicked: g.filter(clicked).length, forms: g.filter(formed).length,
    conversions: g.filter((x) => x.converted_at).length, first: g[g.length - 1].started_at, last: g[0].started_at,
  }));
  const hours = [...groupBy(xs, (x) => { const d = new Date(x.started_at); return `${((d.getDay() + 6) % 7) + 1}-${d.getHours()}`; })].map(([k, g]) => [...k.split("-").map(Number), g.length]);
  const events = [...groupBy(xs.flatMap((x) => x.events.filter((e: Json) => e.type === "event").map((e: Json) => ({ ...e, sid: x.id }))), (e: Json) => e.label)]
    .map(([label, g]) => ({ label, count: g.length, sessions: new Set(g.map((e: Json) => e.sid)).size })).sort((a, b) => b.count - a.count);
  return {
    since: new Date(from).toISOString(),
    totals: totals(xs),
    previous: totals(prev),
    daily,
    funnel: {
      sessions: xs.length, engaged: xs.filter((x) => !isBounce(x)).length,
      clicked: xs.filter((x) => !isBounce(x) && (clicked(x) || formed(x) || x.converted_at)).length,
      form: xs.filter((x) => !isBounce(x) && (formed(x) || x.converted_at)).length,
      converted: xs.filter((x) => x.converted_at).length,
    },
    sources: [...groupBy(xs, (x) => `${x.source}|${x.medium}`)].map(([k, g]) => ({
      source: k.split("|")[0], medium: k.split("|")[1], sessions: g.length, visitors: new Set(g.map((x) => x.visitor_id)).size, bounces: g.filter(isBounce).length,
      seconds: avg(g.map((x) => x.active_seconds)), pages: Math.round((g.reduce((s, x) => s + x.pageviews, 0) / g.length) * 10) / 10, conversions: g.filter((x) => x.converted_at).length,
    })).sort((a, b) => b.sessions - a.sessions),
    campaigns: camp.sort((a, b) => b.sessions - a.sessions),
    variants: [...groupBy(xs.filter((x) => x.campaign && x.content), (x) => `${x.campaign}|${x.content}`)].map(([k, g]) => ({
      campaign: k.split("|")[0], content: k.split("|")[1], sessions: g.length, bounces: g.filter(isBounce).length, seconds: avg(g.map((x) => x.active_seconds)),
      scroll: avg(g.map(landingScroll)), conversions: g.filter((x) => x.converted_at).length,
    })),
    landing: [...groupBy(xs, (x) => x.landing_page)].map(([path, g]) => ({
      path, sessions: g.length, bounces: g.filter(isBounce).length, seconds: avg(g.map((x) => x.active_seconds)), scroll: avg(g.map(landingScroll)), conversions: g.filter((x) => x.converted_at).length,
    })).sort((a, b) => b.sessions - a.sessions),
    pages: [...groupBy(views, (v: Json) => v.path)].map(([path, g]) => ({
      path, views: g.length, sessions: g.length, scroll: avg(g.map((v: Json) => v.scroll)), seconds: avg(g.map((v: Json) => v.duration_ms / 1000)), exits: g.filter((v: Json) => v.last).length,
    })).sort((a, b) => b.views - a.views),
    devices: [...groupBy(xs, (x) => x.device)].map(([device, g]) => ({ device, sessions: g.length, bounces: g.filter(isBounce).length, conversions: g.filter((x) => x.converted_at).length })).sort((a, b) => b.sessions - a.sessions),
    hours,
    events,
    referrers: [...groupBy(xs.filter((x) => x.referrer), (x) => x.referrer)].map(([referrer, g]) => ({ referrer, sessions: g.length, conversions: g.filter((x) => x.converted_at).length })).sort((a, b) => b.sessions - a.sessions),
  };
}

function page(s: URLSearchParams) {
  const path = s.get("path") || "/";
  const xs = filtered(s, since(Number(s.get("days") || 30)));
  const seq = xs.flatMap((x) => {
    const pv = x.events.filter((e: Json) => e.type === "pageview");
    return pv.map((e: Json, i: number) => ({ ...e, device: x.device, prev: pv[i - 1]?.path ?? "", next: pv[i + 1]?.path ?? "" }));
  });
  const v = seq.filter((e) => e.path === path);
  const c = xs.flatMap((x) => x.events.filter((e: Json) => e.type === "click" && e.path === path).map((e: Json) => ({ ...e, device: x.device, sid: x.id })));
  const reach = [];
  for (let d = 0; d <= 100; d += 5) {
    reach.push([d, v.filter((e) => e.scroll >= d).length, v.filter((e) => e.scroll >= d && e.device === "mobile").length, v.filter((e) => e.scroll >= d && e.device !== "mobile").length]);
  }
  const count = (key: (e: Json) => string) => [...groupBy(v, key)].map(([p, g]) => ({ path: p, count: g.length })).sort((a, b) => b.count - a.count).slice(0, 10);
  return {
    views: v.length, sessions: v.length, seconds: avg(v.map((e) => e.duration_ms / 1000)), scroll: avg(v.map((e) => e.scroll)),
    entries: v.filter((e) => !e.prev).length, exits: v.filter((e) => !e.next).length, reach, clicks: c.length, rage: c.filter((e) => e.props.rage).length,
    targets: [...groupBy(c, (e: Json) => `${e.label}|${e.target}|${e.props.kind}`)].map(([k, g]) => ({ label: k.split("|")[0], target: k.split("|")[1], kind: k.split("|")[2], count: g.length, sessions: new Set(g.map((e: Json) => e.sid)).size })).sort((a, b) => b.count - a.count),
    points: c.map((e) => [e.x, e.y, e.device]),
    from: count((e) => e.prev),
    next: count((e) => e.next),
  };
}

export function analyticsMock(p: string, method: string, url: URL): Json | undefined {
  const s = url.searchParams;
  if (method === "GET" && p === "/admin/analytics") return summary(s);
  if (method === "GET" && p === "/admin/analytics/page") return page(s);
  if (method === "GET" && p === "/admin/analytics/visits") {
    const offset = Number(s.get("offset") || 0);
    const xs = filtered(s, since(Number(s.get("days") || 30))).filter((x) => s.get("converted") !== "1" || x.converted_at)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
    const visits = xs.slice(offset, offset + 50).map(({ events, ...x }) => ({
      ...x, clicks: events.filter((e: Json) => e.type === "click").length, scroll: Math.max(...events.filter((e: Json) => e.type === "pageview").map((e: Json) => e.scroll)),
    }));
    return { visits, more: offset + 50 < xs.length };
  }
  const m = p.match(/^\/admin\/analytics\/visit\/([^/]+)$/);
  if (m && method === "GET") {
    const x = sessions.find((y) => y.id === m[1]);
    if (!x) return undefined;
    const { events, inquiry, ...visit } = x;
    return {
      visit, events,
      others: sessions.filter((y) => y.visitor_id === x.visitor_id && y.id !== x.id).map(({ events: _e, ...y }) => y),
      inquiries: inquiry ? [{ id: id(99000), name: inquiry, created_at: x.converted_at }] : [],
    };
  }
  if (m && method === "DELETE") {
    const i = sessions.findIndex((y) => y.id === m[1]);
    if (i >= 0) sessions.splice(i, 1);
    return { success: true };
  }
  return undefined;
}
