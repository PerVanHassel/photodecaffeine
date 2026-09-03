import { Feather } from "@expo/vector-icons";
import { useEffect, type ReactNode } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../ThemeContext";
import { GUTTER, radius, spring } from "../theme";
import { haptic, Press, Txt } from "./base";

/** Drag distance past which release dismisses instead of snapping back. */
const DISMISS_DISTANCE = 110;
/** A fast flick dismisses even from a short distance. */
const DISMISS_VELOCITY = 800;

const SCREEN_H = Dimensions.get("window").height;

/**
 * Bottom sheet.
 *
 * Uses a native Modal so it sits above the tab bar and the navigation stack
 * without any z-index bargaining, with the drag handled by gesture-handler so
 * the pull tracks the finger on the UI thread rather than through JS.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  /** Fraction of screen height the sheet may grow to before it scrolls. */
  maxHeight = 0.88,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  maxHeight?: number;
  dismissable?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = withSpring(0, spring.gentle);
      backdrop.value = withTiming(1, { duration: 200 });
    } else {
      // Reset instantly while hidden: the Modal is already unmounted by the
      // time this runs, so animating out here would never be seen.
      translateY.value = SCREEN_H;
      backdrop.value = 0;
    }
  }, [open, translateY, backdrop]);

  function close() {
    haptic("tap");
    onClose();
  }

  const drag = Gesture.Pan()
    .enabled(dismissable)
    .onUpdate((e) => {
      // Only downward drag moves the sheet; upward is clamped so it can never
      // be pulled off the top of its own hinge.
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(SCREEN_H, { duration: 180 });
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, spring.snappy);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissable ? onClose : undefined}
    >
      {/* Modal content sits outside the app's provider tree on Android, so the
          gesture root has to be re-established inside it. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
            onPress={dismissable ? onClose : undefined}
            accessibilityLabel="Sluiten"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Animated.View
            style={[
              {
                maxHeight: SCREEN_H * maxHeight,
                backgroundColor: c.surfaceSolid,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderTopWidth: StyleSheet.hairlineWidth * 2,
                borderColor: c.line2,
                paddingBottom: insets.bottom + 10,
              },
              sheetStyle,
            ]}
          >
            {dismissable && (
              <GestureDetector gesture={drag}>
                <View style={{ paddingTop: 10, paddingBottom: 4, alignItems: "center" }}>
                  <View
                    style={{
                      width: 38,
                      height: 4,
                      borderRadius: radius.pill,
                      backgroundColor: c.line2,
                    }}
                  />
                </View>
              </GestureDetector>
            )}

            {(title || subtitle) && (
              <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 12 }}>
                {!!title && (
                  <Text style={{ fontSize: 19, fontWeight: "700", color: c.fg, letterSpacing: -0.4 }}>
                    {title}
                  </Text>
                )}
                {!!subtitle && (
                  <Txt variant="body" style={{ marginTop: 5, fontSize: 13, color: c.fg3 }}>
                    {subtitle}
                  </Txt>
                )}
              </View>
            )}

            {!!children && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: GUTTER,
                  paddingBottom: footer ? 8 : 16,
                }}
              >
                {children}
              </ScrollView>
            )}

            {footer && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: GUTTER,
                  paddingTop: 12,
                  paddingBottom: 4,
                  borderTopWidth: StyleSheet.hairlineWidth * 2,
                  borderTopColor: c.line,
                }}
              >
                {footer}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ── Action sheet ──────────────────────────────────────────────────────────

export interface SheetAction {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function ActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
        onPress={onClose}
      />
      <View
        style={{
          position: "absolute",
          left: GUTTER - 6,
          right: GUTTER - 6,
          bottom: insets.bottom + 10,
          gap: 8,
        }}
      >
        <View
          style={{
            backgroundColor: c.surfaceSolid,
            borderRadius: radius.lg,
            overflow: "hidden",
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: c.line,
          }}
        >
          {!!title && (
            <View
              style={{
                paddingVertical: 13,
                paddingHorizontal: 16,
                borderBottomWidth: StyleSheet.hairlineWidth * 2,
                borderBottomColor: c.line,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 12, color: c.fg3, textAlign: "center" }}>
                {title}
              </Text>
            </View>
          )}
          {actions.map((a, i) => (
            <Press
              key={a.label}
              disabled={a.disabled}
              scale={false}
              feedback={a.destructive ? "warning" : "tap"}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                minHeight: 52,
                borderTopWidth: i === 0 && !title ? 0 : StyleSheet.hairlineWidth * 2,
                borderTopColor: c.line,
              }}
            >
              {a.icon && (
                <Feather name={a.icon} size={17} color={a.destructive ? c.danger : c.fg} />
              )}
              <Text
                style={{ fontSize: 16, fontWeight: "500", color: a.destructive ? c.danger : c.fg }}
              >
                {a.label}
              </Text>
            </Press>
          ))}
        </View>

        <Press
          onPress={onClose}
          scale={false}
          style={{
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.lg,
            backgroundColor: c.surfaceSolid,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: c.line,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.fg }}>Annuleren</Text>
        </Press>
      </View>
    </Modal>
  );
}

// ── Confirm ───────────────────────────────────────────────────────────────

/**
 * Destructive-action confirmation. Separate from ActionSheet because a delete
 * needs its consequence spelled out, not just a red label.
 */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Verwijderen",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  const c = useColors();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={body}
      footer={
        <>
          <Press
            onPress={onClose}
            scale={false}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: c.line2,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.fg2 }}>Annuleren</Text>
          </Press>
          <Press
            onPress={onConfirm}
            disabled={busy}
            feedback="warning"
            scale={false}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.md,
              backgroundColor: c.danger,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
              {busy ? "Bezig…" : confirmLabel}
            </Text>
          </Press>
        </>
      }
    />
  );
}
