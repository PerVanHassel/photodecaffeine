import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  BELMOMENT_OPTIES,
  BelmomentChips,
  DonePanel,
  IMG,
  PrivacyNote,
  SubmitButton,
  TEL,
  TEL_LABEL,
  belmomentTekst,
  mailto,
  settle,
} from "./shared";
import { CoverDrawing, MiniHoek, MiniRichting, MiniVorm, Zijaanzicht, type Focus } from "./CoverDrawing";
import {
  KLEUREN,
  KLEUR_ONBEKEND,
  LEEG,
  RICHTING_TEKST,
  STAPPEN,
  bandjesTekst,
  controleer,
  getal,
  isDonker,
  mailRegels,
  matenTekst,
  matenWaarschuwing,
  optiesTekst,
  plekken,
  rokTekst,
  vormTekst,
  type CoverState,
  type Fouten,
  type Hoek,
  type HoekmaatKeuze,
  type JaNee,
  type Richting,
  type Vorm,
} from "./coverData";
import "./cover.css";

/**
 * Cover op maat, in zes korte stappen. Herwerkt op 12-10-2026: het oude
 * formulier vroeg alles in een keer, met termen als hoekmaat en hart op hart.
 * Nu een vraag per keer, in gewone woorden, met een tekening die meetekent en
 * bij elke vraag een uitweg als de klant het niet weet. De leverancier vraagt
 * het in tien stappen zonder uitleg (spacovers.nl); dit moet sneller en
 * duidelijker, en mag er niet op lijken.
 *
 * Wat de klant invult, blijft bewaard in de sessie, zodat herladen niets kost.
 */

const OPSLAG = "ass-coveraanvraag";

interface Bewaard {
  s: CoverState;
  stap: number;
  verst: number;
}

function laad(): Bewaard {
  const leeg = { s: LEEG, stap: 0, verst: 0 };
  if (typeof window === "undefined") return leeg;
  try {
    const raw = window.sessionStorage.getItem(OPSLAG);
    if (!raw) return leeg;
    const d = JSON.parse(raw) as Partial<Bewaard>;
    const stap = Math.min(Math.max(d.stap ?? 0, 0), STAPPEN.length - 1);
    return { s: { ...LEEG, ...d.s }, stap, verst: Math.max(stap, d.verst ?? 0) };
  } catch {
    return leeg;
  }
}

// ---------- kleine bouwstenen ----------

const klein = (t: string | null) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

function Fout({ id, tekst }: { id: string; tekst: string }) {
  return (
    <p className="cf-error" id={id}>
      <i className="ph ph-warning-circle" aria-hidden="true" />
      {tekst}
    </p>
  );
}

interface Optie<T extends string> {
  value: T;
  title: string;
  body?: string;
  art?: ReactNode;
}

/** Keuze uit een paar opties als kaarten met een tekeningetje. */
function Kaarten<T extends string>({
  id,
  legend,
  verborgen,
  hint,
  opties,
  value,
  onChange,
  fout,
  onbekend,
}: {
  id: string;
  legend: string;
  verborgen?: boolean;
  hint?: string;
  opties: Optie<T>[];
  value: T | null;
  onChange: (v: T) => void;
  fout?: string;
  /** Een uitweg onder de kaarten, als chip: bijvoorbeeld Weet ik niet. */
  onbekend?: { value: T; label: string };
}) {
  return (
    <fieldset className="cf-q" aria-describedby={fout ? `cf-${id}-err` : undefined}>
      <legend className={verborgen ? "sr-only" : "cf-legend"}>{legend}</legend>
      {hint && <p className="cf-hint">{hint}</p>}
      <div className="cf-cards">
        {opties.map((o, i) => (
          <label key={o.value} className="cf-card" data-on={value === o.value ? "true" : "false"}>
            <input
              type="radio"
              name={`cf-${id}`}
              id={i === 0 ? `cf-${id}` : undefined}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.art && <span className="cf-card__art">{o.art}</span>}
            <span className="cf-card__title">{o.title}</span>
            {o.body && <span className="cf-card__body">{o.body}</span>}
            <i className="ph-fill ph-check-circle cf-card__check" aria-hidden="true" />
          </label>
        ))}
      </div>
      {onbekend && (
        <div className="choice__row cf-gap">
          <label className="choice__chip" data-on={value === onbekend.value ? "true" : "false"}>
            <input
              type="radio"
              name={`cf-${id}`}
              value={onbekend.value}
              checked={value === onbekend.value}
              onChange={() => onChange(onbekend.value)}
            />
            <i className="ph ph-question cf-chipicon" aria-hidden="true" />
            {onbekend.label}
          </label>
        </div>
      )}
      {fout && <Fout id={`cf-${id}-err`} tekst={fout} />}
    </fieldset>
  );
}

