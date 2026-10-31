import { Hono } from "npm:hono";
import { verifyAdmin } from "../lib/auth.ts";
import { EMAIL_RE } from "../lib/config.ts";
import { db, found, must } from "../lib/db.ts";
import { type Env, fail, readBody, text, uuid, z } from "../lib/http.ts";
import { clientDownloads, downloadLink, gallerySigner, heldBack, loadProject, type ProjectRow, projectToApi, type Signer } from "../lib/projects.ts";
import { guestCount, guestHearts, VISIT_GAP_MS } from "../lib/shares.ts";
import { signPaths } from "../lib/storage.ts";

const r = new Hono<Env>();
export default r;

// ============================================================================
// GROUP LINK — the guests' side (/galerij/<token> on the site)
// ============================================================================
//
// There is no login. The token gets someone to the door; the name and e-mail
// they leave there get them a key that their browser keeps. Every request
// after that carries both, so the studio sees who looked, how often, and which
// photos they liked. A studio admin can look without being counted (preview).

const S = "/make-server-0951c59e/share/:token";

type Share = { project_id: string; downloads: boolean };
type Guest = { id: string; name: string; visits: number; downloads: number; last_seen_at: string };

async function openShare(token: string): Promise<Share> {
  const share = /^[A-Za-z0-9]{8,64}$/.test(token)
    ? must(await db.from("gallery_shares").select("project_id, active, downloads").eq("token", token).maybeSingle()) as any
    : null;
  if (!share?.active) fail(404, "Deze link werkt niet (meer). Vraag degene die hem stuurde om een nieuwe.");
  return share;
}

async function guestFor(share: Share, key: string): Promise<Guest | null> {
  if (!/^[0-9a-f]{32}$/.test(key)) return null;
  return must(await db.from("gallery_guests").select("id, name, visits, downloads, last_seen_at")
    .eq("key", key).eq("project_id", share.project_id).maybeSingle()) as Guest | null;
}

/** 401 sends the page back to the door (the studio may have removed this guest). */
async function mustGuest(share: Share, key: string): Promise<Guest> {
  const guest = await guestFor(share, key);
  if (!guest) fail(401, "Vul eerst je naam en e-mail in.");
  return guest;
}

/** What shows at the door: enough to see whose photos these are. */
async function gateOf(row: ProjectRow) {
  const gs = row.gallery_settings || {};
  const images = (row.gallery_images || []).filter((g: any) => !heldBack(g)).sort((a: any, b: any) => a.sort - b.sort);
  const isVideo = (g: any) => /\.(mp4|mov|m4v|webm)$/i.test(String(g.file_name || g.url).split("?")[0]);
  const videos = images.filter(isVideo).length;
  const cover = images.find((g: any) => g.id === gs.coverImageId) || images.find((g: any) => !isVideo(g));
  // The same copy the gallery shows: watermarked while the project says so.
  const path = cover && (clientDownloads(row) === "watermark" && cover.preview_path ? cover.preview_path : cover.storage_path);
  const coverUrl = !cover ? "" : path ? (await signPaths([path])).get(path) || "" : cover.url;
  return {
    title: gs.title || row.title,
    subtitle: gs.subtitle || "",
    shootDate: shootOf(row)?.starts_at || "",
    style: gs.style || "",
    accentColor: gs.accentColor || "",
    cover: coverUrl,
    photos: images.length - videos,
    videos,
  };
}

function shootOf(row: ProjectRow): any {
  return (row.events || [])
    .filter((e: any) => e.kind === "shoot" && e.client_visible)
    .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))[0];
}

/** The photos and how they are shown; nothing about the client or the planning. */
function guestProject(row: ProjectRow, sign: Signer, canDownload: boolean) {
  const api = projectToApi(row, sign, { forClient: true });
  const gs = api.gallerySettings;
  const shoot = shootOf(row);
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    gallerySettings: { title: gs.title, subtitle: gs.subtitle, style: gs.style, accentColor: gs.accentColor, coverImageId: gs.coverImageId, coverUrl: gs.coverUrl },
    gallery: api.gallery.map((g: any) => ({ ...g, download: canDownload && g.download })),
    downloads: canDownload ? api.downloads : "none",
    watermarked: api.downloads === "watermark",
    events: shoot ? [{ kind: "shoot", startsAt: shoot.starts_at }] : [],
  };
}

