import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "../ThemeContext";
import { radius, spring } from "../theme";
import { haptic, Press, Txt, withAlpha } from "./base";
import { Sheet } from "./Sheet";

// ── Button ────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  full = false,
  busy = false,
  disabled = false,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: keyof typeof Feather.glyphMap;
  full?: boolean;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const height = size === "sm" ? 38 : size === "lg" ? 54 : 46;
  const fontSize = size === "sm" ? 13 : 15;

  const fg =
    variant === "primary" ? "#1a0c04" : variant === "danger" ? "#fff" : variant === "ghost" ? c.fg2 : c.fg;

  const content = (
    <>
      {busy ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Feather name={icon} size={size === "sm" ? 14 : 16} color={fg} />
      ) : null}
      <Text style={{ fontSize, fontWeight: "700", color: fg, letterSpacing: -0.2 }}>{children}</Text>
    </>
  );

  const inner: StyleProp<ViewStyle> = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: height,
    paddingHorizontal: size === "sm" ? 14 : 20,
    borderRadius: radius.md,
  };

  // A flat block of accent goes muddy on a warm dark page; the gradient keeps a
  // lit edge, which is what makes the primary button read as raised.
  if (variant === "primary") {
    return (
      <Press
        onPress={onPress}
        disabled={disabled || busy}
        style={[{ borderRadius: radius.md, width: full ? "100%" : undefined }, style]}
      >
        <LinearGradient
          colors={[c.copperHi, c.copper, c.copperLo]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={inner}
        >
          {content}
        </LinearGradient>
      </Press>
    );
  }

  return (
    <Press
      onPress={onPress}
      disabled={disabled || busy}
      feedback={variant === "danger" ? "warning" : "tap"}
      style={[
        inner,
        {
          width: full ? "100%" : undefined,
          backgroundColor:
            variant === "danger" ? c.danger : variant === "secondary" ? c.surface2 : "transparent",
          borderWidth: variant === "danger" ? 0 : StyleSheet.hairlineWidth * 2,
          borderColor: variant === "ghost" ? c.line : c.line2,
        },
        style,
      ]}
    >
      {content}
    </Press>
  );
}

// ── Fields ────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 7 }}>
      {!!label && (
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: c.fg3,
          }}
        >
          {label}
        </Text>
      )}
      {children}
      {(error || hint) && (
        <Text style={{ fontSize: 11.5, lineHeight: 16, color: error ? c.danger : c.fg4 }}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

export function Input({
  style,
  multiline,
  ...rest
}: TextInputProps & { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={c.fg4}
      multiline={multiline}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: focused ? c.copper : c.line,
          borderRadius: radius.md,
          color: c.fg,
          fontSize: 16,
          paddingHorizontal: 14,
          paddingVertical: 13,
          minHeight: multiline ? 92 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        },
        style as never,
      ]}
      {...rest}
    />
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = "Zoeken",
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const c = useColors();
  return (
    <View style={{ justifyContent: "center" }}>
      <Feather
        name="search"
        size={16}
        color={c.fg4}
        style={{ position: "absolute", left: 14, zIndex: 1 }}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.fg4}
        // Autocorrect in a search field rewrites half-typed names into
        // unrelated words mid-query, which is worse than no help at all.
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{
          backgroundColor: c.surface2,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.line,
          borderRadius: radius.pill,
          color: c.fg,
          fontSize: 16,
          paddingLeft: 38,
          paddingRight: 14,
          paddingVertical: Platform.OS === "ios" ? 12 : 9,
        }}
      />
    </View>
  );
}

// ── Switch ────────────────────────────────────────────────────────────────

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}) {
  const c = useColors();
  const progress = useSharedValue(checked ? 1 : 0);
  progress.value = withSpring(checked ? 1 : 0, spring.snappy);

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 18 }],
  }));
  const track = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? c.copper : c.line2,
  }));

  return (
    <Press
      onPress={() => onChange(!checked)}
      feedback="select"
      scale={false}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 48 }}
    >
      {!!label && (
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>{label}</Text>
          {!!description && (
            <Text style={{ fontSize: 11.5, color: c.fg3, marginTop: 2, lineHeight: 16 }}>
              {description}
            </Text>
          )}
        </View>
      )}
      <Animated.View
        style={[
          { width: 46, height: 28, borderRadius: radius.pill, padding: 3, justifyContent: "center" },
          track,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#fff",
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
            },
            knob,
          ]}
        />
      </Animated.View>
    </Press>
  );
}