/** Keuze als chips, in de stijl van de andere formulieren. */
function Keuzes<T extends string>({
  id,
  legend,
  hint,
  opties,
  value,
  onChange,
  fout,
}: {
  id: string;
  legend: string;
  hint?: string;
  opties: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  fout?: string;
}) {
  return (
    <fieldset className="cf-q" aria-describedby={fout ? `cf-${id}-err` : undefined}>
      <legend className="cf-legend cf-legend--sm">{legend}</legend>
      {hint && <p className="cf-hint">{hint}</p>}
      <div className="choice__row">
        {opties.map((o, i) => (
          <label key={o.value} className="choice__chip" data-on={value === o.value ? "true" : "false"}>
            <input
              type="radio"
              name={`cf-${id}`}
              id={i === 0 ? `cf-${id}` : undefined}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {fout && <Fout id={`cf-${id}-err`} tekst={fout} />}
    </fieldset>
  );
}

/** Een maat in centimeters, met de eenheid in het veld. */
function Getal({
  id,
  label,
  hint,
  value,
  onChange,
  fout,
  waarschuwing,
  optioneel,
  disabled,
  onFocus,
  onBlur,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  fout?: string;
  waarschuwing?: string;
  optioneel?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const describedBy =
    [hint && `cf-${id}-hint`, fout && `cf-${id}-err`, !fout && waarschuwing && `cf-${id}-warn`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="field cf-field" data-invalid={fout ? "true" : "false"}>
      <label htmlFor={`cf-${id}`}>
        {label}
        {optioneel && <span className="cf-opt"> (als u het weet)</span>}
      </label>
      {hint && (
        <span className="hint" id={`cf-${id}-hint`}>
          {hint}
        </span>
      )}
      <div className="cf-unit">
        <input
          id={`cf-${id}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-invalid={!!fout}
          aria-describedby={describedBy}
        />
        <span aria-hidden="true">cm</span>
      </div>
      {fout ? (
        <Fout id={`cf-${id}-err`} tekst={fout} />
      ) : waarschuwing ? (
        <p className="cf-warn" id={`cf-${id}-warn`}>
          <i className="ph ph-info" aria-hidden="true" />
          {waarschuwing}
        </p>
      ) : null}
    </div>
  );
}

function Tekst({
  id,
  label,
  hint,
  value,
  onChange,
  fout,
  verplicht,
  type = "text",
  autoComplete,
  inputMode,
  textarea,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  fout?: string;
  verplicht?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
  textarea?: boolean;
}) {
  const describedBy = [hint && `cf-${id}-hint`, fout && `cf-${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = {
    id: `cf-${id}`,
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    "aria-invalid": !!fout,
    "aria-describedby": describedBy,
    required: verplicht,
  };
  return (
    <div className="field cf-field" data-invalid={fout ? "true" : "false"}>
      <label htmlFor={`cf-${id}`}>
        {label} {verplicht && <span className="req" aria-hidden="true">*</span>}
      </label>
      {hint && (
        <span className="hint" id={`cf-${id}-hint`}>
          {hint}
        </span>
      )}
      {textarea ? (
        <textarea {...common} style={{ minHeight: 90 }} />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} inputMode={inputMode} />
      )}
      {fout && <Fout id={`cf-${id}-err`} tekst={fout} />}
    </div>
  );
}

function Samenvatting({ s }: { s: CoverState }) {
  const rijen = [
    ["Vorm", vormTekst(s)],
    ["Klapt open", s.richting ? RICHTING_TEKST[s.richting] : null],
    ["Maten", matenTekst(s)],
    ["Rok", rokTekst(s)],
    ["Bandjes", bandjesTekst(s)],
    ["Kleur", s.kleur],
  ].filter((r): r is [string, string] => !!r[1]);
  if (!rijen.length) return <p className="cf-sum__empty">Uw keuzes verschijnen hier terwijl u invult.</p>;
  return (
    <dl className="cf-sum">
      {rijen.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- de pagina ----------

export function Cover() {
  const [begin] = useState(laad);
  const [s, setS] = useState<CoverState>(begin.s);
  const [stap, setStap] = useState(begin.stap);
  const [verst, setVerst] = useState(begin.verst);
  const [fouten, setFouten] = useState<Fouten>({});
  const [veldFocus, setVeldFocus] = useState<Focus>(null);
  const [belmoment, setBelmoment] = useState(BELMOMENT_OPTIES[3]);
  const [busy, setBusy] = useState(false);
  const [href, setHref] = useState<string | null>(null);
  const kop = useRef<HTMLHeadingElement>(null);
  const wizard = useRef<HTMLDivElement>(null);
  const [fotoNaam, setFotoNaam] = useState<string | null>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);
  const eerste = useRef(true);
  const id = STAPPEN[stap].id;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(OPSLAG, JSON.stringify({ s, stap, verst }));
    } catch {
      // Geen opslag: het formulier werkt gewoon, alleen herladen wist het.
    }
  }, [s, stap, verst]);

  // Bij een nieuwe stap: focus op de vraag, en terug naar boven als die uit beeld is.
  useEffect(() => {
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    setVeldFocus(null);
    kop.current?.focus({ preventScroll: true });
    const top = wizard.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      wizard.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [stap]);

  const wis = (...keys: string[]) =>
    setFouten((f) => {
      if (!keys.some((k) => f[k])) return f;
      const n = { ...f };
      keys.forEach((k) => delete n[k]);
      return n;
    });

  const zet = <K extends keyof CoverState>(k: K, v: CoverState[K], ...ook: string[]) => {
    setS((o) => ({ ...o, [k]: v }));
    wis(k as string, ...ook);
  };

  /** Andere vorm of hoek: bandjes op plekken die niet meer bestaan, vallen weg. */
  const zetVorm = (vorm: Vorm | null, hoek: Hoek | null) =>
    setS((o) => {
      const geldig = plekken(vorm, hoek).map((p) => p.id);
      const bandjes = o.bandjes.filter((b) => geldig.includes(b));
      return {
        ...o,
        vorm,
        hoek,
        bandjes,
        bandjesStatus: o.bandjesStatus === "gekozen" && bandjes.length === 0 ? null : o.bandjesStatus,
      };
    });

  const wisselBandje = (pid: string) => {
    setS((o) => {
      const bandjes = o.bandjes.includes(pid) ? o.bandjes.filter((b) => b !== pid) : [...o.bandjes, pid];
      return { ...o, bandjes, bandjesStatus: bandjes.length ? "gekozen" : null };
    });
    wis("bandjes");
  };

  const toonFouten = (f: Fouten) => {
    setFouten(f);
    const eersteFout = Object.keys(f)[0];
    if (eersteFout) window.setTimeout(() => document.getElementById(`cf-${eersteFout}`)?.focus(), 0);
    return !eersteFout;
  };

  const gaNaar = (i: number) => {
    if (i > stap && !toonFouten(controleer(id, s))) return;
    setFouten({});
    setStap(i);
  };

  const volgende = async (e: FormEvent) => {
    e.preventDefault();
    if (!toonFouten(controleer(id, s))) return;
    if (id !== "gegevens") {
      const n = stap + 1;
      setStap(n);
      setVerst((v) => Math.max(v, n));
      return;
    }
    setBusy(true);
    await settle();
    setHref(mailto(`Coveraanvraag van ${s.naam}`, mailRegels(s, belmomentTekst(belmoment), fotoNaam)));
    setBusy(false);
    try {
      window.sessionStorage.removeItem(OPSLAG);
    } catch {
      // Zie hierboven.
    }
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  const tekeningFocus: Focus =
    veldFocus ??
    (id === "vorm" && (s.hoek === "afgerond" || s.hoek === "afgesneden") ? "hoek" : id === "bandjes" ? "bandjes" : null);

  const kopje = (tekst: string) => (
    <h2 ref={kop} tabIndex={-1} className="cf-title">
      {tekst}
    </h2>
  );

  // ---------- de stappen ----------

  const stapVorm = (
    <>
      {kopje("Welke vorm heeft uw cover?")}
      <p className="cf-lead">
        Kies wat er het dichtst bij komt. Een andere vorm, zoals een achthoek? Kies dan de rechthoek en stuur op het
        einde een foto mee.
      </p>
      <Kaarten<Vorm>
        id="vorm"
        legend="Vorm"
        verborgen
        value={s.vorm}
        onChange={(v) => {
          zetVorm(v, v === "rond" ? null : s.hoek);
          wis("vorm", "hoek", "hoekmaat", "hoekmaatAnders", "schuin");
        }}
        fout={fouten.vorm}
        opties={[
          { value: "rechthoek", title: "Vierkant of rechthoek", body: "De meeste spa's", art: <MiniVorm vorm="rechthoek" hoek="afgerond" /> },
          { value: "rond", title: "Rond", art: <MiniVorm vorm="rond" /> },
        ]}
      />
      {s.vorm === "rechthoek" && (
        <Kaarten<Hoek>
          id="hoek"
          legend="Hoe zien de hoeken eruit?"
          value={s.hoek}
          onChange={(v) => {
            zetVorm("rechthoek", v);
            wis("hoek", "hoekmaat", "hoekmaatAnders", "schuin");
          }}
          fout={fouten.hoek}
          opties={[
            { value: "afgerond", title: "Afgerond", body: "Een bocht in de hoek", art: <MiniHoek hoek="afgerond" /> },
            { value: "afgesneden", title: "Schuin", body: "Een rechte schuine kant", art: <MiniHoek hoek="afgesneden" /> },
            { value: "recht", title: "Recht", body: "Een scherpe hoek", art: <MiniHoek hoek="recht" /> },
          ]}
          onbekend={{ value: "onbekend", label: "Weet ik niet" }}
        />
      )}
      {s.vorm === "rechthoek" && s.hoek === "afgerond" && (
        <>
          <Keuzes<HoekmaatKeuze>
            id="hoekmaat"
            legend="Hoe groot is de bocht?"
            hint="Leg een rechte lat langs beide kanten. Meet van het punt waar ze elkaar raken tot waar de bocht begint."
            value={s.hoekmaatKeuze}
            onChange={(v) => zet("hoekmaatKeuze", v, "hoekmaat", "hoekmaatAnders")}
            fout={fouten.hoekmaat}
            opties={[
              { value: "13", label: "13 cm" },
              { value: "18", label: "18 cm" },
              { value: "anders", label: "Andere maat" },
              { value: "onbekend", label: "Weet ik niet" },
            ]}
          />
          {s.hoekmaatKeuze === "anders" && (
            <Getal
              id="hoekmaatAnders"
              label="Hoekmaat"
              value={s.hoekmaat}
              onChange={(v) => zet("hoekmaat", v, "hoekmaatAnders")}
              fout={fouten.hoekmaatAnders}
            />
          )}
        </>
      )}
      {s.vorm === "rechthoek" && s.hoek === "afgesneden" && (
        <>
          <Getal
            id="schuin"
            label="Hoe lang is de schuine kant?"
            hint="Meet de schuine kant zelf, van het ene hoekpunt tot het andere."
            value={s.schuinOnbekend ? "" : s.schuin}
            onChange={(v) => zet("schuin", v)}
            disabled={s.schuinOnbekend}
            fout={fouten.schuin}
          />
          <label className="choice__chip cf-toggle" data-on={s.schuinOnbekend ? "true" : "false"}>
            <input
              type="checkbox"
              checked={s.schuinOnbekend}
              onChange={(e) => zet("schuinOnbekend", e.target.checked, "schuin")}
            />
            Weet ik niet
          </label>
        </>
      )}
    </>
  );

  const stapOpenen = (
    <>
      {kopje("Naar welke kant klapt de cover open?")}
      <p className="cf-lead">
        Ga staan waar u in de spa stapt. Waar gaat de cover naartoe als u hem openklapt?
      </p>
      <Kaarten<Richting>
        id="richting"
        legend="Richting"
        verborgen
        value={s.richting}
        onChange={(v) => zet("richting", v)}
        fout={fouten.richting}
        opties={[
          { value: "achter", title: "Van mij af", body: "Naar achteren", art: <MiniRichting richting="achter" /> },
          { value: "links", title: "Naar links", art: <MiniRichting richting="links" /> },
          { value: "rechts", title: "Naar rechts", art: <MiniRichting richting="rechts" /> },
          { value: "voor", title: "Naar mij toe", body: "Naar voren", art: <MiniRichting richting="voor" /> },
        ]}
        onbekend={{ value: "onbekend", label: "Weet ik niet" }}
      />
      <div className="callout callout--tight">
        <i className="ph ph-info" aria-hidden="true" />
        <p>
          Dit bepaalt waar de vouwnaad komt. Kiest u verkeerd, dan klapt de nieuwe cover open tegen een muur of een haag
          en kunt u hem nergens kwijt.
        </p>
      </div>
    </>
  );

  const stapMaten = (
    <>
      {kopje("Meet uw huidige cover")}
      <p className="cf-lead">
        Meet de cover zelf, niet de rand van het bad. Van buitenrand tot buitenrand, in centimeters. De tekening laat zien
        welke maat welke is.
      </p>
      {s.vorm === "rond" ? (
        <Getal
          id="diameter"
          label="Doorsnede"
          hint="Meet door het midden, van rand tot rand."
          value={s.diameter}
          onChange={(v) => zet("diameter", v)}
          onFocus={() => setVeldFocus("diameter")}
          onBlur={() => setVeldFocus(null)}
          fout={fouten.diameter}
          waarschuwing={matenWaarschuwing(getal(s.diameter))}
        />
      ) : (
        <div className="row2">
          <Getal
            id="a"
            label="A: langs de vouwnaad"
            hint="De vouwnaad is de naad in het midden waar de cover dubbelvouwt. Meet de kant die ernaast loopt."
            value={s.a}
            onChange={(v) => zet("a", v)}
            onFocus={() => setVeldFocus("a")}
            onBlur={() => setVeldFocus(null)}
            fout={fouten.a}
            waarschuwing={matenWaarschuwing(getal(s.a))}
          />
          <Getal
            id="b"
            label="B: over de vouwnaad"
            hint="Meet de andere kant, dwars over de naad heen."
            value={s.b}
            onChange={(v) => zet("b", v)}
            onFocus={() => setVeldFocus("b")}
            onBlur={() => setVeldFocus(null)}
            fout={fouten.b}
            waarschuwing={matenWaarschuwing(getal(s.b))}
          />
        </div>
      )}
      <button type="button" className="cf-linkbtn" onClick={() => zet("metenLastig", !s.metenLastig, "a", "b", "diameter")}>
        {s.metenLastig ? "Ik meet het toch zelf" : "Lukt het meten niet?"}
      </button>
      {s.metenLastig && (
        <div className="callout callout--tight cf-gap">
          <i className="ph ph-chat-teardrop-text" aria-hidden="true" />
          <p>
            Geen probleem. Vul in wat u weet en stuur op het einde een foto van uw cover mee. Wij bellen u om de rest samen
            na te lopen.
          </p>
        </div>
      )}
      <Keuzes<JaNee>
        id="rok"
        legend="Heeft uw cover een rok?"
        hint="De rok is de stoffen flap die rondom over de rand van het bad hangt."
        value={s.rok}
        onChange={(v) => zet("rok", v, "rokMaat")}
        fout={fouten.rok}
        opties={[
          { value: "ja", label: "Ja" },
          { value: "nee", label: "Nee" },
          { value: "onbekend", label: "Weet ik niet" },
        ]}
      />
      {s.rok === "ja" && (
        <div className="cf-with-side">
          <Getal
            id="rokMaat"
            label="Hoe lang is de rok?"
            hint="Van de onderkant van de cover tot de onderkant van de flap. Meestal tussen 5 en 15 cm."
            value={s.rokMaat}
            onChange={(v) => zet("rokMaat", v)}
            fout={fouten.rokMaat}
            optioneel
          />
          <Zijaanzicht focus="rok" rok={getal(s.rokMaat)} band={null} kleur={s.kleur} />
        </div>
      )}
    </>
  );

  const groepen = (() => {
    const g = new Map<string, { id: string; kort: string }[]>();
    plekken(s.vorm, s.hoek).forEach((p) => {
      const [groep, kort] = p.label.includes(",") ? p.label.split(", ") : ["Rondom", p.label];
      g.set(groep, [...(g.get(groep) ?? []), { id: p.id, kort }]);
    });
    return [...g.entries()];
  })();

  const stapBandjes = (
    <>
      {kopje("Waar zitten de bandjes?")}
      <p className="cf-lead">
        Met de bandjes zet u de cover vast aan de spa. Duid in de tekening of hieronder aan waar ze nu zitten.
      </p>
      <fieldset className="cf-q" aria-describedby={fouten.bandjes ? "cf-bandjes-err" : undefined}>
        <legend className="sr-only">Plekken van de bandjes</legend>
        <div className="cf-spots">
          {groepen.map(([groep, items], gi) => (
            <div key={groep} className="cf-spots__group">
              <span className="cf-spots__label">{groep}</span>
              <div className="choice__row">
                {items.map((it, i) => (
                  <label key={it.id} className="choice__chip" data-on={s.bandjes.includes(it.id) ? "true" : "false"}>
                    <input
                      type="checkbox"
                      id={gi === 0 && i === 0 ? "cf-bandjes" : undefined}
                      checked={s.bandjes.includes(it.id)}
                      onChange={() => wisselBandje(it.id)}
                    />
                    {it.kort}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="cf-spots__label cf-gap">Of</span>
        <div className="choice__row">
          {(
            [
              ["geen", "Geen bandjes"],
              ["onbekend", "Weet ik niet"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="choice__chip" data-on={s.bandjesStatus === v ? "true" : "false"}>
              <input
                type="radio"
                name="cf-bandjes-anders"
                checked={s.bandjesStatus === v}
                onChange={() => {
                  setS((o) => ({ ...o, bandjes: [], bandjesStatus: v }));
                  wis("bandjes");
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="cf-count" aria-live="polite">
          {s.bandjesStatus === "gekozen"
            ? `${s.bandjes.length} ${s.bandjes.length === 1 ? "bandje" : "bandjes"} aangeduid.`
            : ""}
        </p>
        {fouten.bandjes && <Fout id="cf-bandjes-err" tekst={fouten.bandjes} />}
      </fieldset>
      {s.bandjesStatus === "gekozen" && (
        <div className="cf-with-side">
          <div>
            <Getal
              id="bandLengte"
              label="Hoe lang is een bandje?"
              hint="Van de onderkant van de cover tot het einde van de sluiting."
              value={s.bandLengte}
              onChange={(v) => zet("bandLengte", v)}
              fout={fouten.bandLengte}
              optioneel
            />
            {s.bandjes.length >= 2 && (
              <Getal
                id="hoh"
                label="Afstand tussen twee bandjes"
                hint="Aan dezelfde kant, van het midden van het ene bandje tot het midden van het andere."
                value={s.hoh}
                onChange={(v) => zet("hoh", v)}
                fout={fouten.hoh}
                optioneel
              />
            )}
          </div>
          <Zijaanzicht focus="band" rok={s.rok === "ja" ? getal(s.rokMaat) : null} band={getal(s.bandLengte)} kleur={s.kleur} />
        </div>
      )}
    </>
  );

  const stapKleur = (
    <>
      {kopje("Welke kleur wilt u?")}
      <p className="cf-lead">Kleuren op een scherm wijken altijd wat af van het echte materiaal.</p>
      <fieldset className="cf-q" aria-describedby={fouten.kleur ? "cf-kleur-err" : undefined}>
        <legend className="sr-only">Kleur</legend>
        <div className="cf-swatches">
          {[...KLEUREN, { naam: KLEUR_ONBEKEND, hex: "" }].map((k, i) => (
            <label key={k.naam} className="cf-swatch" data-on={s.kleur === k.naam ? "true" : "false"}>
              <input
                type="radio"
                name="cf-kleur"
                id={i === 0 ? "cf-kleur" : undefined}
                checked={s.kleur === k.naam}
                onChange={() => zet("kleur", k.naam)}
              />
              <span
                className={k.hex ? "cf-swatch__chip" : "cf-swatch__chip is-unknown"}
                style={k.hex ? { background: k.hex } : undefined}
              >
                {s.kleur === k.naam && k.hex && (
                  <i className={`ph-bold ph-check ${isDonker(k.hex) ? "is-light" : ""}`} aria-hidden="true" />
                )}
                {!k.hex && <i className="ph ph-question" aria-hidden="true" />}
              </span>
              <span className="cf-swatch__name">{k.naam}</span>
            </label>
          ))}
        </div>
        {fouten.kleur && <Fout id="cf-kleur-err" tekst={fouten.kleur} />}
      </fieldset>
      <fieldset className="cf-q">
        <legend className="cf-legend">Wilt u er iets bij?</legend>
        <p className="cf-hint">Niet verplicht. Wat het kost, staat in de prijs die wij u sturen.</p>
        <div className="cf-cards cf-cards--opties">
          {(
            [
              ["vochtscherm", "ph-drop", "Extra vochtscherm", "Een tweede laag rond de isolatie. Zo blijft de cover langer licht en gaat hij langer mee."],
              ["handvaten", "ph-hand-grabbing", "Twee handvaten", "Om de cover makkelijker op te tillen en te dragen."],
              ["folie", "ph-thermometer-simple", "Reflecterende folie", "Een laag aluminium op de isolatie die warmte terugkaatst in het bad."],
            ] as const
          ).map(([k, icon, titel, body]) => (
            <label key={k} className="cf-card cf-card--row" data-on={s[k] ? "true" : "false"}>
              <input type="checkbox" checked={s[k]} onChange={(e) => zet(k, e.target.checked)} />
              <i className={`ph ${icon} cf-card__icon`} aria-hidden="true" />
              <span>
                <span className="cf-card__title">{titel}</span>
                <span className="cf-card__body">{body}</span>
              </span>
              <i className="ph-fill ph-check-circle cf-card__check" aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );

  const overzicht = [
    { stap: 0, titel: "Vorm", tekst: vormTekst(s) },
    { stap: 1, titel: "Klapt open", tekst: s.richting ? RICHTING_TEKST[s.richting] : null },
    {
      stap: 2,
      titel: "Maten",
      tekst: [matenTekst(s) ?? (s.metenLastig ? "Graag samen nalopen" : null), klein(rokTekst(s))].filter(Boolean).join(", "),
    },
    {
      stap: 3,
      titel: "Bandjes",
      tekst: [
        bandjesTekst(s),
        getal(s.bandLengte) !== null && `lengte ${getal(s.bandLengte)} cm`,
        getal(s.hoh) !== null && `${getal(s.hoh)} cm uit elkaar`,
      ]
        .filter(Boolean)
        .join(", "),
    },
    { stap: 4, titel: "Kleur", tekst: s.kleur ? `${s.kleur}, ${klein(optiesTekst(s))}` : null },
  ];

  const stapGegevens = (
    <>
      {kopje("Waar mogen wij de prijs naartoe sturen?")}
      <p className="cf-lead">U zit nergens aan vast. Wij sturen eerst de prijs.</p>
      <div className="row2">
        <Tekst id="naam" label="Naam" verplicht autoComplete="name" value={s.naam} onChange={(v) => zet("naam", v)} fout={fouten.naam} />
        <Tekst
          id="telefoon"
          label="Telefoon"
          verplicht
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={s.telefoon}
          onChange={(v) => zet("telefoon", v)}
          fout={fouten.telefoon}
        />
      </div>
      <div className="row2">
        <Tekst
          id="email"
          label="E-mail"
          verplicht
          type="email"
          inputMode="email"
          autoComplete="email"
          value={s.email}
          onChange={(v) => zet("email", v)}
          fout={fouten.email}
        />
        <Tekst
          id="plaats"
          label="Postcode en gemeente"
          verplicht
          autoComplete="postal-code"
          value={s.plaats}
          onChange={(v) => zet("plaats", v)}
          fout={fouten.plaats}
        />
      </div>
      <Tekst
        id="toestel"
        label="Merk en type van uw spa"
        hint="Niet verplicht, maar het helpt ons de maten te controleren."
        value={s.toestel}
        onChange={(v) => zet("toestel", v)}
      />
      <div className="field cf-field">
        <label htmlFor="cf-foto">Foto van uw huidige cover</label>
        <span className="hint" id="cf-foto-hint">
          {fotoNaam
            ? `Gekozen: ${fotoNaam}. Kies opnieuw om een andere foto te nemen.`
            : "Niet verplicht. Met een foto zien wij meteen of alles klopt."}
        </span>
        <input
          id="cf-foto"
          type="file"
          accept="image/*"
          aria-describedby="cf-foto-hint"
          onChange={(e) => setFotoNaam(e.target.files?.[0]?.name ?? fotoNaam)}
        />
      </div>
      <Tekst id="opmerking" label="Opmerking" textarea value={s.opmerking} onChange={(v) => zet("opmerking", v)} />
      <BelmomentChips value={belmoment} onChange={setBelmoment} />

      <section className="cf-review" aria-labelledby="cf-review-title">
        <h3 id="cf-review-title">Uw cover</h3>
        <dl>
          {overzicht.map((o) => (
            <div key={o.titel}>
              <dt>{o.titel}</dt>
              <dd>{o.tekst || "Niet ingevuld"}</dd>
              <button type="button" className="cf-linkbtn" onClick={() => gaNaar(o.stap)}>
                Wijzig<span className="sr-only"> {o.titel.toLowerCase()}</span>
              </button>
            </div>
          ))}
        </dl>
      </section>
    </>
  );

  const inhoud = { vorm: stapVorm, openen: stapOpenen, maten: stapMaten, bandjes: stapBandjes, kleur: stapKleur, gegevens: stapGegevens }[id];

  return (
    <>
      <section className="pagehead">
        <div className="wrap pagehead__grid">
          <div>
            <h1>Een cover op maat, zonder dat wij langskomen</h1>
            <p className="pagehead__lead">
              Geef ons de maten van uw huidige cover door, dan rekenen wij de prijs uit. Twijfelt u over een maat, stuur
              dan een foto mee of bel ons even.
            </p>
            <div className="pagehead__cta">
              <a className="btn btn--primary" href="#cf-start">
                <i className="ph ph-ruler" aria-hidden="true" />
                Begin met meten
              </a>
              <a className="btn btn--ghost" href={TEL}>
                <i className="ph ph-phone" aria-hidden="true" />
                Bel {TEL_LABEL}
              </a>
            </div>
          </div>
          <div className="pagehead__media">
            <img
              src={`${IMG}/cover-spa-1024.jpg`}
              width={1024}
              height={768}
              decoding="async"
              alt="Buitenspa aan het water, met de cover opengeklapt tegen een coverlift ernaast."
            />
          </div>
        </div>
      </section>

      <section className="promise" aria-label="Wat u nodig heeft">
        <div className="wrap">
          <ul>
            <li>
              <i className="ph ph-ruler" aria-hidden="true" />
              Een rolmeter of meetlint
            </li>
            <li>
              <i className="ph ph-square-half" aria-hidden="true" />
              Uw huidige cover, op de spa
            </li>
            <li>
              <i className="ph ph-timer" aria-hidden="true" />
              Een paar minuten
            </li>
          </ul>
        </div>
      </section>

      <section className="section cf-section" id="cf-start">
        <div className="wrap cf" ref={wizard}>
          <nav className="cf-progress" aria-label="Stappen">
            <ol className="cf-steps">
              {STAPPEN.map((st, i) => {
                const status = i < stap ? "done" : i === stap ? "current" : "todo";
                return (
                  <li key={st.id} data-status={status}>
                    <button
                      type="button"
                      disabled={i > verst || i === stap || href !== null}
                      aria-current={i === stap ? "step" : undefined}
                      onClick={() => gaNaar(i)}
                    >
                      <span className="cf-steps__bar" aria-hidden="true" />
                      <span className="cf-steps__label">{st.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="cf-steps__now" aria-hidden="true">
              {STAPPEN[stap].label}
              <span>
                {stap + 1} van {STAPPEN.length}
              </span>
            </p>
          </nav>

          <aside className="cf-preview" aria-label="Uw cover tot nu toe">
            <div className="cf-preview__card">
              <h2 className="cf-preview__title">Uw cover</h2>
              <CoverDrawing s={s} stap={id} focus={tekeningFocus} onBandje={id === "bandjes" && href === null ? wisselBandje : undefined} />
              <Samenvatting s={s} />
            </div>
          </aside>

          <div className="cf-main">
            <div className="panel cf-panel">
              {href === null ? (
                <form noValidate onSubmit={volgende}>
                  <div className="cf-step" key={id}>
                    {inhoud}
                  </div>
                  <div className="cf-nav">
                    {stap > 0 ? (
                      <button type="button" className="btn btn--ghost" onClick={() => gaNaar(stap - 1)}>
                        <i className="ph ph-arrow-left" aria-hidden="true" />
                        Terug
                      </button>
                    ) : (
                      <span />
                    )}
                    {id === "gegevens" ? (
                      <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                        Vraag de prijs aan
                      </SubmitButton>
                    ) : (
                      <button type="submit" className="btn btn--primary">
                        Volgende
                        <i className="ph ph-arrow-right" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {id === "gegevens" && <PrivacyNote />}
                </form>
              ) : (
                <DonePanel
                  titleRef={doneTitle}
                  title="Uw coveraanvraag staat klaar"
                  body="Dit is een demo zonder server, dus er is nog niets verstuurd. Open de aanvraag in uw e-mailprogramma en voeg de foto toe als bijlage, of bel ons meteen."
                  href={href}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="callout">
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
