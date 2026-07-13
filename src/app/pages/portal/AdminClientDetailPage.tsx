import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { ArrowLeft, Plus, Clock, CheckCircle, Circle, AlertCircle, X, Trash2, Pencil, Check } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface Deliverable {
  id: string;
  name: string;
  count: number;
  done: boolean;
}

interface Project {
  id: string;
  title: string;
  status: "in_progress" | "in_review" | "delivered" | "on_hold";
  phase: string;
  description: string;
  dueDate: string;
  createdAt: string;
  deliverables?: Deliverable[];
}

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
  lastSignIn: string | null;
}

const STATUS_CONFIG = {
  in_review: { label: "In Review", color: "#c8905a", bg: "rgba(200,144,90,0.08)", icon: Clock },
  in_progress: { label: "In Progress", color: "rgba(255,251,224,0.7)", bg: "rgba(255,251,224,0.05)", icon: Circle },
  delivered: { label: "Delivered", color: "rgba(120,190,140,0.9)", bg: "rgba(120,190,140,0.07)", icon: CheckCircle },
  on_hold: { label: "On Hold", color: "rgba(255,251,224,0.3)", bg: "rgba(255,251,224,0.03)", icon: AlertCircle },
};

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const BLANK_PROJECT = { title: "", status: "in_progress" as const, phase: "Pre-Production", description: "", dueDate: "" };

