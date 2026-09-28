import { Hono } from "npm:hono";
import { BRIEFING_MAX_CHARS, SITE_URL } from "../lib/config.ts";
import { projectRecipients } from "../lib/clients.ts";
import { db, found, must } from "../lib/db.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, isoDate, nameOf, readBody, requireAdmin, requirePermission, text, uuid, z } from "../lib/http.ts";
import {
  gallerySigner,
  loadProject,
  loadProjects,
  primaryMeeting,
  projectToApi,
  type ProjectRow,
  setPrimaryMeeting,
  setProjectClients,
  STAGES,
  stageForStatus,
  STATUSES,
  statusForStage,
  syncGalleryUrls,
} from "../lib/projects.ts";
import { deliveredEmail, galleryGrewEmail, meetingEmail, studioMessageToClientEmail } from "../lib/projectEmails.ts";
import { removePrivate, uploadPrivate } from "../lib/storage.ts";
import { demoSlugOf, projectDemos } from "../lib/util.ts";

const r = new Hono<Env>();
export default r;

const P = "/make-server-0951c59e/admin";
r.use(`${P}/project/*`, requireAdmin, requirePermission("manageClients", "projecten en planning"));
r.use(`${P}/project`, requireAdmin, requirePermission("manageClients", "projecten en planning"));
r.use(`${P}/projects`, requireAdmin, requirePermission("manageClients", "projecten en planning"));
r.use(`${P}/shots/*`, requireAdmin, requirePermission("manageClients", "projecten en planning"));

async function respond(id: string) {
  const row = await loadProject(id);
  const sign = await gallerySigner([row]);
  return projectToApi(row, sign);
}

// --- list ---
r.get(`${P}/projects`, async (c) => {
  const type = c.req.query("type");
  const rows = await loadProjects({ type: type || undefined });
  const sign = await gallerySigner(rows);
  return c.json({ projects: rows.map((row) => projectToApi(row, sign)) });
});

// --- one project, with favourites and unread count ---
r.get(`${P}/project/:id`, async (c) => {
  const id = c.req.param("id");
  const project = await respond(id);
  const imageIds = project.gallery.map((g: any) => g.id);
  const favs = imageIds.length
    ? must(await db.from("gallery_favorites").select("image_id, clients ( name, email )").in("image_id", imageIds)) || []
    : [];
  const favorites: Record<string, string[]> = {};
  for (const f of favs as any[]) {
    (favorites[f.image_id] ||= []).push(f.clients?.name || f.clients?.email || "Klant");
  }
  const { count } = await db.from("messages").select("id", { count: "exact", head: true })
    .eq("project_id", id).eq("sender_role", "client").is("read_at", null);
  return c.json({ project: { ...project, favorites, unreadMessages: count || 0 } });
});

// --- create ---
const createSchema = z.object({
  title: text(200).min(1, "Vul een titel in."),
  clientIds: z.array(uuid).optional(),
  clientId: uuid.optional(),
  type: z.enum(["photo", "video", "web"]).default("photo"),
  stage: z.enum(STAGES).optional(),
  status: z.enum(STATUSES).optional(),
  phase: text(100).optional(),
  description: text(5000).optional(),
  dueDate: z.union([isoDate, z.literal("")]).optional(),
  demoUrl: text(500).optional(),
  demoNotes: text(2000).optional(),
  demoSlug: text(60).optional(),
  demos: z.array(z.object({ slug: z.string(), live: z.boolean().optional() })).optional(),
  locationId: uuid.nullable().optional(),
  valueCents: z.number().int().nonnegative().nullable().optional(),
  inquiryId: uuid.nullable().optional(),
});

r.post(`${P}/project`, async (c) => {
  const b = await readBody(c, createSchema);
  const clientIds = [...new Set(b.clientIds?.length ? b.clientIds : b.clientId ? [b.clientId] : [])];
  if (clientIds.length === 0) fail(400, "Kies minstens één klant en vul een titel in.");

  const stage = b.stage || "booked";
  const demos = b.type === "web" ? projectDemos({ demos: b.demos, demoSlug: b.demoSlug, demoLive: false }) : [];
  const inserted = must(await db.from("projects").insert({
    title: b.title,
    type: b.type,
    stage,
    status: b.status || statusForStage(stage, "in_progress"),
    phase: b.phase || "",
    description: b.description || "",
    due_date: b.dueDate || null,
    demo_url: b.type === "web" ? b.demoUrl || "" : "",
    demo_notes: b.type === "web" ? b.demoNotes || "" : "",
    demos: demos.map((d) => ({ ...d, live: false })),
    location_id: b.locationId || null,
    value_cents: b.valueCents ?? null,
    inquiry_id: b.inquiryId || null,
    created_by: c.get("user").id,
  }).select("id").single()) as { id: string };

  await setProjectClients(inserted.id, clientIds);
  return c.json({ project: await respond(inserted.id) });
});

