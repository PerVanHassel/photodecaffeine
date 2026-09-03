/**
 * The "Actiepunten" rule engine.
 *
 * Extracted from AdminRemindersPage so the desktop panel and the mobile app run
 * the same rules instead of two copies that drift apart — these thresholds
 * ("48 uur", "minimaal 8 projecten", "6 homepage-slots") are business decisions,
 * and having two answers to "when is an aanvraag late?" is worse than having a
 * slightly awkward shared module.
 *
 * Deliberately framework-free: it names an icon rather than returning one, so
 * each front end can render it in its own idiom (lucide element on desktop,
 * themed glyph in the app) without this file importing React.
 */

export type Priority = "urgent" | "attention" | "tip" | "growth";

export type ActionIcon =
  | "zap"
  | "alert"
  | "clock"
  | "users"
  | "images"
  | "mail"
  | "trending"
  | "lightbulb";

export interface ActionItem {
  id: string;
  priority: Priority;
  icon: ActionIcon;
  title: string;
  description: string;
  /** Desktop admin route. Mobile maps these via `MOBILE_ROUTE`. */
  route?: string;
  cta?: string;
}

export interface ActionInquiry {
  id: string;
  name: string;
  email?: string;
  package?: string;
  createdAt: string;
  status?: string;
}

export interface ActionClient {
  id: string;
  name: string;
  projectCount: number;
  createdAt: string;
  lastSignIn: string | null;
}

export interface ActionArticle {
  id: string;
  category: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
}

/** Marker row the automotive gallery uses; never a real portfolio article. */
export const AUTOMOTIVE_GALLERY_ID = "__automotive_gallery__";

/** Synthetic inquiry rows written by ad-click tracking, not real leads. */
export const AD_VISIT_MARKER = "__ad_visit__";

const SEASONAL_TIPS: Record<number, { title: string; description: string }> = {
  0: { title: "Nieuwjaars-push", description: "Januari is ideaal voor bedrijfsportraits en nieuwe branding — stuur een mailtje naar je netwerk." },
  1: { title: "Valentijn & liefde-sessies", description: "Koppelshoot of 'surprise gift' pakketten promoten via social kan in februari goed converteren." },
  2: { title: "Lente-shoots aankondigen", description: "Buiten fotografie en lifestyle-content schieten goed in het voorjaar — promoot nu." },
  3: { title: "Outdoor & lifestyle seizoen", description: "April biedt zachte lichten en bloesem. Perfecte maand om je portfolio aan te vullen." },
  4: { title: "Bruiloftseizoen start", description: "Mei = eerste trouwerijen. Zorg dat je 'Trouwen' categorie in je portfolio sterk is." },
  5: { title: "Zomer = gouden uur", description: "Lange daglichten = avond-shoots. Overweeg een speciale zomer-aanbieding." },
  6: { title: "Outdoor op z'n best", description: "Juli biedt de langste avonden voor portraits. Promoot outdoor-sessies actief." },
  7: { title: "Laatste zomerkans", description: "Augustus eindigt het zomerseizoen. Push nu nog voor resterende slots." },
  8: { title: "Gouden uur & herfst", description: "September heeft het mooiste licht van het jaar. Perfect voor portfolio-aanvulling." },
  9: { title: "Herfst-portraits", description: "Oktober: warme kleuren, mooi licht. Families en koppels boeken graag in de herfst." },
  10: { title: "Einde-jaar bedrijfsshoots", description: "November = bedrijfsportraits en jaarverslagen. Actief benaderen kan lonen." },
  11: { title: "Feestdagen & nieuwjaar-promo", description: "December: kerst-gerelateerde content en nieuwjaarsplannen voor Q1 klanten." },
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "attention", "tip", "growth"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  attention: "Aandacht",
  tip: "Tip",
  growth: "Groei",
};

/** Maps a desktop admin route onto its equivalent app screen. */
export const MOBILE_ROUTE: Record<string, string> = {
  "/admin/inquiries": "/app/inbox",
  "/admin/clients": "/app/clients",
  "/admin/portfolio": "/app/portfolio",
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 3600000;
}

