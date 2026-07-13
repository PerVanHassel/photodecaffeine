import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Users, FolderOpen, ArrowRight, TrendingUp, Plus, Search, Bell } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";
import { RemindersWidget } from "../../components/RemindersWidget";

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
  if (!str) return "Never";
  const diff = Date.now() - new Date(str).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(str);
}

function isRecentClient(createdAt: string): boolean {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) <= 7;
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
  const avgProjects = clients.length > 0 ? (totalProjects / clients.length).toFixed(1) : "0";
  const recentClients = clients.slice(0, 6);

  const statCards = [
    { label: "Total Clients", value: clients.length, icon: Users, color: "#c8905a", route: "/admin/clients" },
    { label: "Total Projects", value: totalProjects, icon: FolderOpen, color: "rgba(120,190,140,0.8)", route: "/admin/clients" },
    { label: "Avg / Client", value: avgProjects, icon: TrendingUp, color: "rgba(140,160,220,0.8)", route: null },
  ];

  const quickActions = [
    { label: "New Client", icon: Plus, action: () => navigate("/admin/clients") },
    { label: "Inquiries", icon: Search, action: () => navigate("/admin/inquiries") },
    { label: "Reminders", icon: Bell, action: () => document.getElementById("reminders-widget")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  return (
    <div style={{ padding: isMobile ? "28px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "12px" }}>
          Photo De Caffeine — Admin
        </div>
        <h1 style={{ color: "#fffbe0", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
          Good to see you,{" "}
          <span style={{ color: "#c8905a" }}>{firstName}.</span>
        </h1>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "40px", flexWrap: "wrap" }}>
        {quickActions.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "none", border: "1px solid rgba(255,251,224,0.1)",
              color: "rgba(255,251,224,0.5)", fontSize: "9px", fontWeight: 700,
              letterSpacing: "0.2em", textTransform: "uppercase",
              cursor: "pointer", padding: "8px 14px",
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.25)"; e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.5)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards — clickable where applicable */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: isMobile ? "8px" : "12px",
        marginBottom: isMobile ? "32px" : "48px",
      }}>
        {statCards.map(({ label, value, icon: Icon, color, route }) => {
          const Tag = route ? "button" : "div";
          return (
            <Tag
              key={label}
              onClick={route ? () => navigate(route) : undefined}
              style={{
                backgroundColor: "rgba(255,251,224,0.02)",
                border: "1px solid rgba(255,251,224,0.05)",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                cursor: route ? "pointer" : "default",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                transition: route ? "all 0.2s ease" : undefined,
                width: "100%",
              }}
              onMouseEnter={route ? (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.04)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; } : undefined}
              onMouseLeave={route ? (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.02)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.05)"; } : undefined}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  {label}
                </span>
                <Icon size={14} color={color} />
              </div>
              <div style={{ color: "#fffbe0", fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {loading ? "—" : value}
              </div>
              {route && !loading && (
                <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  View all <ArrowRight size={9} />
                </div>
              )}
            </Tag>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Reminders Widget */}
      <div id="reminders-widget" style={{ marginBottom: isMobile ? "32px" : "48px" }}>
        <RemindersWidget />
      </div>

      {/* Recent clients */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Recent Clients
          {!loading && clients.length > 0 && (
            <span style={{ color: "rgba(255,251,224,0.15)", marginLeft: "8px" }}>
              {recentClients.length} of {clients.length}
            </span>
          )}
        </span>
        <button
          onClick={() => navigate("/admin/clients")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,251,224,0.3)", fontSize: "9px", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif",
            display: "flex", alignItems: "center", gap: "5px",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#c8905a")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.3)")}
        >
          View All <ArrowRight size={10} />
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Loading…
        </div>
      )}

      {!loading && clients.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
          No clients yet. They will appear here after signing up via the Client Portal.
        </div>
      )}

      {!loading && recentClients.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {recentClients.map((client) => {
            const isRecent = isRecentClient(client.createdAt);
            return (
              <button
                key={client.id}
                onClick={() => navigate(`/admin/client/${client.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? "12px" : "20px",
                  padding: isMobile ? "14px 16px" : "18px 24px",
                  backgroundColor: isRecent ? "rgba(200,144,90,0.08)" : "rgba(255,251,224,0.015)",
                  border: `1px solid ${isRecent ? "rgba(200,144,90,0.2)" : "rgba(255,251,224,0.05)"}`,
                  cursor: "pointer", textAlign: "left",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s ease", width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isRecent ? "rgba(200,144,90,0.12)" : "rgba(255,251,224,0.03)";
                  e.currentTarget.style.borderColor = isRecent ? "rgba(200,144,90,0.3)" : "rgba(255,251,224,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isRecent ? "rgba(200,144,90,0.08)" : "rgba(255,251,224,0.015)";
                  e.currentTarget.style.borderColor = isRecent ? "rgba(200,144,90,0.2)" : "rgba(255,251,224,0.05)";
                }}
              >
                <div style={{
                  width: "34px", height: "34px", flexShrink: 0,
                  backgroundColor: isRecent ? "rgba(200,144,90,0.15)" : "rgba(255,251,224,0.05)",
                  border: `1px solid ${isRecent ? "rgba(200,144,90,0.25)" : "rgba(255,251,224,0.07)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isRecent ? "#c8905a" : "rgba(255,251,224,0.4)", fontSize: "11px", fontWeight: 600,
                }}>
                  {client.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#fffbe0", fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</span>
                    {isRecent && (
                      <span style={{
                        backgroundColor: "rgba(200,144,90,0.25)", color: "#c8905a",
                        fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        padding: "2px 6px", flexShrink: 0,
                      }}>
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isMobile ? client.email : (client.company || client.email)}
                  </div>
                </div>
                {!isMobile && (
                  <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", flexShrink: 0 }}>
                    {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                  </div>
                )}
                {!isMobile && (
                  <div style={{ color: "rgba(255,251,224,0.25)", fontSize: "11px", flexShrink: 0 }}>
                    {timeAgo(client.lastSignIn)}
                  </div>
                )}
                <ArrowRight size={13} color="rgba(255,251,224,0.2)" style={{ flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
