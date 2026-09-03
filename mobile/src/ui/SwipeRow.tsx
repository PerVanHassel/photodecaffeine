import { Feather } from "@expo/vector-icons";
import { useCallback, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "../ThemeContext";
import { radius, spring } from "../theme";
import { haptic } from "./base";

const ACTION_W = 76;
/** Drag past this fraction of the tray and release opens it. */
const OPEN_RATIO = 0.42;

export interface SwipeAction {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  tone?: string;
}

/**
 * Swipe-left-to-reveal row actions.
 *
 * `activeOffsetX` is what keeps this from fighting the vertical list scroll:
 * the pan only takes over once the finger has moved meaningfully sideways, so a
 * slightly-diagonal flick still scrolls rather than half-opening every row it
 * passes.
 */
export function SwipeRow({
  children,
  actions,
  disabled = false,
}: {
  children: ReactNode;
  actions: SwipeAction[];
  disabled?: boolean;
}) {
  const c = useColors();
  const trayWidth = actions.length * ACTION_W;

  const x = useSharedValue(0);
  const open = useSharedValue(false);

  const buzz = useCallback((kind: "select" | "tap") => haptic(kind), []);

  const close = useCallback(() => {
    x.value = withSpring(0, spring.snappy);
    open.value = false;
  }, [x, open]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const base = open.value ? -trayWidth : 0;
      // Clamped at 0 on the right so the row can never be dragged open the
      // wrong way onto an empty tray.
      x.value = Math.min(0, Math.max(-trayWidth - 40, base + e.translationX));
    })
    .onEnd((e) => {
      const shouldOpen = -x.value > trayWidth * OPEN_RATIO || e.velocityX < -450;
      if (shouldOpen) {
        x.value = withSpring(-trayWidth, spring.snappy);
        if (!open.value) runOnJS(buzz)("select");
        open.value = true;
      } else {
        x.value = withSpring(0, spring.snappy);
        open.value = false;
      }
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  // The tray only accepts taps once it is actually showing, so a stray tap on a
  // closed row can never fire a destructive action underneath it.
  const trayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(-x.value > 8 ? 1 : 0, { duration: 120 }),
  }));

  return (
    <View style={{ borderRadius: radius.lg, overflow: "hidden" }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            flexDirection: "row",
          },
          trayStyle,
        ]}
      >
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => {
              close();
              a.onPress();
            }}
            style={{
              width: ACTION_W,
              backgroundColor: a.tone ?? c.danger,
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Feather name={a.icon} size={17} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.4 }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: c.bg, borderRadius: radius.lg }, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
