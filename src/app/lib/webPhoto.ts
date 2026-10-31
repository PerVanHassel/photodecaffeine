// Photos for the site are stored as a pair: a large copy named "-2560.jpg" and
// the same photo 1280 px wide as "-1280.jpg" (see images.ts). The browser makes
// both before uploading, so a 20 MB camera file never reaches the site and the
// upload itself is a fraction of the size.

const LARGE = 2560;
const SMALL = 1280;
const QUALITY = 0.85;

// Formats a browser can usually open. Safari also reads HEIC, which then
// arrives as an ordinary JPEG. PNG and GIF go up as they are: they may be
// graphics with transparency or animation.
const PHOTO = /^image\/(jpeg|webp|heic|heif)$/;

/**
 * The two web copies of a photo, or null when the file should go up as it is:
 * not a photo, already small, or a format this browser cannot open. The large
 * copy is 2560 px wide, or the photo's own width when that is less.
 */
export async function webCopies(file: File): Promise<{ large: File; small: File } | null> {
  if (!PHOTO.test(file.type)) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.naturalWidth <= SMALL) return null;

    const large = scaled(img, img.naturalWidth, img.naturalHeight, Math.min(LARGE, img.naturalWidth));
    const small = scaled(large, large.width, large.height, SMALL);
    const [largeJpeg, smallJpeg] = await Promise.all([jpeg(large), jpeg(small)]);
    release(large, small);
    if (!largeJpeg || !smallJpeg) return null;

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return {
      large: new File([largeJpeg], `${base}-${LARGE}.jpg`, { type: "image/jpeg" }),
      small: new File([smallJpeg], `${base}-${SMALL}.jpg`, { type: "image/jpeg" }),
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A photo as a JPEG of at most 1280 px wide, or null when this browser cannot
 * open it. Drawing it anew also leaves out what the file says about the phone
 * and the place it was taken.
 */
export async function smallJpeg(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const copy = scaled(img, img.naturalWidth, img.naturalHeight, Math.min(SMALL, img.naturalWidth));
    const blob = await jpeg(copy);
    release(copy);
    return blob && new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The image drawn `width` px wide. It is halved step by step first, because a
 * browser that shrinks a camera file in one go can leave jagged edges.
 */
function scaled(source: HTMLImageElement | HTMLCanvasElement, w: number, h: number, width: number): HTMLCanvasElement {
  const height = Math.round((h * width) / w);
  let current = source;
  while (w / 2 >= width) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const next = draw(current, w, h);
    if (current !== source) release(current as HTMLCanvasElement);
    current = next;
  }
  if (current !== source && w === width) return current as HTMLCanvasElement;
  const out = draw(current, width, height);
  if (current !== source) release(current as HTMLCanvasElement);
  return out;
}

function draw(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

const jpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));

// Safari keeps canvas memory until the size is set to zero, and a few large
// photos in a row can otherwise run it out.
function release(...canvases: HTMLCanvasElement[]) {
  for (const c of canvases) c.width = c.height = 0;
}
