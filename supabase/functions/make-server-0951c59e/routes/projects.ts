import { Hono } from "npm:hono";
import { BRIEFING_MAX_CHARS, EMAIL_ADMIN_NOTIFY, SITE_URL } from "../lib/config.ts";
import { projectRecipients } from "../lib/clients.ts";
import { childTags, consentFormFor, consentState, consentUrl, removeConsentPhotos } from "../lib/consents.ts";
import { db, found, must } from "../lib/db.ts";
import { downloadCounts, downloadTotals, recentDownloads } from "../lib/downloads.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, isoDate, nameOf, readBody, requireAdmin, requirePermission, text, uuid, z } from "../lib/http.ts";
import {
  addParts, DELIVERY_STEP, isDelivered, type Kind, mainPart, partOf, partsOf, sortedParts, stepForStage, syncProject, validStep,
} from "../lib/parts.ts";
import {
  galleryAccess,
  gallerySigner,
  loadProject,
  loadProjects,
  primaryMeeting,
  projectToApi,
  type ProjectRow,
  setPrimaryMeeting,
  setProjectClients,
  STAGES,
  STATUSES,
  syncGalleryUrls,
  downloadsUntil,
} from "../lib/projects.ts";
import { consentMessageEmail, deliveredEmail, deliveredSubject, galleryGrewEmail, meetingEmail, studioMessageToClientEmail } from "../lib/projectEmails.ts";
import { mollieMode } from "../lib/mollie.ts";
import { ordersOf, pricingOf, salesOf } from "../lib/orders.ts";
import { forgetPhotoMails, guestHearts, mailGuestsNewPhotos, photoMailGuests, setPhotoMails, shareFor, shareToken, shareUrl } from "../lib/shares.ts";
import { removePrivate, signDownload, uploadPrivate } from "../lib/storage.ts";
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
const partInput = z.object({
  kind: z.enum(["photo", "video", "web"]),
  category: text(60).default(""),
  stage: z.string().max(20).optional(),
});

const createSchema = z.object({
  title: text(200).min(1, "Vul een titel in."),
  clientIds: z.array(uuid).optional(),
  clientId: uuid.optional(),
  // Projecten 2.0: what the project is made of. Without it, one part of `type` at `stage`.
  parts: z.array(partInput).min(1, "Kies wat je gaat maken.").max(3).optional(),
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
  gallerySettings: z.record(z.any()).optional(),
});

r.post(`${P}/project`, async (c) => {
  const b = await readBody(c, createSchema);
  const clientIds = [...new Set(b.clientIds?.length ? b.clientIds : b.clientId ? [b.clientId] : [])];
  if (clientIds.length === 0) fail(400, "Kies minstens één klant en vul een titel in.");

  const parts = b.parts?.length
    ? b.parts
    : [{ kind: b.type, category: "", stage: stepForStage(b.type, b.stage || "booked") }];
  for (const p of parts) {
    if (p.stage && !validStep(p.kind, p.stage)) fail(400, "Die stap past niet bij dit onderdeel.");
  }
  const web = parts.some((p) => p.kind === "web");
  const first = parts[0];
  const demos = web ? projectDemos({ demos: b.demos, demoSlug: b.demoSlug, demoLive: false }) : [];
  const inserted = must(await db.from("projects").insert({
    title: b.title,
    type: first.kind,
    stage: "booked",
    status: "in_progress",
    phase: b.phase || "",
    description: b.description || "",
    due_date: b.dueDate || null,
    demo_url: web ? b.demoUrl || "" : "",
    demo_notes: web ? b.demoNotes || "" : "",
    demos: demos.map((d) => ({ ...d, live: false })),
    location_id: b.locationId || null,
    value_cents: b.valueCents ?? null,
    inquiry_id: b.inquiryId || null,
    gallery_settings: b.gallerySettings || {},
    created_by: c.get("user").id,
  }).select("id").single()) as { id: string };

  await setProjectClients(inserted.id, clientIds);
  await addParts(inserted.id, parts);
  return c.json({ project: await respond(inserted.id) });
});

