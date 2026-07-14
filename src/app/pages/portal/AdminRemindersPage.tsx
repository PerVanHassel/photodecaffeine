import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle, Clock, Lightbulb, TrendingUp, RefreshCw,
  Mail, Users, Images, ChevronRight, CheckCircle, Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { projectId } from "/utils/supabase/info";

type Priority = "urgent" | "attention" | "tip" | "growth";

type ActionItem = {
  id: string;
  priority: Priority;
  icon: React.ReactNode;
  title: string;
  description: string;
  route?: string;
  cta?: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  package: string;
  message: string;
  createdAt: string;
  status?: string;
};

type Client = {
  id: string;
  name: string;
  email: string;
  projectCount: number;
  createdAt: string;
  lastSignIn: string | null;
};

type Article = {
  id: string;
  title: string;
  category: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
};

const SEASONAL_TIPS: Record<number, { title: string; description: string }> = {
  0:  { title: "Nieuwjaars-push", description: "Januari is ideaal voor bedrijfsportraits en nieuwe branding — stuur een mailtje naar je netwerk." },
  1:  { title: "Valentijn & liefde-sessies", description: "Koppelshoot of 'surprise gift' pakketten promoten via social kan in februari goed converteren." },
  2:  { title: "Lente-shoots aankondigen", description: "Buiten fotografie en lifestyle-content schieten goed in het voorjaar — promoot nu." },
  3:  { title: "Outdoor & lifestyle seizoen", description: "April biedt zachte lichten en bloesem. Perfecte maand om je portfolio aan te vullen." },
  4:  { title: "Bruiloftseizoen start", description: "Mei = eerste trouwerijen. Zorg dat je 'Trouwen' categorie in je portfolio sterk is." },
  5:  { title: "Zomer = gouden uur", description: "Lange daglichten = avond-shoots. Overweeg een speciale zomer-aanbieding." },
  6:  { title: "Outdoor op z'n best", description: "Juli biedt de langste avonden voor portraits. Promoot outdoor-sessies actief." },
  7:  { title: "Laatste zomerkans", description: "Augustus eindigt het zomerseizoen. Push nu nog voor resterende slots." },
  8:  { title: "Gouden uur & herfst", description: "September heeft het mooiste licht van het jaar. Perfect voor portfolio-aanvulling." },
  9:  { title: "Herfst-portraits", description: "Oktober: warme kleuren, mooi licht. Families en koppels boeken graag in de herfst." },
  10: { title: "Einde-jaar bedrijfsshoots", description: "November = bedrijfsportraits en jaarverslagen. Actief benaderen kan lonen." },
  11: { title: "Feestdagen & nieuwjaar-promo", description: "December: kerst-gerelateerde content en nieuwjaarsplannen voor Q1 klanten." },
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 3600000;
}

