import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import "./thymen-b.css";

/**
 * Demo B voor Thymen Stolk, persfotograaf in Dordrecht.
 *
 * Waar demo A een krantenvoorpagina is, gaat deze de andere kant op: warm
 * bijna-zwart met ruim afgeronde vlakken, waarin de gepubliceerde
 * weekoverzichten meteen onder de openingsfoto staan. Een artikel opent een
 * leesscherm met de hele fotoserie, en een foto daarbinnen opent groot.
 *
 * De openingsfoto is echt werk van Thymen (FC Dordrecht — Jong Ajax). Al het
 * andere beeld komt uit PHOTOS/RAIL hieronder, met stand-ins van een
 * placeholderdienst, zodat zijn eigen selectie er later in kan zonder dat er
 * verder iets verandert. Er wordt bewust geen krant of redactie bij naam
 * genoemd, zodat niets hier leest als een echte publicatie van een echt blad.
 */

/** Picsum geeft voor elke seed een echte foto terug, dus geen dode links. */
const pic = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const HERO = "/demos/thymen-stolk-b/hero-fc-dordrecht.jpg";

interface Photo {
  /** Eigen bestand; anders wordt seed gebruikt. */
  src?: string;
  seed?: string;
  title: string;
  loc: string;
}

interface Article {
  id: string;
  week: string;
  date: string;
  cat: string;
  place: string;
  title: string;
  lead: string;
  body: string[];
  photos: Photo[];
}

interface RailItem extends Photo {
  cat: string;
  tall?: boolean;
}

const photoSrc = (p: Photo, w: number, h: number) =>
  p.src ?? pic(p.seed ?? "leeg", w, h);

