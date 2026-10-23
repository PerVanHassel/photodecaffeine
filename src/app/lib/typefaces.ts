import type { ArticlePage, TextLook, TypeId } from "./articlePage";

// The letters an article can be set in.
//
// The library is from Fontshare (Indian Type Foundry): free for commercial
// use, served from their CDN, one stylesheet per family. On top of that the
// studio can link its own Adobe Fonts web project; those fonts are keyed
// "adobe:<family>" and the page stores the project id (`kit`), so the site
// knows which stylesheet to load.
//
// A page loads only the families it uses.

export type FontGroup = "site" | "serif" | "sans" | "display" | "adobe";

/** How a face sets a heading: weight, capitals, spacing, line height and a size factor. */
export interface HeadMetrics {
  w: number;
  upper: boolean;
  track: string;
  lh: number;
  /** Size relative to the site's Inter 900: narrow faces go up, wide ones down. */
  ds: number;
}

export interface FontDef {
  key: string;
  name: string;
  /** The CSS font-family value. */
  family: string;
  group: FontGroup;
  about: string;
  /** Fontshare: slug@styles. */
  spec?: string;
  weights: number[];
  italic: boolean;
  head: HeadMetrics;
  /** Weight and size when the face sets running text. */
  textW: number;
  textSize: number;
}

const range = (from: number, to: number) => [100, 200, 300, 400, 500, 600, 700, 800, 900].filter((w) => w >= from && w <= to);

function face(key: string, name: string, group: FontGroup, about: string, spec: string, weights: number[], italic: boolean,
  head: Partial<HeadMetrics> & { w: number }, text: { w?: number; size?: number } = {}): FontDef {
  const fallback = group === "serif" ? "serif" : "sans-serif";
  return {
    key, name, group, about, spec, weights, italic,
    family: `'${name}', ${fallback}`,
    head: { upper: false, track: "-0.02em", lh: 0.98, ds: 1, ...head },
    textW: text.w ?? 400,
    textSize: text.size ?? (group === "serif" ? 19 : 17.5),
  };
}

export const INTER: FontDef = {
  key: "inter", name: "Inter", family: "'Inter', sans-serif", group: "site", about: "De letter van de rest van de site.",
  weights: range(300, 900), italic: false, head: { w: 900, upper: true, track: "-0.035em", lh: 0.9, ds: 1 }, textW: 400, textSize: 18,
};

export const FONTS: FontDef[] = [
  INTER,
  face("zodiak", "Zodiak", "serif", "Scherp en chic, met grote contrasten.", "zodiak@1,2", range(100, 900), true, { w: 400, track: "-0.025em", lh: 0.96, ds: 1.1 }),
  face("melodrama", "Melodrama", "serif", "Dramatisch, als een filmposter.", "melodrama@1", range(300, 700), false, { w: 500, track: "-0.01em", lh: 0.94, ds: 1.16 }),
  face("boska", "Boska", "serif", "Elegant met karakter en een mooie cursief.", "boska@1,2", range(200, 900), true, { w: 500, track: "-0.02em", lh: 0.96, ds: 1.08 }),
  face("gambetta", "Gambetta", "serif", "Warme tijdschriftletter, ook voor lange tekst.", "gambetta@1,2", range(300, 700), true, { w: 600, track: "-0.025em", lh: 1, ds: 1.02 }),
  face("bespoke-serif", "Bespoke Serif", "serif", "Modern klassiek, rustig en verfijnd.", "bespoke-serif@1,2", range(300, 800), true, { w: 500, track: "-0.02em", lh: 0.98, ds: 1.04 }),
  face("erode", "Erode", "serif", "Helder en goed leesbaar, voor alinea's.", "erode@1,2", range(300, 700), true, { w: 600, track: "-0.02em", lh: 1, ds: 1 }),
  face("sentient", "Sentient", "serif", "Zacht en vriendelijk, voor alinea's.", "sentient@1,2", range(200, 700), true, { w: 500, track: "-0.02em", lh: 1, ds: 1.02 }),
  face("gambarino", "Gambarino", "serif", "Speels, met een vleugje jaren zeventig.", "gambarino@400", [400], false, { w: 400, track: "-0.01em", lh: 1, ds: 1.1 }),
  face("satoshi", "Satoshi", "sans", "Strak en modern, prettig leesbaar.", "satoshi@1,2", range(300, 900), true, { w: 700, track: "-0.045em", lh: 0.95 }),
  face("general-sans", "General Sans", "sans", "Neutraal, net iets warmer.", "general-sans@1,2", range(200, 700), true, { w: 600, track: "-0.045em", lh: 0.95 }),
  face("switzer", "Switzer", "sans", "Zwitsers, zakelijk en zuiver.", "switzer@1,2", range(100, 900), true, { w: 700, track: "-0.05em", lh: 0.95 }),
  face("supreme", "Supreme", "sans", "Geometrisch en ruim.", "supreme@1,2", range(100, 800), true, { w: 700, track: "-0.045em", lh: 0.95 }),
  face("author", "Author", "sans", "Licht eigenwijs, met karakter in de details.", "author@1,2", range(200, 700), true, { w: 600, track: "-0.03em", lh: 0.98, ds: 1.02 }),
  face("clash-display", "Clash Display", "display", "Scherp en zelfverzekerd.", "clash-display@1", range(200, 700), false, { w: 600, track: "-0.03em", lh: 0.92, ds: 1.04 }, { w: 400 }),
  face("cabinet-grotesk", "Cabinet Grotesk", "display", "Vet en vrolijk.", "cabinet-grotesk@1", range(100, 900), false, { w: 800, track: "-0.035em", lh: 0.92, ds: 1.04 }),
  face("tanker", "Tanker", "display", "Smal en zwaar: een posterletter.", "tanker@400", [400], false, { w: 400, upper: true, track: "0.005em", lh: 0.88, ds: 1.25 }),
  face("panchang", "Panchang", "display", "Heel breed en opvallend.", "panchang@1", range(200, 800), false, { w: 700, upper: true, track: "-0.01em", lh: 0.95, ds: 0.78 }),
  face("stardom", "Stardom", "display", "Fijn en sierlijk, voor grote koppen.", "stardom@400", [400], false, { w: 400, track: "-0.01em", lh: 0.95, ds: 1.15 }),
];

