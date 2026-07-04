import image_PDClogo2_0_12_1 from '@/imports/PDClogo2.0-12-1.png';
import { Outlet, Navigate, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Users, LogOut, ChevronRight, Menu, X, Mail, Images, Bell, Clock, Check, Settings, Car } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Clients", path: "/admin/clients", icon: Users },
  { label: "Inquiries", path: "/admin/inquiries", icon: Mail },
  { label: "Portfolio", path: "/admin/portfolio", icon: Images },
  { label: "Automotive", path: "/admin/services/automotive", icon: Car },
  { label: "Reminders", path: "/admin/reminders", icon: Bell },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const { session, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  useEffect(() => {
    if (session) fetchReminders();
  }, [session]);

  useEffect(() => {
    if (!loading && user) {
      console.log("AdminLayout - Current user:", {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role,
        metadata: user.user_metadata,
      });
    }
  }, [loading, user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [notificationsOpen]);

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

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#080401",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "32px", height: "2px", backgroundColor: "#c8905a" }} />
          <span style={{ color: "rgba(255,251,224,0.3)", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Loading
          </span>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;
  if (user?.user_metadata?.role !== "admin") return <Navigate to="/portal/login" replace />;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate("/admin/login");
  }

  function handleNav(path: string) {
    navigate(path);
    setSidebarOpen(false);
  }

  const adminName = user?.user_metadata?.name || user?.email || "Admin";
  const initials = adminName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const currentLabel =
    NAV_ITEMS.find(n => location.pathname === n.path || (n.path !== "/admin/dashboard" && location.pathname.startsWith(n.path)))?.label ||
    (location.pathname.includes("/admin/client/") ? "Client" : "") ||
    (location.pathname.includes("/admin/project/") ? "Project" : "");

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{
        padding: isMobile ? "20px 20px 16px" : "24px 20px 20px",
        borderBottom: "1px solid rgba(255,251,224,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <img
            src={image_PDClogo2_0_12_1}
            alt="Photo De Caffeine"
            style={{ height: "48px", width: "auto", objectFit: "contain", display: "block" }}
          />
          <div style={{
            marginTop: "6px",
            color: "rgba(255,251,224,0.2)",
            fontSize: "8px", fontWeight: 600,
            letterSpacing: "0.3em", textTransform: "uppercase",
          }}>
            Admin Panel
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.4)", padding: "4px" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path || (path !== "/admin/dashboard" && location.pathname.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "11px 12px",
                background: active ? "rgba(255,251,224,0.06)" : "none",
                border: "none",
                color: active ? "#fffbe0" : "rgba(255,251,224,0.35)",
                fontSize: "11px", fontWeight: active ? 600 : 400,
                letterSpacing: "0.08em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                width: "100%", textAlign: "left",
                transition: "all 0.2s ease",
                borderLeft: active ? "2px solid #c8905a" : "2px solid transparent",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,251,224,0.65)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,251,224,0.35)"; }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer — user + sign out */}
      <div style={{
        padding: "16px 12px",
        borderTop: "1px solid rgba(255,251,224,0.04)",
        display: "flex", flexDirection: "column", gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px",
            backgroundColor: "rgba(200,144,90,0.15)",
            border: "1px solid rgba(200,144,90,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#c8905a", fontSize: "10px", fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "#fffbe0", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {adminName}
            </div>
            <div style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Admin</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "none", border: "1px solid rgba(255,251,224,0.07)",
            color: "rgba(255,251,224,0.3)",
            fontSize: "10px", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase",
            cursor: "pointer", padding: "8px 12px",
            fontFamily: "'Inter', sans-serif",
            width: "100%", transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.6)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.3)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.07)"; }}
        >
          <LogOut size={12} />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "'Inter', sans-serif", backgroundColor: "#050301" }}>
        {/* Mobile top bar */}
        <header style={{
          height: "56px",
          backgroundColor: "#0a0603",
          borderBottom: "1px solid rgba(255,251,224,0.05)",
          display: "flex", alignItems: "center",
          padding: "0 16px", gap: "12px",
          position: "sticky", top: 0, zIndex: 60,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.6)", padding: "4px", display: "flex" }}
          >
            <Menu size={20} />
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Admin</span>
            {currentLabel && (
              <>
                <ChevronRight size={10} color="rgba(255,251,224,0.15)" />
                <span style={{ color: "rgba(255,251,224,0.55)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" }}>{currentLabel}</span>
              </>
            )}
          </div>
          <NotificationBell
            reminders={reminders}
            notificationsOpen={notificationsOpen}
            setNotificationsOpen={setNotificationsOpen}
            notifRef={notifRef}
            isMobile={true}
          />
          <div style={{
            width: "28px", height: "28px",
            backgroundColor: "rgba(200,144,90,0.15)",
            border: "1px solid rgba(200,144,90,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#c8905a", fontSize: "10px", fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 70, backgroundColor: "rgba(0,0,0,0.6)" }}
            />
            <aside style={{
              position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 80,
              width: "260px",
              backgroundColor: "#0a0603",
              borderRight: "1px solid rgba(255,251,224,0.05)",
              overflowY: "auto",
            }}>
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, backgroundColor: "#080401", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", backgroundColor: "#050301" }}>
      {/* Sidebar */}
      <aside style={{
        width: "220px", minWidth: "220px",
        backgroundColor: "#0a0603",
        borderRight: "1px solid rgba(255,251,224,0.05)",
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
      }}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, backgroundColor: "#080401", overflowY: "auto" }}>
        {/* Top breadcrumb bar */}
        <div style={{
          height: "48px",
          borderBottom: "1px solid rgba(255,251,224,0.04)",
          display: "flex", alignItems: "center",
          padding: "0 32px", gap: "6px",
        }}>
          <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Admin</span>
          <ChevronRight size={10} color="rgba(255,251,224,0.15)" />
          <span style={{ color: "rgba(255,251,224,0.45)", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {currentLabel}
          </span>
          <div style={{ marginLeft: "auto" }}>
            <NotificationBell
              reminders={reminders}
              notificationsOpen={notificationsOpen}
              setNotificationsOpen={setNotificationsOpen}
              notifRef={notifRef}
              isMobile={false}
            />
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

function NotificationBell({
  reminders,
  notificationsOpen,
  setNotificationsOpen,
  notifRef,
  isMobile,
}: {
  reminders: Reminder[];
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  notifRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
}) {
  const navigate = useNavigate();
  const activeReminders = reminders.filter((r) => !r.completed);
  const overdueCount = activeReminders.filter((r) => {
    const dueDate = new Date(r.dueDate);
    return dueDate < new Date();
  }).length;

  return (
    <div style={{ position: "relative" }} ref={notifRef}>
      <button
        onClick={() => setNotificationsOpen(!notificationsOpen)}
        style={{
          background: "none",
          border: "1px solid rgba(255,251,224,0.1)",
          color: "rgba(255,251,224,0.5)",
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
          e.currentTarget.style.color = "#fffbe0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)";
          e.currentTarget.style.color = "rgba(255,251,224,0.5)";
        }}
      >
        <Bell size={16} />
        {activeReminders.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              backgroundColor: overdueCount > 0 ? "#e07060" : "#c8905a",
              color: "#080401",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "9px",
              fontWeight: 700,
              border: "1px solid #080401",
            }}
          >
            {activeReminders.length}
          </div>
        )}
      </button>

      {notificationsOpen && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: 0,
            width: isMobile ? "280px" : "320px",
            maxHeight: "400px",
            backgroundColor: "#0d0703",
            border: "1px solid rgba(255,251,224,0.15)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,251,224,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                color: "#fffbe0",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Reminders ({activeReminders.length})
            </span>
            <button
              onClick={() => setNotificationsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,251,224,0.3)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ overflowY: "auto", maxHeight: "350px" }}>
            {activeReminders.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "rgba(255,251,224,0.25)",
                  fontSize: "11px",
                }}
              >
                No active reminders
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {activeReminders.slice(0, 10).map((reminder) => {
                  const dueDate = new Date(reminder.dueDate);
                  const now = new Date();
                  const isOverdue = dueDate < now;
                  const timeDiff = dueDate.getTime() - now.getTime();
                  const minutesDiff = Math.floor(timeDiff / 60000);
                  const hoursDiff = Math.floor(minutesDiff / 60);
                  const daysDiff = Math.floor(hoursDiff / 24);

                  let timeText = "";
                  if (isOverdue) {
                    timeText = "Overdue";
                  } else if (daysDiff > 0) {
                    timeText = `${daysDiff}d`;
                  } else if (hoursDiff > 0) {
                    timeText = `${hoursDiff}h`;
                  } else if (minutesDiff > 0) {
                    timeText = `${minutesDiff}m`;
                  } else {
                    timeText = "Now";
                  }

                  return (
                    <div
                      key={reminder.id}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: isOverdue
                          ? "rgba(200,100,90,0.08)"
                          : "rgba(255,251,224,0.02)",
                        borderBottom: "1px solid rgba(255,251,224,0.05)",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isOverdue
                          ? "rgba(200,100,90,0.12)"
                          : "rgba(255,251,224,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isOverdue
                          ? "rgba(200,100,90,0.08)"
                          : "rgba(255,251,224,0.02)";
                      }}
                    >
                      <div
                        style={{
                          color: "#fffbe0",
                          fontSize: "12px",
                          fontWeight: 600,
                          marginBottom: "4px",
                        }}
                      >
                        {reminder.title}
                      </div>
                      {reminder.description && (
                        <div
                          style={{
                            color: "rgba(255,251,224,0.3)",
                            fontSize: "10px",
                            marginBottom: "6px",
                            lineHeight: 1.4,
                          }}
                        >
                          {reminder.description.slice(0, 60)}
                          {reminder.description.length > 60 ? "..." : ""}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Clock size={10} color={isOverdue ? "#e07060" : "rgba(255,251,224,0.3)"} />
                        <span
                          style={{
                            color: isOverdue ? "#e07060" : "rgba(255,251,224,0.35)",
                            fontSize: "9px",
                            fontWeight: 500,
                          }}
                        >
                          {timeText}
                        </span>
                        <span
                          style={{
                            color: "rgba(200,144,90,0.5)",
                            fontSize: "8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginLeft: "auto",
                          }}
                        >
                          {reminder.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* View All Link */}
          {activeReminders.length > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid rgba(255,251,224,0.1)",
              }}
            >
              <button
                onClick={() => {
                  navigate("/admin/reminders");
                  setNotificationsOpen(false);
                }}
                style={{
                  width: "100%",
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.1)",
                  color: "rgba(255,251,224,0.6)",
                  padding: "8px 12px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.1)";
                  e.currentTarget.style.color = "#fffbe0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.05)";
                  e.currentTarget.style.color = "rgba(255,251,224,0.6)";
                }}
              >
                View All Reminders
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
