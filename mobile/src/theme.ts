/**
 * Design tokens for PDC Admin.
 *
 * The web app expresses these as CSS custom properties that flip on an
 * attribute; React Native has no cascade, so the palettes are plain objects and
 * screens read them through `useTheme()`. Same colours, same intent — a warm
 * near-black lit by copper, the PDC signature tracked-uppercase micro-labels,
 * and generous corner radii.
 */

export type Scheme = "dark" | "light";

export interface Palette {
  bg: string;
  bg2: string;
  bg3: string;

  surface: string;
  surface2: string;
  surface3: string;
  surfaceSolid: string;

  line: string;
  line2: string;
  sheen: string;

  fg: string;
  fg2: string;
  fg3: string;
  fg4: string;

  copper: string;
  copperHi: string;
  copperLo: string;
  copperWash: string;

  ok: string;
  warn: string;
  danger: string;
  info: string;

  scrim: string;
  /** Tint for the copper glow behind the app background. */
  glow: string;
  glowSoft: string;
}

export const DARK: Palette = {
  bg: "#070301",
  bg2: "#0e0805",
  bg3: "#150c06",

  surface: "rgba(255,247,225,0.05)",
  surface2: "rgba(255,247,225,0.085)",
  surface3: "rgba(255,247,225,0.13)",
  surfaceSolid: "#120a05",

  line: "rgba(255,247,225,0.10)",
  line2: "rgba(255,247,225,0.18)",
  sheen: "rgba(255,247,225,0.14)",

  fg: "#fffbe0",
  fg2: "rgba(255,251,224,0.70)",
  fg3: "rgba(255,251,224,0.46)",
  fg4: "rgba(255,251,224,0.28)",

  copper: "#c8905a",
  copperHi: "#e8b07a",
  copperLo: "#8a5a30",
  copperWash: "rgba(200,144,90,0.14)",

  ok: "#74c495",
  warn: "#e3ae52",
  danger: "#e8706c",
  info: "#86a4e8",

  scrim: "rgba(0,0,0,0.66)",
  glow: "rgba(200,144,90,0.20)",
  glowSoft: "rgba(200,144,90,0.08)",
};

export const LIGHT: Palette = {
  bg: "#f2ebdc",
  bg2: "#e9dfca",
  bg3: "#e0d3b8",

  surface: "rgba(255,253,248,0.78)",
  surface2: "rgba(255,253,248,0.92)",
  surface3: "#fffdf8",
  surfaceSolid: "#fffdf8",

  line: "rgba(26,12,4,0.12)",
  line2: "rgba(26,12,4,0.22)",
  sheen: "rgba(255,255,255,0.9)",

  fg: "#1a0c04",
  fg2: "rgba(26,12,4,0.74)",
  fg3: "rgba(26,12,4,0.54)",
  fg4: "rgba(26,12,4,0.36)",

  copper: "#a2683a",
  copperHi: "#c8905a",
  copperLo: "#7a4a24",
  copperWash: "rgba(162,104,58,0.13)",

  ok: "#2f7d51",
  warn: "#9a6a12",
  danger: "#b03b38",
  info: "#3d5da8",

  scrim: "rgba(40,24,8,0.46)",
  glow: "rgba(162,104,58,0.14)",
  glowSoft: "rgba(162,104,58,0.06)",
};

export const PALETTES: Record<Scheme, Palette> = { dark: DARK, light: LIGHT };

// ── Metrics ───────────────────────────────────────────────────────────────

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/** Horizontal page gutter. One number so every screen lines up vertically. */
export const GUTTER = 18;

export const TAB_BAR_H = 56;

// ── Motion ────────────────────────────────────────────────────────────────

/**
 * Reanimated spring configs, named for intent rather than physics.
 * `snappy` for taps, `smooth` for layout, `gentle` for large surfaces.
 */
export const spring = {
  snappy: { damping: 20, stiffness: 320, mass: 0.7 },
  smooth: { damping: 22, stiffness: 190, mass: 0.9 },
  gentle: { damping: 26, stiffness: 140, mass: 1 },
  bouncy: { damping: 11, stiffness: 260, mass: 0.8 },
} as const;

// ── Type ──────────────────────────────────────────────────────────────────

export const text = {
  /** Tiny tracked uppercase — the PDC signature label. */
  eyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  section: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8 },
} as const;

// ── Formatting ────────────────────────────────────────────────────────────

export function euro(n: number, decimals = 2) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

export function dateShort(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function dateFull(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "Nooit";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Nu";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Gisteren";
  if (days < 30) return `${days}d`;
  return dateShort(iso);
}

export function initialsOf(name: string) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Nog wakker";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}
