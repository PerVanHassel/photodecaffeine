import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { useMobile } from "../../hooks/useMobile";
import { ArrowLeft, Save, Plus, Trash2, Check, Send, AlertTriangle, Upload, Images, X, Bell, ChevronUp, ChevronDown, Star, ExternalLink, MessageSquare } from "lucide-react";
import { projectId as supabaseProjectId } from "/utils/supabase/info";
import { ClientPicker, type PickableClient } from "../../components/portal/ClientPicker";

const BUCKET = "portfolio-images-0951c59e";

interface Deliverable {
  id: string;
  name: string;
  count: number;
  done: boolean;
}

interface GallerySettings {
  title?: string;
  subtitle?: string;
  coverUrl?: string;
  accentColor?: string;
}

interface Project {
  id: string;
  title: string;
  status: "in_progress" | "in_review" | "delivered" | "on_hold";
  phase: string;
  description: string;
  dueDate: string;
  clientId: string;
  clientIds?: string[];
  type?: "photo" | "web";
  demoUrl?: string;
  demoNotes?: string;
  createdAt: string;
  deliverables: Deliverable[];
  meeting?: {
    date: string;
    location?: string;
    link?: string;
    notes?: string;
  };
  galleryUrls?: string[];
  gallerySettings?: GallerySettings;
}

const ACCENT_PRESETS = [
  { name: "Gold", value: "#c8905a" },
  { name: "Rose", value: "#c07a7a" },
  { name: "Sage", value: "#8a9a7a" },
  { name: "Teal", value: "#5a8a8a" },
  { name: "Terracotta", value: "#b8683f" },
  { name: "Slate", value: "#7a95b0" },
];

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
  backgroundColor: "rgba(var(--admin-fg-rgb),calc(0.03 * var(--admin-fg-boost)))",
  border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))",
  color: "var(--admin-fg-solid)",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 300,
  padding: "10px 14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

