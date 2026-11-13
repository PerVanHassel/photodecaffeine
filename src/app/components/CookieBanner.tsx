import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { onOpenCookieSettings, readChoice, saveChoice } from "../lib/cookieChoice";
import { policies } from "../lib/policies";

/**
 * Asks once whether the optional statistics may run, and again from the
 * "Cookie-instellingen" button in the footer. Saying no takes one click, just
 * like saying yes. Never rendered in the prerendered HTML, so a visitor who
 * already chose does not see it flash by.
 */
export function CookieBanner() {
  const tc = useLanguage().t.cookies;
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
      <h2 id="pdc-cookie-title">{tc.title}</h2>
      <p>
        {tc.bodyStart} <Link to={policies.cookie.path}>{tc.bodyLink}</Link>{tc.bodyEnd}
      </p>
      {settings && (
        <div className="pdc-cookie-prefs">
          <label>
            <input type="checkbox" checked disabled />
            <span><b>{tc.necessary}</b> {tc.necessaryBody}</span>
          </label>
          <label>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            <span><b>{tc.analytics}</b> {tc.analyticsBody}</span>
          </label>
        </div>
      )}
      <div className="pdc-cookie-actions">
        {settings ? (
          <button type="button" className="pdc-cookie-btn" onClick={() => choose(analytics)}>{tc.save}</button>
        ) : (
          <>
            <button type="button" className="pdc-cookie-btn" onClick={() => choose(true)}>{tc.accept}</button>
            <button type="button" className="pdc-cookie-btn" onClick={() => choose(false)}>{tc.reject}</button>
            <button type="button" className="pdc-cookie-link" onClick={() => setSettings(true)}>{tc.manage}</button>
          </>
        )}
      </div>
    </div>
  );
}
