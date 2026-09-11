import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Users, ArrowRight, Plus, Search, Bell, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useMobile } from "../../hooks/useMobile";
import { RemindersWidget } from "../../components/RemindersWidget";
import { ACCENT, ADMIN_FONT, ADMIN_MONO, CountUp, DANGER, Pulse, SPRING, Skeleton, eyebrow, fg } from "../../components/portal/adminTaste";

interface ClientSummary {
  id: string;
  name: string;
  company: string;
  email: string;
  projectCount: number;
  createdAt: string;
  lastSignIn: string | null;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(str: string | null) {
  if (!str) return "never";
  const diff = Date.now() - new Date(str).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(str);
}

function isRecentClient(createdAt: string): boolean {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) <= 7;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good to see you";
  return "Good evening";
}

const monoMeta = { fontFamily: ADMIN_MONO, fontSize: "11px", fontVariantNumeric: "tabular-nums" as const };

/** One line of the metric rail — a rule, a label, a number. No card. */
function StatRow({
  label, value, decimals = 0, hint, onClick, loading,
}: {
  label: string; value: number; decimals?: number; hint?: string;
  onClick?: () => void; loading: boolean;
}) {
  const [hover, setHover] = useState(false);
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderTop: `1px solid ${hover && interactive ? fg(0.16) : fg(0.07)}`,
        padding: "16px 0 18px",
        display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px",
        cursor: interactive ? "pointer" : "default",
        transition: "border-color 0.25s ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
        <span style={{ ...eyebrow(hover && interactive ? 0.55 : 0.3), transition: "color 0.25s ease" }}>{label}</span>
        {hint && <span style={{ ...monoMeta, color: fg(0.22), fontSize: "10px" }}>{hint}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {loading
          ? <Skeleton width={46} height={26} />
          : <CountUp value={value} decimals={decimals} style={{ color: "var(--admin-fg-solid)", fontSize: "30px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }} />}
        {interactive && (
          <ArrowRight
            size={13} strokeWidth={1.5}
            style={{
              color: hover ? ACCENT : fg(0.16),
              transform: hover ? "translateX(2px)" : "none",
              transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), color 0.25s ease",
            }}
          />
        )}
      </div>
    </div>
  );
}

function ClientRow({ client, index, onOpen, isMobile }: { client: ClientSummary; index: number; onOpen: () => void; isMobile: boolean }) {
  const [hover, setHover] = useState(false);
  const isRecent = isRecentClient(client.createdAt);
  const initials = client.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.045, 0.3) }}
      whileTap={{ scale: 0.995 }}
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex", alignItems: "center",
        gap: isMobile ? "12px" : "20px",
        padding: isMobile ? "15px 14px 15px 16px" : "17px 18px 17px 20px",
        background: hover ? fg(0.035) : "transparent",
        border: "none",
        borderTop: `1px solid ${fg(0.07)}`,
        cursor: "pointer", textAlign: "left",
        fontFamily: ADMIN_FONT,
        transition: "background-color 0.25s ease",
        width: "100%",
      }}
    >
      {/* The "new this week" marker: an edge tick, not a tinted box. */}
      <span style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "2px",
        backgroundColor: isRecent ? ACCENT : hover ? fg(0.2) : "transparent",
        transition: "background-color 0.25s ease",
      }} />
      <div style={{
        width: "32px", height: "32px", flexShrink: 0,
        border: `1px solid ${isRecent ? "rgba(200,144,90,0.3)" : fg(0.1)}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: isRecent ? ACCENT : fg(0.42),
        fontSize: "10px", fontWeight: 600, fontFamily: ADMIN_MONO,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--admin-fg-solid)", fontSize: "13px", fontWeight: 500, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {client.name}
          </span>
          {isRecent && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <Pulse size={4} />
              <span style={{ ...eyebrow(0.3, 8), color: ACCENT }}>New</span>
            </span>
          )}
        </div>
        <div style={{ color: fg(0.32), fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isMobile ? client.email : (client.company || client.email)}
        </div>
      </div>
      {!isMobile && (
        <span style={{ ...monoMeta, color: fg(0.3), flexShrink: 0 }}>
          {String(client.projectCount).padStart(2, "0")} proj
        </span>
      )}
      {!isMobile && (
        <span style={{ ...monoMeta, color: fg(0.24), flexShrink: 0, width: "92px", textAlign: "right" }}>
          {timeAgo(client.lastSignIn)}
        </span>
      )}
      <ArrowRight
        size={13} strokeWidth={1.5}
        style={{
          flexShrink: 0,
          color: hover ? ACCENT : fg(0.16),
          transform: hover ? "translateX(3px)" : "none",
          transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), color 0.25s ease",
        }}
      />
    </motion.button>
  );
}

function ClientRowSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: isMobile ? "12px" : "20px",
      padding: isMobile ? "15px 14px 15px 16px" : "17px 18px 17px 20px",
      borderTop: `1px solid ${fg(0.07)}`,
    }}>
      <Skeleton width={32} height={32} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <Skeleton width="38%" height={11} />
        <Skeleton width="22%" height={9} />
      </div>
      {!isMobile && <Skeleton width={54} height={9} />}
      {!isMobile && <Skeleton width={70} height={9} />}
    </div>
  );
}

export function AdminDashboardPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const adminName = user?.user_metadata?.name || user?.email || "Admin";
  const firstName = adminName.split(" ")[0];

  useEffect(() => {
    if (!session) return;
    portalFetch("/admin/clients", {}, session.access_token)
      .then((data) => { setClients(data.clients || []); setLoading(false); })
      .catch(() => { setError("Failed to load dashboard data."); setLoading(false); });
  }, [session]);

  const totalProjects = clients.reduce((sum, c) => sum + c.projectCount, 0);
  const avgProjects = clients.length > 0 ? totalProjects / clients.length : 0;
  const newThisWeek = clients.filter((c) => isRecentClient(c.createdAt)).length;
  const recentClients = clients.slice(0, 6);

  const quickActions = [
    { label: "New Client", icon: Plus, action: () => navigate("/admin/clients") },
    { label: "Inquiries", icon: Search, action: () => navigate("/admin/inquiries") },
    { label: "Reminders", icon: Bell, action: () => document.getElementById("reminders-widget")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{
      padding: isMobile ? "28px 16px 64px" : "52px 40px 96px",
      maxWidth: "1240px",
      fontFamily: ADMIN_FONT,
    }}>
      {/* Hero — greeting left, metric rail right. Deliberately off-balance. */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.45fr) minmax(280px,1fr)",
        gap: isMobile ? "36px" : "72px",
        alignItems: "end",
        marginBottom: isMobile ? "44px" : "72px",
      }}>
        <div>
          <div style={{ ...eyebrow(0.24), display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <Pulse size={4} />
            Photo De Caffeine — Admin
          </div>
          <h1 style={{
            color: "var(--admin-fg-solid)",
            fontSize: isMobile ? "30px" : "clamp(30px, 3vw, 40px)",
            fontWeight: 500, letterSpacing: "-0.035em",
            margin: 0, lineHeight: 1.05,
          }}>
            {greeting()}, <span style={{ color: ACCENT }}>{firstName}.</span>
          </h1>
          <div style={{ ...monoMeta, color: fg(0.28), marginTop: "14px", textTransform: "lowercase" }}>
            {today}
            {!loading && newThisWeek > 0 && (
              <span style={{ color: ACCENT }}>{`  ·  ${newThisWeek} new client${newThisWeek === 1 ? "" : "s"} this week`}</span>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "30px", flexWrap: "wrap" }}>
            {quickActions.map(({ label, icon: Icon, action }) => (
              <motion.button
                key={label}
                onClick={action}
                whileTap={{ scale: 0.97, y: 1 }}
                transition={SPRING}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  background: "none", border: `1px solid ${fg(0.1)}`,
                  color: fg(0.5), fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer", padding: "9px 15px",
                  fontFamily: ADMIN_FONT,
                  transition: "color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--admin-fg-solid)"; e.currentTarget.style.borderColor = fg(0.25); e.currentTarget.style.backgroundColor = fg(0.04); }}
                onMouseLeave={(e) => { e.currentTarget.style.color = fg(0.5); e.currentTarget.style.borderColor = fg(0.1); e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Icon size={11} strokeWidth={1.5} />
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Metric rail */}
        <div>
          <StatRow label="Clients" value={clients.length} loading={loading} hint="accounts in the portal" onClick={() => navigate("/admin/clients")} />
          <StatRow label="Projects" value={totalProjects} loading={loading} hint="across all clients" onClick={() => navigate("/admin/clients")} />
          <StatRow label="Avg / client" value={avgProjects} decimals={1} loading={loading} hint="projects per account" />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 16px",
          borderLeft: `2px solid ${DANGER}`,
          backgroundColor: "rgba(224,112,96,0.07)",
          color: DANGER, fontSize: "12px",
          marginBottom: "32px",
        }}>
          <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Reminders */}
      <div id="reminders-widget" style={{ marginBottom: isMobile ? "40px" : "72px" }}>
        <RemindersWidget />
      </div>

      {/* Recent clients */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", minWidth: 0 }}>
          <span style={{ ...eyebrow(0.35), letterSpacing: "0.3em" }}>Recent Clients</span>
          {!loading && clients.length > 0 && (
            <span style={{ ...monoMeta, color: fg(0.2), fontSize: "10px" }}>
              {String(recentClients.length).padStart(2, "0")} / {String(clients.length).padStart(2, "0")}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/admin/clients")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: fg(0.32), fontSize: "9px", fontWeight: 700,
            letterSpacing: "0.2em", textTransform: "uppercase",
            fontFamily: ADMIN_FONT,
            display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={(e) => (e.currentTarget.style.color = fg(0.32))}
        >
          View All <ArrowRight size={10} strokeWidth={1.5} />
        </button>
      </div>

      <div style={{ borderBottom: `1px solid ${fg(0.07)}` }}>
        {loading && Array.from({ length: 4 }).map((_, i) => <ClientRowSkeleton key={i} isMobile={isMobile} />)}

        {!loading && clients.length === 0 && !error && (
          <div style={{
            borderTop: `1px solid ${fg(0.07)}`,
            padding: isMobile ? "48px 16px" : "72px 24px",
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "14px",
          }}>
            <div style={{
              width: "38px", height: "38px",
              border: `1px solid ${fg(0.12)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: fg(0.3),
            }}>
              <Users size={16} strokeWidth={1.5} />
            </div>
            <div style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.02em" }}>
              No clients yet
            </div>
            <div style={{ color: fg(0.34), fontSize: "12px", lineHeight: 1.7, maxWidth: "46ch" }}>
              Accounts show up here the moment someone signs up through the client portal. Send an invite from the Clients page to get the first one in.
            </div>
            <button
              onClick={() => navigate("/admin/clients")}
              style={{
                marginTop: "6px",
                display: "flex", alignItems: "center", gap: "7px",
                background: "none", border: `1px solid ${fg(0.16)}`,
                color: fg(0.6), fontSize: "9px", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase",
                cursor: "pointer", padding: "9px 15px", fontFamily: ADMIN_FONT,
                transition: "color 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--admin-fg-solid)"; e.currentTarget.style.borderColor = fg(0.3); }}
              onMouseLeave={(e) => { e.currentTarget.style.color = fg(0.6); e.currentTarget.style.borderColor = fg(0.16); }}
            >
              <Plus size={11} strokeWidth={1.5} /> Go to Clients
            </button>
          </div>
        )}

        {!loading && recentClients.map((client, i) => (
          <ClientRow
            key={client.id}
            client={client}
            index={i}
            isMobile={isMobile}
            onOpen={() => navigate(`/admin/client/${client.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
