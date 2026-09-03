import { motion } from "motion/react";
import {
  ArrowUpRight,
  Bell,
  Check,
  FolderOpen,
  Inbox,
  Mail,
  Plus,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../AppData";
import { useApi } from "../useApi";
import { useHandled } from "../useHandled";
import { c, GUTTER, radius, spring, timeAgo } from "../theme";
import { Avatar, Card, CardButton, Chip, Press, Row, SectionLabel, Stack, Ellipsis } from "../ui/base";
import { Counter, StatTile } from "../ui/data";
import { Empty, SkeletonList, useToast } from "../ui/feedback";
import { HeaderAction, Screen } from "../ui/Screen";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Nog wakker";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

export function HomeScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  const toast = useToast();
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

  const recentClients = useMemo(() => clients.slice(0, 4), [clients]);

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
      onRefresh={refresh}
      trailing={
        <>
          <HeaderAction
            label="Actiepunten"
            icon={<Bell size={19} />}
            onClick={() => navigate("/app/tasks")}
            badge={dueReminderCount}
          />
          <Press
            onClick={() => navigate("/app/more")}
            aria-label="Account"
            style={{ width: 44, height: 44, display: "grid", placeItems: "center" }}
          >
            <Avatar name={user?.user_metadata?.name || user?.email || "A"} size={30} />
          </Press>
        </>
      }
    >
      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <StatTile
          label="Klanten"
          value={clients.length}
          icon={<Users size={15} />}
          onClick={() => navigate("/app/clients")}
          delay={0.02}
        />
        <StatTile
          label="Projecten"
          value={totalProjects}
          icon={<FolderOpen size={15} />}
          tone={c.info}
          onClick={() => navigate("/app/clients")}
          delay={0.07}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
        <StatTile
          label="Open aanvragen"
          value={openInquiryCount}
          icon={<Inbox size={15} />}
          tone={openInquiryCount > 0 ? c.warn : c.ok}
          onClick={() => navigate("/app/inbox")}
          delay={0.12}
          sub={inquiries.length ? `${inquiries.length} totaal` : undefined}
        />
        <StatTile
          label="Te doen"
          value={dueReminderCount}
          icon={<Bell size={15} />}
          tone={dueReminderCount > 0 ? c.danger : c.ok}
          onClick={() => navigate("/app/tasks")}
          delay={0.17}
          sub={reminders.length ? `${reminders.length} totaal` : undefined}
        />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Vandaag */}
      <section style={{ marginTop: 30 }}>
        <SectionLabel action={{ label: "Alles", onClick: () => navigate("/app/tasks") }}>
          Vandaag
        </SectionLabel>

        {loading && !reminders.length ? (
          <SkeletonList rows={2} height={62} />
        ) : dueToday.length === 0 ? (
          <Card style={{ padding: 20 }}>
            <Row gap={13}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: `color-mix(in srgb, ${c.ok} 15%, transparent)`,
                  color: c.ok,
                  flexShrink: 0,
                }}
              >
                <Check size={17} strokeWidth={2.6} />
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.fg }}>Niks openstaand</div>
                <div style={{ fontSize: 12, color: c.fg3, marginTop: 2 }}>
                  Geen actiepunten voor vandaag.
                </div>
              </div>
            </Row>
          </Card>
        ) : (
          <Stack gap={9}>
            {dueToday.map((r, i) => {
              const overdue = new Date(r.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.smooth, delay: 0.04 * i }}
                >
                  <Card style={{ padding: 13 }}>
                    <Row gap={12} align="flex-start">
                      <Press
                        onClick={() => completeReminder(r.id)}
                        disabled={ticking === r.id}
                        feedback="success"
                        aria-label="Afvinken"
                        style={{
                          width: 26,
                          height: 26,
                          flexShrink: 0,
                          marginTop: 1,
                          borderRadius: 9,
                          border: `1.5px solid ${overdue ? c.danger : c.line2}`,
                          display: "grid",
                          placeItems: "center",
                          color: overdue ? c.danger : c.fg4,
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </Press>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: c.fg, lineHeight: 1.35 }}>
                          {r.title}
                        </div>
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
                      </div>
                      {overdue && <Chip tone="danger">Te laat</Chip>}
                    </Row>
                  </Card>
                </motion.div>
              );
            })}
          </Stack>
        )}
      </section>

      {/* Nieuwe aanvragen */}
      <section style={{ marginTop: 30 }}>
        <SectionLabel action={{ label: "Inbox", onClick: () => navigate("/app/inbox") }}>
          Nieuwe aanvragen
        </SectionLabel>

        {loading && !inquiries.length ? (
          <SkeletonList rows={2} height={72} />
        ) : openInquiries.length === 0 ? (
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, color: c.fg3 }}>
              Alles afgehandeld — geen open aanvragen.
            </div>
          </Card>
        ) : (
          <Stack gap={9}>
            {openInquiries.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: 0.04 * i }}
              >
                <CardButton onClick={() => navigate(`/app/inbox?open=${q.id}`)} style={{ padding: 14 }}>
                  <Row gap={12}>
                    <Avatar name={q.name} size={38} tone="warn" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Ellipsis style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                        {q.name}
                      </Ellipsis>
                      <Ellipsis style={{ fontSize: 12, color: c.fg3, marginTop: 2 }}>
                        {q.brand || q.email}
                      </Ellipsis>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 10.5, color: c.fg4, fontWeight: 600 }}>
                        {timeAgo(q.createdAt)}
                      </div>
                      <ArrowUpRight size={15} color={c.fg4} style={{ marginTop: 4 }} />
                    </div>
                  </Row>
                </CardButton>
              </motion.div>
            ))}
          </Stack>
        )}
      </section>

      {/* Recente klanten */}
      <section style={{ marginTop: 30 }}>
        <SectionLabel action={{ label: "Alles", onClick: () => navigate("/app/clients") }}>
          Recente klanten
        </SectionLabel>

        {loading && !clients.length ? (
          <SkeletonList rows={3} />
        ) : recentClients.length === 0 ? (
          <Empty
            icon={<Users size={22} />}
            title="Nog geen klanten"
            body="Zodra iemand een account krijgt verschijnt die hier."
          />
        ) : (
          <Stack gap={9}>
            {recentClients.map((cl, i) => (
              <motion.div
                key={cl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: 0.04 * i }}
              >
                <CardButton onClick={() => navigate(`/app/client/${cl.id}`)} style={{ padding: 14 }}>
                  <Row gap={12}>
                    <Avatar name={cl.name} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Ellipsis style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                        {cl.name}
                      </Ellipsis>
                      <Ellipsis style={{ fontSize: 12, color: c.fg3, marginTop: 2 }}>
                        {cl.company || cl.email}
                      </Ellipsis>
                    </div>
                    <Chip tone={cl.projectCount ? "copper" : "neutral"}>
                      {cl.projectCount} {cl.projectCount === 1 ? "project" : "projecten"}
                    </Chip>
                  </Row>
                </CardButton>
              </motion.div>
            ))}
          </Stack>
        )}
      </section>

      {/* Deze maand */}
      <section style={{ marginTop: 30 }}>
        <SectionLabel>Deze maand</SectionLabel>
        <Card style={{ padding: 18 }}>
          <Row gap={16} align="center">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: c.fg4, fontWeight: 700 }}>
                Nieuwe aanvragen
              </div>
              <Counter
                value={
                  inquiries.filter(
                    (q) => new Date(q.createdAt).getMonth() === new Date().getMonth() &&
                      new Date(q.createdAt).getFullYear() === new Date().getFullYear()
                  ).length
                }
                style={{ fontSize: 32, fontWeight: 700, color: c.fg, lineHeight: 1.1 }}
              />
            </div>
            <div style={{ width: 1, alignSelf: "stretch", backgroundColor: c.line }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: c.fg4, fontWeight: 700 }}>
                Nieuwe klanten
              </div>
              <Counter
                value={
                  clients.filter(
                    (cl) => new Date(cl.createdAt).getMonth() === new Date().getMonth() &&
                      new Date(cl.createdAt).getFullYear() === new Date().getFullYear()
                  ).length
                }
                style={{ fontSize: 32, fontWeight: 700, color: c.copper, lineHeight: 1.1 }}
              />
            </div>
          </Row>
        </Card>
      </section>
    </Screen>
  );
}

/** Horizontal shortcut rail — the four things worth doing from a phone. */
function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Aanvragen", icon: Mail, to: "/app/inbox", tone: c.warn },
    { label: "Declaratie", icon: Receipt, to: "/app/declarations?new=1", tone: c.ok },
    { label: "Actiepunt", icon: Plus, to: "/app/tasks?new=1", tone: c.copper },
    { label: "Portfolio", icon: Sparkles, to: "/app/portfolio", tone: c.info },
  ];

  return (
    <div
      className="m-hscroll"
      style={{ gap: 9, marginLeft: -GUTTER, marginRight: -GUTTER, padding: `2px ${GUTTER}px` }}
    >
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring.smooth, delay: 0.2 + i * 0.05 }}
            style={{ scrollSnapAlign: "start", flexShrink: 0 }}
          >
            <Press
              onClick={() => navigate(a.to)}
              className="m-glass"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 15px",
                borderRadius: radius.pill,
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} color={a.tone} />
              <span style={{ fontSize: 12.5, fontWeight: 650, color: c.fg2 }}>{a.label}</span>
            </Press>
          </motion.div>
        );
      })}
    </div>
  );
}