// --- update ---
// Accepts the full older project shape (so the mobile app keeps working) and
// the newer fields. Only fields that are present are changed.
const updateSchema = z.object({
  title: text(200).min(1).optional(),
  type: z.enum(["photo", "video", "web"]).optional(),
  stage: z.enum(STAGES).optional(),
  status: z.enum(STATUSES).optional(),
  phase: text(100).optional(),
  description: text(5000).optional(),
  dueDate: z.union([isoDate, z.literal(""), z.null()]).optional(),
  deliverables: z.array(z.object({ name: z.string(), count: z.number().optional(), done: z.boolean().optional() }).passthrough()).max(100).optional(),
  gallerySettings: z.record(z.any()).optional(),
  galleryUrls: z.array(z.string()).max(2000).optional(),
  meeting: z.object({ date: z.string(), location: z.string().nullish(), link: z.string().nullish(), notes: z.string().nullish() }).nullable().optional(),
  briefing: z.string().optional(),
  demoUrl: text(500).optional(),
  demoNotes: text(2000).optional(),
  demoSlug: z.string().optional(),
  demos: z.array(z.object({ slug: z.string(), live: z.boolean().optional() })).optional(),
  clientIds: z.array(uuid).optional(),
  locationId: uuid.nullable().optional(),
  valueCents: z.number().int().nonnegative().nullable().optional(),
});

r.put(`${P}/project/:id`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, updateSchema);
  const existing = await loadProject(id);
  const beforeMeeting = primaryMeeting(existing)?.starts_at || "";

  const patch: Record<string, unknown> = {};
  if (b.title !== undefined) patch.title = b.title;
  if (b.type !== undefined) patch.type = b.type;
  if (b.phase !== undefined) patch.phase = b.phase;
  if (b.description !== undefined) patch.description = b.description;
  if (b.dueDate !== undefined) patch.due_date = b.dueDate || null;
  if (b.deliverables !== undefined) patch.deliverables = b.deliverables;
  if (b.gallerySettings !== undefined) patch.gallery_settings = b.gallerySettings;
  if (b.locationId !== undefined) patch.location_id = b.locationId;
  if (b.valueCents !== undefined) patch.value_cents = b.valueCents;

  if (b.briefing !== undefined) {
    if (b.briefing.length > BRIEFING_MAX_CHARS) {
      fail(400, `Deze briefing is te groot (${Math.round(b.briefing.length / 1000)} kB). De grens is ${BRIEFING_MAX_CHARS / 1000} kB.`);
    }
    patch.briefing = b.briefing;
    patch.briefing_updated_at = b.briefing.trim() ? new Date().toISOString() : null;
  }

  // Stage and status move together; whichever was sent wins.
  if (b.stage !== undefined) {
    patch.stage = b.stage;
    patch.status = b.status ?? statusForStage(b.stage, existing.status);
  } else if (b.status !== undefined) {
    patch.status = b.status;
    patch.stage = stageForStatus(b.status, existing.stage);
  }

  const type = (patch.type as string) || existing.type;
  if (type !== "web") {
    Object.assign(patch, { demo_url: "", demo_notes: "", demos: [] });
  } else {
    if (b.demoUrl !== undefined) patch.demo_url = b.demoUrl;
    if (b.demoNotes !== undefined) patch.demo_notes = b.demoNotes;
    const before = projectDemos(existing);
    if (b.demos) patch.demos = projectDemos({ demos: b.demos });
    else if (b.demoSlug !== undefined) {
      const slug = demoSlugOf(b.demoSlug);
      patch.demos = slug ? [{ slug, live: before.find((d) => d.slug === slug)?.live ?? false }] : [];
    }
  }

  if (b.clientIds !== undefined) {
    if (b.clientIds.length === 0) fail(400, "Een project moet aan minstens één klant gekoppeld blijven.");
    await setProjectClients(id, b.clientIds);
  }
  if (Object.keys(patch).length) must(await db.from("projects").update(patch).eq("id", id));

  let added = 0;
  if (b.galleryUrls !== undefined) added = await syncGalleryUrls(existing, b.galleryUrls);
  if (b.meeting !== undefined) await setPrimaryMeeting(existing, b.meeting);

  const updated = await loadProject(id);
  const sign = await gallerySigner([updated]);
  const project = projectToApi(updated, sign);

  // Tell the clients about the changes that matter to them. Compared with the
  // state before this save, so re-saving other fields never sends these again.
  const justDelivered = existing.status !== "delivered" && updated.status === "delivered";
  const afterMeeting = primaryMeeting(updated);
  const meetingChanged = !!afterMeeting && afterMeeting.starts_at !== beforeMeeting;
  if (added > 0 || justDelivered || meetingChanged) {
    await notifyClients(updated, project, { added: added > 0 ? added : 0, justDelivered, meetingChanged });
  }

  return c.json({ project });
});

