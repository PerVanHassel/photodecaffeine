// Prerenders the public pages to static HTML using the SSR bundle built by
// `npm run build:ssr`, then writes them into dist/ alongside the client build.
//
// This replaces react-snap (which crawled the site with a bundled, ancient
// Chromium via puppeteer — a binary that can't launch on Vercel's build image
// because it's missing system shared libraries). Rendering with
// react-dom/server instead needs no browser at all, so it can't hit that
// problem.
//
// What ends up in dist/:
//   index.html, about/, portfolio/, services/…   the marketing pages
//   portfolio/<id>/index.html                    one page per published article
//   404.html                                     served by Vercel for unknown URLs
//   app-shell.html                               the empty shell for the admin,
//                                                portal and other client-only
//                                                routes (see vercel.json)
//
// The pages are rendered with the site's content (settings, portfolio,
// reviews) fetched here, and that same data is written into each page as
// window.__PDC_DATA__, so the browser's first render matches the HTML.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "./seo.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");
const ssrEntry = path.join(rootDir, "dist-ssr", "entry-server.js");

const AUTOMOTIVE_GALLERY_TITLE = "__automotive_gallery__";
const NOT_FOUND = "/__not-found__";

/** Which parts of the site data each page renders with. */
const PAGES = [
  { route: "/", data: ["settings", "articles", "reviews"] },
  { route: "/portfolio", data: ["articles"] },
  { route: "/about", data: [] },
  { route: "/services/automotive", data: ["articles"] },
  { route: "/services/social-media", data: [] },
];

