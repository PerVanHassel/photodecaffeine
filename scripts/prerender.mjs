// Prerenders the marketing routes to static HTML using the SSR bundle built by
// `npm run build:ssr`, then writes them into dist/ alongside the client build.
//
// This replaces react-snap (which crawled the site with a bundled, ancient
// Chromium via puppeteer — a binary that can't launch on Vercel's build image
// because it's missing system shared libraries). Rendering with
// react-dom/server instead needs no browser at all, so it can't hit that
// problem.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");
const ssrEntry = path.join(rootDir, "dist-ssr", "entry-server.js");

const ROUTES = ["/", "/portfolio", "/about", "/services/automotive", "/services/social-media"];

function outputPathFor(route) {
  if (route === "/") return path.join(distDir, "index.html");
  return path.join(distDir, route.replace(/^\//, ""), "index.html");
}

// Base index.html carries fallback SEO tags (for the client-side SPA shell
// before Helmet mounts, and as a safety net for routes with no Helmet block).
// Every prerendered marketing page's Helmet sets its own version of these same
// tags, so the base ones must be stripped first — otherwise both copies land
// in <head> and crawlers read the first (generic) <title>/<meta>, silently
// shadowing the per-page one Helmet just injected.
const BASE_TAGS_OVERRIDDEN_BY_HELMET = [
  /<title>[\s\S]*?<\/title>\s*/,
  /<meta\s+name="description"[^>]*>\s*/,
  /<meta\s+property="og:title"[^>]*>\s*/,
  /<meta\s+property="og:description"[^>]*>\s*/,
  /<meta\s+property="og:url"[^>]*>\s*/,
  /<meta\s+property="og:type"[^>]*>\s*/,
  /<meta\s+name="twitter:card"[^>]*>\s*/,
  /<meta\s+name="twitter:title"[^>]*>\s*/,
  /<meta\s+name="twitter:description"[^>]*>\s*/,
];

async function main() {
  if (!existsSync(ssrEntry)) {
    throw new Error(
      `SSR bundle not found at ${ssrEntry}. Run "npm run build:ssr" first.`
    );
  }

  const { render } = await import(`file://${ssrEntry.replace(/\\/g, "/")}`);
  const baseTemplate = await readFile(path.join(distDir, "index.html"), "utf-8");

  for (const route of ROUTES) {
    const { appHtml, headHtml } = await render(route);

    let template = baseTemplate;
    for (const pattern of BASE_TAGS_OVERRIDDEN_BY_HELMET) {
      template = template.replace(pattern, "");
    }

    const html = template
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
      .replace("</head>", `${headHtml}\n  </head>`);

    const outPath = outputPathFor(route);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf-8");
    console.log(`prerendered ${route} -> ${path.relative(rootDir, outPath)}`);
  }

  // Build artifact only — not needed in the deployed output.
  await rm(path.join(rootDir, "dist-ssr"), { recursive: true, force: true });
}

main().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