async function notifyClients(
  row: ProjectRow,
  project: any,
  what: { added: number; justDelivered: boolean; meetingChanged: boolean },
) {
  const recipients = await projectRecipients(row.id);
  const gs = project.gallerySettings || {};
  const galleryLink = `${SITE_URL}/portal/project/${row.id}/gallery`;
  const projectLink = `${SITE_URL}/portal/project/${row.id}`;
  const coverUrl = gs.coverUrl || project.galleryUrls?.[0];
  for (const person of recipients) {
    const firstName = person.name.split(" ")[0];
    if (what.added > 0) {
      await sendEmail({
        to: person.email,
        subject: `Je galerij is bijgewerkt — ${what.added} nieuwe ${what.added === 1 ? "foto" : "foto's"}`,
        html: galleryGrewEmail({
          firstName, galleryTitle: gs.title || row.title, coverUrl, accent: gs.accentColor || "#c8905a",
          galleryLink, added: what.added, total: project.galleryUrls.length,
        }),
      });
    }
    if (what.justDelivered) {
      await sendEmail({
        to: person.email,
        subject: `Je project is afgerond — ${row.title}`,
        html: deliveredEmail({ firstName, title: row.title, coverUrl, galleryLink }),
      });
    }
    if (what.meetingChanged && project.meeting) {
      await sendEmail({
        to: person.email,
        subject: `Meeting ingepland — ${row.title}`,
        html: meetingEmail({ title: row.title, date: project.meeting.date, location: project.meeting.location, projectLink }),
      });
    }
  }
}

