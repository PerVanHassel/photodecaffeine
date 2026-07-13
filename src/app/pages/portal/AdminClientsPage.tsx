import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Search, ArrowRight, FolderOpen, Trash2, Download, Mail, X } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

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

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function exportCSV(clients: ClientSummary[]) {
  const header = ["Name", "Email", "Company", "Projects", "Joined", "Last Active"];
  const rows = clients.map((c) => [
    `"${c.name}"`,
    `"${c.email}"`,
    `"${c.company || ""}"`,
    c.projectCount,
    `"${formatDate(c.createdAt)}"`,
    `"${timeAgo(c.lastSignIn)}"`,
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pdc-clients-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminClientsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ClientSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const inviteEmailRef = useRef<HTMLInputElement>(null);

  function loadClients() {
    if (!session) return;
    setLoading(true);
    setError("");
    portalFetch("/admin/clients", {}, session.access_token)
      .then((data) => { setClients(data.clients || []); })
      .catch(() => { setError("Failed to load clients."); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadClients(); }, [session]);

  async function handleDelete() {
    if (!deleteTarget || !session) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await portalFetch(`/admin/client/${deleteTarget.id}`, { method: "DELETE" }, session.access_token);
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete client.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      await portalFetch("/admin/invite-client", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() }),
      }, session.access_token);
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteName("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  });

  function isRecentClient(createdAt: string): boolean {
    const daysDiff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    return daysDiff <= 7;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,251,224,0.03)",
    border: "1px solid rgba(255,251,224,0.08)",
    color: "#fffbe0",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 300,
    padding: "10px 14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  };

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
            All Clients
          </div>
          <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Client Directory
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px", marginRight: "4px" }}>
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => exportCSV(filtered.length > 0 ? filtered : clients)}
            title="Export as CSV"
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: "none", border: "1px solid rgba(255,251,224,0.1)",
              color: "rgba(255,251,224,0.35)", fontSize: "9px", fontWeight: 600,
              letterSpacing: "0.15em", textTransform: "uppercase",
              cursor: "pointer", padding: "7px 11px",
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.35)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; }}
          >
            <Download size={11} />
            {!isMobile && "Export"}
          </button>
          <button
            onClick={() => { setShowInvite(true); setInviteSuccess(""); setInviteError(""); setTimeout(() => inviteEmailRef.current?.focus(), 50); }}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              backgroundColor: "rgba(200,144,90,0.1)", border: "1px solid rgba(200,144,90,0.25)",
              color: "#c8905a", fontSize: "9px", fontWeight: 700,
              letterSpacing: "0.15em", textTransform: "uppercase",
              cursor: "pointer", padding: "7px 12px",
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.1)"; }}
          >
            <Mail size={11} />
            {!isMobile && "Invite Client"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <Search size={13} color="rgba(255,251,224,0.2)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          placeholder="Search by name, email or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            backgroundColor: "rgba(255,251,224,0.03)",
            border: "1px solid rgba(255,251,224,0.07)",
            color: "#fffbe0", fontSize: "12px",
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            padding: "11px 14px 11px 38px", outline: "none",
            boxSizing: "border-box", transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.3)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.07)")}
        />
      </div>

      {/* States */}
      {error && (
        <div style={{ padding: "16px 20px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span>{error}</span>
          <button
            onClick={loadClients}
            style={{
              background: "none", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060",
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              cursor: "pointer", padding: "6px 12px", fontFamily: "'Inter', sans-serif",
              flexShrink: 0,
            }}
          >
            Retry
          </button>
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Loading clients…
        </div>
      )}
      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
          {search ? "No clients match your search." : "No clients yet. They sign up via the Client Portal."}
        </div>
      )}

      {/* Client list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((client) => {
            const isRecent = isRecentClient(client.createdAt);
            return (
              <div
                key={client.id}
                style={{
                  display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px",
                  padding: isMobile ? "14px" : "20px 24px",
                  backgroundColor: isRecent ? "rgba(200,144,90,0.08)" : "rgba(255,251,224,0.015)",
                  border: `1px solid ${isRecent ? "rgba(200,144,90,0.2)" : "rgba(255,251,224,0.05)"}`,
                  transition: "all 0.2s ease",
                }}
              >
                {/* Clickable area */}
                <button
                  onClick={() => navigate(`/admin/client/${client.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px",
                    flex: 1, background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "'Inter', sans-serif", padding: 0, minWidth: 0,
                  }}
                >
                  <div style={{
                    width: isMobile ? "34px" : "40px", height: isMobile ? "34px" : "40px", flexShrink: 0,
                    backgroundColor: isRecent ? "rgba(200,144,90,0.15)" : "rgba(255,251,224,0.05)",
                    border: `1px solid ${isRecent ? "rgba(200,144,90,0.25)" : "rgba(255,251,224,0.07)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isRecent ? "#c8905a" : "rgba(255,251,224,0.4)", fontSize: "11px", fontWeight: 600,
                  }}>
                    {getInitials(client.name)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#fffbe0", fontSize: isMobile ? "13px" : "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</span>
                      {isRecent && (
                        <span style={{
                          backgroundColor: "rgba(200,144,90,0.2)", color: "#c8905a",
                          fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                          padding: "2px 6px", flexShrink: 0,
                        }}>
                          New
                        </span>
                      )}
                    </div>
                    <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isMobile ? client.email : (client.company || client.email)}
                    </div>
                  </div>

                  {!isMobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: "0 0 90px" }}>
                      <FolderOpen size={12} color="rgba(255,251,224,0.2)" />
                      <span style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px" }}>
                        {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {!isMobile && (
                    <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", marginBottom: "2px" }}>Joined</div>
                      <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "11px" }}>{formatDate(client.createdAt)}</div>
                    </div>
                  )}

                  {!isMobile && (
                    <div style={{ flex: "0 0 90px", textAlign: "right" }}>
                      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", marginBottom: "2px" }}>Last active</div>
                      <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "11px" }}>{timeAgo(client.lastSignIn)}</div>
                    </div>
                  )}

                  <ArrowRight size={13} color="rgba(255,251,224,0.2)" style={{ flexShrink: 0 }} />
                </button>

                {/* Delete button — opens modal */}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(client); setDeleteError(""); }}
                  title="Delete client"
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
                    background: "none", border: "1px solid transparent",
                    color: "rgba(255,251,224,0.15)", fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    cursor: "pointer", padding: isMobile ? "6px 8px" : "6px 10px",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#e07060"; e.currentTarget.style.borderColor = "rgba(224,112,96,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.15)"; e.currentTarget.style.borderColor = "transparent"; }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            backgroundColor: "rgba(8,4,1,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{
            backgroundColor: "#0d0804", border: "1px solid rgba(224,112,96,0.2)",
            padding: isMobile ? "24px 20px" : "36px", maxWidth: "420px", width: "100%",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Trash2 size={16} color="#e07060" />
              <span style={{ color: "#e07060", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                Delete Client
              </span>
            </div>
            <p style={{ color: "#fffbe0", fontSize: "15px", fontWeight: 600, margin: "0 0 8px", lineHeight: 1.4 }}>
              Delete {deleteTarget.name}?
            </p>
            <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "13px", fontWeight: 300, margin: "0 0 28px", lineHeight: 1.6 }}>
              This will permanently delete this client account and all associated projects. This action cannot be undone.
            </p>
            {deleteError && (
              <div style={{ padding: "10px 14px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "12px", marginBottom: "20px" }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", flexDirection: isMobile ? "column" : "row" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: "12px", background: "none",
                  border: "1px solid rgba(255,251,224,0.1)",
                  color: "rgba(255,251,224,0.4)", fontSize: "10px", fontWeight: 600,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)"; e.currentTarget.style.color = "#fffbe0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; e.currentTarget.style.color = "rgba(255,251,224,0.4)"; }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "12px",
                  backgroundColor: deleting ? "rgba(224,112,96,0.1)" : "rgba(224,112,96,0.12)",
                  border: "1px solid rgba(224,112,96,0.3)",
                  color: deleting ? "rgba(224,112,96,0.4)" : "#e07060",
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { if (!deleting) { e.currentTarget.style.backgroundColor = "rgba(224,112,96,0.2)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = deleting ? "rgba(224,112,96,0.1)" : "rgba(224,112,96,0.12)"; }}
              >
                {deleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite client modal */}
      {showInvite && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            backgroundColor: "rgba(8,4,1,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowInvite(false); setInviteSuccess(""); } }}
        >
          <div style={{
            backgroundColor: "#0d0804", border: "1px solid rgba(200,144,90,0.2)",
            padding: isMobile ? "24px 20px" : "36px", maxWidth: "420px", width: "100%",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Mail size={16} color="#c8905a" />
                <span style={{ color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  Invite Client
                </span>
              </div>
              <button
                onClick={() => { setShowInvite(false); setInviteSuccess(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,251,224,0.3)", cursor: "pointer", padding: "2px" }}
              >
                <X size={16} />
              </button>
            </div>

            {inviteSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ color: "rgba(120,190,140,0.9)", fontSize: "13px", marginBottom: "20px" }}>{inviteSuccess}</div>
                <button
                  onClick={() => { setInviteSuccess(""); setInviteEmail(""); setInviteName(""); }}
                  style={{
                    background: "none", border: "1px solid rgba(255,251,224,0.15)",
                    color: "rgba(255,251,224,0.5)", fontSize: "10px", fontWeight: 600,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: "pointer", padding: "10px 20px", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Invite Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "7px" }}>
                    Client Name (optional)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Roffa Motion"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                  />
                </div>
                <div>
                  <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "7px" }}>
                    Email Address *
                  </label>
                  <input
                    ref={inviteEmailRef}
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="client@example.com"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                  />
                </div>
                {inviteError && (
                  <div style={{ padding: "10px 14px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "12px" }}>
                    {inviteError}
                  </div>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    style={{
                      flex: 1, padding: "12px", background: "none",
                      border: "1px solid rgba(255,251,224,0.1)",
                      color: "rgba(255,251,224,0.4)", fontSize: "10px", fontWeight: 600,
                      letterSpacing: "0.2em", textTransform: "uppercase",
                      cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    style={{
                      flex: 1, padding: "12px",
                      backgroundColor: inviting ? "rgba(200,144,90,0.05)" : "rgba(200,144,90,0.15)",
                      border: "1px solid rgba(200,144,90,0.3)",
                      color: inviting ? "rgba(200,144,90,0.4)" : "#c8905a",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                      cursor: inviting ? "not-allowed" : "pointer",
                      fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                    }}
                  >
                    {inviting ? "Sending…" : "Send Invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
