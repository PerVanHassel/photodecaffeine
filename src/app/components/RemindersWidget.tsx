import { useState, useEffect } from "react";
import { Bell, Plus, X, Check, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
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

export function RemindersWidget() {
  const { session } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    type: "general",
  });

  useEffect(() => {
    if (session) fetchReminders();
    checkNotificationPermission();

    // Check reminders every minute
    const interval = setInterval(() => {
      if (session) checkDueReminders();
    }, 60000);

    return () => clearInterval(interval);
  }, [session]);

  async function checkNotificationPermission() {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }

  async function requestNotificationPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  }

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
    }
  }

  function checkDueReminders() {
    const now = new Date();
    reminders.forEach((reminder) => {
      if (reminder.completed) return;
      const dueDate = new Date(reminder.dueDate);
      const timeDiff = dueDate.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / 60000);

      // Notify if due in 5 minutes or overdue
      if (minutesDiff <= 5 && minutesDiff >= -60 && notificationPermission === "granted") {
        new Notification("PDC Reminder", {
          body: reminder.title,
          icon: "/favicon.ico",
          tag: reminder.id,
        });
      }
    });
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
      setFormData({ title: "", description: "", dueDate: "", type: "general" });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create reminder:", err);
      alert("Failed to create reminder");
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

  const activeReminders = reminders.filter((r) => !r.completed);
  const displayReminders = showAll ? reminders : activeReminders.slice(0, 5);

  return (
    <div
      style={{
        backgroundColor: "rgba(13,7,3,0.6)",
        border: "1px solid rgba(255,251,224,0.1)",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bell size={18} style={{ color: "#c8905a" }} />
          <h3
            style={{
              color: "#fffbe0",
              fontSize: "16px",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Reminders ({activeReminders.length})
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {notificationPermission !== "granted" && (
            <button
              onClick={requestNotificationPermission}
              style={{
                backgroundColor: "rgba(200,144,90,0.2)",
                border: "1px solid rgba(200,144,90,0.3)",
                color: "#c8905a",
                padding: "6px 12px",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Enable Notifications
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(255,251,224,0.2)",
              color: "rgba(255,251,224,0.6)",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {showForm && (
        <div
          style={{
            backgroundColor: "rgba(8,4,1,0.6)",
            padding: "16px",
            marginBottom: "16px",
            border: "1px solid rgba(255,251,224,0.1)",
          }}
        >
          <input
            type="text"
            placeholder="Reminder title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{
              width: "100%",
              backgroundColor: "rgba(13,7,3,0.8)",
              border: "1px solid rgba(255,251,224,0.15)",
              color: "#fffbe0",
              padding: "10px",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          />
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            style={{
              width: "100%",
              backgroundColor: "rgba(13,7,3,0.8)",
              border: "1px solid rgba(255,251,224,0.15)",
              color: "#fffbe0",
              padding: "10px",
              fontSize: "13px",
              marginBottom: "8px",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              style={{
                flex: 1,
                backgroundColor: "rgba(13,7,3,0.8)",
                border: "1px solid rgba(255,251,224,0.15)",
                color: "#fffbe0",
                padding: "10px",
                fontSize: "13px",
              }}
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                backgroundColor: "rgba(13,7,3,0.8)",
                border: "1px solid rgba(255,251,224,0.15)",
                color: "#fffbe0",
                padding: "10px",
                fontSize: "13px",
              }}
            >
              <option value="general">General</option>
              <option value="portfolio">Portfolio</option>
              <option value="project">Project</option>
              <option value="client">Client</option>
            </select>
          </div>
          <button
            onClick={createReminder}
            disabled={!formData.title || !formData.dueDate}
            style={{
              backgroundColor: formData.title && formData.dueDate ? "#fffbe0" : "rgba(255,251,224,0.2)",
              color: "#1a0c04",
              border: "none",
              padding: "10px 16px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: formData.title && formData.dueDate ? "pointer" : "not-allowed",
              width: "100%",
            }}
          >
            Create Reminder
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {displayReminders.map((reminder) => {
          const dueDate = new Date(reminder.dueDate);
          const now = new Date();
          const isOverdue = dueDate < now && !reminder.completed;
          const timeDiff = dueDate.getTime() - now.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);
          const hoursDiff = Math.floor(minutesDiff / 60);
          const daysDiff = Math.floor(hoursDiff / 24);

          let timeText = "";
          if (isOverdue) {
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
                  ? "rgba(200,100,90,0.1)"
                  : "rgba(255,251,224,0.05)",
                border: `1px solid ${
                  reminder.completed
                    ? "rgba(255,251,224,0.05)"
                    : isOverdue
                    ? "rgba(200,100,90,0.3)"
                    : "rgba(255,251,224,0.1)"
                }`,
                padding: "12px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <button
                onClick={() => toggleComplete(reminder.id, reminder.completed)}
                style={{
                  backgroundColor: reminder.completed ? "#c8905a" : "transparent",
                  border: `1px solid ${reminder.completed ? "#c8905a" : "rgba(255,251,224,0.2)"}`,
                  color: reminder.completed ? "#1a0c04" : "rgba(255,251,224,0.4)",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {reminder.completed && <Check size={14} />}
              </button>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: reminder.completed ? "rgba(255,251,224,0.3)" : "#fffbe0",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "4px",
                    textDecoration: reminder.completed ? "line-through" : "none",
                  }}
                >
                  {reminder.title}
                </div>
                {reminder.description && (
                  <div
                    style={{
                      color: "rgba(255,251,224,0.25)",
                      fontSize: "11px",
                      marginBottom: "6px",
                    }}
                  >
                    {reminder.description}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "10px",
                  }}
                >
                  <span
                    style={{
                      color: isOverdue ? "rgba(200,100,90,0.8)" : "rgba(255,251,224,0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Clock size={12} />
                    {timeText}
                  </span>
                  <span
                    style={{
                      backgroundColor: "rgba(200,144,90,0.15)",
                      color: "rgba(200,144,90,0.7)",
                      padding: "2px 6px",
                      fontSize: "9px",
                      textTransform: "uppercase",
                    }}
                  >
                    {reminder.type}
                  </span>
                </div>
              </div>

              <button
                onClick={() => deleteReminder(reminder.id)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255,100,100,0.5)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}

        {displayReminders.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "32px",
              color: "rgba(255,251,224,0.2)",
              fontSize: "12px",
            }}
          >
            No reminders yet
          </div>
        )}

        {activeReminders.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(255,251,224,0.1)",
              color: "rgba(255,251,224,0.4)",
              padding: "8px",
              fontSize: "11px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Show all ({activeReminders.length})
          </button>
        )}
      </div>
    </div>
  );
}