async function seen(guest: Guest, patch: Record<string, unknown> = {}) {
  must(await db.from("gallery_guests").update({ last_seen_at: new Date().toISOString(), ...patch }).eq("id", guest.id));
}

// --- the gallery, or the door ---
r.get(S, async (c) => {
  const share = await openShare(c.req.param("token"));
  const row = await loadProject(share.project_id);
  const preview = c.req.query("preview") === "1" && Boolean(await verifyAdmin(c.req.header("Authorization") ?? null));
  const guest = preview ? null : await guestFor(share, c.req.query("key") || "");
  if (!guest && !preview) return c.json({ gate: await gateOf(row) });

  if (guest) {
    const away = Date.now() - new Date(guest.last_seen_at).getTime() >= VISIT_GAP_MS;
    await seen(guest, { visits: guest.visits === 0 || away ? guest.visits + 1 : guest.visits });
  }
  const [sign, hearts, guests, mine] = await Promise.all([
    gallerySigner([row]),
    guestHearts(row.id),
    guestCount(row.id),
    guest ? db.from("gallery_guest_hearts").select("image_id").eq("guest_id", guest.id) : null,
  ]);
  return c.json({
    guest: guest ? { name: guest.name } : null,
    preview,
    project: guestProject(row, sign, share.downloads && !preview),
    hearts: hearts.images,
    mine: mine ? (must(mine) || []).map((h: any) => h.image_id) : [],
    guests,
  });
});

// --- name and e-mail at the door ---
r.post(`${S}/guest`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({
    name: text(120).min(1, "Vul je naam in."),
    email: text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in."),
  }));
  // The same address on another phone gets the same guest back, hearts and all.
  const guest = must(await db.from("gallery_guests")
    .upsert({ project_id: share.project_id, email: b.email, name: b.name }, { onConflict: "project_id,email" })
    .select("key, name").single()) as { key: string; name: string };
  return c.json(guest);
});

// --- hearts ---
r.post(`${S}/heart`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string(), imageId: uuid, on: z.boolean() }));
  const guest = await mustGuest(share, b.key);
  found(await db.from("gallery_images").select("id").eq("id", b.imageId).eq("project_id", share.project_id).maybeSingle(), "Foto niet gevonden");
  if (b.on) {
    must(await db.from("gallery_guest_hearts").upsert({ image_id: b.imageId, guest_id: guest.id }, { onConflict: "image_id,guest_id" }));
  } else {
    must(await db.from("gallery_guest_hearts").delete().eq("image_id", b.imageId).eq("guest_id", guest.id));
  }
  await seen(guest);
  const res = await db.from("gallery_guest_hearts").select("image_id", { count: "exact", head: true }).eq("image_id", b.imageId);
  must(res);
  return c.json({ count: res.count || 0 });
});

// --- downloads ---
async function downloadRights(share: Share) {
  if (!share.downloads) fail(403, "Downloaden staat uit voor deze galerij.");
  const project = found(await db.from("projects").select("stage, gallery_settings").eq("id", share.project_id).maybeSingle(), "Project niet gevonden") as any;
  return clientDownloads(project);
}

r.post(`${S}/download`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string(), imageId: uuid }));
  const guest = await mustGuest(share, b.key);
  const downloads = await downloadRights(share);
  const img = found(
    await db.from("gallery_images").select("*").eq("id", b.imageId).eq("project_id", share.project_id).maybeSingle(),
    "Foto niet gevonden",
  );
  const link = await downloadLink(img, downloads);
  await seen(guest, { downloads: guest.downloads + 1 });
  return c.json(link);
});

// A zip is made in the browser from the photos on the page; this only counts it.
r.post(`${S}/downloaded`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string(), count: z.number().int().min(1).max(5000) }));
  const guest = await mustGuest(share, b.key);
  if ((await downloadRights(share)) === "none") fail(403, "Downloaden kan zodra de foto's geleverd zijn.");
  await seen(guest, { downloads: guest.downloads + b.count });
  return c.json({ success: true });
});
