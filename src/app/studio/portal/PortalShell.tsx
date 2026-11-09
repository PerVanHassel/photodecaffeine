import { PdcLogo } from "../../components/PdcLogo";
import { QueryClientProvider } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Eye, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { Toaster } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { setViewAsClient, viewAsClient } from "../api";
import { initials } from "../format";
import { queryClient } from "../queries";
import { StudioFonts } from "../fonts";
import "../studio.css";
import { Button, ConfirmProvider, skipToMain } from "../ui";
import { useMe, usePortalProjects } from "./data";
import { usePortalLanguage, useT } from "./i18n";

export function PortalShell() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const viewAs = useViewAs();
  if (loading) return <div className="studio" aria-busy="true" />;
  if (!session) return <Navigate to={`/portal/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <Frame viewAs={viewAs} />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}

/**
 * The studio looking along as a client: ?als=<client id> from the client page
 * starts it for this browser tab, "Stoppen" ends it. The edge function checks
 * that it is the studio, and saves nothing unless it is a test client.
 */
function useViewAs(): string {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("als");
  const [id] = useState(() => {
    if (fromUrl !== null && fromUrl !== viewAsClient()) {
      setViewAsClient(fromUrl);
      // Another client's portal: nothing of the one before may show.
      queryClient.removeQueries({ queryKey: ["portal"] });
    }
    return viewAsClient();
  });
  useEffect(() => {
    if (fromUrl === null) return;
    const rest = new URLSearchParams(params);
    rest.delete("als");
    setParams(rest, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return id;
}

function Frame({ viewAs }: { viewAs: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projects = usePortalProjects();
  const me = useMe();
  // An account made to buy photos has no portal: its photos are at Mijn foto's.
  useEffect(() => {
    if ((me.data as { buyer?: boolean } | undefined)?.buyer && !viewAs) window.location.replace("/mijn-fotos");
  }, [me.data, viewAs]);
  const unread = (projects.data?.projects || []).reduce((s, p) => s + (p.unreadMessages || 0), 0);
  // Looking along, the portal shows the client's name, not the studio's.
  const name = viewAs ? me.data?.name || "" : user?.user_metadata?.name || user?.email || "";
  const t = useT();
  const { language, choose } = usePortalLanguage();

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  function stopViewing() {
    setViewAsClient("");
    queryClient.removeQueries({ queryKey: ["portal"] });
    navigate(`/admin/client/${viewAs}`);
  }

  return (
    <div className="studio">
      <Helmet>
        <meta name="theme-color" content="#ffffff" />
      </Helmet>
      <StudioFonts />
      <a href="#portal-main" className="s-skip" onClick={skipToMain("portal-main")}>{t.skipToContent}</a>
      {viewAs && (
        <div className={me.data?.isTest ? "p-viewas test" : "p-viewas"} role="status">
          <Eye aria-hidden="true" />
          <span>
            <b>Voorbeeld</b> · Je ziet het portaal zoals {me.data?.name || "deze klant"} het ziet.{" "}
            {me.data?.isTest ? "Testklant: wat je hier doet, wordt echt opgeslagen." : "Alleen kijken: er wordt niets opgeslagen."}
          </span>
          <span className="p-viewas-end">
            <Link to={`/admin/client/${viewAs}`}>Naar de klant</Link>
            <button type="button" onClick={stopViewing}>Stoppen</button>
          </span>
        </div>
      )}
      <header className="p-top">
        <NavLink to="/portal/dashboard" className="s-brand" aria-label="Naar het overzicht">
          <PdcLogo className="s-logo" width={150} height={28} />
          <span className="s-brand-tag">{t.portal}</span>
        </NavLink>
        <nav aria-label={t.portal}>
          <NavLink to="/portal/dashboard" className={({ isActive }) => (isActive ? "active" : undefined)}>{t.navOverview}</NavLink>
          <NavLink to="/portal/documents" className={({ isActive }) => (isActive ? "active" : undefined)}>{t.navDocuments}</NavLink>
          <NavLink to="/portal/messages" className={({ isActive }) => (isActive ? "active" : undefined)}>
            {t.navMessages}{unread > 0 && <><span className="dot" aria-hidden="true" /><span className="s-sr">, {t.unread(unread)}</span></>}
          </NavLink>
          <NavLink to="/portal/account" className={({ isActive }) => (isActive ? "active" : undefined)}>{t.navAccount}</NavLink>
        </nav>
        <div className="right">
          <div className="s-seg" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={language === "nl"} onClick={() => choose("nl")}>NL</button>
            <button type="button" aria-pressed={language === "en"} onClick={() => choose("en")}>EN</button>
          </div>
          <span className="s-avatar" title={name} aria-hidden="true">{initials(name)}</span>
          {/* Signing out here would sign the studio out of the admin. */}
          {!viewAs && <Button variant="ghost" size="sm" iconOnly aria-label={t.signOut} title={t.signOut} icon={<LogOut />} onClick={async () => { await signOut(); navigate("/portal/login"); }} />}
        </div>
      </header>
      <div id="portal-main" tabIndex={-1} className="p-main-anchor">
        <Outlet />
      </div>
      <Toaster position="bottom-center" richColors toastOptions={{ style: { fontFamily: "var(--ui)" } }} />
    </div>
  );
}
