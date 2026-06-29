import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Users, FolderOpen, ArrowRight, TrendingUp, Bug, AlertCircle } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";
import { RemindersWidget } from "../../components/RemindersWidget";
import { projectId } from "/utils/supabase/info";

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
  const created = new Date(createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - created.getTime()) / 86400000);
  return daysDiff <= 7;
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
      .catch((err) => { console.error("Failed to load clients:", err); setError("Failed to load dashboard data."); setLoading(false); });
  }, [session]);

  const totalProjects = clients.reduce((sum, c) => sum + c.projectCount, 0);
  const avgProjects = clients.length > 0 ? (totalProjects / clients.length).toFixed(1) : "0";
  const recentClients = clients.slice(0, 6);

  async function debugAuth() {
    console.log("=== AUTH DEBUG ===");
    console.log("User:", user);
    console.log("User metadata:", user?.user_metadata);
    console.log("Session exists:", !!session);
    console.log("Access token exists:", !!session?.access_token);

    if (session?.access_token) {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/test`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
        const data = await res.json();
        console.log("Auth test response:", data);

        const message = `Auth Test Result:\n\nAuthenticated: ${data.authenticated}\nUser ID: ${data.userId || 'N/A'}\nEmail: ${data.email || 'N/A'}\nRole: ${data.role || 'NOT SET'}\nIs Admin: ${data.isAdmin}\n\nFull Metadata:\n${JSON.stringify(data.fullMetadata, null, 2)}`;

        if (!data.isAdmin && data.authenticated) {
          const fixRole = confirm(message + "\n\n❌ You are NOT recognized as admin!\n\nClick OK to fix your admin role (requires ADMIN_SECRET).");
          if (fixRole) {
            const secret = prompt("Enter your ADMIN_SECRET:");
            if (secret) {
              await fixAdminRole(secret);
            }
          }
        } else {
          alert(message);
        }
      } catch (err) {
        console.error("Auth test failed:", err);
        alert(`Auth test failed: ${err}`);
      }
    } else {
      alert("No access token available!");
    }
  }

  async function fixAdminRole(secret: string) {
    if (!session?.access_token) return;

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/fix-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ adminSecret: secret }),
        }
      );
      const data = await res.json();

      if (res.ok) {
        alert(`✅ ${data.message}\n\nPlease sign out and sign back in.`);
        window.location.reload();
      } else {
        alert(`❌ Failed to fix role: ${data.error}`);
      }
    } catch (err) {
      console.error("Fix role failed:", err);
      alert(`Failed to fix role: ${err}`);
    }
  }

  const statCards = [
    { label: "Total Clients", value: clients.length, icon: Users, color: "#c8905a" },
    { label: "Total Projects", value: totalProjects, icon: FolderOpen, color: "rgba(120,190,140,0.8)" },
    { label: "Avg / Client", value: avgProjects, icon: TrendingUp, color: "rgba(140,160,220,0.8)" },
  ];

  return (
    <div style={{ padding: isMobile ? "28px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* Auth Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: "rgba(224,112,96,0.1)",
            border: "2px solid rgba(224,112,96,0.4)",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <AlertCircle size={28} color="#e07060" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#e07060",
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "8px",
                  letterSpacing: "-0.01em",
                }}
              >
                ⚠️ Authorization Error Detected
              </div>
              <div
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  marginBottom: "4px",
                }}
              >
                {error}
              </div>
              <div
                style={{
                  color: "rgba(255,251,224,0.4)",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                Your account exists but doesn't have admin privileges set.
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(200,144,90,0.15)",
              border: "1px solid rgba(200,144,90,0.3)",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ color: "#c8905a", fontSize: "11px", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>
              ✓ QUICK FIX AVAILABLE
            </div>
            <div style={{ color: "rgba(255,251,224,0.5)", fontSize: "11px", lineHeight: 1.6 }}>
              Fix this in 2 steps: Enter your email + ADMIN_SECRET
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/self-fix")}
            style={{
              backgroundColor: "#c8905a",
              border: "none",
              color: "#060301",
              padding: "14px 24px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              width: "100%",
            }}
          >
            → Fix Admin Role Nu (Werkt Gegarandeerd)
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "56px" }}>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "12px" }}>
          Photo De Caffeine — Admin
        </div>
        <h1 style={{ color: "#fffbe0", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
          Good to see you,{" "}
          <span style={{ color: "#c8905a" }}>{firstName}.</span>
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: isMobile ? "8px" : "12px",
        marginBottom: isMobile ? "32px" : "48px",
      }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            backgroundColor: "rgba(255,251,224,0.02)",
            border: "1px solid rgba(255,251,224,0.05)",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                {label}
              </span>
              <Icon size={14} color={color} />
            </div>
            <div style={{ color: "#fffbe0", fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {loading ? "—" : value}
            </div>
          </div>
        ))}
      </div>

      {/* Reminders Widget */}
      <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
        <RemindersWidget />
      </div>

      {/* Recent clients */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Recent Clients
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

      {error && (
        <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

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
                      <span
                        style={{
                          backgroundColor: "rgba(200,144,90,0.25)",
                          color: "#c8905a",
                          fontSize: "8px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          flexShrink: 0,
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isMobile ? client.email : (client.company || client.email)}</div>
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