/**
 * Marks an image as the page's largest paint so the browser fetches it first.
 * React 18 does not know the camelCase prop yet, so the plain attribute is
 * passed through.
 */
export const HIGH_PRIORITY = { fetchpriority: "high" } as {};

// Site photos are stored as "<name>-2560.jpg", at most 2560 px wide, with the
// same photo 1280 px wide beside it as "<name>-1280.jpg". Uploads through the
// admin (webPhoto.ts) and publish_web_images.py both store that pair. Other
// photos have only their own size.
const WIDE = /-2560\.jpg$/;

/** Both sizes for a srcset, when the photo has them. */
export function webSrcSet(url: string) {
  return WIDE.test(url) ? `${url.replace(WIDE, "-1280.jpg")} 1280w, ${url} 2560w` : undefined;
}

/** The 1280 px copy, plenty for a thumbnail. Other URLs as they are. */
export function smallImage(url: string) {
  return url.replace(WIDE, "-1280.jpg");
}
