import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { useMobile } from "../../hooks/useMobile";
import { ArrowLeft, Save, Plus, Trash2, Check, Send, AlertTriangle } from "lucide-react";

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
  clientId: string;
  createdAt: string;
  deliverables: Deliverable[];
  meeting?: {
    date: string;
    location?: string;
    link?: string;
    notes?: string;
  };
}

interface Message {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: "pdc" | "client";
  content: string;
  createdAt: string;
}

const STATUSES = [
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "delivered", label: "Delivered" },
  { value: "on_hold", label: "On Hold" },
];

function formatTime(str: string) {
  return new Date(str).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
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

export function AdminProjectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit form state
  const [form, setForm] = useState({ title: "", status: "in_progress" as Project["status"], phase: "", description: "", dueDate: "" });
  const [meetingForm, setMeetingForm] = useState({ date: "", location: "", link: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Deliverables
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [newDelName, setNewDelName] = useState("");
  const [newDelCount, setNewDelCount] = useState("1");
  const [addingDel, setAddingDel] = useState(false);
  const [savingDels, setSavingDels] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMobile = useMobile();

  useEffect(() => {
    if (!session || !projectId) return;
    Promise.all([
      portalFetch(`/admin/project/${projectId}`, {}, session.access_token),
      portalFetch(`/admin/project/${projectId}/messages`, {}, session.access_token),
    ])
      .then(([projData, msgData]) => {
        const p = projData.project;
        setProject(p);
        setForm({ title: p.title, status: p.status, phase: p.phase, description: p.description, dueDate: p.dueDate || "" });
        setMeetingForm({
          date: p.meeting?.date || "",
          location: p.meeting?.location || "",
          link: p.meeting?.link || "",
          notes: p.meeting?.notes || "",
        });
        setDeliverables(p.deliverables || []);
        setMessages(msgData.messages || []);
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to load project:", err); setError("Failed to load project."); setLoading(false); });
  }, [session, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSave() {
    if (!session || !projectId) return;
    setSaving(true);
    setSaveSuccess(false);

    // Use null instead of undefined so JSON.stringify preserves the fields
    const meeting = meetingForm.date
      ? {
          date: meetingForm.date,
          location: meetingForm.location || null,
          link: meetingForm.link || null,
          notes: meetingForm.notes || null,
        }
      : null;

    const payload = { ...form, deliverables, meeting };
    console.log("=== SAVING PROJECT ===");
    console.log("Meeting form data:", meetingForm);
    console.log("Meeting object being sent:", meeting);
    console.log("Full payload:", payload);

    try {
      const data = await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }, session.access_token);
      console.log("Save response:", data.project);
      console.log("Meeting in response:", data.project.meeting);
      setProject(data.project);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDeliverable(id: string) {
    const updated = deliverables.map((d) => d.id === id ? { ...d, done: !d.done } : d);
    setDeliverables(updated);
    if (!session || !projectId) return;
    try {
      await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ deliverables: updated }),
      }, session.access_token);
    } catch (err) { console.error("Toggle deliverable error:", err); }
  }

  async function addDeliverable() {
    if (!newDelName.trim()) return;
    const newDel: Deliverable = {
      id: crypto.randomUUID(),
      name: newDelName.trim(),
      count: parseInt(newDelCount) || 1,
      done: false,
    };
    const updated = [...deliverables, newDel];
    setDeliverables(updated);
    setNewDelName("");
    setNewDelCount("1");
    setAddingDel(false);
    if (!session || !projectId) return;
    try {
      await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ deliverables: updated }),
      }, session.access_token);
    } catch (err) { console.error("Add deliverable error:", err); }
  }

  async function removeDeliverable(id: string) {
    const updated = deliverables.filter((d) => d.id !== id);
    setDeliverables(updated);
    if (!session || !projectId) return;
    try {
      await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ deliverables: updated }),
      }, session.access_token);
    } catch (err) { console.error("Remove deliverable error:", err); }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !session || !projectId) return;
    setSendingMsg(true);
    try {
      const data = await portalFetch(`/admin/project/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: reply.trim() }),
      }, session.access_token);
      setMessages((prev) => [...prev, data.message]);
      setReply("");
    } catch (err) { console.error("Send message error:", err); }
    finally { setSendingMsg(false); }
  }

  async function handleDelete() {
    if (!session || !projectId || !project) return;
    setDeleting(true);
    try {
      await portalFetch(`/admin/project/${projectId}`, { method: "DELETE" }, session.access_token);
      navigate(`/admin/client/${project.clientId}`);
    } catch (err) { console.error("Delete error:", err); setDeleting(false); }
  }

  const sectionDivider = (
    <div style={{ height: "1px", backgroundColor: "rgba(255,251,224,0.04)", margin: "40px 0" }} />
  );

  return (
    <div style={{ padding: isMobile ? "20px 16px 60px" : "48px 40px 80px", maxWidth: "860px" }}>
      {/* Back */}
      <button
        onClick={() => project ? navigate(`/admin/client/${project.clientId}`) : navigate("/admin/clients")}
        style={{
          display: "flex", alignItems: "center", gap: "7px",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,251,224,0.3)", fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif", padding: 0, marginBottom: "36px",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#fffbe0")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.3)")}
      >
        <ArrowLeft size={13} /> Back to Client
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Loading project…
        </div>
      )}
      {error && (
        <div style={{ padding: "16px", border: "1px solid rgba(224,112,96,0.2)", color: "#e07060", fontSize: "13px" }}>{error}</div>
      )}

      {!loading && project && (
        <>
          {/* ── Project Details ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
            <div>
              <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
                Project Management
              </div>
              <h1 style={{ color: "#fffbe0", fontSize: "clamp(20px, 2.5vw, 30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0, lineHeight: 1.2 }}>
                {project.title}
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                backgroundColor: saveSuccess ? "rgba(120,190,140,0.15)" : saving ? "rgba(255,251,224,0.05)" : "#fffbe0",
                border: saveSuccess ? "1px solid rgba(120,190,140,0.3)" : "none",
                color: saveSuccess ? "rgba(120,190,140,0.9)" : saving ? "rgba(255,251,224,0.3)" : "#080401",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                cursor: saving ? "not-allowed" : "pointer", padding: "11px 20px",
                fontFamily: "'Inter', sans-serif", transition: "all 0.25s ease", flexShrink: 0,
              }}
            >
              {saveSuccess ? <Check size={12} /> : <Save size={12} />}
              {saveSuccess ? "Saved!" : saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          {/* Form grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Project Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })} style={{ ...inputStyle, appearance: "none" }}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Phase</label>
                <input type="text" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ ...inputStyle, colorScheme: "dark" }} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")} />
            </div>
          </div>

          {sectionDivider}

          {/* ── Meeting ── */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                Aankomende Meeting
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Datum & Tijd</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Locatie (optioneel)</label>
                  <input
                    type="text"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    placeholder="Studio, Online, etc."
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Meeting Link (optioneel)</label>
                <input
                  type="url"
                  value={meetingForm.link}
                  onChange={(e) => setMeetingForm({ ...meetingForm, link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
              </div>
              <div>
                <label style={labelStyle}>Notities (optioneel)</label>
                <textarea
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Agenda, voorbereiding, etc."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
              </div>
              {meetingForm.date && (
                <button
                  onClick={() => setMeetingForm({ date: "", location: "", link: "", notes: "" })}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,251,224,0.08)",
                    color: "rgba(255,100,100,0.6)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    padding: "7px 12px",
                    fontFamily: "'Inter', sans-serif",
                    alignSelf: "flex-start",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255,100,100,1)";
                    e.currentTarget.style.borderColor = "rgba(255,100,100,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,100,100,0.6)";
                    e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)";
                  }}
                >
                  Meeting Verwijderen
                </button>
              )}
            </div>
          </div>

          {sectionDivider}

          {/* ── Deliverables ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                Deliverables ({deliverables.filter((d) => d.done).length}/{deliverables.length})
              </span>
              {!addingDel && (
                <button
                  onClick={() => setAddingDel(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "none", border: "1px solid rgba(255,251,224,0.08)",
                    color: "rgba(255,251,224,0.4)", fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
                    padding: "7px 12px", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.4)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)"; }}
                >
                  <Plus size={11} /> Add
                </button>
              )}
            </div>

            {/* Add deliverable inline */}
            {addingDel && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name</label>
                  <input
                    type="text" value={newDelName} onChange={(e) => setNewDelName(e.target.value)}
                    placeholder="e.g. Hero images (40)"
                    style={{ ...inputStyle, fontSize: "12px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                    onKeyDown={(e) => e.key === "Enter" && addDeliverable()}
                    autoFocus
                  />
                </div>
                <div style={{ width: "80px" }}>
                  <label style={labelStyle}>Count</label>
                  <input
                    type="number" value={newDelCount} onChange={(e) => setNewDelCount(e.target.value)} min="1"
                    style={{ ...inputStyle, fontSize: "12px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                  />
                </div>
                <button onClick={addDeliverable} style={{ backgroundColor: "#fffbe0", border: "none", color: "#080401", fontSize: "10px", fontWeight: 700, padding: "10px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em", marginBottom: "0" }}>Add</button>
                <button onClick={() => { setAddingDel(false); setNewDelName(""); setNewDelCount("1"); }} style={{ backgroundColor: "transparent", border: "1px solid rgba(255,251,224,0.08)", color: "rgba(255,251,224,0.4)", fontSize: "10px", padding: "10px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              </div>
            )}

            {deliverables.length === 0 && !addingDel && (
              <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(255,251,224,0.15)", fontSize: "12px" }}>
                No deliverables yet. Add the first one.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {deliverables.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: d.done ? "rgba(120,190,140,0.04)" : "rgba(255,251,224,0.015)",
                    border: `1px solid ${d.done ? "rgba(120,190,140,0.1)" : "rgba(255,251,224,0.04)"}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <button
                    onClick={() => toggleDeliverable(d.id)}
                    style={{
                      width: "18px", height: "18px", flexShrink: 0,
                      backgroundColor: d.done ? "rgba(120,190,140,0.2)" : "transparent",
                      border: `1px solid ${d.done ? "rgba(120,190,140,0.4)" : "rgba(255,251,224,0.15)"}`,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, transition: "all 0.2s ease",
                    }}
                  >
                    {d.done && <Check size={10} color="rgba(120,190,140,0.9)" />}
                  </button>
                  <span style={{ flex: 1, color: d.done ? "rgba(255,251,224,0.35)" : "#fffbe0", fontSize: "13px", fontWeight: 400, textDecoration: d.done ? "line-through" : "none" }}>
                    {d.name}
                  </span>
                  <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px" }}>×{d.count}</span>
                  <button
                    onClick={() => removeDeliverable(d.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.15)", padding: "2px", display: "flex", transition: "color 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#e07060")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.15)")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {sectionDivider}

          {/* ── Messages ── */}
          <div>
            <div style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "20px" }}>
              Client Messages ({messages.length})
            </div>

            {/* Thread */}
            <div style={{
              maxHeight: "420px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "16px",
              padding: "4px 0",
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,251,224,0.15)", fontSize: "12px" }}>
                  No messages yet. Send the first one as PDC Studio.
                </div>
              )}
              {messages.map((msg) => {
                const isPDC = msg.senderRole === "pdc";
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: isPDC ? "row-reverse" : "row",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "28px", height: "28px", flexShrink: 0,
                      backgroundColor: isPDC ? "rgba(200,144,90,0.15)" : "rgba(255,251,224,0.06)",
                      border: `1px solid ${isPDC ? "rgba(200,144,90,0.25)" : "rgba(255,251,224,0.08)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isPDC ? "#c8905a" : "rgba(255,251,224,0.4)",
                      fontSize: "9px", fontWeight: 700,
                    }}>
                      {isPDC ? "P" : msg.senderName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{
                        backgroundColor: isPDC ? "rgba(200,144,90,0.08)" : "rgba(255,251,224,0.04)",
                        border: `1px solid ${isPDC ? "rgba(200,144,90,0.12)" : "rgba(255,251,224,0.06)"}`,
                        padding: "12px 16px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ color: isPDC ? "#c8905a" : "rgba(255,251,224,0.55)", fontSize: "10px", fontWeight: 600 }}>
                            {isPDC ? "PDC Studio" : msg.senderName}
                          </span>
                          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px" }}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <p style={{ color: "rgba(255,251,224,0.75)", fontSize: "13px", fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply as PDC */}
            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: "#c8905a" }}>Reply as PDC Studio</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a message to the client…"
                  rows={3}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.6, borderColor: "rgba(200,144,90,0.15)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.15)")}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendMessage(e as unknown as React.FormEvent); }}
                />
              </div>
              <button
                type="submit"
                disabled={sendingMsg || !reply.trim()}
                style={{
                  backgroundColor: reply.trim() ? "#c8905a" : "rgba(255,251,224,0.05)",
                  border: "none",
                  color: reply.trim() ? "#080401" : "rgba(255,251,224,0.2)",
                  padding: "12px 18px",
                  cursor: reply.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: "6px",
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  marginBottom: "0",
                }}
              >
                <Send size={12} />
                {sendingMsg ? "Sending…" : "Send"}
              </button>
            </form>
          </div>

          {sectionDivider}

          {/* ── Danger Zone ── */}
          <div>
            <div style={{ color: "rgba(224,112,96,0.4)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
              Danger Zone
            </div>
            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  background: "none", border: "1px solid rgba(224,112,96,0.2)",
                  color: "rgba(224,112,96,0.5)", fontSize: "10px", fontWeight: 600,
                  letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
                  padding: "10px 18px", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(224,112,96,0.5)"; e.currentTarget.style.color = "#e07060"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(224,112,96,0.2)"; e.currentTarget.style.color = "rgba(224,112,96,0.5)"; }}
              >
                <Trash2 size={12} /> Delete Project
              </button>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "16px 20px",
                backgroundColor: "rgba(224,112,96,0.04)",
                border: "1px solid rgba(224,112,96,0.15)",
              }}>
                <AlertTriangle size={14} color="rgba(224,112,96,0.6)" />
                <span style={{ flex: 1, color: "rgba(255,251,224,0.5)", fontSize: "12px" }}>
                  This will permanently delete the project and all messages. Are you sure?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    backgroundColor: "#e07060", border: "none", color: "#fff",
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "9px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  style={{
                    background: "none", border: "1px solid rgba(255,251,224,0.1)", color: "rgba(255,251,224,0.4)",
                    fontSize: "10px", padding: "9px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}