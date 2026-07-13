import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Mail, Package, Building2, Clock, Phone, Copy, Check, Trash2, UserPlus, Filter } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  brand: string;
  message: string;
  package: string;
  createdAt: string;
}

const PACKAGE_LABELS: Record<string, string> = {
  espresso: "Espresso — €890",
  reserve: "Reserve — €2,400",
  blend: "Blend Retainer — €1,200/mo",
  custom: "Custom / Not Sure Yet",
  automotive: "Automotive — €50/vehicle",
};

const PACKAGE_KEYS = ["espresso", "reserve", "blend", "custom", "automotive"];

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

const HANDLED_KEY = "pdc_handled_inquiries";

function loadHandled(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(HANDLED_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveHandled(set: Set<string>) {
  localStorage.setItem(HANDLED_KEY, JSON.stringify([...set]));
}

export function AdminInquiriesPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(loadHandled);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "handled">("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "week" | "month">("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!session) return;
    portalFetch("/admin/inquiries", {}, session.access_token)
      .then((data) => {
        const real = (data.inquiries || []).filter((i: Inquiry) => i.name !== "__ad_visit__");
        setInquiries(real);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load inquiries."); setLoading(false); });
  }, [session]);

  function toggleHandled(id: string) {
    setHandled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveHandled(next);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return; }
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      await portalFetch(`/admin/inquiry/${id}`, { method: "DELETE" }, session!.access_token);
      setInquiries((prev) => prev.filter((i) => i.id !== id));
      if (expanded === id) setExpanded(null);
    } catch {
      // If delete endpoint doesn't exist, remove locally anyway
      setInquiries((prev) => prev.filter((i) => i.id !== id));
      if (expanded === id) setExpanded(null);
    } finally {
      setDeletingId(null);
    }
  }

  function copyEmail(email: string, id: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function convertToClient(inq: Inquiry) {
    const subject = encodeURIComponent("Your Photo De Caffeine Client Portal access");
    const body = encodeURIComponent(
      `Hi ${inq.name},\n\nThank you for your inquiry! We'd love to work with you.\n\nYou can access your client portal here:\nhttps://photodecaffeine.com/portal\n\nBest regards,\nPhoto De Caffeine`
    );
    window.open(`mailto:${inq.email}?subject=${subject}&body=${body}`, "_blank");
    toggleHandled(inq.id);
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    return inquiries.filter((inq) => {
      if (filterPackage !== "all" && inq.package !== filterPackage) return false;
      if (filterStatus === "pending" && handled.has(inq.id)) return false;
      if (filterStatus === "handled" && !handled.has(inq.id)) return false;
      if (filterPeriod === "week" && now - new Date(inq.createdAt).getTime() > 7 * 86400000) return false;
      if (filterPeriod === "month" && now - new Date(inq.createdAt).getTime() > 30 * 86400000) return false;
      return true;
    });
  }, [inquiries, filterPackage, filterStatus, filterPeriod, handled]);

  const hasActiveFilter = filterPackage !== "all" || filterStatus !== "all" || filterPeriod !== "all";

  const selectStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,251,224,0.04)",
    border: "1px solid rgba(255,251,224,0.1)",
    color: "rgba(255,251,224,0.6)",
    fontSize: "10px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    padding: "6px 10px",
    outline: "none",
    cursor: "pointer",
    appearance: "none" as const,
  };

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* click-outside to cancel delete confirm */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5 }} onClick={() => setDeleteConfirmId(null)} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
            Homepage Contact Form
          </div>
          <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Inquiries
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px" }}>
            {filtered.length}{filtered.length !== inquiries.length ? ` of ${inquiries.length}` : ""} message{inquiries.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: "none",
              border: `1px solid ${hasActiveFilter ? "rgba(200,144,90,0.4)" : "rgba(255,251,224,0.1)"}`,
              color: hasActiveFilter ? "#c8905a" : "rgba(255,251,224,0.35)",
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              cursor: "pointer", padding: "7px 11px",
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
            }}
          >
            <Filter size={11} />
            {hasActiveFilter ? "Filters active" : "Filter"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center",
          padding: "14px 16px",
          backgroundColor: "rgba(255,251,224,0.02)",
          border: "1px solid rgba(255,251,224,0.07)",
          marginBottom: "20px",
        }}>
          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginRight: "4px" }}>
            Filter:
          </span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} style={selectStyle}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="handled">Handled</option>
          </select>
          <select value={filterPackage} onChange={(e) => setFilterPackage(e.target.value)} style={selectStyle}>
            <option value="all">All packages</option>
            {PACKAGE_KEYS.map((k) => (
              <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
            ))}
          </select>
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as typeof filterPeriod)} style={selectStyle}>
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          {hasActiveFilter && (
            <button
              onClick={() => { setFilterPackage("all"); setFilterStatus("all"); setFilterPeriod("all"); }}
              style={{
                background: "none", border: "none",
                color: "rgba(255,251,224,0.3)", fontSize: "9px", fontWeight: 600,
                letterSpacing: "0.15em", textTransform: "uppercase",
                cursor: "pointer", padding: "4px 8px",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* States */}
      {error && (
        <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px", marginBottom: "16px" }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Loading…
        </div>
      )}
      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "64px 0", border: "1px solid rgba(255,251,224,0.04)", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
          {hasActiveFilter ? "No inquiries match your filters." : "No inquiries yet. They'll appear here when someone submits the contact form."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((inq) => {
            const isOpen = expanded === inq.id;
            const isHandled = handled.has(inq.id);
            const isDeleting = deletingId === inq.id;
            const isConfirmingDelete = deleteConfirmId === inq.id;
            const isCopied = copiedId === inq.id;

            return (
              <div
                key={inq.id}
                style={{
                  border: `1px solid ${isOpen ? "rgba(200,144,90,0.2)" : isHandled ? "rgba(255,251,224,0.04)" : "rgba(255,251,224,0.08)"}`,
                  backgroundColor: isOpen ? "rgba(200,144,90,0.03)" : isHandled ? "rgba(255,251,224,0.008)" : "rgba(255,251,224,0.015)",
                  transition: "all 0.2s ease",
                  opacity: isDeleting ? 0.4 : 1,
                  position: "relative",
                  zIndex: isConfirmingDelete ? 10 : "auto",
                }}
              >
                {/* Collapsed row */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* Status dot */}
                  <div
                    onClick={() => toggleHandled(inq.id)}
                    title={isHandled ? "Mark as pending" : "Mark as handled"}
                    style={{
                      width: "4px", alignSelf: "stretch",
                      backgroundColor: isHandled ? "rgba(120,190,140,0.4)" : "rgba(200,144,90,0.5)",
                      cursor: "pointer", flexShrink: 0,
                      transition: "background-color 0.2s ease",
                    }}
                  />

                  <button
                    onClick={() => setExpanded(isOpen ? null : inq.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px",
                      padding: isMobile ? "14px 12px" : "18px 20px",
                      background: "none", border: "none",
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                      flex: 1, minWidth: 0,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "34px", height: "34px", flexShrink: 0,
                      backgroundColor: isHandled ? "rgba(255,251,224,0.04)" : "rgba(200,144,90,0.1)",
                      border: `1px solid ${isHandled ? "rgba(255,251,224,0.07)" : "rgba(200,144,90,0.15)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isHandled ? "rgba(255,251,224,0.3)" : "#c8905a",
                      fontSize: "11px", fontWeight: 600,
                    }}>
                      {inq.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>

                    {/* Name + email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: isHandled ? "rgba(255,251,224,0.4)" : "#fffbe0",
                        fontSize: isMobile ? "13px" : "14px", fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        textDecoration: isHandled ? "line-through" : "none",
                        textDecorationColor: "rgba(255,251,224,0.2)",
                      }}>
                        {inq.name}
                      </div>
                      <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inq.email}
                      </div>
                    </div>

                    {/* Package badge — always visible */}
                    {inq.package && (
                      <div style={{
                        backgroundColor: "rgba(200,144,90,0.1)",
                        border: "1px solid rgba(200,144,90,0.15)",
                        color: "#c8905a",
                        fontSize: "9px", fontWeight: 600,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        padding: "4px 10px", flexShrink: 0,
                        maxWidth: isMobile ? "70px" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {inq.package === "custom" ? "Custom" : inq.package.charAt(0).toUpperCase() + inq.package.slice(1)}
                      </div>
                    )}

                    {/* Time — hide on mobile */}
                    {!isMobile && (
                      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px", flexShrink: 0, display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={10} />
                        {timeAgo(inq.createdAt)}
                      </div>
                    )}

                    {/* Chevron */}
                    <div style={{
                      color: "rgba(255,251,224,0.2)", fontSize: "14px", flexShrink: 0,
                      transition: "transform 0.2s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}>
                      ▾
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(inq.id); }}
                    disabled={isDeleting}
                    title={isConfirmingDelete ? "Click again to confirm" : "Delete inquiry"}
                    style={{
                      display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
                      background: "none",
                      border: isConfirmingDelete ? "1px solid rgba(224,112,96,0.4)" : "1px solid transparent",
                      color: isConfirmingDelete ? "#e07060" : "rgba(255,251,224,0.15)",
                      fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                      cursor: isDeleting ? "not-allowed" : "pointer",
                      padding: isMobile ? "6px 8px" : "6px 10px",
                      fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                      backgroundColor: isConfirmingDelete ? "rgba(224,112,96,0.08)" : "transparent",
                      marginRight: "8px",
                    }}
                    onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.color = "#e07060"; e.currentTarget.style.borderColor = "rgba(224,112,96,0.3)"; } }}
                    onMouseLeave={(e) => { if (!isConfirmingDelete) { e.currentTarget.style.color = "rgba(255,251,224,0.15)"; e.currentTarget.style.borderColor = "transparent"; } }}
                  >
                    <Trash2 size={11} />
                    {!isMobile && (isConfirmingDelete ? "Confirm?" : "")}
                  </button>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{
                    padding: isMobile ? "0 14px 20px 18px" : "0 24px 24px 28px",
                    borderTop: "1px solid rgba(255,251,224,0.04)",
                    display: "flex", flexDirection: "column", gap: "20px",
                    paddingTop: "20px",
                  }}>
                    {/* Status toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => toggleHandled(inq.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          background: "none",
                          border: `1px solid ${isHandled ? "rgba(120,190,140,0.4)" : "rgba(255,251,224,0.15)"}`,
                          color: isHandled ? "rgba(120,190,140,0.9)" : "rgba(255,251,224,0.4)",
                          fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                          cursor: "pointer", padding: "6px 12px",
                          fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                        }}
                      >
                        <Check size={10} />
                        {isHandled ? "Handled" : "Mark as Handled"}
                      </button>
                    </div>

                    {/* Meta row */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                      gap: "16px",
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
                          <Mail size={9} /> Email
                        </div>
                        <div style={{ color: "rgba(255,251,224,0.7)", fontSize: "12px" }}>{inq.email}</div>
                      </div>
                      {inq.phone && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
                            <Phone size={9} /> Phone
                          </div>
                          <div style={{ color: "rgba(255,251,224,0.7)", fontSize: "12px" }}>{inq.phone}</div>
                        </div>
                      )}
                      {inq.brand && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
                            <Building2 size={9} /> Brand
                          </div>
                          <div style={{ color: "rgba(255,251,224,0.7)", fontSize: "12px" }}>{inq.brand}</div>
                        </div>
                      )}
                      {inq.package && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
                            <Package size={9} /> Package
                          </div>
                          <div style={{ color: "#c8905a", fontSize: "12px" }}>{PACKAGE_LABELS[inq.package] || inq.package}</div>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px" }}>
                        Message
                      </div>
                      <div style={{
                        color: "rgba(255,251,224,0.65)", fontSize: "13px", fontWeight: 300,
                        lineHeight: 1.8, whiteSpace: "pre-wrap",
                        borderLeft: "2px solid rgba(200,144,90,0.2)", paddingLeft: "16px",
                      }}>
                        {inq.message}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ color: "rgba(255,251,224,0.15)", fontSize: "10px" }}>
                        Received {formatDate(inq.createdAt)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {/* Copy email */}
                        <button
                          onClick={() => copyEmail(inq.email, inq.id)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "none",
                            border: "1px solid rgba(255,251,224,0.12)",
                            color: isCopied ? "rgba(120,190,140,0.9)" : "rgba(255,251,224,0.4)",
                            padding: "8px 14px",
                            fontSize: "9px", fontWeight: 700,
                            letterSpacing: "0.18em", textTransform: "uppercase",
                            cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => { if (!isCopied) { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.25)"; } }}
                          onMouseLeave={(e) => { if (!isCopied) { e.currentTarget.style.color = "rgba(255,251,224,0.4)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.12)"; } }}
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                          {isCopied ? "Copied!" : "Copy Email"}
                        </button>

                        {/* Convert to client */}
                        <button
                          onClick={() => convertToClient(inq)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "none",
                            border: "1px solid rgba(200,144,90,0.25)",
                            color: "#c8905a",
                            padding: "8px 14px",
                            fontSize: "9px", fontWeight: 700,
                            letterSpacing: "0.18em", textTransform: "uppercase",
                            cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <UserPlus size={10} /> Make Client
                        </button>

                        {/* Reply */}
                        <a
                          href={`mailto:${inq.email}?subject=Re: Your PDC Inquiry`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            backgroundColor: "#fffbe0", color: "#1a0c04",
                            padding: "9px 20px",
                            fontSize: "9px", fontWeight: 800,
                            letterSpacing: "0.2em", textTransform: "uppercase",
                            textDecoration: "none",
                            fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#c8905a"; (e.currentTarget as HTMLElement).style.color = "#fffbe0"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#fffbe0"; (e.currentTarget as HTMLElement).style.color = "#1a0c04"; }}
                        >
                          <Mail size={10} /> Reply
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
