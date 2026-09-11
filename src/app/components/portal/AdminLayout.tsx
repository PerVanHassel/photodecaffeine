import image_PDClogo2_0_12_1 from '@/imports/PDClogo2.0-12-1.png';
import { Outlet, Navigate, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "../../context/AdminThemeContext";
import { LayoutDashboard, Users, LogOut, ChevronRight, Menu, X, Mail, Images, Settings, Car, Megaphone, Receipt, Shield, Sun, Moon, Star, Globe, FileText, ListChecks } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMobile } from "../../hooks/useMobile";
import { NotificationBell } from "./NotificationBell";
import { ACCENT, ADMIN_FONT, ADMIN_MONO, Pulse, SPRING, eyebrow, fg } from "./adminTaste";

const NAV_GROUPS = [
  {
    label: null as string | null,
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Klanten",
    items: [
      { label: "Clients", path: "/admin/clients", icon: Users },
      { label: "Inquiries", path: "/admin/inquiries", icon: Mail },
      { label: "Reviews", path: "/admin/reviews", icon: Star },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Portfolio", path: "/admin/portfolio", icon: Images },
      { label: "Automotive", path: "/admin/services/automotive", icon: Car },
      { label: "Ads", path: "/admin/ads", icon: Megaphone },
      { label: "Webdemo's", path: "/admin/demos", icon: Globe },
    ],
  },
  {
    label: "Beheer",
    items: [
      { label: "Prijsopgaves", path: "/admin/quotes", icon: FileText },
      { label: "Actiepunten", path: "/admin/reminders", icon: ListChecks },
      { label: "Declaraties", path: "/admin/declarations", icon: Receipt },
      { label: "Team & Rollen", path: "/admin/team", icon: Shield },
      { label: "Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, path: string) {
  return pathname === path || (path !== "/admin/dashboard" && pathname.startsWith(path));
}

export function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner />
    </AdminThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === "dark";
  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.92 }}
      transition={SPRING}
      title={isDark ? "Schakel naar licht thema" : "Schakel naar donker thema"}
      style={{
        background: "none",
        border: `1px solid ${fg(0.1)}`,
        color: fg(0.5),
        width: "32px", height: "32px",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "color 0.2s ease, border-color 0.2s ease", flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = fg(0.3); e.currentTarget.style.color = "var(--admin-fg-solid)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = fg(0.1); e.currentTarget.style.color = fg(0.5); }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={SPRING}
          style={{ display: "flex" }}
        >
          {isDark ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** The sidebar — one shared tree for desktop and the mobile drawer, so the
 *  active-item marker keeps its layout identity across route changes. */
function AdminSidebar({
  pathname, onNavigate, onClose, adminName, initials, signingOut, onSignOut, isMobile,
}: {
  pathname: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
  adminName: string;
  initials: string;
  signingOut: boolean;
  onSignOut: () => void;
  isMobile: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{
        padding: isMobile ? "20px 20px 18px" : "26px 20px 22px",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <div>
          <img
            src={image_PDClogo2_0_12_1}
            alt="Photo De Caffeine"
            style={{ height: "48px", width: "auto", objectFit: "contain", display: "block" }}
          />
          <div style={{ ...eyebrow(0.22, 8), marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Pulse size={4} />
            Admin Panel
          </div>
        </div>
        {isMobile && (
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.9 }}
            style={{ background: "none", border: "none", cursor: "pointer", color: fg(0.4), padding: "4px" }}
          >
            <X size={18} strokeWidth={1.5} />
          </motion.button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "6px 12px 16px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label || "root"} style={{ marginTop: groupIndex === 0 ? 0 : "22px" }}>
            {group.label && (
              <div style={{ ...eyebrow(0.2, 9), padding: "0 12px 10px", letterSpacing: "0.24em" }}>
                {group.label}
              </div>
            )}
            {group.items.map(({ label, path, icon: Icon }) => {
              const active = isActive(pathname, path);
              return (
                <motion.button
                  key={path}
                  onClick={() => onNavigate(path)}
                  whileTap={{ scale: 0.985 }}
                  transition={SPRING}
                  style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: "11px",
                    padding: "11px 12px 11px 14px",
                    background: "none", border: "none",
                    color: active ? "var(--admin-fg-solid)" : fg(0.36),
                    fontSize: "11px", fontWeight: active ? 600 : 400,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: "pointer", fontFamily: ADMIN_FONT,
                    width: "100%", textAlign: "left",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = fg(0.7); }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = fg(0.36); }}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-active"
                      transition={SPRING}
                      style={{
                        position: "absolute", inset: 0,
                        backgroundColor: fg(0.06),
                        borderLeft: `2px solid ${ACCENT}`,
                      }}
                    />
                  )}
                  <Icon size={14} strokeWidth={1.5} style={{ position: "relative", flexShrink: 0 }} />
                  <span style={{ position: "relative" }}>{label}</span>
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user + sign out */}
      <div style={{
        padding: "16px 12px",
        borderTop: `1px solid ${fg(0.05)}`,
        display: "flex", flexDirection: "column", gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px",
            backgroundColor: "rgba(200,144,90,0.15)",
            border: "1px solid rgba(200,144,90,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: ACCENT, fontSize: "10px", fontWeight: 700, flexShrink: 0,
            fontFamily: ADMIN_MONO,
          }}>
            {initials}
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ color: "var(--admin-fg-solid)", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {adminName}
            </div>
            <div style={eyebrow(0.25, 9)}>Admin</div>
          </div>
          <ThemeToggle />
        </div>
        <motion.button
          onClick={onSignOut}
          disabled={signingOut}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "none", border: `1px solid ${fg(0.07)}`,
            color: fg(0.32),
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
            cursor: "pointer", padding: "9px 12px",
            fontFamily: ADMIN_FONT,
            width: "100%", transition: "color 0.2s ease, border-color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = fg(0.6); e.currentTarget.style.borderColor = fg(0.15); }}
          onMouseLeave={(e) => { e.currentTarget.style.color = fg(0.32); e.currentTarget.style.borderColor = fg(0.07); }}
        >
          <LogOut size={12} strokeWidth={1.5} />
          {signingOut ? "Signing out…" : "Sign Out"}
        </motion.button>
      </div>
    </div>
  );
}

function Breadcrumb({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
      <span style={eyebrow(0.22, 9)}>Admin</span>
      {label && (
        <>
          <ChevronRight size={10} strokeWidth={1.5} color={fg(0.15)} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
              style={{ ...eyebrow(0.5, 9), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function AdminLayoutInner() {
  const { session, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh", backgroundColor: "var(--admin-bg-page)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: ADMIN_FONT,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "56px", height: "2px", backgroundColor: fg(0.08), overflow: "hidden" }}>
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%", backgroundColor: ACCENT, willChange: "transform" }}
            />
          </div>
          <span style={eyebrow(0.3, 10)}>Loading</span>
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
    NAV_ITEMS.find(n => isActive(location.pathname, n.path))?.label ||
    (location.pathname.includes("/admin/client/") ? "Client" : "") ||
    (location.pathname.includes("/admin/project/") ? "Project" : "");

  const sidebar = (
    <AdminSidebar
      pathname={location.pathname}
      onNavigate={handleNav}
      onClose={() => setSidebarOpen(false)}
      adminName={adminName}
      initials={initials}
      signingOut={signingOut}
      onSignOut={handleSignOut}
      isMobile={isMobile}
    />
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", fontFamily: ADMIN_FONT, backgroundColor: "var(--admin-bg-header)" }}>
        {/* Mobile top bar */}
        <header style={{
          height: "56px",
          backgroundColor: "var(--admin-bg-sidebar)",
          borderBottom: `1px solid ${fg(0.05)}`,
          display: "flex", alignItems: "center",
          padding: "0 16px", gap: "12px",
          position: "sticky", top: 0, zIndex: 60,
          flexShrink: 0,
        }}>
          <motion.button
            onClick={() => setSidebarOpen(true)}
            whileTap={{ scale: 0.9 }}
            style={{ background: "none", border: "none", cursor: "pointer", color: fg(0.6), padding: "4px", display: "flex" }}
          >
            <Menu size={20} strokeWidth={1.5} />
          </motion.button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Breadcrumb label={currentLabel} />
          </div>
          <ThemeToggle />
          <NotificationBell />
          <div style={{
            width: "28px", height: "28px",
            backgroundColor: "rgba(200,144,90,0.15)",
            border: "1px solid rgba(200,144,90,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: ACCENT, fontSize: "10px", fontWeight: 700, flexShrink: 0,
            fontFamily: ADMIN_MONO,
          }}>
            {initials}
          </div>
        </header>

        {/* Mobile drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSidebarOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 70, backgroundColor: "rgba(8,4,1,0.66)", backdropFilter: "blur(2px)" }}
              />
              <motion.aside
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                style={{
                  position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 80,
                  width: "264px",
                  backgroundColor: "var(--admin-bg-sidebar)",
                  borderRight: `1px solid ${fg(0.05)}`,
                  overflowY: "auto",
                  willChange: "transform",
                }}
              >
                {sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, backgroundColor: "var(--admin-bg-page)", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", fontFamily: ADMIN_FONT, backgroundColor: "var(--admin-bg-header)" }}>
      {/* Sidebar */}
      <aside style={{
        width: "224px", minWidth: "224px",
        backgroundColor: "var(--admin-bg-sidebar)",
        borderRight: `1px solid ${fg(0.05)}`,
        position: "sticky", top: 0, height: "100dvh",
        overflow: "hidden",
      }}>
        {sidebar}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, backgroundColor: "var(--admin-bg-page)", overflowY: "auto" }}>
        {/* Top bar */}
        <div style={{
          height: "52px",
          borderBottom: `1px solid ${fg(0.05)}`,
          display: "flex", alignItems: "center",
          padding: "0 32px", gap: "6px",
          position: "sticky", top: 0, zIndex: 40,
          backgroundColor: "rgba(var(--admin-bg-card-rgb),0.72)",
          backdropFilter: "blur(12px)",
          boxShadow: `inset 0 1px 0 ${fg(0.04)}`,
        }}>
          <Breadcrumb label={currentLabel} />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
