import { db, found, must } from "./db.ts";
import { imageKey, signPaths } from "./storage.ts";
import { projectDemos } from "./util.ts";

// ---------------------------------------------------------------------------
// Stages and the older status field
// ---------------------------------------------------------------------------
// stage drives the pipeline. status is what the mobile app and the portal
// were built on; it is derived from stage and written alongside it.

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
  project_clients ( client_id, position, clients ( id, name, email, company, user_id ) ),
  gallery_images ( id, url, storage_path, file_name, sort ),
  events ( id, kind, title, starts_at, ends_at, all_day, location_text, link, notes, location_id, client_visible )
`;

export type ProjectRow = Record<string, any>;

export async function loadProject(id: string): Promise<ProjectRow> {
  return found(await db.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle(), "Project niet gevonden");
}

export async function loadProjects(filter: { ids?: string[]; type?: string } = {}): Promise<ProjectRow[]> {
  let q = db.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false });
  if (filter.ids) {
    if (filter.ids.length === 0) return [];
    q = q.in("id", filter.ids);
  }
  if (filter.type) q = q.eq("type", filter.type);
  return must(await q) || [];
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

/** Signs every private gallery image across the given projects in one call. */
export async function gallerySigner(rows: ProjectRow[]): Promise<(img: any) => string> {
  const paths = rows.flatMap((r) => (r.gallery_images || []).map((g: any) => g.storage_path)).filter(Boolean);
  const signed = await signPaths(paths);
  return (img: any) => (img.storage_path ? signed.get(img.storage_path) || "" : img.url);
}

/**
 * The project as the API has always returned it, plus the newer fields.
 * `forClient` drops what only the studio should see.
 */
export function projectToApi(row: ProjectRow, sign: (img: any) => string, opts: { forClient?: boolean } = {}) {
  const clientIds = clientIdsOf(row);
  const demos = projectDemos(row);
  const images = sortedImages(row).map((g) => ({ id: g.id, url: sign(g), fileName: g.file_name }));
  const meeting = primaryMeeting(row);
  const events = (row.events || [])
    .filter((e: any) => !opts.forClient || e.client_visible)
    .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))
    .map(eventToApi);

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
    gallerySettings: row.gallery_settings || {},
    galleryUrls: images.map((i) => i.url),
    gallery: images,
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

  if (!opts.forClient) {
    const clients = clientsOf(row);
    api.clients = clients;
    api.clientNames = clients.map((c) => c.name);
    api.briefing = row.briefing;
    api.briefingUpdatedAt = row.briefing_updated_at || "";
    api.valueCents = row.value_cents;
    api.inquiryId = row.inquiry_id;
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
  if (removed.length) must(await db.from("gallery_images").delete().in("id", removed.map((g) => g.id)));

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