function buildActionItems(
  inquiries: Inquiry[],
  clients: Client[],
  articles: Article[],
): ActionItem[] {
  const items: ActionItem[] = [];
  const now = new Date();
  const month = now.getMonth();

  const pending = inquiries.filter(i => i.name !== "__ad_visit__" && (!i.status || i.status === "pending"));

  // --- URGENT ---

  // New inquiry in last 4h
  const veryNew = pending.filter(i => hoursAgo(i.createdAt) < 4);
  if (veryNew.length > 0) {
    items.push({
      id: "new-inquiry-hot",
      priority: "urgent",
      icon: <Zap size={16} />,
      title: `${veryNew.length} nieuwe aanvra${veryNew.length === 1 ? "ag" : "gen"} — reageer snel`,
      description: `Snelle reactie verhoogt conversie aanzienlijk. ${veryNew[0].name} (${veryNew[0].package || "onbekend pakket"}) wacht op een reactie.`,
      route: "/admin/inquiries",
      cta: "Open aanvragen",
    });
  }

  // Inquiries pending > 48h
  const overdue = pending.filter(i => hoursAgo(i.createdAt) >= 48);
  if (overdue.length > 0) {
    items.push({
      id: "inquiry-overdue",
      priority: "urgent",
      icon: <AlertCircle size={16} />,
      title: `${overdue.length} aanvra${overdue.length === 1 ? "ag" : "gen"} wacht al 48u+`,
      description: `Na 48 uur daalt de kans op conversie fors. Reageer vandaag nog op ${overdue.map(i => i.name).slice(0, 2).join(", ")}${overdue.length > 2 ? ` en ${overdue.length - 2} anderen` : ""}.`,
      route: "/admin/inquiries",
      cta: "Behandel aanvragen",
    });
  }

  // --- ATTENTION ---

  // Inquiries pending 24-48h
  const slowing = pending.filter(i => hoursAgo(i.createdAt) >= 24 && hoursAgo(i.createdAt) < 48);
  if (slowing.length > 0 && overdue.length === 0) {
    items.push({
      id: "inquiry-24h",
      priority: "attention",
      icon: <Clock size={16} />,
      title: `${slowing.length} aanvra${slowing.length === 1 ? "ag" : "gen"} wacht 24u`,
      description: `Reageer vandaag om de kans op conversie hoog te houden.`,
      route: "/admin/inquiries",
      cta: "Bekijk aanvragen",
    });
  }

  // New clients with no project, joined > 3 days ago
  const clientsNoProject = clients.filter(c =>
    c.projectCount === 0 && daysSince(c.createdAt) > 3
  );
  if (clientsNoProject.length > 0) {
    items.push({
      id: "clients-no-project",
      priority: "attention",
      icon: <Users size={16} />,
      title: `${clientsNoProject.length} klant${clientsNoProject.length === 1 ? "" : "en"} zonder project`,
      description: `${clientsNoProject.map(c => c.name).slice(0, 2).join(", ")}${clientsNoProject.length > 2 ? ` en ${clientsNoProject.length - 2} anderen` : ""} ${clientsNoProject.length === 1 ? "heeft" : "hebben"} een account maar nog geen project — zet een shoot op.`,
      route: "/admin/clients",
      cta: "Beheer klanten",
    });
  }

  // Clients inactive > 60 days
  const staleClients = clients.filter(c =>
    c.lastSignIn && daysSince(c.lastSignIn) > 60
  );
  if (staleClients.length >= 3) {
    items.push({
      id: "stale-clients",
      priority: "attention",
      icon: <Clock size={16} />,
      title: `${staleClients.length} klanten al 60+ dagen inactief`,
      description: `Een persoonlijk berichtje kan ze terugbrengen — en leidt vaak tot een nieuwe boeking of referral.`,
      route: "/admin/clients",
      cta: "Bekijk klanten",
    });
  }

  // --- TIPS ---

  const published = articles.filter(a => a.published && a.id !== "__automotive_gallery__");

  // Portfolio too thin
  if (published.length < 5) {
    items.push({
      id: "portfolio-thin",
      priority: "tip",
      icon: <Images size={16} />,
      title: "Portfolio is smal — voeg meer werk toe",
      description: `${published.length} gepubliceerde artikel${published.length === 1 ? "" : "en"} is weinig. Potentiële klanten willen variatie zien. Doel: minimaal 8 sterke projecten.`,
      route: "/admin/portfolio",
      cta: "Portfolio bewerken",
    });
  }

  // Portfolio not updated in 30+ days
  const newestPublished = published.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  if (newestPublished && daysSince(newestPublished.createdAt) > 30) {
    items.push({
      id: "portfolio-stale",
      priority: "tip",
      icon: <Images size={16} />,
      title: `Portfolio niet bijgewerkt in ${daysSince(newestPublished.createdAt)} dagen`,
      description: "Vers werk laat zien dat je actief bent. Voeg een recent project toe, ook al is het klein.",
      route: "/admin/portfolio",
      cta: "Voeg werk toe",
    });
  }

  // Too few featured articles
  const featured = published.filter(a => a.featured);
  if (published.length >= 4 && featured.length < 3) {
    items.push({
      id: "featured-low",
      priority: "tip",
      icon: <Images size={16} />,
      title: "Weinig werk uitgelicht op homepage",
      description: `${featured.length} van 6 homepage-slots bezet. Markeer je sterkste projecten als 'featured' — eerste indruk telt.`,
      route: "/admin/portfolio",
      cta: "Markeer uitgelicht werk",
    });
  }

  // Category diversity
  const categories = new Set(published.map(a => (a.category || "").toLowerCase()).filter(Boolean));
  if (categories.size < 2 && published.length >= 3) {
    items.push({
      id: "category-gap",
      priority: "tip",
      icon: <Images size={16} />,
      title: "Portfolio mist diversiteit in categorieën",
      description: "Meerdere genres aantonen (portrait, branding, lifestyle, editorial) spreekt een breder publiek aan.",
      route: "/admin/portfolio",
      cta: "Portfolio bewerken",
    });
  }

  // Low inquiry volume (< 2 in last 30 days)
  const recentInquiries = inquiries.filter(i => daysSince(i.createdAt) <= 30);
  if (recentInquiries.length < 2) {
    items.push({
      id: "low-inquiries",
      priority: "tip",
      icon: <Mail size={16} />,
      title: "Weinig aanvragen de afgelopen maand",
      description: `${recentInquiries.length} aanvraag${recentInquiries.length === 1 ? "" : "en"} in 30 dagen. Overweeg een actie op social media of verstuur een nieuwsbrief naar oud-klanten.`,
      route: "/admin/inquiries",
      cta: "Bekijk aanvragen",
    });
  }

  // --- GROWTH ---

  // High inquiries but low clients (conversion tip)
  const last90Inquiries = inquiries.filter(i => daysSince(i.createdAt) <= 90).length;
  const last90Clients = clients.filter(c => daysSince(c.createdAt) <= 90).length;
  if (last90Inquiries >= 5 && last90Clients < last90Inquiries * 0.2) {
    items.push({
      id: "conversion-gap",
      priority: "growth",
      icon: <TrendingUp size={16} />,
      title: "Hoge interesse, lage conversie",
      description: `${last90Inquiries} aanvragen, maar slechts ${last90Clients} nieuwe klant${last90Clients === 1 ? "" : "en"} in 90 dagen. Snellere follow-up of een duidelijkere prijspagina kan het verschil maken.`,
      route: "/admin/inquiries",
      cta: "Analyseer aanvragen",
    });
  }

  // Ask for testimonials — clients with projects active > 30 days
  const clientsWithWork = clients.filter(c => c.projectCount > 0 && daysSince(c.createdAt) > 30);
  if (clientsWithWork.length > 0) {
    items.push({
      id: "testimonials",
      priority: "growth",
      icon: <TrendingUp size={16} />,
      title: "Vraag tevreden klanten om een review",
      description: `${clientsWithWork.length} klant${clientsWithWork.length === 1 ? " heeft" : "en hebben"} al een project afgerond. Reviews op Google of social media zijn gratis marketing.`,
      cta: "Stuur bedankmail",
    });
  }

  // Seasonal tip
  const seasonal = SEASONAL_TIPS[month];
  items.push({
    id: "seasonal",
    priority: "growth",
    icon: <Lightbulb size={16} />,
    title: seasonal.title,
    description: seasonal.description,
  });

  return items;
}