// --- update ---
// Accepts the full older project shape (so the phone app keeps working) and
// the newer fields. Only fields that are present are changed. A stage or
// status from an older screen moves the project's first part. None of it mails,
// except the phone app's "Geleverd": that is its only way to deliver.
const updateSchema = z.object({
  title: text(200).min(1).optional(),
  type: z.enum(["photo", "video", "web"]).optional(),
  stage: z.enum(STAGES).optional(),
  status: z.enum(STATUSES).optional(),
  archived: z.boolean().optional(),
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
  if (b.phase !== undefined) patch.phase = b.phase;
  if (b.description !== undefined) patch.description = b.description;
  if (b.dueDate !== undefined) patch.due_date = b.dueDate || null;
  if (b.deliverables !== undefined) patch.deliverables = b.deliverables;
  if (b.gallerySettings !== undefined) patch.gallery_settings = b.gallerySettings;
  if (b.locationId !== undefined) patch.location_id = b.locationId;
  if (b.valueCents !== undefined) patch.value_cents = b.valueCents;
  if (b.archived !== undefined) patch.archived_at = b.archived ? existing.archived_at || new Date().toISOString() : null;

  if (b.briefing !== undefined) {
    if (b.briefing.length > BRIEFING_MAX_CHARS) {
      fail(400, `Deze briefing is te groot (${Math.round(b.briefing.length / 1000)} kB). De grens is ${BRIEFING_MAX_CHARS / 1000} kB.`);
    }
    patch.briefing = b.briefing;
    patch.briefing_updated_at = b.briefing.trim() ? new Date().toISOString() : null;
  }

  const parts = sortedParts(existing);
  const main = mainPart(existing);
  const hasWeb = parts.some((p) => p.kind === "web") || (b.type === "web" && parts.length <= 1);
  if (!hasWeb) {
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

  // Older screens and the phone app: their stage, status and type move the first part.
  let phoneDelivery = false;
  if (main) {
    const partPatch: Record<string, unknown> = {};
    // The kind only changes while the project is that one part.
    if (b.type !== undefined && b.type !== main.kind && parts.length === 1) partPatch.kind = b.type;
    const kind = (partPatch.kind as Kind) || main.kind;
    if (b.stage !== undefined && b.stage !== "archived") partPatch.stage = stepForStage(kind, b.stage);
    if (b.stage === "archived" && !existing.archived_at) must(await db.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", id));
    if (b.stage === undefined && b.status !== undefined) {
      if (b.status === "delivered") phoneDelivery = !isDelivered(main);
      else if (b.status === "in_review") partPatch.stage = stepForStage(kind, "editing");
      else if (b.status === "in_progress" && isDelivered(main)) partPatch.stage = stepForStage(kind, "editing");
      if (b.status === "on_hold") partPatch.hold = "paused";
      else if (main.hold === "paused" || main.hold === "waiting") partPatch.hold = "";
    }
    if (Object.keys(partPatch).length) {
      must(await db.from("project_parts").update({ ...partPatch, updated_at: new Date().toISOString() }).eq("id", main.id));
    }
    await syncProject(id);
  }

  let added = 0;
  if (b.galleryUrls !== undefined) added = await syncGalleryUrls(existing, b.galleryUrls);
  if (b.meeting !== undefined) await setPrimaryMeeting(existing, b.meeting);

  if (phoneDelivery && main) await deliver(id, main.id, { mail: true });
  const updated = await loadProject(id);
  const sign = await gallerySigner([updated]);
  const project = projectToApi(updated, sign);

  // Tell the clients about the changes that matter to them. Compared with the
  // state before this save, so re-saving other fields never sends these again.
  const afterMeeting = primaryMeeting(updated);
  const meetingChanged = !!afterMeeting && afterMeeting.starts_at !== beforeMeeting;
  if (added > 0 || meetingChanged) await notifyClients(updated, { added: added > 0 ? added : 0, meetingChanged });

  return c.json({ project });
});

async function notifyClients(row: ProjectRow, what: { added: number; meetingChanged: boolean }) {
  // The client's view of the project, so a photo that is held back stays out of the mail too.
  const project = projectToApi(row, await gallerySigner([row]), { forClient: true });
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
        subject: `Je galerij is bijgewerkt: ${what.added} nieuwe ${what.added === 1 ? "foto" : "foto's"}`,
        html: galleryGrewEmail({
          firstName, galleryTitle: gs.title || row.title, coverUrl, accent: gs.accentColor || "#c8905a",
          galleryLink, added: what.added, total: project.galleryUrls.length,
        }),
      });
    }
    if (what.meetingChanged && project.meeting) {
      await sendEmail({
        to: person.email,
        subject: `Meeting ingepland: ${row.title}`,
        html: meetingEmail({ title: row.title, date: project.meeting.date, location: project.meeting.location, projectLink }),
      });
    }
  }
  return what.added > 0 ? await mailGuestsNewPhotos(row, what.added) : 0;
}

