import { useQuery } from "@tanstack/react-query";
import { get } from "../api";
import type { Client, Message, PortalLocation, Project, StudioEvent } from "../types";

export const pkeys = {
  projects: ["portal", "projects"] as const,
  project: (id: string) => ["portal", "project", id] as const,
  messages: (id: string) => ["portal", "messages", id] as const,
  events: ["portal", "events"] as const,
  quotes: ["portal", "quotes"] as const,
  invoices: ["portal", "invoices"] as const,
  me: ["portal", "me"] as const,
};

export type PortalQuote = {
  id: string; number: string; title: string; subtitle: string; status: "sent" | "accepted" | "declined";
  sentAt: string; respondedAt: string; response: string; validUntil: string; totals: { monthly: number; oneTime: number }; token: string;
};
export type PortalInvoice = {
  id: string; number: string; status: "sent" | "paid" | "void"; issuedOn: string; dueOn: string; paidAt: string | null;
  totals: { net: number; vat: number; total: number }; token: string;
};

export const usePortalProjects = () =>
  useQuery({
    queryKey: pkeys.projects,
    queryFn: ({ signal }) => get<{ projects: Project[]; locations: Record<string, PortalLocation> }>("/portal/projects", signal),
  });

export const usePortalProject = (id: string) =>
  useQuery({
    queryKey: pkeys.project(id),
    queryFn: ({ signal }) => get<{ project: Project; locations: Record<string, PortalLocation> }>(`/portal/project/${id}`, signal),
    enabled: !!id,
  });

export const usePortalMessages = (id: string) =>
  useQuery({
    queryKey: pkeys.messages(id),
    queryFn: ({ signal }) => get<{ messages: Message[] }>(`/portal/project/${id}/messages`, signal).then((r) => r.messages),
    enabled: !!id,
    refetchInterval: 60_000,
  });

export const usePortalEvents = () =>
  useQuery({
    queryKey: pkeys.events,
    queryFn: ({ signal }) => get<{ events: StudioEvent[]; locations: Record<string, PortalLocation> }>("/portal/events", signal),
  });

export const usePortalQuotes = () =>
  useQuery({ queryKey: pkeys.quotes, queryFn: ({ signal }) => get<{ quotes: PortalQuote[] }>("/portal/quotes", signal).then((r) => r.quotes) });

export const usePortalInvoices = () =>
  useQuery({ queryKey: pkeys.invoices, queryFn: ({ signal }) => get<{ invoices: PortalInvoice[] }>("/portal/invoices", signal).then((r) => r.invoices) });

export const useMe = () =>
  useQuery({ queryKey: pkeys.me, queryFn: ({ signal }) => get<{ client: Client }>("/portal/me", signal).then((r) => r.client) });

/** The steps a client sees, from quote to review. */
export const JOURNEY = [
  { stages: ["lead", "quote"], label: "Offerte" },
  { stages: ["booked"], label: "Gepland" },
  { stages: ["shoot"], label: "Shoot" },
  { stages: ["editing"], label: "Bewerken" },
  { stages: ["delivered"], label: "Levering" },
  { stages: ["review", "archived"], label: "Afgerond" },
] as const;

export function journeyIndex(stage: string): number {
  return Math.max(0, JOURNEY.findIndex((j) => (j.stages as readonly string[]).includes(stage)));
}

/** A .ics file for one appointment, built in the browser. */
export function icsFor(e: StudioEvent, title: string, location?: PortalLocation | null): string {
  const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + 3600000);
  const where = location ? [location.name, location.address].filter(Boolean).join(", ") : e.locationText || "";
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PhotoDeCaffeine//Portaal//NL", "BEGIN:VEVENT",
    `UID:${e.id}@photodecaffeine.com`, `DTSTAMP:${utc(new Date())}`,
    e.allDay ? `DTSTART;VALUE=DATE:${e.startsAt.slice(0, 10).replace(/-/g, "")}` : `DTSTART:${utc(start)}`,
    e.allDay ? "" : `DTEND:${utc(end)}`,
    `SUMMARY:${esc(title)}`,
    where ? `LOCATION:${esc(where)}` : "",
    location ? `GEO:${location.lat};${location.lng}` : "",
    e.notes ? `DESCRIPTION:${esc(e.notes)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function saveFile(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
