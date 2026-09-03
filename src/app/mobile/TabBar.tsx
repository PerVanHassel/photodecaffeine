import { motion } from "motion/react";
import { Home, Users, Inbox, ListChecks, LayoutGrid } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { c, radius, safeBottom, spring, TAB_BAR_H } from "./theme";
import { haptic } from "./haptics";

export interface TabDef {
  path: string;
  label: string;
  icon: typeof Home;
}

export const TABS: TabDef[] = [
  { path: "/app", label: "Home", icon: Home },
  { path: "/app/clients", label: "Klanten", icon: Users },
  { path: "/app/inbox", label: "Inbox", icon: Inbox },
  { path: "/app/tasks", label: "Taken", icon: ListChecks },
  { path: "/app/more", label: "Meer", icon: LayoutGrid },
];

/** True when `path` is the tab that owns the current location. */
export function isTabActive(tabPath: string, pathname: string) {
  if (tabPath === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
}

export function TabBar({ badges = {} }: { badges?: Record<string, number> }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: "relative",
        zIndex: 40,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        height: TAB_BAR_H,
        paddingBottom: safeBottom(0),
        boxSizing: "content-box",
        backgroundColor: c.surface,
        backdropFilter: "blur(28px) saturate(170%)",
        WebkitBackdropFilter: "blur(28px) saturate(170%)",
        borderTop: `1px solid ${c.line}`,
        boxShadow: "var(--m-shadow-tab)",
      }}
    >
      {TABS.map((tab) => {
        const active = isTabActive(tab.path, location.pathname);
        const Icon = tab.icon;
        const badge = badges[tab.path] ?? 0;

        return (
          <button
            key={tab.path}
            type="button"
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              // Tapping the active tab scrolls its screen back to the top,
              // the way every native tab bar behaves.
              if (active) {
                document.querySelector(".m-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
                haptic("tap");
                return;
              }
              haptic("select");
              navigate(tab.path);
            }}
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {active && (
              <motion.span
                layoutId="tab-indicator"
                transition={spring.snappy}
                style={{
                  position: "absolute",
                  top: 4,
                  width: 46,
                  height: 34,
                  borderRadius: radius.md,
                  backgroundColor: c.copperWash,
                }}
              />
            )}

            <motion.span
              animate={{
                // The lift is small on purpose — enough to register as a
                // response, not enough to read as the row bouncing.
                y: active ? -1 : 0,
                scale: active ? 1.06 : 1,
                color: active ? c.copper : c.fg4,
              }}
              transition={spring.snappy}
              style={{ position: "relative", display: "grid" }}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
              {badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={spring.bouncy}
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    minWidth: 15,
                    height: 15,
                    padding: "0 4px",
                    borderRadius: radius.pill,
                    backgroundColor: c.copper,
                    color: c.bg,
                    fontSize: 9,
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                    fontVariantNumeric: "tabular-nums",
                    boxShadow: `0 0 0 2px ${c.bg}`,
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </motion.span>
              )}
            </motion.span>

            <motion.span
              animate={{ color: active ? c.copper : c.fg4 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "relative",
                fontSize: 9.5,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.04em",
              }}
            >
              {tab.label}
            </motion.span>
          </button>
        );
      })}
    </nav>
  );
}
