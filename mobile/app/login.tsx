import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/AuthContext";
import { useColors } from "@/ThemeContext";
import { GUTTER, radius } from "@/theme";
import { haptic, Press, Txt } from "@/ui/base";
import { Button } from "@/ui/form";
import { Aperture } from "@/ui/Splash";

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A wrong password is worth a physical "no": the shake reads faster than the
  // message does.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setBusy(false);
      setError(
        signInError.toLowerCase().includes("invalid")
          ? "E-mailadres of wachtwoord klopt niet."
          : signInError
      );
      haptic("error");
      shake.value = withSequence(
        withTiming(-9, { duration: 55 }),
        withTiming(8, { duration: 55 }),
        withTiming(-5, { duration: 55 }),
        withTiming(0, { duration: 55 })
      );
      return;
    }

    haptic("success");
    // The root layout's guard also redirects, but doing it here means the
    // transition starts on the same frame as the successful response.
    router.replace("/");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: GUTTER,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={shakeStyle}>
          <Animated.View entering={FadeInDown.duration(600)} style={{ marginBottom: 30 }}>
            <Aperture size={48} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify().damping(20)}>
            <Txt variant="eyebrow" style={{ marginBottom: 10 }}>
              Photo De Caffeine
            </Txt>
            <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -1.1, color: c.fg }}>
              Welkom terug.
            </Text>
            <Txt variant="body" style={{ marginTop: 10, color: c.fg3 }}>
              Log in om je admin panel te openen.
            </Txt>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(180).springify().damping(20)}
            style={{ gap: 12, marginTop: 30 }}
          >
            <IconField icon="mail">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="E-mailadres"
                placeholderTextColor={c.fg4}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                style={{ flex: 1, fontSize: 16, color: c.fg, paddingVertical: 16 }}
              />
            </IconField>

            <IconField
              icon="lock"
              trailing={
                <Press
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={c.fg4} />
                </Press>
              }
            >
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Wachtwoord"
                placeholderTextColor={c.fg4}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                style={{ flex: 1, fontSize: 16, color: c.fg, paddingVertical: 16 }}
              />
            </IconField>

            {!!error && (
              <Animated.View
                entering={FadeInDown.duration(180)}
                style={{
                  padding: 12,
                  borderRadius: radius.md,
                  backgroundColor: c.surface,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: c.danger,
                }}
              >
                <Text style={{ fontSize: 12.5, color: c.danger, lineHeight: 18 }}>{error}</Text>
              </Animated.View>
            )}

            <Button
              size="lg"
              full
              busy={busy}
              onPress={submit}
              disabled={!email.trim() || !password}
              style={{ marginTop: 6 }}
            >
              {busy ? "Inloggen…" : "Inloggen"}
            </Button>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IconField({
  icon,
  trailing,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingLeft: 15,
        paddingRight: trailing ? 4 : 15,
        borderRadius: radius.md,
        backgroundColor: c.surface,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: c.line,
      }}
    >
      <Feather name={icon} size={16} color={c.fg4} />
      {children}
      {trailing}
    </View>
  );
}
