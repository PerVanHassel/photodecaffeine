import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/AuthContext";
import { useTheme } from "@/ThemeContext";
import { radius } from "@/theme";
import { Avatar, Card, Divider, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { Segmented } from "@/ui/form";
import { Screen } from "@/ui/Screen";
import { ConfirmSheet } from "@/ui/Sheet";

interface Entry {
  label: string;
  hint: string;
  icon: keyof typeof Feather.glyphMap;
  to?: string;
  url?: string;
}

const SECTIONS: { title: string; items: Entry[] }[] = [
  {
    title: "Content",
    items: [
      { label: "Portfolio", hint: "Artikelen publiceren en uitlichten", icon: "image", to: "/portfolio" },
      { label: "Automotive", hint: "Galerij van de automotive-pagina", icon: "truck", to: "/automotive" },
      { label: "Advertenties", hint: "Campagnes en hun leads", icon: "target", to: "/ads" },
    ],
  },
  {
    title: "Klanten",
    items: [
      { label: "Reviews", hint: "Beoordelingen en foto-feedback", icon: "star", to: "/reviews" },
    ],
  },
  {
    title: "Beheer",
    items: [
      { label: "Declaraties", hint: "Uitgaven en btw per kwartaal", icon: "file-text", to: "/declarations" },
      { label: "Team & rollen", hint: "Wie mag wat", icon: "shield", to: "/team" },
      { label: "Site-instellingen", hint: "Homepage, secties en contact", icon: "settings", to: "/settings" },
    ],
  },
  {
    title: "Elders",
    items: [
      {
        label: "Desktop admin panel",
        hint: "De volledige versie in de browser",
        icon: "monitor",
        url: "https://www.photodecaffeine.com/admin/dashboard",
      },
      {
        label: "photodecaffeine.com",
        hint: "De publieke site",
        icon: "external-link",
        url: "https://www.photodecaffeine.com",
      },
    ],
  },
];

export default function MoreScreen() {
  const { colors: c, mode, setMode } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const name = user?.user_metadata?.name || user?.email || "Admin";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setConfirmSignOut(false);
    router.replace("/login");
  }

  return (
    <Screen title="Meer" eyebrow="Beheer & instellingen">
      <Stack gap={26}>
        <Animated.View entering={FadeInDown.springify().damping(20)}>
          <Card style={{ padding: 18 }}>
            <Row gap={14}>
              <Avatar name={name} size={50} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: c.fg }}>
                  {name}
                </Text>
                <Txt variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
                  {user?.email}
                </Txt>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 2.2,
                    textTransform: "uppercase",
                    color: c.copper,
                    marginTop: 6,
                  }}
                >
                  Admin
                </Text>
              </View>
            </Row>
          </Card>
        </Animated.View>

        <View>
          <SectionLabel>Weergave</SectionLabel>
          <Card style={{ padding: 14 }}>
            <Segmented
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: "light", label: "Licht" },
                { value: "dark", label: "Donker" },
                { value: "system", label: "Systeem" },
              ]}
            />
            <Row gap={8} style={{ marginTop: 12, justifyContent: "center" }}>
              <Feather
                name={mode === "light" ? "sun" : mode === "dark" ? "moon" : "smartphone"}
                size={13}
                color={c.fg4}
              />
              <Txt variant="meta" style={{ fontSize: 11.5, color: c.fg4 }}>
                {mode === "system" ? "Volgt de instelling van je telefoon" : "Vast ingesteld"}
              </Txt>
            </Row>
          </Card>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title}>
            <SectionLabel>{section.title}</SectionLabel>
            <Card padded={false} style={{ paddingVertical: 2 }}>
              {section.items.map((item, i) => (
                <View key={item.label}>
                  {i > 0 && <Divider style={{ marginLeft: 58 }} />}
                  <Press
                    scale={false}
                    onPress={() => {
                      if (item.url) Linking.openURL(item.url);
                      else if (item.to) router.push(item.to as never);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 13,
                      minHeight: 58,
                      paddingHorizontal: 15,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: radius.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: c.copperWash,
                      }}
                    >
                      <Feather name={item.icon} size={15} color={c.copper} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                        {item.label}
                      </Text>
                      <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 1 }}>
                        {item.hint}
                      </Txt>
                    </View>
                    <Feather name="chevron-right" size={16} color={c.fg4} />
                  </Press>
                </View>
              ))}
            </Card>
          </View>
        ))}

        <Press
          onPress={() => setConfirmSignOut(true)}
          feedback="warning"
          scale={false}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 50,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: c.line,
          }}
        >
          <Feather name="log-out" size={16} color={c.danger} />
          <Text style={{ fontSize: 14.5, fontWeight: "600", color: c.danger }}>Uitloggen</Text>
        </Press>

        <Txt variant="meta" style={{ textAlign: "center", fontSize: 10.5, color: c.fg4 }}>
          PDC Admin {version} · Photo De Caffeine
        </Txt>
      </Stack>

      <ConfirmSheet
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleSignOut}
        busy={signingOut}
        title="Uitloggen?"
        body="Je moet daarna opnieuw inloggen om bij het admin panel te komen."
        confirmLabel="Uitloggen"
      />
    </Screen>
  );
}
