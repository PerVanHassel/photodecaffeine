import { db, found, must } from "./db.ts";
import { fail } from "./http.ts";
import { ensureParts, galleryDelivered, mediaParts, partToApi, sortedParts } from "./parts.ts";
import { imageKey, removePrivate, signDownload, signPaths } from "./storage.ts";
import { projectDemos, todayAmsterdam } from "./util.ts";

// ---------------------------------------------------------------------------
// Stages and the older status field
// ---------------------------------------------------------------------------
// Since Projecten 2.0 the steps live on the project's parts (lib/parts.ts).
// stage and status on the project row are written from its first part, for
// the phone app and the older screens.

export const STAGES = ["lead", "quote", "booked", "shoot", "editing", "delivered", "review", "archived"] as const;
export type Stage = (typeof STAGES)[number];
export const STATUSES = ["in_progress", "in_review", "delivered", "on_hold"] as const;
export type Status = (typeof STATUSES)[number];

const DONE_STAGES: Stage[] = ["delivered", "review", "archived"];

export function statusForStage(stage: Stage, current: Status): Status {
  if (DONE_STAGES.includes(stage)) return "delivered";
  if (stage === "editing") return "in_review";
  return current === "on_hold" ? "on_hold" : "in_progress";
}

export function stageForStatus(status: Status, current: Stage): Stage {
  if (status === "delivered") return DONE_STAGES.includes(current) ? current : "delivered";
  if (status === "in_review") return "editing";
  if (status === "in_progress" && DONE_STAGES.includes(current)) return "editing";
  return current;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export const PROJECT_SELECT = `
  *,
  project_parts ( * ),
  project_clients ( client_id, position, clients ( id, name, email, company, user_id ) ),
  gallery_images ( id, url, storage_path, preview_path, display_path, file_name, sort, width, height, restriction, set_name, created_at ),
  events ( id, kind, title, starts_at, ends_at, all_day, location_text, link, notes, location_id, client_visible )
`;

export type ProjectRow = Record<string, any>;

export async function loadProject(id: string): Promise<ProjectRow> {
  const row = found(await db.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle(), "Project niet gevonden");
  return (await ensureParts([row as any]))[0];
}

export async function loadProjects(filter: { ids?: string[]; type?: string } = {}): Promise<ProjectRow[]> {
  let q = db.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false });
  if (filter.ids) {
    if (filter.ids.length === 0) return [];
    q = q.in("id", filter.ids);
  }
  if (filter.type) q = q.eq("type", filter.type);
  return ensureParts((must(await q) || []) as any[]);
}

