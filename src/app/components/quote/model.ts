/**
 * What a quote is made of, shared by the client's page, the admin's builder
 * and its checklist. The edge function (routes/quotes.ts) stores the same
 * shape and computes the same totals; change both together.
 */

export type VatBasis = "excl" | "incl";
export type Service = "web" | "photo" | "video";
export type Audience = "business" | "consumer";

export interface QuoteLine {
  label: string;
  /** The line total, on the quote's VAT basis. With qty and price it is qty × price. */
  amount: number;
  note?: string;
  qty?: number;
  unit?: string;
  price?: number;
  /** Not in the total: the client may pick it when accepting. */
  optional?: boolean;
}

export interface QuoteTerm {
  label: string;
  text: string;
}

export interface PaymentStep {
  label: string;
  percent: number;
  /** When it is due, in the client's words: "bij akkoord", "bij livegang". */
  moment: string;
}

export interface OwnershipRow {
  what: string;
  owner: string;
}

/** The licence on photos and film (Gebruiksrechten, part C of the terms). */
export interface QuoteLicense {
  holder: string;
  use: "private" | "business" | "custom";
  channels: string[];
  territory: string;
  duration: string;
  exclusive: boolean;
  transferable: boolean;
  edits: string;
  credit: string;
  rawFiles: string;
  portfolio: string;
}

export interface QuoteDetails {
  audience?: Audience;
  services?: Service[];
  /** The date on the quote; the day it was made if left empty. */
  issuedOn?: string;
  reference?: string;
  /** The quote this one replaces; sending this one retires that one. */
  replaces?: { id: string; number: string } | null;
  client?: { company?: string; address?: string; country?: string; vatId?: string; phone?: string };
  /** What the client gets out of it, in their words. Sell the problem you solve. */
  problem?: string;
  excluded?: string[];
  /** Costs outside the amounts, like hosting passed on at cost. */
  extraCosts?: string[];
  clientDelivers?: string[];
  planning?: string;
  payment?: { steps: PaymentStep[]; termDays: number };
  revisions?: { rounds: number; untilRight: boolean; feedbackDays: number };
  extraWork?: { hourly: number; note: string };
  aftercare?: { days: number; note: string };
  maintenance?: { covers: string[]; smallChange: string; excluded: string; cancel: string };
  ownership?: { model: "rent" | "buy"; buyout: number | null; rows: OwnershipRow[]; note: string };
  license?: QuoteLicense;
  termsVersion?: string;
  /** Internal: what still has to be found out before this goes out. Never shown to the client. */
  openPoints?: string[];
  /** Set by the client's answer: the options they picked ("o2", "m0"). */
  accepted?: { options: string[]; at?: string };
}

export interface Business {
  name: string;
  address: string;
  kvk: string;
  vatNumber: string;
  iban: string;
  email: string;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "replaced";

export interface QuoteDoc {
  number?: string;
  type?: "photo" | "web";
  title: string;
  subtitle?: string;
  clientName?: string;
  clientEmail?: string;
  intro?: string;
  monthly: QuoteLine[];
  oneTime: QuoteLine[];
  included: string[];
  terms: QuoteTerm[];
  notes?: string;
  validUntil?: string;
  vatBasis?: VatBasis;
  vatRate?: number;
  details?: QuoteDetails;
  status?: QuoteStatus;
  sentAt?: string;
  createdAt?: string;
}

export const DEFAULT_VAT_RATE = 21;

export const round2 = (n: number) => Math.round(n * 100) / 100;

const EUR = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const EUR_WHOLE = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Dutch money notation (€ 1.234,50), without cents when there are none. */
export function euro(amount: number): string {
  const n = Number(amount) || 0;
  return Math.round(n * 100) % 100 === 0 ? EUR_WHOLE.format(n) : EUR.format(n);
}

/** Always with cents, for totals that have to add up on paper. */
export function euroCents(amount: number): string {
  return EUR.format(Number(amount) || 0);
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/** The line total: qty × price when both are there, otherwise the amount as entered. */
export function lineTotal(l: QuoteLine): number {
  const qty = Number(l.qty);
  const price = Number(l.price);
  if (qty > 0 && l.price !== undefined && Number.isFinite(price)) return round2(qty * price);
  return round2(Number(l.amount) || 0);
}

export const optionKey = (prefix: "o" | "m", i: number) => `${prefix}${i}`;

/** Total of a list: everything that is not optional, plus the options picked. */
export function sumLines(lines: QuoteLine[], prefix: "o" | "m", chosen?: ReadonlySet<string>): number {
  return round2((lines || []).reduce((s, l, i) => (!l.optional || chosen?.has(optionKey(prefix, i)) ? s + lineTotal(l) : s), 0));
}

/** For the old helper's callers: the total without options. */
export function quoteSum(lines: QuoteLine[]): number {
  return sumLines(lines, "o");
}

/** Converts one stored amount to the side the reader is looking at. */
export function convertVat(amount: number, basis: VatBasis, show: VatBasis, rate: number): number {
  const n = Number(amount) || 0;
  if (basis === show || !rate) return n;
  const factor = 1 + rate / 100;
  return round2(show === "incl" ? n * factor : n / factor);
}

/** An amount on its stored side, split into what goes to the studio and what goes to the tax office. */
export function vatSplit(amount: number, basis: VatBasis, rate: number): { excl: number; vat: number; incl: number } {
  const n = round2(Number(amount) || 0);
  if (basis === "incl") {
    const vat = round2((n * rate) / (100 + rate));
    return { excl: round2(n - vat), vat, incl: n };
  }
  const vat = round2((n * rate) / 100);
  return { excl: n, vat, incl: round2(n + vat) };
}

/**
 * The payment schedule with amounts. Every step is rounded on its own and the
 * last one takes what is left, so the steps add up to the total to the cent.
 * Empty when the percentages do not add up to 100.
 */
export function paymentPlan(steps: PaymentStep[] | undefined, total: number): (PaymentStep & { amount: number })[] {
  const valid = (steps || []).filter((s) => Number(s.percent) > 0);
  const sum = valid.reduce((s, x) => s + Number(x.percent), 0);
  if (valid.length === 0 || Math.abs(sum - 100) > 0.01) return [];
  const amounts = valid.map((s) => round2((total * Number(s.percent)) / 100));
  amounts[amounts.length - 1] = round2(total - amounts.slice(0, -1).reduce((s, a) => s + a, 0));
  return valid.map((s, i) => ({ ...s, amount: amounts[i] }));
}

export const percentTotal = (steps: PaymentStep[] | undefined) => round2((steps || []).reduce((s, x) => s + (Number(x.percent) || 0), 0));

/** A date n working days later (weekends skipped, holidays not). */
export function addWorkdays(fromIso: string, n: number): string {
  const d = new Date(`${fromIso}T12:00:00`);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Working days between two dates, counting the end, not the start. */
export function workdaysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00`);
  const b = new Date(`${toIso}T12:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) return 0;
  let n = 0;
  for (const d = new Date(a); d < b; ) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
}

export const todayIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

export const SERVICE_LABEL: Record<Service, string> = { web: "Website", photo: "Fotografie", video: "Video" };

export const CHANNELS = ["Eigen website", "Organische social media", "E-mail en nieuwsbrief", "Drukwerk en brochures", "Interne presentaties", "Betaalde advertenties"];
