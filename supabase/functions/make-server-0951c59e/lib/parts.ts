import { db, must } from "./db.ts";
import { fail } from "./http.ts";

// Projecten 2.0: a project is made of parts. Foto, Video and Website each have
// their own steps, and each can wait for the client, pause or stop on its own.
// A Foto+Video project shares one gallery; delivering either part opens it.
//
// The project row keeps its older stage, status and type, written from its
// first part that has not stopped (syncProject). The phone app and the older
// screens read those. Moving a part never mails anyone: delivering is its own
// button (routes/projects.ts, /deliver).

export type Kind = "photo" | "video" | "web";
export const KINDS: Kind[] = ["photo", "video", "web"];
export type Hold = "" | "waiting" | "paused" | "stopped";
export const HOLDS: Hold[] = ["", "waiting", "paused", "stopped"];

export const STEPS: Record<Kind, string[]> = {
  photo: ["lead", "quote", "booked", "shoot", "editing", "delivered", "done"],
  video: ["lead", "quote", "booked", "shoot", "editing", "delivered", "done"],
  web: ["lead", "quote", "booked", "intake", "design", "build", "review", "live"],
};

/** The step that is the delivery: the gallery opens, or the website goes live. */
export const DELIVERY_STEP: Record<Kind, string> = { photo: "delivered", video: "delivered", web: "live" };

export type PartRow = {
  id: string; project_id: string; kind: Kind; category: string; stage: string; hold: Hold; hold_note: string;
  hold_since: string | null; sort: number; delivered_at: string | null; created_at: string; updated_at: string;
};

export const isKind = (k: unknown): k is Kind => KINDS.includes(k as Kind);
export const validStep = (kind: Kind, step: string) => STEPS[kind].includes(step);

/** On or past the delivery step. */
export function isDelivered(part: Pick<PartRow, "kind" | "stage">): boolean {
  const steps = STEPS[part.kind];
  return steps.indexOf(part.stage) >= steps.indexOf(DELIVERY_STEP[part.kind]);
}

export function sortedParts(row: { project_parts?: PartRow[] }): PartRow[] {
  return [...(row.project_parts || [])].sort((a, b) => a.sort - b.sort || String(a.created_at).localeCompare(String(b.created_at)));
}

/** The part the project's older fields follow: the first that has not stopped. */
export function mainPart(row: { project_parts?: PartRow[] }): PartRow | null {
  const parts = sortedParts(row);
  return parts.find((p) => p.hold !== "stopped") || parts[0] || null;
}

/** The parts with a gallery: Foto and Video. */
export const mediaParts = (row: { project_parts?: PartRow[] }) => sortedParts(row).filter((p) => p.kind !== "web" && p.hold !== "stopped");

/**
 * The gallery is delivered once a Foto or Video part is. A project from before
 * parts (or one whose parts were not loaded) falls back on its own stage.
 */
export function galleryDelivered(row: { stage?: string; project_parts?: PartRow[] }): boolean {
  if (!row.project_parts) return ["delivered", "review", "archived"].includes(String(row.stage));
  return sortedParts(row).some((p) => p.kind !== "web" && isDelivered(p));
}

// ---------------------------------------------------------------------------
// The older stage, both ways
// ---------------------------------------------------------------------------

type Stage = "lead" | "quote" | "booked" | "shoot" | "editing" | "delivered" | "review" | "archived";

/** The step a part of this kind is on, for a stage from an older screen or the phone app. */
export function stepForStage(kind: Kind, stage: string): string {
  if (kind === "web") {
    return ({ lead: "lead", quote: "quote", booked: "booked", shoot: "intake", editing: "build", delivered: "live", review: "live", archived: "live" } as Record<string, string>)[stage] || "booked";
  }
  return ({ lead: "lead", quote: "quote", booked: "booked", shoot: "shoot", editing: "editing", delivered: "delivered", review: "done", archived: "done" } as Record<string, string>)[stage] || "booked";
}

/** The older stage for a part's step. */
export function stageForStep(kind: Kind, step: string): Stage {
  if (kind === "web") {
    return ({ lead: "lead", quote: "quote", booked: "booked", intake: "booked", design: "editing", build: "editing", review: "editing", live: "delivered" } as Record<string, Stage>)[step] || "booked";
  }
  return ({ lead: "lead", quote: "quote", booked: "booked", shoot: "shoot", editing: "editing", delivered: "delivered", done: "review" } as Record<string, Stage>)[step] || "booked";
}

