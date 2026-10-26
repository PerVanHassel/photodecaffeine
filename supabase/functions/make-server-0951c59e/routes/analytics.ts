import { Hono } from "npm:hono";
import { db, found, must } from "../lib/db.ts";
import { type Env, requireAdmin, requirePermission, z } from "../lib/http.ts";

// Bezoekersstatistieken: the public site's own analytics (src/app/lib/analytics.ts
// sends them, the admin's Advertenties page reads them). Storage and the sums
// are SQL functions in supabase/migrations/20261026120000_site_analytics.sql.

const r = new Hono<Env>();
export default r;

// Same list as the browser side: anything that announces itself as a robot.
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|prerender|phantom|selenium|puppeteer|playwright/i;

const str = (max: number) => z.string().catch("").transform((s) => s.slice(0, max));
const num = (min: number, max: number) => z.number().finite().transform((n) => Math.min(max, Math.max(min, n)));

const Session = z.object({
  id: z.string().uuid(),
  visitor: z.string().uuid(),
  age: num(0, 86_400_000).catch(0),
  landing: str(300),
  referrer: str(200),
  source: str(100),
  medium: str(50),
  campaign: str(100),
  content: str(100),
  term: str(100),
  paid: z.boolean().catch(false),
  device: z.enum(["mobile", "tablet", "desktop"]).catch("desktop"),
  browser: str(40),
  os: str(40),
  screen: str(20),
  language: str(20),
  timezone: str(60),
  returning: z.boolean().catch(false),
});

const Event = z.object({
  t: z.enum(["pageview", "progress", "click", "form", "event"]),
  v: str(20),
  age: num(0, 86_400_000).catch(0),
  path: str(300).optional(),
  label: str(120).optional(),
  target: str(300).optional(),
  x: num(0, 1).optional().catch(undefined),
  y: num(0, 1).optional().catch(undefined),
  scroll: num(0, 100).transform((n) => Math.round(n)).optional().catch(undefined),
  ms: num(0, 4 * 3600_000).transform((n) => Math.round(n)).optional().catch(undefined),
  // A few short words about the event ({ kind: "link" }); nothing longer is kept.
  props: z.record(z.unknown()).optional().catch(undefined).transform((p) =>
    p ? Object.fromEntries(Object.entries(p).slice(0, 8).map(([k, v]) => [k.slice(0, 30), String(v ?? "").slice(0, 100)])) : undefined
  ),
});

const Batch = z.object({ s: Session, e: z.array(z.unknown()).max(60) });

// --- POST /v — a batch from the site ---
// Sent with sendBeacon through the site's /api/v (api/v.ts adds the anon key),
// as text/plain and without a login. It answers 204 whatever happens: the
// visitor's page never waits on it or hears of it.
r.post("/make-server-0951c59e/v", async (c) => {
  try {
    if (BOTS.test(c.req.header("user-agent") || "")) return c.body(null, 204);
    const batch = Batch.safeParse(JSON.parse(await c.req.text()));
    if (!batch.success) return c.body(null, 204);
    const events = batch.data.e.flatMap((raw) => {
      const e = Event.safeParse(raw);
      return e.success ? [e.data] : [];
    });
    const { error } = await db.rpc("track_batch", { p_session: batch.data.s, p_events: events });
    if (error) console.log("track_batch failed:", error.message);
  } catch (err) {
    console.log("statistics batch dropped:", err);
  }
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const A = "/make-server-0951c59e/admin/analytics";
r.use(A, requireAdmin, requirePermission("manageAds", "advertenties"));
r.use(`${A}/*`, requireAdmin, requirePermission("manageAds", "advertenties"));

/** ?days=30&segment=ads|organic|c:<campaign>|s:<source>&device=mobile */
function filterOf(c: { req: { query: (k: string) => string | undefined } }) {
  const days = Math.min(730, Math.max(1, Number(c.req.query("days")) || 30));
  const segment = c.req.query("segment") || "";
  const device = c.req.query("device") || "";
  const filter: Record<string, unknown> = {};
  if (segment === "ads") filter.paid = true;
  else if (segment === "organic") filter.paid = false;
  else if (segment.startsWith("c:")) filter.campaign = segment.slice(2);
  else if (segment.startsWith("s:")) filter.source = segment.slice(2);
  if (["mobile", "tablet", "desktop"].includes(device)) filter.device = device;
  return { days, filter };
}

r.get(A, async (c) => {
  const { days, filter } = filterOf(c);
  return c.json(must(await db.rpc("analytics_summary", { p_days: days, p_filter: filter })));
});

r.get(`${A}/page`, async (c) => {
  const { days, filter } = filterOf(c);
  const path = (c.req.query("path") || "/").slice(0, 300);
  return c.json(must(await db.rpc("analytics_page", { p_days: days, p_filter: filter, p_path: path })));
});

r.get(`${A}/visits`, async (c) => {
  const { days, filter } = filterOf(c);
  const offset = Math.max(0, Number(c.req.query("offset")) || 0);
  const visits = must(await db.rpc("analytics_visits", {
    p_days: days, p_filter: filter, p_converted: c.req.query("converted") === "1", p_offset: offset, p_limit: 50,
  })) as unknown[];
  return c.json({ visits, more: visits.length === 50 });
});

// One visit from start to end, and the same visitor's other visits.
r.get(`${A}/visit/:id`, async (c) => {
  const id = c.req.param("id");
  const visit = found(await db.from("site_sessions").select("*").eq("id", id).maybeSingle(), "Dit bezoek staat er niet (meer).") as any;
  const [events, others, inquiries] = await Promise.all([
    db.from("site_events").select("type, view_id, at, path, label, target, scroll, duration_ms, props")
      .eq("session_id", id).order("at").order("id").limit(3000),
    db.from("site_sessions").select("id, started_at, source, medium, campaign, paid, landing_page, pageviews, active_seconds, converted_at")
      .eq("visitor_id", visit.visitor_id).neq("id", id).order("started_at", { ascending: false }).limit(30),
    db.from("inquiries").select("id, name, created_at").eq("site_session_id", id).order("created_at"),
  ]);
  return c.json({ visit, events: must(events), others: must(others), inquiries: must(inquiries) });
});

// A visit that should not count, such as a test of one's own ad.
r.delete(`${A}/visit/:id`, async (c) => {
  must(await db.from("site_sessions").delete().eq("id", c.req.param("id")));
  return c.json({ success: true });
});
