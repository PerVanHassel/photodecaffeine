import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { PALETTES, type Palette, type Scheme } from "./theme";

type Mode = Scheme | "system";

const STORAGE_KEY = "pdc-app-theme";

interface ThemeValue {
  mode: Mode;
  scheme: Scheme;
  colors: Palette;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeValue | null>(null);

/**
 * Three modes rather than two: "system" is the default because the phone
 * already has an opinion about light and dark, and an admin tool that ignores
 * it at 11pm is the one that hurts.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>("system");

  // AsyncStorage is async, so the first frame renders with the system scheme
  // and swaps once the stored preference arrives. That flash is invisible in
  // practice because it lands well inside the splash screen.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!alive) return;
      if (stored === "dark" || stored === "light" || stored === "system") {
        setModeState(stored);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {
      // A preference that fails to persist is not worth interrupting anyone for.
    });
  }, []);

  const scheme: Scheme = mode === "system" ? (system === "light" ? "light" : "dark") : mode;

  const value = useMemo<ThemeValue>(
    () => ({ mode, scheme, colors: PALETTES[scheme], setMode }),
    [mode, scheme, setMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme moet binnen ThemeProvider gebruikt worden");
  return ctx;
}

/** Shorthand for the common case of only needing colours. */
export function useColors() {
  return useTheme().colors;
}
