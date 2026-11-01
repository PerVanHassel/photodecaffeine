import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { onOpenCookieSettings, readChoice, saveChoice } from "../lib/cookieChoice";
import { policies } from "../lib/policies";

/**
 * Asks once whether the optional statistics may run, and again from the
 * "Cookie-instellingen" button in the footer. Saying no takes one click, just
 * like saying yes. Never rendered in the prerendered HTML, so a visitor who
 * already chose does not see it flash by.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The admin's page previews run in an iframe and answer to nobody.
    if (window.top === window.self && !readChoice()) setOpen(true);
    return onOpenCookieSettings(() => {
      setAnalytics(readChoice()?.analytics === true);
      setSettings(true);
      setOpen(true);
      requestAnimationFrame(() => panel.current?.focus());
    });
  }, []);

  if (!open) return null;

  const choose = (yes: boolean) => {
    saveChoice(yes);
    setOpen(false);
    setSettings(false);
  };

  return (
    <div ref={panel} className="pdc-cookie" role="dialog" aria-labelledby="pdc-cookie-title" tabIndex={-1}>
      <h2 id="pdc-cookie-title">Jouw privacy, jouw keuze.</h2>
      <p>
        We gebruiken noodzakelijke technieken om deze website te laten werken. Met jouw toestemming gebruiken we ook
        bezoekersstatistieken uit ons <Link to={policies.cookie.path}>cookiebeleid</Link>. Kies wat bij je past.
      </p>
      {settings && (
        <div className="pdc-cookie-prefs">
          <label>
            <input type="checkbox" checked disabled />
            <span><b>Noodzakelijk</b> Altijd actief. Onthoudt onder meer deze keuze en je inlog.</span>
          </label>
          <label>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            <span><b>Analyse</b> Herkent een tweede bezoek en laat ons zien hoe de site wordt gebruikt. Alleen bij ons, staat standaard uit.</span>
          </label>
        </div>
      )}
      <div className="pdc-cookie-actions">
        {settings ? (
          <button type="button" className="pdc-cookie-btn" onClick={() => choose(analytics)}>Keuze opslaan</button>
        ) : (
          <>
            <button type="button" className="pdc-cookie-btn" onClick={() => choose(true)}>Optionele cookies accepteren</button>
            <button type="button" className="pdc-cookie-btn" onClick={() => choose(false)}>Optionele cookies weigeren</button>
            <button type="button" className="pdc-cookie-link" onClick={() => setSettings(true)}>Voorkeuren beheren</button>
          </>
        )}
      </div>
    </div>
  );
}
