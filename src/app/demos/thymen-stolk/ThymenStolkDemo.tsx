import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import "./thymen.css";

/**
 * Demo homepage for Thymen Stolk, photojournalist in Dordrecht.
 *
 * A newspaper front page taken seriously: the opening frame is the photograph,
 * with the masthead set over it, and everything below is newsprint-coloured
 * paper where the articles do the talking. Articles come first because that is
 * what he is hired for.
 *
 * The photographs are stand-ins from the PhotoDeCaffeine library — swap the
 * URLs in PHOTOS for Thymen's own work and nothing else needs to change. The
 * articles are example copy; the outlets are invented on purpose, so nothing
 * here reads as a real clipping from a real paper.
 */

const BASE =
  "https://uunwhesmymkwmkgqkmxy.supabase.co/storage/v1/object/public/portfolio-images-0951c59e/web";

/** `wide` is the 2560px render, `small` the 1280px one. */
const photo = (stem: string) => ({
  wide: `${BASE}/${stem}-2560.jpg`,
  small: `${BASE}/${stem}-1280.jpg`,
});

const PHOTOS = {
  hero: [
    { ...photo("1781109789554-dsc-0117"), alt: "Straatbeeld in de vroege avond", credit: "Binnenstad, 21:04" },
    { ...photo("1780754901356-maj00559"), alt: "Muurschildering in een steeg", credit: "Voorstraat, 14:30" },
    { ...photo("1780756125185-dsc-0068"), alt: "Auto op een verlaten weg bij schemer", credit: "Merwedekade, 19:47" },
  ],
  lead: { ...photo("1786200335009-img-4708"), alt: "Bezoekers op een plein tijdens een evenement" },
  cards: [
    { ...photo("1780755705460-img-0022-tif"), alt: "Portret van een voorbijganger" },
    { ...photo("1780756124987-dsc-0557"), alt: "Straat met geparkeerde auto's in de regen" },
    { ...photo("1780755808020-dsc0300"), alt: "Detail van een gevel in het centrum" },
  ],
  strip: [
    { ...photo("1786200347518-img-4707"), alt: "Publiek langs de kant van de weg", caption: "Reportage" },
    { ...photo("1786200350919-img-4829"), alt: "Twee mensen in gesprek op straat", caption: "Portret" },
    { ...photo("1780754165712-maj00856"), alt: "Stadsgezicht bij zonsondergang", caption: "Stad" },
  ],
  portrait: { ...photo("1780754163434-maj00797"), alt: "Thymen Stolk aan het werk" },
};

const LEAD = {
  kicker: "Reportage",
  outlet: "Stadskrant Dordrecht",
  when: "6 september",
  title: "Een avond op het plein, van opbouw tot laatste kraam",
  standfirst:
    "Van het uitladen van de eerste dranghekken tot de veegwagen om half twee. Een avond lang meelopen met de mensen die het evenement draaiende houden.",
};

const CARDS = [
  {
    kicker: "Portret",
    outlet: "Regio Weekblad",
    when: "29 augustus",
    title: "De man die al veertig jaar de sleutels van de kerk beheert",
  },
  {
    kicker: "Stad",
    outlet: "Rivierenland Nieuws",
    when: "17 augustus",
    title: "Regen boven de Voorstraat, en niemand die het erg vindt",
  },
  {
    kicker: "Achtergrond",
    outlet: "De Merwede Post",
    when: "4 augustus",
    title: "Waarom deze gevels na tachtig jaar eindelijk hun kleur terugkrijgen",
  },
];

const MORE = [
  { when: "22 juli", outlet: "Stadskrant Dordrecht", title: "Hoogwater langs de kade: bewoners leggen zelf de schotten" },
  { when: "9 juli", outlet: "Regio Weekblad", title: "De laatste vaart van een veerpont die generaties overzette" },
  { when: "28 juni", outlet: "Rivierenland Nieuws", title: "Nachtdienst op de spoedpost, in beeld gebracht" },
  { when: "11 juni", outlet: "De Merwede Post", title: "Een wijk die zijn eigen speeltuin terugbouwde" },
];

