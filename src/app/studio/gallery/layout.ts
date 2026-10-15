// Layouts for the client gallery. Every one works from the photos' shapes
// (width / height), so portraits, landscapes and panoramas all show whole
// and in proportion instead of being cropped to one size.

export const DEFAULT_RATIO = 3 / 2;

export interface Row {
  items: number[];
  height: number;
  /** Fills the width; otherwise shown at `height` and centred. */
  full: boolean;
  last?: boolean;
}

/**
 * Justified rows: photos side by side at one height per row, each row exactly
 * as wide as the container. A row is closed where its height lands nearest the
 * target; rows that would get too tall (two portraits on a wide screen) are
 * capped instead of stretched. The target may change per row, for a rhythm of
 * tall and low rows.
 */
export function justify(ratios: number[], width: number, target: number | ((row: number) => number), gap: number, maxH?: number): Row[] {
  const rows: Row[] = [];
  const targetOf = typeof target === "number" ? () => target : target;
  const heightOf = (count: number, sum: number) => (width - gap * (count - 1)) / sum;
  const close = (items: number[], sum: number) => {
    const h = heightOf(items.length, sum);
    const cap = maxH ?? targetOf(rows.length) * 1.45;
    rows.push(h > cap ? { items, height: cap, full: false } : { items, height: h, full: true });
  };
  let row: number[] = [];
  let sum = 0;
  for (let i = 0; i < ratios.length; i++) {
    const r = ratios[i];
    const t = targetOf(rows.length);
    row.push(i);
    sum += r;
    const h = heightOf(row.length, sum);
    if (h > t) continue;
    if (row.length > 1) {
      const before = heightOf(row.length - 1, sum - r);
      if (Math.abs(Math.log(before / t)) < Math.abs(Math.log(h / t))) {
        close(row.slice(0, -1), sum - r);
        row = [i];
        sum = r;
        if (heightOf(1, r) <= targetOf(rows.length)) {
          close(row, r);
          row = [];
          sum = 0;
        }
        continue;
      }
    }
    close(row, sum);
    row = [];
    sum = 0;
  }
  if (row.length) {
    const t = targetOf(rows.length);
    const h = heightOf(row.length, sum);
    rows.push({ items: row, height: Math.min(h, t), full: h <= t, last: true });
  }
  return rows;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Positions for justified rows; capped rows are centred, the last row starts left. */
export function rowBoxes(rows: Row[], ratios: number[], width: number, gap: number): { boxes: Box[]; height: number } {
  const boxes: Box[] = new Array(ratios.length);
  let top = 0;
  for (const row of rows) {
    const used = row.items.reduce((s, i) => s + ratios[i] * row.height, 0) + gap * (row.items.length - 1);
    let left = row.full || row.last ? 0 : (width - used) / 2;
    for (const i of row.items) {
      const w = ratios[i] * row.height;
      boxes[i] = { left, top, width: w, height: row.height };
      left += w + gap;
    }
    top += row.height + gap;
  }
  return { boxes, height: Math.max(0, top - gap) };
}

/** Columns filled shortest-first, so the bottom edge stays even. Order still reads left to right, top to bottom. */
export function masonry(ratios: number[], width: number, cols: number, gap: number): { boxes: Box[]; height: number } {
  const colW = (width - gap * (cols - 1)) / cols;
  const heights = new Array(cols).fill(0);
  const boxes = ratios.map((ratio) => {
    const r = Math.min(2.2, Math.max(0.5, ratio));
    let c = 0;
    for (let k = 1; k < cols; k++) if (heights[k] < heights[c] - 1) c = k;
    const box = { left: c * (colW + gap), top: heights[c], width: colW, height: colW / r };
    heights[c] += box.height + gap;
    return box;
  });
  return { boxes, height: Math.max(0, ...heights.map((h) => h - gap)) };
}

export type Block =
  | { kind: "full"; items: [number] }
  | { kind: "row"; items: number[] }
  | { kind: "aside"; items: [number]; side: "start" | "end" };

const RHYTHM = ["full", "pair", "aside", "trio", "pair", "aside"] as const;

/**
 * A magazine spread: one photo across the page, then a pair, then one beside
 * its number, then three in a row, and so on. Panoramas always get the full
 * width; a portrait never does (it gets a page beside its caption instead).
 */
export function story(ratios: number[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  let step = 0;
  let side = 0;
  const aside = (n: number): Block => ({ kind: "aside", items: [n], side: side++ % 2 ? "end" : "start" });
  while (i < ratios.length) {
    if (ratios[i] >= 2) {
      blocks.push({ kind: "full", items: [i++] });
      continue;
    }
    const kind = RHYTHM[step++ % RHYTHM.length];
    if (kind === "full") {
      blocks.push(ratios[i] >= 1.2 ? { kind: "full", items: [i++] } : aside(i++));
      continue;
    }
    if (kind === "aside") {
      blocks.push(aside(i++));
      continue;
    }
    const items: number[] = [];
    const want = kind === "pair" ? 2 : 3;
    while (items.length < want && i < ratios.length && ratios[i] < 2) items.push(i++);
    blocks.push(items.length === 1 ? aside(items[0]) : { kind: "row", items });
  }
  return blocks;
}
