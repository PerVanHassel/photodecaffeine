import { db } from "./db.ts";
import { fail } from "./http.ts";
import { sanitizeFileName } from "./util.ts";

export const PRIVATE_BUCKET = "studio-private-0951c59e";

// Long enough to browse a gallery and download from it in one sitting; short
// enough that a forwarded link stops working the same day.
const SIGNED_URL_SECONDS = 60 * 60 * 12;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/tiff"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];

/** Stores one file under folder/ in the private bucket and returns its path. */
export async function uploadPrivate(folder: string, file: File, opts: { allowVideo?: boolean } = {}): Promise<string> {
  const allowed = opts.allowVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES;
  if (!allowed.includes(file.type)) fail(400, `${file.name}: dit bestandstype wordt niet ondersteund.`);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFileName(file.name)}`;
  const { error } = await db.storage.from(PRIVATE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("upload failed:", path, error.message);
    fail(500, `${file.name} kon niet worden geüpload.`);
  }
  return path;
}

export async function removePrivate(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (list.length === 0) return;
  const { error } = await db.storage.from(PRIVATE_BUCKET).remove(list);
  if (error) console.error("remove failed:", error.message);
}

/**
 * Signed URLs for a batch of private paths, keyed by path. With `download`
 * set, the URL makes the browser save the file under that name instead of
 * opening it.
 */
export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  const { data, error } = await db.storage.from(PRIVATE_BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) {
    console.error("sign failed:", error.message);
    return out;
  }
  for (const item of data || []) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  }
  return out;
}

export async function signDownload(path: string, fileName: string): Promise<string> {
  const { data, error } = await db.storage.from(PRIVATE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS, {
    download: fileName || true,
  });
  if (error || !data?.signedUrl) fail(500, "De downloadlink kon niet worden gemaakt.");
  return data.signedUrl;
}

/**
 * A stable key for a gallery image URL, so a URL that comes back from a client
 * matches the stored row: public URLs are their own key, signed URLs change
 * token every time and are keyed by their storage path.
 */
export function imageKey(url: string): string {
  const bare = String(url || "").split("?")[0];
  const marker = `/object/sign/${PRIVATE_BUCKET}/`;
  const at = bare.indexOf(marker);
  return at >= 0 ? decodeURIComponent(bare.slice(at + marker.length)) : bare;
}
