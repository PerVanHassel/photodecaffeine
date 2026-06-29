import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

export function PortalNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const name = user?.user_metadata?.name || user?.email || "Client";
  const initial = name.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate("/portal/login");
  }

  return (
    <nav
      style={{
        height: isMobile ? "56px" : "64px",
        backgroundColor: "#050200",
        borderBottom: "1px solid rgba(255,251,224,0.06)",
        display: "flex",
        alignItems: "center",
        padding: isMobile ? "0 16px" : "0 40px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        fontFamily: "'Inter', sans-serif",
        gap: "12px",
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate("/portal/dashboard")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "10px", padding: 0,
          flexShrink: 0,
        }}
      >
        <span style={{
          color: "#fffbe0", fontSize: "14px", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          PDC
        </span>
        {!isMobile && (
          <>
            <span style={{ width: "1px", height: "16px", backgroundColor: "rgba(255,251,224,0.15)" }} />
            <span style={{
              color: "rgba(255,251,224,0.35)", fontSize: "10px", fontWeight: 500,
              letterSpacing: "0.25em", textTransform: "uppercase",
            }}>
              Client Portal
            </span>
          </>
        )}
      </button>

      <div style={{ flex: 1 }} />

      {/* Desktop: full nav row */}
      {!isMobile ? (
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <button
            onClick={() => navigate("/portal/dashboard")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
              color: "rgba(255,251,224,0.35)", fontSize: "11px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif", transition: "color 0.2s ease", padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.35)")}
          >
            <LayoutDashboard size={13} />
            Dashboard
          </button>

          <span style={{ width: "1px", height: "16px", backgroundColor: "rgba(255,251,224,0.08)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px",
              backgroundColor: "#3e250a",
              border: "1px solid rgba(200,144,90,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#c8905a", fontSize: "11px", fontWeight: 700 }}>{initial}</span>
            </div>
            <span style={{ color: "rgba(255,251,224,0.55)", fontSize: "12px", fontWeight: 400, letterSpacing: "0.04em" }}>
              {name}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              background: "none", border: "1px solid rgba(255,251,224,0.08)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
              color: "rgba(255,251,224,0.3)", fontSize: "11px",
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif", padding: "7px 14px", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.25)"; e.currentTarget.style.color = "rgba(255,251,224,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)"; e.currentTarget.style.color = "rgba(255,251,224,0.3)"; }}
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      ) : (
        /* Mobile: avatar + dashboard icon + sign out icon */
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate("/portal/dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.4)", padding: "4px", display: "flex" }}
          >
            <LayoutDashboard size={18} />
          </button>
          <div style={{
            width: "30px", height: "30px",
            backgroundColor: "#3e250a",
            border: "1px solid rgba(200,144,90,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "#c8905a", fontSize: "12px", fontWeight: 700 }}>{initial}</span>
          </div>
          <button
            onClick={handleSignOut}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.35)", padding: "4px", display: "flex" }}
          >
            <LogOut size={17} />
          </button>
        </div>
      )}
    </nav>
  );
}
