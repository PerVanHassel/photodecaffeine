import logo from "@/imports/pdc-logo-dark.png";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  CalendarDays, CheckSquare, Euro, FileText, Globe, Images, Inbox, Kanban, Layers, LogOut, MapPin, Megaphone, Receipt,
  Search, Settings, Shield, Star, Sun, Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { isAdmin } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { CommandPalette } from "./CommandPalette";
import { StudioFonts } from "./fonts";
import { initials } from "./format";
import { queryClient, useMe, useOverview } from "./queries";
import "./studio.css";
import { Button, ConfirmProvider } from "./ui";

export function StudioShell() {
  const { session, user, loading } = useAuth();
  if (loading) return <div className="studio" aria-busy="true" />;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/portal/login" replace />;
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const overview = useOverview();
  const me = useMe();
  // Until the role is known everything shows; the server checks each request anyway.
  const can = (perm?: string) => !perm || !me.data || me.data.permissions[perm] !== false;
  const o = overview.data;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const name = user?.user_metadata?.name || user?.email || "Admin";
  const waiting = (o?.unreadMessages.length || 0) + (o?.overdueInvoices.length || 0);

  return (
    <div className="studio">
      <StudioFonts />
      <div className="s-app">
        <aside className="s-rail">
          <NavLink to="/admin" end className="s-brand" aria-label="Naar Vandaag">
            <img src={logo} alt="PDC Productions" width={168} height={32} />
            <span className="s-brand-tag">Studio</span>
          </NavLink>
          <button className="s-search-btn" type="button" onClick={() => setPaletteOpen(true)}>
            <Search size={15} /> Zoeken of actie <kbd>Ctrl K</kbd>
          </button>
          <nav className="s-nav" aria-label="Werk">
            <span className="s-eyebrow">Werk</span>
            <NavItem to="/admin" end icon={<Sun />} label="Vandaag" dot={waiting || undefined} />
            <NavItem show={can("manageClients")} to="/admin/pipeline" icon={<Kanban />} label="Pijplijn" />
            <NavItem show={can("manageClients")} to="/admin/planning" icon={<CalendarDays />} label="Planning" />
            <NavItem show={can("manageClients")} to="/admin/locations" icon={<MapPin />} label="Locaties" />
            <NavItem show={can("manageClients")} to="/admin/tasks" icon={<CheckSquare />} label="Taken" count={o?.tasks.length || undefined} />
          </nav>
          <nav className="s-nav" aria-label="Relaties">
            <span className="s-eyebrow">Relaties</span>
            <NavItem show={can("manageClients")} to="/admin/clients" icon={<Users />} label="Klanten" />
            <NavItem show={can("manageInquiries")} to="/admin/inquiries" icon={<Inbox />} label="Aanvragen" dot={o?.newInquiries.length || undefined} />
            <NavItem show={can("manageQuotes")} to="/admin/quotes" icon={<FileText />} label="Offertes" />
            <NavItem show={can("manageQuotes")} to="/admin/invoices" icon={<Euro />} label="Facturen" />
          </nav>
          <nav className="s-nav secondary" aria-label="Website">
            <span className="s-eyebrow">Website</span>
            <NavItem show={can("managePortfolio")} to="/admin/portfolio" icon={<Images />} label="Portfolio" />
            <NavItem show={can("managePortfolio")} to="/admin/services/automotive" icon={<Layers />} label="Automotive" />
            <NavItem show={can("managePortfolio")} to="/admin/reviews" icon={<Star />} label="Reviews" />
            <NavItem show={can("manageAds")} to="/admin/ads" icon={<Megaphone />} label="Advertenties" />
            <NavItem show={can("manageClients")} to="/admin/demos" icon={<Globe />} label="Webdemo's" />
            <NavItem show={can("manageSettings")} to="/admin/settings" icon={<Settings />} label="Instellingen" />
          </nav>
          <nav className="s-nav secondary" aria-label="Beheer">
            <span className="s-eyebrow">Beheer</span>
            <NavItem show={can("manageAdmins")} to="/admin/team" icon={<Shield />} label="Team & rollen" />
            <NavItem to="/admin/declarations" icon={<Receipt />} label="Declaraties" />
          </nav>
          <div className="s-rail-foot">
            <div className="s-avatar" aria-hidden="true">{initials(name)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <b className="s-truncate" style={{ fontSize: 13, display: "block" }}>{name}</b>
              <span className="s-faint" style={{ fontSize: 11.5 }}>{me.data?.roleName || "Admin"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Uitloggen"
              title="Uitloggen"
              icon={<LogOut />}
              onClick={async () => { await signOut(); navigate("/admin/login"); }}
            />
          </div>
        </aside>
        <main className="s-main">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: "var(--ui)" } }} />
    </div>
  );
}

function NavItem({ to, icon, label, count, dot, end, show = true }: {
  to: string; icon: React.ReactNode; label: string; count?: number; dot?: number; end?: boolean; show?: boolean;
}) {
  if (!show) return null;
  return (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "active" : undefined)}>
      {icon}
      <span>{label}</span>
      {dot ? <span className="dot" aria-label={`${dot} nieuw`}>{dot}</span> : count ? <span className="count">{count}</span> : null}
    </NavLink>
  );
}