export function buildActionItems(
  inquiries: ActionInquiry[],
  clients: ActionClient[],
  articles: ActionArticle[]
): ActionItem[] {
  const items: ActionItem[] = [];
  const month = new Date().getMonth();

  const pending = inquiries.filter(
    (i) => i.name !== AD_VISIT_MARKER && (!i.status || i.status === "pending")
  );

  // ── Urgent ──────────────────────────────────────────────────────────────

  const veryNew = pending.filter((i) => hoursAgo(i.createdAt) < 4);
  if (veryNew.length > 0) {
    items.push({
      id: "new-inquiry-hot",
      priority: "urgent",
      icon: "zap",
      title: `${veryNew.length} nieuwe aanvra${veryNew.length === 1 ? "ag" : "gen"} — reageer snel`,
      description: `Snelle reactie verhoogt conversie aanzienlijk. ${veryNew[0].name} (${veryNew[0].package || "onbekend pakket"}) wacht op een reactie.`,
      route: "/admin/inquiries",
      cta: "Open aanvragen",
    });
  }

  const overdue = pending.filter((i) => hoursAgo(i.createdAt) >= 48);
  if (overdue.length > 0) {
    items.push({
      id: "inquiry-overdue",
      priority: "urgent",
      icon: "alert",
      title: `${overdue.length} aanvra${overdue.length === 1 ? "ag" : "gen"} wacht al 48u+`,
      description: `Na 48 uur daalt de kans op conversie fors. Reageer vandaag nog op ${overdue
        .map((i) => i.name)
        .slice(0, 2)
        .join(", ")}${overdue.length > 2 ? ` en ${overdue.length - 2} anderen` : ""}.`,
      route: "/admin/inquiries",
      cta: "Behandel aanvragen",
    });
  }

  // ── Aandacht ────────────────────────────────────────────────────────────

  const slowing = pending.filter((i) => hoursAgo(i.createdAt) >= 24 && hoursAgo(i.createdAt) < 48);
  if (slowing.length > 0 && overdue.length === 0) {
    items.push({
      id: "inquiry-24h",
      priority: "attention",
      icon: "clock",
      title: `${slowing.length} aanvra${slowing.length === 1 ? "ag" : "gen"} wacht 24u`,
      description: "Reageer vandaag om de kans op conversie hoog te houden.",
      route: "/admin/inquiries",
      cta: "Bekijk aanvragen",
    });
  }

  const clientsNoProject = clients.filter((c) => c.projectCount === 0 && daysSince(c.createdAt) > 3);
  if (clientsNoProject.length > 0) {
    items.push({
      id: "clients-no-project",
      priority: "attention",
      icon: "users",
      title: `${clientsNoProject.length} klant${clientsNoProject.length === 1 ? "" : "en"} zonder project`,
      description: `${clientsNoProject
        .map((c) => c.name)
        .slice(0, 2)
        .join(", ")}${clientsNoProject.length > 2 ? ` en ${clientsNoProject.length - 2} anderen` : ""} ${
        clientsNoProject.length === 1 ? "heeft" : "hebben"
      } een account maar nog geen project — zet een shoot op.`,
      route: "/admin/clients",
      cta: "Beheer klanten",
    });
  }

  const staleClients = clients.filter((c) => c.lastSignIn && daysSince(c.lastSignIn) > 60);
  if (staleClients.length >= 3) {
    items.push({
      id: "stale-clients",
      priority: "attention",
      icon: "clock",
      title: `${staleClients.length} klanten al 60+ dagen inactief`,
      description:
        "Een persoonlijk berichtje kan ze terugbrengen — en leidt vaak tot een nieuwe boeking of referral.",
      route: "/admin/clients",
      cta: "Bekijk klanten",
    });
  }

  // ── Tips ────────────────────────────────────────────────────────────────

  const published = articles.filter((a) => a.published && a.id !== AUTOMOTIVE_GALLERY_ID);

  if (published.length < 5) {
    items.push({
      id: "portfolio-thin",
      priority: "tip",
      icon: "images",
      title: "Portfolio is smal — voeg meer werk toe",
      description: `${published.length} gepubliceerde artikel${
        published.length === 1 ? "" : "en"
      } is weinig. Potentiële klanten willen variatie zien. Doel: minimaal 8 sterke projecten.`,
      route: "/admin/portfolio",
      cta: "Portfolio bewerken",
    });
  }

  // Copy before sorting — sort mutates, and `published` is reused below.
  const newestPublished = [...published].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  if (newestPublished && daysSince(newestPublished.createdAt) > 30) {
    items.push({
      id: "portfolio-stale",
      priority: "tip",
      icon: "images",
      title: `Portfolio niet bijgewerkt in ${daysSince(newestPublished.createdAt)} dagen`,
      description:
        "Vers werk laat zien dat je actief bent. Voeg een recent project toe, ook al is het klein.",
      route: "/admin/portfolio",
      cta: "Voeg werk toe",
    });
  }

  const featured = published.filter((a) => a.featured);
  if (published.length >= 4 && featured.length < 3) {
    items.push({
      id: "featured-low",
      priority: "tip",
      icon: "images",
      title: "Weinig werk uitgelicht op homepage",
      description: `${featured.length} van 6 homepage-slots bezet. Markeer je sterkste projecten als 'featured' — eerste indruk telt.`,
      route: "/admin/portfolio",
      cta: "Markeer uitgelicht werk",
    });
  }

  const categories = new Set(
    published.map((a) => (a.category || "").toLowerCase()).filter(Boolean)
  );
  if (categories.size < 2 && published.length >= 3) {
    items.push({
      id: "category-gap",
      priority: "tip",
      icon: "images",
      title: "Portfolio mist diversiteit in categorieën",
      description:
        "Meerdere genres aantonen (portrait, branding, lifestyle, editorial) spreekt een breder publiek aan.",
      route: "/admin/portfolio",
      cta: "Portfolio bewerken",
    });
  }

  const recentInquiries = inquiries.filter((i) => daysSince(i.createdAt) <= 30);
  if (recentInquiries.length < 2) {
    items.push({
      id: "low-inquiries",
      priority: "tip",
      icon: "mail",
      title: "Weinig aanvragen de afgelopen maand",
      description: `${recentInquiries.length} aanvraag${
        recentInquiries.length === 1 ? "" : "en"
      } in 30 dagen. Overweeg een actie op social media of verstuur een nieuwsbrief naar oud-klanten.`,
      route: "/admin/inquiries",
      cta: "Bekijk aanvragen",
    });
  }

  // ── Groei ───────────────────────────────────────────────────────────────

  const last90Inquiries = inquiries.filter((i) => daysSince(i.createdAt) <= 90).length;
  const last90Clients = clients.filter((c) => daysSince(c.createdAt) <= 90).length;
  if (last90Inquiries >= 5 && last90Clients < last90Inquiries * 0.2) {
    items.push({
      id: "conversion-gap",
      priority: "growth",
      icon: "trending",
      title: "Hoge interesse, lage conversie",
      description: `${last90Inquiries} aanvragen, maar slechts ${last90Clients} nieuwe klant${
        last90Clients === 1 ? "" : "en"
      } in 90 dagen. Snellere follow-up of een duidelijkere prijspagina kan het verschil maken.`,
      route: "/admin/inquiries",
      cta: "Analyseer aanvragen",
    });
  }

  const clientsWithWork = clients.filter((c) => c.projectCount > 0 && daysSince(c.createdAt) > 30);
  if (clientsWithWork.length > 0) {
    items.push({
      id: "testimonials",
      priority: "growth",
      icon: "trending",
      title: "Vraag tevreden klanten om een review",
      description: `${clientsWithWork.length} klant${
        clientsWithWork.length === 1 ? " heeft" : "en hebben"
      } al een project afgerond. Reviews op Google of social media zijn gratis marketing.`,
      cta: "Stuur bedankmail",
    });
  }

  const seasonal = SEASONAL_TIPS[month];
  items.push({
    id: "seasonal",
    priority: "growth",
    icon: "lightbulb",
    title: seasonal.title,
    description: seasonal.description,
  });

  return items;
}
