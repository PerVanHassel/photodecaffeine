import { useState, useEffect } from "react";
import { Bell, Plus, X, Check, Clock, Filter, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { projectId } from "/utils/supabase/info";

type Reminder = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  type: string;
  relatedId: string | null;
  completed: boolean;
  createdBy: string;
  createdAt: string;
};

export function AdminRemindersPage() {
  const { session } = useAuth();
  const isMobile = useMobile();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    type: "general",
  });

  useEffect(() => {
    if (session) fetchReminders();
  }, [session]);

  async function fetchReminders() {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/reminders`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createReminder() {
    if (!session || !formData.title || !formData.dueDate) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/reminders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) throw new Error("Failed to create reminder");
      await fetchReminders();
      resetForm();
    } catch (err) {
      console.error("Failed to create reminder:", err);
      alert("Failed to create reminder");
    }
  }

  async function updateReminder() {
    if (!session || !editingId || !formData.title || !formData.dueDate) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/reminders/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) throw new Error("Failed to update reminder");
      await fetchReminders();
      resetForm();
    } catch (err) {
      console.error("Failed to update reminder:", err);
      alert("Failed to update reminder");
    }
  }

  async function toggleComplete(id: string, completed: boolean) {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/reminders/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ completed: !completed }),
        }
      );
      if (!res.ok) throw new Error("Failed to update");
      await fetchReminders();
    } catch (err) {
      console.error("Failed to update reminder:", err);
    }
  }

  async function deleteReminder(id: string) {
    if (!session || !confirm("Delete this reminder?")) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/reminders/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete");
      await fetchReminders();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  }

  function startEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setFormData({
      title: reminder.title,
      description: reminder.description || "",
      dueDate: reminder.dueDate,
      type: reminder.type,
    });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      dueDate: "",
      type: "general",
    });
  }

  function handleSubmit() {
    if (editingId) {
      updateReminder();
    } else {
      createReminder();
    }
  }

  // Filter and sort
  let filteredReminders = reminders;

  // Filter by type
  if (filterType !== "all") {
    filteredReminders = filteredReminders.filter((r) => r.type === filterType);
  }

  // Filter by status
  if (filterStatus === "active") {
    filteredReminders = filteredReminders.filter((r) => !r.completed);
  } else if (filterStatus === "completed") {
    filteredReminders = filteredReminders.filter((r) => r.completed);
  }

  // Sort by due date
  filteredReminders.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Active first
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const stats = {
    total: reminders.length,
    active: reminders.filter((r) => !r.completed).length,
    overdue: reminders.filter((r) => {
      return !r.completed && new Date(r.dueDate) < new Date();
    }).length,
  };

  if (loading) {
    return (
      <div style={{ padding: isMobile ? "24px 16px" : "40px", color: "rgba(255,251,224,0.4)" }}>
        Loading reminders...
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "40px", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              color: "rgba(255,251,224,0.2)",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Task Management
          </div>
          <h1
            style={{
              color: "#fffbe0",
              fontSize: "clamp(22px, 3vw, 38px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Reminders
          </h1>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
            <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "13px" }}>
              {stats.total} total • {stats.active} active
              {stats.overdue > 0 && (
                <span style={{ color: "rgba(200,100,90,0.8)" }}> • {stats.overdue} overdue</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: "#fffbe0",
            color: "#1a0c04",
            border: "none",
            padding: isMobile ? "10px 20px" : "12px 24px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#c8905a";
            e.currentTarget.style.color = "#fffbe0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fffbe0";
            e.currentTarget.style.color = "#1a0c04";
          }}
        >
          <Plus size={16} />
          New Reminder
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Filter size={14} style={{ color: "rgba(255,251,224,0.3)" }} />
          <span style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", textTransform: "uppercase" }}>
            Filters:
          </span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            backgroundColor: "rgba(13,7,3,0.8)",
            border: "1px solid rgba(255,251,224,0.15)",
            color: "#fffbe0",
            padding: "8px 12px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            backgroundColor: "rgba(13,7,3,0.8)",
            border: "1px solid rgba(255,251,224,0.15)",
            color: "#fffbe0",
            padding: "8px 12px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="portfolio">Portfolio</option>
          <option value="project">Project</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resetForm();
          }}
        >
          <div
            style={{
              backgroundColor: "#0d0703",
              border: "1px solid rgba(255,251,224,0.2)",
              padding: isMobile ? "24px" : "32px",
              maxWidth: "500px",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  color: "#fffbe0",
                  fontSize: "18px",
                  fontWeight: 700,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {editingId ? "Edit Reminder" : "New Reminder"}
              </h2>
              <button
                onClick={resetForm}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255,251,224,0.4)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.5)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Reminder title"
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(13,7,3,0.8)",
                    border: "1px solid rgba(255,251,224,0.15)",
                    color: "#fffbe0",
                    padding: "12px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.5)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(13,7,3,0.8)",
                    border: "1px solid rgba(255,251,224,0.15)",
                    color: "#fffbe0",
                    padding: "12px",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
                <div>
                  <label
                    style={{
                      color: "rgba(255,251,224,0.5)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(13,7,3,0.8)",
                      border: "1px solid rgba(255,251,224,0.15)",
                      color: "#fffbe0",
                      padding: "12px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      color: "rgba(255,251,224,0.5)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(13,7,3,0.8)",
                      border: "1px solid rgba(255,251,224,0.15)",
                      color: "#fffbe0",
                      padding: "12px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="general">General</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="project">Project</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.dueDate}
                style={{
                  backgroundColor:
                    formData.title && formData.dueDate ? "#fffbe0" : "rgba(255,251,224,0.2)",
                  color: "#1a0c04",
                  border: "none",
                  padding: "14px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: formData.title && formData.dueDate ? "pointer" : "not-allowed",
                  width: "100%",
                  marginTop: "8px",
                }}
              >
                {editingId ? "Update Reminder" : "Create Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 20px",
            border: "1px solid rgba(255,251,224,0.05)",
            color: "rgba(255,251,224,0.2)",
            fontSize: "13px",
          }}
        >
          No reminders found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredReminders.map((reminder) => {
            const dueDate = new Date(reminder.dueDate);
            const now = new Date();
            const isOverdue = dueDate < now && !reminder.completed;
            const timeDiff = dueDate.getTime() - now.getTime();
            const minutesDiff = Math.floor(timeDiff / 60000);
            const hoursDiff = Math.floor(minutesDiff / 60);
            const daysDiff = Math.floor(hoursDiff / 24);

            let timeText = "";
            if (reminder.completed) {
              timeText = "Completed";
            } else if (isOverdue) {
              timeText = "Overdue";
            } else if (daysDiff > 0) {
              timeText = `In ${daysDiff}d`;
            } else if (hoursDiff > 0) {
              timeText = `In ${hoursDiff}h`;
            } else if (minutesDiff > 0) {
              timeText = `In ${minutesDiff}m`;
            } else {
              timeText = "Due now";
            }

            return (
              <div
                key={reminder.id}
                style={{
                  backgroundColor: reminder.completed
                    ? "rgba(255,251,224,0.02)"
                    : isOverdue
                    ? "rgba(200,100,90,0.08)"
                    : "rgba(13,7,3,0.6)",
                  border: `1px solid ${
                    reminder.completed
                      ? "rgba(255,251,224,0.05)"
                      : isOverdue
                      ? "rgba(200,100,90,0.3)"
                      : "rgba(255,251,224,0.1)"
                  }`,
                  padding: isMobile ? "16px" : "20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(reminder.id, reminder.completed)}
                  style={{
                    backgroundColor: reminder.completed ? "#c8905a" : "transparent",
                    border: `1px solid ${reminder.completed ? "#c8905a" : "rgba(255,251,224,0.2)"}`,
                    color: reminder.completed ? "#1a0c04" : "rgba(255,251,224,0.4)",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {reminder.completed && <Check size={16} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: reminder.completed ? "rgba(255,251,224,0.3)" : "#fffbe0",
                      fontSize: isMobile ? "14px" : "15px",
                      fontWeight: 600,
                      marginBottom: "6px",
                      textDecoration: reminder.completed ? "line-through" : "none",
                    }}
                  >
                    {reminder.title}
                  </div>

                  {reminder.description && (
                    <div
                      style={{
                        color: "rgba(255,251,224,0.3)",
                        fontSize: "13px",
                        marginBottom: "10px",
                        lineHeight: 1.5,
                      }}
                    >
                      {reminder.description}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "11px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        color: isOverdue && !reminder.completed
                          ? "rgba(200,100,90,0.9)"
                          : "rgba(255,251,224,0.4)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Clock size={13} />
                      {timeText}
                    </span>
                    <span
                      style={{
                        backgroundColor: "rgba(200,144,90,0.15)",
                        color: "rgba(200,144,90,0.7)",
                        padding: "3px 8px",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {reminder.type}
                    </span>
                    <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px" }}>
                      {new Date(reminder.dueDate).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => startEdit(reminder)}
                    style={{
                      backgroundColor: "rgba(255,251,224,0.05)",
                      border: "1px solid rgba(255,251,224,0.1)",
                      color: "rgba(255,251,224,0.6)",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
                      e.currentTarget.style.color = "#fffbe0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)";
                      e.currentTarget.style.color = "rgba(255,251,224,0.6)";
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid rgba(255,100,100,0.2)",
                      color: "rgba(255,100,100,0.5)",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,100,100,0.5)";
                      e.currentTarget.style.color = "rgba(255,100,100,0.8)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,100,100,0.2)";
                      e.currentTarget.style.color = "rgba(255,100,100,0.5)";
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
