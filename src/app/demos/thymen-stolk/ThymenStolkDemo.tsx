import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import "./thymen.css";

/**
 * Demo homepage for Thymen Stolk, photojournalist in Dordrecht.
 *
 * A newspaper front page taken seriously: the opening frame is the
 * photograph with the name over it, and everything below is
 * newsprint-coloured paper where the articles lead, because published work is
 * what he is hired for.
 *
 * Every photograph comes from PHOTOS below — stand-ins from a placeholder
 * service, one line each, so swapping in Thymen's own work (or Unsplash
 * links) touches nothing else. Outlets and headlines are invented on purpose,
 * so nothing here reads as a real clipping from a real paper.
 */

/** Picsum returns a real photograph for any seed, so no link can go stale. */
const pic = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const PHOTOS = {
  hero: [
    { src: pic("dordt-avond", 2400, 1350), alt: "Straatbeeld in de vroege avond", credit: "Binnenstad, 21:04" },
    { src: pic("dordt-markt", 2400, 1350), alt: "Marktkramen worden opgebouwd", credit: "Statenplein, 06:12" },
    { src: pic("dordt-kade", 2400, 1350), alt: "Kade langs het water bij schemer", credit: "Merwedekade, 19:47" },
  ],
  lead: { src: pic("dordt-plein", 1600, 1067), alt: "Bezoekers op een plein tijdens een evenement" },
  cards: [
    { src: pic("dordt-portret", 1200, 900), alt: "Portret van een man voor een kerkdeur" },
    { src: pic("dordt-regen", 1200, 900), alt: "Natte straat met weerspiegelingen" },
    { src: pic("dordt-gevel", 1200, 900), alt: "Detail van een historische gevel" },
  ],
  strip: [
    { src: pic("werk-reportage", 1200, 900), alt: "Publiek langs de kant van de weg", caption: "Reportage — hoogwater" },
    { src: pic("werk-portret", 1200, 900), alt: "Twee mensen in gesprek op straat", caption: "Portret — buurtwerk" },
    { src: pic("werk-stad", 1200, 900), alt: "Stadsgezicht bij zonsondergang", caption: "Stad — de kade" },
    { src: pic("werk-nacht", 1200, 900), alt: "Nachtelijke straat met lantaarns", caption: "Nacht — spoedpost" },
  ],
  portrait: { src: pic("thymen-portret", 900, 1200), alt: "Thymen Stolk aan het werk" },
};

const FACTS = [
  { label: "Actief sinds", value: "2014" },
  { label: "Publicaties", value: "600", unit: "+" },
  { label: "Reactie binnen", value: "2", unit: "uur" },
  { label: "Levering", value: "24", unit: "uur" },
];

const LEAD = {
  kicker: "Reportage",
  outlet: "Stadskrant Dordrecht",
  when: "6 september",
  read: "7 foto's",
  title: "Een avond op het plein, van de eerste dranghekken tot de laatste kraam",
  standfirst:
    "Van het uitladen om vier uur 's middags tot de veegwagen om half twee 's nachts. Een avond meelopen met de mensen die het evenement draaiende houden — en die zelden op de foto komen.",
  caption: "Opbouw van het podium, twee uur voor de eerste bezoeker binnen is.",
};

const CARDS = [
  {
    kicker: "Portret",
    outlet: "Regio Weekblad",
    when: "29 augustus",
    read: "4 foto's",
    title: "De man die al veertig jaar de sleutels beheert",
    excerpt: "Elke ochtend om zes uur opent hij de deuren. Een portret van iemand die de stad eerder wakker ziet worden dan de stad zelf.",
  },
  {
    kicker: "Stad",
    outlet: "Rivierenland Nieuws",
    when: "17 augustus",
    read: "6 foto's",
    title: "Regen boven de Voorstraat, en niemand die het erg vindt",
    excerpt: "Een middag waarop het plensde en de terrassen toch vol bleven. Beeld van een stad die niet snel van slag is.",
  },
  {
    kicker: "Achtergrond",
    outlet: "De Merwede Post",
    when: "4 augustus",
    read: "5 foto's",
    title: "Waarom deze gevels hun kleur terugkrijgen",
    excerpt: "Na tachtig jaar grijs gaat er weer verf overheen. Wat dat betekent voor de mensen die erachter wonen.",
  },
];

