import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Translations } from "../i18n/translations";

/** Languages of the client portal. The public site is Dutch only. */
export type Language = "nl" | "en";

interface LanguageContextValue {
  /** The client portal's language; the public site ignores it. */
  language: Language;
  setLanguage: (lang: Language) => void;
  /** The public site's texts. */
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "pdc-lang";
// The client portal used its own key before the choice was stored here.
const LEGACY_KEYS = ["pdc-portal-lang"];

/** The portal language this visitor picked before; Dutch otherwise. */
function savedLanguage(): Language {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
      const saved = localStorage.getItem(key);
      if (saved === "nl" || saved === "en") return saved;
    }
  } catch {
    // Storage blocked: Dutch.
  }
  return "nl";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Dutch first, so the first render matches the prerendered HTML; a saved
  // portal choice is read right after hydration.
  const [language, setLanguageState] = useState<Language>("nl");

  useEffect(() => {
    setLanguageState(savedLanguage());
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations.nl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
