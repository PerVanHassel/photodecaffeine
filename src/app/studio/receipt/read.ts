// The text of an invoice or receipt, read in the browser: straight out of the
// PDF when it carries text, otherwise by OCR (Tesseract) on the photo or the
// scanned page. Nothing is sent anywhere for this, and the files pdf.js and
// Tesseract need are part of the site itself, not fetched from elsewhere. The
// language data in public/ocr/ is tessdata 4.0.0_best_int, as published in
// @tesseract.js-data/nld and /eng.

// pdf.js's legacy build: the modern one relies on JavaScript only the newest browsers have.
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import ocrWorker from "tesseract.js/dist/worker.min.js?url";
import ocrCoreSimd from "tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url";
import ocrCore from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";

/** How far along the reading is, from 0 to 1. Only OCR takes long enough to report. */
export type Progress = (done: number) => void;

export async function readReceiptText(file: Blob, progress: Progress): Promise<{ text: string; ocr: boolean }> {
  if (file.type !== "application/pdf") return { text: await ocr([file], progress), ocr: true };
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    const text = await pdfText(doc);
    if (text.replace(/\s/g, "").length >= 40) return { text, ocr: false };
    // A scan saved as PDF: no text in it, only pictures of the pages.
    return { text: await ocr(await pdfPages(doc), progress), ocr: true };
  } finally {
    await task.destroy();
  }
}

type Pdf = Awaited<ReturnType<typeof import("pdfjs-dist").getDocument>["promise"]>;

/** The PDF's text, one line per row on the page, left to right. */
async function pdfText(doc: Pdf): Promise<string> {
  const lines: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 5); n++) {
    const page = await doc.getPage(n);
    const rows: { y: number; parts: { x: number; text: string }[] }[] = [];
    for (const item of (await page.getTextContent()).items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = item.transform[4], y = item.transform[5];
      const near = Math.max(2, (item.height || 10) / 2);
      let row = rows.find((r) => Math.abs(r.y - y) < near);
      if (!row) rows.push((row = { y, parts: [] }));
      row.parts.push({ x, text: item.str.trim() });
    }
    // PDF coordinates grow upwards: the top row has the largest y.
    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) lines.push(row.parts.sort((a, b) => a.x - b.x).map((p) => p.text).join("  "));
  }
  return lines.join("\n");
}

/** The first pages as images, sharp enough to OCR. */
async function pdfPages(doc: Pdf): Promise<Blob[]> {
  const out: Blob[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 2); n++) {
    const page = await doc.getPage(n);
    const width = page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale: Math.min(3, 2000 / width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
    if (blob) out.push(blob);
  }
  return out;
}

// The standard check for WebAssembly SIMD (as in wasm-feature-detect): the
// faster Tesseract build needs it, the other runs everywhere.
const SIMD = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

async function ocr(images: Blob[], progress: Progress): Promise<string> {
  const { createWorker, OEM } = await import("tesseract.js");
  progress(0.02);
  let page = 0;
  // Dutch for the words, English for the many invoices written in it. Full
  // addresses, because the worker loads everything from inside a blob: URL.
  // After the first time the languages come from the browser's own cache.
  const worker = await createWorker("nld+eng", OEM.LSTM_ONLY, {
    workerPath: new URL(ocrWorker, location.href).href,
    corePath: new URL(WebAssembly.validate(SIMD) ? ocrCoreSimd : ocrCore, location.href).href,
    langPath: new URL("/ocr", location.href).href,
    cachePath: "ocr-4.0.0_best_int",
    logger: (m) => {
      if (m.status === "loading language traineddata") progress(0.02 + 0.08 * m.progress);
      if (m.status === "recognizing text") progress(0.1 + (0.9 * (page + m.progress)) / images.length);
    },
  });
  try {
    const texts: string[] = [];
    for (; page < images.length; page++) texts.push((await worker.recognize(images[page])).data.text);
    return texts.join("\n");
  } finally {
    await worker.terminate();
  }
}
