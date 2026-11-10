import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { matchPage } from "../i18n/matchPage";

/**
 * The match photography campaign, as a wide row right under the three service
 * cards on the home page. The hero and its "Boek een shoot" button stay as they are.
 */
export function MatchCampaignBand() {
  const b = matchPage.band;
  return (
    <div className="wf-scope wf-band">
      <div>
        <h3 className="wf-band-title">{b.title}</h3>
        <p className="wf-band-body">{b.body}</p>
      </div>
      <Link to={matchPage.path} className="wf-btn wf-btn--solid">
        {b.cta}
        <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
      </Link>
    </div>
  );
}
