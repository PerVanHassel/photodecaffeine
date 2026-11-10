import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

/**
 * The band under the home page hero that leads to the sports campaign
 * (/sportactie). Switched off in the admin under Instellingen → Sportactie.
 * The look is in src/styles/site.css (.pdc-camp-band*).
 */
export function SportCampaignBand() {
  const { t } = useLanguage();
  const tb = t.sportCampaign.band;
  return (
    <section className="pdc-camp-band" aria-labelledby="camp-band-title">
      <div className="pdc-camp-band-inner">
        <div className="pdc-camp-band-text">
          <span className="pdc-camp-band-label">{tb.label}</span>
          <h2 id="camp-band-title" className="pdc-camp-band-title">{tb.title}</h2>
          <p className="pdc-camp-band-body">{tb.body}</p>
        </div>
        <div className="pdc-camp-band-price" aria-hidden="true">
          <span>€5</span>
          <small>per foto</small>
        </div>
        <Link to={t.sportCampaign.path} className="pdc-camp-band-cta">
          {tb.button}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
