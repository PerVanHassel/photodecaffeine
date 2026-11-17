import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { onOpenCookieSettings, readChoice, saveChoice } from "../lib/cookieChoice";
import { policies } from "../lib/policies";

/**
 * Asks once whether the optional statistics may run, and again from the
 * "Cookie-instellingen" button in the footer. A pop-up in the middle of the
 * screen: a corner banner was mostly scrolled past, and then nothing was
 * measured. Saying no takes one click, with a button as big as the yes (the
 * AP requires that), and the site works the same either way. Never rendered
 * in the prerendered HTML, so a visitor who already chose does not see it
 * flash by.
 */
export function CookieBanner() {
  const tc = useLanguage().t.cookies;
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  // The policies themselves stay readable: the question waits until the next page.
  const { pathname } = useLocation();
  const onPolicy = Object.values(policies).some((p) => pathname.replace(/\/$/, "") === p.path);
  const shown = open && !onPolicy;

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

  // The page behind stays put while the question is open.
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panel.current?.focus());
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shown]);

  if (!shown) return null;

  const choose = (yes: boolean) => {
    saveChoice(yes);
    setOpen(false);
    setSettings(false);
  };

  return (
    <div className="pdc-cookie-backdrop">
      <div ref={panel} className="pdc-cookie" role="dialog" aria-modal="true" aria-labelledby="pdc-cookie-title" tabIndex={-1}>
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
    </div>
  );
}
