import { Root } from "./Root";
import { Home } from "./pages/Home";
import { PortfolioPage } from "./pages/PortfolioPage";
import { AboutPage } from "./pages/AboutPage";
import { AutomotivePage } from "./pages/AutomotivePage";
import { SocialMediaPage } from "./pages/SocialMediaPage";

/**
 * Route tree used only for the build-time prerender step (see src/entry-server.tsx).
 *
 * Deliberately separate from routes.tsx: the client router lazy-loads most pages
 * for code-splitting, but React.lazy/Suspense boundaries don't resolve during a
 * synchronous renderToString() call, so the prerendered HTML would just contain
 * loading placeholders. These marketing routes are the ones react-snap used
 * to crawl, so they're imported eagerly here for a real static snapshot.
 */
export const ssrRoutes = [
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "portfolio", Component: PortfolioPage },
      { path: "about", Component: AboutPage },
      { path: "services/automotive", Component: AutomotivePage },
      { path: "services/social-media", Component: SocialMediaPage },
    ],
  },
];
