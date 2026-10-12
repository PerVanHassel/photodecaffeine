import { useMemo, useRef, useState, type FormEvent } from "react";
import { SPA_BRANDS } from "./data";
import {
  BELMOMENT_OPTIES,
  BelmomentChips,
  DonePanel,
  Field,
  IMG,
  PrivacyNote,
  SubmitButton,
  TEL,
  TEL_LABEL,
  belmomentTekst,
  mailto,
  settle,
  useValidation,
} from "./shared";

const RULES = {
  naam: { required: true },
  telefoon: { required: true },
  email: { required: true, email: true },
  toestel: { required: true },
};

/*
 * Hoe het werkt, nagekeken bij de fabrikant (Zavepower, 12-10-2026): Balboa BP
 * en Gecko in.ye, wifi op 2,4 GHz, in de app een maximumprijs, de temperatuur,
 * een planner voor wanneer u in bad wilt, en meteen verwarmen.
 */
const STAPPEN = [
  {
    title: "Wij plaatsen een kastje op uw besturing",
    body: "Spa Pilot komt op de besturing die al in uw spa zit, een Balboa BP of een Gecko in.ye. Er gaat niets uit. Wij sluiten het aan en verbinden het met uw wifi. Dat duurt ongeveer een uur.",
  },
  {
    title: "Het volgt de stroomprijs per kwartier",
    body: "De stroomprijzen voor de volgende dag liggen vooraf vast. Spa Pilot leest ze en zoekt de goedkoopste kwartieren uit om te verwarmen. Staat de prijs hoog, dan wacht hij.",
  },
  {
    title: "U stelt de grenzen in de app",
    body: "U kiest de temperatuur en tot welke prijs hij mag verwarmen. Zegt u wanneer u in bad wilt, dan is het water op dat moment warm, verwarmd in de goedkoopste kwartieren ervoor.",
  },
  {
    title: "U houdt zelf de controle",
    body: "Wilt u meteen warm water, dan zet u de verwarming in de app gewoon aan. U ziet er ook wat uw spa verbruikt, ook als u niet thuis bent.",
  },
];

const EISEN = [
  {
    icon: "ph-cpu",
    title: "Een Balboa BP of Gecko in.ye besturing",
    body: "Spa Pilot wordt op uw bestaande besturing geplugd. Weet u niet welke u heeft, stuur dan een foto van het paneel.",
  },
  {
    icon: "ph-wifi-high",
    title: "Wifi op 2,4 GHz, bij de spa",
    body: "Het kastje praat alleen op 2,4 GHz. Staat uw spa achteraan in de tuin zonder bereik, dan heeft het geen zin.",
  },
  {
    icon: "ph-lightning",
    title: "Een dynamisch energietarief",
    body: "De prijs per kwartier stuurt het systeem aan. Met een vast tarief valt er niets te verschuiven.",
  },
];

