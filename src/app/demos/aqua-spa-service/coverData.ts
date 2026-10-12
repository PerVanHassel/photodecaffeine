/**
 * Het coverformulier: keuzes, controles en de mail die Arjan krijgt.
 *
 * Wat hij nodig heeft komt uit het gesprek van 24-09-2026 en uit het
 * bestelformulier van spacovers.nl, waar hij vermoedelijk bestelt: de vorm,
 * de hoek (afgerond = S-maat, schuin = Z-maat), de maat langs de vouwnaad (Y)
 * en eroverheen (X), de rok, de bandjes met lengte en hart-op-hartmaat, de
 * kleur en drie opties. Wij vragen het in gewone woorden; de mail zet het
 * terug in de termen van de leverancier. Kleuren en opties laten bevestigen.
 */

export type Vorm = "rechthoek" | "rond";
export type Hoek = "afgerond" | "afgesneden" | "recht" | "onbekend";
export type Richting = "achter" | "voor" | "links" | "rechts" | "onbekend";
export type JaNee = "ja" | "nee" | "onbekend";
export type HoekmaatKeuze = "13" | "18" | "anders" | "onbekend";
export type BandjesStatus = "gekozen" | "geen" | "onbekend";

export interface CoverState {
  vorm: Vorm | null;
  hoek: Hoek | null;
  hoekmaatKeuze: HoekmaatKeuze | null;
  hoekmaat: string;
  schuin: string;
  schuinOnbekend: boolean;
  richting: Richting | null;
  a: string;
  b: string;
  diameter: string;
  metenLastig: boolean;
  rok: JaNee | null;
  rokMaat: string;
  bandjes: string[];
  bandjesStatus: BandjesStatus | null;
  bandLengte: string;
  hoh: string;
  kleur: string | null;
  vochtscherm: boolean;
  handvaten: boolean;
  folie: boolean;
  naam: string;
  telefoon: string;
  email: string;
  plaats: string;
  toestel: string;
  opmerking: string;
}

export const LEEG: CoverState = {
  vorm: null,
  hoek: null,
  hoekmaatKeuze: null,
  hoekmaat: "",
  schuin: "",
  schuinOnbekend: false,
  richting: null,
  a: "",
  b: "",
  diameter: "",
  metenLastig: false,
  rok: null,
  rokMaat: "",
  bandjes: [],
  bandjesStatus: null,
  bandLengte: "",
  hoh: "",
  kleur: null,
  vochtscherm: false,
  handvaten: false,
  folie: false,
  naam: "",
  telefoon: "",
  email: "",
  plaats: "",
  toestel: "",
  opmerking: "",
};

export const STAPPEN = [
  { id: "vorm", label: "Vorm" },
  { id: "openen", label: "Openen" },
  { id: "maten", label: "Maten" },
  { id: "bandjes", label: "Bandjes" },
  { id: "kleur", label: "Kleur" },
  { id: "gegevens", label: "Gegevens" },
] as const;
export type StapId = (typeof STAPPEN)[number]["id"];

/** De kleuren van het bestelformulier van de leverancier. Op een scherm wijken ze altijd wat af. */
export const KLEUREN = [
  { naam: "Zwart", hex: "#1f2023" },
  { naam: "Donker grijs", hex: "#45484d" },
  { naam: "Grijs", hex: "#868a90" },
  { naam: "Donker bruin", hex: "#3e2c24" },
  { naam: "Bruin", hex: "#71472c" },
  { naam: "Groen", hex: "#34432f" },
  { naam: "Donker blauw", hex: "#1e2a47" },
  { naam: "Blauw", hex: "#2d4f80" },
  { naam: "Crème", hex: "#d8c8a0" },
  { naam: "Off white", hex: "#e6e0d2" },
  { naam: "Wit", hex: "#f3f3f0" },
];
export const KLEUR_ONBEKEND = "Weet ik nog niet";

export const kleurHex = (naam: string | null) => KLEUREN.find((k) => k.naam === naam)?.hex ?? null;

