import { differenceInCalendarDays, format, formatDistanceToNowStrict, isSameDay, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { enGB, nl } from "date-fns/locale";
import type { EventKind, Hold, LocationKind, PartKind, ProjectPart, ProjectType, Stage } from "./types";

// Dates in the admin read the way people say them: "morgen 18:15",
// "za 3 okt", "3 dagen geleden". Everything is shown in the viewer's timezone.

// The admin is Dutch; the portal switches to English when the client does.
let locale = nl;
let lang: "nl" | "en" = "nl";
export function setDateLocale(next: "nl" | "en") {
  lang = next;
  locale = next === "en" ? enGB : nl;
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmt(value: string | Date | null | undefined, pattern: string): string {
  const d = toDate(value);
  return d ? format(d, pattern, { locale }) : "";
}

export const fmtDate = (v: string | Date | null | undefined) => fmt(v, "d MMM yyyy");
export const fmtShort = (v: string | Date | null | undefined) => fmt(v, "EEE d MMM");
export const fmtTime = (v: string | Date | null | undefined) => fmt(v, "HH:mm");
export const fmtDateTime = (v: string | Date | null | undefined) => fmt(v, "EEE d MMM, HH:mm");

/** "vandaag", "morgen", "gisteren", or "za 3 okt". */
export function dayLabel(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  if (isToday(d)) return lang === "en" ? "today" : "vandaag";
  if (isTomorrow(d)) return lang === "en" ? "tomorrow" : "morgen";
  if (isYesterday(d)) return lang === "en" ? "yesterday" : "gisteren";
  return format(d, "EEE d MMM", { locale });
}

export function ago(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  if (Math.abs(Date.now() - d.getTime()) < 60_000) return lang === "en" ? "just now" : "zojuist";
  const s = formatDistanceToNowStrict(d, { locale, addSuffix: true });
  return s;
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  return d ? differenceInCalendarDays(d, new Date()) : null;
}

export { isSameDay, isToday };

const eurFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const eurRound = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** € 1.250 when round, € 1.250,50 otherwise. */
const pctFmt = new Intl.NumberFormat("nl-NL", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const oneDecimal = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0.025 → "2,5%". */
export const percent = (fraction: number) => pctFmt.format(fraction);
/** 4.5 → "4,5". */
export const decimal1 = (n: number) => oneDecimal.format(n);

/** 1572864 → "1,5 MB", 52428800 → "50 MB". */
export function fileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let unit = 0;
  while (n >= 1024 && unit < units.length - 1) { n /= 1024; unit++; }
  return `${unit >= 2 && n < 10 && n % 1 >= 0.05 ? oneDecimal.format(n) : Math.round(n)} ${units[unit]}`;
}

export function euro(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  return Math.round(n * 100) % 100 === 0 ? eurRound.format(n) : eurFmt.format(n);
}

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Aanvraag",
  quote: "Offerte",
  booked: "Geboekt",
  shoot: "Shoot",
  editing: "Bewerken",
  delivered: "Geleverd",
  review: "Review",
  archived: "Archief",
};
export const PIPELINE: Stage[] = ["lead", "quote", "booked", "shoot", "editing", "delivered", "review"];

export const TYPE_LABEL: Record<ProjectType, string> = { photo: "Foto", video: "Video", web: "Website" };

export const KIND_LABEL: Record<EventKind, string> = {
  shoot: "Shoot",
  meeting: "Meeting",
  deadline: "Deadline",
  edit: "Bewerken",
  other: "Overig",
};

export const LOCATION_KIND_LABEL: Record<LocationKind, string> = {
  urban: "Urban",
  nature: "Natuur",
  beach: "Strand",
  indoor: "Binnen",
  studio: "Studio",
  other: "Overig",
};

export const LIGHT_LABEL: Record<string, string> = {
  "": "Geen voorkeur",
  morning: "Ochtend",
  midday: "Middag",
  evening: "Avond / golden hour",
  night: "Nacht",
  any: "Altijd goed",
};

export function initials(name: string): string {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** A datetime-local input value (yyyy-MM-ddTHH:mm) in local time. */
export function toLocalInput(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function mapsSearchLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ---------------------------------------------------------------------------
// Projecten 2.0: parts with their own steps (supabase lib/parts.ts)
// ---------------------------------------------------------------------------

export const PART_LABEL: Record<PartKind, string> = { photo: "Foto", video: "Video", web: "Website" };
export const PART_KINDS: PartKind[] = ["photo", "video", "web"];

export const STEPS: Record<PartKind, string[]> = {
  photo: ["lead", "quote", "booked", "shoot", "editing", "delivered", "done"],
  video: ["lead", "quote", "booked", "shoot", "editing", "delivered", "done"],
  web: ["lead", "quote", "booked", "intake", "design", "build", "review", "live"],
};

const STEP_NAMES: Record<string, string> = {
  lead: "Aanvraag", quote: "Offerte", booked: "Geboekt", shoot: "Shoot", editing: "Bewerken", delivered: "Geleverd", done: "Afgerond",
  intake: "Intake", design: "Ontwerp", build: "Bouwen", review: "Review", live: "Live",
};
const VIDEO_NAMES: Record<string, string> = { shoot: "Opname", editing: "Montage" };

export function stepLabel(kind: PartKind, step: string): string {
  return (kind === "video" && VIDEO_NAMES[step]) || STEP_NAMES[step] || step;
}

/** The step that delivers: the gallery opens, the site goes live. */
export const DELIVERY_STEP: Record<PartKind, string> = { photo: "delivered", video: "delivered", web: "live" };

export function isDelivered(p: Pick<ProjectPart, "kind" | "stage">): boolean {
  const steps = STEPS[p.kind];
  return steps.indexOf(p.stage) >= steps.indexOf(DELIVERY_STEP[p.kind]);
}

export const HOLD_LABEL: Record<Hold, string> = { "": "Loopt", waiting: "Wacht op klant", paused: "Gepauzeerd", stopped: "Gestopt" };

/** Per kind, the categories the admin picks from. A photo category suggests the gallery's style. */
export const CATEGORIES: Record<PartKind, string[]> = {
  photo: ["Sport", "Portret", "Automotive", "Evenement", "Concert", "Bruiloft", "Zakelijk", "Iets anders"],
  video: ["Korte film", "Sfeervideo", "Social media content", "Iets anders"],
  web: ["Nieuwe website", "Website vernieuwen", "Website met eigen foto en video", "Iets anders"],
};

/** The part the older fields follow: the first that has not stopped. */
export function mainPart(p: { parts?: ProjectPart[] }): ProjectPart | undefined {
  const parts = p.parts || [];
  return parts.find((x) => x.hold !== "stopped") || parts[0];
}

/** Foto and Video share the gallery. */
export const hasGallery = (p: { parts?: ProjectPart[]; type?: ProjectType }) =>
  p.parts?.length ? p.parts.some((x) => x.kind !== "web" && x.hold !== "stopped") : p.type !== "web";

export const hasKind = (p: { parts?: ProjectPart[]; type?: ProjectType }, kind: PartKind) =>
  p.parts?.length ? p.parts.some((x) => x.kind === kind && x.hold !== "stopped") : p.type === kind;
