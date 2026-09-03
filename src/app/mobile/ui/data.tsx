import { animate, motion, useMotionValue, useTransform, useReducedMotion } from "motion/react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { c, font, radius, spring } from "../theme";
import { Press } from "./base";

// ── Animated number ───────────────────────────────────────────────────────

/**
 * Counts up to `value` on mount and on every change.
 *
 * Tabular figures are non-negotiable here — with proportional digits the number
 * visibly reflows on every frame as 1s and 8s swap in, which turns a calm
 * count-up into a jitter.
 */
export function Counter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 0.9,
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? value : 0);
  const display = useTransform(mv, (v) =>
    `${prefix}${v.toLocaleString("nl-NL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, duration, mv, reduced]);

  return (
    <motion.span
      style={{
        fontFamily: font.display,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.03em",
        ...style,
      }}
    >
      {display}
    </motion.span>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  decimals = 0,
  prefix,
  suffix,
  icon,
  tone = c.copper,
  onClick,
  delay = 0,
  sub,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon?: ReactNode;
  tone?: string;
  onClick?: () => void;
  delay?: number;
  sub?: ReactNode;
}) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c.fg4,
          }}
        >
          {label}
        </span>
        {icon && <span style={{ color: tone, display: "grid" }}>{icon}</span>}
      </div>
      <Counter
        value={value}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        style={{ fontSize: 30, fontWeight: 700, color: c.fg, lineHeight: 1 }}
      />
      {sub && <div style={{ fontSize: 10.5, color: c.fg4, fontWeight: 500 }}>{sub}</div>}
    </>
  );

  const style: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 15,
    borderRadius: radius.lg,
    // A faint wash of the tile's own tone, so a row of tiles reads as
    // distinct cards without needing different backgrounds.
    background: `linear-gradient(155deg, color-mix(in srgb, ${tone} 9%, ${c.surface}), ${c.surface})`,
    border: `1px solid ${c.line}`,
    width: "100%",
    minHeight: 104,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring.smooth, delay }}
      style={{ flex: 1, minWidth: 0 }}
    >
      {onClick ? (
        <Press onClick={onClick} style={style}>
          {inner}
        </Press>
      ) : (
        <div style={style}>{inner}</div>
      )}
    </motion.div>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  tone = c.copper,
  height = 6,
  delay = 0,
}: {
  /** 0–1. */
  value: number;
  tone?: string;
  height?: number;
  delay?: number;
}) {
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <div
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: c.line,
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ ...spring.smooth, delay }}
        style={{
          height: "100%",
          borderRadius: radius.pill,
          backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${tone} 62%, transparent), ${tone})`,
        }}
      />
    </div>
  );
}

/** Circular progress — used where a bar would be too wide for the space. */
export function Ring({
  value,
  size = 54,
  stroke = 5,
  tone = c.copper,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.line} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ ...spring.smooth, delay: 0.1 }}
        />
      </svg>
      {children && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Bars ──────────────────────────────────────────────────────────────────

/**
 * Compact category breakdown. Deliberately not a pie chart: on a phone, four
 * labelled bars are readable at a glance where four wedges plus a legend is a
 * puzzle.
 */
export function BarBreakdown({
  items,
  formatValue,
}: {
  items: { label: string; value: number; tone?: string }[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {items.map((item, i) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                color: c.fg2,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: 12,
                color: c.fg,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
          <ProgressBar
            value={item.value / max}
            tone={item.tone ?? c.copper}
            height={5}
            delay={0.05 + i * 0.05}
          />
        </div>
      ))}
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────

/** Tiny trend line — shape only, no axes. Draws itself on mount. */
export function Sparkline({
  points,
  width = 92,
  height = 30,
  tone = c.copper,
}: {
  points: number[];
  width?: number;
  height?: number;
  tone?: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const d = points
    .map((p, i) => {
      const x = i * step;
      // 2px inset top and bottom so the stroke never clips at the extremes.
      const y = height - 2 - ((p - min) / span) * (height - 4);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <motion.path
        d={d}
        fill="none"
        stroke={tone}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
