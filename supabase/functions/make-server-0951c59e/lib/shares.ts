import * as kv from "../kv_store.tsx";
import { EMAIL_ADMIN_NOTIFY, SITE_URL } from "./config.ts";
import { db, must } from "./db.ts";
import { sendEmailBatch } from "./email.ts";
import { guestNewPhotosEmail } from "./projectEmails.ts";

// Group links: one link per project gallery that goes round a group (a team,
// a class, the guests at a wedding). Guests leave a name and an e-mail address
// before they see the photos. routes/share.ts is their side; the studio's is
// in routes/projects.ts and the client copies the link in the portal.

/** Someone who comes back after this long away makes a new visit. */
export const VISIT_GAP_MS = 30 * 60 * 1000;

// No 0/O/o or 1/l/I, so a link read out or typed over stays right.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const BYTE_LIMIT = 256 - (256 % ALPHABET.length);

/** 16 random characters, about 93 bits: short enough for a chat message. */
export function shareToken(length = 16): string {
  let out = "";
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      // Bytes past the last whole multiple of the alphabet would favour its first letters.
      if (b < BYTE_LIMIT && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

export const shareUrl = (token: string) => `${SITE_URL}/galerij/${token}`;

export type ShareRow = {
  project_id: string; token: string; active: boolean; downloads: boolean; consent_required: boolean;
  priority: boolean; priority_price: number | string; priority_days: number; created_at: string; updated_at: string;
};

export async function shareFor(projectId: string): Promise<ShareRow | null> {
  return must(await db.from("gallery_shares").select("*").eq("project_id", projectId).maybeSingle()) as ShareRow | null;
}

/** Hearts from a project's guests, per photo and per guest. */
export async function guestHearts(projectId: string): Promise<{ images: Record<string, number>; guests: Record<string, number> }> {
  const data = must(await db.rpc("gallery_guest_heart_counts", { p_project: projectId })) as any;
  return { images: data?.images || {}, guests: data?.guests || {} };
}

// Guests who asked for a mail when new photos arrive: one kv row per guest,
// guest-mails:<project>:<guest>, holding the language they read the gallery in.
const parse = (raw: unknown) => (typeof raw === "string" ? JSON.parse(raw) : raw ?? null);
const mailKey = (projectId: string, guestId: string) => `guest-mails:${projectId}:${guestId}`;

export const wantsPhotoMails = async (projectId: string, guestId: string) => Boolean(await kv.get(mailKey(projectId, guestId)));

export async function setPhotoMails(projectId: string, guestId: string, on: boolean, language: "nl" | "en" = "nl") {
  if (on) await kv.set(mailKey(projectId, guestId), JSON.stringify({ guestId, language }));
  else await kv.del(mailKey(projectId, guestId));
}

/** Per guest who asked: the language of their mail. */
export async function photoMailGuests(projectId: string): Promise<Map<string, "nl" | "en">> {
  const rows = (await kv.getByPrefix(`guest-mails:${projectId}:`)).map(parse);
  return new Map(rows.map((r: any) => [r.guestId, r.language]));
}

/** The project is going: nobody is left to mail. */
export async function forgetPhotoMails(projectId: string) {
  for (const guestId of (await photoMailGuests(projectId)).keys()) await kv.del(mailKey(projectId, guestId));
}

/**
 * New photos, for the guests who asked to hear about them. Only while the link
 * works. Their key in the link lets them stop these mails without coming in,
 * also after the studio made a new link. Returns how many mails went out.
 */
export async function mailGuestsNewPhotos(project: { id: string; title: string; gallery_settings?: any }, added: number): Promise<number> {
  const share = await shareFor(project.id);
  if (!share?.active) return 0;
  const wanted = await photoMailGuests(project.id);
  if (wanted.size === 0) return 0;
  const rows = (must(await db.from("gallery_guests").select("id, key, name, email").eq("project_id", project.id)) || []) as any[];
  const guests = rows.filter((g) => wanted.has(g.id));
  const title = project.gallery_settings?.title || project.title;
  const link = shareUrl(share.token);
  return sendEmailBatch(guests.map((g) => {
    const language = wanted.get(g.id) || "nl";
    return {
      to: g.email,
      replyTo: EMAIL_ADMIN_NOTIFY,
      subject: language === "en"
        ? `${added === 1 ? "1 new photo" : `${added} new photos`} in ${title}`
        : `${added === 1 ? "1 nieuwe foto" : `${added} nieuwe foto's`} bij ${title}`,
      html: guestNewPhotosEmail({ language, name: g.name, title, added, link, offLink: `${link}?afmelden=${g.key}` }),
    };
  }));
}

/** How many people came in through the project's group link. */
export async function guestCount(projectId: string): Promise<number> {
  const res = await db.from("gallery_guests").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  must(res);
  return res.count || 0;
}
