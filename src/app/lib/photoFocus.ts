import { visibleArticles, type PortfolioArticle } from "./siteData";

// The photography niche chosen in the admin (Instellingen → Fotografie). It is
// a portfolio category; the photography page leads with that category's photos.

const isVideo = (url: string) => /\.(mp4|mov|m4v|webm)$/i.test(url.split("?")[0]);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The photo a URL shows, whichever upload or size it is: uploads are named
 * "<timestamp>-<file>" and published copies "<file>-2560.jpg", and the same
 * photo is sometimes in a gallery twice under different timestamps.
 */
const photoKey = (url: string) =>
  (url.split("?")[0].split("/").pop() || url)
    .toLowerCase()
    .replace(/^\d+-/, "")
    .replace(/-(1280|2560)(\.\w+)$/, "$2")
    .replace(/\.\w+$/, "");

export interface FocusPhoto {
  url: string;
  article: PortfolioArticle;
}

/**
 * Up to `limit` photos for the niche: every matching article's cover first,
 * then their other photos in turn, highlighted and newest articles first.
 * Without a niche, or when nothing matches it, the photos come from the whole
 * portfolio and `focused` is false.
 */
export function focusPhotos(articles: PortfolioArticle[] | undefined, focus: string | undefined, limit: number) {
  const pool = visibleArticles(articles) ?? [];
  const inFocus = focus?.trim() ? pool.filter((a) => same(a.category || "", focus)) : [];
  const source = (inFocus.length ? inFocus : pool)
    .slice()
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.createdAt || "").localeCompare(a.createdAt || ""));

  const photos: FocusPhoto[] = [];
  const seen = new Set<string>();
  const add = (url: string | undefined, article: PortfolioArticle) => {
    if (!url || isVideo(url) || seen.has(photoKey(url)) || photos.length >= limit) return;
    seen.add(photoKey(url));
    photos.push({ url, article });
  };
  source.forEach((a) => a.coverType === "image" && add(a.coverUrl, a));
  const longest = Math.max(0, ...source.map((a) => a.galleryUrls?.length ?? 0));
  for (let i = 0; i < longest && photos.length < limit; i++) source.forEach((a) => add(a.galleryUrls[i], a));

  return { photos, focused: inFocus.length > 0 };
}

/** The niche's own option first, when it is one of them. */
export function focusFirst(options: string[], focus: string | undefined) {
  const hit = focus?.trim() ? options.find((o) => same(o, focus)) : undefined;
  return hit ? [hit, ...options.filter((o) => o !== hit)] : options;
}
