import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View, type ColorValue } from "react-native";
import { useAppData } from "@/AppData";
import { useTheme } from "@/ThemeContext";
import { radius, TAB_BAR_H } from "@/theme";
import { haptic } from "@/ui/base";

/**
 * Bottom tabs.
 *
 * The bar is a blur over the page rather than an opaque strip, so content
 * scrolling underneath stays faintly visible — the detail that makes it read as
 * a layer rather than a floor.
 */
export default function TabsLayout() {
  const { colors: c, scheme } = useTheme();
  const { openInquiryCount, dueReminderCount } = useAppData();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.copper,
        tabBarInactiveTintColor: c.fg4,
        tabBarStyle: {
          position: "absolute",
          height: TAB_BAR_H,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          borderTopColor: c.line,
          backgroundColor: Platform.OS === "android" ? c.surfaceSolid : "transparent",
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={70}
              tint={scheme === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: "600", letterSpacing: 0.2 },
        tabBarItemStyle: { paddingTop: 4 },
      }}
      screenListeners={{
        tabPress: () => haptic("select"),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <Icon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Klanten",
          tabBarIcon: ({ color, focused }) => <Icon name="users" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) => (
            <Icon name="inbox" color={color} focused={focused} badge={openInquiryCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Taken",
          tabBarIcon: ({ color, focused }) => (
            <Icon name="check-square" color={color} focused={focused} badge={dueReminderCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Meer",
          tabBarIcon: ({ color, focused }) => <Icon name="grid" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function Icon({
  name,
  color,
  focused,
  badge = 0,
}: {
  name: keyof typeof Feather.glyphMap;
  color: ColorValue;
  focused: boolean;
  badge?: number;
}) {
  const { colors: c } = useTheme();
  return (
    <View>
      {focused && (
        <View
          style={{
            position: "absolute",
            top: -6,
            left: -13,
            right: -13,
            bottom: -6,
            borderRadius: radius.md,
            backgroundColor: c.copperWash,
          }}
        />
      )}
      <Feather name={name} size={21} color={color} />
      {badge > 0 && (
        <View
          style={{
            position: "absolute",
            top: -5,
            right: -10,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: c.copper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: c.bg, fontSize: 9, fontWeight: "800" }}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}
