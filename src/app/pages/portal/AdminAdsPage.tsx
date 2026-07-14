import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { useMobile } from "../../hooks/useMobile";
import { Megaphone, TrendingUp, Users, MousePointerClick, Copy, Check, Pencil, X, Trash2, Download, AlertCircle } from "lucide-react";

interface RawInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  brand: string;
  message: string;
  package: string;
  createdAt: string;
}

interface CampaignStat {
  ref: string;
  page: string;
  visits: number;
  leads: RawInquiry[];
  lastActivity: string;
}

/** Per-campaign metadata stored in localStorage. */
interface CampaignMeta {
  label: string;
  active: boolean;
}

const LS_KEY = "adCampaignMeta";
const LS_DELETED_KEY = "adCampaignDeleted";

function loadMeta(): Record<string, CampaignMeta> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}

function saveMeta(meta: Record<string, CampaignMeta>) {
  localStorage.setItem(LS_KEY, JSON.stringify(meta));
}

function loadDeleted(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_DELETED_KEY) || "[]")); } catch { return new Set(); }
}

function saveDeleted(deleted: Set<string>) {
  localStorage.setItem(LS_DELETED_KEY, JSON.stringify([...deleted]));
}

function extractRef(message: string): string {
  const match = message.match(/\[ref:([^\]]+)\]/);
  return match ? match[1] : "";
}

function cvr(visits: number, leads: number): string {
  if (visits === 0) return leads > 0 ? "100%" : "—";
  return `${((leads / visits) * 100).toFixed(1)}%`;
}

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDate(str: string) {
  return new Date(str).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const metaLabelStyle: React.CSSProperties = {
  color: "rgba(255,251,224,0.2)",
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      border: "1px solid rgba(255,251,224,0.06)",
      backgroundColor: "rgba(255,251,224,0.015)",
      padding: "24px",
      flex: 1,
      minWidth: "140px",
    }}>
      <div style={metaLabelStyle}>{label}</div>
      <div style={{ color: "#fffbe0", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", marginTop: "6px" }}>{sub}</div>}
    </div>
  );
}

function CopyUrl({ campaign, page }: { campaign: string; page: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://www.photodecaffeine.com${page}?ref=${campaign}`;
  function copy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
      <span style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", fontFamily: "'Courier New', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {url}
      </span>
      <button onClick={copy} style={{ background: "none", border: "1px solid rgba(255,251,224,0.08)", color: copied ? "#80c880" : "rgba(255,251,224,0.35)", cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em", transition: "all 0.2s ease", flexShrink: 0 }}>
        {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
      </button>
    </div>
  );
}

/** Inline editable label — click pencil to edit, Enter/blur to save. */
function LabelEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.stopPropagation();
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim());
  }

  function cancel(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
    setDraft(value);
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
          onBlur={() => { setEditing(false); if (draft.trim() !== value) onChange(draft.trim()); }}
          style={{
            backgroundColor: "rgba(255,251,224,0.05)",
            border: "1px solid rgba(200,144,90,0.3)",
            color: "#fffbe0",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            padding: "4px 8px",
            outline: "none",
            width: "180px",
          }}
        />
        <button onClick={commit} style={{ background: "none", border: "none", color: "#c8905a", cursor: "pointer", padding: "2px", display: "flex" }}>
          <Check size={13} />
        </button>
        <button onClick={cancel} style={{ background: "none", border: "none", color: "rgba(255,251,224,0.3)", cursor: "pointer", padding: "2px", display: "flex" }}>
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {value ? (
        <span style={{ color: "#fffbe0", fontSize: "13px", fontWeight: 600 }}>{value}</span>
      ) : (
        <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "12px", fontStyle: "italic" }}>Add label…</span>
      )}
      <button
        onClick={startEdit}
        title="Edit label"
        style={{ background: "none", border: "none", color: "rgba(255,251,224,0.2)", cursor: "pointer", padding: "2px", display: "flex", transition: "color 0.15s ease" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.6)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.2)")}
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

