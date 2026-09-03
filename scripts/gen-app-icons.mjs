/**
 * Generates the PWA app icons for the PDC admin app.
 *
 * There is no image library in this project (no sharp/canvas), so the PNGs are
 * written by hand: raw RGBA scanlines -> zlib deflate -> IDAT, with the IHDR /
 * IEND chunks and CRC32s assembled manually. That is a handful of extra lines
 * but it keeps the icons reproducible from source instead of being binary blobs
 * nobody can regenerate.
 *
 * The mark is a camera aperture — copper ring with six blades — on the warm
 * near-black the admin app uses. It sits inside the maskable safe zone (central
 * 80%), so one icon set can serve both `any` and `maskable` purposes.
 *
 *   node scripts/gen-app-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/icons");

// ── PNG encoding ──────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** @param {Uint8Array} rgba - size*size*4 bytes */
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10..12 = compression/filter/interlace, all 0

  // Each scanline is prefixed with filter type 0 (None).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Drawing ───────────────────────────────────────────────────────────────

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const BG_CORE = [22, 12, 5];
const BG_EDGE = [6, 3, 1];
const COPPER_HI = [232, 176, 122];
const COPPER = [200, 144, 90];
const COPPER_LO = [122, 78, 42];

/**
 * Signed distance to a regular hexagon of radius r, rotated by `rot`.
 * Negative inside. Used for the aperture opening.
 */
function hexDist(x, y, r, rot) {
  let d = -Infinity;
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    d = Math.max(d, x * Math.cos(a) + y * Math.sin(a) - r);
  }
  return d;
}

/** Colour of the icon at normalised coords (-1..1), or null for background. */
function markAt(x, y) {
  const dist = Math.hypot(x, y);
  const angle = Math.atan2(y, x);

  const R_OUT = 0.86; // outer edge of the aperture ring
  const R_IN = 0.70; // inner edge of the ring
  const HEX_R = 0.44; // aperture opening

  // Ring — a copper gradient lit from the top-left so it reads as metal.
  if (dist <= R_OUT && dist >= R_IN) {
    const lit = clamp01(0.5 - (Math.cos(angle + Math.PI / 4) * 0.5));
    return { rgb: mix(mix(COPPER_LO, COPPER, clamp01(lit * 1.6)), COPPER_HI, clamp01(lit - 0.45) * 1.8), a: 1 };
  }

  // Blades — six spokes from the opening out to the ring, each a thin wedge.
  // They alternate brightness so the aperture reads as overlapping leaves.
  const hd = hexDist(x, y, HEX_R, Math.PI / 6);
  if (dist < R_IN && hd > 0) {
    const sector = Math.floor(((angle + Math.PI * 2 + Math.PI / 6) % (Math.PI * 2)) / (Math.PI / 3));
    const local = ((angle + Math.PI * 2 + Math.PI / 6) % (Math.PI / 3)) / (Math.PI / 3);
    // Blade edge: a hairline at the start of every sector.
    const edge = local < 0.045 ? 1 : 0;
    if (edge) return { rgb: mix(COPPER, COPPER_HI, 0.35), a: 0.9 };
    const shade = 0.12 + (sector % 2) * 0.07 + local * 0.06;
    return { rgb: mix(BG_CORE, COPPER, shade), a: 1 };
  }

  return null;
}

function renderIcon(size, { fullBleed = true } = {}) {
  const px = new Uint8Array(size * size * 4);
  const SS = 3; // 3x3 supersampling for clean edges
  const markScale = fullBleed ? 0.62 : 0.78; // fraction of the half-size

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = ((x + (sx + 0.5) / SS) / size) * 2 - 1;
          const fy = ((y + (sy + 0.5) / SS) / size) * 2 - 1;

          // Background: warm radial falloff, slightly offset toward top-left.
          const bgT = clamp01(Math.hypot(fx + 0.18, fy + 0.22) / 1.5);
          let col = mix(BG_CORE, BG_EDGE, bgT * bgT);
          let alpha = 1;

          const mark = markAt(fx / markScale, fy / markScale);
          if (mark) {
            col = mix(col, mark.rgb, mark.a);
          }

          r += col[0]; g += col[1]; b += col[2]; a += alpha * 255;
        }
      }

      const n = SS * SS;
      const i = (y * size + x) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = Math.round(a / n);
    }
  }

  return encodePng(px, size);
}

// ── Emit ──────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

for (const size of [180, 192, 512, 1024]) {
  writeFileSync(resolve(OUT_DIR, `icon-${size}.png`), renderIcon(size));
  console.log(`wrote icons/icon-${size}.png`);
}

console.log("done");
