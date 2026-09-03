import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle, Clock, Lightbulb, TrendingUp, RefreshCw,
  Mail, Users, Images, ChevronRight, CheckCircle, Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { projectId } from "/utils/supabase/info";
import {
  AUTOMOTIVE_GALLERY_ID,
  buildActionItems,
  PRIORITY_ORDER,
  type ActionIcon,
  type Priority,
} from "../../lib/actionItems";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  package: string;
  message: string;
  createdAt: string;
  status?: string;
};

type Client = {
  id: string;
  name: string;
  email: string;
  projectCount: number;
  createdAt: string;
  lastSignIn: string | null;
};

type Article = {
  id: string;
  title: string;
  category: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
};


// Priority, ActionItem and the rule engine itself live in src/app/lib/actionItems.ts
// so this page and the mobile app (/app/tasks) evaluate the same thresholds.
const ICONS: Record<ActionIcon, React.ReactNode> = {
  zap: <Zap size={16} />,
  alert: <AlertCircle size={16} />,
  clock: <Clock size={16} />,
  users: <Users size={16} />,
  images: <Images size={16} />,
  mail: <Mail size={16} />,
  trending: <TrendingUp size={16} />,
  lightbulb: <Lightbulb size={16} />,
};

const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  color: string;
  bg: string;
  border: string;
  headerBg: string;
}> = {
  urgent:    { label: "Urgent",    color: "#e07060", bg: "rgba(224,112,96,0.07)",  border: "rgba(224,112,96,0.2)",  headerBg: "rgba(224,112,96,0.1)" },
  attention: { label: "Aandacht",  color: "#c8a030", bg: "rgba(200,160,48,0.07)",  border: "rgba(200,160,48,0.2)",  headerBg: "rgba(200,160,48,0.1)" },
  tip:       { label: "Tip",       color: "#5a82c8", bg: "rgba(90,130,200,0.07)",  border: "rgba(90,130,200,0.2)",  headerBg: "rgba(90,130,200,0.1)" },
  growth:    { label: "Groei",     color: "#5a9a6a", bg: "rgba(90,154,106,0.07)",  border: "rgba(90,154,106,0.2)",  headerBg: "rgba(90,154,106,0.1)" },
};

export function AdminRemindersPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const base = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;
      const [inqRes, cliRes, artRes] = await Promise.all([
        fetch(`${base}/admin/inquiries`, { headers }),
        fetch(`${base}/admin/clients`, { headers }),
        fetch(`${base}/admin/portfolio`, { headers }),
      ]);
      const [inqData, cliData, artData] = await Promise.all([
        inqRes.json(), cliRes.json(), artRes.json(),
      ]);
      setInquiries(inqData.inquiries || []);
      setClients(cliData.clients || []);
      setArticles((artData.articles || []).filter((a: Article) => a.id !== AUTOMOTIVE_GALLERY_ID));
      setRefreshedAt(new Date());
    } catch {
      setError("Kon gegevens niet laden. Controleer je verbinding.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() =>
    buildActionItems(inquiries, clients, articles),
    [inquiries, clients, articles]
  );

  const grouped = useMemo(() => {
    return PRIORITY_ORDER
      .map(p => ({ priority: p, items: items.filter(i => i.priority === p) }))
      .filter(g => g.items.length > 0);
  }, [items]);

  const urgentCount = items.filter(i => i.priority === "urgent").length;

  if (loading) {
    return (
      <div style={{ padding: isMobile ? "24px 16px" : "40px", color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "13px" }}>
        Actiepunten laden…
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "40px", fontFamily: "'Inter', sans-serif", maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
          Studio Intelligence
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px 0", lineHeight: 1.1 }}>
              Actiepunten
            </h1>
            <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "13px" }}>
              {urgentCount > 0
                ? <span style={{ color: "#e07060" }}>{urgentCount} urgent{urgentCount === 1 ? "" : "e"} item{urgentCount === 1 ? "" : "s"}</span>
                : <span style={{ color: "#5a9a6a" }}>Alles op orde</span>
              }
              {" · "}bijgewerkt om {refreshedAt.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <button
            onClick={load}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))", color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", padding: "8px 14px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--admin-fg-solid)"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))"; }}
          >
            <RefreshCw size={12} />
            Vernieuwen
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "rgba(224,112,96,0.1)", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060", padding: "14px 16px", fontSize: "13px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* All groups */}
      {grouped.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "13px" }}>
          <CheckCircle size={32} style={{ margin: "0 auto 16px", display: "block", color: "#5a9a6a" }} />
          Geen actiepunten — alles ziet er goed uit.
        </div>
      )}

      {grouped.map(({ priority, items: groupItems }) => {
        const cfg = PRIORITY_CONFIG[priority];
        return (
          <div key={priority} style={{ marginBottom: "32px" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: cfg.color, flexShrink: 0 }} />
              <span style={{ color: cfg.color, fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                {cfg.label}
              </span>
              <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))", fontSize: "11px" }}>
                {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {groupItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    padding: isMobile ? "16px" : "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}
                >
                  <div style={{ color: cfg.color, flexShrink: 0, marginTop: "2px" }}>
                    {ICONS[item.icon]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--admin-fg-solid)", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                      {item.title}
                    </div>
                    <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.45 * var(--admin-fg-boost)))", fontSize: "12px", lineHeight: 1.6 }}>
                      {item.description}
                    </div>
                  </div>
                  {item.route ? (
                    <button
                      onClick={() => navigate(item.route!)}
                      style={{
                        flexShrink: 0,
                        display: "flex", alignItems: "center", gap: "5px",
                        backgroundColor: "transparent",
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        padding: "8px 12px",
                        fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        whiteSpace: "nowrap", transition: "all 0.2s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = cfg.headerBg; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      {item.cta || "Bekijk"}
                      <ChevronRight size={11} />
                    </button>
                  ) : item.cta ? (
                    <span style={{ flexShrink: 0, color: cfg.color, fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: "10px", whiteSpace: "nowrap" }}>
                      {item.cta}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
