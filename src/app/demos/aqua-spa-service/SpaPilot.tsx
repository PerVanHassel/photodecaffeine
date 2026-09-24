import { useMemo, useRef, useState, type FormEvent } from "react";
import { SPA_BRANDS } from "./data";
import { DonePanel, Field, IMG, SubmitButton, TEL, TEL_LABEL, mailto, settle, useValidation } from "./shared";

const RULES = {
  naam: { required: true },
  telefoon: { required: true },
  email: { required: true, email: true },
  toestel: { required: true },
};

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
          src={`${IMG}/meer-1024.jpg`}
          srcSet={`${IMG}/meer-1024.jpg 1024w, ${IMG}/meer-1536.jpg 1536w`}
          sizes="100vw"
          width={1024}
          height={683}
          decoding="async"
          alt="Buitenjacuzzi aan een meer bij avondlicht."
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

      <section className="section">
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
                <div className="formfoot">
                  <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                    Verstuur uw vraag
                  </SubmitButton>
                </div>
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
