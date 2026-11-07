import { downloadZip } from "client-zip";
import { toast } from "sonner";
import { saveFile } from "../portal/data";
import type { GalleryImage } from "../types";

// Saving photos from the client gallery, in the portal and on the group page.
// On an iPhone or iPad a plain download lands in Files, not in Photos. There the
// photos go through the share sheet, whose "Save Image" puts them in Photos.

/** The texts for the second tap, when the browser wants a fresh one before it opens the share sheet. */
export interface PhotosText { ready: (n: number) => string; save: (n: number) => string }

/** At most this many photos go to Photos in one go; more than that becomes a zip, to spare the phone's memory. */
const PHOTOS_MAX = 30;

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", gif: "image/gif",
  mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v",
};

/** iPhone and iPad, iPadOS included (it calls itself a Mac with a touch screen). */
function savesToPhotos() {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Saves a file from a (signed) link under the given name. */
export function saveUrl(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function asFile(url: string, name: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name || "Een foto"} kon niet worden opgehaald.`);
  const blob = await res.blob();
  // Photos only offers "Save Image" for a file it knows is a picture or a video.
  const type = blob.type && blob.type !== "application/octet-stream" ? blob.type : TYPES[name.split(".").pop()?.toLowerCase() || ""] || "image/jpeg";
  return new File([blob], name, { type });
}

/** Opens the share sheet. False when the tap was too long ago for the browser to allow it; closing the sheet counts as done. */
async function share(files: File[]) {
  try {
    await navigator.share({ files });
    return true;
  } catch (err) {
    const name = (err as Error).name;
    if (name === "AbortError") return true;
    if (name === "NotAllowedError") return false;
    throw err;
  }
}

/** The photos are fetched; one more tap opens the share sheet. */
async function toPhotos(files: File[], text: PhotosText) {
  if (await share(files)) return;
  toast(text.ready(files.length), {
    duration: 20000,
    action: { label: text.save(files.length), onClick: () => { share(files).catch((err) => toast.error((err as Error).message)); } },
  });
}

/** One photo: into Photos on an iPhone, a download everywhere else. */
export async function savePhoto(url: string, fileName: string, text: PhotosText) {
  if (!savesToPhotos()) return saveUrl(url, fileName);
  const file = await asFile(url, fileName);
  if (!navigator.canShare({ files: [file] })) return saveUrl(url, fileName);
  await toPhotos([file], text);
}

/** The name a photo gets once it leaves the gallery. */
function nameOf(img: GalleryImage, n: number, watermarked: boolean) {
  let name = img.fileName || `foto-${n}.jpg`;
  // A photo that may not be posted says so in its name, also once it has left the gallery.
  if (img.restriction === "no_social") name = name.replace(/(\.\w+)?$/, (ext) => `-niet-op-social-media${ext}`);
  if (watermarked) name = `${name.replace(/\.\w+$/, "")}-voorbeeld.jpg`;
  return name;
}

/**
 * The photos as shown. On an iPhone, up to PHOTOS_MAX of them go to Photos;
 * otherwise they come in one zip. Files are fetched one after another and
 * streamed into the zip, so a large gallery never has to sit in memory twice.
 * Says which of the two it did.
 */
export async function saveZip(list: GalleryImage[], title: string, opts: { watermarked: boolean; onProgress: (done: number) => void; text: PhotosText }): Promise<"zip" | "photos"> {
  let done = 0;
  const makeUnique = () => {
    const used = new Set<string>();
    return (name: string) => {
      while (used.has(name)) name = name.replace(/(\.\w+)?$/, (ext) => `-${done}${ext}`);
      used.add(name);
      return name;
    };
  };
  let unique = makeUnique();

  if (savesToPhotos() && list.length <= PHOTOS_MAX) {
    const files: File[] = [];
    for (const img of list) {
      files.push(await asFile(img.url, unique(nameOf(img, done + 1, opts.watermarked))));
      done += 1;
      opts.onProgress(done);
    }
    if (navigator.canShare({ files })) {
      await toPhotos(files, opts.text);
      return "photos";
    }
    done = 0;
    unique = makeUnique();
  }

  async function* files() {
    for (const img of list) {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`${img.fileName || "Een foto"} kon niet worden opgehaald.`);
      yield { name: unique(nameOf(img, done + 1, opts.watermarked)), input: res };
      done += 1;
      opts.onProgress(done);
    }
  }
  const blob = await downloadZip(files()).blob();
  saveFile(`${title.replace(/[^\w-]+/g, "-").toLowerCase()}.zip`, blob, "application/zip");
  return "zip";
}
