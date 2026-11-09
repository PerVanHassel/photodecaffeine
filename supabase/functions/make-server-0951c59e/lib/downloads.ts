import { db, must } from "./db.ts";

// Every download from a gallery, so the studio can see who took what and when:
// from the portal (the client), the group link (a guest, free or their own) and
// Mijn foto's (an account). A zip writes a row per photo with the same batch.
// The privacy statement names this; the rows go after 12 months (lib/retention.ts),
// and with the guest when the studio removes them.

export type DownloadRow = {
  project_id: string;
  image_id: string | null;
  guest_id?: string | null;
  client_id?: string | null;
  who: string;
  source: "portal" | "link" | "account";
  version: "original" | "watermark";
};

/** Writes the rows. Never fails the download it is about. */
export async function logDownloads(rows: DownloadRow[], batch: string | null = null): Promise<void> {
  if (rows.length === 0) return;
  try {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, who: String(r.who || "").slice(0, 254), batch }));
      const { error } = await db.from("gallery_downloads").insert(chunk);
      if (error) console.error("download log:", error.message);
    }
  } catch (err) {
    console.error("download log:", err);
  }
}

/** Per photo, how often it was downloaded. */
export async function downloadCounts(projectId: string): Promise<Record<string, number>> {
  const rows = (must(await db.from("gallery_downloads").select("image_id").eq("project_id", projectId).not("image_id", "is", null).limit(20000)) || []) as any[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.image_id] = (out[r.image_id] || 0) + 1;
  return out;
}

/**
 * The latest downloads, a zip as one entry: who, how many photos, which
 * version, from where, and when.
 */
export async function recentDownloads(projectId: string, limit = 80) {
  const rows = (must(await db.from("gallery_downloads")
    .select("id, image_id, guest_id, client_id, who, source, version, batch, created_at")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(3000)) || []) as any[];
  const groups = new Map<string, any>();
  for (const r of rows) {
    const key = r.batch || `one-${r.id}`;
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      if (r.image_id && g.images.length < 12) g.images.push(r.image_id);
      continue;
    }
    if (groups.size >= limit) continue;
    groups.set(key, {
      id: key,
      who: r.who,
      guestId: r.guest_id,
      clientId: r.client_id,
      source: r.source,
      version: r.version,
      count: 1,
      images: r.image_id ? [r.image_id] : [],
      at: r.created_at,
    });
  }
  return [...groups.values()];
}

/** Totals for the gallery's figures: downloads, and by how many different people. */
export async function downloadTotals(projectId: string): Promise<{ downloads: number; people: number }> {
  const rows = (must(await db.from("gallery_downloads").select("guest_id, client_id, who").eq("project_id", projectId).limit(20000)) || []) as any[];
  return { downloads: rows.length, people: new Set(rows.map((r) => r.guest_id || r.client_id || r.who)).size };
}