const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  color: string;
  bg: string;
  border: string;
  headerBg: string;
}> = {
  urgent:    { label: "Urgent",    color: "#e07060", bg: "rgba(224,112,96,0.07)",  border: "rgba(224,112,96,0.2)",  headerBg: "rgba(224,112,96,0.1)" },
  attention: { label: "Aandacht",  color: "#c8a030", bg: "rgba(200,160,48,0.07)",  border: "rgba(200,160,48,0.2)",  headerBg: "rgba(200,160,48,0.1)" },
  tip:       { label: "Tip",       color: "#5a82c8", bg: "rgba(90,130,200,0.07)",  border: "rgba(90,130,200,0.2)",  headerBg: "rgba(90,130,200,0.1)" },
  growth:    { label: "Groei",     color: "#5a9a6a", bg: "rgba(90,154,106,0.07)",  border: "rgba(90,154,106,0.2)",  headerBg: "rgba(90,154,106,0.1)" },
};

export function AdminRemindersPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const base = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;
      const [inqRes, cliRes, artRes] = await Promise.all([
        fetch(`${base}/admin/inquiries`, { headers }),
        fetch(`${base}/admin/clients`, { headers }),
        fetch(`${base}/admin/portfolio`, { headers }),
      ]);
      const [inqData, cliData, artData] = await Promise.all([
        inqRes.json(), cliRes.json(), artRes.json(),
      ]);
      setInquiries(inqData.inquiries || []);
      setClients(cliData.clients || []);
      setArticles((artData.articles || []).filter((a: Article) => a.id !== "__automotive_gallery__"));
      setRefreshedAt(new Date());
    } catch {
      setError("Kon gegevens niet laden. Controleer je verbinding.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() =>
    buildActionItems(inquiries, clients, articles),
    [inquiries, clients, articles]
  );

  const grouped = useMemo(() => {
    const order: Priority[] = ["urgent", "attention", "tip", "growth"];
    return order
      .map(p => ({ priority: p, items: items.filter(i => i.priority === p) }))
      .filter(g => g.items.length > 0);
  }, [items]);

  const urgentCount = items.filter(i => i.priority === "urgent").length;

  if (loading) {
    return (
      <div style={{ padding: isMobile ? "24px 16px" : "40px", color: "rgba(255,251,224,0.3)", fontSize: "13px" }}>
        Actiepunten laden…
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "40px", fontFamily: "'Inter', sans-serif", maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
          Studio Intelligence
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px 0", lineHeight: 1.1 }}>
              Actiepunten
            </h1>
            <div style={{ color: "rgba(255,251,224,0.35)", fontSize: "13px" }}>
              {urgentCount > 0
                ? <span style={{ color: "#e07060" }}>{urgentCount} urgent{urgentCount === 1 ? "" : "e"} item{urgentCount === 1 ? "" : "s"}</span>
                : <span style={{ color: "#5a9a6a" }}>Alles op orde</span>
              }
              {" · "}bijgewerkt om {refreshedAt.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <button
            onClick={load}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(255,251,224,0.1)", color: "rgba(255,251,224,0.4)", padding: "8px 14px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fffbe0"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,251,224,0.4)"; e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)"; }}
          >
            <RefreshCw size={12} />
            Vernieuwen
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "rgba(224,112,96,0.1)", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060", padding: "14px 16px", fontSize: "13px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* All groups */}
      {grouped.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,251,224,0.2)", fontSize: "13px" }}>
          <CheckCircle size={32} style={{ margin: "0 auto 16px", display: "block", color: "#5a9a6a" }} />
          Geen actiepunten — alles ziet er goed uit.
        </div>
      )}

      {grouped.map(({ priority, items: groupItems }) => {
        const cfg = PRIORITY_CONFIG[priority];
        return (
          <div key={priority} style={{ marginBottom: "32px" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: cfg.color, flexShrink: 0 }} />
              <span style={{ color: cfg.color, fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                {cfg.label}
              </span>
              <span style={{ color: "rgba(255,251,224,0.15)", fontSize: "11px" }}>
                {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {groupItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    padding: isMobile ? "16px" : "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}
                >
                  <div style={{ color: cfg.color, flexShrink: 0, marginTop: "2px" }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffbe0", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                      {item.title}
                    </div>
                    <div style={{ color: "rgba(255,251,224,0.45)", fontSize: "12px", lineHeight: 1.6 }}>
                      {item.description}
                    </div>
                  </div>
                  {item.route ? (
                    <button
                      onClick={() => navigate(item.route!)}
                      style={{
                        flexShrink: 0,
                        display: "flex", alignItems: "center", gap: "5px",
                        backgroundColor: "transparent",
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        padding: "8px 12px",
                        fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        whiteSpace: "nowrap", transition: "all 0.2s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = cfg.headerBg; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      {item.cta || "Bekijk"}
                      <ChevronRight size={11} />
                    </button>
                  ) : item.cta ? (
                    <span style={{ flexShrink: 0, color: cfg.color, fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: "10px", whiteSpace: "nowrap" }}>
                      {item.cta}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