const labelStyle: React.CSSProperties = {
  color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))",
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
  const [delSaveFlash, setDelSaveFlash] = useState(false);

  // Notify client
  const [showNotify, setShowNotify] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifying, setNotifying] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gallery
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings>({});

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  // Attached clients + web-demo link
  const [allClients, setAllClients] = useState<PickableClient[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [demoUrl, setDemoUrl] = useState("");
  const [demoNotes, setDemoNotes] = useState("");
  const [projectType, setProjectType] = useState<"photo" | "web">("photo");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkFlash, setLinkFlash] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Review + feedback requests
  const [engagement, setEngagement] = useState<any>(null);
  const [requesting, setRequesting] = useState<"review" | "feedback" | null>(null);
  const [engagementError, setEngagementError] = useState("");
  const [engagementNotice, setEngagementNotice] = useState("");
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
        setGalleryUrls(p.galleryUrls || []);
        setGallerySettings(p.gallerySettings || {});
        setClientIds(p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : []);
        setProjectType(p.type === "web" ? "web" : "photo");
        setDemoUrl(p.demoUrl || "");
        setDemoNotes(p.demoNotes || "");
        setMessages(msgData.messages || []);
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to load project:", err); setError("Failed to load project."); setLoading(false); });
  }, [session, projectId]);

  useEffect(() => {
    if (!session?.access_token) return;
    portalFetch("/admin/clients", {}, session.access_token)
      .then((data) => setAllClients(data.clients || []))
      .catch(() => setAllClients([]));
  }, [session]);

  async function saveProjectLinks() {
    if (!session || !projectId || linkSaving) return;
    if (clientIds.length === 0) {
      setLinkError("Koppel minstens één klant aan dit project.");
      return;
    }
    setLinkSaving(true);
    setLinkError("");
    try {
      const data = await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          clientIds,
          type: projectType,
          demoUrl: demoUrl.trim(),
          demoNotes: demoNotes.trim(),
        }),
      }, session.access_token);
      setProject(data.project);
      setLinkFlash(true);
      setTimeout(() => setLinkFlash(false), 1800);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setLinkSaving(false);
    }
  }

  // Review + feedback: what has been asked of the client, and what came back.
  function loadEngagement() {
    if (!session || !projectId) return;
    portalFetch(`/admin/project/${projectId}/engagement`, {}, session.access_token)
      .then(setEngagement)
      .catch(() => {});
  }

  useEffect(loadEngagement, [session, projectId]);

  async function requestFromClient(kind: "review" | "feedback") {
    if (!session || !projectId || requesting) return;
    setRequesting(kind);
    setEngagementError("");
    setEngagementNotice("");
    try {
      const data = await portalFetch(
        `/admin/project/${projectId}/request-${kind}`,
        { method: "POST" },
        session.access_token
      );
      setEngagementNotice(
        `${kind === "review" ? "Reviewverzoek" : "Feedbackverzoek"} gemaild naar ${data.sentTo}.`
      );
      loadEngagement();
    } catch (err) {
      setEngagementError(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setRequesting(null);
    }
  }

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

    const payload = { ...form, deliverables, meeting, galleryUrls, gallerySettings };

    try {
      const data = await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }, session.access_token);
      setProject(data.project);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function saveDeliverables(updated: Deliverable[]) {
    if (!session || !projectId) return;
    try {
      await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ deliverables: updated }),
      }, session.access_token);
      setDelSaveFlash(true);
      setTimeout(() => setDelSaveFlash(false), 1800);
    } catch (err) { console.error("Save deliverables error:", err); }
  }

  async function toggleDeliverable(id: string) {
    const updated = deliverables.map((d) => d.id === id ? { ...d, done: !d.done } : d);
    setDeliverables(updated);
    await saveDeliverables(updated);
  }

  async function addDeliverable() {
    if (!newDelName.trim()) return;
    const newDel: Deliverable = { id: crypto.randomUUID(), name: newDelName.trim(), count: parseInt(newDelCount) || 1, done: false };
    const updated = [...deliverables, newDel];
    setDeliverables(updated);
    setNewDelName("");
    setNewDelCount("1");
    setAddingDel(false);
    await saveDeliverables(updated);
  }

  async function removeDeliverable(id: string) {
    const updated = deliverables.filter((d) => d.id !== id);
    setDeliverables(updated);
    await saveDeliverables(updated);
  }

  function setCoverImage(url: string) {
    const updated = { ...gallerySettings, coverUrl: url };
    setGallerySettings(updated);
    if (!session || !projectId) return;
    portalFetch(`/admin/project/${projectId}`, {
      method: "PUT",
      body: JSON.stringify({ gallerySettings: updated }),
    }, session.access_token).catch(console.error);
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= galleryUrls.length) return;
    const updated = [...galleryUrls];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    setGalleryUrls(updated);
    if (!session || !projectId) return;
    portalFetch(`/admin/project/${projectId}`, {
      method: "PUT",
      body: JSON.stringify({ galleryUrls: updated }),
    }, session.access_token).catch(console.error);
  }

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!notifyMsg.trim() || !session || !projectId) return;
    setNotifying(true);
    try {
      const data = await portalFetch(`/admin/project/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: notifyMsg.trim() }),
      }, session.access_token);
      setMessages((prev) => [...prev, data.message]);
      setNotifyMsg("");
      setShowNotify(false);
    } catch (err) { console.error("Notify error:", err); }
    finally { setNotifying(false); }
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

  async function uploadGalleryFile(file: File): Promise<string> {
    if (!session) throw new Error("Not authenticated");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucketName", BUCKET);
    const res = await fetch(
      `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-0951c59e/admin/storage/upload`,
      { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: fd }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !session || !projectId) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadGalleryFile));
      const updated = [...galleryUrls, ...urls];
      setGalleryUrls(updated);
      await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ galleryUrls: updated }),
      }, session.access_token);
    } catch (err) {
      alert(`Upload mislukt: ${err}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeGalleryImage(index: number) {
    if (!session || !projectId) return;
    const removedUrl = galleryUrls[index];
    const updated = galleryUrls.filter((_, i) => i !== index);
    setGalleryUrls(updated);
    // Clear a dangling cover reference if the removed photo was the chosen cover.
    const updatedSettings = gallerySettings.coverUrl === removedUrl
      ? { ...gallerySettings, coverUrl: undefined }
      : gallerySettings;
    if (updatedSettings !== gallerySettings) setGallerySettings(updatedSettings);
    try {
      await portalFetch(`/admin/project/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ galleryUrls: updated, gallerySettings: updatedSettings }),
      }, session.access_token);
    } catch (err) { console.error("Remove gallery image error:", err); }
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
    <div style={{ height: "1px", backgroundColor: "rgba(var(--admin-fg-rgb),calc(0.04 * var(--admin-fg-boost)))", margin: "40px 0" }} />
  );

  return (
    <div style={{ padding: isMobile ? "20px 16px 60px" : "48px 40px 80px", maxWidth: "860px" }}>
      {/* Back */}
      <button
        onClick={() => project ? navigate(`/admin/client/${project.clientId}`) : navigate("/admin/clients")}
        style={{
          display: "flex", alignItems: "center", gap: "7px",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif", padding: 0, marginBottom: "36px",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-fg-solid)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))")}
      >
        <ArrowLeft size={13} /> Back to Client
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
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
              <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
                Project Management
              </div>
              <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "clamp(20px, 2.5vw, 30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0, lineHeight: 1.2 }}>
                {project.title}
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                backgroundColor: saveSuccess ? "rgba(120,190,140,0.15)" : saving ? "rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))" : "var(--admin-cta-bg)",
                border: saveSuccess ? "1px solid rgba(120,190,140,0.3)" : "none",
                color: saveSuccess ? "rgba(120,190,140,0.9)" : saving ? "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))" : "var(--admin-cta-fg)",
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
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })} style={{ ...inputStyle, appearance: "none" }}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Phase</label>
                <input type="text" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")} />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ ...inputStyle, colorScheme: "dark" }} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")} />
            </div>
          </div>

          {sectionDivider}

          {/* ── Meeting ── */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                Meeting
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Date & Time</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Location (optional)</label>
                  <input
                    type="text"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    placeholder="Studio, Online, etc."
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Meeting Link (optional)</label>
                <input
                  type="url"
                  value={meetingForm.link}
                  onChange={(e) => setMeetingForm({ ...meetingForm, link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Agenda, preparation, etc."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                />
              </div>
              {meetingForm.date && (
                <button
                  onClick={() => setMeetingForm({ date: "", location: "", link: "", notes: "" })}
                  style={{
                    background: "none",
                    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))",
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
                    e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))";
                  }}
                >
                  Remove Meeting
                </button>
              )}
            </div>
          </div>

          {sectionDivider}

          {/* ── Deliverables ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                Deliverables ({deliverables.filter((d) => d.done).length}/{deliverables.length})
              {delSaveFlash && (
                <span style={{ color: "rgba(120,190,140,0.8)", fontSize: "9px", letterSpacing: "0.15em", marginLeft: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Check size={9} /> Saved
                </span>
              )}
              </span>
              {!addingDel && (
                <button
                  onClick={() => setAddingDel(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "none", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))",
                    color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
                    padding: "7px 12px", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--admin-fg-solid)"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))"; }}
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
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
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
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                  />
                </div>
                <button onClick={addDeliverable} style={{ backgroundColor: "var(--admin-cta-bg)", border: "none", color: "var(--admin-bg-page)", fontSize: "10px", fontWeight: 700, padding: "10px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em", marginBottom: "0" }}>Add</button>
                <button onClick={() => { setAddingDel(false); setNewDelName(""); setNewDelCount("1"); }} style={{ backgroundColor: "transparent", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))", color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", fontSize: "10px", padding: "10px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              </div>
            )}

            {deliverables.length === 0 && !addingDel && (
              <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))", fontSize: "12px" }}>
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
                    backgroundColor: d.done ? "rgba(120,190,140,0.04)" : "rgba(var(--admin-fg-rgb),calc(0.015 * var(--admin-fg-boost)))",
                    border: `1px solid ${d.done ? "rgba(120,190,140,0.1)" : "rgba(var(--admin-fg-rgb),calc(0.04 * var(--admin-fg-boost)))"}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <button
                    onClick={() => toggleDeliverable(d.id)}
                    style={{
                      width: "18px", height: "18px", flexShrink: 0,
                      backgroundColor: d.done ? "rgba(120,190,140,0.2)" : "transparent",
                      border: `1px solid ${d.done ? "rgba(120,190,140,0.4)" : "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))"}`,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, transition: "all 0.2s ease",
                    }}
                  >
                    {d.done && <Check size={10} color="rgba(120,190,140,0.9)" />}
                  </button>
                  <span style={{ flex: 1, color: d.done ? "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))" : "var(--admin-fg-solid)", fontSize: "13px", fontWeight: 400, textDecoration: d.done ? "line-through" : "none" }}>
                    {d.name}
                  </span>
                  <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "10px" }}>×{d.count}</span>
                  <button
                    onClick={() => removeDeliverable(d.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))", padding: "2px", display: "flex", transition: "color 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#e07060")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {sectionDivider}

          {/* ── Gallery ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Images size={13} color="rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))" />
                <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                  Photo Gallery ({galleryUrls.length})
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {galleryUrls.length > 0 && (
                  <a
                    href={`/admin/project/${projectId}/gallery`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      border: "1px solid rgba(200,144,90,0.25)",
                      color: "#c8905a", fontSize: "9px", fontWeight: 600,
                      letterSpacing: "0.2em", textTransform: "uppercase",
                      padding: "7px 12px", fontFamily: "'Inter', sans-serif",
                      textDecoration: "none", transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <ExternalLink size={11} /> Preview
                  </a>
                )}
                <label
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))",
                    color: uploading ? "#c8905a" : "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
                    fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: uploading ? "not-allowed" : "pointer",
                    padding: "7px 12px", fontFamily: "'Inter', sans-serif",
                    transition: "all 0.2s ease",
                    backgroundColor: uploading ? "rgba(200,144,90,0.05)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.color = "var(--admin-fg-solid)"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))"; } }}
                  onMouseLeave={(e) => { if (!uploading) { e.currentTarget.style.color = "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))"; } }}
                >
                  <Upload size={11} />
                  {uploading ? "Uploading…" : "Upload Foto's"}
                  <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploading} style={{ display: "none" }} />
                </label>
              </div>
            </div>

            {/* Gallery identity — customized per client, shown on the dedicated gallery page */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px", padding: "16px", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))", backgroundColor: "rgba(var(--admin-fg-rgb),calc(0.01 * var(--admin-fg-boost)))" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Gallery Title</label>
                  <input
                    type="text"
                    value={gallerySettings.title || ""}
                    onChange={(e) => setGallerySettings({ ...gallerySettings, title: e.target.value })}
                    placeholder={form.title || "Defaults to project title"}
                    style={{ ...inputStyle, fontSize: "12px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Gallery Subtitle (optional)</label>
                  <input
                    type="text"
                    value={gallerySettings.subtitle || ""}
                    onChange={(e) => setGallerySettings({ ...gallerySettings, subtitle: e.target.value })}
                    placeholder="e.g. Autumn Campaign 2026"
                    style={{ ...inputStyle, fontSize: "12px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Accent Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {ACCENT_PRESETS.map((preset) => {
                    const active = (gallerySettings.accentColor || "#c8905a") === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        title={preset.name}
                        onClick={() => setGallerySettings({ ...gallerySettings, accentColor: preset.value })}
                        style={{
                          width: "24px", height: "24px", borderRadius: "50%",
                          backgroundColor: preset.value,
                          border: active ? "2px solid #fffbe0" : "2px solid transparent",
                          boxShadow: active ? `0 0 0 2px ${preset.value}` : "none",
                          cursor: "pointer", padding: 0,
                        }}
                      />
                    );
                  })}
                  <input
                    type="color"
                    value={gallerySettings.accentColor || "#c8905a"}
                    onChange={(e) => setGallerySettings({ ...gallerySettings, accentColor: e.target.value })}
                    title="Custom color"
                    style={{ width: "26px", height: "26px", padding: 0, border: "1px solid rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))", backgroundColor: "transparent", cursor: "pointer" }}
                  />
                  <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "11px", fontFamily: "'Courier New', monospace" }}>
                    {gallerySettings.accentColor || "#c8905a"}
                  </span>
                </div>
              </div>
              <p style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "10px", margin: 0, lineHeight: 1.6 }}>
                Saved with "Save Changes" above. Click the star on a photo below to set it as the gallery cover.
              </p>
            </div>

            {galleryUrls.length === 0 ? (
              <div style={{
                border: "1px dashed rgba(var(--admin-fg-rgb),calc(0.06 * var(--admin-fg-boost)))",
                padding: "36px",
                textAlign: "center",
                color: "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))",
                fontSize: "12px",
              }}>
                No photos uploaded yet. Photos added here are visible in the client portal.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "6px",
              }}>
                {galleryUrls.map((url, i) => {
                  const isCover = (gallerySettings.coverUrl || galleryUrls[0]) === url;
                  return (
                  <div key={url + i} style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                    <img
                      src={url}
                      alt={`Gallery ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <div style={{
                      position: "absolute", top: "6px", left: "6px",
                      backgroundColor: "rgba(8,4,1,0.75)", color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
                      fontSize: "9px", fontWeight: 600, fontFamily: "'Courier New', monospace",
                      padding: "2px 6px",
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <button
                      onClick={() => setCoverImage(url)}
                      title={isCover ? "Gallery cover" : "Set as gallery cover"}
                      style={{
                        position: "absolute", top: "6px", right: "34px",
                        backgroundColor: isCover ? "rgba(200,144,90,0.85)" : "rgba(8,4,1,0.75)",
                        border: "none", color: isCover ? "var(--admin-bg-page)" : "rgba(var(--admin-fg-rgb),calc(0.6 * var(--admin-fg-boost)))",
                        width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", padding: 0,
                      }}
                    >
                      <Star size={11} fill={isCover ? "var(--admin-bg-page)" : "none"} />
                    </button>
                    {/* Reorder buttons */}
                    <div style={{ position: "absolute", bottom: "6px", left: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <button
                        onClick={() => moveGalleryImage(i, -1)}
                        disabled={i === 0}
                        style={{ backgroundColor: "rgba(8,4,1,0.75)", border: "none", color: i === 0 ? "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))" : "#fffbe0", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: i === 0 ? "not-allowed" : "pointer", padding: 0 }}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveGalleryImage(i, 1)}
                        disabled={i === galleryUrls.length - 1}
                        style={{ backgroundColor: "rgba(8,4,1,0.75)", border: "none", color: i === galleryUrls.length - 1 ? "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))" : "#fffbe0", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: i === galleryUrls.length - 1 ? "not-allowed" : "pointer", padding: 0 }}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeGalleryImage(i)}
                      style={{ position: "absolute", top: "6px", right: "6px", backgroundColor: "rgba(220,80,80,0.85)", border: "none", color: "#fff", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {sectionDivider}

          {/* ── Messages ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                Client Messages ({messages.length})
              </span>
              <button
                onClick={() => setShowNotify(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  background: "none", border: "1px solid rgba(200,144,90,0.25)",
                  color: "#c8905a", fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.15em", textTransform: "uppercase",
                  cursor: "pointer", padding: "6px 11px",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Bell size={10} /> Notify Client
              </button>
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
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))", fontSize: "12px" }}>
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
                      flexDirection: isPDC ? "row" : "row-reverse",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "28px", height: "28px", flexShrink: 0,
                      backgroundColor: isPDC ? "rgba(200,144,90,0.15)" : "rgba(var(--admin-fg-rgb),calc(0.06 * var(--admin-fg-boost)))",
                      border: `1px solid ${isPDC ? "rgba(200,144,90,0.25)" : "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isPDC ? "#c8905a" : "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
                      fontSize: "9px", fontWeight: 700,
                    }}>
                      {isPDC ? "P" : msg.senderName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{
                        backgroundColor: isPDC ? "rgba(200,144,90,0.08)" : "rgba(var(--admin-fg-rgb),calc(0.04 * var(--admin-fg-boost)))",
                        border: `1px solid ${isPDC ? "rgba(200,144,90,0.12)" : "rgba(var(--admin-fg-rgb),calc(0.06 * var(--admin-fg-boost)))"}`,
                        padding: "12px 16px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ color: isPDC ? "#c8905a" : "rgba(var(--admin-fg-rgb),calc(0.55 * var(--admin-fg-boost)))", fontSize: "10px", fontWeight: 600 }}>
                            {isPDC ? "PDC Studio" : msg.senderName}
                          </span>
                          <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "9px" }}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <p style={{ color: "rgba(var(--admin-fg-rgb),calc(0.75 * var(--admin-fg-boost)))", fontSize: "13px", fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
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
                  backgroundColor: reply.trim() ? "#c8905a" : "rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))",
                  border: "none",
                  color: reply.trim() ? "var(--admin-bg-page)" : "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))",
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

          {/* ── Clients & demo ── */}
          <div>
            <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
              Klanten &amp; soort
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
              {([["photo", "Foto / video"], ["web", "Webdemo"]] as const).map(([value, label]) => {
                const active = projectType === value;
                return (
                  <button
                    key={value}
                    onClick={() => setProjectType(value)}
                    style={{
                      backgroundColor: active ? "rgba(200,144,90,0.12)" : "transparent",
                      border: `1px solid ${active ? "rgba(200,144,90,0.45)" : "rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))"}`,
                      color: active ? "#c8905a" : "rgba(var(--admin-fg-rgb),calc(0.5 * var(--admin-fg-boost)))",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "9px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Gekoppelde klanten</label>
              <ClientPicker selected={clientIds} onChange={setClientIds} clients={allClients} />
            </div>

            {projectType === "web" && (
              <>
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Demo-URL</label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://demo-klantnaam.vercel.app"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Uitleg bij de demo</label>
                  <textarea
                    value={demoNotes}
                    onChange={(e) => setDemoNotes(e.target.value)}
                    rows={2}
                    placeholder="Waar moet de klant op letten?"
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>
              </>
            )}

            {linkError && (
              <div style={{ padding: "10px 14px", border: "1px solid rgba(224,112,96,0.25)", color: "#e07060", fontSize: "12px", marginBottom: "14px" }}>
                {linkError}
              </div>
            )}

            <button
              onClick={saveProjectLinks}
              disabled={linkSaving}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                backgroundColor: linkFlash ? "rgba(120,190,140,0.15)" : "rgba(200,144,90,0.12)",
                border: `1px solid ${linkFlash ? "rgba(120,190,140,0.4)" : "rgba(200,144,90,0.3)"}`,
                color: linkFlash ? "rgba(120,190,140,0.95)" : "#c8905a",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "10px 18px", cursor: linkSaving ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
              }}
            >
              {linkFlash ? <Check size={12} /> : <Save size={12} />}
              {linkSaving ? "Opslaan…" : linkFlash ? "Opgeslagen" : "Opslaan"}
            </button>
          </div>

          {sectionDivider}

          {/* ── Review & Feedback ── */}
          <div>
            <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
              Review &amp; Feedback
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              {([
                ["review", "Vraag review", engagement?.reviewRequest, Star],
                ["feedback", "Vraag feedback", engagement?.feedbackRequest, MessageSquare],
              ] as const).map(([kind, label, request, Icon]) => (
                <button
                  key={kind}
                  onClick={() => requestFromClient(kind)}
                  disabled={!!requesting}
                  title={request ? `Eerder gevraagd op ${new Date(request.requestedAt).toLocaleDateString("nl-NL")}` : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: "7px",
                    background: "none", border: "1px solid rgba(200,144,90,0.25)",
                    color: "#c8905a", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: requesting ? "not-allowed" : "pointer", padding: "9px 14px",
                    opacity: requesting && requesting !== kind ? 0.5 : 1,
                    fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!requesting) e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <Icon size={11} />
                  {requesting === kind ? "Versturen…" : request ? `${label} opnieuw` : label}
                </button>
              ))}
            </div>

            {(engagement?.reviewRequest || engagement?.feedbackRequest) && (
              <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "11px", lineHeight: 1.6, marginBottom: "16px" }}>
                {engagement?.reviewRequest && (
                  <div>
                    Review gevraagd op {new Date(engagement.reviewRequest.requestedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    {engagement.reviewRequest.status === "submitted" ? " · beantwoord" : " · nog geen antwoord"}
                  </div>
                )}
                {engagement?.feedbackRequest && (
                  <div>
                    Feedback gevraagd op {new Date(engagement.feedbackRequest.requestedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    {engagement.feedbackRequest.status === "submitted" ? " · beantwoord" : " · nog geen antwoord"}
                  </div>
                )}
              </div>
            )}

            {engagementNotice && (
              <div style={{ padding: "10px 14px", border: "1px solid rgba(120,190,140,0.25)", color: "rgba(120,190,140,0.9)", fontSize: "12px", marginBottom: "16px" }}>
                {engagementNotice}
              </div>
            )}
            {engagementError && (
              <div style={{ padding: "10px 14px", border: "1px solid rgba(224,112,96,0.25)", color: "#e07060", fontSize: "12px", marginBottom: "16px" }}>
                {engagementError}
              </div>
            )}

            {engagement?.review && (
              <div style={{ border: "1px solid rgba(200,144,90,0.2)", backgroundColor: "rgba(200,144,90,0.04)", padding: "18px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <span style={{ display: "inline-flex", gap: "2px" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} color="#c8905a" fill={n <= engagement.review.rating ? "#c8905a" : "none"} strokeWidth={2} />
                    ))}
                  </span>
                  <span style={{
                    color: engagement.review.published ? "rgba(120,190,140,0.9)" : "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))",
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  }}>
                    {engagement.review.published ? "Op de site" : "Niet gepubliceerd"}
                  </span>
                </div>
                <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.7 * var(--admin-fg-boost)))", fontSize: "13.5px", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "14px" }}>
                  {engagement.review.text}
                </div>
                <button
                  onClick={() => navigate("/admin/reviews")}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "none", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))",
                    color: "rgba(var(--admin-fg-rgb),calc(0.5 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: "pointer", padding: "8px 13px", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Publiceren &amp; koppelen <ExternalLink size={10} />
                </button>
              </div>
            )}

            {engagement?.feedback?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {engagement.feedback.map((entry: any) => (
                  <div key={entry.id} style={{ border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))", padding: "18px" }}>
                    <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px" }}>
                      Feedback · {new Date(entry.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
                      {entry.items.map((item: any) => (
                        <div key={item.id}>
                          <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "7px" }}>
                            {item.scope === "photos"
                              ? `${item.photoUrls.length} foto${item.photoUrls.length === 1 ? "" : "'s"}`
                              : item.category || "Algemeen"}
                          </div>
                          {item.photoUrls.length > 0 && (
                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                              {item.photoUrls.map((url: string) => (
                                <img key={url} src={url} alt="" style={{ width: "52px", height: "52px", objectFit: "cover", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.12 * var(--admin-fg-boost)))" }} />
                              ))}
                            </div>
                          )}
                          <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.65 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {item.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <span style={{ flex: 1, color: "rgba(var(--admin-fg-rgb),calc(0.5 * var(--admin-fg-boost)))", fontSize: "12px" }}>
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
                    background: "none", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))", color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
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

      {/* Notify client modal */}
      {showNotify && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(8,4,1,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNotify(false); }}
        >
          <div style={{ backgroundColor: "var(--admin-bg-card)", border: "1px solid rgba(200,144,90,0.2)", padding: isMobile ? "24px 20px" : "36px", maxWidth: "460px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Bell size={15} color="#c8905a" />
                <span style={{ color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>Notify Client</span>
              </div>
              <button onClick={() => setShowNotify(false)} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", cursor: "pointer", padding: "2px" }}>
                <X size={15} />
              </button>
            </div>
            <p style={{ color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", fontSize: "12px", margin: "0 0 16px", lineHeight: 1.6 }}>
              Send a message to the client. It will appear in their portal chat.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              {["Your gallery has been updated.", "Your project status has changed.", "We have an update for you — please check your portal."].map((t) => (
                <button
                  key={t}
                  onClick={() => setNotifyMsg(t)}
                  style={{
                    background: "none", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))",
                    color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500,
                    letterSpacing: "0.05em", cursor: "pointer", padding: "5px 9px",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--admin-fg-solid)"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))"; e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))"; }}
                >
                  {t}
                </button>
              ))}
            </div>
            <form onSubmit={handleNotify} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <textarea
                value={notifyMsg}
                onChange={(e) => setNotifyMsg(e.target.value)}
                placeholder="Write your message…"
                rows={4}
                autoFocus
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))")}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setShowNotify(false)} style={{ flex: 1, padding: "11px", background: "none", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))", color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  Cancel
                </button>
                <button type="submit" disabled={notifying || !notifyMsg.trim()} style={{ flex: 1, padding: "11px", backgroundColor: notifyMsg.trim() ? "#c8905a" : "rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))", border: "none", color: notifyMsg.trim() ? "var(--admin-bg-page)" : "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: notifyMsg.trim() ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Send size={11} />
                  {notifying ? "Sending…" : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}