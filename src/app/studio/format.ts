import { differenceInCalendarDays, format, formatDistanceToNowStrict, isSameDay, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { enGB, nl } from "date-fns/locale";
import type { EventKind, LocationKind, ProjectType, Stage } from "./types";

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
