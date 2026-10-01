import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Language, type Translations } from "../i18n/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "pdc-lang";
// The client portal used its own key before the choice became site-wide.
const LEGACY_KEYS = ["pdc-portal-lang"];

/** The language this visitor chose before, or the best guess from the browser. */
function preferredLanguage(): Language {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
      const saved = localStorage.getItem(key);
      if (saved === "nl" || saved === "en") return saved;
    }
  } catch {
    // Storage blocked: fall through to the browser languages.
  }
  const wanted = navigator.languages?.length ? navigator.languages : [navigator.language];
  return wanted.some((l) => l?.toLowerCase().startsWith("nl")) ? "nl" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Dutch first: the prerendered HTML is Dutch, and the first render has to
  // match it. The visitor's own language is applied right after hydration.
  const [language, setLanguageState] = useState<Language>("nl");

  useEffect(() => {
    setLanguageState(preferredLanguage());
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  };

  // The served HTML says lang="nl"; if someone switches to English the
  // attribute has to follow, or search engines and screen readers keep being
  // told the page is Dutch.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
