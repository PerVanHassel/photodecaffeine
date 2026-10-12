import type { CSSProperties, KeyboardEvent } from "react";
import {
  getal,
  hoekmaatCm,
  isDonker,
  kleurHex,
  plekken,
  type CoverState,
  type Hoek,
  type Plek,
  type Richting,
  type StapId,
} from "./coverData";

/**
 * De tekening van de cover, van bovenaf, gezien vanaf waar de klant instapt.
 * Ze rekent zich uit wat er al is ingevuld: vorm, hoeken, waar de vouwnaad
 * loopt, de maten, de bandjes en de kleur. Geen versiering: elke lijn helpt
 * de klant zien wat hij meet.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;

interface Geo {
  x: number;
  y: number;
  w: number;
  h: number;
  rond: boolean;
  foldH: boolean;
  corner: "round" | "cut" | "square";
  c: number;
}

interface Kader {
  cx: number;
  cy: number;
  maxW: number;
  maxH: number;
}

function geometrie(s: Pick<CoverState, "vorm" | "hoek" | "richting" | "a" | "b"> & { hm?: number | null }, k: Kader): Geo {
  const rond = s.vorm === "rond";
  const foldH = s.richting !== "links" && s.richting !== "rechts";
  if (rond) {
    const d = Math.min(k.maxW, k.maxH);
    return { x: k.cx - d / 2, y: k.cy - d / 2, w: d, h: d, rond, foldH, corner: "square", c: 0 };
  }
  const A = getal(s.a);
  const B = getal(s.b);
  const wCm = foldH ? A : B;
  const hCm = foldH ? B : A;
  let ratio = wCm && hCm ? wCm / hCm : foldH ? 1.2 : 1 / 1.2;
  ratio = Math.min(1.7, Math.max(0.6, ratio));
  let w: number;
  let h: number;
  if (ratio >= k.maxW / k.maxH) {
    w = k.maxW;
    h = w / ratio;
  } else {
    h = k.maxH;
    w = h * ratio;
  }
  const scale = wCm ? w / wCm : w / 220;
  const kort = Math.min(w, h);
  const hm = s.hm ?? null;
  let corner: Geo["corner"] = "square";
  let c = 0;
  if (s.hoek === "afgerond") {
    corner = "round";
    c = hm ? hm * scale : kort * 0.09;
  } else if (s.hoek === "afgesneden") {
    corner = "cut";
    c = hm ? (hm / Math.SQRT2) * scale : kort * 0.12;
  } else if (s.hoek !== "recht") {
    corner = "round";
    c = kort * 0.05;
  }
  if (corner !== "square") c = Math.min(Math.max(c, 4), kort * 0.3);
  return { x: k.cx - w / 2, y: k.cy - h / 2, w, h, rond, foldH, corner, c };
}

function vormPad(g: Geo) {
  const x = r1(g.x);
  const y = r1(g.y);
  const R = r1(g.x + g.w);
  const B = r1(g.y + g.h);
  const c = r1(g.c);
  if (g.corner === "round" && c > 0)
    return `M${r1(x + c)},${y} H${r1(R - c)} A${c},${c} 0 0 1 ${R},${r1(y + c)} V${r1(B - c)} A${c},${c} 0 0 1 ${r1(R - c)},${B} H${r1(x + c)} A${c},${c} 0 0 1 ${x},${r1(B - c)} V${r1(y + c)} A${c},${c} 0 0 1 ${r1(x + c)},${y} Z`;
  if (g.corner === "cut" && c > 0)
    return `M${r1(x + c)},${y} H${r1(R - c)} L${R},${r1(y + c)} V${r1(B - c)} L${r1(R - c)},${B} H${r1(x + c)} L${x},${r1(B - c)} V${r1(y + c)} Z`;
  return `M${x},${y} H${R} V${B} H${x} Z`;
}

function Omtrek({ g, className, style }: { g: Geo; className?: string; style?: CSSProperties }) {
  return g.rond ? (
    <circle cx={r1(g.x + g.w / 2)} cy={r1(g.y + g.h / 2)} r={r1(g.w / 2)} className={className} style={style} />
  ) : (
    <path d={vormPad(g)} className={className} style={style} />
  );
}

/** Punt op de rand voor een bandje, met de richting naar buiten. */
function plekPunt(g: Geo, p: Plek) {
  if (g.rond) {
    const a = (p.pos * Math.PI) / 180;
    const r = g.w / 2;
    return { px: g.x + r + r * Math.sin(a), py: g.y + r - r * Math.cos(a), nx: Math.sin(a), ny: -Math.cos(a) };
  }
  if (p.zijde === "hoek") {
    const c = g.c;
    const s = Math.SQRT1_2;
    if (p.pos === 315) return { px: g.x + c / 2, py: g.y + c / 2, nx: -s, ny: -s };
    if (p.pos === 45) return { px: g.x + g.w - c / 2, py: g.y + c / 2, nx: s, ny: -s };
    if (p.pos === 135) return { px: g.x + g.w - c / 2, py: g.y + g.h - c / 2, nx: s, ny: s };
    return { px: g.x + c / 2, py: g.y + g.h - c / 2, nx: -s, ny: s };
  }
  if (p.zijde === "achter") return { px: g.x + p.pos * g.w, py: g.y, nx: 0, ny: -1 };
  if (p.zijde === "voor") return { px: g.x + p.pos * g.w, py: g.y + g.h, nx: 0, ny: 1 };
  if (p.zijde === "links") return { px: g.x, py: g.y + p.pos * g.h, nx: -1, ny: 0 };
  return { px: g.x + g.w, py: g.y + p.pos * g.h, nx: 1, ny: 0 };
}