export function SpaPilot() {
  const v = useValidation(RULES);
  const [q, setQ] = useState("");
  const [belmoment, setBelmoment] = useState(BELMOMENT_OPTIES[3]);
  const [busy, setBusy] = useState(false);
  const [href, setHref] = useState<string | null>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SPA_BRANDS;
    return SPA_BRANDS.filter((b) => b.toLowerCase().includes(needle));
  }, [q]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validate(form)) return;
    setBusy(true);
    await settle();
    const d = new FormData(form);
    setHref(
      mailto(`Spa Pilot: vraag van ${d.get("naam")}`, [
        "Vraag over Spa Pilot",
        "",
        `Merk en type spa: ${d.get("toestel")}`,
        `Besturing: ${d.get("besturing") || "onbekend"}`,
        `Dynamisch tarief: ${d.get("tarief") || "niet opgegeven"}`,
        `Voorkeur belmoment: ${belmomentTekst(belmoment)}`,
        "",
        `Naam: ${d.get("naam")}`,
        `Telefoon: ${d.get("telefoon")}`,
        `E-mail: ${d.get("email")}`,
        `Vraag: ${d.get("vraag") || "geen"}`,
      ])
    );
    setBusy(false);
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  return (
    <>
      <section className="pilothero">
        <img
          src={`${IMG}/schuim-1024.jpg`}
          srcSet={`${IMG}/schuim-1024.jpg 1024w, ${IMG}/schuim-1536.jpg 1536w`}
          sizes="100vw"
          width={1024}
          height={683}
          decoding="async"
          alt="Bovenaanzicht van bruisend spawater naast een houten terras met glazen."
        />
        <div className="wrap pilothero__body">
          <h1>Uw spa verwarmt wanneer stroom goedkoop is</h1>
          <p>
            Spa Pilot is een kastje op uw bestaande besturing. Het volgt de stroomprijs per kwartier en verwarmt wanneer
            die laag staat. U stelt zelf in vanaf welke prijs hij aanslaat en wanneer hij stopt.
          </p>
          <div className="pilothero__cta">
            <a className="btn btn--onimage" href="#pilot-vraag">
              <i className="ph ph-chat-teardrop-text" aria-hidden="true" />
              Vraag na of het bij u kan
            </a>
            <a className="btn btn--ghostlight" href={TEL}>
              <i className="ph ph-phone" aria-hidden="true" />
              Bel {TEL_LABEL}
            </a>
          </div>
        </div>
      </section>

      {/* Eerst wat het is en hoe het werkt, pas daarna wat u ervoor nodig heeft. */}
      <section className="section">
        <div className="wrap flow">
          <div className="flow__head" data-reveal>
            <h2>Wat is Spa Pilot?</h2>
            <p>
              Een spa staat dag en nacht op temperatuur, en het verwarmen kost het meeste stroom. Met een dynamisch
              energiecontract betaalt u elk kwartier een andere prijs. Op sommige momenten van de dag is stroom veel
              goedkoper dan op andere.
            </p>
            <p>
              Spa Pilot schuift het verwarmen op naar die goedkope momenten. Een goed geïsoleerde spa koelt maar
              langzaam af, dus het water is warm wanneer u erin wilt.
            </p>
          </div>
          <ol className="flow__steps" data-reveal>
            {STAPPEN.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="callout callout--plain" data-reveal>
            <i className="ph ph-info" aria-hidden="true" />
            <p>
              Wat het oplevert hangt af van uw tarief en hoe u de spa gebruikt. Wij draaien het nu bij eigen klanten en
              zetten hier pas cijfers neer als die een heel seizoen achter de rug hebben. Liever geen belofte dan een
              belofte die niet klopt.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section__head" data-reveal>
            <h2>Wat u nodig heeft</h2>
            <p>Drie dingen moeten kloppen. Twijfelt u over een ervan, vraag het ons dan eerst.</p>
          </div>
          <div className="eisen" data-reveal>
            {EISEN.map((e) => (
              <article key={e.title}>
                <i className={`ph ${e.icon}`} aria-hidden="true" />
                <h3>{e.title}</h3>
                <p>{e.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section__head" data-reveal>
            <h2>Werkt het op uw spa?</h2>
            <p>Zoek uw merk op. Staat het er niet bij, vraag het dan even na; de lijst groeit nog.</p>
          </div>

          <div className="brandsearch" data-reveal>
            <label htmlFor="pilot-q">Zoek uw merk</label>
            <i className="ph ph-magnifying-glass" aria-hidden="true" />
            <input
              id="pilot-q"
              type="search"
              autoComplete="off"
              placeholder="Bijvoorbeeld: Sundance"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {found.length > 0 ? (
            <ul className="chips chips--wide" data-reveal>
              {found.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <div className="callout" role="status">
              <i className="ph ph-question" aria-hidden="true" />
              <p>
                Dat merk staat nog niet in onze lijst. Dat betekent niet dat het niet kan: het gaat om de besturing, niet
                om het merk. Stuur ons een foto van uw bedieningspaneel.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap pilotprice" data-reveal>
          <div>
            <h2>Wat het kost</h2>
            <p>
              Installeren duurt ongeveer een uur. Wij sluiten aan, koppelen aan uw wifi en zetten de grenzen samen met u
              goed.
            </p>
          </div>
          <dl>
            <div>
              <dt>Het kastje</dt>
              <dd>vanaf &euro; 495</dd>
            </div>
            <div>
              <dt>Geplaatst door ons</dt>
              <dd>vanaf &euro; 695</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section" id="pilot-vraag" style={{ paddingTop: 0 }}>
        <div className="wrap request">
          <div className="request__intro" data-reveal>
            <h2>Kan het bij u?</h2>
            <p>
              Stuur ons uw merk en besturing, dan zeggen wij of het past en wat het bij u kost. U zit nergens aan vast.
            </p>
          </div>

          <div className="panel" data-reveal>
            {href === null ? (
              <form noValidate onSubmit={submit}>
                <div className="row2">
                  <Field v={v} id="sp-naam" name="naam" label="Naam" required autoComplete="name" error="Vul uw naam in." />
                  <Field v={v} id="sp-tel" name="telefoon" label="Telefoon" required type="tel" inputMode="tel" autoComplete="tel" error="Vul een telefoonnummer in waarop wij u bereiken." />
                </div>
                <div className="row2">
                  <Field v={v} id="sp-email" name="email" label="E-mail" required type="email" autoComplete="email" error="Vul een geldig e-mailadres in." />
                  <Field v={v} id="sp-toestel" name="toestel" label="Merk en type van uw spa" required error='Vul het merk en type in, of schrijf "onbekend".' />
                </div>
                <div className="row2">
                  <Field v={v} id="sp-besturing" name="besturing" label="Welke besturing zit erin?" hint="Staat op het paneel of onder het zijpaneel. Weet u het niet, laat het leeg." />
                  <Field v={v} id="sp-tarief" name="tarief" label="Heeft u een dynamisch tarief?" hint="Ja, nee, of weet ik niet." />
                </div>
                <Field v={v} id="sp-vraag" name="vraag" label="Uw vraag" textarea minHeight={90} />
                <BelmomentChips value={belmoment} onChange={setBelmoment} />
                <div className="formfoot">
                  <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                    Verstuur uw vraag
                  </SubmitButton>
                </div>
                <PrivacyNote />
              </form>
            ) : (
              <DonePanel
                titleRef={doneTitle}
                title="Uw vraag staat klaar"
                body="Dit is een demo zonder server, dus er is nog niets verstuurd. Open de vraag in uw e-mailprogramma, of bel ons meteen."
                href={href}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
