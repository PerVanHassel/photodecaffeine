import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { PortfolioPage } from "./pages/PortfolioPage";
import { PortfolioDetailPage } from "./pages/PortfolioDetailPage";
import { AboutPage } from "./pages/AboutPage";
import { PortalLayout } from "./components/portal/PortalLayout";
import { PortalLoginPage } from "./pages/portal/PortalLoginPage";
import { PortalDashboardPage } from "./pages/portal/PortalDashboardPage";
import { PortalProjectPage } from "./pages/portal/PortalProjectPage";
import { AdminLayout } from "./components/portal/AdminLayout";
import { AdminLoginPage } from "./pages/portal/AdminLoginPage";
import { AdminSelfFixPage } from "./pages/portal/AdminSelfFixPage";
import { AdminQuickFixPage } from "./pages/portal/AdminQuickFixPage";
import { AdminRoleFixPage } from "./pages/portal/AdminRoleFixPage";
import { AdminDiagnosticPage } from "./pages/portal/AdminDiagnosticPage";
import { AdminDashboardPage } from "./pages/portal/AdminDashboardPage";
import { AdminClientsPage } from "./pages/portal/AdminClientsPage";
import { AdminClientDetailPage } from "./pages/portal/AdminClientDetailPage";
import { AdminProjectPage } from "./pages/portal/AdminProjectPage";
import { AdminInquiriesPage } from "./pages/portal/AdminInquiriesPage";
import { AdminPortfolioPage } from "./pages/portal/AdminPortfolioPage";
import { AdminRemindersPage } from "./pages/portal/AdminRemindersPage";
import { AdminSettingsPage } from "./pages/portal/AdminSettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AutomotivePage } from "./pages/AutomotivePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "portfolio", Component: PortfolioPage },
      { path: "portfolio/:id", Component: PortfolioDetailPage },
      { path: "about", Component: AboutPage },
      { path: "services/automotive", Component: AutomotivePage },
    ],
  },
  {
    path: "/portal",
    children: [
      { path: "login", Component: PortalLoginPage },
      {
        Component: PortalLayout,
        children: [
          { path: "dashboard", Component: PortalDashboardPage },
          { path: "project/:id", Component: PortalProjectPage },
        ],
      },
    ],
  },
  {
    path: "/admin",
    children: [
      { path: "self-fix", Component: AdminSelfFixPage },
      { path: "fix", Component: AdminQuickFixPage },
      { path: "login", Component: AdminLoginPage },
      { path: "fix-role", Component: AdminRoleFixPage },
      { path: "diagnostic", Component: AdminDiagnosticPage },
      {
        Component: AdminLayout,
        children: [
          { path: "dashboard", Component: AdminDashboardPage },
          { path: "clients", Component: AdminClientsPage },
          { path: "client/:id", Component: AdminClientDetailPage },
          { path: "project/:id", Component: AdminProjectPage },
          { path: "inquiries", Component: AdminInquiriesPage },
          { path: "portfolio", Component: AdminPortfolioPage },
          { path: "reminders", Component: AdminRemindersPage },
          { path: "settings", Component: AdminSettingsPage },
        ],
      },
    ],
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
