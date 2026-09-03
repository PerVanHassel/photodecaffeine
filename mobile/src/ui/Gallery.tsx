import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Dimensions, Image, Modal, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../ThemeContext";
import { radius, spring } from "../theme";
import { haptic, Press } from "./base";

const { width: SCREEN_W } = Dimensions.get("window");

/**
 * Square photo grid with a full-screen viewer.
 *
 * Three columns is the widest that keeps a thumbnail tappable on the narrowest
 * iPhone; four turns every photo into a stamp you have to open to identify.
 */
export function PhotoGrid({
  urls,
  onOpen,
  columns = 3,
  gap = 6,
  paddingH = 36,
}: {
  urls: string[];
  onOpen: (url: string) => void;
  columns?: number;
  gap?: number;
  /** Total horizontal padding around the grid, used to size the cells. */
  paddingH?: number;
}) {
  const c = useColors();
  const size = (SCREEN_W - paddingH - gap * (columns - 1)) / columns;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {urls.map((url, i) => (
        <Animated.View key={`${url}-${i}`} entering={FadeIn.delay(Math.min(i, 12) * 25)}>
          <Press
            onPress={() => onOpen(url)}
            scale={0.95}
            style={{
              width: size,
              height: size,
              borderRadius: radius.sm,
              overflow: "hidden",
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: c.line,
            }}
          >
            <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </Press>
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * Full-screen photo viewer.
 *
 * Drag down to dismiss, matching the sheet gesture used everywhere else, with
 * the backdrop fading as you pull so the gesture reads as "putting it back"
 * rather than "throwing it away".
 */
export function Lightbox({
  url,
  onClose,
  onDelete,
}: {
  url: string | null;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();

  const y = useSharedValue(0);

  const dismiss = () => {
    haptic("tap");
    onClose();
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationY) > 110 || Math.abs(e.velocityY) > 800) {
        y.value = withTiming(e.translationY > 0 ? 900 : -900, { duration: 180 });
        runOnJS(dismiss)();
      } else {
        y.value = withSpring(0, spring.snappy);
      }
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(0.7, Math.abs(y.value) / 400),
  }));

  return (
    <Modal visible={!!url} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, backdropStyle]}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: insets.top + 8,
            paddingHorizontal: 8,
            zIndex: 2,
          }}
        >
          <Press
            onPress={onClose}
            accessibilityLabel="Sluiten"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="x" size={24} color="#fff" />
          </Press>
          {onDelete && (
            <Press
              onPress={onDelete}
              feedback="warning"
              accessibilityLabel="Verwijderen"
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="trash-2" size={21} color={c.danger} />
            </Press>
          )}
        </View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flex: 1, paddingBottom: insets.bottom + 16 }, imageStyle]}>
            {!!url && (
              <Image
                source={{ uri: url }}
                style={{ flex: 1, width: "100%" }}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Grid + viewer wired together, which is how every caller uses them. */
export function Gallery({
  urls,
  onDelete,
  paddingH = 36,
}: {
  urls: string[];
  onDelete?: (url: string) => void;
  paddingH?: number;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <PhotoGrid urls={urls} onOpen={setOpen} paddingH={paddingH} />
      <Lightbox
        url={open}
        onClose={() => setOpen(null)}
        onDelete={
          onDelete && open
            ? () => {
                const target = open;
                setOpen(null);
                onDelete(target);
              }
            : undefined
        }
      />
    </>
  );
}