function Bandje({ g, p, aan }: { g: Geo; p: Plek; aan: boolean }) {
  const { px, py, nx, ny } = plekPunt(g, p);
  const hoek = (Math.atan2(ny, nx) * 180) / Math.PI + 90;
  return (
    <rect
      x={-9}
      y={-5}
      width={18}
      height={10}
      rx={3}
      className={aan ? "cf-strap is-on" : "cf-strap"}
      transform={`translate(${r1(px + nx * 9)} ${r1(py + ny * 9)}) rotate(${r1(hoek)})`}
    />
  );
}

function Pijl({ x1, y1, x2, y2, className }: { x1: number; y1: number; x2: number; y2: number; className: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const k = 9;
  const p1 = `${r1(x2 - k * Math.cos(a - 0.45))},${r1(y2 - k * Math.sin(a - 0.45))}`;
  const p2 = `${r1(x2 - k * Math.cos(a + 0.45))},${r1(y2 - k * Math.sin(a + 0.45))}`;
  return (
    <g className={className}>
      <line x1={r1(x1)} y1={r1(y1)} x2={r1(x2)} y2={r1(y2)} />
      <polyline points={`${p1} ${r1(x2)},${r1(y2)} ${p2}`} />
    </g>
  );
}

function Maatlijn({
  horizontaal,
  van,
  tot,
  op,
  label,
  waarde,
  focus,
}: {
  horizontaal: boolean;
  van: number;
  tot: number;
  op: number;
  label: string;
  waarde: number | null;
  focus: boolean;
}) {
  const t = 5;
  const tekst = (
    <>
      <tspan className="cf-dim__key">{label}</tspan>
      {waarde !== null && <tspan dx={6}>{`${waarde} cm`}</tspan>}
    </>
  );
  return (
    <g className={focus ? "cf-dim is-focus" : "cf-dim"}>
      {horizontaal ? (
        <>
          <line x1={r1(van)} y1={op} x2={r1(tot)} y2={op} />
          <line x1={r1(van)} y1={op - t} x2={r1(van)} y2={op + t} />
          <line x1={r1(tot)} y1={op - t} x2={r1(tot)} y2={op + t} />
          <text x={r1((van + tot) / 2)} y={op - 10} textAnchor="middle">
            {tekst}
          </text>
        </>
      ) : (
        <>
          <line x1={op} y1={r1(van)} x2={op} y2={r1(tot)} />
          <line x1={op - t} y1={r1(van)} x2={op + t} y2={r1(van)} />
          <line x1={op - t} y1={r1(tot)} x2={op + t} y2={r1(tot)} />
          <text x={op + 10} y={r1((van + tot) / 2) + 5} textAnchor="start">
            {tekst}
          </text>
        </>
      )}
    </g>
  );
}

const KADER: Kader = { cx: 200, cy: 166, maxW: 250, maxH: 172 };
const STAP_VOLGORDE: StapId[] = ["vorm", "openen", "maten", "bandjes", "kleur", "gegevens"];

export type Focus = "hoek" | "richting" | "a" | "b" | "diameter" | "bandjes" | null;

export function CoverDrawing({
  s,
  stap,
  focus,
  onBandje,
}: {
  s: CoverState;
  stap: StapId;
  focus: Focus;
  /** Alleen in de stap Bandjes: plekken zijn dan aan te tikken. */
  onBandje?: (id: string) => void;
}) {
  const hm = hoekmaatCm(s);
  const g = geometrie({ ...s, hm }, KADER);
  const hex = kleurHex(s.kleur);
  const donker = isDonker(hex);
  const leeg = s.vorm === null;
  const toonMaten = STAP_VOLGORDE.indexOf(stap) >= 2;
  const lijnKleur = donker ? "cf-on-dark" : "cf-on-light";
  const alle = plekken(s.vorm, s.hoek);
  const aangeduid = alle.filter((p) => s.bandjes.includes(p.id));
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;

  // De horizontale maat staat boven, de verticale rechts. Langs de vouwnaad is A.
  const A = getal(s.a);
  const B = getal(s.b);
  const D = getal(s.diameter);

  const key = (e: KeyboardEvent, id: string) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onBandje?.(id);
    }
  };

  const richting: Richting | null = s.richting && s.richting !== "onbekend" ? s.richting : null;
  const pijl = richting
    ? richting === "achter"
      ? { x1: cx, y1: g.y + g.h * 0.78, x2: cx, y2: g.y + g.h * 0.2 }
      : richting === "voor"
        ? { x1: cx, y1: g.y + g.h * 0.22, x2: cx, y2: g.y + g.h * 0.8 }
        : richting === "links"
          ? { x1: g.x + g.w * 0.78, y1: cy, x2: g.x + g.w * 0.2, y2: cy }
          : { x1: g.x + g.w * 0.22, y1: cy, x2: g.x + g.w * 0.8, y2: cy }
    : null;

  return (
    <svg
      viewBox="0 0 440 330"
      className="cf-svg"
      role={onBandje ? "group" : "img"}
      aria-label={
        onBandje
          ? "Tekening van uw cover. Duid aan waar de bandjes zitten."
          : "Tekening van uw cover met de keuzes tot nu toe."
      }
    >
      <Omtrek
        g={g}
        className={leeg ? "cf-cover is-empty" : "cf-cover"}
        style={hex ? { fill: hex } : undefined}
      />

      {!leeg && (
        <>
          {/* De vouwnaad loopt evenwijdig aan maat A. */}
          {g.foldH ? (
            <line x1={r1(g.x + 2)} y1={r1(cy)} x2={r1(g.x + g.w - 2)} y2={r1(cy)} className={`cf-fold ${lijnKleur}`} />
          ) : (
            <line x1={r1(cx)} y1={r1(g.y + 2)} x2={r1(cx)} y2={r1(g.y + g.h - 2)} className={`cf-fold ${lijnKleur}`} />
          )}
          <text
            x={g.foldH ? r1(g.x + g.w * (g.rond ? 0.2 : 0.06)) : r1(cx + 8)}
            y={g.foldH ? r1(cy - 8) : r1(cy + g.h * (g.rond ? 0.16 : 0.3))}
            className={`cf-foldtext ${lijnKleur}`}
          >
            vouwnaad
          </text>
        </>
      )}

      {focus === "hoek" && !g.rond && g.corner !== "square" && s.hoek !== "onbekend" && (
        <g className="cf-hl">
          {g.corner === "round" ? (
            <path
              d={`M${r1(g.x + g.w - g.c)},${r1(g.y)} A${r1(g.c)},${r1(g.c)} 0 0 1 ${r1(g.x + g.w)},${r1(g.y + g.c)}`}
            />
          ) : (
            <line x1={r1(g.x + g.w - g.c)} y1={r1(g.y)} x2={r1(g.x + g.w)} y2={r1(g.y + g.c)} />
          )}
          <text x={r1(g.x + g.w + 10)} y={r1(g.y + g.c + 16)}>
            {g.corner === "round" ? "hoekmaat" : "schuine kant"}
          </text>
        </g>
      )}

      {pijl && <Pijl {...pijl} className={`cf-arrow ${donker ? "cf-on-dark" : ""}`} />}

      {toonMaten && !leeg && (
        g.rond ? (
          <Maatlijn horizontaal van={g.x} tot={g.x + g.w} op={r1(g.y - 30)} label="Doorsnede" waarde={D} focus={focus === "diameter"} />
        ) : (
          <>
            <Maatlijn
              horizontaal
              van={g.x}
              tot={g.x + g.w}
              op={r1(g.y - 30)}
              label={g.foldH ? "A" : "B"}
              waarde={g.foldH ? A : B}
              focus={focus === (g.foldH ? "a" : "b")}
            />
            <Maatlijn
              horizontaal={false}
              van={g.y}
              tot={g.y + g.h}
              op={r1(g.x + g.w + 30)}
              label={g.foldH ? "B" : "A"}
              waarde={g.foldH ? B : A}
              focus={focus === (g.foldH ? "b" : "a")}
            />
          </>
        )
      )}

      {/* Bandjes: aangeduid altijd zichtbaar; in de stap Bandjes ook de lege plekken, aan te tikken. */}
      {!leeg &&
        (onBandje
          ? alle.map((p) => {
              const aan = s.bandjes.includes(p.id);
              const { px, py, nx, ny } = plekPunt(g, p);
              return (
                <g
                  key={p.id}
                  role="checkbox"
                  aria-checked={aan}
                  aria-label={p.label}
                  tabIndex={0}
                  className="cf-spot"
                  onClick={() => onBandje(p.id)}
                  onKeyDown={(e) => key(e, p.id)}
                >
                  <circle cx={r1(px + nx * 9)} cy={r1(py + ny * 9)} r={15} className="cf-spot__hit" />
                  <Bandje g={g} p={p} aan={aan} />
                </g>
              );
            })
          : aangeduid.map((p) => <Bandje key={p.id} g={g} p={p} aan />))}

      <g className="cf-you">
        <polyline points="193,302 200,295 207,302" />
        <text x={200} y={322} textAnchor="middle">
          U staat hier
        </text>
      </g>
    </svg>
  );
}

