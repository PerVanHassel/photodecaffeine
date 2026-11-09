import type { Project } from "../types";

// The looks a client gallery can have. The studio picks one per project; each
// brings its own layout, type and colours, and an accent can be set on top.

export type GalleryStyle = "atelier" | "editorial" | "noir" | "zacht" | "catalogus" | "arena";

/** How the photos are laid out in the large view. The compact view is always justified rows. */
export type GalleryLayout = "rows" | "story" | "masonry" | "sheet" | "tempo";

export interface StyleDef {
  id: GalleryStyle;
  name: string;
  /** Admin: the kind of shoot it suits. */
  fits: string;
  layout: GalleryLayout;
  accent: string;
  dark?: boolean;
  /** The stylesheet in public/fonts for the titles, loaded only when this style is shown. */
  font?: string;
}

// One request for both looks that use Fraunces, so the two never load clashing copies.
const FRAUNCES = "fraunces";
const INSTRUMENT = "instrument-serif";
// Condensed heavy italics only: Arena sets its titles and numbers in nothing else.
const ARCHIVO = "archivo";
const ALL_FONTS_BASE = [FRAUNCES, INSTRUMENT, ARCHIVO];
/** Every title font of the styles, for the admin's style thumbnails. */
export const ALL_FONTS = ALL_FONTS_BASE;
export const fontHref = (font: string) => `/fonts/${font}.css`;

export const STYLES: StyleDef[] = [
  { id: "atelier", name: "Atelier", fits: "Portretten, gezinnen, alles wat tijdloos moet zijn", layout: "rows", accent: "#b06a2c", font: FRAUNCES },
  { id: "editorial", name: "Editorial", fits: "Bruiloften, fashion en koppels", layout: "story", accent: "#7d3c33", font: INSTRUMENT },
  { id: "noir", name: "Noir", fits: "Auto's, events, avond- en nachtwerk", layout: "rows", accent: "#d9a46a", dark: true },
  { id: "zacht", name: "Zacht", fits: "Newborn, zwangerschap en familie", layout: "masonry", accent: "#c48b7e", font: FRAUNCES },
  { id: "catalogus", name: "Catalogus", fits: "Zakelijk, producten, teams en vastgoed", layout: "sheet", accent: "#3a5a8c" },
  { id: "arena", name: "Arena", fits: "Sport: wedstrijden, teams, atleten en events", layout: "tempo", accent: "#e4572e", font: ARCHIVO },
];

export const ACCENTS: { name: string; hex: string }[] = [
  { name: "Koper", hex: "#b06a2c" },
  { name: "Terracotta", hex: "#b4553a" },
  { name: "Bordeaux", hex: "#7d3c33" },
  { name: "Oudroze", hex: "#c48b7e" },
  { name: "Oker", hex: "#b8892f" },
  { name: "Salie", hex: "#6f8466" },
  { name: "Oceaan", hex: "#3a5a8c" },
  { name: "Inkt", hex: "#26262b" },
];

const byId = new Map(STYLES.map((s) => [s.id, s]));
const HEX = /^#[0-9a-f]{6}$/i;

/** The style as set, with the studio's own choices on top: layout, light or dark, and the title font. */
export function styleOf(p: Pick<Project, "gallerySettings">): StyleDef {
  const base = byId.get(p.gallerySettings.style as GalleryStyle) || STYLES[0];
  const gs = p.gallerySettings;
  const layout = LAYOUTS.some((l) => l.id === gs.layout) ? (gs.layout as GalleryLayout) : base.layout;
  const font = FONTS.find((f) => f.id === gs.font);
  return {
    ...base,
    layout,
    dark: gs.theme ? gs.theme === "dark" : base.dark,
    font: font ? font.file : base.font,
  };
}

/** The ways to lay out the photos in the large view. */
export const LAYOUTS: { id: GalleryLayout; name: string; fits: string }[] = [
  { id: "rows", name: "Rijen", fits: "Elke foto heel, in rijen van gelijke hoogte" },
  { id: "story", name: "Verhaal", fits: "Groot en klein door elkaar, als een tijdschrift" },
  { id: "masonry", name: "Metselwerk", fits: "Kolommen die doorlopen, rustig en zacht" },
  { id: "sheet", name: "Contactvel", fits: "Elke foto in een vak, met nummer en naam" },
  { id: "tempo", name: "Tempo", fits: "Een hoge rij, dan twee lage: als een serie" },
];

/** Fonts for the titles, all served from public/fonts. */
export interface FontDef {
  id: string;
  name: string;
  feel: string;
  /** The stylesheet in public/fonts; empty for the studio's own Geist. */
  file: string;
  /** CSS for the title: family, weight, style, tracking and variation settings. */
  vars: Record<string, string>;
}

