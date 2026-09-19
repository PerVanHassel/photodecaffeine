import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Field, IMG, MAIL, Stars, SubmitButton, TEL, TEL_LABEL, mailto, settle, useValidation } from "./shared";

const SPA_BRANDS = [
  "Aquamarine", "Balbao Spa", "Aquavia", "Nordic Hot Tub", "PDC Spa", "Beachcomber", "Platinum Spa",
  "Caldera", "Reflections", "Charisma", "Sunbelt", "Sundance", "Dimension One", "Coleman", "Gulf Coast",
  "Sun Spa", "Hydro Spa", "Thermo Spa", "Hydropool", "US Spa", "Portcril", "Jacuzzi", "Omni Hot Tub", "Jazzi",
];

/*
 * Reviews: Google-bedrijfsprofiel, overgenomen via hennax.fr/aqua-spa-service
 * (geraadpleegd 19-09-2026): gemiddeld 4,8/5 uit 27 reviews. Teksten letterlijk,
 * soms ingekort met (...). Google toont daar geen namen of datums. Voor livegang
 * nakijken in het Google-profiel, of vervangen door de Google Places API.
 */
const REVIEWS = [
  "Arjan Houter van Aqua Spa Service zorgt al meer dan 15 jaar voor onze 8 plaatsen-jacuzzi. (...) Altijd heeft hij de problemen in een korte tijd opgelost. Zeer aan te bevelen!",
  "Hij levert een onderhoudsservice die je in feite bij grote verkopers van spa's niet snel zal vinden.",
  "Super service, heel tevreden over, ze zoeken mee naar oplossingen die een andere firma fout geïnstalleerd heeft!",
  "Snel en vakkundig. Steeds geholpen met efficientie en kostenbesparing in het achterhoofd.",
  "Heel vriendelijk contact, uitstekende service, uitgebreide expertise. Een echte aanrader!",
  "Supervriendelijk en behulpzaam! Degelijke uitleg gekregen en wordt goed opgevolgd in hun systeem.",
];

const FAQ = [
  {
    q: "Na het verversen van het water doen de jets of de verwarming het niet meer",
    a: "Hoogstwaarschijnlijk zit er een luchtbel in de pomp. Start de pomp een aantal keer na elkaar, met ongeveer 15 seconden tussen elke poging. Heeft u een open filterpot, ga er dan enkele keren mee op en neer met een ontstoppingsrubber. Zo duwt u de luchtbel uit de pomp. Werkt dat niet, bel ons dan voor verder advies of een interventie.",
  },
  {
    q: "Mijn cover wordt steeds zwaarder",
    a: "Een nieuwe spacover weegt ongeveer 25 kg. Wordt uw cover zwaarder, dan is de beschermfolie rond de isolatie versleten en laat ze waterdamp door. Dat water krijgt u er nooit meer uit en de cover verliest zijn isolatiewaarde. Vervangen is dan de enige oplossing. Een coverlift helpt maar gedeeltelijk: hij is berekend op 25 kg en buigt of breekt onder een natte cover, of de vouwnaad scheurt onder het gewicht.",
  },
  {
    q: "Mijn spa verwarmt niet meer",
    a: "Kijk eerst of het water nog circuleert. Als dat zo is, verwijder de filters en herstart de spa door de stroomvoorziening ongeveer 20 seconden te onderbreken. Daarmee reset u de besturing. Begint hij weer te verwarmen, reinig of vervang dan de filters. Verwarmt hij nog altijd niet, of is er geen circulatie, bel ons dan.",
  },
  {
    q: "Komen jullie ter plaatse?",
    a: "Ja. Wij komen met de servicebus en hebben een grote onderdelenvoorraad aan boord. Daardoor kunnen wij een defect meestal meteen herstellen.",
  },
];

const CONTACT_RULES = {
  naam: { required: true },
  telefoon: { required: true },
  email: { email: true },
  plaats: { required: true },
  klacht: { required: true },
};

export function Home() {
  return (
    <>
      <Hero />
      <Facts />
      <Statement />
      <Services />
      <Flow />
      <Reviews />
      <Brands />
      <HeatPump />
      <Faq />
      <Contact />
    </>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero__grid">
        <div>
          <h1>
            Uw spa hersteld.
            <br />
            Meestal in één beurt.
          </h1>
          <p className="hero__lead">
            Onderhoud en herstelling van jacuzzi's, whirlpools, sauna's en stoomcabines. Alle merken. Wij verkopen
            niets, wij herstellen.
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href={TEL}>
              <i className="ph ph-phone" aria-hidden="true" />
              Bel {TEL_LABEL}
            </a>
            <a className="btn btn--ghost" href="#contact">
              <i className="ph ph-chat-teardrop-text" aria-hidden="true" />
              Beschrijf uw probleem
            </a>
          </div>
        </div>
        <div className="hero__media">
          <img
            src={`${IMG}/dakterras-1024.jpg`}
            srcSet={`${IMG}/dakterras-1024.jpg 1024w, ${IMG}/dakterras-1536.jpg 1536w`}
            sizes="(max-width: 899px) 100vw, 44vw"
            width={1024}
            height={683}
            decoding="async"
            alt="Ingebouwde spa op een houten dakterras bij zonsondergang, met de cover ernaast."
          />
        </div>
      </div>
    </section>
  );
}

