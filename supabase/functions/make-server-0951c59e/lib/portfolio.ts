import * as kv from "../kv_store.tsx";

/** The 1280 px copy stored beside every "-2560.jpg" site photo; other URLs stay as they are. */
export const smallCopy = (url: string) => url.replace(/-2560\.jpg$/, "-1280.jpg");

/**
 * Every portfolio article as stored, newest first. One query for the lot:
 * fetching them one by one cost a round trip per article and made the
 * portfolio the slowest call the site makes.
 */
export async function loadArticles(): Promise<any[]> {
  const idsStr = await kv.get("portfolio:articleIds");
  const ids: string[] = idsStr ? JSON.parse(idsStr) : [];
  if (!ids.length) return [];
  const values = await kv.mget(ids.map((id) => `portfolio:article:${id}`));
  return values
    .filter(Boolean)
    .map((v) => JSON.parse(v as string))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
