import { motion } from "motion/react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Images,
  Lightbulb,
  Mail,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppData } from "../AppData";
import { useApi, useQuery } from "../useApi";
import {
  AUTOMOTIVE_GALLERY_ID,
  buildActionItems,
  MOBILE_ROUTE,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  type ActionIcon,
  type Priority,
} from "../../lib/actionItems";
import type { Reminder } from "../api";
import { c, dateShort, radius, spring } from "../theme";
import { Card, CardButton, Chip, Ellipsis, Press, Row, Stack } from "../ui/base";
import { Button, Field, Input, Segmented, Textarea } from "../ui/form";
import { Empty, SkeletonList, useToast } from "../ui/feedback";
import { HeaderAction, Screen } from "../ui/Screen";
import { Sheet } from "../ui/Sheet";
import { SwipeRow } from "../ui/SwipeRow";

const ICONS: Record<ActionIcon, ReactNode> = {
  zap: <Zap size={16} />,
  alert: <AlertCircle size={16} />,
  clock: <Clock size={16} />,
  users: <Users size={16} />,
  images: <Images size={16} />,
  mail: <Mail size={16} />,
  trending: <TrendingUp size={16} />,
  lightbulb: <Lightbulb size={16} />,
};

const PRIORITY_TONE: Record<Priority, string> = {
  urgent: c.danger,
  attention: c.warn,
  tip: c.info,
  growth: c.ok,
};

type Tab = "signals" | "own";

