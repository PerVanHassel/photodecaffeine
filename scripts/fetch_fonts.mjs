// Fetches the site's web fonts once, into public/fonts, so visitors get them from
// our own address. Loading them from Google or Fontshare sends every visitor's IP
// address there; the privacy statement says that does not happen.
//
// Run by hand when a font is added (node scripts/fetch_fonts.mjs) and commit the
// result. One stylesheet per entry, loaded only where that font is used:
//   /fonts/site.css               Inter and Space Grotesk, every public page
//   /fonts/geist.css              the admin and the portal
//   /fonts/schibsted-grotesk.css  a quote
//   /fonts/<name>.css             a gallery style or an article's typeface
// Adobe Fonts stay on Adobe's servers: their licence does not allow anything else,
// which is why the cookie policy names them.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(rootDir, "public", "fonts");
const filesDir = path.join(outDir, "files");

const GOOGLE = {
  site: "family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700",
  geist: "family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500",
  "schibsted-grotesk": "family=Schibsted+Grotesk:wght@400;500;600;700",
  fraunces: "family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;1,9..144,300..600,0..100",
  "instrument-serif": "family=Instrument+Serif:ital@0;1",
  archivo: "family=Archivo:ital,wdth,wght@1,62..100,600..900",
};

// A current browser: Google picks the file format by who is asking.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

async function text(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function keep(url) {
  const name = `${createHash("sha1").update(url).digest("hex").slice(0, 16)}.woff2`;
  const file = path.join(filesDir, name);
  if (!existsSync(file)) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return `/fonts/files/${name}`;
}

/** Every @font-face of a stylesheet, reduced to one woff2 on our own address. */
async function localise(css, wanted = () => true) {
  const out = [];
  const blocks = css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g);
  for (const [, subset, body] of blocks) {
    if (!wanted(subset)) continue;
    const url = body.match(/url\(['"]?([^'")]+\.woff2)['"]?\)/)?.[1];
    if (!url) continue;
    const local = await keep(url.startsWith("//") ? `https:${url}` : url);
    const rest = body.replace(/src:[^;]+;?/, "").trim().replace(/\s*\n\s*/g, " ");
    out.push(`@font-face { ${rest} src: url(${local}) format("woff2"); }`);
  }
  return out.join("\n") + "\n";
}

async function main() {
  await mkdir(filesDir, { recursive: true });
  for (const [name, query] of Object.entries(GOOGLE)) {
    const css = await text(`https://fonts.googleapis.com/css2?${query}&display=swap`);
    // Dutch and English need nothing beyond these two; Cyrillic and the rest would only weigh.
    await writeFile(path.join(outDir, `${name}.css`), await localise(css, (s) => s === "latin" || s === "latin-ext"));
    console.log(name);
  }
  // The article typefaces, as listed for the page maker.
  const faces = await readFile(path.join(rootDir, "src", "app", "lib", "typefaces.ts"), "utf-8");
  for (const [, key, spec] of faces.matchAll(/face\("([a-z-]+)", "[^"]+", "\w+", "[^"]*", "([^"]+)"/g)) {
    const css = await text(`https://api.fontshare.com/v2/css?f[]=${spec}&display=swap`);
    await writeFile(path.join(outDir, `${key}.css`), await localise(css));
    console.log(key);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
