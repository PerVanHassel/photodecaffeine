// Fills in the two SEO details that depend on live data, after the pages have
// been prerendered.
//
//  * sitemap.xml — the five marketing routes are fixed, but the portfolio
//    articles are not: they are the site's actual content and they change.
//    They are read from the public API and written out with their own lastmod.
//  * og:image — the share picture follows the hero photo chosen in the admin,
//    so a new hero does not leave the old one on every share.
//
// Both are best-effort. The site is built on Vercel and the API may be slow or
// down; if anything fails this leaves the committed sitemap and the hero URL
// already in index.html in place and exits cleanly. A build must not fail over
// a share image.
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");
const SITE = "https://www.photodecaffeine.com";
const TIMEOUT_MS = 15000;

const STATIC_ROUTES = [
  { loc: "/", changefreq: "monthly", priority: "1.0" },
  { loc: "/portfolio", changefreq: "weekly", priority: "0.9" },
  { loc: "/services/automotive", changefreq: "monthly", priority: "0.9" },
  { loc: "/services/social-media", changefreq: "monthly", priority: "0.9" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
];

async function credentials() {
  const src = await readFile(path.join(rootDir, "utils", "supabase", "info.tsx"), "utf-8");
  const pick = (name) => src.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`))?.[1];
  const projectId = pick("projectId");
  const publicAnonKey = pick("publicAnonKey");
  if (!projectId || !publicAnonKey) throw new Error("geen project-gegevens gevonden");
  return { projectId, publicAnonKey };
}

async function api(endpointPath) {
  const { projectId, publicAnonKey } = await credentials();
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e${endpointPath}`,
    {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (!res.ok) throw new Error(`${endpointPath} -> ${res.status}`);
  return res.json();
}

const xmlEscape = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c])
  );

/** An ISO timestamp as the plain date sitemaps want, or nothing. */
function lastmod(value) {
  const d = new Date(value || "");
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function buildSitemap(articles) {
  const newest = articles
    .map((a) => lastmod(a.updatedAt || a.createdAt))
    .filter(Boolean)
    .sort()
    .pop();

  const urls = STATIC_ROUTES.map((r) => {
    // The portfolio index is only as fresh as the newest thing on it.
    const when = r.loc === "/portfolio" ? newest : "";
    return [
      "  <url>",
      `    <loc>${SITE}${r.loc}</loc>`,
      when ? `    <lastmod>${when}</lastmod>` : "",
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority}</priority>`,
      "  </url>",
    ].filter(Boolean).join("\n");
  });

  for (const a of articles) {
    const when = lastmod(a.updatedAt || a.createdAt);
    urls.push([
      "  <url>",
      `    <loc>${SITE}/portfolio/${xmlEscape(a.id)}</loc>`,
      when ? `    <lastmod>${when}</lastmod>` : "",
      "    <changefreq>monthly</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
    ].filter(Boolean).join("\n"));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

/** Point the share tags and the structured data at the hero set in the admin. */
async function applyShareImage(heroUrl) {
  const files = await htmlFiles(distDir);
  let touched = 0;
  for (const file of files) {
    const html = await readFile(file, "utf-8");
    // Only the fallback tags from index.html; a page that sets its own
    // og:image through Helmet (a portfolio article) keeps its own picture.
    const replaceable = (url) =>
      url.includes("/storage/v1/object/public/") || url.endsWith("og-image.jpg");

    const next = html
      .replace(
        /(<meta[^>]*(?:property="og:image"|name="twitter:image")[^>]*content=")([^"]*)(")/g,
        (all, before, current, after) =>
          replaceable(current) ? `${before}${heroUrl}${after}` : all
      )
      // The LocalBusiness block carries the same picture.
      .replace(
        /("image":\s*")([^"]*)(")/g,
        (all, before, current, after) =>
          replaceable(current) ? `${before}${heroUrl}${after}` : all
      );
    if (next !== html) {
      await writeFile(file, next, "utf-8");
      touched++;
    }
  }
  return touched;
}

async function main() {
  try {
    const [{ articles = [] }, settings] = await Promise.all([
      api("/portfolio"),
      api("/settings").catch(() => null),
    ]);

    await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(articles), "utf-8");
    console.log(`sitemap: ${STATIC_ROUTES.length} pagina's + ${articles.length} portfolio-items`);

    const hero = settings?.settings?.heroImageUrl || settings?.heroImageUrl;
    if (hero) {
      const touched = await applyShareImage(hero);
      console.log(`og:image -> hero uit de admin (${touched} bestanden)`);
    } else {
      console.log("og:image: geen hero in de instellingen, index.html blijft staan");
    }
  } catch (err) {
    console.warn(`seo: overgeslagen (${err.message}) — de meegeleverde sitemap blijft staan`);
  }
}

export { buildSitemap, applyShareImage, lastmod };

// Only run when this is the script being executed, so the helpers above can be
// exercised on their own.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
