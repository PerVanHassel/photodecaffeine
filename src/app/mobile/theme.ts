/**
 * Design tokens and motion presets for the PDC admin app.
 *
 * Colours are CSS custom property references, not literals, so a theme flip is
 * a single attribute change on <html> rather than a React re-render of every
 * screen (see mobile.css for the values).
 */

export const c = {
  bg: "var(--m-bg)",
  bg2: "var(--m-bg-2)",
  bg3: "var(--m-bg-3)",

  surface: "var(--m-surface)",
  surface2: "var(--m-surface-2)",
  surface3: "var(--m-surface-3)",
  surfaceSolid: "var(--m-surface-solid)",

  line: "var(--m-hairline)",
  line2: "var(--m-hairline-2)",

  fg: "var(--m-fg)",
  fg2: "var(--m-fg-2)",
  fg3: "var(--m-fg-3)",
  fg4: "var(--m-fg-4)",

  copper: "var(--m-copper)",
  copperHi: "var(--m-copper-hi)",
  copperLo: "var(--m-copper-lo)",
  copperWash: "var(--m-copper-wash)",

  ok: "var(--m-ok)",
  warn: "var(--m-warn)",
  danger: "var(--m-danger)",
  info: "var(--m-info)",

  scrim: "var(--m-scrim)",
} as const;

export const shadow = {
  card: "var(--m-shadow-card)",
  lift: "var(--m-shadow-lift)",
  tab: "var(--m-shadow-tab)",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/** Horizontal page gutter. One number so every screen lines up vertically. */
export const GUTTER = 18;

/** Height of the tab bar, excluding the home-indicator inset below it. */
export const TAB_BAR_H = 58;

// ── Motion ────────────────────────────────────────────────────────────────

/**
 * Spring presets. Named for what they're for rather than their physics, so
 * call sites read as intent.
 *
 * `snappy`  — taps, toggles, anything that must feel instant.
 * `smooth`  — page and layout transitions.
 * `gentle`  — large surfaces (sheets); slower so the size reads as weight.
 * `bouncy`  — celebratory moments only; overshoots.
 */
export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  smooth: { type: "spring", stiffness: 340, damping: 34, mass: 0.9 },
  gentle: { type: "spring", stiffness: 260, damping: 32, mass: 1 },
  bouncy: { type: "spring", stiffness: 420, damping: 18, mass: 0.8 },
} as const;

/** iOS's own easing curve — used where a spring would feel wrong (opacity). */
export const ease = [0.32, 0.72, 0, 1] as const;

/**
 * Stagger for list entrances. Capped by index so a 200-row list doesn't end up
 * with a two-second-late final item — past ~10 rows the eye stops tracking the
 * cascade anyway and it just reads as lag.
 */
export function stagger(index: number, step = 0.035, max = 10) {
  return Math.min(index, max) * step;
}

export const listItemIn = (index: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring.smooth, delay: stagger(index) },
});

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── Type ──────────────────────────────────────────────────────────────────

export const font = {
  ui: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Space Grotesk', 'Inter', sans-serif",
} as const;

export const text = {
  /** Tiny tracked uppercase — the PDC signature label. */
  eyebrow: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.28em",
    textTransform: "uppercase" as const,
    color: c.fg4,
  },
  title: { fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08 },
  section: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: c.fg3,
  },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: c.fg2 },
  label: { fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" },
  meta: { fontSize: 11, fontWeight: 500, color: c.fg3 },
} as const;

// ── Safe areas ────────────────────────────────────────────────────────────

/**
 * `env(safe-area-inset-*)` with a floor, because the insets are 0 in the
 * browser tab and only become non-zero once the app is installed to the home
 * screen — without a floor the header would sit flush against the status bar
 * in standalone mode and flush against nothing in Safari.
 */
export const safeTop = (extra = 0) => `calc(env(safe-area-inset-top, 0px) + ${extra}px)`;
export const safeBottom = (extra = 0) => `calc(env(safe-area-inset-bottom, 0px) + ${extra}px)`;

// ── Formatting ────────────────────────────────────────────────────────────

export function euro(n: number, decimals = 2) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

export function dateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function dateFull(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "Nooit";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
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