// --- delete ---
r.delete(`${P}/project/:id`, async (c) => {
  const id = c.req.param("id");
  const row = await loadProject(id);
  await removePrivate((row.gallery_images || []).flatMap((g: any) => [g.storage_path, g.preview_path, g.display_path]));
  await removeConsentPhotos([id]);
  await forgetPhotoMails(id);
  must(await db.from("projects").delete().eq("id", id));
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
// Foto, Video and Website, each with its own steps (lib/parts.ts). Moving a
// step never mails; delivering is its own button with a preview of the mail.

r.post(`${P}/project/:id/parts`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, partInput);
  found(await db.from("projects").select("id").eq("id", id).maybeSingle(), "Project niet gevonden");
  if ((await partsOf(id)).some((p) => p.kind === b.kind)) fail(409, "Dit project heeft dat onderdeel al.");
  if (b.stage && !validStep(b.kind, b.stage)) fail(400, "Die stap past niet bij dit onderdeel.");
  await addParts(id, [b]);
  return c.json({ project: await respond(id) });
});

r.put(`${P}/project/:id/parts/:partId`, async (c) => {
  const id = c.req.param("id");
  const part = await partOf(id, c.req.param("partId"));
  const b = await readBody(c, z.object({
    stage: z.string().max(20).optional(),
    hold: z.enum(["", "waiting", "paused", "stopped"]).optional(),
    holdNote: text(300).optional(),
    category: text(60).optional(),
    sort: z.number().int().min(0).max(10).optional(),
  }));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.stage !== undefined) {
    if (!validStep(part.kind, b.stage)) fail(400, "Die stap past niet bij dit onderdeel.");
    // Delivering goes with its own button, so the client is never mailed by a drag.
    if (!isDelivered(part) && isDelivered({ kind: part.kind, stage: b.stage })) fail(409, "Leveren gaat met de knop Leveren, zodat je eerst ziet wat de klant krijgt.");
    patch.stage = b.stage;
  }
  if (b.hold !== undefined && b.hold !== part.hold) {
    patch.hold = b.hold;
    patch.hold_since = b.hold ? new Date().toISOString() : null;
  }
  if (b.holdNote !== undefined) patch.hold_note = b.holdNote;
  if (b.category !== undefined) patch.category = b.category;
  if (b.sort !== undefined) patch.sort = b.sort;
  must(await db.from("project_parts").update(patch).eq("id", part.id));
  await syncProject(id);
  return c.json({ project: await respond(id) });
});

r.delete(`${P}/project/:id/parts/:partId`, async (c) => {
  const id = c.req.param("id");
  const part = await partOf(id, c.req.param("partId"));
  if ((await partsOf(id)).length <= 1) fail(409, "Een project houdt minstens één onderdeel. Verwijder anders het hele project.");
  must(await db.from("project_parts").delete().eq("id", part.id));
  await syncProject(id);
  return c.json({ project: await respond(id) });
});

/** What delivering a part does, for the dialog: the steps, and the mail each client gets. */
async function deliveryPlan(row: ProjectRow, partId: string, opts: { clientOriginals?: boolean } = {}) {
  const part = sortedParts(row).find((p) => p.id === partId);
  if (!part) fail(404, "Dit onderdeel bestaat niet (meer).");
  const kind = part.kind;
  const first = !part.delivered_at;
  const gs = { ...(row.gallery_settings || {}) };
  // The dialog may give the client the originals at delivery.
  if (opts.clientOriginals !== undefined && typeof gs.watermark === "boolean") gs.clientOriginals = opts.clientOriginals;
  const opened = kind !== "web" && !gs.deliveredAt ? { ...row, gallery_settings: { ...gs, deliveredAt: new Date().toISOString() } } : { ...row, gallery_settings: gs };
  const after = { ...opened, project_parts: sortedParts(row).map((p) => (p.id === part.id ? { ...p, stage: DELIVERY_STEP[kind] } : p)) };
  const access = galleryAccess(after);
  const share = await shareFor(row.id);
  const selling = !!share?.active && share.sales;
  const until = kind === "web" ? "" : downloadsUntil(after);
  const childPhotos = kind === "photo" ? (await consentState(row.id)).children.filter((k: any) => k.photoUrl).length : 0;
  const recipients = await projectRecipients(row.id);
  const sign = await gallerySigner([after]);
  const view = projectToApi(after, sign, { forClient: true });
  const link = kind === "web" ? `${SITE_URL}/portal/project/${row.id}` : `${SITE_URL}/portal/project/${row.id}/gallery`;
  const title = (row.gallery_settings || {}).title || row.title;
  const mail = (firstName: string) => ({
    subject: deliveredSubject(kind, row.title),
    html: deliveredEmail({
      firstName, title, coverUrl: view.gallerySettings?.coverUrl || view.galleryUrls?.[0], galleryLink: link, until, kind,
      watermarked: access.client.sees === "watermark", downloads: access.client.downloads !== "none", selling,
    }),
  });
  return { part, kind, first, until, access, selling, childPhotos, recipients, mail, after };
}

