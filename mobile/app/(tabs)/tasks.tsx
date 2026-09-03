import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import {
  AUTOMOTIVE_GALLERY_ID,
  buildActionItems,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  type ActionIcon,
  type Priority,
} from "@shared/actionItems";
import { useAppData } from "@/AppData";
import { useApi, useQuery } from "@/useApi";
import type { Reminder } from "@/api";
import { useColors } from "@/ThemeContext";
import { dateShort, radius } from "@/theme";
import { Card, Chip, Press, Row, Stack, Txt } from "@/ui/base";
import { Button, Field, Input, Segmented } from "@/ui/form";
import { Empty, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";
import { Sheet } from "@/ui/Sheet";
import { DateField } from "@/ui/DateField";
import { SwipeRow } from "@/ui/SwipeRow";

/** Maps the shared engine's icon names onto Feather glyphs. */
const ICONS: Record<ActionIcon, keyof typeof Feather.glyphMap> = {
  zap: "zap",
  alert: "alert-circle",
  clock: "clock",
  users: "users",
  images: "image",
  mail: "mail",
  trending: "trending-up",
  lightbulb: "sun",
};

/** Where each desktop route lands in this app. */
const APP_ROUTE: Record<string, string> = {
  "/admin/inquiries": "/inbox",
  "/admin/clients": "/clients",
  "/admin/portfolio": "/portfolio",
};

type Tab = "signals" | "own";

export default function TasksScreen() {
  const params = useLocalSearchParams<{ new?: string }>();
  const [tab, setTab] = useState<Tab>("signals");
  const [composing, setComposing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { dueReminderCount, refresh } = useAppData();

  useEffect(() => {
    if (params.new === "1") {
      setTab("own");
      setComposing(true);
    }
  }, [params.new]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <Screen
      title="Actiepunten"
      eyebrow="Studio Intelligence"
      onRefresh={handleRefresh}
      refreshing={refreshing}
      trailing={
        tab === "own" ? (
          <HeaderAction label="Nieuwe taak" icon="plus" onPress={() => setComposing(true)} />
        ) : undefined
      }
      hero={
        <View style={{ marginBottom: 18 }}>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "signals", label: "Signalen" },
              { value: "own", label: "Mijn taken", badge: dueReminderCount },
            ]}
          />
        </View>
      }
    >
      {tab === "signals" ? (
        <SignalsTab />
      ) : (
        <OwnTasksTab composing={composing} setComposing={setComposing} />
      )}
    </Screen>
  );
}

// ── Signalen ──────────────────────────────────────────────────────────────

/**
 * The derived advice list.
 *
 * Runs the same rule engine as the website's "Actiepunten" page — the module is
 * imported straight out of the web project (see metro.config.js), so the two
 * can never disagree about when an aanvraag counts as late.
 */
