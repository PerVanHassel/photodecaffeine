import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppData } from "@/AppData";
import { useAuth } from "@/AuthContext";
import { useApi } from "@/useApi";
import { useHandled } from "@/useHandled";
import { useColors } from "@/ThemeContext";
import { greeting, GUTTER, radius, timeAgo } from "@/theme";
import { Avatar, Card, CardButton, Chip, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { Counter, StatTile } from "@/ui/data";
import { Empty, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";

export default function HomeScreen() {
  const c = useColors();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const { user } = useAuth();
  const { handled } = useHandled();
  const {
    clients,
    inquiries,
    reminders,
    loading,
    refresh,
    openInquiryCount,
    dueReminderCount,
    setReminders,
  } = useAppData();

  const [refreshing, setRefreshing] = useState(false);
  const [ticking, setTicking] = useState<string | null>(null);

  const firstName = (user?.user_metadata?.name || user?.email || "Admin").split(/[\s@]/)[0];
  const totalProjects = useMemo(
    () => clients.reduce((sum, cl) => sum + (cl.projectCount || 0), 0),
    [clients]
  );

  const openInquiries = useMemo(
    () => inquiries.filter((q) => !handled.has(q.id)).slice(0, 3),
    [inquiries, handled]
  );

  const dueToday = useMemo(() => {
    const cutoff = new Date().setHours(23, 59, 59, 999);
    return reminders
      .filter((r) => !r.completed && new Date(r.dueDate).getTime() <= cutoff)
      .slice(0, 4);
  }, [reminders]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const sameMonth = (iso: string) => {
      const d = new Date(iso);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    return {
      inquiries: inquiries.filter((q) => sameMonth(q.createdAt)).length,
      clients: clients.filter((cl) => sameMonth(cl.createdAt)).length,
    };
  }, [inquiries, clients]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  /** Ticks a reminder off optimistically; rolls back if the server disagrees. */
  async function completeReminder(id: string) {
    setTicking(id);
    const before = reminders;
    setReminders((list) => list.map((r) => (r.id === id ? { ...r, completed: true } : r)));
    try {
      await api.updateReminder(id, { completed: true });
      toast("Afgevinkt", "success");
    } catch (err) {
      setReminders(() => before);
      toast(err instanceof Error ? err.message : "Kon niet afvinken", "error");
    } finally {
      setTicking(null);
    }
  }

  return (
    <Screen
      title={`${greeting()}, ${firstName}.`}
      eyebrow="Photo De Caffeine — Admin"
      onRefresh={handleRefresh}
      refreshing={refreshing}
      trailing={
        <>
          <HeaderAction
            label="Actiepunten"
            icon="bell"
            onPress={() => router.push("/tasks")}
            badge={dueReminderCount}
          />
          <Press
            onPress={() => router.push("/more")}
            accessibilityLabel="Account"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Avatar name={user?.user_metadata?.name || user?.email || "A"} size={30} />
          </Press>
        </>
      }
    >
      <Row gap={10} style={{ marginBottom: 10 }} align="stretch">
        <StatTile
          label="Klanten"
          value={clients.length}
          icon="users"
          onPress={() => router.push("/clients")}
          delay={20}
        />
        <StatTile
          label="Projecten"
          value={totalProjects}
          icon="folder"
          tone={c.info}
          onPress={() => router.push("/clients")}
          delay={70}
        />
      </Row>
      <Row gap={10} style={{ marginBottom: 26 }} align="stretch">
        <StatTile
          label="Open aanvragen"
          value={openInquiryCount}
          icon="inbox"
          tone={openInquiryCount > 0 ? c.warn : c.ok}
          onPress={() => router.push("/inbox")}
          delay={120}
          sub={inquiries.length ? `${inquiries.length} totaal` : undefined}
        />
        <StatTile
          label="Te doen"
          value={dueReminderCount}
          icon="bell"
          tone={dueReminderCount > 0 ? c.danger : c.ok}
          onPress={() => router.push("/tasks")}
          delay={170}
          sub={reminders.length ? `${reminders.length} totaal` : undefined}
        />
      </Row>

      <QuickActions />

      {/* Vandaag */}
      <View style={{ marginTop: 30 }}>
        <SectionLabel action={{ label: "Alles", onPress: () => router.push("/tasks") }}>
          Vandaag
        </SectionLabel>

        {loading && !reminders.length ? (
          <SkeletonList rows={2} height={62} />
        ) : dueToday.length === 0 ? (
          <Card style={{ padding: 18 }}>
            <Row gap={13}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.copperWash,
                }}
              >
                <Feather name="check" size={17} color={c.ok} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="heading" style={{ fontSize: 14 }}>
                  Niks openstaand
                </Txt>
                <Txt variant="meta" style={{ marginTop: 2 }}>
                  Geen actiepunten voor vandaag.
                </Txt>
              </View>
            </Row>
          </Card>
        ) : (
          <Stack gap={9}>
            {dueToday.map((r, i) => {
              const overdue = new Date(r.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
              return (
                <Animated.View key={r.id} entering={FadeInDown.delay(i * 40).springify().damping(20)}>
                  <Card style={{ padding: 13 }}>
                    <Row gap={12} align="flex-start">
                      <Press
                        onPress={() => completeReminder(r.id)}
                        disabled={ticking === r.id}
                        feedback="success"
                        accessibilityLabel="Afvinken"
                        style={{
                          width: 26,
                          height: 26,
                          marginTop: 1,
                          borderRadius: 9,
                          borderWidth: 1.5,
                          borderColor: overdue ? c.danger : c.line2,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="check" size={14} color={overdue ? c.danger : c.fg4} />
                      </Press>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: c.fg, lineHeight: 19 }}>
                          {r.title}
                        </Text>
                        {!!r.description && (
                          <Txt variant="meta" numberOfLines={2} style={{ marginTop: 3, lineHeight: 17 }}>
                            {r.description}
                          </Txt>
                        )}
                      </View>
                      {overdue && <Chip tone="danger">Te laat</Chip>}
                    </Row>
                  </Card>
                </Animated.View>
              );
            })}
          </Stack>
        )}
      </View>

      {/* Nieuwe aanvragen */}
      <View style={{ marginTop: 30 }}>
        <SectionLabel action={{ label: "Inbox", onPress: () => router.push("/inbox") }}>
          Nieuwe aanvragen
        </SectionLabel>

        {loading && !inquiries.length ? (
          <SkeletonList rows={2} height={72} />
        ) : openInquiries.length === 0 ? (
          <Card style={{ padding: 16 }}>
            <Txt variant="body" style={{ fontSize: 13, color: c.fg3 }}>
              Alles afgehandeld — geen open aanvragen.
            </Txt>
          </Card>
        ) : (
          <Stack gap={9}>
            {openInquiries.map((q, i) => (
              <Animated.View key={q.id} entering={FadeInDown.delay(i * 40).springify().damping(20)}>
                <CardButton onPress={() => router.push(`/inbox?open=${q.id}`)} style={{ padding: 14 }}>
                  <Row gap={12}>
                    <Avatar name={q.name} size={38} tone="warn" />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>
                        {q.name}
                      </Text>
                      <Txt variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
                        {q.brand || q.email}
                      </Txt>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Txt variant="meta" style={{ fontSize: 10.5, color: c.fg4 }}>
                        {timeAgo(q.createdAt)}
                      </Txt>
                      <Feather name="arrow-up-right" size={15} color={c.fg4} />
                    </View>
                  </Row>
                </CardButton>
              </Animated.View>
            ))}
          </Stack>
        )}
      </View>

      {/* Recente klanten */}
      <View style={{ marginTop: 30 }}>
        <SectionLabel action={{ label: "Alles", onPress: () => router.push("/clients") }}>
          Recente klanten
        </SectionLabel>

        {loading && !clients.length ? (
          <SkeletonList rows={3} />
        ) : clients.length === 0 ? (
          <Empty
            icon="users"
            title="Nog geen klanten"
            body="Zodra iemand een account krijgt verschijnt die hier."
          />
        ) : (
          <Stack gap={9}>
            {clients.slice(0, 4).map((cl, i) => (
              <Animated.View key={cl.id} entering={FadeInDown.delay(i * 40).springify().damping(20)}>
                <CardButton onPress={() => router.push(`/client/${cl.id}`)} style={{ padding: 14 }}>
                  <Row gap={12}>
                    <Avatar name={cl.name} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>
                        {cl.name}
                      </Text>
                      <Txt variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
                        {cl.company || cl.email}
                      </Txt>
                    </View>
                    <Chip tone={cl.projectCount ? "copper" : "neutral"}>
                      {cl.projectCount} {cl.projectCount === 1 ? "project" : "projecten"}
                    </Chip>
                  </Row>
                </CardButton>
              </Animated.View>
            ))}
          </Stack>
        )}
      </View>

      {/* Deze maand */}
      <View style={{ marginTop: 30 }}>
        <SectionLabel>Deze maand</SectionLabel>
        <Card style={{ padding: 18 }}>
          <Row gap={16}>
            <View style={{ flex: 1 }}>
              <Txt variant="eyebrow">Nieuwe aanvragen</Txt>
              <Counter value={thisMonth.inquiries} style={{ fontSize: 32, marginTop: 4 }} />
            </View>
            <View style={{ width: StyleSheet.hairlineWidth * 2, alignSelf: "stretch", backgroundColor: c.line }} />
            <View style={{ flex: 1 }}>
              <Txt variant="eyebrow">Nieuwe klanten</Txt>
              <Counter
                value={thisMonth.clients}
                style={{ fontSize: 32, marginTop: 4, color: c.copper }}
              />
            </View>
          </Row>
        </Card>
      </View>
    </Screen>
  );
}

/** Horizontal shortcut rail — the four things worth doing from a phone. */
function QuickActions() {
  const c = useColors();
  const router = useRouter();

  const actions: { label: string; icon: keyof typeof Feather.glyphMap; to: string; tone: string }[] = [
    { label: "Aanvragen", icon: "mail", to: "/inbox", tone: c.warn },
    { label: "Declaratie", icon: "file-text", to: "/declarations?new=1", tone: c.ok },
    { label: "Actiepunt", icon: "plus", to: "/tasks?new=1", tone: c.copper },
    { label: "Portfolio", icon: "image", to: "/portfolio", tone: c.info },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 9, paddingHorizontal: GUTTER }}
      style={{ marginHorizontal: -GUTTER }}
    >
      {actions.map((a, i) => (
        <Animated.View key={a.label} entering={FadeInDown.delay(200 + i * 50).springify().damping(20)}>
          <Press
            onPress={() => router.push(a.to as never)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 15,
              paddingVertical: 11,
              borderRadius: radius.pill,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: c.line,
            }}
          >
            <Feather name={a.icon} size={15} color={a.tone} />
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: c.fg2 }}>{a.label}</Text>
          </Press>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
