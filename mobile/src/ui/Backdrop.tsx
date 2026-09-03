import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useColors } from "../ThemeContext";

/**
 * The lit ground every glass surface sits on: two soft copper pools over a warm
 * gradient. Fixed behind the whole app, so it stays put while content scrolls
 * over it and the surfaces read as translucent rather than merely grey.
 */
export function Backdrop() {
  const c = useColors();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[c.bg2, c.bg]}
        locations={[0, 0.46]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-left pool — the brightest point, roughly where a window would be. */}
      <LinearGradient
        colors={[c.glow, "transparent"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 0.55 }}
        style={{ position: "absolute", top: -80, left: -60, right: 0, height: 460 }}
      />

      {/* Weaker counter-pool on the right, so the light has a direction. */}
      <LinearGradient
        colors={[c.glowSoft, "transparent"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.7 }}
        style={{ position: "absolute", top: -40, left: 0, right: -40, height: 340 }}
      />
    </View>
  );
}
