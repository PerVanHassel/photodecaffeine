import { useRef, useState, type FormEvent } from "react";
import { ChoiceChips, DonePanel, Field, SubmitButton, TEL, TEL_LABEL, mailto, settle, useValidation } from "./shared";

const RULES = {
  lengte: { required: true },
  breedte: { required: true },
  naam: { required: true },
  telefoon: { required: true },
  email: { required: true, email: true },
  plaats: { required: true },
};

const MODELLEN = ["Vierkant", "Rechthoek", "Rond"];
const OPENT = ["Naar links", "Naar rechts", "Naar voor", "Naar achter"];
const HOEKMATEN = ["13 cm", "18 cm", "Recht, geen bocht", "Weet ik niet"];
const KLEUREN = ["Bruin", "Grijs", "Blauw", "Zwart"];

/**
 * Het coverformulier. Arjan doet dit nu met een PDF en tikt alles over op de
 * sites van zijn leveranciers. Dit vraagt precies wat hij nodig heeft om een
 * prijs te kunnen geven zonder langs te komen.
 *
 * De maten en keuzes komen uit het gesprek van 24-09-2026. De kleuren moeten
 * nog tegen zijn eigen leverancierslijst gelegd worden.
 */
export function Cover() {
  const v = useValidation(RULES);
  const [model, setModel] = useState(MODELLEN[0]);
  const [opent, setOpent] = useState(OPENT[0]);
  const [hoek, setHoek] = useState(HOEKMATEN[0]);
  const [kleur, setKleur] = useState(KLEUREN[0]);
  const [busy, setBusy] = useState(false);
  const [href, setHref] = useState<string | null>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validate(form)) return;
    setBusy(true);
    await settle();
    const d = new FormData(form);
    setHref(
      mailto(`Coveraanvraag van ${d.get("naam")}`, [
        "Aanvraag voor een cover op maat",
        "",
        `Model: ${model}`,
        `Lengte: ${d.get("lengte")} cm`,
        `Breedte: ${d.get("breedte")} cm`,
        `Klapt open: ${opent}`,
        `Hoekmaat: ${hoek}`,
        `Bandjes: ${d.get("bandjes") || "niet opgegeven"}`,
        `Hart op hart tussen de bandjes: ${d.get("hart") || "niet opgegeven"}`,
        `Kleur: ${kleur}`,
        `Merk en type spa: ${d.get("toestel") || "niet opgegeven"}`,
        "",
        `Naam: ${d.get("naam")}`,
        `Telefoon: ${d.get("telefoon")}`,
        `E-mail: ${d.get("email")}`,
        `Postcode en gemeente: ${d.get("plaats")}`,
        `Opmerking: ${d.get("opmerking") || "geen"}`,
      ])
    );
    setBusy(false);
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  return (
    <>
      <section className="pagehead pagehead--narrow">
        <div className="wrap">
          <h1>Een cover op maat, zonder dat wij langskomen</h1>
          <p className="pagehead__lead">
            Geef ons de maten van uw huidige cover door, dan rekenen wij de prijs uit. Twijfelt u over een maat, stuur
            dan een foto mee of bel ons even.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "clamp(24px,4vw,48px)" }}>
        <div className="wrap cover">
          <aside className="cover__help" data-reveal>
            <h2>Waar u op moet letten</h2>
            <dl>
              <dt>
                <i className="ph ph-ruler" aria-hidden="true" />
                Lengte en breedte
              </dt>
              <dd>Meet uw huidige cover, niet de rand van het bad. In centimeters.</dd>
              <dt>
                <i className="ph ph-arrows-out-line-horizontal" aria-hidden="true" />
                Welke kant hij opengaat
              </dt>
              <dd>
                De vouwnaad bepaalt naar welke kant de cover openklapt. Kiest u verkeerd, dan klapt hij open tegen een
                muur en kunt u hem nergens kwijt.
              </dd>
              <dt>
                <i className="ph ph-bounding-box" aria-hidden="true" />
                De hoekmaat
              </dt>
              <dd>
                De bocht van de hoek, bij ons de S-maat, elders de R-maat. Meestal 13 of 18 cm. Zit u ertussenin, dan
                lossen wij dat op.
              </dd>
              <dt>
                <i className="ph ph-link-simple" aria-hidden="true" />
                De bandjes
              </dt>
              <dd>Hoeveel het er zijn, hoe lang ze zijn, en de afstand van hart tot hart tussen twee bandjes.</dd>
            </dl>
          </aside>

          <div className="panel" data-reveal>
            {href === null ? (
              <form noValidate onSubmit={submit}>
                <ChoiceChips label="Model" name="model" options={MODELLEN} value={model} onChange={setModel} />
                <div className="row2">
                  <Field v={v} id="cv-lengte" name="lengte" label="Lengte in cm" required inputMode="text" error="Vul de lengte in." />
                  <Field v={v} id="cv-breedte" name="breedte" label="Breedte in cm" required inputMode="text" error="Vul de breedte in." />
                </div>
                <ChoiceChips
                  label="Naar welke kant klapt de cover open?"
                  name="opent"
                  options={OPENT}
                  value={opent}
                  onChange={setOpent}
                  hint="Ga voor uw spa staan en kijk waar u de cover kwijt kunt."
                />
                <ChoiceChips label="Hoekmaat" name="hoek" options={HOEKMATEN} value={hoek} onChange={setHoek} />
                <div className="row2">
                  <Field v={v} id="cv-bandjes" name="bandjes" label="Aantal en lengte van de bandjes" hint="Bijvoorbeeld: 4 bandjes van 20 cm." />
                  <Field v={v} id="cv-hart" name="hart" label="Hart op hart tussen twee bandjes" hint="In centimeters." />
                </div>
                <ChoiceChips label="Kleur" name="kleur" options={KLEUREN} value={kleur} onChange={setKleur} />
                <Field v={v} id="cv-toestel" name="toestel" label="Merk en type van uw spa" hint="Niet verplicht, maar het helpt ons de maten te controleren." />

                <hr className="rule" />

                <div className="row2">
                  <Field v={v} id="cv-naam" name="naam" label="Naam" required autoComplete="name" error="Vul uw naam in." />
                  <Field v={v} id="cv-tel" name="telefoon" label="Telefoon" required type="tel" inputMode="tel" autoComplete="tel" error="Vul een telefoonnummer in waarop wij u bereiken." />
                </div>
                <div className="row2">
                  <Field v={v} id="cv-email" name="email" label="E-mail" required type="email" autoComplete="email" error="Vul een geldig e-mailadres in." />
                  <Field v={v} id="cv-plaats" name="plaats" label="Postcode en gemeente" required autoComplete="postal-code" error="Vul uw postcode en gemeente in." />
                </div>
                <Field v={v} id="cv-opm" name="opmerking" label="Opmerking" textarea minHeight={90} />

                <div className="formfoot">
                  <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                    Vraag de prijs aan
                  </SubmitButton>
                  <span className="hint">U zit nergens aan vast. Wij sturen eerst de prijs.</span>
                </div>
              </form>
            ) : (
              <DonePanel
                titleRef={doneTitle}
                title="Uw coveraanvraag staat klaar"
                body="Dit is een demo zonder server, dus er is nog niets verstuurd. Open de aanvraag in uw e-mailprogramma, of bel ons meteen."
                href={href}
              />
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="callout" data-reveal>
            <i className="ph ph-info" aria-hidden="true" />
            <p>
              Weet u een maat niet zeker? Bel ons op <a href={TEL}>{TEL_LABEL}</a>. Een verkeerd bestelde cover past
              niet, en dat merkt u pas als hij er is.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
