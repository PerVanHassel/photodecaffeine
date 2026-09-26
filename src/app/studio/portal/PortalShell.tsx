import logo from "@/imports/pdc-logo-dark.png";
import { QueryClientProvider } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useEffect } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { initials } from "../format";
import { queryClient } from "../queries";
import { StudioFonts } from "../fonts";
import "../studio.css";
import { Button, ConfirmProvider } from "../ui";
import { usePortalProjects } from "./data";

export function PortalShell() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="studio" aria-busy="true" />;
  if (!session) return <Navigate to={`/portal/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <Frame />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}

function Frame() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projects = usePortalProjects();
  const unread = (projects.data?.projects || []).reduce((s, p) => s + (p.unreadMessages || 0), 0);
  const name = user?.user_metadata?.name || user?.email || "";

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="studio">
      <StudioFonts />
      <header className="p-top">
        <NavLink to="/portal/dashboard" className="s-brand" aria-label="Naar het overzicht">
          <img src={logo} alt="PDC Productions" width={150} height={28} />
          <span className="s-brand-tag">Klantportaal</span>
        </NavLink>
        <nav aria-label="Portaal">
          <NavLink to="/portal/dashboard" className={({ isActive }) => (isActive ? "active" : undefined)}>Overzicht</NavLink>
          <NavLink to="/portal/documents" className={({ isActive }) => (isActive ? "active" : undefined)}>Offertes &amp; facturen</NavLink>
          <NavLink to="/portal/messages" className={({ isActive }) => (isActive ? "active" : undefined)}>
            Berichten{unread > 0 && <span className="dot" aria-label={`${unread} ongelezen`} />}
          </NavLink>
          <NavLink to="/portal/account" className={({ isActive }) => (isActive ? "active" : undefined)}>Account</NavLink>
        </nav>
        <div className="right">
          <span className="s-avatar" title={name} aria-hidden="true">{initials(name)}</span>
          <Button variant="ghost" size="sm" iconOnly aria-label="Uitloggen" title="Uitloggen" icon={<LogOut />} onClick={async () => { await signOut(); navigate("/portal/login"); }} />
        </div>
      </header>
      <Outlet />
      <Toaster position="bottom-center" richColors toastOptions={{ style: { fontFamily: "var(--ui)" } }} />
    </div>
  );
}
