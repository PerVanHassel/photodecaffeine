import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import { Root } from "./Root";
import { AppError } from "./components/AppError";
import { appRoutes } from "./mobile/routes";
import { portalRoutes, PublicInvoice, studioRoutes } from "./studio/routes";
import { Home } from "./pages/Home";

/**
 * A route whose code is split into its own chunk.
 *
 * This is React Router's `lazy`, not React.lazy: the router loads the module
 * before it renders the route. The prerender (src/entry-server.tsx) therefore
 * gets the real page, and main.tsx loads the chunk for the opened URL before
 * hydrating, so the first client render matches the prerendered HTML exactly.
 * On later navigations the current page stays on screen until the next one is
 * ready, instead of being swapped for a loading placeholder.
 */
function chunk<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  return async () => ({ Component: pick(await load()) });
}

/** Every route, shared by the browser router and the build-time prerender. */
export const routes: RouteObject[] = [
  {
    // Pathless wrapper so every page shares one error screen instead of the
    // router's developer default.
    ErrorBoundary: AppError,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          // The landing page stays in the main bundle: it is most first visits.
          { index: true, Component: Home },
          { path: "portfolio", lazy: chunk(() => import("./pages/PortfolioPage"), (m) => m.PortfolioPage) },
          { path: "portfolio/:id", lazy: chunk(() => import("./pages/PortfolioDetailPage"), (m) => m.PortfolioDetailPage) },
          { path: "about", lazy: chunk(() => import("./pages/AboutPage"), (m) => m.AboutPage) },
          { path: "services/automotive", lazy: chunk(() => import("./pages/AutomotivePage"), (m) => m.AutomotivePage) },
          { path: "services/social-media", lazy: chunk(() => import("./pages/SocialMediaPage"), (m) => m.SocialMediaPage) },
        ],
      },
      portalRoutes,
      studioRoutes,
      { path: "/demo/:slug", lazy: chunk(() => import("./pages/demo/DemoPage"), (m) => m.DemoPage) },
      // A price quote the client opens from the emailed link — the token in the
      // query string is what stands in for a login.
      { path: "/offerte/:id", lazy: chunk(() => import("./pages/QuotePage"), (m) => m.QuotePage) },
      // The client's copy of an invoice, by token like the quote page.
      { path: "/factuur/:id", Component: PublicInvoice },
      // The mobile admin app. Its whole subtree is lazily loaded (see
      // src/app/mobile/routes.tsx), so the public site never pays for it.
      appRoutes,
      { path: "*", lazy: chunk(() => import("./pages/NotFoundPage"), (m) => m.NotFoundPage) },
    ],
  },
];
