import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Search, ArrowRight, FolderOpen, Trash2, UserCog } from "lucide-react";
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

interface Worker {
  id: string;
  email: string;
  name: string;
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

export function AdminClientsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    portalFetch("/admin/clients", {}, session.access_token)
      .then((data) => { setClients(data.clients || []); setLoading(false); })
      .catch((err) => { console.error("Failed to load clients:", err); setError("Failed to load clients."); setLoading(false); });

    portalFetch("/admin/workers", {}, session.access_token)
      .then((data) => { setWorkers(data.workers || []); setLoadingWorkers(false); })
      .catch((err) => { console.error("Failed to load workers:", err); setLoadingWorkers(false); });
  }, [session]);

  async function handleDelete(clientId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDeleteId !== clientId) {
      setConfirmDeleteId(clientId);
      return;
    }
    setDeletingId(clientId);
    setConfirmDeleteId(null);
    try {
      await portalFetch(`/admin/client/${clientId}`, { method: "DELETE" }, session!.access_token);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (err) {
      console.error("Delete client error:", err);
      setError("Failed to delete client.");
    } finally {
      setDeletingId(null);
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
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / 86400000);
    return daysDiff <= 7;
  }

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
            All Clients
          </div>
          <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Client Directory
          </h1>
        </div>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px" }}>
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Workers Section */}
      <div style={{ marginBottom: isMobile ? "32px" : "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <UserCog size={16} color="#c8905a" />
          <h2 style={{ color: "#fffbe0", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
            Team Members
          </h2>
          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px" }}>
            ({workers.length})
          </span>
        </div>

        {loadingWorkers ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Loading team...
          </div>
        ) : workers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
            No team members found.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
            {workers.map((worker) => (
              <div
                key={worker.id}
                style={{
                  backgroundColor: "rgba(200,144,90,0.05)",
                  border: "1px solid rgba(200,144,90,0.15)",
                  padding: isMobile ? "14px" : "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div style={{
                  width: "38px", height: "38px", flexShrink: 0,
                  backgroundColor: "rgba(200,144,90,0.15)",
                  border: "1px solid rgba(200,144,90,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#c8905a", fontSize: "11px", fontWeight: 700,
                }}>
                  {getInitials(worker.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fffbe0", fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {worker.name}
                  </div>
                  <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {worker.email}
                  </div>
                  {!isMobile && (
                    <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", marginTop: "4px" }}>
                      Last active: {timeAgo(worker.lastSignIn)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
            color: "#fffbe0",
            fontSize: "12px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            padding: "11px 14px 11px 38px",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.3)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.07)")}
        />
      </div>

      {/* click-outside to cancel confirm */}
      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5 }} onClick={() => setConfirmDeleteId(null)} />
      )}

      {/* States */}
      {error && (
        <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px", marginBottom: "16px" }}>
          {error}
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
            const isConfirming = confirmDeleteId === client.id;
            const isDeleting = deletingId === client.id;
            const isRecent = isRecentClient(client.createdAt);
            return (
              <div
                key={client.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? "10px" : "16px",
                  padding: isMobile ? "14px 14px" : "20px 24px",
                  backgroundColor: isRecent
                    ? "rgba(200,144,90,0.08)"
                    : "rgba(255,251,224,0.015)",
                  border: `1px solid ${
                    isConfirming
                      ? "rgba(224,112,96,0.2)"
                      : isRecent
                      ? "rgba(200,144,90,0.2)"
                      : "rgba(255,251,224,0.05)"
                  }`,
                  transition: "all 0.2s ease",
                  opacity: isDeleting ? 0.4 : 1,
                  position: "relative",
                  zIndex: isConfirming ? 10 : "auto",
                }}
              >
                {/* Clickable area */}
                <button
                  onClick={() => navigate(`/admin/client/${client.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px",
                    flex: 1, background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "'Inter', sans-serif", padding: 0,
                    minWidth: 0,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: isMobile ? "34px" : "40px", height: isMobile ? "34px" : "40px", flexShrink: 0,
                    backgroundColor: isRecent ? "rgba(200,144,90,0.15)" : "rgba(255,251,224,0.05)",
                    border: `1px solid ${isRecent ? "rgba(200,144,90,0.25)" : "rgba(255,251,224,0.07)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isRecent ? "#c8905a" : "rgba(255,251,224,0.4)", fontSize: "11px", fontWeight: 600,
                  }}>
                    {getInitials(client.name)}
                  </div>

                  {/* Name + email/company */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#fffbe0", fontSize: isMobile ? "13px" : "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</span>
                      {isRecent && (
                        <span
                          style={{
                            backgroundColor: "rgba(200,144,90,0.2)",
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
                    <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isMobile ? client.email : (client.company || client.email)}
                    </div>
                  </div>

                  {/* Projects badge — hide on mobile */}
                  {!isMobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: "0 0 90px" }}>
                      <FolderOpen size={12} color="rgba(255,251,224,0.2)" />
                      <span style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px" }}>
                        {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Joined — hide on mobile */}
                  {!isMobile && (
                    <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", marginBottom: "2px" }}>Joined</div>
                      <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "11px" }}>{formatDate(client.createdAt)}</div>
                    </div>
                  )}

                  {/* Last active — hide on mobile */}
                  {!isMobile && (
                    <div style={{ flex: "0 0 90px", textAlign: "right" }}>
                      <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", marginBottom: "2px" }}>Last active</div>
                      <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "11px" }}>{timeAgo(client.lastSignIn)}</div>
                    </div>
                  )}

                  <ArrowRight size={13} color="rgba(255,251,224,0.2)" style={{ flexShrink: 0 }} />
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(client.id, e)}
                  disabled={isDeleting}
                  title={isConfirming ? "Click again to confirm" : "Delete client"}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
                    background: "none",
                    border: isConfirming ? "1px solid rgba(224,112,96,0.4)" : "1px solid transparent",
                    color: isConfirming ? "#e07060" : "rgba(255,251,224,0.15)",
                    fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    padding: isMobile ? "6px 8px" : "6px 10px",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                    backgroundColor: isConfirming ? "rgba(224,112,96,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.color = "#e07060"; e.currentTarget.style.borderColor = "rgba(224,112,96,0.3)"; } }}
                  onMouseLeave={(e) => { if (!isConfirming) { e.currentTarget.style.color = "rgba(255,251,224,0.15)"; e.currentTarget.style.borderColor = "transparent"; } }}
                >
                  <Trash2 size={11} />
                  {!isMobile && (isDeleting ? "…" : isConfirming ? "Confirm?" : "")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}