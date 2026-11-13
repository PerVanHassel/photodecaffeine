import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { translations, type Translations } from "../i18n/translations";

/**
 * The site's two languages: Dutch (the default, and what is prerendered) and
 * English. The client portal and the guest pages share the same choice.
 */
export type Language = "nl" | "en";

export const LANGUAGES: { code: Language; name: string }[] = [
  { code: "nl", name: "Nederlands" },
  { code: "en", name: "English" },
];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** The texts of the public site, in the chosen language. */
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// The prerendered pages read the same key before they paint (LANGUAGE_SCRIPT
// in scripts/prerender.mjs).
const STORAGE_KEY = "pdc-lang";
// The client portal used its own key before the choice was stored here.
const LEGACY_KEYS = ["pdc-portal-lang"];
/**
 * Set on <html> by that script while a visitor who chose English waits for
 * the page to switch, so the Dutch prerender does not flash by.
 */
const LANG_PENDING = "pdc-lang-pending";

const isLanguage = (value: unknown): value is Language => value === "nl" || value === "en";

// How many Dutch-only screens (the admin) are open; while one is, the page says nl.
let dutchScreens = 0;
const applyPageLanguage = (lang: Language) => {
  document.documentElement.lang = dutchScreens > 0 ? "nl" : lang;
};

/** ?lang=en or ?lang=nl in the address, for a link that should open in that language. */
function languageInUrl(): Language | null {
  try {
    const lang = new URLSearchParams(window.location.search).get("lang");
    return isLanguage(lang) ? lang : null;
  } catch {
    return null;
  }
}

function storedLanguage(): Language | null {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
      const saved = localStorage.getItem(key);
      if (isLanguage(saved)) return saved;
    }
  } catch {
    // Storage blocked: no earlier choice.
  }
  return null;
}

function storeLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Dutch first, so the first render matches the prerendered HTML; the
  // visitor's own choice is applied right after hydration.
  const [language, setLanguageState] = useState<Language>("nl");
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const fromUrl = languageInUrl();
    if (fromUrl) storeLanguage(fromUrl);
    setLanguageState(fromUrl ?? storedLanguage() ?? "nl");
    setSettled(true);
  }, []);

  // The served HTML says lang="nl"; screen readers and translation tools have
  // to hear when the page is English. Once the texts follow the choice, the
  // page may show.
  useEffect(() => {
    if (!settled) return;
    applyPageLanguage(language);
    document.documentElement.classList.remove(LANG_PENDING);
  }, [language, settled]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storeLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** For the admin, which is Dutch whatever the visitor picked on the site. */
export function useDutchPage() {
  const { language } = useLanguage();
  const current = useRef(language);
  current.current = language;
  useEffect(() => {
    dutchScreens += 1;
    applyPageLanguage(current.current);
    return () => {
      dutchScreens -= 1;
      applyPageLanguage(current.current);
    };
  }, []);
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
