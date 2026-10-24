import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  DEFAULT_VAT_RATE, SERVICE_LABEL, convertVat, euro, euroCents, formatDate, lineTotal, optionKey, paymentPlan, sumLines, todayIso, vatSplit,
  type Business, type QuoteDoc, type QuoteLine, type VatBasis,
} from "./model";
import "./quote.css";

export { euro, quoteSum, convertVat, DEFAULT_VAT_RATE } from "./model";
export type { QuoteDoc, QuoteLine, QuoteTerm, VatBasis } from "./model";

/**
 * A price quote, laid out the way the client sees it.
 *
 * The same sheet renders the live preview in the admin's quote builder, the
 * public page the emailed link opens, and the printed copy, so there is one
 * design to keep right. Sections without content are left out and the rest
 * are numbered in order.
 */

/** The house fonts. Loaded where the sheet is shown; the admin and site use others. */
export function QuoteFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,500&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap"
      />
    </>
  );
}

const Check = ({ quiet }: { quiet?: boolean }) => (
  <svg className={`pq-ico${quiet ? " quiet" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {quiet ? <path d="M5.5 10h9" /> : <><circle cx="10" cy="10" r="7.25" opacity="0.45" /><path d="m7 10.2 2 2 4-4.4" /></>}
  </svg>
);

const Info = () => (
  <svg className="pq-ico quiet" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <circle cx="10" cy="10" r="7.25" /><path d="M10 9v4.5M10 6.6v.1" />
  </svg>
);

const Tick = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2.5 6.3 2.3 2.2 4.7-5" /></svg>
);

export interface QuoteDocumentProps {
  quote: QuoteDoc;
  business?: Business | null;
  /** Entrance animation, for the client's page. */
  animate?: boolean;
  /** The options the reader has ticked; with onToggleOption they can tick them here. */
  chosen?: ReadonlySet<string>;
  onToggleOption?: (key: string) => void;
  /** Builder: the section being edited. */
  activeSection?: string | null;
}

export function QuoteDocument({ quote, business, animate, chosen, onToggleOption, activeSection }: QuoteDocumentProps) {
  const d = quote.details || {};
  const monthly = quote.monthly || [];
  const oneTime = quote.oneTime || [];
  const included = (quote.included || []).filter(Boolean);
  const terms = (quote.terms || []).filter((t) => t.label || t.text);
  const basis: VatBasis = quote.vatBasis === "incl" ? "incl" : "excl";
  const rate = typeof quote.vatRate === "number" && quote.vatRate >= 0 ? quote.vatRate : DEFAULT_VAT_RATE;
  // Start on the side the quote was written on; those amounts are exact.
  const [show, setShow] = useState<VatBasis>(basis);
  useEffect(() => setShow(basis), [basis]);
  const picked = chosen ?? new Set(d.accepted?.options || []);

  const sheet = useRef<HTMLElement>(null);
  useReveal(sheet, !!animate);
  const rv = animate ? " pq-reveal" : "";

  const services = d.services?.length ? d.services : quote.type ? [quote.type] : [];
  const company = d.client?.company?.trim();
  // A draft carries today's date: that is the day it will go out.
  const issued = d.issuedOn || (quote.sentAt ? quote.sentAt.slice(0, 10) : !quote.status || quote.status === "draft" ? todayIso() : (quote.createdAt || "").slice(0, 10));
  const hasPrices = oneTime.length > 0 || monthly.length > 0;
  const oneTimeTotal = sumLines(oneTime, "o", picked);
  const monthlyTotal = sumLines(monthly, "m", picked);
  const plan = paymentPlan(d.payment?.steps, oneTimeTotal);
  const shown = (n: number) => convertVat(n, basis, show, rate);
  const sideLabel = rate > 0 ? (show === "incl" ? "incl. btw" : "excl. btw") : "";

  // Sections in reading order; a section without content is skipped.
  const sections: { id: string; title: string; body: ReactNode }[] = [];

  if (d.problem?.trim()) {
    sections.push({ id: "problem", title: "Wat je ermee wint", body: <p className="pq-pull">{d.problem}</p> });
  }

  const excluded = (d.excluded || []).filter(Boolean);
  if (included.length || excluded.length) {
    sections.push({
      id: "scope",
      title: "Wat je krijgt",
      body: (
        <>
          {included.length > 0 && (
            <ul className={`pq-checks${included.length < 4 ? " single" : ""}`}>
              {included.map((item, i) => <li key={i}><Check /><span>{item}</span></li>)}
            </ul>
          )}
          {excluded.length > 0 && (
            <div className="pq-sub">
              <h3>Niet inbegrepen</h3>
              <ul className="pq-checks single">{excluded.map((item, i) => <li key={i}><Check quiet /><span>{item}</span></li>)}</ul>
            </div>
          )}
        </>
      ),
    });
  }

  if (hasPrices) {
    const extra = (d.extraCosts || []).filter(Boolean);
    sections.push({
      id: "price",
      title: "Investering",
      body: (
        <>
          {rate > 0 && (
            <div className="pq-pricebar pq-no-print">
              <span className="pq-small pq-quiet">Bedragen {show === basis ? "zoals opgesteld" : "omgerekend, afgerond op centen"}</span>
              <div className="pq-switch" role="group" aria-label="Bedragen tonen">
                {(["excl", "incl"] as VatBasis[]).map((k) => (
                  <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}>{k === "excl" ? "Excl. btw" : "Incl. btw"}</button>
                ))}
              </div>
            </div>
          )}
          {oneTime.length > 0 && (
            <PriceBlock title="Eenmalig" lines={oneTime} prefix="o" picked={picked} onToggle={onToggleOption} shown={shown} sideLabel={sideLabel} />
          )}
          {monthly.length > 0 && (
            <PriceBlock title="Per maand" lines={monthly} prefix="m" picked={picked} onToggle={onToggleOption} shown={shown} sideLabel={sideLabel} perMonth />
          )}
          {oneTime.length > 0 && <TotalBand label="Totaal eenmalig" amount={oneTimeTotal} basis={basis} rate={rate} />}
          {monthly.length > 0 && <TotalBand label="Totaal per maand" amount={monthlyTotal} basis={basis} rate={rate} month />}
          {extra.length > 0 && (
            <div className="pq-sub">
              <h3>Komt er nog bij</h3>
              <ul className="pq-checks single">{extra.map((item, i) => <li key={i}><Info /><span>{item}</span></li>)}</ul>
            </div>
          )}
        </>
      ),
    });
  }

  if (plan.length > 0 || d.payment?.termDays) {
    sections.push({
      id: "payment",
      title: "Betaling",
      body: (
        <>
          {plan.length > 0 && (
            <ol className="pq-steps">
              {plan.map((s, i) => (
                <li key={i} className="pq-step">
                  <span className="pq-step-pct">{s.percent}%</span>
                  <span className="pq-step-label">{s.label || `Termijn ${i + 1}`}</span>
                  {s.moment && <span className="pq-step-moment">{s.moment}</span>}
                  <span className="pq-step-amt">{euroCents(shown(s.amount))} {sideLabel}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="pq-p pq-quiet pq-small">
            {d.payment?.termDays ? `Elke factuur betaal je binnen ${d.payment.termDays} dagen. ` : ""}
            {monthly.length > 0 ? "De maandelijkse kosten factureren we per maand." : ""}
          </p>
        </>
      ),
    });
  }

  const delivers = (d.clientDelivers || []).filter(Boolean);
  const rev = d.revisions;
  if (d.planning?.trim() || delivers.length || rev) {
    sections.push({
      id: "planning",
      title: "Planning en samenwerking",
      body: (
        <>
          {d.planning?.trim() && <p className="pq-p">{d.planning}</p>}
          <dl className="pq-dl">
            {delivers.length > 0 && <><dt>Jij levert aan</dt><dd>{delivers.join("\n")}</dd></>}
            {rev && (
              <>
                <dt>Revisies</dt>
                <dd>{rev.untilRight ? "We passen het ontwerp aan tot het klopt." : `${rev.rounds} ${rev.rounds === 1 ? "revisieronde" : "revisierondes"} na goedkeuring van het eerste ontwerp. Een ronde is één verzamelde set feedback.`}</dd>
                {rev.feedbackDays > 0 && <><dt>Feedback</dt><dd>Graag binnen {rev.feedbackDays} werkdagen. Heb je meer tijd nodig, laat het weten. Stilte betekent geen akkoord.</dd></>}
              </>
            )}
          </dl>
        </>
      ),
    });
  }

  const m = d.maintenance;
  if (m && (m.covers?.some(Boolean) || m.smallChange || m.cancel)) {
    sections.push({
      id: "maintenance",
      title: "Onderhoud",
      body: (
        <>
          {m.covers?.some(Boolean) && <ul className="pq-checks">{m.covers.filter(Boolean).map((c, i) => <li key={i}><Check /><span>{c}</span></li>)}</ul>}
          <dl className="pq-dl">
            {m.smallChange && <><dt>Een kleine wijziging</dt><dd>{m.smallChange}</dd></>}
            {m.excluded && <><dt>Valt er niet onder</dt><dd>{m.excluded}</dd></>}
            {m.cancel && <><dt>Opzeggen</dt><dd>{m.cancel}</dd></>}
          </dl>
        </>
      ),
    });
  }

  const own = d.ownership;
  const lic = d.license;
  const showLicense = lic && (services.includes("photo") || services.includes("video"));
  if ((own && (own.rows?.length || own.note || own.buyout != null)) || showLicense) {
    sections.push({
      id: "rights",
      title: own && services.includes("web") ? "Eigendom en rechten" : "Gebruiksrechten",
      body: (
        <>
          {own && services.includes("web") && (
            <>
              <p className="pq-p">
                {own.model === "buy"
                  ? "Je koopt de website. Na de laatste betaling is hij van jou, en kun je hem meenemen naar wie je wilt."
                  : "Je huurt de website: je betaalt de bouw eenmalig en daarna een bedrag per maand. Wij houden hem veilig, snel en up-to-date."}
                {own.note ? ` ${own.note}` : ""}
              </p>
              {own.model !== "buy" && own.buyout != null && own.buyout > 0 && (
                <div className="pq-note"><Info /><span><b>Liever kopen?</b> Dat kan altijd, voor {euro(shown(own.buyout))} {sideLabel}. Je krijgt dan de broncode, het ontwerp en alle accounts op je naam, en het onderhoud stopt.</span></div>
              )}
              {own.rows?.length > 0 && (
                <dl className="pq-dl">{own.rows.filter((r) => r.what).map((r, i) => <Pair key={i} k={r.what} v={r.owner} />)}</dl>
              )}
            </>
          )}
          {showLicense && lic && (
            <>
              {own && services.includes("web") && <h3 className="pq-label" style={{ marginTop: 6 }}>Foto en video</h3>}
              <p className="pq-p pq-quiet pq-small">Het auteursrecht op foto's en film blijft bij PDC. Je krijgt een licentie: toestemming om het werk op deze manier te gebruiken. Die gaat in zodra alles betaald is.</p>
              <dl className="pq-dl">
                <Pair k="Licentiehouder" v={lic.holder} />
                <Pair k="Gebruik" v={lic.use === "private" ? "Particulier, niet-commercieel" : lic.use === "business" ? "Zakelijk, voor je eigen organisatie" : "Zoals hieronder afgesproken"} />
                {lic.channels?.length > 0 && <Pair k="Kanalen" v={lic.channels.join(", ")} />}
                {lic.territory && <Pair k="Gebied" v={lic.territory} />}
                {lic.duration && <Pair k="Duur" v={lic.duration} />}
                <Pair k="Exclusief" v={lic.exclusive ? "Ja" : "Nee, wij mogen het werk ook aan anderen laten zien als je daar apart toestemming voor geeft"} />
                <Pair k="Overdragen" v={lic.transferable ? "Mag, na overleg" : "Niet zonder onze schriftelijke toestemming"} />
                {lic.edits && <Pair k="Aanpassen" v={lic.edits} />}
                {lic.credit && <Pair k="Naamsvermelding" v={lic.credit} />}
                {lic.rawFiles && <Pair k="Ruwe bestanden" v={lic.rawFiles} />}
                {lic.portfolio && <Pair k="Portfolio" v={lic.portfolio} />}
              </dl>
            </>
          )}
        </>
      ),
    });
  }

  if (d.aftercare?.days || d.aftercare?.note || d.extraWork?.hourly) {
    sections.push({
      id: "aftercare",
      title: "Nazorg en meerwerk",
      body: (
        <dl className="pq-dl">
          {(d.aftercare?.days || d.aftercare?.note) && (
            <Pair k="Na de oplevering" v={d.aftercare?.note || `Werkt iets niet zoals afgesproken, dan herstellen we dat gratis. De eerste ${d.aftercare?.days} dagen helpen we je ook gratis met vragen.`} />
          )}
          {d.extraWork?.hourly ? (
            <Pair k="Meerwerk" v={`${euro(shown(d.extraWork.hourly))} per uur ${sideLabel}, altijd eerst in overleg.${d.extraWork.note ? ` ${d.extraWork.note}` : ""}`} />
          ) : null}
        </dl>
      ),
    });
  }

  const consumer = d.audience === "consumer";
  // Every quote says that saying yes also means agreeing to the terms on the site.
  {
    sections.push({
      id: "terms",
      title: "Afspraken",
      body: (
        <div className="pq-terms">
          {terms.map((t, i) => <p key={i}>{t.label && <b>{t.label}. </b>}{t.text}</p>)}
          {consumer && <p><b>Bedenktijd.</b> Ga je als particulier online akkoord, dan heb je 14 dagen bedenktijd. Hoe dat werkt staat in onze regeling Annuleren en terugbetaling.</p>}
          <p><b>Voorwaarden.</b> Met je akkoord op deze prijsopgave ga je ook akkoord met onze algemene voorwaarden{d.termsVersion ? ` (${d.termsVersion})` : ""} en ons beleid op photodecaffeine.com/algemene-voorwaarden. Afspraken in deze prijsopgave gaan voor.</p>
        </div>
      ),
    });
  }

  return (
    <article className="pq" ref={sheet} aria-label={`Prijsopgave ${quote.number || ""}`.trim()}>
      <header className="pq-top">
        <div className="pq-mark"><b>PhotoDeCaffeine</b><span>PDC Productions</span></div>
        <div className="pq-docno">
          <small>Prijsopgave</small>
          <b>{quote.number || "Concept"}</b>
          {d.replaces?.number && <em>vervangt {d.replaces.number}</em>}
        </div>
      </header>

      <div className={`pq-hero${rv}`} data-section="basis">
        <div className="pq-tags">
          {services.map((s) => <span key={s} className="pq-tag">{SERVICE_LABEL[s]}</span>)}
          {d.audience && <span className="pq-tag quiet">{d.audience === "consumer" ? "Particulier" : "Zakelijk"}</span>}
        </div>
        <h1 className="pq-title">{quote.title || "Prijsopgave"}</h1>
        {quote.subtitle && <p className="pq-subtitle">{quote.subtitle}</p>}
      </div>

      <div className={`pq-meta${rv}`} data-section="client">
        <div>
          <span className="pq-label">Voor</span>
          {company && <b>{company}</b>}
          {quote.clientName && (company ? <span>t.a.v. {quote.clientName}</span> : <b>{quote.clientName}</b>)}
          {d.client?.address && <span style={{ whiteSpace: "pre-line" }}>{d.client.address}</span>}
          {quote.clientEmail && <span>{quote.clientEmail}</span>}
          {d.client?.vatId && <span>Btw {d.client.vatId}</span>}
        </div>
        <div>
          <span className="pq-label">Van</span>
          <b>{business?.name || "PhotoDeCaffeine Productions"}</b>
          {business?.address && <span style={{ whiteSpace: "pre-line" }}>{business.address}</span>}
          {business?.email && <span>{business.email}</span>}
        </div>
        <div>
          <span className="pq-label">Gegevens</span>
          {issued && <span className="pq-kv"><span>Datum</span><span>{formatDate(issued)}</span></span>}
          {quote.validUntil && <span className="pq-kv"><span>Geldig tot</span><span>{formatDate(quote.validUntil)}</span></span>}
          {d.reference && <span className="pq-kv"><span>Referentie</span><span>{d.reference}</span></span>}
        </div>
      </div>

      {quote.intro && <p className={`pq-intro${rv}`} data-section="intro">{quote.intro}</p>}

      <div style={{ marginTop: 28 }}>
        {sections.map((s, i) => (
          <section key={s.id} className={`pq-sec${rv}`} data-section={s.id} data-active={activeSection === s.id || undefined}>
            <div className="pq-sec-head">
              <span className="pq-sec-no">{String(i + 1).padStart(2, "0")}</span>
              <h2>{s.title}</h2>
            </div>
            <div className="pq-sec-body">{s.body}</div>
          </section>
        ))}
      </div>

      <footer className={`pq-close${rv}`} data-section="close">
        <p className="pq-p">{quote.notes || "Vragen, of wil je iets anders? Laat het weten, dan passen we het aan."}</p>
        {quote.validUntil && <span className="pq-valid">Geldig tot {formatDate(quote.validUntil)}</span>}
      </footer>

      <div className="pq-foot">
        <span>{business?.name || "PhotoDeCaffeine Productions"}</span>
        {business?.address && <span>{business.address.replace(/\n/g, ", ")}</span>}
        {business?.kvk && <span>KVK {business.kvk}</span>}
        {business?.vatNumber && <span>Btw {business.vatNumber}</span>}
        {business?.email && <span>{business.email}</span>}
      </div>
    </article>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v || "–"}</dd></>;
}

function PriceBlock({ title, lines, prefix, picked, onToggle, shown, sideLabel, perMonth }: {
  title: string; lines: QuoteLine[]; prefix: "o" | "m"; picked: ReadonlySet<string>; onToggle?: (key: string) => void;
  shown: (n: number) => number; sideLabel: string; perMonth?: boolean;
}) {
  // A line without a description is still being typed; saving drops it.
  const named = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.label.trim());
  const base = named.filter(({ l }) => !l.optional);
  const options = named.filter(({ l }) => l.optional);
  const row = ({ l, i }: { l: QuoteLine; i: number }) => {
    const key = optionKey(prefix, i);
    const on = picked.has(key);
    const amount = lineTotal(l);
    const unit = l.qty ? `${l.qty}${l.unit ? ` ${l.unit}` : ""} × ${euro(shown(l.price ?? 0))}` : "";
    return (
      <div key={key} className={`pq-row${amount < 0 ? " minus" : ""}${l.optional ? ` option${on ? " on" : ""}` : ""}`}>
        <div>
          <div className="pq-row-label">
            {l.optional && onToggle && (
              <button type="button" role="checkbox" aria-checked={on} className="pq-opt" aria-label={`${l.label} kiezen`} onClick={() => onToggle(key)}><Tick /></button>
            )}
            {l.label}
            {l.optional && <span className="pq-optag">Optie</span>}
          </div>
          {(unit || l.note) && <div className="pq-row-note">{[unit, l.note].filter(Boolean).join(" · ")}</div>}
        </div>
        <span className="pq-row-amt">{l.optional ? "+ " : ""}{euroCents(shown(amount))}{perMonth ? <span className="pq-quiet"> /mnd</span> : null}</span>
      </div>
    );
  };
  return (
    <div className="pq-bezel">
      <div className="pq-core">
        <div className="pq-block-head"><span className="pq-label" style={{ margin: 0 }}>{title}</span><span className="pq-label" style={{ margin: 0 }}>{sideLabel}</span></div>
        <div className="pq-rows">{base.map(row)}</div>
        {options.length > 0 && (
          <>
            <div className="pq-block-head" style={{ borderTop: "1px solid var(--pq-line)" }}>
              <span className="pq-label" style={{ margin: 0 }}>{onToggle ? "Opties, vink aan wat je erbij wilt" : "Opties"}</span>
            </div>
            <div className="pq-rows">{options.map(row)}</div>
          </>
        )}
      </div>
    </div>
  );
}

function TotalBand({ label, amount, basis, rate, month }: { label: string; amount: number; basis: VatBasis; rate: number; month?: boolean }) {
  const s = vatSplit(amount, basis, rate);
  return (
    <div className={`pq-total${month ? " month" : ""}`}>
      <div className="pq-total-split">
        <span className="pq-kv"><span>Subtotaal excl. btw</span><span>{euroCents(s.excl)}</span></span>
        {rate > 0 && <span className="pq-kv"><span>Btw {rate}%</span><span>{euroCents(s.vat)}</span></span>}
      </div>
      <div className="pq-total-big">
        <small>{label}</small>
        <b>{euroCents(s.incl)}</b>
        <span>{rate > 0 ? "inclusief btw" : "geen btw"}{month ? ", per maand" : ""}</span>
      </div>
    </div>
  );
}

/** Fades the sheet's parts in as they scroll into view; everything shows at once when printing. */
function useReveal(root: RefObject<HTMLElement>, on: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const parts = Array.from(el.querySelectorAll<HTMLElement>(".pq-reveal"));
    if (!on) return;
    if (typeof IntersectionObserver === "undefined") {
      parts.forEach((p) => p.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    parts.forEach((p, i) => {
      p.style.transitionDelay = `${Math.min(i, 3) * 70}ms`;
      io.observe(p);
    });
    const showAll = () => parts.forEach((p) => p.classList.add("is-in"));
    window.addEventListener("beforeprint", showAll);
    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", showAll);
    };
  });
}
