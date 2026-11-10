import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router";
import { ArrowLeft, Check } from "lucide-react";
import { matchPage } from "../i18n/matchPage";
import type { SentState } from "../components/match/MatchRequestForm";

/**
 * Where the match photography form lands after a successful send. Its own
 * address makes a sent request countable, like /bedankt. Opened without a
 * request (a bookmark, a refresh in another tab) it still reads right.
 */
export function MatchRequestSentPage() {
  const s = matchPage.sent;
  const sent = (useLocation().state as SentState | null) ?? null;
  const heading = useRef<HTMLHeadingElement>(null);

  // Arriving from the form: put focus on the confirmation, not on the top of the page.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const steps = sent?.type === "individual" ? s.nextIndividual : s.nextTeam;

  return (
    <section className="wf-scope wf-sent">
      <Helmet>
        <title>{s.metaTitle}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="wf-sent-inner">
        <p className="wf-sent-label">
          <span className="wf-sent-mark" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
          {s.label}
        </p>
        <h1 ref={heading} tabIndex={-1}>{s.title}</h1>
        <p className="wf-sent-body">{s.received(sent?.name ?? "", sent?.club ?? "", sent?.date ?? "")}</p>

        <h2 className="wf-h3">{s.nextTitle}</h2>
        <ol className="wf-sent-steps">
          {steps.map((step, i) => (
            <li key={step}>
              <span aria-hidden="true">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <p className="wf-body">
          {s.question} <a href={`mailto:${matchPage.email}`} className="wf-link">{matchPage.email}</a>.
        </p>

        <div className="wf-sent-actions">
          <Link to="/" className="wf-btn wf-btn--solid">{s.home}</Link>
          <Link to={matchPage.path} className="wf-btn wf-btn--line">
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
            {s.back}
          </Link>
        </div>
      </div>
    </section>
  );
}