/** Kleine tekening voor een keuzekaart: dezelfde tekenregels, kleiner. */
export function MiniVorm({ vorm, hoek }: { vorm: "rechthoek" | "rond"; hoek?: Hoek }) {
  const g = geometrie({ vorm, hoek: hoek ?? "afgerond", richting: "achter", a: "", b: "" }, { cx: 40, cy: 28, maxW: 58, maxH: 40 });
  if (hoek === "afgerond") g.c = 9;
  if (hoek === "afgesneden") g.c = 10;
  if (hoek === "recht") g.c = 0;
  return (
    <svg viewBox="0 0 80 56" className="cf-mini" aria-hidden="true">
      <Omtrek g={g} className="cf-mini__shape" />
    </svg>
  );
}

/** Een hoek van dichtbij, zodat het verschil tussen afgerond, schuin en recht meteen opvalt. */
export function MiniHoek({ hoek }: { hoek: Exclude<Hoek, "onbekend"> }) {
  const d =
    hoek === "afgerond"
      ? "M12,50 V30 A22,22 0 0 1 34,8 H70"
      : hoek === "afgesneden"
        ? "M12,50 V26 L30,8 H70"
        : "M12,50 V8 H70";
  return (
    <svg viewBox="0 0 80 56" className="cf-mini" aria-hidden="true">
      <path d={d} className="cf-mini__edge" />
    </svg>
  );
}

