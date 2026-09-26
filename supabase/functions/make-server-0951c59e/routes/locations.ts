import { Hono } from "npm:hono";
import { db, found, must } from "../lib/db.ts";
import { type Env, fail, readBody, requireAdmin, text, z } from "../lib/http.ts";
import { removePrivate, signPaths, uploadPrivate } from "../lib/storage.ts";

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/locations";
r.use(A, requireAdmin);
r.use(`${A}/*`, requireAdmin);

const KINDS = ["urban", "nature", "beach", "indoor", "studio", "other"] as const;
const LIGHT = ["", "morning", "midday", "evening", "night", "any"] as const;

const SELECT = "*, location_photos ( id, url, caption, sort ), projects ( id, title, stage ), events ( id, starts_at, kind, project_id )";

async function toApiList(rows: any[]) {
  const signed = await signPaths(rows.flatMap((l) => (l.location_photos || []).map((p: any) => p.url)));
  return rows.map((l) => {
    const photos = [...(l.location_photos || [])]
      .sort((a: any, b: any) => a.sort - b.sort)
      .map((p: any) => ({ id: p.id, url: signed.get(p.url) || "", caption: p.caption }));
    const projectIds = new Set([...(l.projects || []).map((p: any) => p.id), ...(l.events || []).map((e: any) => e.project_id).filter(Boolean)]);
    const lastUsed = (l.events || []).map((e: any) => e.starts_at).sort().pop() || null;
    return {
      id: l.id,
      name: l.name,
      kind: l.kind,
      lat: l.lat,
      lng: l.lng,
      address: l.address,
      notes: l.notes,
      parking: l.parking,
      permitRequired: l.permit_required,
      bestLight: l.best_light,
      tags: l.tags || [],
      photos,
      usedCount: projectIds.size,
      lastUsed,
      projects: (l.projects || []).map((p: any) => ({ id: p.id, title: p.title, stage: p.stage })),
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  });
}

async function one(id: string) {
  const row = found(await db.from("locations").select(SELECT).eq("id", id).maybeSingle(), "Locatie niet gevonden");
  return (await toApiList([row]))[0];
}

r.get(A, async (c) => {
  const rows = must(await db.from("locations").select(SELECT).order("name")) || [];
  return c.json({ locations: await toApiList(rows) });
});

r.get(`${A}/:id`, async (c) => c.json({ location: await one(c.req.param("id")) }));

const locationSchema = z.object({
  name: text(200).min(1, "Geef de locatie een naam."),
  kind: z.enum(KINDS).default("urban"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: text(500).default(""),
  notes: text(10000).default(""),
  parking: text(500).default(""),
  permitRequired: z.boolean().default(false),
  bestLight: z.enum(LIGHT).default(""),
  tags: z.array(text(40).min(1)).max(20).default([]),
});

function toRow(b: Partial<z.infer<typeof locationSchema>>) {
  const row: Record<string, unknown> = {};
  if (b.name !== undefined) row.name = b.name;
  if (b.kind !== undefined) row.kind = b.kind;
  if (b.lat !== undefined) row.lat = b.lat;
  if (b.lng !== undefined) row.lng = b.lng;
  if (b.address !== undefined) row.address = b.address;
  if (b.notes !== undefined) row.notes = b.notes;
  if (b.parking !== undefined) row.parking = b.parking;
  if (b.permitRequired !== undefined) row.permit_required = b.permitRequired;
  if (b.bestLight !== undefined) row.best_light = b.bestLight;
  if (b.tags !== undefined) row.tags = [...new Set(b.tags.map((t) => t.toLowerCase()))];
  return row;
}

r.post(A, async (c) => {
  const b = await readBody(c, locationSchema);
  const row = must(await db.from("locations").insert({ ...toRow(b), created_by: c.get("user").id }).select("id").single()) as any;
  return c.json({ location: await one(row.id) });
});

r.put(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, locationSchema.partial());
  found(await db.from("locations").update(toRow(b)).eq("id", id).select("id").maybeSingle(), "Locatie niet gevonden");
  return c.json({ location: await one(id) });
});

r.delete(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  const photos = must(await db.from("location_photos").select("url").eq("location_id", id)) || [];
  must(await db.from("locations").delete().eq("id", id));
  await removePrivate(photos.map((p: any) => p.url));
  return c.json({ success: true });
});

// Scouting photos. `url` holds the private storage path; it is signed on read.
r.post(`${A}/:id/photos`, async (c) => {
  const id = c.req.param("id");
  found(await db.from("locations").select("id").eq("id", id).maybeSingle(), "Locatie niet gevonden");
  const form = await c.req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) fail(400, "Kies minstens één foto.");
  if (files.length > 20) fail(400, "Upload maximaal 20 foto's tegelijk.");
  const last = must(await db.from("location_photos").select("sort").eq("location_id", id).order("sort", { ascending: false }).limit(1)) as any[];
  let sort = (last[0]?.sort ?? -1) + 1;
  const rows = [];
  for (const file of files) {
    rows.push({ location_id: id, url: await uploadPrivate(`locations/${id}`, file), sort: sort++ });
  }
  must(await db.from("location_photos").insert(rows));
  return c.json({ location: await one(id) });
});

r.put(`${A}/:id/photos/:photoId`, async (c) => {
  const b = await readBody(c, z.object({ caption: text(300).optional(), sort: z.number().int().optional() }));
  must(await db.from("location_photos").update(b).eq("id", c.req.param("photoId")).eq("location_id", c.req.param("id")));
  return c.json({ location: await one(c.req.param("id")) });
});

r.delete(`${A}/:id/photos/:photoId`, async (c) => {
  const photo = found(
    await db.from("location_photos").select("url").eq("id", c.req.param("photoId")).eq("location_id", c.req.param("id")).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  must(await db.from("location_photos").delete().eq("id", c.req.param("photoId")));
  await removePrivate([photo.url]);
  return c.json({ location: await one(c.req.param("id")) });
});