function Facts() {
  return (
    <section className="facts" aria-label="Kort over Aqua Spa Service">
      <div className="wrap">
        <ul>
          <li>
            <i className="ph ph-clock" aria-hidden="true" />
            Actief sinds 2006
          </li>
          <li>
            <i className="ph ph-seal-check" aria-hidden="true" />
            Servicepunt Jacuzzi&reg; Italië
          </li>
          <li>
            <i className="ph ph-package" aria-hidden="true" />
            Onderdelen mee in de bus
          </li>
          <li>
            <i className="ph-fill ph-star" aria-hidden="true" style={{ color: "#e0a526" }} />
            <a href="#reviews" style={{ textDecoration: "none" }}>
              4,8 op 5 in 27 Google-reviews
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}

function Statement() {
  return (
    <section className="section statement">
      <div className="wrap">
        <h2 data-reveal>Wij verkopen geen spa's.</h2>
        <div className="statement__cols" data-reveal>
          <p>
            De wellnessmarkt zit vol handelaars die spa's en andere wellnessapparatuur verkopen en daarna slecht of
            niet meer thuisgeven. Sommige zijn binnen enkele jaren gewoon verdwenen. U blijft achter met een toestel
            dat niemand nog wil bekijken.
          </p>
          <p>
            Wij zijn een service- en adviesbedrijf. Wij stellen de diagnose, zeggen vooraf wat de herstelling kost, en
            zeggen het ook eerlijk wanneer herstellen niet meer loont. Slechte isolatie blijft stroom vreten. Slecht
            aangelegd leidingwerk blijft lekken.
          </p>
        </div>
        <div className="band" data-reveal>
          <img
            src={`${IMG}/terras-zee-1024.jpg`}
            width={1024}
            height={360}
            loading="lazy"
            decoding="async"
            alt="Vierkante jacuzzi met houten ombouw en rieten zitbanken op een terras aan zee."
          />
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="section" id="diensten">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <h2>Waarvoor u ons belt</h2>
          <p>
            Van een pomp die niet meer aanslaat tot een cover die is doorgezakt. Wij doen het werk, en leveren de
            onderdelen die erbij horen.
          </p>
        </div>

        <div className="bento">
          <article className="cell cell--lead" data-reveal>
            <img
              src={`${IMG}/bruisend-683.jpg`}
              width={683}
              height={1024}
              loading="lazy"
              decoding="async"
              alt="Close-up van bruisend water in een jacuzzi met bedieningsknoppen op de rand."
            />
            <div className="cell__body">
              <h3>Jacuzzi's en whirlpools</h3>
              <p>
                Pompen, besturingen, verwarmingselementen, jets en lekkages. Wij werken op alle merken, ook op
                toestellen waarvan de verkoper niet meer bestaat.
              </p>
            </div>
          </article>

          <article className="cell cell--b" data-reveal>
            <i className="ph ph-fire" aria-hidden="true" />
            <h3>Sauna's</h3>
            <p>Onderhoud en herstelling, met onderdelen van Tylo, Harvia en Jacuzzi.</p>
          </article>

          <article className="cell cell--c" data-reveal>
            <i className="ph ph-drop" aria-hidden="true" />
            <h3>Stoomcabines en hammam</h3>
            <p>Stoomgeneratoren en besturingen van Tylo, Harvia, Jacuzzi en Effegibi.</p>
          </article>

          <article className="cell cell--tint" data-reveal>
            <i className="ph ph-square-half" aria-hidden="true" />
            <h3>Covers op maat</h3>
            <p>Voor elke spa en zwemspa, op uw afmetingen. Ook coverlifts, trapjes en leuningen.</p>
          </article>

          <article className="cell" data-reveal>
            <i className="ph ph-gear-six" aria-hidden="true" />
            <h3>Onderdelen en producten</h3>
            <p>Pompen, besturingen, verwarmingselementen, jets, pvc en onderhoudsproducten.</p>
            <Link className="cell__link" to={{ search: "?p=webshop" }}>
              Naar de webshop <i className="ph ph-arrow-right" aria-hidden="true" />
            </Link>
          </article>

          <article className="cell cell--outline" data-reveal>
            <i className="ph ph-warning-circle" aria-hidden="true" />
            <h3>Wat we niet doen</h3>
            <p>Opblaasbare spa's herstellen wij niet. Onderdelen kunnen wij er wel voor leveren.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Flow() {
  return (
    <section className="section">
      <div className="wrap flow">
        <div className="flow__head" data-reveal>
          <h2>Zo verloopt een herstelling</h2>
          <p>Geen verrassingen achteraf. U weet wat er stuk is en wat het kost voor wij eraan beginnen.</p>
        </div>
        <ol className="flow__steps" data-reveal>
          <li>
            <h3>U belt of mailt</h3>
            <p>
              Beschrijf wat er misgaat en welk merk en type u heeft. Hoe concreter, hoe gerichter wij de juiste
              onderdelen meenemen.
            </p>
          </li>
          <li>
            <h3>Diagnose ter plaatse</h3>
            <p>
              Wij zoeken het defect op en geven u een duidelijk beeld van de kosten. Loont de herstelling niet meer,
              dan zeggen we dat ook.
            </p>
          </li>
          <li>
            <h3>Meestal meteen hersteld</h3>
            <p>De servicebus heeft een grote onderdelenvoorraad aan boord. Daardoor blijft het vaak bij één bezoek.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="section" id="reviews">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <h2>Wat klanten zeggen</h2>
          <div className="score">
            <span className="score__num">4,8</span>
            <Stars half label="4,8 van 5 sterren" />
            <span className="score__meta">
              27 reviews op Google.{" "}
              <a
                href="https://www.google.com/maps/search/?api=1&query=Aqua+Spa+Service+Sluisstraat+31+9130+Verrebroek"
                rel="noopener"
              >
                Bekijk ze allemaal
              </a>
            </span>
          </div>
        </div>
        <div className="quotes" data-reveal>
          {REVIEWS.map((text, i) => (
            <figure className={i === 0 ? "quote quote--lead" : "quote"} key={i}>
              <blockquote>&ldquo;{text}&rdquo;</blockquote>
              <figcaption>
                <Stars label="5 van 5 sterren" />
                Google-review
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Brands() {
  return (
    <section className="section" id="merken">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <h2>Wij werken op alle merken</h2>
          <p>Een greep uit de spamerken waarvoor wij herstellen en onderdelen leveren.</p>
        </div>
      </div>

      <div className="marquee" aria-label="Spamerken waarvoor wij onderdelen leveren">
        <div className="marquee__track">
          <ul>
            {SPA_BRANDS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <ul aria-hidden="true">
            {SPA_BRANDS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="wrap">
        <div className="groups" data-reveal>
          <div>
            <h3>Sauna</h3>
            <ul className="chips">
              {["Tylo", "Harvia", "Jacuzzi"].map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Hammam</h3>
            <ul className="chips">
              {["Tylo", "Harvia", "Jacuzzi", "Effegibi"].map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Componenten</h3>
            <ul className="chips">
              {["Balboa", "Gecko", "Aqua-Flo", "Laing", "Espa", "Sam", "Waterway", "LX", "Pentair", "Dimension One"].map(
                (b) => (
                  <li key={b}>{b}</li>
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeatPump() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="promo" data-reveal>
          <img
            src={`${IMG}/meer-1024.jpg`}
            srcSet={`${IMG}/meer-1024.jpg 1024w, ${IMG}/meer-1536.jpg 1536w`}
            sizes="100vw"
            width={1024}
            height={683}
            loading="lazy"
            decoding="async"
            alt="Twee mensen ontspannen in een buitenjacuzzi aan een meer."
          />
          <div className="promo__body">
            <h2>Warmtepomp op uw spa aansluiten?</h2>
            <p>Wij sluiten warmtepompen aan op spa's en jacuzzi's. Bel ons vrijblijvend voor de mogelijkheden op uw toestel.</p>
            <a className="btn btn--onimage" href={TEL}>
              <i className="ph ph-phone" aria-hidden="true" />
              Bel {TEL_LABEL}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="section" id="vragen">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <h2>Probeer dit eerst zelf</h2>
          <p>De klachten die wij het vaakst horen. Vaak lost u ze op zonder interventie.</p>
        </div>
        <div className="faq" data-reveal>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <i className="ph ph-caret-down" aria-hidden="true" />
              </summary>
              <div className="faq__body">
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const v = useValidation(CONTACT_RULES);
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
      mailto(`Serviceaanvraag van ${d.get("naam")}`, [
        `Naam: ${d.get("naam")}`,
        `Telefoon: ${d.get("telefoon")}`,
        `E-mail: ${d.get("email") || "niet opgegeven"}`,
        `Postcode en gemeente: ${d.get("plaats")}`,
        `Merk en type: ${d.get("toestel") || "niet opgegeven"}`,
        "",
        "Klacht:",
        String(d.get("klacht") ?? ""),
      ])
    );
    setBusy(false);
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  return (
    <section className="section" id="contact">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <h2>Vertel wat er misgaat</h2>
          <p>Hoe meer u kwijt kunt over merk, type en klacht, hoe gerichter wij de juiste onderdelen meenemen.</p>
        </div>

        <div className="contact">
          <div className="panel" data-reveal>
            {href === null ? (
              <form noValidate onSubmit={submit}>
                <div className="row2">
                  <Field v={v} id="c-naam" name="naam" label="Naam" required autoComplete="name" error="Vul uw naam in." />
                  <Field v={v} id="c-tel" name="telefoon" label="Telefoon" required type="tel" inputMode="tel" autoComplete="tel" error="Vul een telefoonnummer in waarop wij u bereiken." />
                </div>
                <div className="row2">
                  <Field v={v} id="c-email" name="email" label="E-mail" type="email" autoComplete="email" error="Dit e-mailadres lijkt niet te kloppen." />
                  <Field v={v} id="c-plaats" name="plaats" label="Postcode en gemeente" required autoComplete="postal-code" error="Vul uw postcode en gemeente in." />
                </div>
                <Field v={v} id="c-toestel" name="toestel" label="Merk en type van uw toestel" hint="Staat meestal op een typeplaatje bij de besturing of onder de zijpanelen." />
                <Field
                  v={v}
                  id="c-klacht"
                  name="klacht"
                  label="Wat is er aan de hand?"
                  required
                  textarea
                  hint="Bijvoorbeeld: verwarmt niet meer, jets slaan niet aan, lekkage onder het paneel, foutcode op het display."
                  error="Beschrijf kort wat er misgaat."
                />
                <div className="formfoot">
                  <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                    Verstuur aanvraag
                  </SubmitButton>
                  <span className="hint">Wij bellen u terug tijdens de kantooruren.</span>
                </div>
              </form>
            ) : (
              <div className="done" data-show="true" role="status" aria-live="polite">
                <i className="ph ph-check-circle mark-ok" aria-hidden="true" />
                <h3 ref={doneTitle} tabIndex={-1}>
                  Uw aanvraag staat klaar
                </h3>
                <p>
                  Dit is een demo zonder server, dus er is nog niets verstuurd. Open de aanvraag in uw e-mailprogramma, of
                  bel ons meteen. Op de echte site gaat dit formulier rechtstreeks naar {MAIL}.
                </p>
                <div className="actions">
                  <a className="btn btn--primary" href={href}>
                    <i className="ph ph-envelope-simple" aria-hidden="true" />
                    Open in e-mailprogramma
                  </a>
                  <a className="btn btn--ghost" href={TEL}>
                    <i className="ph ph-phone" aria-hidden="true" />
                    Bel {TEL_LABEL}
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="panel" data-reveal>
            <ul className="info">
              <li>
                <i className="ph ph-phone-call" aria-hidden="true" />
                <dl>
                  <dt>Telefoon</dt>
                  <dd>
                    <a href={TEL}>{TEL_LABEL}</a>
                  </dd>
                  <dd className="note">Geen WhatsApp of sms.</dd>
                </dl>
              </li>
              <li>
                <i className="ph ph-envelope-simple" aria-hidden="true" />
                <dl>
                  <dt>E-mail</dt>
                  <dd>
                    <a href={`mailto:${MAIL}`}>{MAIL}</a>
                  </dd>
                </dl>
              </li>
              <li>
                <i className="ph ph-map-pin" aria-hidden="true" />
                <dl>
                  <dt>Adres</dt>
                  <dd>
                    Sluisstraat 31
                    <br />
                    9130 Verrebroek, België
                  </dd>
                </dl>
              </li>
              <li>
                {/* Openingsuren volgens de Gouden Gids-vermelding. Laten bevestigen voor livegang. */}
                <i className="ph ph-clock" aria-hidden="true" />
                <dl>
                  <dt>Bereikbaar</dt>
                  <dd>Maandag tot vrijdag, 9:00 tot 18:00</dd>
                </dl>
              </li>
              <li>
                <i className="ph ph-facebook-logo" aria-hidden="true" />
                <dl>
                  <dt>Facebook</dt>
                  <dd>
                    <a href="https://www.facebook.com/Aquaspaservice/" rel="noopener">
                      Aqua Spa Service
                    </a>
                  </dd>
                </dl>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