export const FONTS: FontDef[] = [
  { id: "fraunces", name: "Fraunces", feel: "Warm en klassiek", file: FRAUNCES, vars: { "--g-display": "\"Fraunces\", Georgia, serif", "--g-display-weight": "380", "--g-display-style": "normal", "--g-display-track": "-0.03em", "--g-display-vars": "normal" } },
  { id: "instrument", name: "Instrument Serif", feel: "Verfijnd, voor bruiloften en mode", file: INSTRUMENT, vars: { "--g-display": "\"Instrument Serif\", Georgia, serif", "--g-display-weight": "400", "--g-display-style": "normal", "--g-display-track": "-0.025em", "--g-display-vars": "normal" } },
  { id: "archivo", name: "Archivo", feel: "Sportief: smal, schuin en zwaar", file: ARCHIVO, vars: { "--g-display": "\"Archivo\", system-ui, sans-serif", "--g-display-weight": "800", "--g-display-style": "italic", "--g-display-track": "-0.005em", "--g-display-vars": "\"wdth\" 72" } },
  { id: "clash", name: "Clash Display", feel: "Modern en krachtig", file: "clash-display", vars: { "--g-display": "\"Clash Display\", system-ui, sans-serif", "--g-display-weight": "600", "--g-display-style": "normal", "--g-display-track": "-0.03em", "--g-display-vars": "normal" } },
  { id: "gambetta", name: "Gambetta", feel: "Elegant en rustig", file: "gambetta", vars: { "--g-display": "\"Gambetta\", Georgia, serif", "--g-display-weight": "400", "--g-display-style": "normal", "--g-display-track": "-0.02em", "--g-display-vars": "normal" } },
  { id: "satoshi", name: "Satoshi", feel: "Strak en zakelijk", file: "satoshi", vars: { "--g-display": "\"Satoshi\", system-ui, sans-serif", "--g-display-weight": "700", "--g-display-style": "normal", "--g-display-track": "-0.035em", "--g-display-vars": "normal" } },
  { id: "geist", name: "Geist", feel: "Neutraal, de letter van de studio", file: "", vars: { "--g-display": "var(--ui)", "--g-display-weight": "600", "--g-display-style": "normal", "--g-display-track": "-0.045em", "--g-display-vars": "normal" } },
];

/** Every title font, for the admin's previews. */
export const PICKER_FONTS = [...new Set([...ALL_FONTS_BASE, ...FONTS.map((f) => f.file).filter(Boolean)])];

/** The CSS variables for the chosen title font, or none to keep the style's own. */
export function fontVars(p: Pick<Project, "gallerySettings">): Record<string, string> {
  return FONTS.find((f) => f.id === p.gallerySettings.font)?.vars || {};
}

/** How big the photos are and how much room between them: a factor on the style's own sizes. */
export function sizing(p: Pick<Project, "gallerySettings">): { size: number; gap: number } {
  const gs = p.gallerySettings;
  return {
    size: gs.density === "s" ? 0.72 : gs.density === "l" ? 1.38 : 1,
    gap: gs.gap === "tight" ? 0.5 : gs.gap === "airy" ? 2.4 : 1,
  };
}

export function accentOf(p: Pick<Project, "gallerySettings">): string {
  const a = p.gallerySettings.accentColor;
  return a && HEX.test(a) ? a : styleOf(p).accent;
}

/** White or near-black text on the accent, whichever has the higher contrast. */
export function onAccent(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Against white: 1.05 / (l + 0.05). Against #151517 (luminance about 0.008): (l + 0.05) / 0.058.
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.058 ? "#ffffff" : "#151517";
}

const HINTS: [RegExp, GalleryStyle][] = [
  [/\b(sport|voetbal|hockey|tennis|padel|basketbal|volleybal|handbal|korfbal|rugby|honkbal|wielren|wieler|mtb|hardloop|marathon|stratenloop|triatlon|atletiek|zwem|turnen|wedstrijd|toernooi|competitie|kampioen|match|fitness|crossfit|boksen|judo|karate|golf|surf|skate)/i, "arena"],
  [/\b(auto|car|porsche|bmw|audi|mercedes|ferrari|motor|event|feest|concert|festival|club|nacht|avond)/i, "noir"],
  [/\b(bruiloft|trouw|wedding|huwelijk|verloving|koppel|fashion|mode|editorial|lookbook)/i, "editorial"],
  [/\b(newborn|baby|zwanger|gezin|familie|kind|kids|cakesmash)/i, "zacht"],
  [/\b(team|zakelijk|bedrijf|product|vastgoed|woning|interieur|menu|food|horeca|linkedin|kantoor|catalogus)/i, "catalogus"],
];

/** The photo category of a project's Foto part points straight at a style. */
const BY_CATEGORY: Record<string, GalleryStyle> = {
  Sport: "arena", Automotive: "noir", Evenement: "noir", Concert: "noir", Bruiloft: "editorial", Portret: "atelier", Zakelijk: "catalogus",
};

/** A first guess from the Foto part's category, else the project's title and description; the studio decides. */
export function suggestStyle(p: Pick<Project, "title" | "description"> & { parts?: Project["parts"] }): GalleryStyle {
  const category = p.parts?.find((x) => x.kind === "photo")?.category || "";
  if (BY_CATEGORY[category]) return BY_CATEGORY[category];
  const text = `${p.title} ${p.description || ""}`;
  return HINTS.find(([re]) => re.test(text))?.[1] || "atelier";
}
