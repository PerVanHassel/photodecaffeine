import { Hono } from "npm:hono";
import { SITE_URL } from "../lib/config.ts";
import { db, found, must } from "../lib/db.ts";
import { type Env, isoDateTime, readBody, requireAdmin, requirePermission, text, uuid, z } from "../lib/http.ts";
import { toIcs } from "../lib/ics.ts";
import { eventToApi } from "../lib/projects.ts";

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin";
r.use(`${A}/events`, requireAdmin, requirePermission("manageClients", "projecten en planning"));
r.use(`${A}/events/*`, requireAdmin, requirePermission("manageClients", "projecten en planning"));
r.use(`${A}/calendar-feed`, requireAdmin);

const SELECT = "*, projects ( id, title, stage, project_clients ( clients ( name ) ) ), locations ( id, name, address, lat, lng )";

function withContext(e: any) {
  return {
    ...eventToApi(e),
    projectId: e.project_id,
    projectTitle: e.projects?.title || "",
    projectStage: e.projects?.stage || "",
    clientNames: (e.projects?.project_clients || []).map((pc: any) => pc.clients?.name).filter(Boolean),
    location: e.locations ? { id: e.locations.id, name: e.locations.name, address: e.locations.address, lat: e.locations.lat, lng: e.locations.lng } : null,
    updatedAt: e.updated_at,
  };
}

// ?from=&to= (ISO) limits the range; ?projectId= limits to one project.
r.get(`${A}/events`, async (c) => {
  let q = db.from("events").select(SELECT).order("starts_at");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const projectId = c.req.query("projectId");
  if (from) q = q.gte("starts_at", from);
  if (to) q = q.lt("starts_at", to);
  if (projectId) q = q.eq("project_id", projectId);
  const events = (must(await q) || []).map(withContext);

  // Project deadlines are part of the calendar without being events.
  let dq = db.from("projects").select("id, title, stage, due_date").not("due_date", "is", null).not("stage", "in", "(delivered,review,archived)");
  if (from) dq = dq.gte("due_date", from.slice(0, 10));
  if (to) dq = dq.lt("due_date", to.slice(0, 10));
  if (projectId) dq = dq.eq("id", projectId);
  const deadlines = (must(await dq) || []).map((p: any) => ({
    id: `due-${p.id}`,
    kind: "deadline",
    title: `Deadline: ${p.title}`,
    startsAt: `${p.due_date}T00:00:00.000Z`,
    endsAt: null,
    allDay: true,
    projectId: p.id,
    projectTitle: p.title,
    projectStage: p.stage,
    derived: true,
  }));
  return c.json({ events: [...events, ...deadlines] });
});

const eventSchema = z.object({
  kind: z.enum(["shoot", "meeting", "deadline", "edit", "other"]).default("shoot"),
  title: text(200).default(""),
  startsAt: isoDateTime,
  endsAt: isoDateTime.nullable().optional(),
  allDay: z.boolean().default(false),
  projectId: uuid.nullable().optional(),
  locationId: uuid.nullable().optional(),
  locationText: text(500).default(""),
  link: text(500).default(""),
  notes: text(5000).default(""),
  clientVisible: z.boolean().default(true),
});

function toRow(b: Partial<z.infer<typeof eventSchema>>) {
  const row: Record<string, unknown> = {};
  if (b.kind !== undefined) row.kind = b.kind;
  if (b.title !== undefined) row.title = b.title;
  if (b.startsAt !== undefined) row.starts_at = new Date(b.startsAt).toISOString();
  if (b.endsAt !== undefined) row.ends_at = b.endsAt ? new Date(b.endsAt).toISOString() : null;
  if (b.allDay !== undefined) row.all_day = b.allDay;
  if (b.projectId !== undefined) row.project_id = b.projectId;
  if (b.locationId !== undefined) row.location_id = b.locationId;
  if (b.locationText !== undefined) row.location_text = b.locationText;
  if (b.link !== undefined) row.link = b.link;
  if (b.notes !== undefined) row.notes = b.notes;
  if (b.clientVisible !== undefined) row.client_visible = b.clientVisible;
  return row;
}

r.post(`${A}/events`, async (c) => {
  const b = await readBody(c, eventSchema);
  const row = must(await db.from("events").insert(toRow(b)).select(SELECT).single());
  // A shoot on the calendar means the project is booked.
  if (b.kind === "shoot" && b.projectId) {
    await db.from("projects").update({ stage: "booked" }).eq("id", b.projectId).in("stage", ["lead", "quote"]);
  }
  return c.json({ event: withContext(row) });
});

r.put(`${A}/events/:id`, async (c) => {
  const b = await readBody(c, eventSchema.partial());
  const row = found(await db.from("events").update(toRow(b)).eq("id", c.req.param("id")).select(SELECT).maybeSingle(), "Afspraak niet gevonden");
  return c.json({ event: withContext(row) });
});

r.delete(`${A}/events/:id`, async (c) => {
  must(await db.from("events").delete().eq("id", c.req.param("id")));
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Calendar subscription
// ---------------------------------------------------------------------------
// A private token URL that Google/Apple Calendar can poll. The site proxies it
// at /api/calendar/<token>.ics, because calendar apps cannot send the API key
// the function gateway asks for.

function feedUrl(token: string) {
  return `${SITE_URL}/api/calendar/${token}.ics`;
}

r.get(`${A}/calendar-feed`, async (c) => {
  const user = c.get("user");
  let row = must(await db.from("calendar_feeds").select("token").eq("user_id", user.id).maybeSingle()) as any;
  if (!row) row = must(await db.from("calendar_feeds").insert({ user_id: user.id }).select("token").single());
  return c.json({ url: feedUrl(row.token) });
});

// A new URL; the old one stops working.
r.post(`${A}/calendar-feed`, async (c) => {
  const user = c.get("user");
  must(await db.from("calendar_feeds").delete().eq("user_id", user.id));
  const row = must(await db.from("calendar_feeds").insert({ user_id: user.id }).select("token").single()) as any;
  return c.json({ url: feedUrl(row.token) });
});

r.get("/make-server-0951c59e/calendar/:token", async (c) => {
  const token = c.req.param("token").replace(/\.ics$/, "");
  const feed = must(await db.from("calendar_feeds").select("user_id").eq("token", token).maybeSingle());
  if (!feed) return c.text("Not found", 404);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows = must(await db.from("events").select(SELECT).gte("starts_at", since).order("starts_at")) || [];
  const kindLabel: Record<string, string> = { shoot: "Shoot", meeting: "Meeting", deadline: "Deadline", edit: "Bewerken", other: "" };
  const ics = toIcs("PDC Studio", rows.map((e: any) => {
    const ctx = withContext(e);
    const who = ctx.clientNames.join(", ");
    const title = e.title || [kindLabel[e.kind], ctx.projectTitle].filter(Boolean).join(": ") || "Afspraak";
    return {
      uid: e.id,
      title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      allDay: e.all_day,
      location: ctx.location ? [ctx.location.name, ctx.location.address].filter(Boolean).join(", ") : e.location_text,
      lat: ctx.location?.lat ?? null,
      lng: ctx.location?.lng ?? null,
      description: [who && `Klant: ${who}`, e.notes].filter(Boolean).join("\n"),
      url: e.project_id ? `${SITE_URL}/admin/project/${e.project_id}` : undefined,
      updatedAt: e.updated_at,
    };
  }));
  return c.body(ics, 200, { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" });
});
