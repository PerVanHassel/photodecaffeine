import { useState, type MouseEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Faq } from "../components/Faq";
import { PhotoReel } from "../components/PhotoReel";
import { MatchRequestForm } from "../components/match/MatchRequestForm";
import { matchPage, useMatchPage } from "../i18n/matchPage";
import { EXAMPLE_COUNTS, euro, totalFor, type BookingType } from "../lib/matchBooking";
import { HIGH_PRIORITY, webSrcSet } from "../lib/images";
import { focusPhotos } from "../lib/photoFocus";
import { scrollBehavior } from "../lib/scroll";
import { usePortfolio } from "../lib/siteData";

const URL = `https://www.photodecaffeine.com${matchPage.path}`;

/** A section header in the site's way: small label, two-line title with a dim second line, a line of text. */
function SectionHead({ id, label, title1, title2, body }: { id: string; label: string; title1: string; title2: string; body?: string }) {
  return (
    <div className="pdc-pkgs-head wf-section-head">
      <div>
        <span className="pdc-pkgs-label">{label}</span>
        <h2 id={id} className="pdc-pkgs-title">
          {title1}
          <br />
          <span>{title2}</span>
        </h2>
      </div>
      {body && <p className="pdc-pkgs-body">{body}</p>}
    </div>
  );
}

/**
 * The start-up campaign for matches, next to the fixed sport packages: a team
 * or club books without costs up front, a single player pays a €20
 * contribution, and buyers pay €5 per photo in the existing gallery. Built from
 * the same parts as the photography pages: the header, the package cards, the
 * steps of the home page, the request form and the questions.
 */
