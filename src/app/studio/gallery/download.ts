import { downloadZip } from "client-zip";
import { saveFile } from "../portal/data";
import type { GalleryImage } from "../types";

// Saving photos from the client gallery, in the portal and on the group page.

/** Saves a file from a (signed) link under the given name. */
export function saveUrl(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * The photos as shown, in one zip. Files are fetched one after another and
 * streamed into the zip, so a large gallery never has to sit in memory twice.
 */
export async function saveZip(list: GalleryImage[], title: string, opts: { watermarked: boolean; onProgress: (done: number) => void }) {
  let done = 0;
  async function* files() {
    const used = new Set<string>();
    for (const img of list) {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`${img.fileName || "Een foto"} kon niet worden opgehaald.`);
      let name = img.fileName || `foto-${done + 1}.jpg`;
      if (opts.watermarked) name = `${name.replace(/\.\w+$/, "")}-voorbeeld.jpg`;
      while (used.has(name)) name = name.replace(/(\.\w+)?$/, (ext) => `-${done}${ext}`);
      used.add(name);
      yield { name, input: res };
      done += 1;
      opts.onProgress(done);
    }
  }
  const blob = await downloadZip(files()).blob();
  saveFile(`${title.replace(/[^\w-]+/g, "-").toLowerCase()}.zip`, blob, "application/zip");
}
