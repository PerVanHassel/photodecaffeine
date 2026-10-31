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

/** The photos of the children are only for recognising them: they go once the shoot is delivered. */
export async function removeConsentPhotos(projectIds: string[]): Promise<number> {
  if (projectIds.length === 0) return 0;
  const rows = (must(await db.from("consents").select("id, photo_path").in("project_id", projectIds).neq("photo_path", "")) || []) as any[];
  if (rows.length === 0) return 0;
  await removePrivate(rows.map((c) => c.photo_path));
  must(await db.from("consents").update({ photo_path: "" }).in("id", rows.map((c) => c.id)));
  return rows.length;
}
