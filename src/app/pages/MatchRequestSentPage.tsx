import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { longDate } from "../i18n/format";
import { matchPage, useMatchPage } from "../i18n/matchPage";
import type { SentState } from "../components/match/MatchRequestForm";

/**
 * Where the match photography form lands after a successful send, in the look
 * of /bedankt (.pdc-thanks). Its own address makes a sent request countable.
 * Opened without a request (a bookmark, a refresh in another tab) it still reads right.
 */
export function MatchRequestSentPage() {
  const { t } = useLanguage();
  const s = useMatchPage().sent;
  const sent = (useLocation().state as SentState | null) ?? null;
  const heading = useRef<HTMLHeadingElement>(null);

  // Arriving from the form: put focus on the confirmation, not on the top of the page.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const steps = sent?.type === "individual" ? s.nextIndividual : s.nextTeam;

  return (
    <section className="pdc-thanks">
      <Helmet>
        <title>{s.metaTitle}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="pdc-thanks-inner">
        <span className="pdc-thanks-label">{s.label}</span>
        <h1 ref={heading} tabIndex={-1} className="pdc-thanks-title">
          {s.title}
        </h1>
        <p className="pdc-thanks-body">
          {s.received(sent?.name ?? "", sent?.club ?? "", sent?.date ? longDate(t, sent.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "")}
        </p>

        <h2 className="pdc-thanks-label">{s.nextTitle}</h2>
        <ol className="pdc-thanks-steps">
          {steps.map((step, i) => (
            <li key={step}>
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>

        <p className="pdc-thanks-body">
          {s.question} <a href={`mailto:${matchPage.email}`}>{matchPage.email}</a>.
        </p>

        <div className="pdc-thanks-actions">
          <Link to="/" className="pdc-nav-cta pdc-thanks-primary">
            {s.home}
          </Link>
          <Link to={matchPage.path} className="pdc-nav-cta">
            {s.back}
          </Link>
        </div>
      </div>
    </section>
  );
}
