import { SITE_URL } from "./config.ts";
import { db, must } from "./db.ts";

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

export type ShareRow = { project_id: string; token: string; active: boolean; downloads: boolean; consent_required: boolean; created_at: string; updated_at: string };

export async function shareFor(projectId: string): Promise<ShareRow | null> {
  return must(await db.from("gallery_shares").select("*").eq("project_id", projectId).maybeSingle()) as ShareRow | null;
}

/** Hearts from a project's guests, per photo and per guest. */
export async function guestHearts(projectId: string): Promise<{ images: Record<string, number>; guests: Record<string, number> }> {
  const data = must(await db.rpc("gallery_guest_heart_counts", { p_project: projectId })) as any;
  return { images: data?.images || {}, guests: data?.guests || {} };
}

/** How many people came in through the project's group link. */
export async function guestCount(projectId: string): Promise<number> {
  const res = await db.from("gallery_guests").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  must(res);
  return res.count || 0;
}
