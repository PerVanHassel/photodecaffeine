import type { PortalText, usePortalLanguage } from "../portal/i18n";

/** NL or EN, on the pages that work without a login. */
export function LangSwitch({ lang, t }: { lang: ReturnType<typeof usePortalLanguage>; t: PortalText }) {
  return (
    <div className="g-lang" role="group" aria-label={t.language}>
      <button type="button" aria-pressed={lang.language === "nl"} onClick={() => lang.choose("nl")}>NL</button>
      <button type="button" aria-pressed={lang.language === "en"} onClick={() => lang.choose("en")}>EN</button>
    </div>
  );
}