const ARTICLES: Article[] = [
  {
    id: "wk32-brugklep",
    week: "Weekoverzicht 32",
    date: "14-08",
    cat: "Nieuws",
    place: "Papendrecht",
    title: "Brugklep Papendrechtsebrug in z'n geheel zichtbaar",
    lead: "Voor het eerst sinds het begin van de werkzaamheden lag de complete brugklep open en bloot op de kade. Tientallen belangstellenden kwamen kijken.",
    body: [
      "De N3 is dit weekend volledig afgesloten voor het verwisselen van de brugklep. Vanaf de kade was het hele gevaarte in één oogopslag te zien — een aanblik die zich niet snel zal herhalen.",
      "Vanaf een uur of tien verzamelden zich groepjes kijkers langs het water. Ouders met kinderen op de schouders, fietsers die even afstapten, en een enkele buurtbewoner die het hele karwei vanaf het balkon volgde.",
      "De werkzaamheden duren tot maandagochtend vroeg. Tot die tijd blijft het verkeer omgeleid.",
    ],
    photos: [
      { seed: "brugklep-a", title: "De klep ligt volledig op de kade", loc: "Papendrecht — 14-08" },
      { seed: "brugklep-b", title: "Toeschouwers volgen de hijswerkzaamheden", loc: "Papendrecht — 14-08" },
      { seed: "brugklep-c", title: "Monteurs maken de kabels los", loc: "Papendrecht — 14-08" },
      { seed: "brugklep-d", title: "De N3 volledig afgesloten", loc: "Papendrecht — 14-08" },
      { seed: "brugklep-e", title: "Zicht op de brug vanaf het water", loc: "Papendrecht — 14-08" },
    ],
  },
  {
    id: "wk32-pasarmalam",
    week: "Weekoverzicht 32",
    date: "13-08",
    cat: "Evenementen",
    place: "Dordrecht",
    title: "Pasar Malam in het Weizigtpark blijkt groot succes",
    lead: "Drie dagen lang rook het park naar saté, sambal en pandan. De organisatie sprak van een recordopkomst.",
    body: [
      "Al ruim voor de officiële opening stond er een rij tot aan de ingang van het park. Wie eenmaal binnen was, schoof aan bij de lange tafels tussen de kramen.",
      "Naast het eten was er een doorlopend podiumprogramma met muziek en dans. 's Avonds kleurden de lampionnen het hele park oranje.",
      "Volgend jaar keert de Pasar Malam terug, mogelijk met een dag extra.",
    ],
    photos: [
      { seed: "pasar-a", title: "Bezoekers schuiven aan tussen de kramen", loc: "Weizigtpark — 13-08" },
      { seed: "pasar-b", title: "Saté van de gloeiende grill", loc: "Weizigtpark — 13-08" },
      { seed: "pasar-c", title: "Dansgroep opent het avondprogramma", loc: "Weizigtpark — 13-08" },
      { seed: "pasar-d", title: "Lampionnen kleuren het park", loc: "Weizigtpark — 13-08" },
    ],
  },
  {
    id: "fcd-jongajax",
    week: "Weekoverzicht 32",
    date: "07-08",
    cat: "Sport",
    place: "Krommedijk, Dordrecht",
    title: "FC Dordrecht wint de eerste wedstrijd met 2–1",
    lead: "Een uitverkochte Krommedijk zag de ploeg de competitie openen met een overwinning. De beslissende treffer viel acht minuten voor tijd.",
    body: [
      "Het seizoen begon zoals de trainer het had getekend: fel, hoog druk zetten en vroeg de openingstreffer. De tegenstander kwam er in de eerste helft nauwelijks aan te pas.",
      "Na rust kantelde het beeld. De bezoekers trokken de stand gelijk en drukten door, tot in de 82e minuut de bevrijdende 2–1 viel. Het gebaar dat daarop volgde ging het weekend rond.",
      "Op de tribunes bleef het nog lang onrustig. Voor het eerst sinds jaren stond de Krommedijk weer helemaal vol.",
    ],
    photos: [
      { src: HERO, title: "Het saluut na de 2–1", loc: "Krommedijk — 07-08" },
      { seed: "fcd-b", title: "Volle tribunes bij de aftrap", loc: "Krommedijk — 07-08" },
      { seed: "fcd-c", title: "Duel op het middenveld", loc: "Krommedijk — 07-08" },
      { seed: "fcd-d", title: "De trainer langs de lijn", loc: "Krommedijk — 07-08" },
      { seed: "fcd-e", title: "Supporters vieren het slotsignaal", loc: "Krommedijk — 07-08" },
    ],
  },
  {
    id: "wk29-bigrivers",
    week: "Weekoverzicht 29",
    date: "18-07",
    cat: "Evenementen",
    place: "Dordrecht",
    title: "Drie dagen muziek door de hele binnenstad",
    lead: "Van het Scheffersplein tot aan de Nieuwe Haven: het festival vulde opnieuw elk plein in de stad met publiek.",
    body: [
      "Het is al jaren het moment waarop de binnenstad in zijn geheel podium wordt. Op vijftien locaties speelden bands van 's middags tot diep in de avond.",
      "Het weer werkte mee. Waar vorig jaar de regen nog roet in het eten gooide, bleef het dit keer de hele zaterdag droog en warm.",
      "Het aantal bezoekers wordt geschat op ruim honderdduizend over drie dagen.",
    ],
    photos: [
      { seed: "rivers-a", title: "Publiek op het Scheffersplein", loc: "Dordrecht — 18-07" },
      { seed: "rivers-b", title: "Optreden aan de Nieuwe Haven", loc: "Dordrecht — 18-07" },
      { seed: "rivers-c", title: "Avondlicht over het festivalterrein", loc: "Dordrecht — 18-07" },
      { seed: "rivers-d", title: "Meezingen bij het slotconcert", loc: "Dordrecht — 18-07" },
    ],
  },
  {
    id: "wk27-fandag",
    week: "Weekoverzicht 27",
    date: "09-07",
    cat: "Sport",
    place: "Krommedijk, Dordrecht",
    title: "Fandag trekt veel bekijks aan de Krommedijk",
    lead: "Handtekeningen, een open training en een volle middenstip: de club opende de deuren voor de aanhang.",
    body: [
      "Vanaf twaalf uur stroomde het stadion vol. Kinderen stonden in de rij voor een handtekening, de nieuwe aanwinsten werden een voor een voorgesteld.",
      "In de tweede helft van de middag stond een open training op het programma, waarbij de selectie zich voor het eerst in het nieuwe tenue liet zien.",
      "Het was de best bezochte fandag in jaren.",
    ],
    photos: [
      { seed: "fandag-a", title: "Rij voor handtekeningen", loc: "Krommedijk — 09-07" },
      { seed: "fandag-b", title: "De selectie stelt zich voor", loc: "Krommedijk — 09-07" },
      { seed: "fandag-c", title: "Open training voor publiek", loc: "Krommedijk — 09-07" },
    ],
  },
  {
    id: "wk26-hitte",
    week: "Weekoverzicht 26",
    date: "25-06",
    cat: "Nieuws",
    place: "Dordrecht",
    title: "Verkoeling gezocht tijdens aanhoudende hitte",
    lead: "Met ruim 34 graden zocht de stad massaal het water op. Bij de fonteinen op het Statenplein was het de hele dag druk.",
    body: [
      "Er gold code geel voor de hele provincie. In de binnenstad bleef het tot laat in de avond warm tussen de gevels.",
      "Bij de stadsstranden langs de Merwede lagen de handdoeken dicht op elkaar. De oproep was om voldoende te drinken en de middaguren binnen door te brengen.",
      "Pas tegen het einde van de week bracht een onweersbui verkoeling.",
    ],
    photos: [
      { seed: "hitte-a", title: "Kinderen bij de fontein", loc: "Statenplein — 25-06" },
      { seed: "hitte-b", title: "Schaduw zoeken op het plein", loc: "Dordrecht — 25-06" },
      { seed: "hitte-c", title: "Afkoeling langs de Merwede", loc: "Dordrecht — 25-06" },
    ],
  },
  {
    id: "wk25-stadsgezicht",
    week: "Weekoverzicht 25",
    date: "24-06",
    cat: "Stadsleven",
    place: "Dordrecht",
    title: "Ochtendlicht over de Voorstraathaven",
    lead: "Soms is er geen nieuws en is de stad zelf het verhaal. Een ronde door Dordrecht op een doodgewone woensdagochtend.",
    body: [
      "Om kwart over zes ligt de Voorstraathaven er nog helemaal stil bij. Alleen de bakker en de eerste bezorgers zijn wakker.",
      "Een uur later komt de stad op gang: rolluiken gaan omhoog, de veerpont vaart af, en op de markt worden de kramen opgebouwd.",
      "Beeld uit dit soort ochtenden belandt zelden op de voorpagina, maar vormt wel het geheugen van een stad.",
    ],
    photos: [
      { seed: "stad-a", title: "Stil water in de Voorstraathaven", loc: "Dordrecht — 24-06" },
      { seed: "stad-b", title: "De eerste veerpont van de dag", loc: "Dordrecht — 24-06" },
      { seed: "stad-c", title: "Opbouw van de weekmarkt", loc: "Grote Markt — 24-06" },
      { seed: "stad-d", title: "Gevels in het ochtendlicht", loc: "Dordrecht — 24-06" },
    ],
  },
];

