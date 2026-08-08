import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { AuthProvider } from "./app/context/AuthContext";
import { LanguageProvider } from "./app/context/LanguageContext";
import { ssrRoutes } from "./app/routes.ssr";

const { query, dataRoutes } = createStaticHandler(ssrRoutes);

export interface RenderResult {
  /** Rendered app markup, to be dropped into the `#root` div. */
  appHtml: string;
  /** `<title>` + `<meta>` + `<link>` tags produced by react-helmet-async, for the `<head>`. */
  headHtml: string;
}

/**
 * Renders a single route to a static HTML string for the build-time prerender step.
 * @param url - Path to render, e.g. "/portfolio". Must match a route in ssrRoutes.
 */
export async function render(url: string): Promise<RenderResult> {
  const request = new Request(new URL(url, "http://localhost"));
  const context = await query(request);

  if (context instanceof Response) {
    throw new Error(`Unexpected redirect/response while prerendering ${url}`);
  }

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
    ? [helmet.title.toString(), helmet.meta.toString(), helmet.link.toString()].join("\n")
    : "";

  return { appHtml, headHtml };
}
