import { Hono } from "npm:hono";
import { OWNER_EMAIL } from "../lib/config.ts";
import { db, must } from "../lib/db.ts";
import { type Env, requireAdmin } from "../lib/http.ts";

const r = new Hono<Env>();
export default r;

// Logboek: who changed what, and when (written by lib/activity.ts). Only the
// owner reads it; no role can be given access.
const A = "/make-server-0951c59e/admin/activity";
r.use(A, requireAdmin);
r.use(`${A}/*`, requireAdmin);
r.use(A, async (c, next) => {
  if (c.get("user").email !== OWNER_EMAIL) return c.json({ error: "Alleen de eigenaar kan het logboek zien." }, 403);
  await next();
});
r.use(`${A}/*`, async (c, next) => {
  if (c.get("user").email !== OWNER_EMAIL) return c.json({ error: "Alleen de eigenaar kan het logboek zien." }, 403);
  await next();
});

const PAGE = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toApi(row: any) {
  return {
    id: row.id,
    at: row.created_at,
    actor: { id: row.actor_id, name: row.actor_name, email: row.actor_email, kind: row.actor_kind },
    area: row.area,
    action: row.action,
    targetId: row.target_id,
    targetLabel: row.target_label,
    projectId: row.project_id,
    projectTitle: row.project_title,
    detail: row.detail,
    changes: row.changes || [],
    link: row.link,
  };
}

// Newest first, a page at a time: ?before=<at of the last entry shown>.
// Filters: area, kind (owner,team,…), who (a user id, or the e-mail or name of
// someone without a login), project, q (free text).
r.get(A, async (c) => {
  const p = (k: string) => (c.req.query(k) || "").trim();
  let q = db.from("activity_log").select("*").order("created_at", { ascending: false }).limit(PAGE + 1);
  if (p("before")) q = q.lt("created_at", p("before"));
  if (p("area")) q = q.eq("area", p("area"));
  if (p("kind")) q = q.in("actor_kind", p("kind").split(","));
  if (p("project") && UUID.test(p("project"))) q = q.eq("project_id", p("project"));
  const who = p("who");
  if (who) {
    q = UUID.test(who) ? q.eq("actor_id", who) : q.is("actor_id", null).eq(who.includes("@") ? "actor_email" : "actor_name", who);
  }
  // PostgREST reads , ( ) as syntax and * as a wildcard; none of them help a search.
  const term = p("q").replace(/[%_*,()\\]/g, " ").trim().slice(0, 100);
  if (term) {
    const like = `%${term}%`;
    q = q.or(["action", "target_label", "project_title", "actor_name", "actor_email", "detail"].map((f) => `${f}.ilike.${like}`).join(","));
  }
  const rows = (must(await q) || []) as any[];
  return c.json({ entries: rows.slice(0, PAGE).map(toApi), more: rows.length > PAGE });
});

r.get(`${A}/people`, async (c) => {
  const rows = (must(await db.rpc("activity_actors")) || []) as any[];
  return c.json({
    people: rows.map((p) => ({
      id: p.actor_id,
      name: p.actor_name,
      email: p.actor_email,
      kind: p.actor_kind,
      entries: Number(p.entries),
      lastAt: p.last_at,
    })),
  });
});
