import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { AppDataProvider, useAppData } from "./AppData";
import { Splash } from "./Splash";
import { TabBar, TABS } from "./TabBar";
import { MobileThemeProvider } from "./useMobileTheme";
import { ToastProvider } from "./ui/feedback";
import { Press } from "./ui/base";
import { applyAppMeta, applyUpdate, registerServiceWorker } from "./pwa";
import { c, ease, GUTTER, radius, safeTop, shadow, spring } from "./theme";
import "./mobile.css";

/** Tab roots keep the tab bar; everything deeper is a pushed detail screen. */
const TAB_PATHS = new Set(TABS.map((t) => t.path));

function showsTabBar(pathname: string) {
  const normalised = pathname.length > 5 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return TAB_PATHS.has(normalised);
}

function depthOf(pathname: string) {
  return pathname.replace(/\/+$/, "").split("/").filter(Boolean).length;
}

/**
 * Root of the /app experience.
 *
 * Providers are ordered so that theme is outermost (it touches <html> and must
 * survive every remount below it), toasts sit above the data layer so a failed
 * refresh can surface one, and the auth gate is innermost — nothing below it
 * ever renders without a session.
 */
export function MobileShell() {
  useEffect(() => {
    const restore = applyAppMeta();
    return restore;
  }, []);

  return (
    <MobileThemeProvider>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </MobileThemeProvider>
  );
}

function AuthGate() {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  // The splash outlives the auth check by a beat: a 120ms flash of loading
  // state on a fast connection is more jarring than a deliberate 700ms open.
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplashDone(true), 850);
    return () => window.clearTimeout(timer);
  }, []);

  const ready = splashDone && !loading;

  if (!ready) {
    return (
      <div className="m-app">
        <AnimatePresence>
          <Splash key="splash" />
        </AnimatePresence>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/app/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.user_metadata?.role !== "admin") {
    // Signed in, but not as an admin. Sending them to the app's own login (which
    // explains it) beats bouncing to the client portal they didn't ask for.
    return <Navigate to="/app/login" replace state={{ denied: true }} />;
  }

  return (
    <AppDataProvider>
      <AppFrame />
    </AppDataProvider>
  );
}

function AppFrame() {
  const location = useLocation();
  const { openInquiryCount, dueReminderCount } = useAppData();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    registerServiceWorker(() => setUpdateReady(true));
  }, []);

  // Direction for the page transition: deeper = push, shallower = pop, same
  // depth = a sibling tab, which crossfades instead of sliding.
  const prevDepth = useRef(depthOf(location.pathname));
  const depth = depthOf(location.pathname);
  const direction = depth > prevDepth.current ? 1 : depth < prevDepth.current ? -1 : 0;
  useEffect(() => {
    prevDepth.current = depth;
  }, [depth]);

  const withTabs = showsTabBar(location.pathname);

  return (
    <div className="m-app">
      <AnimatePresence>
        {updateReady && <UpdateBanner onApply={applyUpdate} onDismiss={() => setUpdateReady(false)} />}
      </AnimatePresence>

      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <AnimatePresence mode="sync" initial={false} custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={direction === 0 ? { duration: 0.2, ease } : spring.smooth}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      {withTabs && (
        <TabBar
          badges={{ "/app/inbox": openInquiryCount, "/app/tasks": dueReminderCount }}
        />
      )}
    </div>
  );
}

/**
 * Push/pop uses the iOS parallax: the outgoing screen retreats at a third of
 * the incoming screen's travel rather than sliding out one-for-one, which is
 * what makes the new screen read as arriving *on top* of the old one.
 */
const pageVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? "100%" : "-32%",
    opacity: dir === 0 ? 0 : 1,
    scale: dir === 0 ? 0.99 : 1,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? "-32%" : "100%",
    opacity: dir === 0 ? 0 : 1,
    scale: dir === 0 ? 0.99 : 1,
  }),
};

function UpdateBanner({ onApply, onDismiss }: { onApply: () => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -70, opacity: 0 }}
      transition={spring.snappy}
      style={{
        position: "absolute",
        top: safeTop(8),
        left: GUTTER,
        right: GUTTER,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: radius.md,
        backgroundColor: c.surfaceSolid,
        border: `1px solid ${c.line2}`,
        boxShadow: shadow.lift,
      }}
    >
      <RefreshCw size={16} color={c.copper} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: c.fg }}>
        Nieuwe versie beschikbaar
      </span>
      <Press
        onClick={onApply}
        style={{ fontSize: 12, fontWeight: 700, color: c.copper, padding: "6px 4px" }}
      >
        Herladen
      </Press>
      <Press
        onClick={onDismiss}
        style={{ fontSize: 12, fontWeight: 600, color: c.fg4, padding: "6px 2px" }}
      >
        Later
      </Press>
    </motion.div>
  );
}
