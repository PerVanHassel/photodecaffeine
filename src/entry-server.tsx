import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { AuthProvider } from "./app/context/AuthContext";
import { LanguageProvider } from "./app/context/LanguageContext";
import { seedSiteData, type SiteData } from "./app/lib/siteData";
import { routes } from "./app/routes";

// The same route tree the browser uses. The static handler loads the lazy
// route of the requested URL before rendering, so the prerender contains the
// real page and matches what main.tsx hydrates.
const { query, dataRoutes } = createStaticHandler(routes);

export interface RenderResult {
  /** Rendered app markup, to be dropped into the `#root` div. */
  appHtml: string;
  /** `<title>`, `<meta>`, `<link>` and JSON-LD `<script>` tags from react-helmet-async, for the `<head>`. */
  headHtml: string;
}

/**
 * Renders a single route to a static HTML string for the build-time prerender step.
 * @param url - Path to render, e.g. "/portfolio".
 * @param data - Site content to render with; the page must carry the same data
 *   as `window.__PDC_DATA__` so the browser's first render matches.
 */
export async function render(url: string, data: SiteData = {}): Promise<RenderResult> {
  const request = new Request(new URL(url, "http://localhost"));
  const context = await query(request);

  if (context instanceof Response) {
    throw new Error(`Unexpected redirect/response while prerendering ${url}`);
  }

  seedSiteData(data);
  const router = createStaticRouter(dataRoutes, context);
  const helmetContext: { helmet?: HelmetServerState } = {};

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <AuthProvider>
        <LanguageProvider>
          <StaticRouterProvider router={router} context={context} />
        </LanguageProvider>
      </AuthProvider>
    </HelmetProvider>
  );

  const { helmet } = helmetContext;
  const headHtml = helmet
    ? [helmet.title, helmet.meta, helmet.link, helmet.script].map((tags) => tags.toString()).filter(Boolean).join("\n")
    : "";

  return { appHtml, headHtml };
}
