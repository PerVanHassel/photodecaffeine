import { useEffect } from "react";
import { isVideoUrl } from "../../../lib/articlePage";
import { smallImage } from "../../../lib/images";
import type { Draft } from "./state";

// Every photo's shape (width / height), so the article can lay photos out in
// their own proportions and a template can give each layout the shapes it
// shows best. The page maker measures what the article does not know yet and
// saves it with the article.

const cache = new Map<string, Promise<number | null>>();

/** A photo's or video's width / height, or null when it does not load. Kept for the visit. */
export function measureShape(url: string): Promise<number | null> {
  let known = cache.get(url);
  if (!known) {
    known = new Promise((resolve) => {
      const done = (w: number, h: number) => resolve(w && h ? Math.round((w / h) * 1e4) / 1e4 : null);
      const timer = window.setTimeout(() => resolve(null), 20000);
      if (isVideoUrl(url)) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => { window.clearTimeout(timer); done(video.videoWidth, video.videoHeight); };
        video.onerror = () => { window.clearTimeout(timer); resolve(null); };
        video.src = url;
      } else {
        // The 1280 px copy has the same shape and loads faster.
        const img = new Image();
        img.onload = () => { window.clearTimeout(timer); done(img.naturalWidth, img.naturalHeight); };
        img.onerror = () => { window.clearTimeout(timer); resolve(null); };
        img.src = smallImage(url);
      }
    });
    cache.set(url, known);
  }
  return known;
}

/** Measures the article's photos that have no shape yet and adds them to the draft, outside the undo history. */
export function useShapes(draft: Draft | null, patch: (fn: (d: Draft) => Draft) => void) {
  const urls = draft ? [...new Set([draft.coverUrl, ...draft.galleryUrls].filter(Boolean))] : [];
  const missing = urls.filter((u) => !draft?.shapes?.[u]).join("\n");
  useEffect(() => {
    if (!missing) return;
    let live = true;
    const list = missing.split("\n");
    Promise.all(list.map(measureShape)).then((found) => {
      const add: Record<string, number> = {};
      list.forEach((u, i) => { if (found[i]) add[u] = found[i]!; });
      if (live && Object.keys(add).length) patch((d) => ({ ...d, shapes: { ...d.shapes, ...add } }));
    });
    return () => { live = false; };
  }, [missing, patch]);
}

/** The draft as it is saved: only the shapes of photos the article still has. */
export function forSaving(d: Draft): Draft {
  const keep = new Set([d.coverUrl, ...d.galleryUrls]);
  const shapes = Object.fromEntries(Object.entries(d.shapes || {}).filter(([u]) => keep.has(u)));
  return { ...d, shapes };
}
