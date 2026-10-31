import { Hono } from "npm:hono";
import { BRIEFING_MAX_CHARS, SITE_URL } from "../lib/config.ts";
import { projectRecipients } from "../lib/clients.ts";
import { childTags, consentFormFor, consentState, removeConsentPhotos } from "../lib/consents.ts";
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
import { guestHearts, shareFor, shareToken, shareUrl } from "../lib/shares.ts";
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
    await notifyClients(updated, { added: added > 0 ? added : 0, justDelivered, meetingChanged });
  }
  // Delivered: nothing left to pick out, so the photos of the children go.
  if (justDelivered) await removeConsentPhotos([id]);

  return c.json({ project });
});

async function notifyClients(
  row: ProjectRow,
  what: { added: number; justDelivered: boolean; meetingChanged: boolean },
) {
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
  await removePrivate((row.gallery_images || []).flatMap((g: any) => [g.storage_path, g.preview_path]));
  await removeConsentPhotos([id]);
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
  for (const [i, file] of files.entries()) {
    const path = await uploadPrivate(`galleries/${id}`, file, { allowVideo: true });
    // The admin's browser sends a watermarked copy as preview-<index> when it
    // could make one (not for video, nor for formats it can't decode).
    const preview = form.get(`preview-${i}`);
    const previewPath = preview instanceof File ? await uploadPrivate(`galleries/${id}/wm`, preview) : "";
    // And its size as "<width>x<height>", so the client gallery can lay it out before it loads.
    const [width, height] = String(form.get(`size-${i}`) || "").split("x").map((n) => Math.min(100000, Math.max(0, parseInt(n, 10) || 0)));
    rows.push({ project_id: id, url: "", storage_path: path, preview_path: previewPath, file_name: file.name, sort: sort++, width: width || 0, height: height || 0 });
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
  await removePrivate([img.storage_path, img.preview_path]);
  return c.json({ project: await respond(id) });
});

// Watermarked copy for a photo uploaded before these existed; made in the
// admin's browser from the original.
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
  if (recipients.length === 0) fail(400, "Er staat geen klant met een e-mailadres bij dit project.");
  await notifyClients(row, { added, justDelivered: false, meetingChanged: false });
  return c.json({ success: true, sentTo: recipients.map((p) => p.email) });
});

// ---------------------------------------------------------------------------
// Group link
// ---------------------------------------------------------------------------
// The link a group passes round (see lib/shares.ts), and who came in with it.

async function shareState(id: string) {
  const share = await shareFor(id);
  if (!share) return { share: null, guests: [], hearts: {}, totals: { guests: 0, visits: 0, hearts: 0, downloads: 0 } };
  const [rows, hearts] = await Promise.all([
    db.from("gallery_guests").select("id, name, email, visits, downloads, first_seen_at, last_seen_at")
      .eq("project_id", id).order("last_seen_at", { ascending: false }),
    guestHearts(id),
  ]);
  const guests = (must(rows) || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    email: g.email,
    visits: g.visits,
    downloads: g.downloads,
    hearts: hearts.guests[g.id] || 0,
    firstSeenAt: g.first_seen_at,
    lastSeenAt: g.last_seen_at,
  }));
  const sum = (list: number[]) => list.reduce((s, n) => s + n, 0);
  return {
    share: { url: shareUrl(share.token), active: share.active, downloads: share.downloads, consentRequired: share.consent_required, createdAt: share.created_at },
    guests,
    hearts: hearts.images,
    totals: {
      guests: guests.length,
      visits: sum(guests.map((g) => g.visits)),
      hearts: sum(Object.values(hearts.images)),
      downloads: sum(guests.map((g) => g.downloads)),
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
  const { consentRequired, ...b } = await readBody(c, z.object({ active: z.boolean().optional(), downloads: z.boolean().optional(), consentRequired: z.boolean().optional() }));
  const patch = consentRequired === undefined ? b : { ...b, consent_required: consentRequired };
  // Asking for consent takes a form that is there and open.
  if (consentRequired) await openConsentForm(id);
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

// Someone who asks to be forgotten, with their hearts.
r.delete(`${P}/project/:id/share/guests/:guestId`, async (c) => {
  const id = c.req.param("id");
  must(await db.from("gallery_guests").delete().eq("id", c.req.param("guestId")).eq("project_id", id));
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

