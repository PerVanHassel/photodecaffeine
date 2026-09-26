// iCalendar (RFC 5545) output for the studio feed and single events.

export type IcsEvent = {
  uid: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  location?: string;
  description?: string;
  url?: string;
  lat?: number | null;
  lng?: number | null;
  updatedAt?: string;
};

function esc(s: string): string {
  return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function utc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }).replace(/-/g, "");
}

// Lines longer than 75 octets are folded, as the spec requires.
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }
    current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function toIcs(calName: string, events: IcsEvent[]): string {
  const now = utc(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PhotoDeCaffeine//Studio//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@photodecaffeine.com`, `DTSTAMP:${e.updatedAt ? utc(e.updatedAt) : now}`);
    if (e.allDay) {
      const end = new Date(new Date(e.endsAt || e.startsAt).getTime() + 86400000).toISOString();
      lines.push(`DTSTART;VALUE=DATE:${day(e.startsAt)}`, `DTEND;VALUE=DATE:${day(end)}`);
    } else {
      const end = e.endsAt || new Date(new Date(e.startsAt).getTime() + 3600000).toISOString();
      lines.push(`DTSTART:${utc(e.startsAt)}`, `DTEND:${utc(end)}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (typeof e.lat === "number" && typeof e.lng === "number") lines.push(`GEO:${e.lat};${e.lng}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