export function TasksScreen() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("signals");
  const [composing, setComposing] = useState(params.get("new") === "1");

  const { dueReminderCount, refresh } = useAppData();

  useEffect(() => {
    if (params.get("new")) {
      setTab("own");
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <Screen
      title="Actiepunten"
      eyebrow="Studio Intelligence"
      onRefresh={refresh}
      trailing={
        tab === "own" ? (
          <HeaderAction
            label="Nieuwe taak"
            icon={<Plus size={21} />}
            tone={c.copper}
            onClick={() => setComposing(true)}
          />
        ) : undefined
      }
      hero={
        <div style={{ marginBottom: 18 }}>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "signals", label: "Signalen" },
              { value: "own", label: "Mijn taken", badge: dueReminderCount },
            ]}
          />
        </div>
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
 * The derived advice list. Runs the same rule engine as the desktop
 * "Actiepunten" page (src/app/lib/actionItems.ts) over the same three
 * collections, so the two never disagree about what needs attention.
 */
function SignalsTab() {
  const navigate = useNavigate();
  const api = useApi();
  const { clients, inquiries, loading: baseLoading } = useAppData();

  const articles = useQuery(() => api.articles(), [api]);

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

  if ((baseLoading || articles.loading) && !items.length) {
    return <SkeletonList rows={4} height={92} />;
  }

  if (grouped.length === 0) {
    return (
      <Empty
        icon={<CheckCircle2 size={22} />}
        title="Alles op orde"
        body="Geen signalen — er is niets dat nu je aandacht vraagt."
      />
    );
  }

  return (
    <Stack gap={26}>
      {grouped.map((group, gi) => (
        <section key={group.priority}>
          <Row gap={9} style={{ marginBottom: 11 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: PRIORITY_TONE[group.priority],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: PRIORITY_TONE[group.priority],
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
              }}
            >
              {PRIORITY_LABEL[group.priority]}
            </span>
            <span style={{ fontSize: 11, color: c.fg4 }}>{group.items.length}</span>
          </Row>

          <Stack gap={9}>
            {group.items.map((item, i) => {
              const tone = PRIORITY_TONE[group.priority];
              const target = item.route ? MOBILE_ROUTE[item.route] : undefined;

              const body = (
                <Row gap={13} align="flex-start">
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: radius.sm,
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                      color: tone,
                    }}
                  >
                    {ICONS[item.icon]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 650, color: c.fg, lineHeight: 1.35 }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{ fontSize: 12.5, color: c.fg3, marginTop: 5, lineHeight: 1.55 }}
                    >
                      {item.description}
                    </div>
                    {item.cta && (
                      <Row gap={4} style={{ marginTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: tone }}>
                          {item.cta}
                        </span>
                        {target && <ChevronRight size={12} color={tone} />}
                      </Row>
                    )}
                  </div>
                </Row>
              );

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.smooth, delay: gi * 0.05 + i * 0.04 }}
                >
                  {target ? (
                    <CardButton
                      onClick={() => navigate(target)}
                      style={{
                        padding: 15,
                        backgroundColor: `color-mix(in srgb, ${tone} 5%, transparent)`,
                        borderColor: `color-mix(in srgb, ${tone} 20%, transparent)`,
                      }}
                    >
                      {body}
                    </CardButton>
                  ) : (
                    <Card
                      style={{
                        padding: 15,
                        backgroundColor: `color-mix(in srgb, ${tone} 5%, transparent)`,
                        borderColor: `color-mix(in srgb, ${tone} 20%, transparent)`,
                      }}
                    >
                      {body}
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </Stack>
        </section>
      ))}
    </Stack>
  );
}

// ── Eigen taken ───────────────────────────────────────────────────────────

/**
 * CRUD over the /admin/reminders endpoints.
 *
 * Those endpoints have existed on the server all along but nothing in the
 * desktop panel ever called them — its "Actiepunten" page is purely the derived
 * list above. This is the first surface that actually lets you write one down.
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
    setReminders((list) =>
      list.map((r) => (r.id === reminder.id ? { ...r, completed } : r))
    );
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
          icon={<Check size={22} />}
          title="Geen eigen taken"
          body="Noteer waar je aan moet denken — een terugbelafspraak, een levering, een factuur."
          action={{ label: "Taak toevoegen", onClick: () => setComposing(true) }}
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
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  return (
    <section>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: c.fg3,
          marginBottom: 11,
        }}
      >
        {title}
      </div>
      <Stack gap={9}>
        {items.map((r, i) => {
          const overdue = !r.completed && new Date(r.dueDate).getTime() < startOfToday;
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: Math.min(i, 8) * 0.03 }}
            >
              <SwipeRow
                actions={[
                  {
                    label: "Verwijder",
                    icon: <Trash2 size={17} />,
                    onClick: () => onDelete(r),
                    tone: c.danger,
                  },
                ]}
              >
                <Card style={{ padding: 13, opacity: r.completed ? 0.55 : 1 }}>
                  <Row gap={12} align="flex-start">
                    <Press
                      onClick={() => onToggle(r)}
                      disabled={busyId === r.id}
                      feedback={r.completed ? "tap" : "success"}
                      aria-label={r.completed ? "Heropenen" : "Afvinken"}
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        marginTop: 1,
                        borderRadius: 9,
                        border: `1.5px solid ${r.completed ? c.ok : overdue ? c.danger : c.line2}`,
                        backgroundColor: r.completed ? c.ok : "transparent",
                        display: "grid",
                        placeItems: "center",
                        color: r.completed ? c.bg : overdue ? c.danger : c.fg4,
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </Press>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Ellipsis
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: c.fg,
                          textDecoration: r.completed ? "line-through" : "none",
                          textDecorationColor: c.fg4,
                        }}
                      >
                        {r.title}
                      </Ellipsis>
                      {r.description && (
                        <div
                          style={{
                            fontSize: 12,
                            color: c.fg3,
                            marginTop: 3,
                            lineHeight: 1.45,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {r.description}
                        </div>
                      )}
                      <Row gap={7} style={{ marginTop: 7 }}>
                        <Chip tone={overdue ? "danger" : r.completed ? "neutral" : "copper"}>
                          {dateShort(r.dueDate)}
                        </Chip>
                        {overdue && <Chip tone="danger">Te laat</Chip>}
                      </Row>
                    </div>
                  </Row>
                </Card>
              </SwipeRow>
            </motion.div>
          );
        })}
      </Stack>
    </section>
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

  function reset() {
    setTitle("");
    setDescription("");
    setDueDate(new Date().toISOString().slice(0, 10));
  }

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
      reset();
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
        <Button full busy={busy} onClick={submit}>
          Toevoegen
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bijv. Marc terugbellen over shoot"
            autoFocus
          />
        </Field>
        <Field label="Toelichting" hint="Optioneel">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, afspraken, bedragen…"
            rows={3}
          />
        </Field>
        <Field label="Deadline">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </Stack>
    </Sheet>
  );
}