const RAIL: RailItem[] = [
  { src: HERO, cat: "sport", title: "Het saluut na de 2–1", loc: "Krommedijk, 07-08" },
  { seed: "rail-brug", cat: "nieuws", title: "Brugklep op de kade", loc: "Papendrecht, 14-08" },
  { seed: "rail-pasar", cat: "evenementen", tall: true, title: "Lampionnen in het Weizigtpark", loc: "Dordrecht, 13-08" },
  { seed: "rail-supporters", cat: "sport", title: "Uitverkochte Krommedijk", loc: "Dordrecht, 07-08" },
  { seed: "rail-haven", cat: "stad", tall: true, title: "Ochtend aan de Voorstraathaven", loc: "Dordrecht, 24-06" },
  { seed: "rail-rivers", cat: "evenementen", title: "Festival op het Scheffersplein", loc: "Dordrecht, 18-07" },
  { seed: "rail-brand", cat: "nieuws", title: "Brand in de binnenstad", loc: "Dordrecht, 14-08" },
  { seed: "rail-markt", cat: "stad", title: "Weekmarkt op de Grote Markt", loc: "Dordrecht, 20-07" },
  { seed: "rail-training", cat: "sport", tall: true, title: "Eerste training van het seizoen", loc: "Krommedijk, 05-07" },
  { seed: "rail-hitte", cat: "nieuws", title: "Verkoeling tijdens de hitte", loc: "Statenplein, 25-06" },
  { seed: "rail-kermis", cat: "evenementen", title: "Kermis op het Weizigtplein", loc: "Dordrecht, 16-07" },
  { seed: "rail-merwede", cat: "stad", title: "Zicht op de Merwede", loc: "Dordrecht, 18-07" },
];

