/**
 * Shared look-and-feel primitives for the admin panel.
 *
 * The admin pages are styled with inline styles (see the comment block in
 * src/styles/theme.css), so the "design system" lives here as constants and a
 * handful of tiny components instead of in CSS classes.
 *
 * Every perpetual animation in here is its own memoised component so a looping
 * shimmer or pulse never re-renders the page around it.
 */
import { memo, useEffect, useRef } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

/** Space Grotesk is already loaded for the public site; it gives the panel a
 *  sharper, less default voice than Inter without a new font request. */
export const ADMIN_FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";
/** Numbers, dates and counts — tabular and system-local, so no extra webfont. */
export const ADMIN_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

export const ACCENT = "#c8905a";
export const DANGER = "#e07060";

/** Foreground at a given alpha, boosted for the light theme. */
export const fg = (a: number) => `rgba(var(--admin-fg-rgb),calc(${a} * var(--admin-fg-boost)))`;

/** One spring for the whole panel — weighty, no linear easing. */
export const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

/** Uppercase micro-label, the panel's recurring voice for metadata. */
export const eyebrow = (alpha = 0.25, size = 9) => ({
  color: fg(alpha),
  fontSize: `${size}px`,
  fontWeight: 600,
  letterSpacing: "0.26em",
  textTransform: "uppercase" as const,
});

/**
 * Skeleton line with a light sweep. Sized to the content it replaces, so the
 * layout does not shift when real data lands.
 */
export const Skeleton = memo(function Skeleton({
  width = "100%",
  height = 10,
}: { width?: number | string; height?: number }) {
  const still = useReducedMotion();
  return (
    <div
      aria-hidden
      style={{
        width, height,
        backgroundColor: fg(0.05),
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {!still && (
        <motion.div
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{ repeat: Infinity, duration: 1.7, ease: "linear" }}
          style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(90deg, transparent, ${fg(0.09)}, transparent)`,
            willChange: "transform",
          }}
        />
      )}
    </div>
  );
});

/**
 * A metric that counts up to its value once, in mono. The tween writes into the
 * DOM node directly — it never sets state, so the dashboard around it stays put.
 */
export const CountUp = memo(function CountUp({
  value,
  decimals = 0,
  style,
}: { value: number; decimals?: number; style?: React.CSSProperties }) {
  const node = useRef<HTMLSpanElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    if (still) { el.textContent = value.toFixed(decimals); return; }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = v.toFixed(decimals); },
    });
    return () => controls.stop();
  }, [value, decimals, still]);

  return <span ref={node} style={{ fontFamily: ADMIN_MONO, fontVariantNumeric: "tabular-nums", ...style }}>{value.toFixed(decimals)}</span>;
});

/** Breathing dot — the panel's only idle animation, used for "live" markers. */
export const Pulse = memo(function Pulse({ size = 6, color = ACCENT }: { size?: number; color?: string }) {
  const still = useReducedMotion();
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: color }} />
      {!still && (
        <motion.span
          animate={{ scale: [1, 2.6, 1], opacity: [0.45, 0, 0.45] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: color, willChange: "transform, opacity" }}
        />
      )}
    </span>
  );
});