export function ThymenStolkDemo() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % PHOTOS.hero.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="tsd">
      <Helmet>
        <title>Thymen Stolk — fotojournalist Dordrecht</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </Helmet>

      <header className="tsd-hero">
        <div className="tsd-hero-stage" aria-hidden="true">
          {PHOTOS.hero.map((p, i) => (
            <img
              key={p.wide}
              className={i === frame ? "is-on" : ""}
              src={p.wide}
              srcSet={`${p.small} 1280w, ${p.wide} 2560w`}
              sizes="100vw"
              alt=""
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
        </div>

        <div className="tsd-hero-top">
          <span className="tsd-badge">Demo</span>
          <nav aria-label="Hoofdmenu">
            <a href="#artikelen">Artikelen</a>
            <a href="#werk">Werk</a>
            <a href="#over">Over</a>
            <a href="#contact">Contact</a>
          </nav>
          <span>Dordrecht</span>
        </div>

        <div className="tsd-hero-body">
          <h1 className="tsd-masthead">
            <span><i style={{ animationDelay: "0.06s" }}>Thymen</i></span>
            <span><i className="tsd-thin" style={{ animationDelay: "0.16s" }}>Stolk</i></span>
          </h1>

          <hr className="tsd-rule tsd-hero-rule" />

          <p className="tsd-standfirst">
            Fotojournalist in Dordrecht. Nieuws, stad, en de mensen die er wonen —
            gefotografeerd op de dag zelf, geleverd voor de deadline.
          </p>

          <div className="tsd-hero-foot">
            <span>{PHOTOS.hero[frame].credit} · Foto Thymen Stolk</span>
            <div className="tsd-dots" role="group" aria-label="Kies een openingsfoto">
              {PHOTOS.hero.map((p, i) => (
                <button
                  key={p.wide}
                  type="button"
                  aria-current={i === frame}
                  aria-label={`Foto ${i + 1}: ${p.alt}`}
                  onClick={() => setFrame(i)}
                />
              ))}
            </div>
            <a className="tsd-scroll" href="#artikelen">
              <span>Naar de artikelen</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </header>

      <div className="tsd-strapline">
        <div>
          <span>{today}</span>
          <span>Fotojournalistiek · Reportage · Portret</span>
          <span><b>Beschikbaar</b> voor opdrachten</span>
        </div>
      </div>

      <main>
        <section className="tsd-section tsd-shell" id="artikelen">
          <div className="tsd-section-head">
            <div>
              <p className="tsd-kicker">In de krant</p>
              <h2>Artikelen</h2>
            </div>
            <p>Een selectie van het werk dat is verschenen.</p>
          </div>

          <article className="tsd-lead">
            <figure>
              <img
                src={PHOTOS.lead.small}
                srcSet={`${PHOTOS.lead.small} 1280w, ${PHOTOS.lead.wide} 2560w`}
                sizes="(min-width: 900px) 58vw, 100vw"
                alt={PHOTOS.lead.alt}
                loading="lazy"
                decoding="async"
              />
            </figure>
            <div>
              <p className="tsd-kicker">{LEAD.kicker}</p>
              <h3>{LEAD.title}</h3>
              <p>{LEAD.standfirst}</p>
              <p className="tsd-byline">
                <span className="tsd-outlet">{LEAD.outlet}</span>
                <span>{LEAD.when}</span>
                <span>Tekst &amp; beeld</span>
              </p>
            </div>
          </article>

          <div className="tsd-grid">
            {CARDS.map((item, i) => (
              <article className="tsd-card" key={item.title}>
                <a href="#artikelen">
                  <div className="tsd-frame">
                    <img
                      src={PHOTOS.cards[i].small}
                      alt={PHOTOS.cards[i].alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="tsd-kicker" style={{ marginTop: 12 }}>{item.kicker}</p>
                  <h3>{item.title}</h3>
                </a>
                <p className="tsd-byline">
                  <span className="tsd-outlet">{item.outlet}</span>
                  <span>{item.when}</span>
                </p>
              </article>
            ))}
          </div>

          <div className="tsd-more">
            {MORE.map((item) => (
              <a href="#artikelen" key={item.title}>
                <span className="tsd-when">{item.when}</span>
                <h3>{item.title}</h3>
                <span className="tsd-outlet">{item.outlet}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="tsd-strip" id="werk" aria-label="Werk">
          <div className="tsd-strip-inner">
            {PHOTOS.strip.map((p) => (
              <figure key={p.small}>
                <img src={p.small} alt={p.alt} loading="lazy" decoding="async" />
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="tsd-about tsd-shell" id="over">
          <img
            src={PHOTOS.portrait.small}
            alt={PHOTOS.portrait.alt}
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="tsd-kicker">Over Thymen</p>
            <h2>Dichtbij genoeg om het te zien gebeuren</h2>
            <p>
              Ik fotografeer wat er in en om Dordrecht gebeurt: het nieuws van die dag,
              de mensen erachter, en de stad die er omheen doorgaat. Meestal voor de
              krant, soms voor een opdrachtgever die hetzelfde oog zoekt.
            </p>
            <p>
              Snel ter plaatse, rustig als het moet, en op tijd aangeleverd. Beeld dat
              een verhaal draagt zonder dat het zichzelf op de voorgrond zet.
            </p>
          </div>
        </section>

        <section className="tsd-contact" id="contact">
          <div className="tsd-shell">
            <p className="tsd-kicker" style={{ color: "#d8b48a" }}>Contact</p>
            <h2>Een opdracht, of gewoon even sparren?</h2>
            <p>
              Voor redacties, bedrijven en gemeenten. Vertel kort wat er speelt en
              wanneer het moet staan — dan laat ik weten wat er mogelijk is.
            </p>
            <div className="tsd-actions">
              <a className="tsd-btn" href="#contact">Stuur een bericht</a>
              <a className="tsd-btn is-ghost" href="#werk">Bekijk het werk</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="tsd-footer">
        <div>
          <span>Thymen Stolk · Fotojournalist · Dordrecht</span>
          <span>Demo gemaakt door PhotoDeCaffeine</span>
        </div>
      </footer>
    </div>
  );
}