const CATS = [
  { key: "all", label: "Alles" },
  { key: "sport", label: "Sport" },
  { key: "nieuws", label: "Nieuws" },
  { key: "evenementen", label: "Evenementen" },
  { key: "stad", label: "Stadsleven" },
];

const FACTS = [
  { value: "15", unit: "+", label: "jaar in de regio" },
  { value: "880", label: "weekoverzichten online" },
  { value: "<30", unit: "min", label: "ter plaatse bij spotnieuws" },
  { value: "24/7", label: "bereikbaar voor redacties" },
];

const SERVICES = [
  {
    no: "01",
    title: "Spotnieuws",
    text: "Direct ter plaatse bij incidenten, brand en weer. Beeld aangeleverd terwijl het verhaal nog geschreven wordt.",
    points: ["Levering binnen het uur", "Bijschrift, locatie en tijd erbij", "Dag en nacht bereikbaar"],
  },
  {
    no: "02",
    title: "Sport & evenementen",
    text: "Wedstrijdverslagen, festivals en stadsevenementen. Compleet beeldverslag, dezelfde avond nog in je systeem.",
    points: ["Clubs uit de regio", "Festivals en stadsevenementen", "Seizoensafspraken mogelijk"],
  },
  {
    no: "03",
    title: "Beeldlicenties",
    text: "Meer dan tien jaar Dordrecht in beeld. Archief doorzoekbaar en beschikbaar per publicatie of op abonnement.",
    points: ["Eenmalig, jaarlijks of doorlopend", "Heldere voorwaarden vooraf", "Naamsvermelding conform afspraak"],
  },
];

interface Shot {
  src: string;
  tag: string;
  title: string;
  loc: string;
}

