import { Feather } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../ThemeContext";
import { GUTTER, radius } from "../theme";
import { Card, haptic, Press, Txt, withAlpha } from "./base";
import { Button } from "./form";

// ── Skeletons ─────────────────────────────────────────────────────────────

export function Skeleton({
  w = "100%",
  h = 14,
  r = 8,
}: {
  w?: number | `${number}%`;
  h?: number;
  r?: number;
}) {
  const c = useColors();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.surface2 }, style]}
    />
  );
}

/**
 * Placeholder rows that mirror the real list's geometry.
 *
 * Matching the row height matters more than it looks: a skeleton of a different
 * size makes the list visibly jump when data lands, which reads as a bug even
 * though nothing went wrong.
 */
export function SkeletonList({ rows = 5, height = 68 }: { rows?: number; height?: number }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            height,
            paddingHorizontal: 16,
            borderRadius: radius.lg,
            backgroundColor: c.surface,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: c.line,
            // Later rows fade out, which reads as depth rather than as five
            // identical grey bars.
            opacity: 1 - i * 0.13,
          }}
        >
          <Skeleton w={38} h={38} r={19} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton w="52%" h={11} />
            <Skeleton w="34%" h={9} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Empty & error ─────────────────────────────────────────────────────────

export function Empty({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  const c = useColors();
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20)}
      style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 12 }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.copperWash,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.line,
          marginBottom: 4,
        }}
      >
        <Feather name={icon} size={22} color={c.copper} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: c.fg, textAlign: "center" }}>
        {title}
      </Text>
      {!!body && (
        <Text
          style={{ fontSize: 13, color: c.fg3, lineHeight: 20, textAlign: "center", maxWidth: 290 }}
        >
          {body}
        </Text>
      )}
      {action && (
        <View style={{ marginTop: 8 }}>
          <Button size="sm" variant="secondary" onPress={action.onPress}>
            {action.label}
          </Button>
        </View>
      )}
    </Animated.View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Empty
      icon="alert-triangle"
      title="Kon niet laden"
      body={message}
      action={onRetry ? { label: "Opnieuw proberen", onPress: onRetry } : undefined}
    />
  );
}

// ── Toasts ────────────────────────────────────────────────────────────────

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ toast: (m: string, tone?: ToastTone) => void } | null>(null);

const TONE_ICON: Record<ToastTone, keyof typeof Feather.glyphMap> = {
  success: "check",
  error: "x",
  info: "info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      haptic(tone === "error" ? "error" : tone === "success" ? "success" : "tap");
      // Only ever two on screen; a taller stack covers the content the toast is
      // reporting on.
      setToasts((list) => [...list.slice(-1), { id, message, tone }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  const toneColour = (tone: ToastTone) =>
    tone === "success" ? c.ok : tone === "error" ? c.danger : c.copper;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: GUTTER,
          right: GUTTER,
          gap: 8,
        }}
      >
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
          >
            <Press onPress={() => dismiss(t.id)} feedback={false} scale={false}>
              <Card
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 11,
                  padding: 13,
                  backgroundColor: c.surfaceSolid,
                  borderColor: c.line2,
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: toneColour(t.tone),
                  }}
                >
                  <Feather name={TONE_ICON[t.tone]} size={13} color={c.bg} />
                </View>
                <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "500", color: c.fg }}>
                  {t.message}
                </Text>
              </Card>
            </Press>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast moet binnen ToastProvider gebruikt worden");
  return ctx.toast;
}

// ── Inline banner ─────────────────────────────────────────────────────────

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "danger";
  children: ReactNode;
}) {
  const c = useColors();
  const color = tone === "danger" ? c.danger : tone === "warn" ? c.warn : c.info;
  return (
    <View
      style={{
        backgroundColor: withAlpha(color, 0.12),
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: withAlpha(color, 0.28),
        borderRadius: radius.md,
        padding: 13,
      }}
    >
      <Txt variant="body" style={{ fontSize: 12.5, color }}>
        {children}
      </Txt>
    </View>
  );
}
