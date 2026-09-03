import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { useColors } from "../ThemeContext";

/**
 * Cold-start overlay, shown while the stored session is being read.
 *
 * Expo's native splash covers the launch itself; this covers the moment after
 * it, when the app is mounted but does not yet know whether to show the tabs or
 * the login screen. Without it that gap flashes an empty screen.
 */
export function Splash({ label = "Admin" }: { label?: string }) {
  const c = useColors();

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(280)}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", zIndex: 100 },
      ]}
    >
      <View style={{ alignItems: "center", gap: 22 }}>
        <Aperture />
        <Text
          style={{
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 4,
            textTransform: "uppercase",
            color: c.fg4,
            paddingLeft: 4,
          }}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

/** The app icon's mark: a copper aperture ring around a hexagonal opening. */
export function Aperture({ size = 76 }: { size?: number }) {
  const c = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGradient id="pdc-ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={c.copperHi} />
          <Stop offset="60%" stopColor={c.copper} />
          <Stop offset="100%" stopColor={c.copperLo} />
        </SvgGradient>
      </Defs>

      <Circle cx="50" cy="50" r="42" fill="none" stroke="url(#pdc-ring)" strokeWidth="6" />

      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <Path
          key={angle}
          d="M50 50 L50 14"
          stroke={c.copper}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.45}
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      <Path
        d="M50 26 L70.8 38 L70.8 62 L50 74 L29.2 62 L29.2 38 Z"
        fill={c.bg3}
        stroke={c.copper}
        strokeWidth="2"
      />
    </Svg>
  );
}