/** Licht of donker, zodat lijnen en pijlen op de cover leesbaar blijven. */
export function isDonker(hex: string | null) {
  if (!hex) return false;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

export const RICHTING_TEKST: Record<Richting, string> = {
  achter: "Van mij af",
  voor: "Naar mij toe",
  links: "Naar links",
  rechts: "Naar rechts",
  onbekend: "Weet ik niet",
};

// ---------- bandjes ----------

export type Zijde = "achter" | "voor" | "links" | "rechts" | "hoek";

export interface Plek {
  id: string;
  label: string;
  zijde: Zijde;
  /** Rechthoek: plaats langs de rand, 0 tot 1. Rond: hoek in graden, 0 = achter. */
  pos: number;
}

/** Plekken voor bandjes, benoemd vanaf waar de klant in de spa stapt. */
export function plekken(vorm: Vorm | null, hoek: Hoek | null): Plek[] {
  if (vorm === "rond") {
    const namen = ["Achter", "Achter rechts", "Rechts", "Voor rechts", "Voor", "Voor links", "Links", "Achter links"];
    return namen.map((label, i) => ({ id: `r${i}`, label, zijde: "hoek" as Zijde, pos: i * 45 }));
  }
  const p: Plek[] = [
    { id: "achter-l", label: "Achterkant, links", zijde: "achter", pos: 0.22 },
    { id: "achter-m", label: "Achterkant, midden", zijde: "achter", pos: 0.5 },
    { id: "achter-r", label: "Achterkant, rechts", zijde: "achter", pos: 0.78 },
    { id: "voor-l", label: "Voorkant, links", zijde: "voor", pos: 0.22 },
    { id: "voor-m", label: "Voorkant, midden", zijde: "voor", pos: 0.5 },
    { id: "voor-r", label: "Voorkant, rechts", zijde: "voor", pos: 0.78 },
    { id: "links-a", label: "Linkerkant, achteraan", zijde: "links", pos: 0.28 },
    { id: "links-v", label: "Linkerkant, vooraan", zijde: "links", pos: 0.72 },
    { id: "rechts-a", label: "Rechterkant, achteraan", zijde: "rechts", pos: 0.28 },
    { id: "rechts-v", label: "Rechterkant, vooraan", zijde: "rechts", pos: 0.72 },
  ];
  if (hoek === "afgesneden") {
    p.push(
      { id: "hoek-al", label: "Schuine hoek, achter links", zijde: "hoek", pos: 315 },
      { id: "hoek-ar", label: "Schuine hoek, achter rechts", zijde: "hoek", pos: 45 },
      { id: "hoek-vr", label: "Schuine hoek, voor rechts", zijde: "hoek", pos: 135 },
      { id: "hoek-vl", label: "Schuine hoek, voor links", zijde: "hoek", pos: 225 }
    );
  }
  return p;
}

// ---------- getallen ----------

export function getal(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Hoekmaat in cm, of null als die onbekend is. */
export function hoekmaatCm(s: CoverState): number | null {
  if (s.hoek === "afgerond") {
    if (s.hoekmaatKeuze === "13") return 13;
    if (s.hoekmaatKeuze === "18") return 18;
    if (s.hoekmaatKeuze === "anders") return getal(s.hoekmaat);
    return null;
  }
  if (s.hoek === "afgesneden") return s.schuinOnbekend ? null : getal(s.schuin);
  return null;
}

/** Een maat die wel kan, maar ongebruikelijk is. Geen fout, wel een vraag om na te meten. */
export function matenWaarschuwing(n: number | null) {
  if (n === null) return undefined;
  if (n < 150 || n > 260) return "Klopt dit? De meeste spa's zitten tussen 150 en 260 cm. Meet gerust nog eens na.";
  return undefined;
}

// ---------- controles per stap ----------

export type Fouten = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function bereik(n: number | null, min: number, max: number) {
  return n !== null && n >= min && n <= max;
}

export function controleer(stap: StapId, s: CoverState): Fouten {
  const f: Fouten = {};
  if (stap === "vorm") {
    if (!s.vorm) f.vorm = "Kies de vorm die het dichtst bij uw cover komt.";
    if (s.vorm === "rechthoek") {
      if (!s.hoek) f.hoek = "Kies hoe de hoeken eruitzien, of kies Weet ik niet.";
      if (s.hoek === "afgerond") {
        if (!s.hoekmaatKeuze) f.hoekmaat = "Kies de hoekmaat, of kies Weet ik niet.";
        else if (s.hoekmaatKeuze === "anders" && !bereik(getal(s.hoekmaat), 2, 60))
          f.hoekmaatAnders = "Vul de hoekmaat in, tussen 2 en 60 cm.";
      }
      if (s.hoek === "afgesneden" && !s.schuinOnbekend && !bereik(getal(s.schuin), 5, 80))
        f.schuin = "Vul de lengte van de schuine kant in, tussen 5 en 80 cm. Of kies Weet ik niet.";
    }
  }
  if (stap === "openen" && !s.richting) f.richting = "Kies naar welke kant de cover openklapt, of kies Weet ik niet.";
  if (stap === "maten") {
    const verplicht = !s.metenLastig;
    const check = (veld: "a" | "b" | "diameter", tekst: string) => {
      const n = getal(s[veld]);
      if (s[veld].trim() === "") {
        if (verplicht) f[veld] = tekst;
      } else if (!bereik(n, 50, 400)) f[veld] = "Vul een maat in centimeters in, tussen 50 en 400.";
    };
    if (s.vorm === "rond") check("diameter", "Vul de doorsnede in.");
    else {
      check("a", "Vul de maat langs de vouwnaad in.");
      check("b", "Vul de maat over de vouwnaad in.");
    }
    if (!s.rok) f.rok = "Kies of uw cover een rok heeft, of kies Weet ik niet.";
    if (s.rok === "ja" && s.rokMaat.trim() !== "" && !bereik(getal(s.rokMaat), 1, 30))
      f.rokMaat = "Vul de lengte van de rok in, tussen 1 en 30 cm.";
  }
  if (stap === "bandjes") {
    if (!s.bandjesStatus) f.bandjes = "Tik aan waar de bandjes zitten, of kies Geen bandjes of Weet ik niet.";
    if (s.bandLengte.trim() !== "" && !bereik(getal(s.bandLengte), 5, 80))
      f.bandLengte = "Vul de lengte in, tussen 5 en 80 cm.";
    if (s.hoh.trim() !== "" && !bereik(getal(s.hoh), 10, 400)) f.hoh = "Vul de afstand in, tussen 10 en 400 cm.";
  }
  if (stap === "kleur" && !s.kleur) f.kleur = "Kies een kleur, of kies Weet ik nog niet.";
  if (stap === "gegevens") {
    if (!s.naam.trim()) f.naam = "Vul uw naam in.";
    if (!s.telefoon.trim()) f.telefoon = "Vul een telefoonnummer in waarop wij u bereiken.";
    if (!EMAIL.test(s.email.trim())) f.email = "Vul een geldig e-mailadres in.";
    if (!s.plaats.trim()) f.plaats = "Vul uw postcode en gemeente in.";
  }
  return f;
}

// ---------- samenvatting ----------

const cm = (s: string) => (getal(s) === null ? null : `${getal(s)} cm`);

export function vormTekst(s: CoverState) {
  if (s.vorm === "rond") return "Rond";
  if (s.vorm !== "rechthoek") return null;
  const hm = hoekmaatCm(s);
  const hoek =
    s.hoek === "afgerond"
      ? `afgeronde hoeken${hm !== null ? ` van ${hm} cm` : ""}`
      : s.hoek === "afgesneden"
        ? `schuine hoeken${hm !== null ? ` van ${hm} cm` : ""}`
        : s.hoek === "recht"
          ? "rechte hoeken"
          : s.hoek === "onbekend"
            ? "hoeken onbekend"
            : null;
  return hoek ? `Rechthoek, ${hoek}` : "Rechthoek";
}

export function matenTekst(s: CoverState) {
  if (s.vorm === "rond") return cm(s.diameter) ? `Doorsnede ${cm(s.diameter)}` : null;
  const a = getal(s.a);
  const b = getal(s.b);
  if (a === null && b === null) return null;
  return `${a ?? "?"} × ${b ?? "?"} cm`;
}

export function rokTekst(s: CoverState) {
  if (s.rok === "nee") return "Geen rok";
  if (s.rok === "onbekend") return "Rok onbekend";
  if (s.rok === "ja") return cm(s.rokMaat) ? `Rok van ${cm(s.rokMaat)}` : "Met rok";
  return null;
}

export function bandjesTekst(s: CoverState) {
  if (s.bandjesStatus === "geen") return "Geen bandjes";
  if (s.bandjesStatus === "onbekend") return "Bandjes onbekend";
  if (s.bandjesStatus === "gekozen") return `${s.bandjes.length} ${s.bandjes.length === 1 ? "bandje" : "bandjes"}`;
  return null;
}

export function optiesTekst(s: CoverState) {
  const o = [s.vochtscherm && "extra vochtscherm", s.handvaten && "handvaten", s.folie && "reflecterende folie"].filter(Boolean);
  return o.length ? o.join(", ") : "Geen opties";
}

/** De mail aan Arjan, in de termen van zijn leverancier. */
export function mailRegels(s: CoverState, belmoment: string, foto: string | null): string[] {
  const ja = (b: boolean) => (b ? "ja" : "nee");
  const r: string[] = ["Aanvraag voor een cover op maat", ""];
  r.push(`Vorm: ${s.vorm === "rond" ? "Rond" : "Vierkant of rechthoek"}`);
  if (s.vorm === "rechthoek") {
    const hm = hoekmaatCm(s);
    const hoek =
      s.hoek === "afgerond"
        ? `Afgerond, S-maat ${hm !== null ? `${hm} cm` : "onbekend"}`
        : s.hoek === "afgesneden"
          ? `Schuin afgesneden, Z-maat ${hm !== null ? `${hm} cm` : "onbekend"}`
          : s.hoek === "recht"
            ? "Recht"
            : "Onbekend";
    r.push(`Hoeken: ${hoek}`);
  }
  r.push(`Klapt open: ${s.richting ? RICHTING_TEKST[s.richting].toLowerCase() : "niet opgegeven"} (gezien vanaf waar de klant instapt)`);
  r.push("");
  if (s.vorm === "rond") r.push(`Doorsnede: ${cm(s.diameter) ?? "onbekend"}`);
  else {
    r.push(`Y-maat, langs de vouwnaad: ${cm(s.a) ?? "onbekend"}`);
    r.push(`X-maat, over de vouwnaad: ${cm(s.b) ?? "onbekend"}`);
  }
  r.push(`Rok: ${s.rok === "nee" ? "geen" : s.rok === "ja" ? (cm(s.rokMaat) ?? "ja, lengte onbekend") : "onbekend"}`);
  if (s.metenLastig) r.push("De klant twijfelt over de maten: graag even nabellen.");
  r.push("");
  if (s.bandjesStatus === "gekozen") {
    const namen = plekken(s.vorm, s.hoek)
      .filter((p) => s.bandjes.includes(p.id))
      .map((p) => p.label.toLowerCase());
    r.push(`Bandjes: ${s.bandjes.length} (${namen.join("; ")})`);
    r.push(`Lengte bandje: ${cm(s.bandLengte) ?? "onbekend"}`);
    r.push(`Hart op hart: ${cm(s.hoh) ?? "onbekend"}`);
  } else r.push(`Bandjes: ${s.bandjesStatus === "geen" ? "geen" : "onbekend"}`);
  r.push("");
  r.push(`Kleur: ${s.kleur ?? "niet opgegeven"}`);
  r.push(`Extra vochtscherm: ${ja(s.vochtscherm)}`);
  r.push(`Handvaten: ${ja(s.handvaten)}`);
  r.push(`Reflecterende folie: ${ja(s.folie)}`);
  r.push("");
  r.push(`Merk en type spa: ${s.toestel.trim() || "niet opgegeven"}`);
  r.push(foto ? `Foto: ${foto} (voeg deze toe als bijlage)` : "Geen foto");
  r.push("");
  r.push(`Naam: ${s.naam}`);
  r.push(`Telefoon: ${s.telefoon}`);
  r.push(`E-mail: ${s.email}`);
  r.push(`Postcode en gemeente: ${s.plaats}`);
  r.push(`Voorkeur belmoment: ${belmoment}`);
  r.push(`Opmerking: ${s.opmerking.trim() || "geen"}`);
  return r;
}
