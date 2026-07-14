import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Zap, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { projectId } from "/utils/supabase/info";

type WidgetItem = {
  id: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  title: string;
  route?: string;
};

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 3600000;
}
function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function RemindersWidget() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgentCount, setUrgentCount] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
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
      const inquiries: { id: string; name: string; package: string; createdAt: string; status?: string }[] = inqData.inquiries || [];
      const clients: { id: string; name: string; projectCount: number; createdAt: string }[] = cliData.clients || [];
      const articles: { id: string; published: boolean; featured: boolean; createdAt: string }[] = (artData.articles || []).filter((a: { id: string }) => a.id !== "__automotive_gallery__");

      const computed: WidgetItem[] = [];
      let urgent = 0;

      const pending = inquiries.filter(i => !i.status || i.status === "pending");
      const veryNew = pending.filter(i => hoursAgo(i.createdAt) < 4);
      const overdue48 = pending.filter(i => hoursAgo(i.createdAt) >= 48);
      const overdue24 = pending.filter(i => hoursAgo(i.createdAt) >= 24 && hoursAgo(i.createdAt) < 48);

      if (veryNew.length > 0) {
        urgent++;
        computed.push({ id: "hot", color: "#e07060", bg: "rgba(224,112,96,0.08)", border: "rgba(224,112,96,0.2)", icon: <Zap size={13} />, title: `${veryNew.length} nieuwe aanvraag — reageer nu`, route: "/admin/inquiries" });
      }
      if (overdue48.length > 0) {
        urgent++;
        computed.push({ id: "overdue", color: "#e07060", bg: "rgba(224,112,96,0.08)", border: "rgba(224,112,96,0.2)", icon: <AlertCircle size={13} />, title: `${overdue48.length} aanvra${overdue48.length === 1 ? "ag" : "gen"} wacht 48u+`, route: "/admin/inquiries" });
      }
      if (overdue24.length > 0 && overdue48.length === 0) {
        computed.push({ id: "24h", color: "#c8a030", bg: "rgba(200,160,48,0.08)", border: "rgba(200,160,48,0.2)", icon: <Clock size={13} />, title: `${overdue24.length} aanvra${overdue24.length === 1 ? "ag" : "gen"} wacht 24u`, route: "/admin/inquiries" });
      }

      const noProject = clients.filter(c => c.projectCount === 0 && daysSince(c.createdAt) > 3);
      if (noProject.length > 0) {
        computed.push({ id: "noproject", color: "#c8a030", bg: "rgba(200,160,48,0.08)", border: "rgba(200,160,48,0.2)", icon: <Clock size={13} />, title: `${noProject.length} klant${noProject.length === 1 ? "" : "en"} zonder project`, route: "/admin/clients" });
      }

      const published = articles.filter(a => a.published);
      if (published.length < 5) {
        computed.push({ id: "thin", color: "#5a82c8", bg: "rgba(90,130,200,0.08)", border: "rgba(90,130,200,0.2)", icon: <AlertCircle size={13} />, title: "Portfolio is aan te dun — voeg werk toe", route: "/admin/portfolio" });
      }

      setItems(computed.slice(0, 4));
      setUrgentCount(urgent);
    } catch {
      // silent — widget shouldn't block dashboard
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ backgroundColor: "rgba(13,7,3,0.6)", border: "1px solid rgba(255,251,224,0.1)", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#fffbe0", fontSize: "13px", fontWeight: 700 }}>Actiepunten</span>
          {!loading && urgentCount > 0 && (
            <span style={{ backgroundColor: "#e07060", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "8px" }}>
              {urgentCount}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/admin/reminders")}
          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "rgba(255,251,224,0.3)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "color 0.2s ease" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#c8905a")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,251,224,0.3)")}
        >
          Alles <ChevronRight size={10} />
        </button>
      </div>

      {loading && (
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "12px", padding: "16px 0" }}>Laden…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "12px", padding: "16px 0", textAlign: "center" }}>
          ✓ Alles op orde
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {items.map(item => (
            <div
              key={item.id}
              onClick={item.route ? () => navigate(item.route!) : undefined}
              style={{
                backgroundColor: item.bg,
                border: `1px solid ${item.border}`,
                padding: "10px 12px",
                display: "flex", alignItems: "center", gap: "10px",
                cursor: item.route ? "pointer" : "default",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => { if (item.route) e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <span style={{ color: item.color, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ color: "rgba(255,251,224,0.75)", fontSize: "12px", flex: 1 }}>{item.title}</span>
              {item.route && <ChevronRight size={12} color="rgba(255,251,224,0.2)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