/** The project's older stage, status and type, from its parts and its archive date. */
export function legacyFields(row: { archived_at?: string | null; type?: string; project_parts?: PartRow[] }) {
  const main = mainPart(row);
  if (!main) return null;
  const stage: Stage = row.archived_at ? "archived" : stageForStep(main.kind, main.stage);
  const status = ["delivered", "review", "archived"].includes(stage) ? "delivered"
    : main.hold === "waiting" || main.hold === "paused" ? "on_hold"
    : stage === "editing" ? "in_review"
    : "in_progress";
  return { stage, status, type: main.kind };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export async function partsOf(projectId: string): Promise<PartRow[]> {
  return (must(await db.from("project_parts").select("*").eq("project_id", projectId).order("sort")) || []) as PartRow[];
}

/** Writes the project's older fields from its parts, when they differ. */
export async function syncProject(projectId: string): Promise<void> {
  const row = must(await db.from("projects").select("id, stage, status, type, archived_at, project_parts ( * )").eq("id", projectId).maybeSingle()) as any;
  if (!row) return;
  const want = legacyFields(row);
  if (!want) return;
  if (want.stage !== row.stage || want.status !== row.status || want.type !== row.type) {
    must(await db.from("projects").update(want).eq("id", projectId));
  }
}

/** New parts for a project, in this order. Kinds it already has are left alone. */
export async function addParts(projectId: string, parts: { kind: Kind; category?: string; stage?: string }[]): Promise<void> {
  const existing = await partsOf(projectId);
  const have = new Set(existing.map((p) => p.kind));
  let sort = existing.reduce((m, p) => Math.max(m, p.sort + 1), 0);
  const rows = [];
  for (const p of parts) {
    if (have.has(p.kind)) continue;
    have.add(p.kind);
    const stage = p.stage && validStep(p.kind, p.stage) ? p.stage : "booked";
    rows.push({ project_id: projectId, kind: p.kind, category: (p.category || "").slice(0, 60), stage, sort: sort++ });
  }
  if (rows.length) must(await db.from("project_parts").insert(rows));
  await syncProject(projectId);
}

/**
 * Moves a part forward from one of `from` to `to`, as an accepted quote or a
 * planned shoot does. With `kind`, that part (made when it is missing);
 * otherwise the main part. Never mails.
 */
export async function advance(projectId: string, to: Stage, from: Stage[], kind?: Kind): Promise<void> {
  const parts = await partsOf(projectId);
  let part = kind ? parts.find((p) => p.kind === kind) : mainPart({ project_parts: parts });
  if (!part && kind) {
    await addParts(projectId, [{ kind, stage: stepForStage(kind, to) }]);
    return;
  }
  if (!part) return;
  const allowed = from.map((s) => stepForStage(part!.kind, s));
  if (!allowed.includes(part.stage)) return;
  must(await db.from("project_parts").update({ stage: stepForStage(part.kind, to), updated_at: new Date().toISOString() }).eq("id", part.id));
  await syncProject(projectId);
}

/**
 * Projects made before parts, or by code that only writes the project row, get
 * their part here: the kind and step of the project itself.
 */
export async function ensureParts<T extends { id: string; type?: string; stage?: string; project_parts?: PartRow[] }>(rows: T[]): Promise<T[]> {
  const missing = rows.filter((r) => !r.project_parts?.length);
  if (missing.length === 0) return rows;
  const inserts = missing.map((r) => {
    const kind: Kind = isKind(r.type) ? r.type : "photo";
    return { project_id: r.id, kind, stage: stepForStage(kind, String(r.stage || "booked")), sort: 0 };
  });
  const made = (must(await db.from("project_parts").upsert(inserts, { onConflict: "project_id,kind", ignoreDuplicates: true }).select("*")) || []) as PartRow[];
  const fresh = made.length < inserts.length
    ? (must(await db.from("project_parts").select("*").in("project_id", missing.map((r) => r.id))) || []) as PartRow[]
    : made;
  for (const r of missing) r.project_parts = fresh.filter((p) => p.project_id === r.id);
  return rows;
}

export function partToApi(p: PartRow, opts: { forClient?: boolean } = {}) {
  const api: Record<string, unknown> = {
    id: p.id,
    kind: p.kind,
    category: p.category,
    stage: p.stage,
    hold: p.hold,
    deliveredAt: p.delivered_at,
  };
  if (opts.forClient) {
    // The client sees what they are waited on for; why something paused is the studio's.
    if (p.hold === "waiting") api.holdNote = p.hold_note;
    if (p.hold === "paused" || p.hold === "stopped") api.hold = p.hold;
  } else {
    Object.assign(api, { holdNote: p.hold_note, holdSince: p.hold_since, sort: p.sort, createdAt: p.created_at, updatedAt: p.updated_at });
  }
  return api;
}

/** One part of a project, or a 404. */
export async function partOf(projectId: string, partId: string): Promise<PartRow> {
  const row = must(await db.from("project_parts").select("*").eq("id", partId).eq("project_id", projectId).maybeSingle()) as PartRow | null;
  if (!row) fail(404, "Dit onderdeel bestaat niet (meer).");
  return row;
}
