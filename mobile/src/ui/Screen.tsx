import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { RefreshControl, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../ThemeContext";
import { GUTTER, radius, TAB_BAR_H } from "../theme";
import { Press, Txt } from "./base";

/** Scroll distance over which the large title hands off to the compact one. */
const HANDOFF = 46;

interface ScreenProps {
  title: string;
  eyebrow?: string;
  /** Shows a back chevron. Pass a path to go somewhere specific. */
  back?: boolean | string;
  trailing?: ReactNode;
  onRefresh?: () => Promise<unknown> | void;
  refreshing?: boolean;
  /** Rendered between the large title and the body — filters, tabs, search. */
  hero?: ReactNode;
  children: ReactNode;
  /** Set on pushed screens, which have no tab bar to clear. */
  fullBleedBottom?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * The scaffold every screen sits in: collapsing large title, safe-area padding,
 * pull to refresh.
 *
 * The large-title handoff does most of the work in making this feel native —
 * the title starts as content in the scroll flow and becomes chrome as you
 * scroll, which is exactly how UIKit's large-title nav bar behaves.
 */
export function Screen({
  title,
  eyebrow,
  back,
  trailing,
  onRefresh,
  refreshing = false,
  hero,
  children,
  fullBleedBottom = false,
  contentStyle,
}: ScreenProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HANDOFF * 0.45, HANDOFF], [0, 1], Extrapolation.CLAMP),
  }));

  const largeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HANDOFF * 0.9], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, HANDOFF], [0, -10], Extrapolation.CLAMP) },
    ],
  }));

  // The header only grows a fill and a hairline once content is behind it, so a
  // screen at rest has no visible chrome at all.
  const headerFillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 20], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: insets.top,
          zIndex: 10,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: c.bg, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.line },
            headerFillStyle,
          ]}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 46,
            paddingHorizontal: GUTTER - 8,
            gap: 4,
          }}
        >
          {back ? (
            <Press
              accessibilityLabel="Terug"
              onPress={() => {
                if (typeof back === "string") router.replace(back as never);
                else if (router.canGoBack()) router.back();
              }}
              style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="chevron-left" size={26} color={c.fg} />
            </Press>
          ) : (
            <View style={{ width: trailing ? 8 : 0 }} />
          )}

          <Animated.View style={[{ flex: 1 }, compactStyle]}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: c.fg,
                textAlign: back ? "left" : "center",
              }}
            >
              {title}
            </Text>
          </Animated.View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>{trailing}</View>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            paddingHorizontal: GUTTER,
            paddingBottom: fullBleedBottom ? insets.bottom + 32 : TAB_BAR_H + insets.bottom + 36,
          },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                onRefresh();
              }}
              tintColor={c.copper}
              colors={[c.copper]}
              progressBackgroundColor={c.surfaceSolid}
            />
          ) : undefined
        }
      >
        <Animated.View style={[{ paddingTop: 4, paddingBottom: 18 }, largeStyle]}>
          {!!eyebrow && <Txt variant="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</Txt>}
          <Txt variant="title">{title}</Txt>
        </Animated.View>

        {hero}
        {children}
      </Animated.ScrollView>
    </View>
  );
}

/** Header action button, sized to a comfortable touch target. */
export function HeaderAction({
  icon,
  onPress,
  label,
  tone,
  badge,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  tone?: string;
  badge?: number;
}) {
  const c = useColors();
  return (
    <Press
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Feather name={icon} size={20} color={tone ?? c.fg2} />
      {!!badge && badge > 0 && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 4,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: c.copper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: c.bg, fontSize: 9.5, fontWeight: "800" }}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </Press>
  );
}
