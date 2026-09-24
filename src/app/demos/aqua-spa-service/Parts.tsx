import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { PART_GROUPS, SPA_BRANDS } from "./data";
import { DonePanel, Field, IMG, SubmitButton, TEL, TEL_LABEL, mailto, settle, useValidation } from "./shared";

const RULES = {
  naam: { required: true },
  telefoon: { required: true },
  email: { email: true },
  toestel: { required: true },
  onderdeel: { required: true },
};

/**
 * Onderdelen aanvragen. Dit verving de webshop na het gesprek van 24-09-2026:
 * geen winkelmand en geen prijzen, maar een aanvraag die Arjan zelf opzoekt
 * bij zijn leveranciers.
 */
export function Parts() {
  const v = useValidation(RULES);
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
    const foto = (form.elements.namedItem("foto") as HTMLInputElement | null)?.files?.[0];
    setHref(
      mailto(`Onderdeel gezocht: ${d.get("toestel")}`, [
        `Naam: ${d.get("naam")}`,
        `Telefoon: ${d.get("telefoon")}`,
        `E-mail: ${d.get("email") || "niet opgegeven"}`,
        `Merk en type: ${d.get("toestel")}`,
        "",
        "Gezocht onderdeel:",
        String(d.get("onderdeel") ?? ""),
        "",
        foto ? `Foto: ${foto.name} (voeg deze toe als bijlage)` : "Geen foto",
      ])
    );
    setBusy(false);
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  return (
    <>
      <section className="pagehead">
        <div className="wrap pagehead__grid">
          <div>
            <h1>Onderdelen voor alle merken spa's en sauna's</h1>
            <p className="pagehead__lead">
              Wij houden geen webwinkel bij. U zegt wat u zoekt en van welk toestel, wij zoeken het op bij onze
              leveranciers en sturen u de prijs en de levertijd.
            </p>
            <div className="pagehead__cta">
              <a className="btn btn--primary" href="#aanvraag">
                <i className="ph ph-magnifying-glass" aria-hidden="true" />
                Vraag een onderdeel aan
              </a>
              <a className="btn btn--ghost" href={TEL}>
                <i className="ph ph-phone" aria-hidden="true" />
                Bel {TEL_LABEL}
              </a>
            </div>
          </div>
          <div className="pagehead__media">
            <img
              src={`${IMG}/bruisend-683.jpg`}
              width={683}
              height={1024}
              decoding="async"
              alt="Close-up van bruisend water in een jacuzzi met bedieningsknoppen op de rand."
            />
          </div>
        </div>
      </section>

      <section className="promise" aria-label="Hoe een aanvraag werkt">
        <div className="wrap">
          <ul>
            <li>
              <i className="ph ph-chat-teardrop-text" aria-hidden="true" />
              U stuurt merk, type en wat u zoekt
            </li>
            <li>
              <i className="ph ph-magnifying-glass" aria-hidden="true" />
              Wij zoeken het op bij onze leveranciers
            </li>
            <li>
              <i className="ph ph-receipt" aria-hidden="true" />
              U krijgt de prijs en de levertijd, dan pas beslist u
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head" data-reveal>
            <h2>Wat wij leveren</h2>
            <p>Staat uw onderdeel er niet bij, vraag het dan gewoon. Wij leveren voor veel meer merken dan hier passen.</p>
          </div>

          <div className="groupgrid" data-reveal>
            {PART_GROUPS.map((g) => (
              <article className="groupcard" key={g.id}>
                <i className={`ph ${g.icon}`} aria-hidden="true" />
                <h3>{g.label}</h3>
                <p>{g.body}</p>
                <ul className="chips">
                  {g.brands.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="coverbanner" data-reveal>
            <div>
              <h2>Een cover op maat?</h2>
              <p>
                Het enige waarvoor wij zonder langskomen een prijs kunnen geven. Geef ons de maten door, dan rekenen wij
                het uit.
              </p>
            </div>
            <Link className="btn btn--primary" to={{ search: "?p=cover" }}>
              <i className="ph ph-square-half" aria-hidden="true" />
              Naar het coverformulier
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="aanvraag" style={{ paddingTop: 0 }}>
        <div className="wrap request">
          <div className="request__intro" data-reveal>
            <h2>Vertel wat u zoekt</h2>
            <p>Hoe meer wij weten, hoe sneller het juiste onderdeel op tafel ligt.</p>
            <ol>
              <li>
                <i className="ph ph-camera" aria-hidden="true" />
                <span>
                  <strong>Neem een foto</strong> van het typeplaatje of van het onderdeel zelf.
                </span>
              </li>
              <li>
                <i className="ph ph-chat-teardrop-text" aria-hidden="true" />
                <span>
                  <strong>Beschrijf wat u zoekt</strong>, en wat er misgaat als het om een defect gaat.
                </span>
              </li>
              <li>
                <i className="ph ph-check-circle" aria-hidden="true" />
                <span>
                  <strong>Wij laten u weten</strong> of wij het hebben, wat het kost en hoe snel het er is.
                </span>
              </li>
            </ol>
          </div>

          <div className="panel" data-reveal>
            {href === null ? (
              <form noValidate onSubmit={submit}>
                <div className="row2">
                  <Field v={v} id="pt-naam" name="naam" label="Naam" required autoComplete="name" error="Vul uw naam in." />
                  <Field v={v} id="pt-tel" name="telefoon" label="Telefoon" required type="tel" inputMode="tel" autoComplete="tel" error="Vul een telefoonnummer in waarop wij u bereiken." />
                </div>
                <div className="row2">
                  <Field v={v} id="pt-email" name="email" label="E-mail" type="email" autoComplete="email" error="Dit e-mailadres lijkt niet te kloppen." />
                  <Field v={v} id="pt-toestel" name="toestel" label="Merk en type van uw toestel" required error='Vul het merk en type in, of schrijf "onbekend".' />
                </div>
                <Field
                  v={v}
                  id="pt-onderdeel"
                  name="onderdeel"
                  label="Welk onderdeel zoekt u?"
                  required
                  textarea
                  hint="Bijvoorbeeld: circulatiepomp, verwarmingselement, jet van 5 cm, filter."
                  error="Beschrijf kort welk onderdeel u zoekt."
                />
                <Field
                  v={v}
                  id="pt-foto"
                  name="foto"
                  label="Foto van typeplaatje of onderdeel"
                  type="file"
                  accept="image/*"
                  hint="Niet verplicht, maar het scheelt ons vaak een heen en weer."
                />
                <div className="formfoot">
                  <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                    Verstuur aanvraag
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <DonePanel
                titleRef={doneTitle}
                title="Uw aanvraag staat klaar"
                body="Dit is een demo zonder server, dus er is nog niets verstuurd. Open de aanvraag in uw e-mailprogramma en voeg de foto toe als bijlage, of bel ons meteen."
                href={href}
              />
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section__head" data-reveal>
            <h2>Merken waarvoor wij werken</h2>
          </div>
          <ul className="chips chips--wide" data-reveal>
            {SPA_BRANDS.map((b) => (
              <li key={b}>{b}</li>
            ))}
            <li className="chips__more">en vele andere</li>
          </ul>
        </div>
      </section>
    </>
  );
}