function outputPathFor(route) {
  if (route === "/") return path.join(distDir, "index.html");
  if (route === NOT_FOUND) return path.join(distDir, "404.html");
  return path.join(distDir, route.replace(/^\//, ""), "index.html");
}

// Base index.html carries fallback SEO tags (for the client-side SPA shell
// before Helmet mounts, and as a safety net for routes with no Helmet block).
// A page whose Helmet sets its own version of a tag gets the base one removed
// first — otherwise both copies land in <head> and crawlers read the first
// (generic) <title>/<meta>, silently shadowing the per-page one.
const BASE_TAGS = [
  [/<title>[\s\S]*?<\/title>\s*/, /<title/],
  [/<meta\s+name="description"[^>]*>\s*/, /name="description"/],
  [/<meta\s+property="og:title"[^>]*>\s*/, /property="og:title"/],
  [/<meta\s+property="og:description"[^>]*>\s*/, /property="og:description"/],
  [/<meta\s+property="og:url"[^>]*>\s*/, /property="og:url"/],
  [/<meta\s+property="og:type"[^>]*>\s*/, /property="og:type"/],
  [/<meta\s+property="og:image"[^>]*>\s*/, /property="og:image"/],
  [/<meta\s+name="twitter:card"[^>]*>\s*/, /name="twitter:card"/],
  [/<meta\s+name="twitter:title"[^>]*>\s*/, /name="twitter:title"/],
  [/<meta\s+name="twitter:description"[^>]*>\s*/, /name="twitter:description"/],
  [/<meta\s+name="twitter:image"[^>]*>\s*/, /name="twitter:image"/],
  [/<meta\s+name="robots"[^>]*>\s*/, /name="robots"/],
];

/** Only what a visitor may see of an article — never who created or edited it. */
function publicArticle(a) {
  const { id, title, category, coverUrl, coverType, description, galleryUrls, published, featured, createdAt, updatedAt } = a;
  return { id, title, category, coverUrl, coverType, description, galleryUrls: galleryUrls || [], published, featured, createdAt, updatedAt };
}

/** The site's content. Best effort: a slow or failing API leaves the pages to load it in the browser. */
async function loadSiteData() {
  const [settings, portfolio, reviews] = await Promise.allSettled([api("/settings"), api("/portfolio"), api("/reviews")]);
  const data = {};
  if (settings.status === "fulfilled") {
    const { heroImageUrl, heroImageMobileUrl, frameImageUrl, sections } = settings.value?.settings || {};
    data.settings = { heroImageUrl, heroImageMobileUrl, frameImageUrl, sections };
  }
  if (portfolio.status === "fulfilled") data.articles = (portfolio.value?.articles || []).map(publicArticle);
  if (reviews.status === "fulfilled") data.reviews = reviews.value?.reviews || [];
  for (const [name, result] of [["settings", settings], ["portfolio", portfolio], ["reviews", reviews]]) {
    if (result.status === "rejected") console.warn(`prerender: ${name} niet opgehaald (${result.reason?.message}); de pagina laadt het zelf`);
  }
  return data;
}

/** JSON for inside a <script>: no way to close the tag early. */
function scriptJson(value) {
  // <, U+2028 and U+2029 become JSON escape sequences, built from char codes
  // so no editor or tool can turn them back into the raw characters.
  const esc = (code) => String.fromCharCode(92) + "u" + code.toString(16).padStart(4, "0");
  const risky = new RegExp("[" + [0x3c, 0x2028, 0x2029].map((c) => String.fromCharCode(c)).join("") + "]", "g");
  return JSON.stringify(value).replace(risky, (c) => esc(c.charCodeAt(0)));
}

async function main() {
  if (!existsSync(ssrEntry)) {
    throw new Error(`SSR bundle not found at ${ssrEntry}. Run "npm run build:ssr" first.`);
  }

  const { render } = await import(`file://${ssrEntry.replace(/\\/g, "/")}`);
  // A fresh `vite build` leaves an empty index.html; a second run over the same
  // dist/ finds the prerendered homepage there and uses the saved shell instead.
  const EMPTY_ROOT = '<div id="root"></div>';
  let baseTemplate = await readFile(path.join(distDir, "index.html"), "utf-8");
  if (!baseTemplate.includes(EMPTY_ROOT)) {
    baseTemplate = await readFile(path.join(distDir, "app-shell.html"), "utf-8");
    if (!baseTemplate.includes(EMPTY_ROOT)) throw new Error("dist/ has no empty shell; run vite build first");
  }

  // The admin, portal, mobile app, quotes and invoices render entirely in the
  // browser. They get this empty shell, not the homepage's HTML.
  await writeFile(path.join(distDir, "app-shell.html"), baseTemplate, "utf-8");
  console.log("app shell -> dist/app-shell.html");

  const site = await loadSiteData();
  const articlePages = (site.articles || [])
    .filter((a) => a.title !== AUTOMOTIVE_GALLERY_TITLE)
    .map((a) => ({ route: `/portfolio/${a.id}`, data: ["articles"] }));

  for (const page of [...PAGES, ...articlePages, { route: NOT_FOUND, data: [] }]) {
    const data = Object.fromEntries(page.data.filter((k) => site[k] !== undefined).map((k) => [k, site[k]]));
    const rendered = await render(page.route, data);
    const appHtml = rendered.appHtml;
    // Helmet always emits a <title>, empty when the page sets none.
    const headHtml = rendered.headHtml.replace(/<title[^>]*><\/title>\s*/, "");

    let template = baseTemplate;
    for (const [pattern, present] of BASE_TAGS) {
      if (present.test(headHtml)) template = template.replace(pattern, "");
    }

    const dataScript = Object.keys(data).length ? `<script>window.__PDC_DATA__=${scriptJson(data)}</script>\n` : "";
    const html = template
      .replace(EMPTY_ROOT, `<div id="root">${appHtml}</div>`)
      .replace("</head>", `${headHtml}\n${dataScript}  </head>`);

    const outPath = outputPathFor(page.route);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf-8");
    console.log(`prerendered ${page.route === NOT_FOUND ? "404" : page.route} -> ${path.relative(rootDir, outPath)}`);
  }

  // Build artifact only — not needed in the deployed output.
  await rm(path.join(rootDir, "dist-ssr"), { recursive: true, force: true });
}

main().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