export function clientIdsOf(row: ProjectRow): string[] {
  return [...(row.project_clients || [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((pc: any) => pc.client_id);
}

export function clientsOf(row: ProjectRow): { id: string; name: string; email: string; company: string; userId: string | null }[] {
  return [...(row.project_clients || [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((pc: any) => pc.clients)
    .filter(Boolean)
    .map((c: any) => ({ id: c.id, name: c.name || c.email, email: c.email, company: c.company, userId: c.user_id }));
}

function sortedImages(row: ProjectRow): any[] {
  return [...(row.gallery_images || [])].sort((a: any, b: any) => a.sort - b.sort);
}

/**
 * The meeting the older screens show: the next one coming up, or else the
 * most recent one. Newer screens read the full event list instead.
 */
export function primaryMeeting(row: ProjectRow): any | null {
  const meetings = (row.events || []).filter((e: any) => e.kind === "meeting");
  if (meetings.length === 0) return null;
  const now = Date.now();
  const upcoming = meetings
    .filter((e: any) => new Date(e.starts_at).getTime() >= now)
    .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
  if (upcoming.length) return upcoming[0];
  return meetings.sort((a: any, b: any) => b.starts_at.localeCompare(a.starts_at))[0];
}

export function eventToApi(e: any) {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    allDay: e.all_day,
    locationText: e.location_text,
    locationId: e.location_id,
    link: e.link,
    notes: e.notes,
    clientVisible: e.client_visible,
  };
}

// ---------------------------------------------------------------------------
// Who sees what: watermark and downloads
// ---------------------------------------------------------------------------
// The studio sets one switch, Watermerk, per gallery. With it on, everyone but
// the studio sees the watermarked copies, unless the client is allowed the
// originals (clientOriginals). Selling photos on the group link always shows
// the guests watermarks. Downloading gives the version someone sees, while
// downloading is open: before delivery, and a quarter after it (terms,
// Oplevering & revisies, article 5) or until the date the studio set.
//
// Galleries from before the switch kept their watermark in earlyDownloads, and
// only until delivery; they keep working that way (legacy).

export type Downloads = "original" | "watermark" | "none";
export type Version = "original" | "watermark";

const DOWNLOAD_MONTHS = 3;

/** The last day of downloading, YYYY-MM-DD; empty when it is not running yet. A date the studio set wins. */
export function downloadsUntil(row: { gallery_settings?: any }): string {
  const gs = row.gallery_settings || {};
  if (gs.downloadsUntil) return String(gs.downloadsUntil);
  if (!gs.deliveredAt) return "";
  const d = new Date(gs.deliveredAt);
  d.setMonth(d.getMonth() + DOWNLOAD_MONTHS);
  return d.toISOString().slice(0, 10);
}

const dayPassed = (day: string) => !!day && day < todayAmsterdam();

export type Access = {
  delivered: boolean;
  /** Downloading can happen now, as far as time goes. */
  open: boolean;
  /** The Watermerk switch. */
  watermark: boolean;
  client: { sees: Version; downloads: Downloads };
};

export function galleryAccess(row: ProjectRow): Access {
  const gs = row.gallery_settings || {};
  const delivered = galleryDelivered(row);
  // A website has no download, unless the studio set a date for its photos.
  const media = row.project_parts ? mediaParts(row).length > 0 : row.type !== "web";
  const open = (media || !!gs.downloadsUntil) && !(delivered && dayPassed(downloadsUntil(row)));
  if (typeof gs.watermark !== "boolean") {
    const early = gs.earlyDownloads;
    const sees: Version = !delivered && early === "watermark" ? "watermark" : "original";
    const on = delivered || early !== "none";
    return { delivered, open, watermark: early === "watermark" && !delivered, client: { sees, downloads: open && on ? sees : "none" } };
  }
  const sees: Version = gs.watermark && !gs.clientOriginals ? "watermark" : "original";
  const on = gs.clientDownloads !== false;
  return { delivered, open, watermark: gs.watermark, client: { sees, downloads: open && on ? sees : "none" } };
}

/** What a client may download; "none" outside the window or with downloads off. */
export function clientDownloads(row: ProjectRow): Downloads {
  return galleryAccess(row).client.downloads;
}

/** What someone on the group link sees and may download for free. */
export function guestAccess(row: ProjectRow, share: { downloads: boolean; sales: boolean }): { sees: Version; downloads: Downloads } {
  const a = galleryAccess(row);
  const legacy = typeof (row.gallery_settings || {}).watermark !== "boolean";
  const sees: Version = share.sales || (legacy ? a.client.sees === "watermark" : a.watermark) ? "watermark" : "original";
  if (!share.downloads || !a.open) return { sees, downloads: "none" };
  // Before the switch, guests downloaded what the client could.
  if (legacy && a.client.downloads === "none") return { sees, downloads: "none" };
  return { sees, downloads: sees };
}

/** The name a watermarked copy is saved under. */
export function watermarkedName(name: string): string {
  return `${(name || "foto").replace(/\.\w+$/, "")}-voorbeeld.jpg`;
}

/** A photo with a child on it who may not be shown: the studio sees it, nobody else. */
export const heldBack = (img: any) => img.restriction === "no_photo";

export const isVideoName = (name: string) => /\.(mp4|mov|m4v|webm)$/i.test(String(name || "").split("?")[0]);

/** Someone who sees watermarks only gets photos that have a watermarked copy; videos have none. */
export const showsAs = (img: any, sees: Version) => sees === "original" || Boolean(img.preview_path);

/** A photo that may not be posted says so in its file name, so it still does once it has left the gallery. */
function savedName(img: any): string {
  const name = img.file_name || "foto.jpg";
  return img.restriction === "no_social" ? name.replace(/(\.\w+)?$/, (ext: string) => `-niet-op-social-media${ext}`) : name;
}

/** A link that saves one gallery photo, as far as `downloads` allows; fails when it allows nothing. */
export async function downloadLink(img: any, downloads: Downloads): Promise<{ url: string; fileName: string; version: Version }> {
  if (heldBack(img)) fail(404, "Foto niet gevonden");
  if (downloads === "none" || (downloads === "watermark" && !img.preview_path)) {
    fail(403, "Downloaden kan nu niet bij deze foto.");
  }
  if (downloads === "watermark") {
    const fileName = watermarkedName(savedName(img));
    return { url: await signDownload(img.preview_path, fileName), fileName, version: "watermark" };
  }
  const fileName = savedName(img);
  const url = img.storage_path ? await signDownload(img.storage_path, fileName) : img.url;
  return { url, fileName, version: "original" };
}

/** Download links for many photos at once, for a zip. Photos it may not give are left out. */
export async function downloadLinks(images: any[], downloadsOf: (img: any) => Downloads) {
  const out: { id: string; url: string; fileName: string; version: Version }[] = [];
  for (let i = 0; i < images.length; i += 20) {
    const chunk = images.slice(i, i + 20);
    const links = await Promise.all(chunk.map(async (img) => {
      const d = downloadsOf(img);
      if (heldBack(img) || d === "none" || (d === "watermark" && !img.preview_path)) return null;
      try {
        return { id: img.id, ...(await downloadLink(img, d)) };
      } catch {
        return null;
      }
    }));
    out.push(...links.filter((l): l is NonNullable<typeof l> => !!l));
  }
  return out;
}

/** "view": the light copy to look at (or the original); "watermark": the watermarked copy; "original": the file itself. */
export type Signer = (img: any, version?: Version | "view") => string;

/** Signs the private gallery images across the given projects in one call. */
export async function gallerySigner(rows: ProjectRow[]): Promise<Signer> {
  const paths = rows.flatMap((r) => (r.gallery_images || []).flatMap((g: any) => [g.display_path || g.storage_path, g.preview_path])).filter(Boolean);
  const signed = await signPaths(paths);
  return (img: any, version: Version | "view" = "view") => {
    if (version === "watermark") return img.preview_path ? signed.get(img.preview_path) || "" : "";
    const path = version === "view" ? img.display_path || img.storage_path : img.storage_path;
    if (!path) return img.url;
    // The original is only signed on its own, for a download; the light copy stands in for it.
    return signed.get(path) || signed.get(img.display_path || img.storage_path) || "";
  };
}

/** The gallery's look and words, for anyone who sees it; the studio's own switches stay out. */
const PUBLIC_SETTINGS = [
  "title", "subtitle", "intro", "coverImageId", "coverUrl", "accentColor", "style", "layout", "theme", "font", "density", "gap",
  "showNumbers", "sets", "deliveredAt", "downloadsUntil",
] as const;

export function publicSettings(gs: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of PUBLIC_SETTINGS) if (gs[k] !== undefined && gs[k] !== "") out[k] = gs[k];
  return out;
}

/** The image as a gallery shows it to someone who sees `sees`. */
export function imageToApi(g: any, sign: Signer, sees: Version) {
  const img: Record<string, any> = { id: g.id, url: sign(g, sees === "watermark" ? "watermark" : "view"), fileName: g.file_name };
  if (g.restriction) img.restriction = g.restriction;
  if (g.set_name) img.set = g.set_name;
  if (g.width > 0 && g.height > 0) {
    img.w = g.width;
    img.h = g.height;
  }
  return img;
}

/**
 * The project as the API has always returned it, plus the newer fields.
 * `forClient` drops what only the studio should see.
 */
export function projectToApi(row: ProjectRow, sign: Signer, opts: { forClient?: boolean } = {}) {
  const clientIds = clientIdsOf(row);
  const demos = projectDemos(row);
  const access = galleryAccess(row);
  const all = sortedImages(row);
  const sees: Version = opts.forClient ? access.client.sees : "original";
  // The client never gets a photo that is held back, and with the watermark on only photos that have one.
  const shown = opts.forClient ? all.filter((g) => !heldBack(g) && showsAs(g, sees)) : all;
  const images = shown.map((g) => {
    const img = imageToApi(g, sign, sees);
    if (opts.forClient) img.download = access.client.downloads !== "none";
    else {
      img.watermark = Boolean(g.preview_path);
      img.light = Boolean(g.display_path);
      img.addedAt = g.created_at;
    }
    return img;
  });
  const meeting = primaryMeeting(row);
  // Private images have short-lived URLs, so the cover is remembered by image
  // id and turned into a fresh URL here.
  const gallerySettings = { ...(row.gallery_settings || {}) };
  const cover = gallerySettings.coverImageId ? images.find((i) => i.id === gallerySettings.coverImageId) : null;
  if (cover) gallerySettings.coverUrl = cover.url;
  else if (images.length < all.length || sees === "watermark") {
    // The cover may be held back, or have no watermarked copy; the gallery then opens with its first photo.
    delete gallerySettings.coverImageId;
    delete gallerySettings.coverUrl;
  }
  const events = (row.events || [])
    .filter((e: any) => !opts.forClient || e.client_visible)
    .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))
    .map(eventToApi);
  const parts = sortedParts(row).filter((p) => !opts.forClient || p.hold !== "stopped").map((p) => partToApi(p, opts));

  const api: Record<string, any> = {
    id: row.id,
    title: row.title,
    type: row.type,
    stage: row.stage,
    status: row.status,
    phase: row.phase,
    description: row.description,
    dueDate: row.due_date || "",
    deliverables: row.deliverables || [],
    gallerySettings,
    galleryUrls: images.map((i) => i.url),
    gallery: images,
    parts,
    archivedAt: row.archived_at || null,
    meeting: meeting
      ? {
        date: meeting.starts_at,
        location: meeting.location_text || undefined,
        link: meeting.link || undefined,
        notes: meeting.notes || undefined,
      }
      : undefined,
    events,
    demos,
    demoSlug: demos[0]?.slug || "",
    demoLive: Boolean(demos[0]?.live),
    demoUrl: row.demo_url,
    demoNotes: row.demo_notes,
    locationId: row.location_id,
    clientIds,
    clientId: clientIds[0] || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  api.downloadsUntil = downloadsUntil(row);
  api.galleryDelivered = access.delivered;
  if (opts.forClient) {
    api.downloads = access.client.downloads;
    api.watermarked = sees === "watermark";
    // What the gallery says, without the studio's own switches.
    api.gallerySettings = publicSettings(gallerySettings);
  } else {
    const clients = clientsOf(row);
    api.clients = clients;
    api.clientNames = clients.map((c) => c.name);
    api.briefing = row.briefing;
    api.briefingUpdatedAt = row.briefing_updated_at || "";
    api.valueCents = row.value_cents;
    api.inquiryId = row.inquiry_id;
    api.access = { watermark: access.watermark, client: access.client, open: access.open };
  }
  return api;
}

// ---------------------------------------------------------------------------
// Writing the parts that live in other tables
// ---------------------------------------------------------------------------

export async function setProjectClients(projectId: string, clientIds: string[]): Promise<void> {
  const ids = [...new Set(clientIds)];
  must(await db.from("project_clients").delete().eq("project_id", projectId).not("client_id", "in", `(${ids.join(",") || "00000000-0000-0000-0000-000000000000"})`));
  if (ids.length) {
    must(await db.from("project_clients").upsert(
      ids.map((client_id, position) => ({ project_id: projectId, client_id, position })),
      { onConflict: "project_id,client_id" },
    ));
  }
}

/**
 * Makes the gallery match a list of URLs sent by an older screen: unknown URLs
 * are added, missing ones removed, and the order is taken from the list.
 * Returns how many images were added.
 */
export async function syncGalleryUrls(row: ProjectRow, urls: string[]): Promise<number> {
  const existing = sortedImages(row);
  const byKey = new Map(existing.map((g) => [g.storage_path || imageKey(g.url), g]));
  const wanted = urls.map((u) => ({ url: u, key: imageKey(u) }));
  const wantedKeys = new Set(wanted.map((w) => w.key));

  const removed = existing.filter((g) => !wantedKeys.has(g.storage_path || imageKey(g.url)));
  if (removed.length) {
    must(await db.from("gallery_images").delete().in("id", removed.map((g) => g.id)));
    await removePrivate(removed.flatMap((g) => [g.preview_path, g.display_path]));
  }

  let added = 0;
  const rows = wanted.map((w, sort) => {
    const hit = byKey.get(w.key);
    if (hit) return { id: hit.id, project_id: row.id, url: hit.url, storage_path: hit.storage_path, file_name: hit.file_name, sort };
    added++;
    return { id: crypto.randomUUID(), project_id: row.id, url: w.url, storage_path: "", file_name: w.url.split("?")[0].split("/").pop() || "", sort };
  });
  if (rows.length) must(await db.from("gallery_images").upsert(rows));
  return added;
}

/** Replaces the project's primary meeting (see primaryMeeting), or removes it with null. */
export async function setPrimaryMeeting(row: ProjectRow, meeting: any | null): Promise<void> {
  const current = primaryMeeting(row);
  if (meeting === null || !meeting?.date) {
    if (current) must(await db.from("events").delete().eq("id", current.id));
    return;
  }
  const fields = {
    project_id: row.id,
    kind: "meeting",
    title: current?.title || "Meeting",
    starts_at: new Date(meeting.date).toISOString(),
    location_text: String(meeting.location || ""),
    link: String(meeting.link || ""),
    notes: String(meeting.notes || ""),
  };
  if (current) must(await db.from("events").update(fields).eq("id", current.id));
  else must(await db.from("events").insert(fields));
}
