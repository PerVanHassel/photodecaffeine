import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./Root";
import { AppError } from "./components/AppError";
import { appRoutes } from "./mobile/routes";
import { portalRoutes, PublicInvoice, studioRoutes } from "./studio/routes";
import { Home } from "./pages/Home";

// Marketing pages — loaded eagerly (they're the public site, often the first visit)
const PortfolioPage = lazy(() => import("./pages/PortfolioPage").then(m => ({ default: m.PortfolioPage })));
const PortfolioDetailPage = lazy(() => import("./pages/PortfolioDetailPage").then(m => ({ default: m.PortfolioDetailPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));
const AutomotivePage = lazy(() => import("./pages/AutomotivePage").then(m => ({ default: m.AutomotivePage })));
const SocialMediaPage = lazy(() => import("./pages/SocialMediaPage").then(m => ({ default: m.SocialMediaPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));


const DemoPage = lazy(() => import("./pages/demo/DemoPage").then(m => ({ default: m.DemoPage })));
const QuotePage = lazy(() => import("./pages/QuotePage").then(m => ({ default: m.QuotePage })));

function PageLoader() {
  return (
    <div style={{ backgroundColor: "#080401", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px", letterSpacing: "0.3em", fontFamily: "'Inter', sans-serif" }}>
        LOADING
      </div>
    </div>
  );
}

function wrap(Component: React.LazyExoticComponent<React.ComponentType>) {
  return function Wrapped() {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    );
  };
}

const LazyPortfolioPage = wrap(PortfolioPage);
const LazyPortfolioDetailPage = wrap(PortfolioDetailPage);
const LazyAboutPage = wrap(AboutPage);
const LazyAutomotivePage = wrap(AutomotivePage);
const LazySocialMediaPage = wrap(SocialMediaPage);
const LazyNotFoundPage = wrap(NotFoundPage);
const LazyDemoPage = wrap(DemoPage);
const LazyQuotePage = wrap(QuotePage);

export const router = createBrowserRouter([
  {
    // Pathless wrapper so every page shares one error screen instead of the
    // router's developer default.
    ErrorBoundary: AppError,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Home },
          { path: "portfolio", Component: LazyPortfolioPage },
          { path: "portfolio/:id", Component: LazyPortfolioDetailPage },
          { path: "about", Component: LazyAboutPage },
          { path: "services/automotive", Component: LazyAutomotivePage },
          { path: "services/social-media", Component: LazySocialMediaPage },
        ],
      },
      portalRoutes,
      studioRoutes,
      { path: "/demo/:slug", Component: LazyDemoPage },
      // A price quote the client opens from the emailed link — the token in the
      // query string is what stands in for a login.
      { path: "/offerte/:id", Component: LazyQuotePage },
      // The client's copy of an invoice, by token like the quote page.
      { path: "/factuur/:id", Component: PublicInvoice },
      // The mobile admin app. Its whole subtree is lazily loaded (see
      // src/app/mobile/routes.tsx), so the public site never pays for it.
      appRoutes,
      {
        path: "*",
        Component: LazyNotFoundPage,
      },
    ],
  },
]);