export function ThymenStolkBDemo() {
  const [navOpen, setNavOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [reading, setReading] = useState<Article | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [shot, setShot] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDialogElement>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);

  const shownRail = RAIL.filter((r) => filter === "all" || r.cat === filter);

  /* Onthullen bij binnenscrollen, maar alleen als de bezoeker beweging wil. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    targets.forEach((t) => t.classList.add("tsb-reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  /* Leesscherm openen en sluiten via het dialoogelement zelf. */
  useEffect(() => {
    const dialog = readerRef.current;
    if (!dialog) return;
    if (!reading) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>(".tsb-reader-scroll")?.scrollTo(0, 0);
  }, [reading]);

  const stepShot = useCallback((by: number) => {
    setShot((i) => (i === null ? i : (i + by + shots.length) % shots.length));
  }, [shots.length]);

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (shot === null) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();

    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { e.preventDefault(); stepShot(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stepShot(-1); }
    }
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, [shot, stepShot]);

  const openArticleShots = (article: Article, index: number) => {
    setShots(
      article.photos.map((p) => ({
        src: photoSrc(p, 1600, 1100),
        tag: article.cat,
        title: p.title,
        loc: p.loc,
      }))
    );
    setShot(index);
  };

  const openRailShot = (index: number) => {
    setShots(
      shownRail.map((r) => ({
        src: photoSrc(r, 1600, 1100),
        tag: CATS.find((c) => c.key === r.cat)?.label ?? r.cat,
        title: r.title,
        loc: r.loc,
      }))
    );
    setShot(index);
  };

  const scrollRail = (dir: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.querySelector<HTMLElement>(".tsb-rail-item");
    const amount = first ? first.offsetWidth + 16 : 320;
    rail.scrollBy({ left: dir * amount * 2, behavior: "smooth" });
  };

  const feature = ARTICLES[0];
  const rest = ARTICLES.slice(1);
  const viewing = shot === null ? null : shots[shot];

  return (
    <div className="tsb" ref={rootRef}>
      <Helmet>
        <title>Thymen Stolk — persfotograaf Dordrecht</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </Helmet>

      <p className="tsb-strip">
        <span className="tsb-dot" aria-hidden="true" />
        Demo — de openingsfoto is eigen werk, het overige beeld is tijdelijk.
      </p>

      <header className="tsb-hero">
        <div className="tsb-hero-media">
          {/* Geen loading="lazy": dit is het openingsbeeld en moet er meteen zijn. */}
          <img
            src={HERO}
            alt="Speler viert zijn treffer met een saluut, knielend voor het doel"
            decoding="async"
          />
        </div>
        <div className="tsb-hero-veil" aria-hidden="true" />

        <div className="tsb-hero-top">
          <span className="tsb-brand">
            <span className="tsb-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 8.5h3.2L9 6h6l1.8 2.5H20v10H4z" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.4" />
              </svg>
            </span>
            <span className="tsb-brand-text">
              <strong>THYMEN STOLK</strong>
              <span>Fotojournalistiek · Dordrecht</span>
            </span>
          </span>

          <nav
            className={navOpen ? "tsb-nav is-open" : "tsb-nav"}
            aria-label="Hoofdmenu"
            onClick={() => setNavOpen(false)}
          >
            <a href="#tsb-weekoverzicht">Weekoverzicht</a>
            <a href="#tsb-werk">Werk</a>
            <a href="#tsb-over">Over</a>
            <a href="#tsb-diensten">Diensten</a>
          </nav>

          <a href="#tsb-contact" className="tsb-btn-ghost tsb-hero-cta">Beeld aanvragen</a>

          <button
            type="button"
            className="tsb-nav-toggle"
            aria-label="Menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span /><span />
          </button>
        </div>

        <div className="tsb-hero-bottom">
          <div>
            <h1>Het nieuws van<br />Dordrecht, elke week<br />opnieuw vastgelegd</h1>
            <div className="tsb-tags">
              <span>Nieuws</span>
              <span>Sport</span>
              <span>Evenementen</span>
              <span>Spotnieuws</span>
              <span>Stadsleven</span>
            </div>
          </div>

          <div className="tsb-hero-right">
            <span className="tsb-live">
              <span className="tsb-dot" aria-hidden="true" />
              Laatst gepubliceerd
            </span>
            <div className="tsb-previews">
              {ARTICLES.slice(0, 2).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="tsb-preview"
                  onClick={() => setReading(a)}
                >
                  <img src={photoSrc(a.photos[0], 400, 280)} alt="" loading="lazy" decoding="async" />
                  <span className="tsb-preview-body">
                    <span className="tsb-preview-title">{a.title}</span>
                    <span className="tsb-preview-date">{a.date}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="tsb-hero-credit">
          FC Dordrecht wint met 2–1 · Krommedijk, 07-08 · Foto Thymen Stolk
        </p>
      </header>

      <main>
        <section className="tsb-section" id="tsb-weekoverzicht">
          <div className="tsb-sec-head" data-reveal>
            <p className="tsb-sec-label"><span>(01)</span>Weekoverzicht</p>
            <h2 className="tsb-statement">
              <b>Elke week</b> het verhaal van de stad — <b>gepubliceerd</b> zodra het
              gebeurd is, <b>gearchiveerd</b> zodat het blijft
            </h2>
          </div>

          <button
            type="button"
            className="tsb-feature"
            data-reveal
            onClick={() => setReading(feature)}
          >
            <span className="tsb-feature-media">
              <img
                src={photoSrc(feature.photos[0], 1800, 800)}
                alt={feature.photos[0].title}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="tsb-feature-count">{feature.photos.length} beelden</span>
            <span className="tsb-feature-overlay">
              <span>
                <span className="tsb-feature-meta">
                  <span className="tsb-chip">{feature.cat}</span>
                  {feature.week} · {feature.date}
                </span>
                <h3>{feature.title}</h3>
              </span>
              <span className="tsb-feature-read">Lees het verslag →</span>
            </span>
          </button>

          <div className="tsb-archive" data-reveal>
            <div className="tsb-archive-head">
              <span>Eerder verschenen</span>
              <a href="#tsb-weekoverzicht" className="tsb-btn-ghost tsb-btn-ghost-sm">
                Volledig archief
              </a>
            </div>
            <div className="tsb-archive-list">
              {rest.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="tsb-row"
                  onClick={() => setReading(a)}
                >
                  <span className="tsb-row-date">{a.date}</span>
                  <span className="tsb-row-title">
                    {a.title}
                    <span className="tsb-row-sub">
                      {a.cat} · {a.place} · {a.photos.length} beelden
                    </span>
                  </span>
                  <span className="tsb-row-thumbs">
                    {a.photos.slice(0, 3).map((p) => (
                      <img
                        key={p.title}
                        src={photoSrc(p, 200, 150)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </span>
                  <span className="tsb-row-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="tsb-section" id="tsb-over">
          <div className="tsb-sec-head" data-reveal>
            <p className="tsb-sec-label"><span>(02)</span>Over mij</p>
            <h2 className="tsb-statement">
              <b>Fotograferen</b> is voor mij niet wachten op het mooiste licht, maar{" "}
              <b>er zijn</b> op het moment dat het <b>er toe doet</b>
            </h2>
          </div>

          <div className="tsb-about" data-reveal>
            <div className="tsb-about-portrait">
              <img
                src={pic("thymen-portret", 900, 1120)}
                alt="Thymen Stolk met camera in de hand"
                loading="lazy"
                decoding="async"
              />
              <span className="tsb-about-badge">Dordrecht &amp; omstreken</span>
            </div>

            <div className="tsb-about-body">
              <p className="tsb-lead">
                Ik ben Thymen Stolk. Al ruim vijftien jaar leg ik vast wat er speelt in
                Dordrecht — van een brand in de binnenstad tot de laatste minuut op de
                Krommedijk.
              </p>
              <p>
                Wat begon met een camera langs het veld van de plaatselijke club groeide uit
                tot een vaste plek achter het nieuws van de regio. Redacties bellen me omdat
                ze weten dat het beeld er is voordat het verhaal geschreven is.
              </p>
              <p>
                Geen geposeerde plaatjes, maar het echte moment: het gebaar na de goal, de
                rook boven een dak, de stilte op een plein na het nieuws.
              </p>

              <ul className="tsb-facts">
                {FACTS.map((f) => (
                  <li key={f.label}>
                    <b>
                      {f.value}
                      {f.unit ? <span>{f.unit}</span> : null}
                    </b>
                    {f.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="tsb-section" id="tsb-werk">
          <div className="tsb-panel" data-reveal>
            <div className="tsb-panel-head">
              <div>
                <p className="tsb-sec-label"><span>(03)</span>Het werk</p>
                <h2 className="tsb-panel-title">
                  Beeld dat het verhaal<br />vertelt zonder onderschrift
                </h2>
              </div>
              <div className="tsb-cats" role="tablist" aria-label="Filter op categorie">
                {CATS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === c.key}
                    onClick={() => setFilter(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tsb-rail" ref={railRef}>
              {shownRail.map((r, i) => (
                <button
                  key={r.title}
                  type="button"
                  className={r.tall ? "tsb-rail-item is-tall" : "tsb-rail-item"}
                  onClick={() => openRailShot(i)}
                >
                  <span className="tsb-rail-thumb">
                    <img
                      src={photoSrc(r, 900, r.tall ? 1200 : 700)}
                      alt={`${r.title}, ${r.loc}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="tsb-rail-cap">
                    <strong>{r.title}</strong>
                    <span>{r.loc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="tsb-rail-foot">
              <p className="tsb-rail-hint">Sleep of scroll opzij · klik voor groot beeld</p>
              <div className="tsb-rail-nav">
                <button type="button" aria-label="Vorige beelden" onClick={() => scrollRail(-1)}>‹</button>
                <button type="button" aria-label="Volgende beelden" onClick={() => scrollRail(1)}>›</button>
              </div>
            </div>
          </div>
        </section>

        <section className="tsb-section" id="tsb-diensten">
          <div className="tsb-sec-head" data-reveal>
            <p className="tsb-sec-label"><span>(04)</span>Diensten &amp; licenties</p>
            <h2 className="tsb-statement">
              Van <b>losse opdracht</b> tot <b>vaste samenwerking</b> — en beeld dat je{" "}
              <b>zonder gedoe</b> mag gebruiken
            </h2>
          </div>

          <div className="tsb-cards" data-reveal>
            {SERVICES.map((s) => (
              <div className="tsb-card" key={s.no}>
                <p className="tsb-card-num">{s.no}</p>
                <h3>{s.title}</h3>
                <p className="tsb-card-text">{s.text}</p>
                <ul>
                  {s.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="tsb-section" id="tsb-contact">
          <div className="tsb-panel tsb-panel-contact" data-reveal>
            <div>
              <p className="tsb-sec-label"><span>(05)</span>Contact</p>
              <h2 className="tsb-panel-title">Nieuws wacht niet.<br />Bel gerust direct.</h2>
              <p className="tsb-contact-text">
                Voor spotnieuws ben ik het snelst bereikbaar via telefoon. Opdrachten,
                licenties en samenwerkingen mogen per mail — meestal dezelfde dag antwoord.
              </p>

              <div className="tsb-contact-direct">
                <a href="tel:+31600000000">
                  <span>Telefoon — spotnieuws</span>
                  <strong>+31 6 00 00 00 00</strong>
                </a>
                <a href="mailto:info@thymenstolk.nl">
                  <span>E-mail</span>
                  <strong>info@thymenstolk.nl</strong>
                </a>
              </div>
            </div>

            <form
              className="tsb-form"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                window.setTimeout(() => setSent(false), 2400);
              }}
            >
              <div className="tsb-form-row">
                <div className="tsb-field">
                  <label htmlFor="tsb-naam">Naam</label>
                  <input id="tsb-naam" name="naam" type="text" placeholder="Je naam" />
                </div>
                <div className="tsb-field">
                  <label htmlFor="tsb-org">Redactie of bedrijf</label>
                  <input id="tsb-org" name="org" type="text" placeholder="Optioneel" />
                </div>
              </div>
              <div className="tsb-field">
                <label htmlFor="tsb-email">E-mailadres</label>
                <input id="tsb-email" name="email" type="email" placeholder="jij@redactie.nl" />
              </div>
              <div className="tsb-field">
                <label htmlFor="tsb-soort">Waar gaat het over?</label>
                <select id="tsb-soort" name="soort">
                  <option>Spotnieuws</option>
                  <option>Sport of evenement</option>
                  <option>Beeld uit het archief</option>
                  <option>Vaste samenwerking</option>
                  <option>Iets anders</option>
                </select>
              </div>
              <div className="tsb-field">
                <label htmlFor="tsb-bericht">Bericht</label>
                <textarea id="tsb-bericht" name="bericht" placeholder="Datum, locatie, wat je nodig hebt…" />
              </div>
              <button type="submit" className="tsb-btn-solid">
                {sent ? "Verstuurd (demo)" : "Versturen"}
              </button>
              <p className="tsb-form-note">Demo — dit formulier verstuurt nog niets.</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="tsb-footer">
        <div className="tsb-footer-top">
          <div>
            <p className="tsb-footer-label">Thymen Stolk Fotografie</p>
            <p className="tsb-footer-meta">Dordrecht · beeld op aanvraag beschikbaar</p>
          </div>
          <div className="tsb-footer-links">
            <a href="#tsb-weekoverzicht">Weekoverzicht</a>
            <a href="#tsb-werk">Werk</a>
            <a href="#tsb-diensten">Diensten</a>
            <a href="#tsb-contact">Contact</a>
          </div>
        </div>
        <p className="tsb-footer-wordmark" aria-hidden="true">STOLK</p>
        <p className="tsb-footer-fine">
          Demo-ontwerp · alle beeld van Thymen Stolk is auteursrechtelijk beschermd
        </p>
      </footer>

      <dialog
        className="tsb-reader"
        ref={readerRef}
        onClose={() => setReading(null)}
        onCancel={() => setReading(null)}
      >
        <button
          type="button"
          className="tsb-reader-close"
          aria-label="Artikel sluiten"
          onClick={() => setReading(null)}
        >
          ✕
        </button>
        <div className="tsb-reader-scroll">
          {reading ? (
            <article className="tsb-reader-inner">
              <p className="tsb-reader-meta">
                <span className="tsb-chip">{reading.cat}</span>
                {reading.week} · {reading.date} · {reading.place}
              </p>
              <h1>{reading.title}</h1>
              <p className="tsb-reader-lead">{reading.lead}</p>
              <div className="tsb-reader-body">
                {reading.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
              </div>
              <div className="tsb-reader-gallery">
                {reading.photos.map((p, i) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => openArticleShots(reading, i)}
                  >
                    <img
                      src={photoSrc(p, 1200, 800)}
                      alt={`${p.title}, ${p.loc}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
              <p className="tsb-reader-credit">
                Alle beeld © Thymen Stolk Fotografie. Overname uitsluitend na toestemming.
              </p>
            </article>
          ) : null}
        </div>
      </dialog>

      <dialog
        className="tsb-lb"
        ref={lightboxRef}
        onClose={() => setShot(null)}
        onCancel={() => setShot(null)}
      >
        <button
          type="button"
          className="tsb-lb-close"
          aria-label="Sluiten"
          onClick={() => setShot(null)}
        >
          ✕
        </button>
        <button
          type="button"
          className="tsb-lb-nav tsb-lb-prev"
          aria-label="Vorige foto"
          onClick={() => stepShot(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="tsb-lb-nav tsb-lb-next"
          aria-label="Volgende foto"
          onClick={() => stepShot(1)}
        >
          ›
        </button>
        {viewing ? (
          <figure className="tsb-lb-figure">
            <img src={viewing.src} alt={`${viewing.title}, ${viewing.loc}`} decoding="async" />
            <figcaption>
              <span className="tsb-lb-tag">{viewing.tag}</span>
              <span className="tsb-lb-title">{viewing.title}</span>
              <span className="tsb-lb-loc">{viewing.loc}</span>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </div>
  );
}
