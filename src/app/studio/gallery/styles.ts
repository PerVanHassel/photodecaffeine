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
  /** Google Fonts family query for the titles, loaded only when this style is shown. */
  font?: string;
}

// One request for both looks that use Fraunces, so the two never load clashing copies.
const FRAUNCES = "Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;1,9..144,300..600,0..100";
const INSTRUMENT = "Instrument+Serif:ital@0;1";
// Condensed heavy italics only: Arena sets its titles and numbers in nothing else.
const ARCHIVO = "Archivo:ital,wdth,wght@1,62..100,600..900";
/** Every title font, for the admin's style thumbnails. */
export const ALL_FONTS = [FRAUNCES, INSTRUMENT, ARCHIVO];

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

export function styleOf(p: Pick<Project, "gallerySettings">): StyleDef {
  return byId.get(p.gallerySettings.style as GalleryStyle) || STYLES[0];
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

/** A first guess from the project's title and description; the studio decides. */
export function suggestStyle(p: Pick<Project, "title" | "description">): GalleryStyle {
  const text = `${p.title} ${p.description || ""}`;
  return HINTS.find(([re]) => re.test(text))?.[1] || "atelier";
}