// --- delete ---
r.delete(`${P}/project/:id`, async (c) => {
  const id = c.req.param("id");
  const row = await loadProject(id);
  await removePrivate((row.gallery_images || []).map((g: any) => g.storage_path));
  must(await db.from("projects").delete().eq("id", id));
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function messageToApi(m: any) {
  return {
    id: m.id,
    projectId: m.project_id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderRole: m.sender_role,
    content: m.content,
    readAt: m.read_at,
    createdAt: m.created_at,
  };
}

r.get(`${P}/project/:id/messages`, async (c) => {
  const rows = must(await db.from("messages").select("*").eq("project_id", c.req.param("id")).order("created_at")) || [];
  return c.json({ messages: rows.map(messageToApi) });
});

r.post(`${P}/project/:id/messages/read`, async (c) => {
  must(await db.from("messages").update({ read_at: new Date().toISOString() })
    .eq("project_id", c.req.param("id")).eq("sender_role", "client").is("read_at", null));
  return c.json({ success: true });
});

r.post(`${P}/project/:id/messages`, async (c) => {
  const id = c.req.param("id");
  const { content } = await readBody(c, z.object({ content: text(10000).min(1, "Schrijf eerst een bericht.") }));
  const project = found(await db.from("projects").select("id, title").eq("id", id).maybeSingle(), "Project niet gevonden");
  const admin = c.get("user");
  const row = must(await db.from("messages").insert({
    project_id: id,
    sender_id: "pdc",
    sender_name: nameOf(admin),
    sender_role: "pdc",
    content,
  }).select("*").single());

  // Replying means the client's earlier messages have been read.
  await db.from("messages").update({ read_at: new Date().toISOString() })
    .eq("project_id", id).eq("sender_role", "client").is("read_at", null);

  const recipients = await projectRecipients(id);
  if (recipients.length) {
    await sendEmail({
      to: recipients.map((p) => p.email),
      subject: "Nieuw bericht van PDC Studio",
      html: studioMessageToClientEmail({ content }, project as any, id),
    });
  }
  return c.json({ message: messageToApi(row) });
});

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

r.post(`${P}/project/:id/gallery`, async (c) => {
  const id = c.req.param("id");
  found(await db.from("projects").select("id").eq("id", id).maybeSingle(), "Project niet gevonden");
  const form = await c.req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) fail(400, "Kies minstens één foto.");
  if (files.length > 50) fail(400, "Upload maximaal 50 bestanden tegelijk.");

  const last = must(await db.from("gallery_images").select("sort").eq("project_id", id).order("sort", { ascending: false }).limit(1)) as any[];
  let sort = (last[0]?.sort ?? -1) + 1;
  const rows = [];
  for (const file of files) {
    const path = await uploadPrivate(`galleries/${id}`, file, { allowVideo: true });
    rows.push({ project_id: id, url: "", storage_path: path, file_name: file.name, sort: sort++ });
  }
  must(await db.from("gallery_images").insert(rows));
  return c.json({ project: await respond(id), added: rows.length });
});

r.put(`${P}/project/:id/gallery/order`, async (c) => {
  const id = c.req.param("id");
  const { ids } = await readBody(c, z.object({ ids: z.array(uuid).max(5000) }));
  await Promise.all(ids.map((imageId, sort) =>
    db.from("gallery_images").update({ sort }).eq("id", imageId).eq("project_id", id)
  ));
  return c.json({ project: await respond(id) });
});

r.delete(`${P}/project/:id/gallery/:imageId`, async (c) => {
  const id = c.req.param("id");
  const img = found(
    await db.from("gallery_images").select("*").eq("id", c.req.param("imageId")).eq("project_id", id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  must(await db.from("gallery_images").delete().eq("id", img.id));
  await removePrivate([img.storage_path]);
  return c.json({ project: await respond(id) });
});

// Galleries uploaded before private storage still point at the public
// bucket. This copies them into the private bucket and forgets the public
// URL, so the public copy can be cleaned up with prune_unused.py afterwards.
r.post(`${P}/project/:id/gallery/privatize`, async (c) => {
  const id = c.req.param("id");
  const rows = must(await db.from("gallery_images").select("*").eq("project_id", id).eq("storage_path", "")) as any[];
  let moved = 0;
  const failed: string[] = [];
  for (const img of rows) {
    try {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name = img.file_name || img.url.split("?")[0].split("/").pop() || "foto.jpg";
      const file = new File([blob], name, { type: blob.type || "image/jpeg" });
      const path = await uploadPrivate(`galleries/${id}`, file, { allowVideo: true });
      must(await db.from("gallery_images").update({ storage_path: path, url: "" }).eq("id", img.id));
      moved++;
    } catch (err) {
      console.error("privatize failed:", img.id, err);
      failed.push(img.file_name || img.id);
    }
  }
  return c.json({ moved, failed, project: await respond(id) });
});

// Uploading in batches would otherwise mail the client once per batch; the
// studio decides when the gallery is ready to announce.
r.post(`${P}/project/:id/gallery/notify`, async (c) => {
  const id = c.req.param("id");
  const { added } = await readBody(c, z.object({ added: z.number().int().positive().max(5000) }));
  const row = await loadProject(id);
  const project = projectToApi(row, await gallerySigner([row]));
  const recipients = await projectRecipients(id);
  if (recipients.length === 0) fail(400, "Er staat geen klant met een e-mailadres bij dit project.");
  await notifyClients(row, project, { added, justDelivered: false, meetingChanged: false });
  return c.json({ success: true, sentTo: recipients.map((p) => p.email) });
});

// ---------------------------------------------------------------------------
// Shot list
// ---------------------------------------------------------------------------

function shotToApi(s: any) {
  return { id: s.id, projectId: s.project_id, label: s.label, required: s.required, done: s.done, sort: s.sort };
}

r.get(`${P}/project/:id/shots`, async (c) => {
  const rows = must(await db.from("shot_list_items").select("*").eq("project_id", c.req.param("id")).order("sort")) || [];
  return c.json({ shots: rows.map(shotToApi) });
});

r.post(`${P}/project/:id/shots`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, z.object({ label: text(300).min(1, "Omschrijf het shot."), required: z.boolean().optional() }));
  const last = must(await db.from("shot_list_items").select("sort").eq("project_id", id).order("sort", { ascending: false }).limit(1)) as any[];
  const row = must(await db.from("shot_list_items").insert({
    project_id: id, label: b.label, required: b.required ?? false, sort: (last[0]?.sort ?? -1) + 1,
  }).select("*").single());
  return c.json({ shot: shotToApi(row) });
});

r.put(`${P}/project/:id/shots/order`, async (c) => {
  const id = c.req.param("id");
  const { ids } = await readBody(c, z.object({ ids: z.array(uuid).max(500) }));
  await Promise.all(ids.map((shotId, sort) => db.from("shot_list_items").update({ sort }).eq("id", shotId).eq("project_id", id)));
  return c.json({ success: true });
});

r.put(`${P}/shots/:id`, async (c) => {
  const b = await readBody(c, z.object({ label: text(300).min(1).optional(), required: z.boolean().optional(), done: z.boolean().optional() }));
  const row = found(await db.from("shot_list_items").update(b).eq("id", c.req.param("id")).select("*").maybeSingle(), "Shot niet gevonden");
  return c.json({ shot: shotToApi(row) });
});

r.delete(`${P}/shots/:id`, async (c) => {
  must(await db.from("shot_list_items").delete().eq("id", c.req.param("id")));
  return c.json({ success: true });
});