const MORE = [
  { when: "22 juli", outlet: "Stadskrant Dordrecht", title: "Hoogwater langs de kade: bewoners leggen zelf de schotten" },
  { when: "9 juli", outlet: "Regio Weekblad", title: "De laatste vaart van een veerpont die generaties overzette" },
  { when: "28 juni", outlet: "Rivierenland Nieuws", title: "Nachtdienst op de spoedpost, in beeld gebracht" },
  { when: "11 juni", outlet: "De Merwede Post", title: "Een wijk die zijn eigen speeltuin terugbouwde" },
  { when: "30 mei", outlet: "Stadskrant Dordrecht", title: "Vijf generaties op één binnenplaats, één keer per jaar bij elkaar" },
];

const STEPS = [
  {
    no: "01",
    title: "Je belt of mailt",
    body: "Vertel kort wat er speelt, waar het is en wanneer het moet staan. Binnen twee uur weet je of het lukt.",
  },
  {
    no: "02",
    title: "Ik ben er",
    body: "Op locatie, met eigen licht als het moet. Ik werk rustig en val niet op — dat levert de beste beelden op.",
  },
  {
    no: "03",
    title: "Beeld voor de deadline",
    body: "Geselecteerd, bijgesneden en met bijschrift aangeleverd. Standaard binnen 24 uur, spoed dezelfde avond.",
  },
];

const KIT = [
  ["Werkgebied", "Dordrecht e.o."],
  ["Onderwerpen", "Nieuws, portret, stad"],
  ["Levering", "Digitaal, met bijschrift"],
  ["Ook mogelijk", "Video, korte reportage"],
];

