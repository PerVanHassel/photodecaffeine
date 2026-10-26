import { Monitor, Smartphone, Tablet } from "lucide-react";
import { percent } from "../../format";

// The shapes the analytics routes answer with (routes/analytics.ts and the SQL
// functions in 20261026120000_site_analytics.sql), and the words for them.

export type Totals = {
  sessions: number;
  visitors: number;
  pageviews: number;
  bounces: number;
  seconds: number;
  conversions: number;
  returning?: number;
  paid?: number;
};

export type Summary = {
  since: string;
  totals: Totals;
  previous: Totals;
  daily: { day: string; sessions: number; paid: number; conversions: number }[];
  funnel: { sessions: number; engaged: number; clicked: number; form: number; converted: number };
  sources: { source: string; medium: string; sessions: number; visitors: number; bounces: number; seconds: number; pages: number; conversions: number }[];
  campaigns: CampaignStats[];
  variants: { campaign: string; content: string; sessions: number; bounces: number; seconds: number; scroll: number | null; conversions: number }[];
  landing: { path: string; sessions: number; bounces: number; seconds: number; scroll: number | null; conversions: number }[];
  pages: { path: string; views: number; sessions: number; scroll: number | null; seconds: number | null; exits: number }[];
  devices: { device: string; sessions: number; bounces: number; conversions: number }[];
  /** [ISO weekday 1-7, hour 0-23, visits] */
  hours: [number, number, number][];
  events: { label: string; count: number; sessions: number }[];
  referrers: { referrer: string; sessions: number; conversions: number }[];
};

export type CampaignStats = {
  campaign: string;
  page: string;
  sessions: number;
  visitors: number;
  bounces: number;
  seconds: number;
  scroll: number | null;
  clicked: number;
  forms: number;
  conversions: number;
  first: string;
  last: string;
};

export type PageStats = {
  views: number;
  sessions: number;
  seconds: number;
  scroll: number;
  entries: number;
  exits: number;
  /** [depth %, all views, phone views, other views] that got at least that far. */
  reach: [number, number, number, number][];
  clicks: number;
  rage: number;
  targets: { label: string; target: string; kind: string; count: number; sessions: number }[];
  /** [x share, y share, device] */
  points: [number, number, string][];
  from: { path: string; count: number }[];
  next: { path: string; count: number }[];
};

export type Visit = {
  id: string;
  started_at: string;
  last_seen_at: string;
  landing_page: string;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  paid: boolean;
  device: string;
  browser: string;
  os: string;
  returning: boolean;
  pageviews: number;
  active_seconds: number;
  converted_at: string | null;
  clicks?: number;
  scroll?: number | null;
  inquiry?: string | null;
  screen?: string;
  language?: string;
  timezone?: string;
  term?: string;
};

export type VisitEvent = {
  type: "pageview" | "click" | "form" | "event";
  view_id: string;
  at: string;
  path: string;
  label: string;
  target: string;
  scroll: number | null;
  duration_ms: number | null;
  props: Record<string, string>;
};

export type VisitDetail = {
  visit: Visit;
  events: VisitEvent[];
  others: Visit[];
  inquiries: { id: string; name: string; created_at: string }[];
};

/** Campaign names, switches and the older visit counter (GET /admin/ads). */
export type AdsMeta = {
  visits: { ref: string; page: string; createdAt: string }[];
  leads: { id: string; name: string; ref: string; createdAt: string }[];
  campaigns: { ref: string; label: string; active: boolean; hidden: boolean }[];
};

export type Period = "1" | "7" | "30" | "90" | "365";
export const PERIODS: { value: Period; label: string }[] = [
  { value: "1", label: "Vandaag" },
  { value: "7", label: "7 dagen" },
  { value: "30", label: "30 dagen" },
  { value: "90", label: "90 dagen" },
  { value: "365", label: "Jaar" },
];

export type Device = "all" | "mobile" | "desktop" | "tablet";

/** The pages an ad can point to. */
export const LANDING_PAGES = [
  { path: "/services/fotografie/automotive", label: "Automotive" },
  { path: "/services/fotografie/sport", label: "Sport" },
  { path: "/services/fotografie", label: "Fotografie" },
  { path: "/", label: "Home" },
  { path: "/services/social-media", label: "Social media" },
  { path: "/portfolio", label: "Portfolio" },
];

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/portfolio": "Portfolio",
  "/about": "Over ons",
  "/services/fotografie": "Fotografie",
  "/services/fotografie/automotive": "Automotive",
  "/services/fotografie/sport": "Sport",
  "/services/videografie": "Videografie",
  "/services/website": "Websites",
  "/services/social-media": "Social media",
  "/bedankt": "Bedankt (aanvraag verstuurd)",
  "/privacybeleid": "Privacybeleid",
  "/algemene-voorwaarden": "Algemene voorwaarden",
  "/cookiebeleid": "Cookiebeleid",
};

/** "Automotive", or the path itself for pages without a name (a portfolio article). */
export function pageName(path: string): string {
  if (!path) return "–";
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  if (path.startsWith("/portfolio/")) return "Portfolio-artikel";
  return path;
}

const MEDIUM: Record<string, string> = {
  paid: "Advertentie",
  cpc: "Advertentie",
  ppc: "Advertentie",
  cpm: "Advertentie",
  paid_social: "Advertentie",
  paidsocial: "Advertentie",
  organic: "Zoekmachine",
  social: "Social media",
  referral: "Andere site",
  direct: "Direct",
  ai: "AI-assistent",
  email: "E-mail",
};

export const mediumName = (medium: string) => MEDIUM[medium] || medium || "–";

export function DeviceIcon({ device, size = 14 }: { device: string; size?: number }) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
  return <Icon size={size} aria-label={deviceName(device)} />;
}

export const deviceName = (d: string) => (d === "mobile" ? "Telefoon" : d === "tablet" ? "Tablet" : d === "desktop" ? "Computer" : d || "Onbekend");

/** 75 → "1:15", 3700 → "1:01:40". */
export function duration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

export const share = (part: number, whole: number) => (whole ? percent(part / whole) : "–");

/** The change against the period before, as a small up/down mark. Lower is better for bounces. */
export function Delta({ now, before, lowerIsBetter }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before && !now) return null;
  if (!before) return <span className="a-delta up">nieuw</span>;
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span className="a-delta">gelijk</span>;
  const good = lowerIsBetter ? change < 0 : change > 0;
  return (
    <span className={`a-delta ${good ? "up" : "down"}`} title="Tegenover de periode ervoor">
      {change > 0 ? "▲" : "▼"} {percent(Math.abs(change))}
    </span>
  );
}

/** The public address of a page plus a campaign's parameters. */
export function campaignUrl(page: string, ref: string, source = "", content = ""): string {
  const params = new URLSearchParams({ ref });
  if (source) params.set("utm_source", source);
  if (content) params.set("utm_content", content);
  return `https://www.photodecaffeine.com${page}?${params}`;
}
