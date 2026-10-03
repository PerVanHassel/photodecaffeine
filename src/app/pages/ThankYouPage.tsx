import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router";
import { useLanguage } from "../context/LanguageContext";

/** Which form sent the visitor here; it only changes the wording. */
export type InquiryForm = "contact" | "automotive" | "social";

/**
 * Where every inquiry form lands after a successful send. Its own address
 * makes a sent inquiry countable (a pageview of /bedankt in Plausible) and
 * tells the visitor what happens next. Kept out of search results.
 */
export function ThankYouPage() {
  const { t } = useLanguage();
  const tt = t.thanks;
  const from = (useLocation().state as { from?: InquiryForm } | null)?.from;
  const heading = useRef<HTMLHeadingElement>(null);

  // Arriving from a form: put focus on the confirmation, not on the top of the page.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const body = from === "automotive" ? tt.bodyAutomotive : from === "social" ? tt.bodySocial : tt.body;

  return (
    <section className="pdc-thanks">
      <Helmet>
        <title>{`${tt.title} | PhotoDeCaffeine`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="pdc-thanks-inner">
        <span className="pdc-thanks-label">{tt.label}</span>
        <h1 ref={heading} tabIndex={-1} className="pdc-thanks-title">
          {tt.title}
        </h1>
        <p className="pdc-thanks-body">{body}</p>

        <h2 className="pdc-thanks-label">{tt.nextLabel}</h2>
        <ol className="pdc-thanks-steps">
          {tt.steps.map((step, i) => (
            <li key={step}>
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>

        <p className="pdc-thanks-body">
          {tt.urgent}{" "}
          <a href="mailto:contact@photodecaffeine.com">contact@photodecaffeine.com</a> {tt.or}{" "}
          <a href="tel:+31636112514">+31 6 36112514</a>.
        </p>

        <div className="pdc-thanks-actions">
          <Link to="/portfolio" className="pdc-nav-cta pdc-thanks-primary">
            {tt.portfolio}
          </Link>
          <Link to="/" className="pdc-nav-cta">
            {tt.home}
          </Link>
        </div>
      </div>
    </section>
  );
}
