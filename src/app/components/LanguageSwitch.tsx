import { LANGUAGES, useLanguage } from "../context/LanguageContext";

/**
 * NL | EN, in the menu, the phone's top bar and the footer. The choice is
 * remembered (LanguageContext) and shared with the client portal; the look
 * lives in src/styles/site.css (.pdc-lang).
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div role="group" aria-label={t.nav.language} className={className ? `pdc-lang ${className}` : "pdc-lang"}>
      {LANGUAGES.map(({ code, name }) => (
        <button
          key={code}
          type="button"
          lang={code}
          // The visible code first, so voice control can say what it sees.
          aria-label={`${code.toUpperCase()}, ${name}`}
          aria-pressed={language === code}
          className="pdc-lang-btn"
          onClick={() => setLanguage(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
