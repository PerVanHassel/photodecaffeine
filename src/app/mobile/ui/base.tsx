import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { c, radius, shadow, spring, text, initialsOf } from "../theme";
import { haptic } from "../haptics";

// ── Press ─────────────────────────────────────────────────────────────────

interface PressProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  /** Set false for large surfaces where a scale would look like a glitch. */
  scale?: number | false;
  feedback?: Parameters<typeof haptic>[0] | false;
}

/**
 * The app's only tappable primitive.
 *
 * Every interactive element routes through here so press feedback is uniform:
 * the same spring, the same dip, the same haptic. Touch targets are floored at
 * 44px — Apple's minimum, and the difference between an app that feels precise
 * and one that feels like it's ignoring you.
 */
export const Press = forwardRef<HTMLButtonElement, PressProps>(function Press(
  { children, scale = 0.965, feedback = "tap", onClick, style, disabled, ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileTap={disabled || scale === false ? undefined : { scale }}
      transition={spring.snappy}
      onClick={(e) => {
        if (disabled) return;
        if (feedback) haptic(feedback);
        onClick?.(e);
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        color: "inherit",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

// ── Surfaces ──────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  padded = true,
  elevated = false,
  className = "",
}: {
  children: ReactNode;
  style?: CSSProperties;
  padded?: boolean;
  elevated?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`m-glass m-sheen ${className}`}
      style={{
        borderRadius: radius.lg,
        padding: padded ? 16 : 0,
        boxShadow: elevated ? shadow.card : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Card that is itself the tap target. */
export function CardButton({
  children,
  onClick,
  style,
  padded = true,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  padded?: boolean;
} & Omit<PressProps, "children" | "onClick" | "style">) {
  return (
    <Press
      onClick={onClick}
      className="m-glass m-sheen"
      style={{
        display: "block",
        width: "100%",
        borderRadius: radius.lg,
        padding: padded ? 16 : 0,
        boxShadow: shadow.card,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Press>
  );
}

// ── Text bits ─────────────────────────────────────────────────────────────

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...text.eyebrow, ...style }}>{children}</div>;
}

export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 12,
      }}
    >
      <div style={text.section}>{children}</div>
      {action && (
        <Press
          onClick={action.onClick}
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: c.copper,
            padding: "4px 0",
          }}
        >
          {action.label}
        </Press>
      )}
    </div>
  );
}

// ── Chips & badges ────────────────────────────────────────────────────────

export type Tone = "neutral" | "copper" | "ok" | "warn" | "danger" | "info";

const TONE_COLOR: Record<Tone, string> = {
  neutral: c.fg3,
  copper: c.copper,
  ok: c.ok,
  warn: c.warn,
  danger: c.danger,
  info: c.info,
};

export function Chip({
  children,
  tone = "neutral",
  solid = false,
  icon,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  solid?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
}) {
  const color = TONE_COLOR[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        // `color-mix` keeps the tint derived from the tone itself, so adding a
        // tone never means hand-picking a matching background.
        backgroundColor: solid ? color : `color-mix(in srgb, ${color} 14%, transparent)`,
        color: solid ? c.bg : color,
        border: `1px solid color-mix(in srgb, ${color} ${solid ? 0 : 26}%, transparent)`,
        borderRadius: radius.pill,
        padding: "4px 10px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

/** Small count badge for tab bars and list headers. */
export function Dot({ count, tone = "copper" }: { count?: number; tone?: Tone }) {
  const color = TONE_COLOR[tone];
  if (count !== undefined && count <= 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={spring.bouncy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: count === undefined ? 7 : 17,
        height: count === undefined ? 7 : 17,
        padding: count === undefined ? 0 : "0 5px",
        borderRadius: radius.pill,
        backgroundColor: color,
        color: c.bg,
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {count === undefined ? "" : count > 99 ? "99+" : count}
    </motion.span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────

export function Avatar({
  name,
  src,
  size = 40,
  tone = "copper",
}: {
  name: string;
  src?: string;
  size?: number;
  tone?: Tone;
}) {
  const color = TONE_COLOR[tone];
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          objectFit: "cover",
          border: `1px solid ${c.line}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.pill,
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(145deg, color-mix(in srgb, ${color} 26%, transparent), color-mix(in srgb, ${color} 8%, transparent))`,
        border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
        color,
        fontSize: Math.max(10, Math.round(size * 0.34)),
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────

export function Row({
  children,
  gap = 12,
  align = "center",
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: CSSProperties["alignItems"];
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: align, gap, minWidth: 0, ...style }}>{children}</div>
  );
}

export function Stack({
  children,
  gap = 10,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, minWidth: 0, ...style }}>
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, backgroundColor: c.line, ...style }} />;
}

/** Truncating single-line text — the default for names in dense lists. */
export function Ellipsis({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