export const FONT_GROUPS: { group: FontGroup; label: string }[] = [
  { group: "site", label: "Van de site" },
  { group: "serif", label: "Schreef" },
  { group: "sans", label: "Schreefloos" },
  { group: "display", label: "Voor grote koppen" },
  { group: "adobe", label: "Adobe Fonts" },
];

/** An Adobe Fonts family by its CSS name (e.g. "ivypresto-display"). */
export function adobeFont(family: string, serif = false, weights: number[] = range(300, 700), italic = true): FontDef {
  const name = family.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  return {
    key: `adobe:${family}`, name, family: `"${family}", ${serif ? "serif" : "sans-serif"}`, group: "adobe", about: "Uit jullie Adobe Fonts-project.",
    weights, italic, head: { w: weights.includes(500) ? 500 : weights[0] ?? 400, upper: false, track: "-0.02em", lh: 0.98, ds: 1.04 },
    textW: weights.includes(400) ? 400 : weights[0] ?? 400, textSize: serif ? 19 : 17.5,
  };
}

/** The face for a key; Adobe fonts are described from the key alone, unknown keys give the site's own. */
export function fontDef(key: string | undefined): FontDef {
  if (!key) return INTER;
  if (key.startsWith("adobe:")) return adobeFont(key.slice(6));
  return FONTS.find((f) => f.key === key) ?? INTER;
}

/** The stylesheet that brings a face, or null when the site has it already. */
export function fontCss(key: string | undefined, kit?: string): string | null {
  if (!key || key === "inter") return null;
  if (key.startsWith("adobe:")) return kit ? adobeKitCss(kit) : null;
  const f = FONTS.find((x) => x.key === key);
  return f?.spec ? `https://api.fontshare.com/v2/css?f[]=${f.spec}&display=swap` : null;
}

export const adobeKitCss = (kit: string) => `https://use.typekit.net/${kit}.css`;

