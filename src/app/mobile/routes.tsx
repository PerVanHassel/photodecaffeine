import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import type { RouteObject } from "react-router";

/**
 * Route subtree for the admin app at /app.
 *
 * Every screen is lazily imported so a visitor to the public site never
 * downloads any of it — the app, its motion primitives and its stylesheet all
 * live in chunks reached only from here.
 */

const MobileShell = lazy(() => import("./MobileShell").then((m) => ({ default: m.MobileShell })));
const LoginScreen = lazy(() => import("./screens/LoginScreen").then((m) => ({ default: m.LoginScreen })));
const HomeScreen = lazy(() => import("./screens/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const ClientsScreen = lazy(() => import("./screens/ClientsScreen").then((m) => ({ default: m.ClientsScreen })));
const ClientDetailScreen = lazy(() => import("./screens/ClientDetailScreen").then((m) => ({ default: m.ClientDetailScreen })));
const ProjectScreen = lazy(() => import("./screens/ProjectScreen").then((m) => ({ default: m.ProjectScreen })));
const InboxScreen = lazy(() => import("./screens/InboxScreen").then((m) => ({ default: m.InboxScreen })));
const TasksScreen = lazy(() => import("./screens/TasksScreen").then((m) => ({ default: m.TasksScreen })));
const MoreScreen = lazy(() => import("./screens/MoreScreen").then((m) => ({ default: m.MoreScreen })));
const PortfolioScreen = lazy(() => import("./screens/PortfolioScreen").then((m) => ({ default: m.PortfolioScreen })));
const AutomotiveScreen = lazy(() => import("./screens/AutomotiveScreen").then((m) => ({ default: m.AutomotiveScreen })));
const AdsScreen = lazy(() => import("./screens/AdsScreen").then((m) => ({ default: m.AdsScreen })));
const ReviewsScreen = lazy(() => import("./screens/ReviewsScreen").then((m) => ({ default: m.ReviewsScreen })));
const DeclarationsScreen = lazy(() => import("./screens/DeclarationsScreen").then((m) => ({ default: m.DeclarationsScreen })));
const TeamScreen = lazy(() => import("./screens/TeamScreen").then((m) => ({ default: m.TeamScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));

/**
 * Chunk-loading fallback.
 *
 * Deliberately a bare tinted panel rather than a spinner: chunks resolve in
 * tens of milliseconds on a warm cache, and a spinner that flashes for two
 * frames reads as jank. The colour comes from the theme attribute already on
 * <html>, with a dark default for the very first paint.
 */
function ChunkFallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--m-bg, #070301)",
      }}
    />
  );
}

function wrap(Component: LazyExoticComponent<ComponentType>) {
  return function Wrapped() {
    return (
      <Suspense fallback={<ChunkFallback />}>
        <Component />
      </Suspense>
    );
  };
}

export const appRoutes: RouteObject = {
  path: "/app",
  children: [
    // Outside the shell: the shell's auth gate is what redirects here.
    { path: "login", Component: wrap(LoginScreen) },
    {
      Component: wrap(MobileShell),
      children: [
        { index: true, Component: wrap(HomeScreen) },
        { path: "clients", Component: wrap(ClientsScreen) },
        { path: "client/:id", Component: wrap(ClientDetailScreen) },
        { path: "project/:id", Component: wrap(ProjectScreen) },
        { path: "inbox", Component: wrap(InboxScreen) },
        { path: "tasks", Component: wrap(TasksScreen) },
        { path: "more", Component: wrap(MoreScreen) },
        { path: "portfolio", Component: wrap(PortfolioScreen) },
        { path: "automotive", Component: wrap(AutomotiveScreen) },
        { path: "ads", Component: wrap(AdsScreen) },
        { path: "reviews", Component: wrap(ReviewsScreen) },
        { path: "declarations", Component: wrap(DeclarationsScreen) },
        { path: "team", Component: wrap(TeamScreen) },
        { path: "settings", Component: wrap(SettingsScreen) },
      ],
    },
  ],
};
