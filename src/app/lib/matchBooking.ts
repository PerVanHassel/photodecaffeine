// The request form of the match photography campaign (/wedstrijdfotografie):
// what it holds, which fields count for which kind of booking, the checks,
// and how a request is sent.
//
// Sending goes through the site's existing contact route (POST /contact in
// the edge function, routes/inquiries.ts): the request lands in the admin as
// an inquiry, and the sender gets the usual confirmation mail. Only
// sendMatchRequest knows that; swap its body to send somewhere else.

import { portalFetch } from "../../lib/supabase";
import { LEGAL_VERSION } from "./legalVersion";
import { matchPage } from "../i18n/matchPage";

export const BOOKING_FEE = 20;
export const PHOTO_PRICE = 5;
/** The example bills on the page: 1, 3 and 5 photos. */
export const EXAMPLE_COUNTS = [1, 3, 5] as const;

export type BookingType = "team" | "individual";
export type Role = keyof typeof matchPage.form.roles;

/** What someone pays in total for `photos` photos, contribution included. */
export function totalFor(type: BookingType, photos: number) {
  return (type === "individual" ? BOOKING_FEE : 0) + photos * PHOTO_PRICE;
}

export const euro = (amount: number) => `€${amount}`;

export const EMPTY_REQUEST = {
  type: "" as BookingType | "",
  role: "" as Role | "",
  name: "",
  email: "",
  phone: "",
  club: "",
  team: "",
  sport: "",
  sportOther: "",
  date: "",
  time: "",
  location: "",
  matches: "" as "" | "one" | "more",
  // Individual only
  forWhom: "",
  shirt: "",
  tip: "",
  feeAgreed: false,
  // Team only
  players: "",
  contactPerson: "",
  // Everyone
  minors: "" as "" | "yes" | "no",
  consentAgreed: false,
  message: "",
  termsAgreed: false,
};

export type MatchRequest = typeof EMPTY_REQUEST;
export type RequestField = keyof MatchRequest;
export type RequestErrors = Partial<Record<RequestField, string>>;

/** A team booking made by a player or parent also names the trainer or team manager. */
export function needsContactPerson(r: Pick<MatchRequest, "type" | "role">) {
  return r.type === "team" && (r.role === "speler" || r.role === "ouder");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Today as yyyy-mm-dd in the visitor's own time zone, what a date input holds. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "zaterdag 15 november 2026", from a date input's value. */
export function longDate(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Every problem with the request, in the order the fields appear on screen.
 * Fields hidden for the chosen kind of booking are not checked.
 */
export function validateRequest(r: MatchRequest, now = today()): RequestErrors {
  const e = matchPage.form.errors;
  const errors: RequestErrors = {};
  const blank = (v: string) => !v.trim();

  if (!r.type) errors.type = e.type;
  if (!r.role) errors.role = e.role;
  if (blank(r.name)) errors.name = e.name;
  if (blank(r.email)) errors.email = e.email;
  else if (!EMAIL_RE.test(r.email.trim())) errors.email = e.emailInvalid;
  if (blank(r.club)) errors.club = e.club;
  if (r.type === "team" && blank(r.team)) errors.team = e.team;
  if (!r.sport) errors.sport = e.sport;
  else if (r.sport === matchPage.form.sportOther && blank(r.sportOther)) errors.sportOther = e.sportOther;
  if (!r.date) errors.date = e.date;
  else if (r.date < now) errors.date = e.datePast;
  if (!r.time) errors.time = e.time;
  if (blank(r.location)) errors.location = e.location;

  if (r.type === "individual") {
    if (blank(r.forWhom)) errors.forWhom = e.forWhom;
  }
  if (r.type === "team") {
    const n = Number(r.players);
    if (blank(r.players)) errors.players = e.players;
    else if (!Number.isInteger(n) || n < 1 || n > 99) errors.players = e.playersInvalid;
    if (needsContactPerson(r) && blank(r.contactPerson)) errors.contactPerson = e.contactPerson;
  }

  if (!r.minors) errors.minors = e.minors;
  else if (r.minors === "yes" && !r.consentAgreed) errors.consentAgreed = e.consent;
  if (r.type === "individual" && !r.feeAgreed) errors.feeAgreed = e.fee;
  if (!r.termsAgreed) errors.termsAgreed = e.terms;
  return errors;
}

/** The request as plain lines, the way it reads in the admin and the mail. */
export function requestLines(r: MatchRequest): string[] {
  const f = matchPage.form;
  const team = r.type === "team";
  const sport = r.sport === f.sportOther ? r.sportOther.trim() : r.sport;
  const lines = [
    `Aanvraag wedstrijdfotografie, ${team ? "team of club" : "voor zichzelf"}.`,
    "",
    r.role ? `Ik ben: ${f.roles[r.role]}` : "",
    `Club: ${r.club.trim()}`,
    r.team.trim() ? `Team: ${r.team.trim()}` : "",
    `Sport: ${sport}`,
    `Wedstrijd: ${longDate(r.date)}, aanvang ${r.time}`,
    `Locatie: ${r.location.trim()}`,
    r.matches ? (r.matches === "one" ? f.matchesOne : f.matchesMore) : "",
  ];
  if (team) {
    lines.push(`Aantal spelers: ongeveer ${r.players.trim()}`);
    if (needsContactPerson(r)) lines.push(`Trainer of teammanager: ${r.contactPerson.trim()}`);
  } else {
    lines.push(`Foto's voor: ${r.forWhom.trim()}`);
    if (r.shirt.trim()) lines.push(`Rugnummer: ${r.shirt.trim()}`);
    if (r.tip.trim()) lines.push(`Herkenning: ${r.tip.trim()}`);
    lines.push(`Akkoord met de boekingsbijdrage van ${euro(BOOKING_FEE)}: ja`);
  }
  lines.push(`Spelers onder de 18: ${r.minors === "yes" ? "ja" : "nee"}`);
  if (r.minors === "yes") lines.push("Regelt de toestemming van de ouders: ja");
  lines.push(`Akkoord met de voorwaarden en de privacyverklaring: ja (versie ${LEGAL_VERSION})`);
  return lines.filter((line, i) => line || i === 1);
}

/** What lands in the admin as the package of the inquiry. */
export function packageName(type: BookingType) {
  return type === "team" ? "Wedstrijdfotografie: team of club" : "Wedstrijdfotografie: voor jezelf";
}

/**
 * Sends a checked request. Throws when it did not arrive, so the form can
 * keep what was typed and say so.
 */
export async function sendMatchRequest(r: MatchRequest, meta: { campaign: string; visit: string }) {
  if (!r.type) throw new Error("No booking type");
  const note = r.message.trim();
  const message = [
    requestLines(r).join("\n"),
    note ? `Opmerkingen:\n${note}` : "",
    meta.campaign ? `[ref:${meta.campaign}]` : "",
  ].filter(Boolean).join("\n\n");

  await portalFetch("/contact", {
    method: "POST",
    body: JSON.stringify({
      name: r.name.trim(),
      email: r.email.trim(),
      phone: r.phone.trim(),
      brand: r.club.trim(),
      package: packageName(r.type),
      message,
      visit: meta.visit,
    }),
  });
}