/** An Adobe Fonts project id from whatever was pasted: the id, the link or the embed code. */
export function parseKit(input: string): string | null {
  const s = input.trim();
  const fromLink = s.match(/typekit\.net\/([a-z0-9]{5,10})(?:\.css|\.js)?/i);
  if (fromLink) return fromLink[1].toLowerCase();
  return /^[a-z0-9]{5,10}$/i.test(s) ? s.toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Pairs
// ---------------------------------------------------------------------------

/** Ready-made pairs: a face for headings, one for reading. */
export const PAIRS: { id: TypeId; name: string; about: string; display: string; text: string }[] = [
  { id: "huisstijl", name: "Huisstijl", about: "Zwaar en in hoofdletters, zoals de rest van de site.", display: "inter", text: "inter" },
  { id: "premiere", name: "Première", about: "Filmisch drama in de koppen, rustige tekst eronder.", display: "melodrama", text: "satoshi" },
  { id: "galerie", name: "Galerie", about: "Chic en luchtig, als een galeriecatalogus.", display: "zodiak", text: "general-sans" },
  { id: "magazine", name: "Magazine", about: "Een warm tijdschrift: schreef voor kop en tekst.", display: "gambetta", text: "sentient" },
  { id: "atelier", name: "Atelier", about: "Scherp en eigentijds, als een ontwerpbureau.", display: "clash-display", text: "switzer" },
  { id: "affiche", name: "Affiche", about: "Smalle, zware posterkoppen.", display: "tanker", text: "satoshi" },
  { id: "elegant", name: "Elegant", about: "Sierlijke koppen met een cursief om van te houden.", display: "boska", text: "erode" },
  { id: "panorama", name: "Panorama", about: "Breed en opvallend, voor een stuk dat mag knallen.", display: "panchang", text: "switzer" },
  { id: "vrolijk", name: "Vrolijk", about: "Vet en vriendelijk.", display: "cabinet-grotesk", text: "general-sans" },
];

export const pairOf = (page: ArticlePage) => PAIRS.find((p) => p.id === page.type) ?? PAIRS[0];

/** The faces a page uses for headings and for text: its pair, or what was chosen instead. */
export function pageFaces(page: ArticlePage) {
  const pair = pairOf(page);
  return { display: fontDef(page.displayFont ?? pair.display), text: fontDef(page.textFont ?? pair.text) };
}

/** Heading settings as the custom properties article.css reads. */
function headVars(f: FontDef): Record<string, string> {
  return {
    "--pa-display": f.family,
    "--pa-display-w": String(f.head.w),
    "--pa-display-case": f.head.upper ? "uppercase" : "none",
    "--pa-display-track": f.head.track,
    "--pa-display-lh": String(f.head.lh),
    "--pa-ds": String(f.head.ds),
  };
}

/** The page's letters as custom properties on the article. */
export function pageVars(page: ArticlePage): Record<string, string> {
  const { display, text } = pageFaces(page);
  const serifHead = display.group === "serif" || display.group === "adobe";
  return {
    ...headVars(display),
    // Statements are long: never in capitals, and heavy faces go a little lighter.
    "--pa-statement-font": display.family,
    "--pa-statement-w": String(display.key === "inter" ? 700 : display.head.w),
    "--pa-statement-track": display.head.upper ? "-0.01em" : display.head.track,
    "--pa-ss": String(Math.min(display.head.ds, 1.15)),
    "--pa-text-font": text.family,
    "--pa-text-size": `${text.textSize}px`,
    "--pa-text-w": String(text.textW),
    "--pa-lead-w": String(text.weights.includes(300) ? 300 : text.textW),
    "--pa-label-font": text.family,
    "--pa-quote-font": serifHead ? display.family : text.family,
    "--pa-quote-w": String(serifHead ? Math.min(display.head.w, 400) : 300),
  };
}

export type LookRole = "display" | "text";

/**
 * A block's own face and weight. For headings and statements the face's
 * heading settings come along, so a poster face set in one heading still
 * reads like a poster.
 */
export function lookVars(look: TextLook | undefined, role: LookRole): Record<string, string> {
  if (!look?.font && !look?.weight) return {};
  const out: Record<string, string> = {};
  if (look.font) {
    const f = fontDef(look.font);
    out["--pa-bf"] = f.family;
    if (role === "display") Object.assign(out, headVars(f));
    out["--pa-bw"] = String(look.weight ?? (role === "display" ? f.head.w : f.textW));
  } else if (look.weight) {
    out["--pa-bw"] = String(look.weight);
  }
  return out;
}

/** Every stylesheet a page needs: its pair, its own choices and those of its texts. */
export function pageFontLinks(page: ArticlePage): string[] {
  const pair = pairOf(page);
  const keys = new Set<string>([page.displayFont ?? pair.display, page.textFont ?? pair.text]);
  if (page.titleLook?.font) keys.add(page.titleLook.font);
  for (const b of page.blocks) if ("look" in b && b.look?.font) keys.add(b.look.font);
  return [...new Set([...keys].map((k) => fontCss(k, page.kit)).filter((u): u is string => !!u))];
}

/** Whether a page uses any Adobe font (and so needs its project). */
export function usesAdobe(page: ArticlePage) {
  return [page.displayFont, page.textFont, page.titleLook?.font, ...page.blocks.map((b) => ("look" in b ? b.look?.font : undefined))]
    .some((k) => k?.startsWith("adobe:"));
}

export const WEIGHT_NAMES: Record<number, string> = {
  100: "Haarfijn", 200: "Extra dun", 300: "Dun", 400: "Normaal", 500: "Medium", 600: "Halfvet", 700: "Vet", 800: "Extra vet", 900: "Zwart",
};
