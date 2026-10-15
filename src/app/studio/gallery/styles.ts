import type { Project } from "../types";

// The looks a client gallery can have. The studio picks one per project; each
// brings its own layout, type and colours, and an accent can be set on top.

export type GalleryStyle = "atelier" | "editorial" | "noir" | "zacht" | "catalogus";

/** How the photos are laid out in the large view. The compact view is always justified rows. */
export type GalleryLayout = "rows" | "story" | "masonry" | "sheet";

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
export const INSTRUMENT = "Instrument+Serif:ital@0;1";
/** Every title font, for the admin's style thumbnails. */
export const ALL_FONTS = [FRAUNCES, INSTRUMENT];

export const STYLES: StyleDef[] = [
  { id: "atelier", name: "Atelier", fits: "Portretten, gezinnen, alles wat tijdloos moet zijn", layout: "rows", accent: "#b06a2c", font: FRAUNCES },
  { id: "editorial", name: "Editorial", fits: "Bruiloften, fashion en koppels", layout: "story", accent: "#7d3c33", font: INSTRUMENT },
  { id: "noir", name: "Noir", fits: "Auto's, events, avond- en nachtwerk", layout: "rows", accent: "#d9a46a", dark: true },
  { id: "zacht", name: "Zacht", fits: "Newborn, zwangerschap en familie", layout: "masonry", accent: "#c48b7e", font: FRAUNCES },
  { id: "catalogus", name: "Catalogus", fits: "Zakelijk, producten, teams en vastgoed", layout: "sheet", accent: "#3a5a8c" },
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

/** Dark text on light accents, white on the rest. */
export function onAccent(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1a1714" : "#ffffff";
}

const HINTS: [RegExp, GalleryStyle][] = [
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