r.get(`${P}/project/:id/parts/:partId/deliver`, async (c) => {
  const row = await loadProject(c.req.param("id"));
  const q = c.req.query("clientOriginals");
  const plan = await deliveryPlan(row, c.req.param("partId"), { clientOriginals: q === undefined ? undefined : q === "1" });
  const preview = plan.mail(plan.recipients[0]?.name.split(" ")[0] || "[voornaam]");
  return c.json({
    kind: plan.kind,
    first: plan.first,
    until: plan.until,
    clientSees: plan.access.client.sees,
    clientDownloads: plan.access.client.downloads,
    watermark: plan.access.watermark,
    selling: plan.selling,
    childPhotos: plan.childPhotos,
    recipients: plan.recipients.map((p) => ({ name: p.name, email: p.email })),
    subject: preview.subject,
    html: preview.html,
  });
});

/**
 * Delivers a part: its step becomes the delivery, the gallery opens (the
 * download quarter starts the first time), the photos of the children at
 * Toestemming go, and the clients get the mail when asked.
 */
async function deliver(id: string, partId: string, o: { mail: boolean; clientOriginals?: boolean; restartDownloads?: boolean }) {
  const row = await loadProject(id);
  const plan = await deliveryPlan(row, partId, { clientOriginals: o.clientOriginals });
  const now = new Date().toISOString();
  must(await db.from("project_parts").update({
    stage: DELIVERY_STEP[plan.kind], hold: plan.part.hold === "stopped" ? "stopped" : "", hold_since: null,
    delivered_at: plan.part.delivered_at || now, updated_at: now,
  }).eq("id", plan.part.id));
  if (plan.kind !== "web") {
    const gs = { ...plan.after.gallery_settings };
    if (o.restartDownloads) gs.deliveredAt = now;
    must(await db.from("projects").update({ gallery_settings: gs }).eq("id", id));
  }
  await syncProject(id);
  if (plan.kind === "photo") await removeConsentPhotos([id]);
  const sent: string[] = [];
  if (o.mail) {
    for (const person of plan.recipients) {
      const res = await sendEmail({ to: person.email, ...plan.mail(person.name.split(" ")[0]) });
      if (res.ok) sent.push(person.email);
    }
  }
  return { sent };
}

r.post(`${P}/project/:id/parts/:partId/deliver`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, z.object({ mail: z.boolean(), clientOriginals: z.boolean().optional(), restartDownloads: z.boolean().optional() }));
  const { sent } = await deliver(id, c.req.param("partId"), b);
  return c.json({ project: await respond(id), sentTo: sent });
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
// Each photo goes up with two copies the admin's browser makes: one with the
// watermark (preview-<i>) and a light one to look at (display-<i>). The
// original is only ever signed for a download.

r.post(`${P}/project/:id/gallery`, async (c) => {
  const id = c.req.param("id");
  found(await db.from("projects").select("id").eq("id", id).maybeSingle(), "Project niet gevonden");
  const form = await c.req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) fail(400, "Kies minstens één foto.");
  if (files.length > 50) fail(400, "Upload maximaal 50 bestanden tegelijk.");
  const set = String(form.get("set") || "").trim().slice(0, 60);

  const last = must(await db.from("gallery_images").select("sort").eq("project_id", id).order("sort", { ascending: false }).limit(1)) as any[];
  let sort = (last[0]?.sort ?? -1) + 1;
  const rows = [];
  for (const [i, file] of files.entries()) {
    const path = await uploadPrivate(`galleries/${id}`, file, { allowVideo: true });
    const preview = form.get(`preview-${i}`);
    const previewPath = preview instanceof File ? await uploadPrivate(`galleries/${id}/wm`, preview) : "";
    const display = form.get(`display-${i}`);
    const displayPath = display instanceof File ? await uploadPrivate(`galleries/${id}/view`, display) : "";
    // And its size as "<width>x<height>", so the client gallery can lay it out before it loads.
    const [width, height] = String(form.get(`size-${i}`) || "").split("x").map((n) => Math.min(100000, Math.max(0, parseInt(n, 10) || 0)));
    rows.push({
      project_id: id, url: "", storage_path: path, preview_path: previewPath, display_path: displayPath, file_name: file.name,
      sort: sort++, width: width || 0, height: height || 0, set_name: set,
    });
  }
  must(await db.from("gallery_images").insert(rows));
  return c.json({ project: await respond(id), added: rows.length });
});

r.put(`${P}/project/:id/gallery/order`, async (c) => {
  const id = c.req.param("id");
  const { ids } = await readBody(c, z.object({ ids: z.array(uuid).max(5000) }));
  for (let i = 0; i < ids.length; i += 50) {
    await Promise.all(ids.slice(i, i + 50).map((imageId, j) =>
      db.from("gallery_images").update({ sort: i + j }).eq("id", imageId).eq("project_id", id)
    ));
  }
  return c.json({ project: await respond(id) });
});