function SignalsTab() {
  const c = useColors();
  const router = useRouter();
  const api = useApi();
  const { clients, inquiries, loading } = useAppData();

  const articles = useQuery(() => api.articles(), [api]);

  const PRIORITY_TONE: Record<Priority, string> = {
    urgent: c.danger,
    attention: c.warn,
    tip: c.info,
    growth: c.ok,
  };

  const items = useMemo(() => {
    const usable = (articles.data ?? []).filter((a) => a.id !== AUTOMOTIVE_GALLERY_ID);
    return buildActionItems(inquiries, clients, usable);
  }, [inquiries, clients, articles.data]);

  const grouped = useMemo(
    () =>
      PRIORITY_ORDER.map((p) => ({
        priority: p,
        items: items.filter((i) => i.priority === p),
      })).filter((g) => g.items.length > 0),
    [items]
  );

  if ((loading || articles.loading) && !items.length) return <SkeletonList rows={4} height={92} />;

  if (grouped.length === 0) {
    return (
      <Empty
        icon="check-circle"
        title="Alles op orde"
        body="Geen signalen — er is niets dat nu je aandacht vraagt."
      />
    );
  }

  return (
    <Stack gap={26}>
      {grouped.map((group, gi) => {
        const tone = PRIORITY_TONE[group.priority];
        return (
          <View key={group.priority}>
            <Row gap={9} style={{ marginBottom: 11 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone }} />
              <Text
                style={{
                  color: tone,
                  fontSize: 9.5,
                  fontWeight: "700",
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                }}
              >
                {PRIORITY_LABEL[group.priority]}
              </Text>
              <Txt variant="meta" style={{ fontSize: 11, color: c.fg4 }}>
                {group.items.length}
              </Txt>
            </Row>

            <Stack gap={9}>
              {group.items.map((item, i) => {
                const target = item.route ? APP_ROUTE[item.route] : undefined;

                const body = (
                  <Row gap={13} align="flex-start">
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: radius.sm,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: c.surface2,
                      }}
                    >
                      <Feather name={ICONS[item.icon]} size={16} color={tone} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: c.fg, lineHeight: 19 }}>
                        {item.title}
                      </Text>
                      <Txt variant="body" style={{ fontSize: 12.5, marginTop: 5, lineHeight: 19 }}>
                        {item.description}
                      </Txt>
                      {!!item.cta && (
                        <Row gap={4} style={{ marginTop: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: tone }}>
                            {item.cta}
                          </Text>
                          {!!target && <Feather name="chevron-right" size={12} color={tone} />}
                        </Row>
                      )}
                    </View>
                  </Row>
                );

                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(gi * 50 + i * 40).springify().damping(20)}
                  >
                    {target ? (
                      <Press onPress={() => router.push(target as never)} scale={0.985}>
                        <Card tone={tone} style={{ padding: 15 }}>
                          {body}
                        </Card>
                      </Press>
                    ) : (
                      <Card tone={tone} style={{ padding: 15 }}>
                        {body}
                      </Card>
                    )}
                  </Animated.View>
                );
              })}
            </Stack>
          </View>
        );
      })}
    </Stack>
  );
}

// ── Eigen taken ───────────────────────────────────────────────────────────

/**
 * CRUD over the /admin/reminders endpoints.
 *
 * Those endpoints have existed on the server all along but nothing in the
 * website's admin panel ever called them — its "Actiepunten" page is purely the
 * derived list above. This is the first surface that can actually write one.
 */