/** Een cover van bovenaf met een pijl: waar hij naartoe klapt, gezien vanaf de instap. */
export function MiniRichting({ richting }: { richting: Exclude<Richting, "onbekend"> }) {
  const pijl =
    richting === "achter"
      ? { x1: 40, y1: 38, x2: 40, y2: 12 }
      : richting === "voor"
        ? { x1: 40, y1: 14, x2: 40, y2: 40 }
        : richting === "links"
          ? { x1: 54, y1: 25, x2: 24, y2: 25 }
          : { x1: 26, y1: 25, x2: 56, y2: 25 };
  return (
    <svg viewBox="0 0 80 56" className="cf-mini" aria-hidden="true">
      <rect x={14} y={6} width={52} height={38} rx={5} className="cf-mini__shape" />
      <Pijl {...pijl} className="cf-arrow cf-arrow--mini" />
      <polyline points="35,54 40,49 45,54" className="cf-mini__you" />
    </svg>
  );
}

/** Zijaanzicht van de rand, van dichtbij: waar de rok hangt en hoe lang een bandje is. */
export function Zijaanzicht({ focus, rok, band, kleur }: { focus: "rok" | "band"; rok: number | null; band: number | null; kleur: string | null }) {
  const hex = kleurHex(kleur);
  const donker = isDonker(hex);
  const rp = rok ? Math.min(Math.max(rok * 3, 14), 54) : 30;
  const bp = band ? Math.min(Math.max(band * 2.2, 44), 100) : 66;
  const toonRok = focus === "rok" || (rok ?? 0) > 0;
  const vulling = hex ? { fill: hex } : undefined;
  return (
    <svg viewBox="0 0 340 196" className="cf-side" aria-hidden="true">
      <rect x={-20} y={84} width={254} height={130} className="cf-side__spa" />
      <text x={104} y={152} textAnchor="middle" className="cf-side__label">
        spa
      </text>
      <path d="M-20,40 L242,58 L242,84 L-20,84 Z" className="cf-cover" style={vulling} />
      <text x={60} y={74} className={donker ? "cf-side__label is-light" : "cf-side__label"}>
        cover
      </text>
      {toonRok && <rect x={234} y={84} width={10} height={r1(rp)} className="cf-cover cf-side__rok" style={vulling} />}
      {focus === "band" && (
        <>
          <rect x={247} y={64} width={8} height={r1(bp)} rx={2} className="cf-side__band" />
          <rect x={243} y={r1(64 + bp)} width={16} height={11} rx={3} className="cf-side__clip" />
          <rect x={234} y={r1(64 + bp + 3)} width={9} height={5} className="cf-side__clip" />
        </>
      )}
      {focus === "rok" ? (
        <g className="cf-dim is-focus">
          <line x1={270} y1={84} x2={270} y2={r1(84 + rp)} />
          <line x1={264} y1={84} x2={276} y2={84} />
          <line x1={264} y1={r1(84 + rp)} x2={276} y2={r1(84 + rp)} />
          <text x={284} y={r1(84 + rp / 2 + 6)}>rok</text>
        </g>
      ) : (
        <g className="cf-dim is-focus">
          <line x1={276} y1={64} x2={276} y2={r1(64 + bp + 11)} />
          <line x1={270} y1={64} x2={282} y2={64} />
          <line x1={270} y1={r1(64 + bp + 11)} x2={282} y2={r1(64 + bp + 11)} />
          <text x={288} y={r1(64 + (bp + 11) / 2 + 6)}>lengte</text>
        </g>
      )}
    </svg>
  );
}
