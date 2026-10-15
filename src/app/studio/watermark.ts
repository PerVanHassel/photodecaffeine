// Watermarked copies of gallery photos, made in the admin's browser: the edge
// function has too little CPU to decode full-size photos itself.

const LONG_EDGE = 2000;
const MARK = "PHOTODECAFFEINE";

/** A JPEG of at most 2000px with the studio name across it, or null when the browser can't read the file. */
export async function watermark(source: Blob, name: string): Promise<File | null> {
  return (await prepareUpload(source, name)).preview;
}

/**
 * For an upload: the watermarked copy (photos only) and the pixel size as
 * shown, rotation included, from a single decode. 0 × 0 when unreadable.
 */
export async function prepareUpload(source: Blob, name: string): Promise<{ preview: File | null; w: number; h: number }> {
  if (source.type.startsWith("video/")) return { preview: null, ...(await videoSize(source)) };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return { preview: null, w: 0, h: 0 }; // HEIC and TIFF outside Safari, for instance
  }
  const dims = { w: bitmap.width, h: bitmap.height };
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const font = `600 ${Math.round(Math.max(w, h) / 24)}px "Geist", "Helvetica Neue", Arial, sans-serif`;
  await document.fonts?.load(font).catch(() => undefined);

  // Diagonal rows across the whole frame, every other row shifted, so no
  // part of the photo can be cropped out clean.
  const size = Math.round(Math.max(w, h) / 24);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, size / 14);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
  const step = ctx.measureText(MARK).width + size * 2;
  const reach = Math.hypot(w, h) / 2 + step;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  for (let row = 0, y = -reach; y < reach; row++, y += size * 3.5) {
    for (let x = -reach + (row % 2) * (step / 2); x < reach; x += step) {
      ctx.strokeText(MARK, x, y);
      ctx.fillText(MARK, x, y);
    }
  }

  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
  if (!blob) return { preview: null, ...dims };
  return { preview: new File([blob], `${name.replace(/\.\w+$/, "") || "foto"}.jpg`, { type: "image/jpeg" }), ...dims };
}

function videoSize(file: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (w = 0, h = 0) => {
      URL.revokeObjectURL(url);
      resolve({ w, h });
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(video.videoWidth, video.videoHeight);
    video.onerror = () => done();
    video.src = url;
  });
}
