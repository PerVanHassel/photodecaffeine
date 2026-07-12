import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Mail, Package, Building2, Clock, Phone } from "lucide-react";
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

export function AdminInquiriesPage() {
  const { session } = useAuth();
  const isMobile = useMobile();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    portalFetch("/admin/inquiries", {}, session.access_token)
      .then((data) => {
        // Filter out ad-tracking visit pings — those are shown on the Ads page
        const real = (data.inquiries || []).filter((i: Inquiry) => i.name !== "__ad_visit__");
        setInquiries(real);
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to load inquiries:", err); setError("Failed to load inquiries."); setLoading(false); });
  }, [session]);

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "36px" }}>
        <div>
          <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
            Homepage Contact Form
          </div>
          <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Inquiries
          </h1>
        </div>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px" }}>
          {inquiries.length} message{inquiries.length !== 1 ? "s" : ""}
        </div>
      </div>

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

      {!loading && inquiries.length === 0 && !error && (
        <div style={{
          textAlign: "center", padding: "64px 0",
          border: "1px solid rgba(255,251,224,0.04)",
          color: "rgba(255,251,224,0.2)", fontSize: "13px",
        }}>
          No inquiries yet. They'll appear here when someone submits the contact form.
        </div>
      )}

      {!loading && inquiries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {inquiries.map((inq) => {
            const isOpen = expanded === inq.id;
            return (
              <div
                key={inq.id}
                style={{
                  border: `1px solid ${isOpen ? "rgba(200,144,90,0.2)" : "rgba(255,251,224,0.05)"}`,
                  backgroundColor: isOpen ? "rgba(200,144,90,0.03)" : "rgba(255,251,224,0.015)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : inq.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px",
                    padding: isMobile ? "14px 14px" : "18px 24px",
                    background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "'Inter', sans-serif",
                    width: "100%",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: "34px", height: "34px", flexShrink: 0,
                    backgroundColor: "rgba(200,144,90,0.1)",
                    border: "1px solid rgba(200,144,90,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#c8905a", fontSize: "11px", fontWeight: 600,
                  }}>
                    {inq.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>

                  {/* Name + email */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffbe0", fontSize: isMobile ? "13px" : "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inq.name}
                    </div>
                    <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inq.email}
                    </div>
                  </div>

                  {/* Package badge */}
                  {!isMobile && inq.package && (
                    <div style={{
                      backgroundColor: "rgba(200,144,90,0.1)",
                      border: "1px solid rgba(200,144,90,0.15)",
                      color: "#c8905a",
                      fontSize: "9px", fontWeight: 600,
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "4px 10px", flexShrink: 0,
                    }}>
                      {inq.package === "custom" ? "Custom" : inq.package.charAt(0).toUpperCase() + inq.package.slice(1)}
                    </div>
                  )}

                  {/* Time */}
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

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{
                    padding: isMobile ? "0 14px 20px" : "0 24px 24px",
                    borderTop: "1px solid rgba(255,251,224,0.04)",
                    display: "flex", flexDirection: "column", gap: "20px",
                    paddingTop: "20px",
                  }}>
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
                        color: "rgba(255,251,224,0.65)",
                        fontSize: "13px", fontWeight: 300,
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                        borderLeft: "2px solid rgba(200,144,90,0.2)",
                        paddingLeft: "16px",
                      }}>
                        {inq.message}
                      </div>
                    </div>

                    {/* Date + reply link */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <div style={{ color: "rgba(255,251,224,0.15)", fontSize: "10px" }}>
                        Received {formatDate(inq.createdAt)}
                      </div>
                      <a
                        href={`mailto:${inq.email}?subject=Re: Your PDC Inquiry`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          backgroundColor: "#fffbe0", color: "#1a0c04",
                          padding: "9px 20px",
                          fontSize: "9px", fontWeight: 800,
                          letterSpacing: "0.2em", textTransform: "uppercase",
                          textDecoration: "none",
                          transition: "all 0.2s ease",
                          fontFamily: "'Inter', sans-serif",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#c8905a"; (e.currentTarget as HTMLElement).style.color = "#fffbe0"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#fffbe0"; (e.currentTarget as HTMLElement).style.color = "#1a0c04"; }}
                      >
                        <Mail size={10} /> Reply via Email
                      </a>
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
