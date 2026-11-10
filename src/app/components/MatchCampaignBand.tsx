import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { matchPage } from "../i18n/matchPage";

/**
 * The match photography campaign as its own strip on the home page, right
 * under the service cards. The one copper block on the page, edged like a
 * strip of film (the frame in the hero has the same holes), so it stands out
 * from the dark sections around it. The hero and "Boek een shoot" stay as they are.
 *
 * "Gratis" is only true for a team or club booking, so the label above the
 * headline says who it is for, and the line under it gives the price for one player.
 */
export function MatchCampaignBand() {
  const b = matchPage.band;
  return (
    <section className="pdc-match-band" aria-labelledby="match-band-title">
      <div className="pdc-match-band-inner">
        <div className="pdc-match-band-main">
          <span className="pdc-match-band-label">
            <span aria-hidden="true" />
            {b.label}
          </span>
          <h2 id="match-band-title" className="pdc-match-band-title">
            {b.title} <em>{b.titleEm}</em>
          </h2>
          <p className="pdc-match-band-body">{b.body}</p>
          <div className="pdc-match-band-actions">
            <Link to={matchPage.path} className="pdc-btn pdc-match-band-btn">
              {b.cta}
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <Link to={`${matchPage.path}#${matchPage.stepsId}`} className="pdc-match-band-more">
              {b.more}
            </Link>
          </div>
        </div>
        <ul className="pdc-match-band-facts">
          {b.facts.map((fact) => (
            <li key={fact.value}>
              <strong>{fact.value}</strong>
              <span>{fact.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
