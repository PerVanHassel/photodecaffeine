import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Navigate, type RouteObject } from "react-router";

// The admin is its own lazily loaded world: a visitor to the public site never
// downloads any of it.

function page<T, K extends keyof T>(load: () => Promise<T>, name: K): LazyExoticComponent<ComponentType> {
  return lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType })));
}

function Loading() {
  return (
    <div className="s-view" role="status" aria-busy="true">
      <span className="s-sr">Laden…</span>
      <div className="s-skel" style={{ height: 14, width: 120 }} />
      <div className="s-skel" style={{ height: 32, width: 320 }} />
      <div className="s-skel" style={{ height: 280, borderRadius: 12 }} />
    </div>
  );
}

function wrap(C: LazyExoticComponent<ComponentType>) {
  return function Wrapped() {
    return <Suspense fallback={<Loading />}><C /></Suspense>;
  };
}

const StudioLogin = lazy(() => import("./portal/Auth").then((m) => ({ default: () => <m.LoginPage admin /> })));
const StudioShell = page(() => import("./StudioShell"), "StudioShell");
const Today = page(() => import("./pages/Today"), "TodayPage");
const Pipeline = page(() => import("./pages/Pipeline"), "PipelinePage");
const Project = page(() => import("./pages/project/ProjectPage"), "ProjectPage");
const Callsheet = page(() => import("./pages/Callsheet"), "CallsheetPage");
const Planning = page(() => import("./pages/Planning"), "PlanningPage");
const Locations = page(() => import("./pages/Locations"), "LocationsPage");
const Tasks = page(() => import("./pages/Tasks"), "TasksPage");
const Clients = page(() => import("./pages/Clients"), "ClientsPage");
const Client = page(() => import("./pages/Clients"), "ClientPage");
const Inquiries = page(() => import("./pages/Inquiries"), "InquiriesPage");
const Quotes = page(() => import("./pages/Money"), "QuotesPage");
const Invoices = page(() => import("./pages/Invoices"), "InvoicesPage");
const Invoice = page(() => import("./pages/Invoices"), "InvoicePage");

const Portfolio = page(() => import("./pages/Content"), "PortfolioPage");
const Automotive = page(() => import("./pages/Content"), "AutomotivePage");
const Reviews = page(() => import("./pages/Reviews"), "ReviewsPage");
const Ads = page(() => import("./pages/Ads"), "AdsPage");
const Demos = page(() => import("./pages/Demos"), "DemosPage");
const Team = page(() => import("./pages/Team"), "TeamPage");
const Declarations = page(() => import("./pages/Declarations"), "DeclarationsPage");
const GalleryPreview = page(() => import("./pages/GalleryPreview"), "GalleryPreviewPage");
const Settings = page(() => import("./pages/Settings"), "SettingsPage");

export const studioRoutes: RouteObject = {
  path: "/admin",
  children: [
    { path: "login", Component: wrap(StudioLogin) },
    {
      Component: wrap(StudioShell),
      children: [
        { index: true, Component: wrap(Today) },
        { path: "dashboard", Component: wrap(Today) },
        { path: "pipeline", Component: wrap(Pipeline) },
        { path: "project/:id", Component: wrap(Project) },
        { path: "project/:id/callsheet", Component: wrap(Callsheet) },
        { path: "project/:id/gallery", Component: wrap(GalleryPreview) },
        { path: "planning", Component: wrap(Planning) },
        { path: "locations", Component: wrap(Locations) },
        { path: "tasks", Component: wrap(Tasks) },
        { path: "reminders", Component: wrap(Tasks) },
        { path: "clients", Component: wrap(Clients) },
        { path: "client/:id", Component: wrap(Client) },
        { path: "inquiries", Component: wrap(Inquiries) },
        { path: "quotes", Component: wrap(Quotes) },
        { path: "invoices", Component: wrap(Invoices) },
        { path: "invoice/:id", Component: wrap(Invoice) },
        { path: "portfolio", Component: wrap(Portfolio) },
        { path: "services/automotive", Component: wrap(Automotive) },
        { path: "reviews", Component: wrap(Reviews) },
        { path: "ads", Component: wrap(Ads) },
        { path: "demos", Component: wrap(Demos) },
        { path: "team", Component: wrap(Team) },
        { path: "declarations", Component: wrap(Declarations) },
        { path: "settings", Component: wrap(Settings) },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Client portal
// ---------------------------------------------------------------------------

const PortalShell = page(() => import("./portal/PortalShell"), "PortalShell");
const PortalOverview = page(() => import("./portal/Overview"), "PortalOverview");
const PortalProject = page(() => import("./portal/ProjectView"), "PortalProjectPage");
const PortalGallery = page(() => import("./portal/Gallery"), "PortalGallery");
const PortalDocuments = page(() => import("./portal/Pages"), "PortalDocuments");
const PortalMessages = page(() => import("./portal/Pages"), "PortalMessages");
const PortalAccount = page(() => import("./portal/Pages"), "PortalAccount");
const PortalFeedback = page(() => import("./portal/Feedback"), "PortalFeedbackPage");
const Login = lazy(() => import("./portal/Auth").then((m) => ({ default: () => <m.LoginPage /> })));
const ResetPassword = page(() => import("./portal/Auth"), "ResetPasswordPage");
export const PublicInvoice = wrap(page(() => import("./portal/PublicInvoice"), "PublicInvoicePage"));

export const portalRoutes: RouteObject = {
  path: "/portal",
  children: [
    { index: true, element: <Navigate to="/portal/dashboard" replace /> },
    { path: "login", Component: wrap(Login) },
    { path: "reset", Component: wrap(ResetPassword) },
    {
      Component: wrap(PortalShell),
      children: [
        { path: "dashboard", Component: wrap(PortalOverview) },
        { path: "project/:id", Component: wrap(PortalProject) },
        { path: "project/:id/gallery", Component: wrap(PortalGallery) },
        { path: "project/:id/feedback", Component: wrap(PortalFeedback) },
        { path: "documents", Component: wrap(PortalDocuments) },
        { path: "messages", Component: wrap(PortalMessages) },
        { path: "account", Component: wrap(PortalAccount) },
      ],
    },
  ],
};