// Sizes for photos uploaded before sizes were stored, measured by the admin's browser.
r.put(`${P}/project/:id/gallery/sizes`, async (c) => {
  const id = c.req.param("id");
  const dim = z.number().int().min(1).max(100000);
  const { sizes } = await readBody(c, z.object({ sizes: z.array(z.object({ id: uuid, w: dim, h: dim })).max(5000) }));
  for (let i = 0; i < sizes.length; i += 50) {
    await Promise.all(sizes.slice(i, i + 50).map((s) =>
      db.from("gallery_images").update({ width: s.w, height: s.h }).eq("id", s.id).eq("project_id", id)
    ));
  }
  return c.json({ success: true, updated: sizes.length });
});

r.delete(`${P}/project/:id/gallery/:imageId`, async (c) => {
  const id = c.req.param("id");
  const img = found(
    await db.from("gallery_images").select("*").eq("id", c.req.param("imageId")).eq("project_id", id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  must(await db.from("gallery_images").delete().eq("id", img.id));
  await removePrivate([img.storage_path, img.preview_path, img.display_path]);
  return c.json({ project: await respond(id) });
});

// Many at once, from the selection. Bought photos stay: someone paid for them.
r.post(`${P}/project/:id/gallery/remove`, async (c) => {
  const id = c.req.param("id");
  const { ids } = await readBody(c, z.object({ ids: z.array(uuid).min(1).max(5000) }));
  const sold = new Set(((must(await db.from("gallery_order_images").select("image_id, gallery_orders!inner ( project_id, invoice_id )").eq("gallery_orders.project_id", id).not("gallery_orders.invoice_id", "is", null)) || []) as any[]).map((x) => x.image_id));
  const removable = ids.filter((x) => !sold.has(x));
  let removed = 0;
  for (let i = 0; i < removable.length; i += 200) {
    const chunk = removable.slice(i, i + 200);
    const rows = (must(await db.from("gallery_images").select("id, storage_path, preview_path, display_path").eq("project_id", id).in("id", chunk)) || []) as any[];
    if (rows.length === 0) continue;
    must(await db.from("gallery_images").delete().in("id", rows.map((g) => g.id)));
    await removePrivate(rows.flatMap((g) => [g.storage_path, g.preview_path, g.display_path]));
    removed += rows.length;
  }
  return c.json({ project: await respond(id), removed, kept: ids.length - removable.length });
});

// Photos into a set (a chapter of the gallery), or out of one with "".
r.put(`${P}/project/:id/gallery/set`, async (c) => {
  const id = c.req.param("id");
  const { ids, set } = await readBody(c, z.object({ ids: z.array(uuid).min(1).max(5000), set: text(60) }));
  for (let i = 0; i < ids.length; i += 200) {
    must(await db.from("gallery_images").update({ set_name: set }).eq("project_id", id).in("id", ids.slice(i, i + 200)));
  }
  // A new set goes last in the order the gallery shows them in.
  const row = found(await db.from("projects").select("gallery_settings").eq("id", id).maybeSingle(), "Project niet gevonden") as any;
  const gs = row.gallery_settings || {};
  const used = new Set(((must(await db.from("gallery_images").select("set_name").eq("project_id", id).neq("set_name", "")) || []) as any[]).map((x) => x.set_name));
  const sets = [...((gs.sets || []) as string[]).filter((s) => used.has(s)), ...[...used].filter((s) => !(gs.sets || []).includes(s))];
  must(await db.from("projects").update({ gallery_settings: { ...gs, sets } }).eq("id", id));
  return c.json({ project: await respond(id) });
});

// The copies of a photo uploaded before they existed, made in the admin's
// browser from the original: the watermarked one and the light one.
r.put(`${P}/project/:id/gallery/:imageId/copies`, async (c) => {
  const id = c.req.param("id");
  const img = found(
    await db.from("gallery_images").select("*").eq("id", c.req.param("imageId")).eq("project_id", id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  const form = await c.req.formData();
  const patch: Record<string, string> = {};
  const old: string[] = [];
  const preview = form.get("preview");
  if (preview instanceof File) {
    patch.preview_path = await uploadPrivate(`galleries/${id}/wm`, preview);
    old.push(img.preview_path);
  }
  const display = form.get("display");
  if (display instanceof File) {
    patch.display_path = await uploadPrivate(`galleries/${id}/view`, display);
    old.push(img.display_path);
  }
  if (Object.keys(patch).length === 0) fail(400, "Geen bestand ontvangen.");
  must(await db.from("gallery_images").update(patch).eq("id", img.id));
  await removePrivate(old);
  return c.json({ success: true });
});

// The studio saves an original from the photo's details; not in the download log.
r.get(`${P}/project/:id/gallery/:imageId/original`, async (c) => {
  const id = c.req.param("id");
  const img = found(
    await db.from("gallery_images").select("*").eq("id", c.req.param("imageId")).eq("project_id", id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  const fileName = img.file_name || "foto.jpg";
  return c.json({ url: img.storage_path ? await signDownload(img.storage_path, fileName) : img.url, fileName });
});

// The older screens' route for only the watermarked copy.
r.put(`${P}/project/:id/gallery/:imageId/preview`, async (c) => {
  const id = c.req.param("id");
  const img = found(
    await db.from("gallery_images").select("*").eq("id", c.req.param("imageId")).eq("project_id", id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  const file = (await c.req.formData()).get("file");
  if (!(file instanceof File)) fail(400, "Geen bestand ontvangen.");
  const path = await uploadPrivate(`galleries/${id}/wm`, file);
  must(await db.from("gallery_images").update({ preview_path: path }).eq("id", img.id));
  await removePrivate([img.preview_path]);
  return c.json({ success: true });
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

// Photos with a child on it who may not be shown or posted (see lib/consents.ts).
// In chunks: the ids go in the address of the request to the database.
r.put(`${P}/project/:id/gallery/restriction`, async (c) => {
  const id = c.req.param("id");
  const { ids, restriction } = await readBody(c, z.object({ ids: z.array(uuid).min(1).max(5000), restriction: z.enum(["", "no_social", "no_photo"]) }));
  for (let i = 0; i < ids.length; i += 200) {
    must(await db.from("gallery_images").update({ restriction }).eq("project_id", id).in("id", ids.slice(i, i + 200)));
  }
  return c.json({ success: true, updated: ids.length });
});

// Uploading in batches would otherwise mail the client once per batch; the
// studio decides when the gallery is ready to announce.
r.post(`${P}/project/:id/gallery/notify`, async (c) => {
  const id = c.req.param("id");
  const { added } = await readBody(c, z.object({ added: z.number().int().positive().max(5000) }));
  const row = await loadProject(id);
  const recipients = await projectRecipients(id);
  const guests = await notifyClients(row, { added, meetingChanged: false });
  if (recipients.length === 0 && guests === 0) fail(400, "Er staat geen klant met een e-mailadres bij dit project, en er wachten geen gasten op een mail.");
  return c.json({ success: true, sentTo: recipients.map((p) => p.email), guests });
});

// Everything the gallery did: per photo hearts, downloads and sales, the
// latest downloads and every basket.
r.get(`${P}/project/:id/insights`, async (c) => {
  const id = c.req.param("id");
  found(await db.from("projects").select("id").eq("id", id).maybeSingle(), "Project niet gevonden");
  const [hearts, downloads, recent, orders, totals] = await Promise.all([guestHearts(id), downloadCounts(id), recentDownloads(id), ordersOf(id), downloadTotals(id)]);
  const sold: Record<string, number> = {};
  for (const o of orders) if (o.paid) for (const imageId of o.images) sold[imageId] = (sold[imageId] || 0) + 1;
  const paid = orders.filter((o) => o.paid);
  return c.json({
    perImage: { hearts: hearts.images, downloads, sold },
    downloads: recent,
    orders,
    totals: {
      downloads: totals.downloads,
      downloaders: totals.people,
      sold: paid.reduce((s, o) => s + o.images.length, 0),
      revenue: Math.round(paid.reduce((s, o) => s + o.amount, 0) * 100) / 100,
      buyers: new Set(paid.map((o) => o.guest.email || o.guest.id)).size,
      baskets: orders.length,
    },
  });
});

// ---------------------------------------------------------------------------
// Group link
// ---------------------------------------------------------------------------
// The link a group passes round (see lib/shares.ts), and who came in with it.

async function shareState(id: string) {
  const share = await shareFor(id);
  if (!share) return { share: null, guests: [], hearts: {}, totals: { guests: 0, visits: 0, hearts: 0, downloads: 0, sold: 0, revenue: 0, buyers: 0 } };
  const [rows, hearts, sold] = await Promise.all([
    db.from("gallery_guests").select("id, name, email, visits, downloads, first_seen_at, last_seen_at, user_id")
      .eq("project_id", id).order("last_seen_at", { ascending: false }),
    guestHearts(id),
    salesOf(id),
  ]);
  const wanted = await photoMailGuests(id);
  const orders = sold.photos ? await ordersOf(id) : [];
  const boughtBy = new Map<string, { photos: number; amount: number }>();
  for (const o of orders.filter((x) => x.paid)) {
    const b = boughtBy.get(o.guest.id) || { photos: 0, amount: 0 };
    b.photos += o.images.length;
    b.amount = Math.round((b.amount + o.amount) * 100) / 100;
    boughtBy.set(o.guest.id, b);
  }
  const guests = (must(rows) || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    email: g.email,
    visits: g.visits,
    downloads: g.downloads,
    hearts: hearts.guests[g.id] || 0,
    notifyPhotos: wanted.has(g.id),
    account: Boolean(g.user_id),
    bought: boughtBy.get(g.id)?.photos || 0,
    spent: boughtBy.get(g.id)?.amount || 0,
    firstSeenAt: g.first_seen_at,
    lastSeenAt: g.last_seen_at,
  }));
  const sum = (list: number[]) => list.reduce((s, n) => s + n, 0);
  const pricing = pricingOf(share as any);
  return {
    share: {
      url: shareUrl(share.token), active: share.active, downloads: share.downloads, consentRequired: share.consent_required, createdAt: share.created_at,
      // Voorrang (lib/priority.ts): guests may ask for their photos first, at this price and speed.
      priority: share.priority, priorityPrice: Number(share.priority_price), priorityDays: share.priority_days,
      // Photos for sale with a watermark (lib/orders.ts), and whether paying online works yet.
      sales: share.sales, photoPrice: Number(share.photo_price), photoPriceNormal: Number(share.photo_price_normal),
      bundleSize: Number((share as any).bundle_size) || 0, bundlePrice: Number((share as any).bundle_price) || 0,
      discountUntil: (share as any).discount_until || "",
      // What guests pay today, with the start-up price ended or not.
      priceNow: pricing.price,
      paymentsLive: mollieMode() === "live",
    },
    guests,
    hearts: hearts.images,
    totals: {
      guests: guests.length,
      visits: sum(guests.map((g) => g.visits)),
      hearts: sum(Object.values(hearts.images)),
      downloads: sum(guests.map((g) => g.downloads)),
      sold: sold.photos,
      revenue: sold.revenue,
      buyers: sold.buyers,
    },
  };
}

r.get(`${P}/project/:id/share`, async (c) => c.json(await shareState(c.req.param("id"))));

// Makes the link, or switches an existing one back on with the same address.
r.post(`${P}/project/:id/share`, async (c) => {
  const id = c.req.param("id");
  found(await db.from("projects").select("id").eq("id", id).maybeSingle(), "Project niet gevonden");
  if (await shareFor(id)) must(await db.from("gallery_shares").update({ active: true }).eq("project_id", id));
  else must(await db.from("gallery_shares").insert({ project_id: id, token: shareToken() }));
  return c.json(await shareState(id));
});

r.put(`${P}/project/:id/share`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, z.object({
    active: z.boolean().optional(),
    downloads: z.boolean().optional(),
    consentRequired: z.boolean().optional(),
    priority: z.boolean().optional(),
    priorityPrice: z.number().min(1, "Minimaal €1.").max(500, "Maximaal €500.").optional(),
    priorityDays: z.number().int().min(1, "Minimaal 1 werkdag.").max(30, "Maximaal 30 werkdagen.").optional(),
    sales: z.boolean().optional(),
    photoPrice: z.number().min(0.5, "Minimaal €0,50.").max(500, "Maximaal €500.").optional(),
    photoPriceNormal: z.number().min(0, "Niet onder €0.").max(1000, "Maximaal €1000.").optional(),
    bundleSize: z.number().int().min(0).max(50, "Maximaal 50 foto's in een bundel.").optional(),
    bundlePrice: z.number().min(0).max(5000, "Maximaal €5000.").optional(),
    discountUntil: z.union([isoDate, z.literal("")]).optional(),
  }));
  const fields: [keyof typeof b, string][] = [
    ["active", "active"], ["downloads", "downloads"], ["consentRequired", "consent_required"],
    ["priority", "priority"], ["priorityPrice", "priority_price"], ["priorityDays", "priority_days"],
    ["sales", "sales"], ["photoPrice", "photo_price"], ["photoPriceNormal", "photo_price_normal"],
    ["bundleSize", "bundle_size"], ["bundlePrice", "bundle_price"],
  ];
  const money = new Set(["priorityPrice", "photoPrice", "photoPriceNormal", "bundlePrice"]);
  const patch: Record<string, unknown> = {};
  for (const [from, to] of fields) if (b[from] !== undefined) patch[to] = money.has(from) ? Math.round(Number(b[from]) * 100) / 100 : b[from];
  if (b.discountUntil !== undefined) patch.discount_until = b.discountUntil || null;
  // Asking for consent takes a form that is there and open.
  if (b.consentRequired) await openConsentForm(id);
  if (Object.keys(patch).length) {
    found(await db.from("gallery_shares").update(patch).eq("project_id", id).select("project_id").maybeSingle(), "Deze galerij heeft nog geen groepslink.");
  }
  return c.json(await shareState(id));
});

// A new address: the old one stops working. Guests and their hearts stay.
r.post(`${P}/project/:id/share/renew`, async (c) => {
  const id = c.req.param("id");
  found(
    await db.from("gallery_shares").update({ token: shareToken(), active: true }).eq("project_id", id).select("project_id").maybeSingle(),
    "Deze galerij heeft nog geen groepslink.",
  );
  return c.json(await shareState(id));
});

// Someone who asks to be forgotten, with their hearts and downloads.
r.delete(`${P}/project/:id/share/guests/:guestId`, async (c) => {
  const id = c.req.param("id");
  must(await db.from("gallery_guests").delete().eq("id", c.req.param("guestId")).eq("project_id", id));
  await setPhotoMails(id, c.req.param("guestId"), false);
  return c.json(await shareState(id));
});

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------
// The link that goes to all parents (see lib/consents.ts), and their answers.

/** Makes the form, or switches an existing one back on with the same address. */
async function openConsentForm(id: string) {
  if (await consentFormFor(id)) must(await db.from("consent_forms").update({ active: true }).eq("project_id", id));
  else must(await db.from("consent_forms").insert({ project_id: id, token: shareToken() }));
}

// Children their parents pointed out on a photo, in the group's gallery.
r.get(`${P}/project/:id/child-tags`, async (c) => c.json(await childTags(c.req.param("id"))));

// A parent can be wrong about a photo; the studio decides.
r.delete(`${P}/project/:id/child-tags/:tagId`, async (c) => {
  const id = c.req.param("id");
  must(await db.from("gallery_child_tags").delete().eq("id", c.req.param("tagId")).eq("project_id", id));
  return c.json(await childTags(id));
});

r.get(`${P}/project/:id/consent`, async (c) => c.json(await consentState(c.req.param("id"))));

// Makes the link, or switches an existing one back on with the same address.
r.post(`${P}/project/:id/consent`, async (c) => {
  const id = c.req.param("id");
  found(await db.from("projects").select("id").eq("id", id).maybeSingle(), "Project niet gevonden");
  await openConsentForm(id);
  return c.json(await consentState(id));
});

r.put(`${P}/project/:id/consent`, async (c) => {
  const id = c.req.param("id");
  const { active } = await readBody(c, z.object({ active: z.boolean() }));
  found(await db.from("consent_forms").update({ active }).eq("project_id", id).select("project_id").maybeSingle(), "Dit project heeft nog geen toestemmingslink.");
  // A closed form cannot be the way in: the group link stops asking for it too.
  if (!active) must(await db.from("gallery_shares").update({ consent_required: false }).eq("project_id", id));
  return c.json(await consentState(id));
});

r.delete(`${P}/project/:id/consent/photos`, async (c) => {
  const id = c.req.param("id");
  const removed = await removeConsentPhotos([id]);
  return c.json({ ...(await consentState(id)), removed });
});

// A message to one parent, written by the studio. It links to their own answer;
// the copy is the studio's only record of what was said.
r.post(`${P}/project/:id/consent/:consentId/mail`, async (c) => {
  const id = c.req.param("id");
  const { subject, message } = await readBody(c, z.object({
    subject: text(150).min(1, "Vul een onderwerp in."),
    message: text(5000).min(1, "Schrijf een bericht."),
  }));
  const row = found(
    await db.from("consents").select("key, child_name, parent_email, language, projects ( title, gallery_settings )").eq("id", c.req.param("consentId")).eq("project_id", id).maybeSingle(),
    "Toestemming niet gevonden",
  ) as any;
  const form = await consentFormFor(id);
  if (!form) fail(404, "Dit project heeft nog geen toestemmingslink.");
  const sent = await sendEmail({
    to: row.parent_email,
    replyTo: EMAIL_ADMIN_NOTIFY,
    bcc: EMAIL_ADMIN_NOTIFY,
    subject,
    html: consentMessageEmail({
      language: row.language, childName: row.child_name, message,
      projectTitle: row.projects.gallery_settings?.title || row.projects.title,
      changeLink: consentUrl(form.token, row.key),
    }),
  });
  if (!sent.ok) fail(502, sent.error || "De mail kon niet verstuurd worden.");
  return c.json({ success: true });
});

r.delete(`${P}/project/:id/consent/:consentId`, async (c) => {
  const id = c.req.param("id");
  const row = found(
    await db.from("consents").select("id, photo_path").eq("id", c.req.param("consentId")).eq("project_id", id).maybeSingle(),
    "Toestemming niet gevonden",
  ) as any;
  must(await db.from("consents").delete().eq("id", row.id));
  await removePrivate([row.photo_path]);
  return c.json(await consentState(id));
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

