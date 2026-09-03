import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setThemeColor } from "./pwa";

type Mode = "dark" | "light" | "system";
type Resolved = "dark" | "light";

const STORAGE_KEY = "pdc-app-theme";
const STATUS_BAR: Record<Resolved, string> = { dark: "#070301", light: "#f2ebdc" };

const Ctx = createContext<{
  mode: Mode;
  resolved: Resolved;
  setMode: (m: Mode) => void;
  toggle: () => void;
} | null>(null);

function systemPrefersDark() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Theme for the app, kept separate from the desktop admin panel's
 * AdminThemeContext.
 *
 * Three modes rather than two: "system" is the default because a phone already
 * has an opinion about light and dark, and an admin tool that ignores the OS
 * at 11pm is the one that hurts. The desktop panel defaults to dark and stays
 * there — it has no equivalent signal to follow.
 */
export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(STORAGE_KEY) as Mode | null;
    return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
  });

  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: Resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.setAttribute("data-m-theme", resolved);
    setThemeColor(STATUS_BAR[resolved]);
    return () => {
      // The attribute has to come off on unmount — the public site shares this
      // document, and a stale data-m-theme would leave its colour-scheme set.
      document.documentElement.removeAttribute("data-m-theme");
    };
  }, [resolved]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  const value = useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, setMode, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMobileTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMobileTheme moet binnen MobileThemeProvider gebruikt worden");
  return ctx;
}