export function MatchPhotographyPage() {
  const m = useMatchPage();
  // Which card was used last; a counter so the same card twice still counts.
  const [preset, setPreset] = useState<{ type: BookingType; n: number } | null>(null);

  // Example photos: the Sport category of the portfolio, the same photos as
  // on the sport page. Only what is published there shows up, so a work that
  // loses its permission leaves this page too. No Sport work: no strip.
  const sport = focusPhotos(usePortfolio().data, "Sport", 9);
  const examples = sport.focused ? sport.photos : [];
  // The first of them goes in the header. No sport photo: the header is text only.
  const hero = examples[0];

  const choose = (type: BookingType) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setPreset((p) => ({ type, n: (p?.n ?? 0) + 1 }));
    document.getElementById("aanvragen")?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };

  const toSteps = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(m.stepsId)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };

  const cards = [
    { type: "team" as const, c: m.team, badge: m.team.badge },
    { type: "individual" as const, c: m.individual, badge: null },
  ];
  const bills = [
    { type: "team" as const, name: m.prices.team, note: m.prices.teamNote },
    { type: "individual" as const, name: m.prices.individual, note: m.prices.individualNote },
  ];

  return (
    <div className="wf-page">
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
            { "@type": "ListItem", position: 2, name: m.label, item: URL },
          ],
        })}</script>
      </Helmet>

      {/* ── Header: the offer, the three numbers and a sport photo in the film frame of the home page ── */}
      <header className="pdc-svc-head wf-head">
        <div className="wf-head-inner">
          <Link to="/" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {m.backLabel}
          </Link>
          <div className={hero ? "wf-head-grid wf-head-grid--photo" : "wf-head-grid"}>
            <div className="wf-head-text">
              <span className="wf-label wf-head-label">
                <span aria-hidden="true" />
                {m.label}
              </span>
              <h1 className="wf-title">
                {m.title}
                <br />
                <span className="wf-title-dim">{m.title2}</span>
                <em>{m.titleEm}</em>
              </h1>
              <p className="wf-sub">{m.subtitle}</p>
              <div className="wf-head-actions">
                <a href="#aanvragen" onClick={choose("team")} className="pdc-btn pdc-btn-solid wf-head-btn">
                  {m.heroCta}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </a>
                <a href={`#${m.stepsId}`} onClick={toSteps} className="wf-head-more">
                  {m.heroMore}
                </a>
              </div>
            </div>
            {hero && (
              <figure className="wf-head-photo">
                <span className="wf-head-tag">{m.heroTag}</span>
                <div className="wf-head-frame">
                  <img
                    src={hero.url}
                    srcSet={webSrcSet(hero.url)}
                    sizes="(max-width: 1023px) 100vw, 480px"
                    alt={hero.article.title}
                    {...HIGH_PRIORITY}
                  />
                </div>
                <figcaption>
                  <span>{hero.article.title}</span>
                  <span aria-hidden="true">{m.heroPrice}</span>
                </figcaption>
              </figure>
            )}
            <ul className="wf-head-facts">
              {m.band.facts.map((fact) => (
                <li key={fact.value}>
                  <strong>{fact.value}</strong>
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* ── Two ways to book, as package cards ── */}
      <section className="pdc-section wf-choose" aria-labelledby="wf-choose-title">
        <div className="pdc-wrap wf-wrap">
          <SectionHead id="wf-choose-title" {...m.choose} />
          <div className="pdc-pkg-grid wf-pair">
            {cards.map(({ type, c, badge }) => (
              <article key={type} className={`pdc-pkg${badge ? " pdc-pkg--best" : ""}`} aria-labelledby={`wf-card-${type}`}>
                {badge && <span className="pdc-pkg-badge">{badge}</span>}
                <div>
                  <h3 id={`wf-card-${type}`} className="pdc-pkg-name wf-card-name">{c.name}</h3>
                  <p className="pdc-pkg-pitch">{c.pitch}</p>
                  <p className="pdc-pkg-price">
                    {c.price}
                    <span>{c.priceNote}</span>
                  </p>
                  <p className="pdc-pkg-photos">
                    <strong>{c.perPhoto}</strong>
                    <span>{c.example}</span>
                  </p>
                </div>
                <div className="pdc-pkg-detail">
                  <ul className="pdc-pkg-list">
                    {c.items.map((item) => (
                      <li key={item}>
                        <Check size={14} strokeWidth={2} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#aanvragen"
                    onClick={choose(type)}
                    className={`pdc-btn ${badge ? "pdc-btn-solid" : "pdc-btn-quiet"} pdc-pkg-btn`}
                  >
                    {c.cta}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works, like the steps on the home page ── */}
      <section id={m.stepsId} className="pdc-section wf-steps-section" aria-labelledby="wf-steps-title">
        <div className="pdc-wrap wf-wrap">
          <SectionHead id="wf-steps-title" label={m.steps.label} title1={m.steps.title1} title2={m.steps.title2} body={m.steps.body} />
          <ol className="wf-steps">
            {m.steps.items.map((step, i) => (
              <li key={step.title} className="wf-step">
                <span className="wf-step-mark" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="wf-step-label">{m.steps.step(i + 1)}</span>
                <h3 className="wf-step-title">{step.title}</h3>
                <p className="wf-step-sub">{step.sub}</p>
                <p className="wf-step-body">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Prices ── */}
      <section className="pdc-section" aria-labelledby="wf-prices-title">
        <div className="pdc-wrap wf-wrap">
          <SectionHead id="wf-prices-title" label={m.prices.label} title1={m.prices.title1} title2={m.prices.title2} body={m.prices.body} />
          <div className="wf-bills">
            {bills.map((bill) => (
              <div key={bill.type} className={`wf-bill wf-bill--${bill.type}`}>
                <h3 className="wf-bill-name">{bill.name}</h3>
                <p className="wf-bill-note">{bill.note}</p>
                <dl className="wf-bill-rows">
                  {EXAMPLE_COUNTS.map((n) => (
                    <div key={n}>
                      <dt>{m.prices.photoCount(n)}</dt>
                      <dd>{euro(totalFor(bill.type, n))}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="wf-notes">
            <div className="wf-note">
              <h3 className="wf-box-label">{m.prices.travelLabel}</h3>
              <p>{m.prices.travel}</p>
            </div>
            <div className="wf-note">
              <h3 className="wf-box-label">{m.prices.rightsLabel}</h3>
              <p>
                {m.prices.rightsBefore}
                <Link to="/gebruiksrechten" className="wf-inline-link">{m.prices.rightsLink}</Link>
                {m.prices.rightsAfter}
              </p>
            </div>
            <div className="wf-note">
              <h3 className="wf-box-label">{m.prices.packagesLabel}</h3>
              <p>
                {m.prices.packagesBefore}
                <Link to="/services/fotografie/sport" className="wf-inline-link">{m.prices.packagesLink}</Link>
                {m.prices.packagesAfter}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Example photos from the portfolio, in the strip of the service pages ── */}
      {examples.length > 0 && (
        <PhotoReel
          id="wf-photos-title"
          label={m.photos.label}
          titleLine1={m.photos.title1}
          titleLine2={m.photos.title2}
          body={m.photos.body}
          link={m.photos.link}
          photos={examples}
          labels={{ previous: m.photos.previous, next: m.photos.next }}
        />
      )}

      {/* ── What to expect + the request form, like the service pages ── */}
      <div className="wf-request-band">
      <div className="pdc-svc-body wf-request">
        <div className="wf-request-side">
          <h2 className="wf-label">{m.request.includedLabel}</h2>
          <ul className="wf-included">
            {m.request.included.map((item) => (
              <li key={item}>
                <span aria-hidden="true">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="wf-box wf-mail">
            <span className="wf-box-label">{m.request.mailLabel}</span>
            <p>
              {m.request.mailBody}{" "}
              <a href={`mailto:${m.email}`} className="wf-inline-link">{m.email}</a>.
            </p>
          </div>
        </div>
        <div id="aanvragen" className="wf-request-form">
          <MatchRequestForm preset={preset} />
        </div>
      </div>
      </div>

      <Faq items={m.faq} />

      {/* ── Terms and contact ── */}
      <section className="wf-end" aria-labelledby="wf-end-title">
        <div className="wf-end-grid">
          <nav aria-labelledby="wf-links-title">
            <h2 id="wf-links-title" className="wf-label">{m.end.linksLabel}</h2>
            <ul className="wf-included wf-links">
              {m.end.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>
                    {link.label}
                    <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <span className="wf-label">{m.end.contactLabel}</span>
            <h2 id="wf-end-title" className="pdc-svc-cta-title wf-end-title">
              {m.end.title1} <span>{m.end.title2}</span>
            </h2>
            <p className="wf-end-body">{m.end.body}</p>
            <a href={`mailto:${m.email}`} className="pdc-btn pdc-btn-invert wf-mail-btn">{m.email}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
