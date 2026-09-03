import { Feather } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "../ThemeContext";
import { radius, spring } from "../theme";
import { Press, withAlpha } from "./base";

// ── Animated number ───────────────────────────────────────────────────────

/**
 * Counts up to `value` on mount and on every change.
 *
 * Driven from JS rather than the UI thread because Text has no animatable
 * numeric prop — the tradeoff is fine at 60 steps over ~900ms, and it keeps the
 * value formattable with Intl (thousands separators, currency).
 */
export function Counter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setShown(0);
      return;
    }

    const start = Date.now();
    const from = 0;
    let frame: ReturnType<typeof setInterval>;

    frame = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      // Same ease-out curve as the web build, so a number lands rather than
      // arriving at constant speed.
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(from + (value - from) * eased);
      if (t >= 1) clearInterval(frame);
    }, 16);

    return () => clearInterval(frame);
  }, [value, duration]);

  return (
    <Text
      style={[
        {
          color: c.fg,
          fontVariant: ["tabular-nums"],
          fontWeight: "700",
          letterSpacing: -0.8,
        },
        style,
      ]}
    >
      {prefix}
      {shown.toLocaleString("nl-NL", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </Text>
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
  tone,
  onPress,
  delay = 0,
  sub,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon?: keyof typeof Feather.glyphMap;
  tone?: string;
  onPress?: () => void;
  delay?: number;
  sub?: string;
}) {
  const c = useColors();
  const accent = tone ?? c.copper;

  const body = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: c.fg4,
          }}
        >
          {label}
        </Text>
        {icon && <Feather name={icon} size={15} color={accent} />}
      </View>
      <Counter
        value={value}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        style={{ fontSize: 30, lineHeight: 34 }}
      />
      {!!sub && <Text style={{ fontSize: 10.5, color: c.fg4, fontWeight: "500" }}>{sub}</Text>}
    </>
  );

  const style: StyleProp<ViewStyle> = {
    flex: 1,
    gap: 12,
    padding: 15,
    minHeight: 106,
    borderRadius: radius.lg,
    // A faint wash of the tile's own tone: a row of tiles reads as distinct
    // cards without needing different backgrounds.
    backgroundColor: withAlpha(accent, 0.09),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.line,
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(20)} style={{ flex: 1 }}>
      {onPress ? (
        <Press onPress={onPress} style={style}>
          {body}
        </Press>
      ) : (
        <View style={style}>{body}</View>
      )}
    </Animated.View>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  tone,
  height = 6,
  delay = 0,
}: {
  /** 0–1. */
  value: number;
  tone?: string;
  height?: number;
  delay?: number;
}) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value || 0));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(pct, spring.smooth));
  }, [pct, delay, progress]);

  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={{ height, borderRadius: radius.pill, backgroundColor: c.line, overflow: "hidden" }}>
      <Animated.View
        style={[{ height: "100%", borderRadius: radius.pill, backgroundColor: tone ?? c.copper }, style]}
      />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circular progress — for places a bar would be too wide. */
export function Ring({
  value,
  size = 56,
  stroke = 5,
  tone,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
}) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(100, withTiming(pct, { duration: 700 }));
  }, [pct, progress]);

  // strokeDashoffset is an SVG prop, not a style, so it goes through
  // useAnimatedProps rather than useAnimatedStyle.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone ?? c.copper}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}

// ── Bars ──────────────────────────────────────────────────────────────────

/**
 * Compact category breakdown. Deliberately not a pie chart: on a phone four
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
  const c = useColors();
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <View style={{ gap: 13 }}>
      {items.map((item, i) => (
        <View key={item.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: c.fg2, fontWeight: "500" }}>
              {item.label}
            </Text>
            <Text
              style={{ fontSize: 12, color: c.fg, fontWeight: "700", fontVariant: ["tabular-nums"] }}
            >
              {formatValue ? formatValue(item.value) : item.value}
            </Text>
          </View>
          <ProgressBar value={item.value / max} tone={item.tone} height={5} delay={50 + i * 50} />
        </View>
      ))}
    </View>
  );
}
