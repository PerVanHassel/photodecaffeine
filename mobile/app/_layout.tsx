import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/AuthContext";
import { AppDataProvider } from "@/AppData";
import { ThemeProvider, useTheme } from "@/ThemeContext";
import { ToastProvider } from "@/ui/feedback";
import { Backdrop } from "@/ui/Backdrop";
import { Splash } from "@/ui/Splash";

/**
 * Root of the app.
 *
 * Providers are ordered so theme is outermost (everything below reads colours
 * from it), auth sits above the data layer (nothing fetches without a session),
 * and toasts above both so a failed refresh can surface one.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppDataProvider>
                <Shell />
              </AppDataProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const { colors, scheme } = useTheme();
  const { session, isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const onLogin = segments[0] === "login";

  // Route guarding lives here rather than in each screen: one rule, applied
  // after the stored session has been read, so a cold launch never flashes the
  // login screen at someone who is already signed in.
  useEffect(() => {
    if (loading) return;
    if ((!session || !isAdmin) && !onLogin) router.replace("/login");
    else if (session && isAdmin && onLogin) router.replace("/");
  }, [loading, session, isAdmin, onLogin, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Backdrop />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: "fade" }} />
      </Stack>

      {loading && <Splash />}
    </View>
  );
}
