import { Outlet, Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { PortalNav } from "./PortalNav";

export function PortalLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#080401",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "32px",
              height: "2px",
              backgroundColor: "#c8905a",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: "rgba(255,251,224,0.3)",
              fontSize: "10px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Loading
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/portal/login" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080401",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <PortalNav />
      <Outlet />
    </div>
  );
}