export function ThymenStolkDemo() {
  const [frame, setFrame] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % PHOTOS.hero.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const step = useCallback((by: number) => {
    setViewing((i) => (i === null ? i : (i + by + PHOTOS.strip.length) % PHOTOS.strip.length));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (viewing === null) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();

    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    }
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, [viewing, step]);

  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const shown = viewing === null ? null : PHOTOS.strip[viewing];

  return (
    <div className="tsd">
      <Helmet>
        <title>Thymen Stolk — fotojournalist Dordrecht</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </Helmet>

      <header className="tsd-hero">
        <div className="tsd-hero-stage" aria-hidden="true">
          {PHOTOS.hero.map((p, i) => (
            <img
              key={p.src}
              className={i === frame ? "is-on" : ""}
              src={p.src}
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
            <a href="#werkwijze">Werkwijze</a>
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
                  key={p.src}
                  type="button"
                  aria-current={i === frame}
                  aria-label={`Foto ${i + 1}: ${p.alt}`}
                  onClick={() => setFrame(i)}
                />
              ))}
            </div>
            <a href="#artikelen">
              <span>Naar de artikelen</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </header>

      <div className="tsd-strapline">
        <div>
          <span>{today}</span>
          <span>Nieuws · Reportage · Portret</span>
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
            <p>Een selectie van het werk dat de afgelopen maanden is verschenen.</p>
          </div>

          <article className="tsd-lead">
            <figure>
              <img src={PHOTOS.lead.src} alt={PHOTOS.lead.alt} loading="lazy" decoding="async" />
              <figcaption>{LEAD.caption}</figcaption>
            </figure>
            <div>
              <p className="tsd-kicker">{LEAD.kicker}</p>
              <h3>{LEAD.title}</h3>
              <p>{LEAD.standfirst}</p>
              <p className="tsd-byline">
                <span className="tsd-outlet">{LEAD.outlet}</span>
                <span className="tsd-sep">·</span>
                <span>{LEAD.when}</span>
                <span className="tsd-sep">·</span>
                <span>{LEAD.read}</span>
              </p>
            </div>
          </article>

          <div className="tsd-grid">
            {CARDS.map((item, i) => (
              <article className="tsd-card" key={item.title}>
                <a href="#artikelen">
                  <div className="tsd-frame">
                    <img src={PHOTOS.cards[i].src} alt={PHOTOS.cards[i].alt} loading="lazy" decoding="async" />
                  </div>
                  <p className="tsd-kicker" style={{ marginTop: 14 }}>{item.kicker}</p>
                  <h3>{item.title}</h3>
                </a>
                <p className="tsd-excerpt">{item.excerpt}</p>
                <p className="tsd-byline">
                  <span className="tsd-outlet">{item.outlet}</span>
                  <span className="tsd-sep">·</span>
                  <span>{item.when}</span>
                  <span className="tsd-sep">·</span>
                  <span>{item.read}</span>
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

          <dl className="tsd-facts">
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}{f.unit && <small>{f.unit}</small>}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="tsd-strip" id="werk" aria-label="Werk">
          <div className="tsd-strip-inner">
            {PHOTOS.strip.map((p, i) => (
              <figure key={p.src} style={{ margin: 0 }}>
                <button type="button" onClick={() => setViewing(i)}>
                  <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
                  <figcaption>{p.caption}</figcaption>
                </button>
              </figure>
            ))}
          </div>
        </section>

        <section className="tsd-section tsd-shell" id="werkwijze">
          <div className="tsd-section-head">
            <div>
              <p className="tsd-kicker">Werkwijze</p>
              <h2>Hoe het gaat</h2>
            </div>
            <p>Van telefoontje tot aangeleverd beeld, meestal binnen een dag.</p>
          </div>
          <div className="tsd-steps">
            {STEPS.map((s) => (
              <article key={s.no}>
                <span className="tsd-step-no">{s.no}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="tsd-about tsd-shell" id="over">
          <img src={PHOTOS.portrait.src} alt={PHOTOS.portrait.alt} loading="lazy" decoding="async" />
          <div>
            <p className="tsd-kicker">Over Thymen</p>
            <h2>Dichtbij genoeg om het te zien gebeuren</h2>
            <p>
              Ik fotografeer wat er in en om Dordrecht gebeurt: het nieuws van die dag,
              de mensen erachter, en de stad die er omheen doorgaat. Meestal voor de
              krant, soms voor een bedrijf of gemeente die hetzelfde oog zoekt.
            </p>
            <p>
              Snel ter plaatse, rustig als het moet, en op tijd aangeleverd. Beeld dat
              een verhaal draagt zonder dat het zichzelf op de voorgrond zet — en
              waar de mensen op de foto zich in herkennen.
            </p>
            <ul className="tsd-kit">
              {KIT.map(([k, v]) => (
                <li key={k}><span>{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="tsd-contact" id="contact">
          <div className="tsd-shell">
            <p className="tsd-kicker" style={{ color: "#e0b98e" }}>Contact</p>
            <h2>Een opdracht, of gewoon even sparren?</h2>
            <p>
              Voor redacties, bedrijven en gemeenten. Vertel kort wat er speelt en
              wanneer het moet staan — dan laat ik weten wat er mogelijk is.
            </p>
            <div className="tsd-actions">
              <a className="tsd-btn" href="#contact">Stuur een bericht</a>
              <a className="tsd-btn is-ghost" href="#werk">Bekijk het werk</a>
            </div>
            <div className="tsd-reach">
              <div><span>Mail</span><a href="#contact">hallo@thymenstolk.nl</a></div>
              <div><span>Telefoon</span><a href="#contact">06 12 34 56 78</a></div>
              <div><span>Spoed</span>Bel gerust, ook 's avonds</div>
              <div><span>Werkgebied</span>Dordrecht en omstreken</div>
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

      <dialog className="tsd-viewer" ref={dialogRef} onClose={() => setViewing(null)}>
        {shown && (
          <div className="tsd-viewer-inner">
            <figure>
              <img src={shown.src} alt={shown.alt} />
            </figure>
            <div className="tsd-viewer-bar">
              <p>{shown.caption} — {shown.alt}</p>
              <button type="button" onClick={() => step(-1)} aria-label="Vorige foto">← Vorige</button>
              <button type="button" onClick={() => step(1)} aria-label="Volgende foto">Volgende →</button>
              <button type="button" onClick={() => setViewing(null)}>Sluiten</button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
