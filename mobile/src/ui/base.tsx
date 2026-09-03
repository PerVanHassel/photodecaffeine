import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "../ThemeContext";
import { initialsOf, radius, spring, type Palette } from "../theme";

// ── Haptics ───────────────────────────────────────────────────────────────

export type Feedback = "tap" | "select" | "impact" | "success" | "warning" | "error" | false;

/**
 * Real haptics, unlike the web build where iOS Safari has no vibration API at
 * all. Every call is fire-and-forget: feedback failing must never break the
 * action it accompanies.
 */
export function haptic(kind: Feedback = "tap") {
  if (!kind) return;
  const run =
    kind === "tap"
      ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === "select"
        ? () => Haptics.selectionAsync()
        : kind === "impact"
          ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          : kind === "success"
            ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            : kind === "warning"
              ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
              : () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  run().catch(() => {});
}

// ── Press ─────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressProps extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale on press-in. `false` for large surfaces where it reads as a glitch. */
  scale?: number | false;
  feedback?: Feedback;
}

/**
 * The app's only tappable primitive, so press behaviour is uniform: the same
 * spring, the same dip, the same haptic. `hitSlop` brings small glyph buttons
 * up to a comfortable target without inflating their visual size.
 */
export function Press({
  children,
  style,
  scale = 0.965,
  feedback = "tap",
  onPress,
  disabled,
  ...rest
}: PressProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale === false ? 1 : 1 - pressed.value * (1 - scale) },
    ],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={6}
      onPressIn={() => {
        pressed.value = withSpring(1, spring.snappy);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, spring.snappy);
      }}
      onPress={(e) => {
        if (disabled) return;
        haptic(feedback);
        onPress?.(e);
      }}
      style={[style, animatedStyle, disabled ? { opacity: 0.45 } : null]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────

type TxtProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Semantic role; picks size, weight and colour together. */
  variant?: "title" | "heading" | "body" | "meta" | "eyebrow" | "section" | "num";
  color?: string;
};

export function Txt({ children, style, numberOfLines, variant = "body", color }: TxtProps) {
  const c = useColors();
  const base = txtStyles(c)[variant];
  return (
    <Text numberOfLines={numberOfLines} style={[base, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

const txtStyles = (c: Palette) =>
  StyleSheet.create({
    title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.9, color: c.fg, lineHeight: 34 },
    heading: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3, color: c.fg },
    body: { fontSize: 14, fontWeight: "400", color: c.fg2, lineHeight: 21 },
    meta: { fontSize: 11.5, fontWeight: "500", color: c.fg3 },
    eyebrow: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 2.4,
      textTransform: "uppercase",
      color: c.fg4,
    },
    section: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 2,
      textTransform: "uppercase",
      color: c.fg3,
    },
    // Tabular figures: without them a counting number visibly reflows as 1s and
    // 8s swap in, turning a calm count-up into a jitter.
    num: {
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: -0.8,
      color: c.fg,
      fontVariant: ["tabular-nums"],
    },
  });

// ── Surfaces ──────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  padded = true,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Washes the card in a colour — used to group by priority or status. */
  tone?: string;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: tone ? withAlpha(tone, 0.07) : c.surface,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: tone ? withAlpha(tone, 0.24) : c.line,
          borderRadius: radius.lg,
          padding: padded ? 16 : 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardButton({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const c = useColors();
  return (
    <Press
      onPress={onPress}
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.line,
          borderRadius: radius.lg,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
    >
      {children}
    </Press>
  );
}

// ── Chips ─────────────────────────────────────────────────────────────────

export type Tone = "neutral" | "copper" | "ok" | "warn" | "danger" | "info";

export function toneColor(c: Palette, tone: Tone) {
  return tone === "copper"
    ? c.copper
    : tone === "ok"
      ? c.ok
      : tone === "warn"
        ? c.warn
        : tone === "danger"
          ? c.danger
          : tone === "info"
            ? c.info
            : c.fg3;
}

/**
 * Adds alpha to a token colour. The palette mixes hex and rgba() strings, so
 * both forms are handled; anything else is returned unchanged rather than
 * producing an invalid colour React Native would throw on.
 */
export function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex =
      color.length === 4
        ? color
            .slice(1)
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : color.slice(1);
    const num = parseInt(hex, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (match) {
    const [r, g, b] = match[1].split(",").map((v) => v.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function Chip({
  children,
  tone = "neutral",
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const color = toneColor(c, tone);
  return (
    <View
      style={[
        {
          backgroundColor: withAlpha(color, 0.14),
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: withAlpha(color, 0.28),
          borderRadius: radius.pill,
          paddingHorizontal: 9,
          paddingVertical: 4,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          color,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {children}
      </Text>
    </View>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────

export function Avatar({
  name,
  size = 40,
  tone = "copper",
}: {
  name: string;
  size?: number;
  tone?: Tone;
}) {
  const c = useColors();
  const color = toneColor(c, tone);
  return (
    <LinearGradient
      colors={[withAlpha(color, 0.3), withAlpha(color, 0.08)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: withAlpha(color, 0.3),
      }}
    >
      <Text style={{ color, fontSize: Math.max(10, Math.round(size * 0.34)), fontWeight: "700" }}>
        {initialsOf(name)}
      </Text>
    </LinearGradient>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────

export function Row({
  children,
  gap = 12,
  align = "center",
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: ViewStyle["alignItems"];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: align, gap, minWidth: 0 }, style]}>
      {children}
    </View>
  );
}

export function Stack({
  children,
  gap = 10,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }, style]} />;
}

export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: "space-between", marginBottom: 12 }} align="baseline">
      <Txt variant="section">{children}</Txt>
      {action && (
        <Press onPress={action.onPress} style={{ paddingVertical: 4 }}>
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: c.copper }}>{action.label}</Text>
        </Press>
      )}
    </Row>
  );
}
