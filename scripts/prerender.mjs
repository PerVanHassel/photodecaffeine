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

const ROUTES = ["/", "/portfolio", "/about", "/services/automotive"];

function outputPathFor(route) {
  if (route === "/") return path.join(distDir, "index.html");
  return path.join(distDir, route.replace(/^\//, ""), "index.html");
}

async function main() {
  if (!existsSync(ssrEntry)) {
    throw new Error(
      `SSR bundle not found at ${ssrEntry}. Run "npm run build:ssr" first.`
    );
  }

  const { render } = await import(`file://${ssrEntry.replace(/\\/g, "/")}`);
  const template = await readFile(path.join(distDir, "index.html"), "utf-8");

  for (const route of ROUTES) {
    const { appHtml, headHtml } = await render(route);

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