function OwnTasksTab({
  composing,
  setComposing,
}: {
  composing: boolean;
  setComposing: (v: boolean) => void;
}) {
  const api = useApi();
  const toast = useToast();
  const { reminders, loading, refresh, setReminders } = useAppData();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { open, done } = useMemo(() => {
    const sorted = [...reminders].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    return {
      open: sorted.filter((r) => !r.completed),
      done: sorted.filter((r) => r.completed),
    };
  }, [reminders]);

  async function setCompleted(reminder: Reminder, completed: boolean) {
    setBusyId(reminder.id);
    const before = reminders;
    setReminders((list) => list.map((r) => (r.id === reminder.id ? { ...r, completed } : r)));
    try {
      await api.updateReminder(reminder.id, { completed });
    } catch (err) {
      setReminders(() => before);
      toast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(reminder: Reminder) {
    const before = reminders;
    setReminders((list) => list.filter((r) => r.id !== reminder.id));
    try {
      await api.deleteReminder(reminder.id);
      toast("Taak verwijderd", "success");
    } catch (err) {
      setReminders(() => before);
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <>
      {loading && !reminders.length ? (
        <SkeletonList rows={3} height={64} />
      ) : reminders.length === 0 ? (
        <Empty
          icon="check"
          title="Geen eigen taken"
          body="Noteer waar je aan moet denken — een terugbelafspraak, een levering, een factuur."
          action={{ label: "Taak toevoegen", onPress: () => setComposing(true) }}
        />
      ) : (
        <Stack gap={24}>
          {open.length > 0 && (
            <TaskGroup
              title="Open"
              items={open}
              busyId={busyId}
              onToggle={(r) => setCompleted(r, true)}
              onDelete={remove}
            />
          )}
          {done.length > 0 && (
            <TaskGroup
              title="Afgerond"
              items={done}
              busyId={busyId}
              onToggle={(r) => setCompleted(r, false)}
              onDelete={remove}
            />
          )}
        </Stack>
      )}

      <ComposeTaskSheet
        open={composing}
        onClose={() => setComposing(false)}
        onCreated={() => {
          setComposing(false);
          refresh();
        }}
      />
    </>
  );
}

function TaskGroup({
  title,
  items,
  busyId,
  onToggle,
  onDelete,
}: {
  title: string;
  items: Reminder[];
  busyId: string | null;
  onToggle: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
}) {
  const c = useColors();
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  return (
    <View>
      <Txt variant="section" style={{ marginBottom: 11 }}>
        {title}
      </Txt>
      <Stack gap={9}>
        {items.map((r, i) => {
          const overdue = !r.completed && new Date(r.dueDate).getTime() < startOfToday;
          return (
            <Animated.View
              key={r.id}
              layout={LinearTransition.springify().damping(22)}
              entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
            >
              <SwipeRow
                actions={[
                  { label: "Verwijder", icon: "trash-2", onPress: () => onDelete(r), tone: c.danger },
                ]}
              >
                <Card style={{ padding: 13, opacity: r.completed ? 0.55 : 1 }}>
                  <Row gap={12} align="flex-start">
                    <Press
                      onPress={() => onToggle(r)}
                      disabled={busyId === r.id}
                      feedback={r.completed ? "tap" : "success"}
                      accessibilityLabel={r.completed ? "Heropenen" : "Afvinken"}
                      style={{
                        width: 26,
                        height: 26,
                        marginTop: 1,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: r.completed ? c.ok : overdue ? c.danger : c.line2,
                        backgroundColor: r.completed ? c.ok : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name="check"
                        size={14}
                        color={r.completed ? c.bg : overdue ? c.danger : c.fg4}
                      />
                    </Press>

                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: c.fg,
                          textDecorationLine: r.completed ? "line-through" : "none",
                        }}
                      >
                        {r.title}
                      </Text>
                      {!!r.description && (
                        <Txt variant="meta" numberOfLines={2} style={{ marginTop: 3, lineHeight: 17 }}>
                          {r.description}
                        </Txt>
                      )}
                      <Row gap={7} style={{ marginTop: 7 }}>
                        <Chip tone={overdue ? "danger" : r.completed ? "neutral" : "copper"}>
                          {dateShort(r.dueDate)}
                        </Chip>
                        {overdue && <Chip tone="danger">Te laat</Chip>}
                      </Row>
                    </View>
                  </Row>
                </Card>
              </SwipeRow>
            </Animated.View>
          );
        })}
      </Stack>
    </View>
  );
}

function ComposeTaskSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const api = useApi();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast("Geef de taak een titel", "error");
      return;
    }
    setBusy(true);
    try {
      await api.createReminder({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        type: "general",
      });
      toast("Taak toegevoegd", "success");
      setTitle("");
      setDescription("");
      setDueDate(new Date().toISOString().slice(0, 10));
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nieuwe taak"
      subtitle="Alleen zichtbaar voor het team."
      footer={
        <Button full busy={busy} onPress={submit}>
          Toevoegen
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Bijv. Marc terugbellen over shoot"
            autoFocus
          />
        </Field>
        <Field label="Toelichting" hint="Optioneel">
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Context, afspraken, bedragen…"
            multiline
          />
        </Field>
        <Field label="Deadline">
          <DateField value={dueDate} onChange={setDueDate} />
        </Field>
      </Stack>
    </Sheet>
  );
}