// ── Segmented ─────────────────────────────────────────────────────────────

/**
 * Sliding pill selector. The indicator is one view that animates between
 * segments rather than a highlight that cross-fades — physical travel is the
 * difference between "an app" and "a set of radio buttons".
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; badge?: number }[];
  size?: "sm" | "md";
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const height = size === "sm" ? 32 : 38;

  const segmentWidth = width ? (width - 6) / options.length : 0;

  const indicator = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: withSpring(index * segmentWidth, spring.snappy) }],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        padding: 3,
        backgroundColor: c.surface,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: c.line,
        borderRadius: radius.pill,
      }}
    >
      {segmentWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 3,
              left: 3,
              height,
              borderRadius: radius.pill,
              backgroundColor: c.surface3,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: c.line2,
            },
            indicator,
          ]}
        />
      )}

      {options.map((o) => {
        const active = o.value === value;
        return (
          <Press
            key={o.value}
            scale={false}
            feedback="select"
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 5,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: size === "sm" ? 11.5 : 12.5,
                fontWeight: active ? "700" : "500",
                color: active ? c.fg : c.fg3,
              }}
            >
              {o.label}
            </Text>
            {!!o.badge && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: active ? c.copper : c.fg4,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {o.badge}
              </Text>
            )}
          </Press>
        );
      })}
    </View>
  );
}

// ── Select ────────────────────────────────────────────────────────────────

/**
 * Opens a sheet of options rather than a native picker wheel: the wheel hides
 * every choice but one behind a scroll, which is the wrong shape for short
 * lists like statuses or VAT rates.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Kies…",
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  title?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Press
        onPress={() => setOpen(true)}
        scale={false}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: c.surface2,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.line,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          minHeight: 48,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 16, color: current ? c.fg : c.fg4 }}
        >
          {current?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={c.fg3} />
      </Press>

      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <View style={{ gap: 8, paddingBottom: 8 }}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Press
                key={o.value}
                scale={false}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 50,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: active ? c.copper : c.line,
                  backgroundColor: active ? c.copperWash : c.surface,
                }}
              >
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: c.fg }}>
                  {o.label}
                </Text>
                {active && <Feather name="check" size={16} color={c.copper} />}
              </Press>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

// ── Check row ─────────────────────────────────────────────────────────────

export function CheckRow({
  checked,
  onChange,
  label,
  meta,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  meta?: ReactNode;
}) {
  const c = useColors();
  const progress = useSharedValue(checked ? 1 : 0);
  progress.value = withTiming(checked ? 1 : 0, { duration: 160 });

  const box = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? c.copper : "transparent",
    borderColor: progress.value > 0.5 ? c.copper : c.line2,
  }));
  const tick = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: progress.value }] }));

  return (
    <Press
      onPress={() => onChange(!checked)}
      feedback={checked ? "tap" : "success"}
      scale={false}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, flex: 1 }}
    >
      <Animated.View
        style={[
          { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
          box,
        ]}
      >
        <Animated.View style={tick}>
          <Feather name="check" size={14} color="#1a0c04" />
        </Animated.View>
      </Animated.View>
      <View style={{ flex: 1 }}>{label}</View>
      {meta}
    </Press>
  );
}

// ── Pick target ───────────────────────────────────────────────────────────

/** Dashed drop-zone styling shared by every upload affordance. */
export function PickTarget({
  onPress,
  busy,
  icon = "image",
  label,
  hint,
  height = 96,
  active = false,
  children,
}: {
  onPress: () => void;
  busy?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  hint?: string;
  height?: number;
  active?: boolean;
  children?: ReactNode;
}) {
  const c = useColors();
  return (
    <Press
      onPress={onPress}
      disabled={busy}
      scale={false}
      style={{
        height,
        borderRadius: radius.md,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: active ? withAlpha(c.ok, 0.6) : c.line2,
        backgroundColor: c.surface,
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        overflow: "hidden",
      }}
    >
      {children ?? (
        <>
          {busy ? (
            <ActivityIndicator color={c.copper} />
          ) : (
            <Feather name={icon} size={20} color={active ? c.ok : c.copper} />
          )}
          <Txt variant="heading" style={{ fontSize: 13 }}>
            {busy ? "Uploaden…" : label}
          </Txt>
          {!!hint && !busy && <Txt variant="meta" style={{ fontSize: 11 }}>{hint}</Txt>}
        </>
      )}
    </Press>
  );
}

export { haptic };