export function AdminClientDetailPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New project form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_PROJECT);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete client
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Edit profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", company: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!clientId || !session?.access_token) return;

    async function loadClient() {
      try {
        const data = await portalFetch(`/admin/client/${clientId}`, {}, session!.access_token);
        setClient(data.client);
        setProjects(data.projects || []);
        setLoading(false);
      } catch (err) {
        setError(`Failed to load client: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }

    loadClient();
  }, [session, clientId]);

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !clientId || !client) return;
    setEditSaving(true);
    setEditError("");
    try {
      const data = await portalFetch(`/admin/client/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editForm.name.trim(), company: editForm.company.trim() }),
      }, session.access_token);
      setClient(data.client ?? { ...client, ...editForm });
      setEditingProfile(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !clientId) return;
    setFormError("");
    setFormLoading(true);
    try {
      const data = await portalFetch("/admin/project", {
        method: "POST",
        body: JSON.stringify({ clientId, ...form }),
      }, session.access_token);
      setProjects((prev) => [...prev, data.project]);
      setForm(BLANK_PROJECT);
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteClient() {
    if (!session || !clientId) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await portalFetch(`/admin/client/${clientId}`, { method: "DELETE" }, session.access_token);
      navigate("/admin/clients");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete client");
      setDeleting(false);
    }
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

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,251,224,0.25)",
    fontSize: "8px",
    fontWeight: 600,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: "7px",
  };

  return (
    <div style={{ padding: isMobile ? "20px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      {/* Back */}
      <button
        onClick={() => navigate("/admin/clients")}
        style={{
          display: "flex", alignItems: "center", gap: "7px",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,251,224,0.3)", fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif", padding: 0, marginBottom: "28px",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#fffbe0")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.3)")}
      >
        <ArrowLeft size={13} /> All Clients
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Loading…
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {!loading && client && (
        <>
          {/* Client header */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "16px",
            padding: isMobile ? "20px 16px" : "28px 28px",
            backgroundColor: "rgba(255,251,224,0.02)",
            border: "1px solid rgba(255,251,224,0.05)",
            marginBottom: "32px",
            flexWrap: isMobile ? "wrap" : "nowrap",
          }}>
            <div style={{
              width: "48px", height: "48px", flexShrink: 0,
              backgroundColor: "rgba(200,144,90,0.1)",
              border: "1px solid rgba(200,144,90,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#c8905a", fontSize: "16px", fontWeight: 700,
            }}>
              {getInitials(client.name)}
            </div>

            {editingProfile ? (
              <form onSubmit={handleEditProfile} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  placeholder="Client name"
                  style={{ ...inputStyle, fontSize: "18px", fontWeight: 700 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  placeholder="Company (optional)"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
                <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "12px" }}>{client.email}</div>
                {editError && <p style={{ color: "#e07060", fontSize: "12px", margin: 0 }}>{editError}</p>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="submit" disabled={editSaving} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    background: "none", border: "1px solid rgba(120,190,140,0.4)",
                    color: "rgba(120,190,140,0.9)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: editSaving ? "not-allowed" : "pointer", padding: "6px 12px",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    <Check size={11} /> {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingProfile(false)} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    background: "none", border: "1px solid rgba(255,251,224,0.1)",
                    color: "rgba(255,251,224,0.4)", fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: "pointer", padding: "6px 12px",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    <X size={11} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ color: "#fffbe0", fontSize: isMobile ? "20px" : "24px", fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
                  {client.name}
                </h1>
                {client.company && (
                  <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "13px", marginBottom: "6px" }}>{client.company}</div>
                )}
                <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "12px" }}>{client.email}</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: "12px", flexShrink: 0 }}>
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>Client since</div>
                <div style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px" }}>{formatDate(client.createdAt)}</div>
              </div>
              {!editingProfile && (
                <button
                  onClick={() => { setEditForm({ name: client.name, company: client.company || "" }); setEditError(""); setEditingProfile(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "none", border: "1px solid rgba(255,251,224,0.1)",
                    color: "rgba(255,251,224,0.3)", fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: "pointer", padding: "7px 12px",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.3)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; }}
                >
                  <Pencil size={10} /> Edit
                </button>
              )}
              <button
                onClick={() => { setShowDeleteConfirm(true); setDeleteError(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "none", border: "1px solid rgba(224,112,96,0.2)",
                  color: "rgba(224,112,96,0.5)", fontSize: "9px", fontWeight: 600,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer", padding: "7px 12px",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(224,112,96,0.5)"; e.currentTarget.style.color = "#e07060"; e.currentTarget.style.backgroundColor = "rgba(224,112,96,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(224,112,96,0.2)"; e.currentTarget.style.color = "rgba(224,112,96,0.5)"; e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Trash2 size={10} /> Delete Client
              </button>
            </div>
          </div>

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 1000,
              backgroundColor: "rgba(8,4,1,0.85)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px",
            }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
            >
              <div style={{
                backgroundColor: "#0d0804",
                border: "1px solid rgba(224,112,96,0.2)",
                padding: isMobile ? "24px 20px" : "36px",
                maxWidth: "420px",
                width: "100%",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <Trash2 size={16} color="#e07060" />
                  <span style={{ color: "#e07060", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                    Delete Client
                  </span>
                </div>
                <p style={{ color: "#fffbe0", fontSize: "15px", fontWeight: 600, margin: "0 0 8px", lineHeight: 1.4 }}>
                  Delete {client.name}?
                </p>
                <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "13px", fontWeight: 300, margin: "0 0 28px", lineHeight: 1.6 }}>
                  This will permanently delete this client account and all {projects.length} associated project{projects.length !== 1 ? "s" : ""}. This action cannot be undone.
                </p>
                {deleteError && (
                  <div style={{ padding: "10px 14px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "12px", marginBottom: "20px" }}>
                    {deleteError}
                  </div>
                )}
                <div style={{ display: "flex", gap: "10px", flexDirection: isMobile ? "column" : "row" }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
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
                    onClick={handleDeleteClient}
                    disabled={deleting}
                    style={{
                      flex: 1, padding: "12px",
                      backgroundColor: deleting ? "rgba(224,112,96,0.1)" : "rgba(224,112,96,0.12)",
                      border: "1px solid rgba(224,112,96,0.3)",
                      color: deleting ? "rgba(224,112,96,0.4)" : "#e07060",
                      fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.2em", textTransform: "uppercase",
                      cursor: deleting ? "not-allowed" : "pointer",
                      fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { if (!deleting) { e.currentTarget.style.backgroundColor = "rgba(224,112,96,0.2)"; e.currentTarget.style.borderColor = "rgba(224,112,96,0.5)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = deleting ? "rgba(224,112,96,0.1)" : "rgba(224,112,96,0.12)"; e.currentTarget.style.borderColor = "rgba(224,112,96,0.3)"; }}
                  >
                    {deleting ? "Deleting…" : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Projects section */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
              Projects ({projects.length})
            </span>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                backgroundColor: showForm ? "transparent" : "rgba(255,251,224,0.06)",
                border: "1px solid rgba(255,251,224,0.1)",
                color: "#fffbe0", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em",
                textTransform: "uppercase", cursor: "pointer", padding: "8px 14px",
                fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = showForm ? "transparent" : "rgba(255,251,224,0.06)")}
            >
              {showForm ? <X size={11} /> : <Plus size={11} />}
              {showForm ? "Cancel" : "New Project"}
            </button>
          </div>

          {/* New project form */}
          {showForm && (
            <form onSubmit={handleCreateProject} style={{
              padding: isMobile ? "20px 16px" : "24px",
              backgroundColor: "rgba(200,144,90,0.03)",
              border: "1px solid rgba(200,144,90,0.1)",
              marginBottom: "16px",
              display: "flex", flexDirection: "column", gap: "16px",
            }}>
              <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                New Project
              </div>
              <div>
                <label style={labelStyle}>Project Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Brand Campaign — Summer Drop" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} style={{ ...inputStyle, appearance: "none" }}>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="delivered">Delivered</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Phase</label>
                  <input type="text" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} placeholder="Pre-Production" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
                </div>
                <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}>
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ ...inputStyle, colorScheme: "dark" }} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief project overview…" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
              </div>
              {formError && <p style={{ color: "#e07060", fontSize: "12px", margin: 0 }}>{formError}</p>}
              <div>
                <button type="submit" disabled={formLoading} style={{
                  backgroundColor: formLoading ? "rgba(255,251,224,0.05)" : "#fffbe0",
                  color: formLoading ? "rgba(255,251,224,0.3)" : "#080401",
                  border: "none", padding: "12px 24px", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.2em", textTransform: "uppercase", cursor: formLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  width: isMobile ? "100%" : "auto",
                }}>
                  {formLoading ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          )}

          {/* Projects grid */}
          {projects.length === 0 && !showForm && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
              No projects yet. Create the first one.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {projects.map((p) => {
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.in_progress;
              const StatusIcon = cfg.icon;
              const done = p.deliverables?.filter((d) => d.done).length ?? 0;
              const total = p.deliverables?.length ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/project/${p.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? "12px" : "20px",
                    padding: isMobile ? "16px" : "20px 24px",
                    backgroundColor: "rgba(255,251,224,0.015)",
                    border: "1px solid rgba(255,251,224,0.05)",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.2s ease", width: "100%",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.03)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.015)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.05)"; }}
                >
                  {/* Status badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    backgroundColor: cfg.bg, border: `1px solid ${cfg.color}22`,
                    padding: "4px 9px", color: cfg.color, fontSize: "8px", fontWeight: 600,
                    letterSpacing: "0.2em", textTransform: "uppercase", flexShrink: 0,
                  }}>
                    <StatusIcon size={9} /> {cfg.label}
                  </div>
                  {/* Title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffbe0", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", marginTop: "2px" }}>{p.phase}</div>
                  </div>
                  {/* Progress */}
                  {total > 0 && !isMobile && (
                    <div style={{ flex: "0 0 100px", textAlign: "right" }}>
                      <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "10px", marginBottom: "4px" }}>{done}/{total} done</div>
                      <div style={{ height: "2px", backgroundColor: "rgba(255,251,224,0.06)" }}>
                        <div style={{ height: "100%", width: `${total > 0 ? (done / total) * 100 : 0}%`, backgroundColor: "#c8905a" }} />
                      </div>
                    </div>
                  )}
                  {/* Due */}
                  {p.dueDate && !isMobile && (
                    <div style={{ flex: "0 0 90px", textAlign: "right", color: "rgba(255,251,224,0.3)", fontSize: "11px" }}>
                      Due {formatDate(p.dueDate)}
                    </div>
                  )}
                  <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", flexShrink: 0 }}>
                    Manage →
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}