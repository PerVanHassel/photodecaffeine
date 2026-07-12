import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";

// Marketing pages — loaded eagerly (they're the public site, often the first visit)
const PortfolioPage = lazy(() => import("./pages/PortfolioPage").then(m => ({ default: m.PortfolioPage })));
const PortfolioDetailPage = lazy(() => import("./pages/PortfolioDetailPage").then(m => ({ default: m.PortfolioDetailPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));
const AutomotivePage = lazy(() => import("./pages/AutomotivePage").then(m => ({ default: m.AutomotivePage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

// Portal pages — never needed by regular visitors
const PortalLayout = lazy(() => import("./components/portal/PortalLayout").then(m => ({ default: m.PortalLayout })));
const PortalLoginPage = lazy(() => import("./pages/portal/PortalLoginPage").then(m => ({ default: m.PortalLoginPage })));
const PortalDashboardPage = lazy(() => import("./pages/portal/PortalDashboardPage").then(m => ({ default: m.PortalDashboardPage })));
const PortalProjectPage = lazy(() => import("./pages/portal/PortalProjectPage").then(m => ({ default: m.PortalProjectPage })));

// Admin pages — never needed by regular visitors
const AdminLayout = lazy(() => import("./components/portal/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminLoginPage = lazy(() => import("./pages/portal/AdminLoginPage").then(m => ({ default: m.AdminLoginPage })));
const AdminSelfFixPage = lazy(() => import("./pages/portal/AdminSelfFixPage").then(m => ({ default: m.AdminSelfFixPage })));
const AdminQuickFixPage = lazy(() => import("./pages/portal/AdminQuickFixPage").then(m => ({ default: m.AdminQuickFixPage })));
const AdminRoleFixPage = lazy(() => import("./pages/portal/AdminRoleFixPage").then(m => ({ default: m.AdminRoleFixPage })));
const AdminDiagnosticPage = lazy(() => import("./pages/portal/AdminDiagnosticPage").then(m => ({ default: m.AdminDiagnosticPage })));
const AdminDashboardPage = lazy(() => import("./pages/portal/AdminDashboardPage").then(m => ({ default: m.AdminDashboardPage })));
const AdminClientsPage = lazy(() => import("./pages/portal/AdminClientsPage").then(m => ({ default: m.AdminClientsPage })));
const AdminClientDetailPage = lazy(() => import("./pages/portal/AdminClientDetailPage").then(m => ({ default: m.AdminClientDetailPage })));
const AdminProjectPage = lazy(() => import("./pages/portal/AdminProjectPage").then(m => ({ default: m.AdminProjectPage })));
const AdminInquiriesPage = lazy(() => import("./pages/portal/AdminInquiriesPage").then(m => ({ default: m.AdminInquiriesPage })));
const AdminPortfolioPage = lazy(() => import("./pages/portal/AdminPortfolioPage").then(m => ({ default: m.AdminPortfolioPage })));
const AdminRemindersPage = lazy(() => import("./pages/portal/AdminRemindersPage").then(m => ({ default: m.AdminRemindersPage })));
const AdminSettingsPage = lazy(() => import("./pages/portal/AdminSettingsPage").then(m => ({ default: m.AdminSettingsPage })));
const AdminAutomotiveGalleryPage = lazy(() => import("./pages/portal/AdminAutomotiveGalleryPage").then(m => ({ default: m.AdminAutomotiveGalleryPage })));
const AdminAdsPage = lazy(() => import("./pages/portal/AdminAdsPage").then(m => ({ default: m.AdminAdsPage })));

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
const LazyNotFoundPage = wrap(NotFoundPage);
const LazyPortalLayout = wrap(PortalLayout);
const LazyPortalLoginPage = wrap(PortalLoginPage);
const LazyPortalDashboardPage = wrap(PortalDashboardPage);
const LazyPortalProjectPage = wrap(PortalProjectPage);
const LazyAdminLayout = wrap(AdminLayout);
const LazyAdminLoginPage = wrap(AdminLoginPage);
const LazyAdminSelfFixPage = wrap(AdminSelfFixPage);
const LazyAdminQuickFixPage = wrap(AdminQuickFixPage);
const LazyAdminRoleFixPage = wrap(AdminRoleFixPage);
const LazyAdminDiagnosticPage = wrap(AdminDiagnosticPage);
const LazyAdminDashboardPage = wrap(AdminDashboardPage);
const LazyAdminClientsPage = wrap(AdminClientsPage);
const LazyAdminClientDetailPage = wrap(AdminClientDetailPage);
const LazyAdminProjectPage = wrap(AdminProjectPage);
const LazyAdminInquiriesPage = wrap(AdminInquiriesPage);
const LazyAdminPortfolioPage = wrap(AdminPortfolioPage);
const LazyAdminRemindersPage = wrap(AdminRemindersPage);
const LazyAdminSettingsPage = wrap(AdminSettingsPage);
const LazyAdminAutomotiveGalleryPage = wrap(AdminAutomotiveGalleryPage);
const LazyAdminAdsPage = wrap(AdminAdsPage);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "portfolio", Component: LazyPortfolioPage },
      { path: "portfolio/:id", Component: LazyPortfolioDetailPage },
      { path: "about", Component: LazyAboutPage },
      { path: "services/automotive", Component: LazyAutomotivePage },
    ],
  },
  {
    path: "/portal",
    children: [
      { path: "login", Component: LazyPortalLoginPage },
      {
        Component: LazyPortalLayout,
        children: [
          { path: "dashboard", Component: LazyPortalDashboardPage },
          { path: "project/:id", Component: LazyPortalProjectPage },
        ],
      },
    ],
  },
  {
    path: "/admin",
    children: [
      { path: "self-fix", Component: LazyAdminSelfFixPage },
      { path: "fix", Component: LazyAdminQuickFixPage },
      { path: "login", Component: LazyAdminLoginPage },
      { path: "fix-role", Component: LazyAdminRoleFixPage },
      { path: "diagnostic", Component: LazyAdminDiagnosticPage },
      {
        Component: LazyAdminLayout,
        children: [
          { path: "dashboard", Component: LazyAdminDashboardPage },
          { path: "clients", Component: LazyAdminClientsPage },
          { path: "client/:id", Component: LazyAdminClientDetailPage },
          { path: "project/:id", Component: LazyAdminProjectPage },
          { path: "inquiries", Component: LazyAdminInquiriesPage },
          { path: "portfolio", Component: LazyAdminPortfolioPage },
          { path: "services/automotive", Component: LazyAdminAutomotiveGalleryPage },
          { path: "ads", Component: LazyAdminAdsPage },
          { path: "reminders", Component: LazyAdminRemindersPage },
          { path: "settings", Component: LazyAdminSettingsPage },
        ],
      },
    ],
  },
  {
    path: "*",
    Component: LazyNotFoundPage,
  },
]);
