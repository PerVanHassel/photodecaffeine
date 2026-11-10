import { useState, type MouseEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Check, Image as ImageIcon } from "lucide-react";
import { Faq } from "../components/Faq";
import { MatchRequestForm } from "../components/match/MatchRequestForm";
import { matchPage as m } from "../i18n/matchPage";
import { EXAMPLE_COUNTS, euro, totalFor, type BookingType } from "../lib/matchBooking";
import { scrollBehavior } from "../lib/scroll";

/**
 * Example photos from matches. Empty for now: each slot shows a placeholder
 * until it gets a `src` (and an `alt` that says what is on it). Only photos
 * we have permission for, and no recognisable children without the parents' yes.
 */
const EXAMPLE_PHOTOS: { src?: string; alt?: string }[] = [{}, {}, {}, {}, {}];

const URL = `https://www.photodecaffeine.com${m.path}`;

/**
 * The start-up campaign for matches, next to the fixed sport packages:
 * a team or club books without costs up front, a single player pays a €20
 * contribution, and buyers pay €5 per photo in the existing gallery.
 */
export function MatchPhotographyPage() {
  // Which card was used last; a counter so the same card twice still counts.
  const [preset, setPreset] = useState<{ type: BookingType; n: number } | null>(null);

  const choose = (type: BookingType) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setPreset((p) => ({ type, n: (p?.n ?? 0) + 1 }));
    document.getElementById("aanvragen")?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };

  const cards = [
    { type: "team" as const, c: m.team },
    { type: "individual" as const, c: m.individual },
  ];

  return (
    <div className="wf-scope wf-page">
      <Helmet>
        <title>{m.metaTitle}</title>
        <meta name="description" content={m.metaDescription} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={m.metaTitle} />
        <meta property="og:description" content={m.metaDescription} />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={m.metaTitle} />
        <meta name="twitter:description" content={m.metaDescription} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", position: 2, name: "Wedstrijdfotografie", item: URL },
          ],
        })}</script>
      </Helmet>

      {/* ── Head ── */}
      <header className="wf-head">
        <div className="wf-wrap">
          <Link to="/" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {m.backLabel}
          </Link>
          <h1 className="wf-h1">
            <span className="wf-h1-lead">{m.titleLead}</span> <span className="wf-h1-rest">{m.titleRest}</span>
          </h1>
          <p className="wf-sub">{m.subtitle}</p>
        </div>
      </header>

      {/* ── Two ways to book ── */}
      <section className="wf-choose" aria-labelledby="wf-choose-title">
        <div className="wf-wrap">
          <h2 id="wf-choose-title" className="wf-h3">{m.choicesTitle}</h2>
          <div className="wf-cards">
            {cards.map(({ type, c }) => (
              <article key={type} className={`wf-card wf-card--${type}`} aria-labelledby={`wf-card-${type}`}>
                <h3 id={`wf-card-${type}`}>{c.title}</h3>
                <p className="wf-card-price">
                  <span className="wf-price">{c.price}</span>
                  <span className="wf-card-price-note">{c.priceNote}</span>
                </p>
                <ul className="wf-card-points">
                  {c.points.map((point) => (
                    <li key={point}>
                      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="wf-card-example">{c.example}</p>
                <a
                  href="#aanvragen"
                  onClick={choose(type)}
                  className={`wf-btn ${type === "team" ? "wf-btn--solid" : "wf-btn--line"}`}
                >
                  {c.cta}
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="wf-sec" aria-labelledby="wf-steps-title">
        <div className="wf-wrap">
          <h2 id="wf-steps-title" className="wf-h2">{m.stepsTitle}</h2>
          <ol className="wf-steps">
            {m.steps.map((step, i) => (
              <li key={step.title} className={i === 2 ? "wf-step wf-step--optional" : "wf-step"}>
                <span className="wf-step-no" aria-hidden="true">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Prices ── */}
      <section className="wf-sec" aria-labelledby="wf-prices-title">
        <div className="wf-wrap wf-prices-grid">
          <div>
            <h2 id="wf-prices-title" className="wf-h2">{m.pricesTitle}</h2>
            <table className="wf-table">
              <caption>{m.pricesCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{m.pricesPhotos}</th>
                  <th scope="col">
                    {m.pricesTeam}
                    <span>{m.pricesTeamNote}</span>
                  </th>
                  <th scope="col">
                    {m.pricesIndividual}
                    <span>{m.pricesIndividualNote}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_COUNTS.map((n) => (
                  <tr key={n}>
                    <th scope="row">{m.photoCount(n)}</th>
                    <td className="wf-table-team">{euro(totalFor("team", n))}</td>
                    <td>{euro(totalFor("individual", n))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="wf-facts">
            <div>
              <dt>{m.travelLabel}</dt>
              <dd>{m.travel}</dd>
            </div>
            <div>
              <dt>{m.rightsLabel}</dt>
              <dd>
                {m.rightsBefore}
                <Link to="/gebruiksrechten" className="wf-link">{m.rightsLink}</Link>
                {m.rightsAfter}
              </dd>
            </div>
            <div>
              <dt>{m.packagesLabel}</dt>
              <dd>
                {m.packagesBefore}
                <Link to="/services/fotografie/sport" className="wf-link">{m.packagesLink}</Link>
                {m.packagesAfter}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Example photos ── */}
      <section className="wf-sec" aria-labelledby="wf-photos-title">
        <div className="wf-wrap">
          <h2 id="wf-photos-title" className="wf-h2">{m.photosTitle}</h2>
          <p className="wf-body">{m.photosBody}</p>
          <div className="wf-photos">
            {EXAMPLE_PHOTOS.map((photo, i) =>
              photo.src ? (
                <figure key={i} className="wf-photo">
                  <img src={photo.src} alt={photo.alt ?? ""} loading="lazy" />
                </figure>
              ) : (
                <div key={i} className="wf-photo wf-photo--empty" aria-hidden="true">
                  <ImageIcon size={28} strokeWidth={1.5} />
                  <span>{m.photoPlaceholder}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Request form ── */}
      <section id="aanvragen" className="wf-sec wf-request">
        <div className="wf-wrap">
          <MatchRequestForm preset={preset} />
        </div>
      </section>

      <Faq items={m.faq} />

      {/* ── Terms and contact ── */}
      <section className="wf-sec" aria-label={`${m.linksTitle} en contact`}>
        <div className="wf-wrap wf-end-grid">
          <nav aria-labelledby="wf-links-title">
            <h2 id="wf-links-title" className="wf-h3">{m.linksTitle}</h2>
            <ul className="wf-links">
              {m.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>
                    {link.label}
                    <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="wf-h3">{m.contactTitle}</h2>
            <p className="wf-body">{m.contactBody}</p>
            <a href={`mailto:${m.email}`} className="wf-mail">{m.email}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