/** Pill toggle: Active / Inactive */
function ActiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!active); }}
      title={active ? "Mark as inactive" : "Mark as active"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        backgroundColor: active ? "rgba(120,190,140,0.1)" : "rgba(255,251,224,0.05)",
        border: `1px solid ${active ? "rgba(120,190,140,0.25)" : "rgba(255,251,224,0.1)"}`,
        color: active ? "rgba(120,190,140,0.9)" : "rgba(255,251,224,0.25)",
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
        cursor: "pointer",
        padding: "5px 10px",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {/* Mini indicator dot */}
      <span style={{
        width: "5px", height: "5px",
        borderRadius: "50%",
        backgroundColor: active ? "rgba(120,190,140,0.9)" : "rgba(255,251,224,0.25)",
        flexShrink: 0,
      }} />
      {active ? "Active" : "Inactive"}
    </button>
  );
}

type FilterTab = "all" | "active" | "inactive";
type Period = "all" | "7d" | "30d" | "90d";

const PAGE_OPTIONS = [
  { label: "Automotive", value: "/services/automotive" },
  { label: "Homepage", value: "/" },
  { label: "Contact", value: "/contact" },
  { label: "Portfolio", value: "/portfolio" },
];

function buildStats(all: RawInquiry[], cutoff?: Date): CampaignStat[] {
  const filtered = cutoff ? all.filter(i => new Date(i.createdAt) >= cutoff) : all;
  const map = new Map<string, CampaignStat>();
  const ensure = (ref: string, page: string) => {
    if (!map.has(ref)) map.set(ref, { ref, page, visits: 0, leads: [], lastActivity: "" });
    return map.get(ref)!;
  };
  const bump = (stat: CampaignStat, date: string) => {
    if (!stat.lastActivity || date > stat.lastActivity) stat.lastActivity = date;
  };
  for (const inq of filtered) {
    if (inq.name === "__ad_visit__") {
      let page = "/";
      try { page = JSON.parse(inq.message).page || "/"; } catch { /* ignore */ }
      const s = ensure(inq.brand, page);
      s.visits += 1;
      bump(s, inq.createdAt);
    } else {
      const ref = extractRef(inq.message);
      if (ref) {
        const s = ensure(ref, "");
        s.leads.push(inq);
        bump(s, inq.createdAt);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.leads.length !== a.leads.length ? b.leads.length - a.leads.length : b.visits - a.visits
  );
}

function getCutoff(period: Period): Date | undefined {
  if (period === "all") return undefined;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function AdminAdsPage() {
  const { session } = useAuth();
  const isMobile = useMobile();

  const [rawInquiries, setRawInquiries] = useState<RawInquiry[]>([]);
  const [meta, setMeta] = useState<Record<string, CampaignMeta>>(loadMeta);
  const [deleted, setDeleted] = useState<Set<string>>(loadDeleted);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [targetPage, setTargetPage] = useState("/services/automotive");

  useEffect(() => {
    if (!session) return;
    portalFetch("/admin/inquiries", {}, session.access_token)
      .then((data) => { setRawInquiries(data.inquiries || []); setLoading(false); })
      .catch((err) => { console.error(err); setError("Failed to load data."); setLoading(false); });
  }, [session]);

  const campaigns = useMemo(() => buildStats(rawInquiries, getCutoff(period)), [rawInquiries, period]);

  function updateMeta(ref: string, patch: Partial<CampaignMeta>) {
    setMeta((prev) => {
      const next = { ...prev, [ref]: { label: "", active: true, ...prev[ref], ...patch } };
      saveMeta(next);
      return next;
    });
  }

  function getMeta(ref: string): CampaignMeta {
    return meta[ref] ?? { label: "", active: true };
  }

  function deleteCampaign(ref: string) {
    const next = new Set(deleted).add(ref);
    setDeleted(next);
    saveDeleted(next);
    setConfirmDelete(null);
    if (expanded === ref) setExpanded(null);
  }

  const visible = campaigns.filter((c) => !deleted.has(c.ref));

  const filtered = visible.filter((c) => {
    const active = getMeta(c.ref).active;
    if (filter === "active") return active;
    if (filter === "inactive") return !active;
    return true;
  });

  const activeCampaigns = visible.filter((c) => getMeta(c.ref).active);
  const totalVisits = activeCampaigns.reduce((s, c) => s + c.visits, 0);
  const totalLeads = activeCampaigns.reduce((s, c) => s + c.leads.length, 0);

  const tabStyle = (t: FilterTab): React.CSSProperties => ({
    background: "none",
    border: "none",
    borderBottom: filter === t ? "2px solid #c8905a" : "2px solid transparent",
    color: filter === t ? "#fffbe0" : "rgba(255,251,224,0.3)",
    fontSize: "10px",
    fontWeight: filter === t ? 600 : 400,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: "pointer",
    padding: "14px 20px",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s ease",
  });

  function exportCsv() {
    const rows = [
      ["Ref", "Label", "Visits", "Leads", "CVR", "Last Activity", "Active"],
      ...filtered.map(c => {
        const m = getMeta(c.ref);
        return [c.ref, m.label, c.visits, c.leads.length, cvr(c.visits, c.leads.length), c.lastActivity ? new Date(c.lastActivity).toISOString() : "", m.active ? "yes" : "no"];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "campaigns.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1100px" }}>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>Marketing</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <Megaphone size={20} color="rgba(255,251,224,0.6)" />
          <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Ad Campaigns
          </h1>
        </div>
        <p style={{ color: "rgba(255,251,224,0.3)", fontSize: "13px", fontWeight: 300, margin: 0 }}>
          Track which ads bring visitors and leads. Add <code style={{ color: "#c8905a", fontFamily: "'Courier New', monospace" }}>?ref=campaign-name</code> to every ad URL.
        </p>
      </div>

      {/* localStorage warning */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", border: "1px solid rgba(200,160,48,0.2)", backgroundColor: "rgba(200,160,48,0.05)", padding: "14px 16px", marginBottom: "24px" }}>
        <AlertCircle size={14} color="#c8a030" style={{ flexShrink: 0, marginTop: "2px" }} />
        <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "12px", fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "rgba(255,251,224,0.6)", fontWeight: 600 }}>Labels and active/inactive status</strong> are stored in this browser only. They won't appear on other devices or after clearing browser data. Visit data is always loaded from the server.
        </p>
      </div>

      {/* How-to banner */}
      <div style={{ border: "1px solid rgba(200,144,90,0.15)", backgroundColor: "rgba(200,144,90,0.04)", padding: "20px 24px", marginBottom: "32px" }}>
        <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "10px" }}>How does it work?</div>
        <p style={{ color: "rgba(255,251,224,0.45)", fontSize: "13px", fontWeight: 300, lineHeight: 1.7, margin: "0 0 14px" }}>
          Add <strong style={{ color: "rgba(255,251,224,0.7)", fontWeight: 500 }}>?ref=your-campaign</strong> to every ad link. Every visit and lead are automatically attributed.
        </p>
        {/* Page selector */}
        <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Target page</span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {PAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTargetPage(opt.value)}
                style={{
                  background: targetPage === opt.value ? "rgba(200,144,90,0.12)" : "none",
                  border: `1px solid ${targetPage === opt.value ? "rgba(200,144,90,0.3)" : "rgba(255,251,224,0.08)"}`,
                  color: targetPage === opt.value ? "#c8905a" : "rgba(255,251,224,0.3)",
                  fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
                  fontFamily: "'Inter', sans-serif", cursor: "pointer", padding: "5px 10px", transition: "all 0.15s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "2px" }}>Example links</div>
          {["fb-campaign-jul25", "ig-video-ad", "google-search"].map((ex) => (
            <CopyUrl key={ex} campaign={ex} page={targetPage} />
          ))}
        </div>
      </div>

      {/* Stats overview — only active campaigns */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        <StatCard label="Active campaigns" value={activeCampaigns.length} />
        <StatCard label="Visits" value={totalVisits} sub="active campaigns" />
        <StatCard label="Leads" value={totalLeads} sub="active campaigns" />
        <StatCard label="Avg. conversion" value={cvr(totalVisits, totalLeads)} sub="visit → lead" />
      </div>

      {/* Period filter + export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all", "7d", "30d", "90d"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              background: period === p ? "rgba(255,251,224,0.06)" : "none",
              border: `1px solid ${period === p ? "rgba(255,251,224,0.15)" : "rgba(255,251,224,0.06)"}`,
              color: period === p ? "#fffbe0" : "rgba(255,251,224,0.3)",
              fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif", cursor: "pointer", padding: "6px 12px", transition: "all 0.15s ease",
            }}>
              {p === "all" ? "All time" : p}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <button onClick={exportCsv} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "1px solid rgba(255,251,224,0.08)",
            color: "rgba(255,251,224,0.35)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif", cursor: "pointer", padding: "6px 12px", transition: "all 0.2s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,251,224,0.35)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)"; }}
          >
            <Download size={10} /> Export CSV
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,251,224,0.05)", marginBottom: "16px" }}>
        {(["all", "active", "inactive"] as FilterTab[]).map((t) => (
          <button key={t} style={tabStyle(t)} onClick={() => setFilter(t)}>
            {t === "all" ? `All (${visible.length})` : t === "active" ? `Active (${activeCampaigns.length})` : `Inactive (${visible.length - activeCampaigns.length})`}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {loading && <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>Loading…</div>}

      {!loading && visible.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "64px 0", border: "1px solid rgba(255,251,224,0.04)", color: "rgba(255,251,224,0.2)", fontSize: "13px", lineHeight: 1.8 }}>
          No data yet.<br />
          <span style={{ fontSize: "12px" }}>Launch your first ad with a <code style={{ color: "rgba(255,251,224,0.4)", fontFamily: "'Courier New', monospace" }}>?ref=</code> parameter.</span>
        </div>
      )}

      {/* Campaign list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Column headers */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 90px 90px 90px 150px 110px", gap: "0", padding: "8px 20px", borderBottom: "1px solid rgba(255,251,224,0.05)" }}>
              {["Campaign / Label", "", "Visits", "Leads", "CVR", "Last activity", "Status"].map((h, i) => (
                <span key={i} style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
          )}

          {filtered.map((c) => {
            const isOpen = expanded === c.ref;
            const hasLeads = c.leads.length > 0;
            const m = getMeta(c.ref);
            const isActive = m.active;
            const convRate = cvr(c.visits, c.leads.length);

            return (
              <div key={c.ref} style={{
                border: `1px solid ${isOpen ? "rgba(200,144,90,0.2)" : "rgba(255,251,224,0.05)"}`,
                backgroundColor: isActive
                  ? (isOpen ? "rgba(200,144,90,0.03)" : "rgba(255,251,224,0.015)")
                  : "rgba(255,251,224,0.005)",
                opacity: isActive ? 1 : 0.6,
                transition: "all 0.2s ease",
              }}>
                {/* Main row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr auto 90px 90px 90px 150px 110px",
                  gap: isMobile ? "10px" : "0",
                  padding: isMobile ? "16px" : "16px 20px",
                  alignItems: "center",
                }}>
                  {/* Campaign ref + label */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <Megaphone size={11} color={isActive ? "#c8905a" : "rgba(255,251,224,0.2)"} />
                      <span style={{ color: isActive ? "rgba(255,251,224,0.45)" : "rgba(255,251,224,0.2)", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>
                        {c.ref}
                      </span>
                    </div>
                    <div style={{ paddingLeft: "18px" }}>
                      <LabelEditor value={m.label} onChange={(v) => updateMeta(c.ref, { label: v })} />
                    </div>
                  </div>

                  {/* Expand button (only if leads exist) */}
                  <div>
                    {hasLeads && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : c.ref)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(255,251,224,0.08)",
                          color: "rgba(255,251,224,0.35)",
                          cursor: "pointer",
                          padding: "5px 10px",
                          fontSize: "9px",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontFamily: "'Inter', sans-serif",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          transition: "all 0.15s ease",
                          marginRight: "12px",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.35)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)"; }}
                      >
                        <Users size={10} />
                        {c.leads.length} lead{c.leads.length !== 1 ? "s" : ""}
                        <span style={{ display: "inline-block", transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                      </button>
                    )}
                  </div>

                  {/* Visits */}
                  <div>
                    {isMobile && <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Visits</span>}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <MousePointerClick size={11} color="rgba(255,251,224,0.3)" />
                      <span style={{ color: "rgba(255,251,224,0.6)", fontSize: "14px", fontWeight: 600 }}>{c.visits}</span>
                    </div>
                  </div>

                  {/* Leads */}
                  <div>
                    {isMobile && <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Leads</span>}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Users size={11} color={hasLeads ? "#c8905a" : "rgba(255,251,224,0.3)"} />
                      <span style={{ color: hasLeads ? "#c8905a" : "rgba(255,251,224,0.3)", fontSize: "14px", fontWeight: 600 }}>{c.leads.length}</span>
                    </div>
                  </div>

                  {/* CVR */}
                  <div>
                    {isMobile && <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>CVR</span>}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <TrendingUp size={11} color={hasLeads ? "rgba(120,190,140,0.8)" : "rgba(255,251,224,0.2)"} />
                      <span style={{ color: hasLeads ? "rgba(120,190,140,0.9)" : "rgba(255,251,224,0.2)", fontSize: "13px", fontWeight: 600 }}>{convRate}</span>
                    </div>
                  </div>

                  {/* Last activity */}
                  <div style={{ color: "rgba(255,251,224,0.25)", fontSize: "11px" }}>
                    {isMobile && <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Last activity</span>}
                    {c.lastActivity ? timeAgo(c.lastActivity) : "—"}
                  </div>

                  {/* Active toggle + delete */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                    {isMobile && <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Status</span>}

                    <ActiveToggle active={isActive} onChange={(v) => updateMeta(c.ref, { active: v })} />
                    {confirmDelete === c.ref ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => deleteCampaign(c.ref)}
                          style={{
                            backgroundColor: "rgba(224,112,96,0.15)",
                            border: "1px solid rgba(224,112,96,0.3)",
                            color: "#e07060",
                            fontSize: "9px", fontWeight: 700,
                            letterSpacing: "0.1em", textTransform: "uppercase",
                            fontFamily: "'Inter', sans-serif",
                            cursor: "pointer", padding: "4px 10px",
                          }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{ background: "none", border: "none", color: "rgba(255,251,224,0.25)", cursor: "pointer", padding: "4px", display: "flex" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(c.ref)}
                        title="Remove campaign"
                        style={{
                          background: "none", border: "none",
                          color: "rgba(255,251,224,0.15)",
                          cursor: "pointer", padding: "2px",
                          display: "flex", alignItems: "center", gap: "5px",
                          fontSize: "9px", fontFamily: "'Inter', sans-serif",
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          transition: "color 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#e07060")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.15)")}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded leads */}
                {isOpen && c.leads.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(255,251,224,0.05)", padding: "0 20px 20px" }}>
                    <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", padding: "16px 0 12px" }}>
                      Leads from this campaign ({c.leads.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {c.leads.map((lead) => (
                        <div key={lead.id} style={{ padding: "16px", border: "1px solid rgba(255,251,224,0.04)", backgroundColor: "rgba(255,251,224,0.01)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                            <div>
                              <span style={{ color: "#fffbe0", fontSize: "13px", fontWeight: 500 }}>{lead.name}</span>
                              <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "11px", marginLeft: "10px" }}>{lead.email || lead.phone}</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {lead.package && lead.package !== "__visit__" && (
                                <span style={{ backgroundColor: "rgba(200,144,90,0.1)", border: "1px solid rgba(200,144,90,0.15)", color: "#c8905a", fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "3px 8px" }}>
                                  {lead.package}
                                </span>
                              )}
                              <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px" }}>{formatDate(lead.createdAt)}</span>
                            </div>
                          </div>
                          {lead.message && (
                            <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "12px", fontWeight: 300, lineHeight: 1.6, borderLeft: "2px solid rgba(200,144,90,0.15)", paddingLeft: "12px", whiteSpace: "pre-wrap" }}>
                              {lead.message.replace(/\[ref:[^\]]*\]/g, "").trim()}
                            </div>
                          )}
                          <a
                            href={`mailto:${lead.email}?subject=Re: Your inquiry via PDC`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "12px", color: "#c8905a", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#fffbe0")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#c8905a")}
                          >
                            Reply via email →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && visible.length > 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
          No campaigns match this filter.
        </div>
      )}
    </div>
  );
}
