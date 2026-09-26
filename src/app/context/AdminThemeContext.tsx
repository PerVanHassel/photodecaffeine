import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AdminTheme = "dark" | "light";

const STORAGE_KEY = "pdc-admin-theme";

const AdminThemeContext = createContext<{
  theme: AdminTheme;
  toggleTheme: () => void;
} | null>(null);

// Sets data-admin-theme on <html>, which the [data-admin-theme="..."] token
// blocks in src/styles/theme.css key off. Scoped to the admin panel only —
// the public site and client portal never reference var(--admin-*), so the
// attribute is harmless outside /admin.
// `forced` pins the theme (the new studio shell is light only) and leaves the
// stored preference alone.
export function AdminThemeProvider({ children, forced }: { children: ReactNode; forced?: AdminTheme }) {
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (forced) return forced;
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(STORAGE_KEY) as AdminTheme) || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-admin-theme", theme);
    if (!forced) localStorage.setItem(STORAGE_KEY, theme);
    return () => {
      document.documentElement.removeAttribute("data-admin-theme");
    };
  }, [theme, forced]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}
