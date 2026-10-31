import { SITE_URL } from "./config.ts";
import { db, must } from "./db.ts";
import { removePrivate, signPaths } from "./storage.ts";

// Parents' consent per child for a shoot. One link per project goes to all
// parents; routes/consent.ts is their side, the studio's is in routes/projects.ts.
// Every answer has its own key, which the confirmation mail links to, so a
// parent can change or withdraw it later.

export const ANSWERS = ["full", "no_social", "no_photo"] as const;
export type Answer = (typeof ANSWERS)[number];
export type Language = "nl" | "en";

/**
 * What a parent agrees to, word for word. The form shows these, the answer
 * keeps its own copy as proof, and the confirmation mail repeats it. `club` is
 * whose social media the photos go on (gallerySettings.consentClub): a match
 * also reaches the parents of the other team, for whom "the club" is their own.
 */
export function statementsFor(club: string): Record<Language, Record<Answer, { title: string; body: string }>> {
  const name = club.trim();
  return {
    nl: {
      full: {
        title: "Op de foto en op social media",
        body: `Mijn kind mag op de foto. De foto's mogen op social media van ${name || "de club"} en van PhotoDeCaffeine.`,
      },
      no_social: {
        title: "Op de foto, niet op social media",
        body: `Mijn kind mag op de foto, maar foto's waar mijn kind op staat, komen niet op social media. ${name || "De club"} en de ouders van de spelers kunnen ze wel zien in de afgeschermde galerij.`,
      },
      no_photo: {
        title: "Niet op de foto",
        body: "Mijn kind mag niet op de foto. Staat mijn kind er toch per ongeluk op, dan haalt PhotoDeCaffeine die foto eruit. Niemand anders krijgt hem te zien.",
      },
    },
    en: {
      full: {
        title: "In photos and on social media",
        body: `My child may be photographed. The photos may be posted on the social media of ${name || "the club"} and of PhotoDeCaffeine.`,
      },
      no_social: {
        title: "In photos, not on social media",
        body: `My child may be photographed, but photos showing my child will not go on social media. ${name || "The club"} and the players' parents can see them in the private gallery.`,
      },
      no_photo: {
        title: "Not in photos",
        body: "My child may not be photographed. If my child still ends up in a photo by accident, PhotoDeCaffeine takes that photo out. Nobody else gets to see it.",
      },
    },
  };
}

export const consentUrl = (token: string, key?: string) => `${SITE_URL}/toestemming/${token}${key ? `?k=${key}` : ""}`;

/** The shoot a form is about: the next one, or else the most recent. */
function shootOf(events: any[]): any {
  const shoots = (events || []).filter((e) => e.kind === "shoot" && e.client_visible).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const since = new Date(Date.now() - 86400000).toISOString();
  return shoots.find((e) => e.starts_at >= since) || shoots[shoots.length - 1];
}

/** What the form shows, on its own page and as a step on the way into the group's gallery. */
export function formFields(project: any) {
  return {
    title: project.gallery_settings?.title || project.title,
    shootDate: shootOf(project.events)?.starts_at || "",
    accentColor: project.gallery_settings?.accentColor || "",
    statements: statementsFor(project.gallery_settings?.consentClub || ""),
  };
}

export type ConsentFormRow = { project_id: string; token: string; active: boolean; created_at: string };

export async function consentFormFor(projectId: string): Promise<ConsentFormRow | null> {
  return must(await db.from("consent_forms").select("project_id, token, active, created_at").eq("project_id", projectId).maybeSingle()) as ConsentFormRow | null;
}

// Whoever needs the most care comes first.
const STRICTNESS: Record<Answer, number> = { no_photo: 0, no_social: 1, full: 2 };

/** A project's link and every answer, for the studio. */
export async function consentState(projectId: string) {
  const form = await consentFormFor(projectId);
  const rows = (must(await db.from("consents").select("*").eq("project_id", projectId)) || []) as any[];
  const signed = await signPaths(rows.map((c) => c.photo_path));
  const consents = rows
    .sort((a, b) => STRICTNESS[a.answer as Answer] - STRICTNESS[b.answer as Answer] || a.child_name.localeCompare(b.child_name, "nl"))
    .map((c) => ({
      id: c.id,
      childName: c.child_name,
      answer: c.answer as Answer,
      note: c.note,
      photoUrl: c.photo_path ? signed.get(c.photo_path) || "" : "",
      parentName: c.parent_name,
      parentEmail: c.parent_email,
      statement: c.statement,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  const count = (answer: Answer) => rows.filter((c) => c.answer === answer).length;
  return {
    form: form ? { url: consentUrl(form.token), active: form.active, createdAt: form.created_at } : null,
    consents,
    totals: { full: count("full"), no_social: count("no_social"), no_photo: count("no_photo") },
  };
}

const normalName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * What the answers say about a child a parent pointed out on a photo: the
 * strictest one for that name, or for that first name when only that was given.
 * "unknown" when no form names this child, which is a question for the studio.
 */
export function answerForChild(name: string, consents: { child_name: string; answer: Answer }[]): Answer | "unknown" {
  const wanted = normalName(name);
  let same = consents.filter((c) => normalName(c.child_name) === wanted);
  if (same.length === 0 && !wanted.includes(" ")) same = consents.filter((c) => normalName(c.child_name).split(" ")[0] === wanted);
  if (same.length === 0) return "unknown";
  return same.map((c) => c.answer).sort((a, b) => STRICTNESS[a] - STRICTNESS[b])[0];
}

/** Every child pointed out on a photo of this project, for the studio. */
export async function childTags(projectId: string) {
  const [tags, consents] = await Promise.all([
    db.from("gallery_child_tags").select("id, image_id, child_name, gallery_guests ( name )").eq("project_id", projectId).order("created_at"),
    db.from("consents").select("child_name, answer").eq("project_id", projectId),
  ]);
  const answers = (must(consents) || []) as { child_name: string; answer: Answer }[];
  return {
    tags: ((must(tags) || []) as any[]).map((t) => ({
      id: t.id,
      imageId: t.image_id,
      child: t.child_name,
      answer: answerForChild(t.child_name, answers),
      by: t.gallery_guests?.name || "",
    })),
  };
}

/** The photos of the children are only for recognising them: they go once the shoot is delivered. */
export async function removeConsentPhotos(projectIds: string[]): Promise<number> {
  if (projectIds.length === 0) return 0;
  const rows = (must(await db.from("consents").select("id, photo_path").in("project_id", projectIds).neq("photo_path", "")) || []) as any[];
  if (rows.length === 0) return 0;
  await removePrivate(rows.map((c) => c.photo_path));
  must(await db.from("consents").update({ photo_path: "" }).in("id", rows.map((c) => c.id)));
  return rows.length;
}
