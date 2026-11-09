// Shapes returned by the make-server edge function. Kept in one place so the
// admin and the portal read the same fields the same way.

import type { QuoteDetails } from "../components/quote/model";

export type Stage = "lead" | "quote" | "booked" | "shoot" | "editing" | "delivered" | "review" | "archived";
export type ProjectType = "photo" | "video" | "web";

/** Projecten 2.0: what a project is made of. Each part has its own steps (format.ts STEPS). */
export type PartKind = ProjectType;
export type Hold = "" | "waiting" | "paused" | "stopped";

export interface ProjectPart {
  id: string;
  kind: PartKind;
  /** Portret, Sport, Nieuwe website... */
  category: string;
  /** One of STEPS[kind]. */
  stage: string;
  hold: Hold;
  /** Admin: why it waits. Portal: what the client is waited on for. */
  holdNote?: string;
  holdSince?: string | null;
  sort?: number;
  deliveredAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export type EventKind = "shoot" | "meeting" | "deadline" | "edit" | "other";
export type LocationKind = "urban" | "nature" | "beach" | "indoor" | "studio" | "other";
export type BestLight = "" | "morning" | "midday" | "evening" | "night" | "any";

export interface GalleryImage {
  id: string;
  url: string;
  fileName: string;
  /** Admin: a watermarked copy exists. */
  watermark?: boolean;
  /** Portal: the client may download this one. */
  download?: boolean;
  /** Pixel size when known; the gallery lays photos out by their shape. */
  w?: number;
  h?: number;
  /** A child on it who may not be posted, or (admin only) may not be shown at all. */
  restriction?: Restriction;
  /** Group link: this guest's own (voorrang or bought), the original to download now. */
  mine?: boolean;
  /** Group link, watermarked gallery: this guest can buy it. */
  buy?: boolean;
  /** Group link: bought with an account that is not signed in here. */
  bought?: boolean;
  /** The set (chapter) it is in, such as "Eerste helft". */
  set?: string;
  /** Admin: a light copy to look at exists. */
  light?: boolean;
  /** Admin: when it was uploaded. */
  addedAt?: string;
}

export type Restriction = "no_social" | "no_photo";

/** What a client may download before delivery; after delivery always the original. */
export type EarlyDownloads = "original" | "watermark" | "none";

export interface StudioEvent {
  id: string;
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  locationText?: string;
  locationId?: string | null;
  link?: string;
  notes?: string;
  clientVisible?: boolean;
  projectId?: string | null;
  projectTitle?: string;
  projectStage?: Stage;
  clientNames?: string[];
  location?: { id: string; name: string; address: string; lat: number; lng: number } | null;
  derived?: boolean;
}

export interface Deliverable {
  name: string;
  count?: number;
  done?: boolean;
}

export interface ProjectClient {
  id: string;
  name: string;
  email: string;
  company: string;
  userId: string | null;
}

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  stage: Stage;
  status: "in_progress" | "in_review" | "delivered" | "on_hold";
  phase: string;
  description: string;
  dueDate: string;
  deliverables: Deliverable[];
  gallerySettings: {
    title?: string; subtitle?: string; coverUrl?: string; coverImageId?: string; accentColor?: string; earlyDownloads?: EarlyDownloads;
    /** Whose social media the photos go on, in the text parents agree to. */
    consentClub?: string;
    /** The look of the client's gallery; see gallery/styles.ts. */
    style?: string;
    /** Set by the server on delivery; starts the quarter the client can download in. */
    deliveredAt?: string;
    /** A last day the studio set by hand, instead of a quarter after delivery. */
    downloadsUntil?: string;
    /** A welcome under the title, in the studio's words. */
    intro?: string;
    /** Overrides of the style: layout, light or dark, title font, photo size, space between. */
    layout?: GalleryLayoutChoice;
    theme?: "light" | "dark";
    font?: string;
    density?: "s" | "m" | "l";
    gap?: "tight" | "normal" | "airy";
    showNumbers?: boolean;
    /** The order the sets show in. */
    sets?: string[];
    /** The Watermerk switch: everyone but the studio sees watermarked copies. */
    watermark?: boolean;
    /** With the watermark on: the client still gets the originals. */
    clientOriginals?: boolean;
    /** The client may download (what they see). */
    clientDownloads?: boolean;
  };
  /** Portal only: what this client may download right now. */
  downloads?: EarlyDownloads;
  /** Portal only: the client sees the watermarked copies. */
  watermarked?: boolean;
  /** The last day of downloading, YYYY-MM-DD; empty while it is not running yet. */
  downloadsUntil?: string;
  /** Projecten 2.0: the parts, in order. */
  parts: ProjectPart[];
  archivedAt?: string | null;
  /** A Foto or Video part is delivered: the gallery is open. */
  galleryDelivered?: boolean;
  /** Admin: who sees what right now. */
  access?: { watermark: boolean; open: boolean; client: { sees: "original" | "watermark"; downloads: EarlyDownloads } };
  galleryUrls: string[];
  gallery: GalleryImage[];
  events: StudioEvent[];
  meeting?: { date: string; location?: string; link?: string; notes?: string };
  demos: { slug: string; live: boolean }[];
  demoUrl: string;
  demoNotes: string;
  locationId: string | null;
  clientIds: string[];
  clientId: string;
  clients?: ProjectClient[];
  clientNames?: string[];
  briefing?: string;
  briefingUpdatedAt?: string;
  valueCents?: number | null;
  inquiryId?: string | null;
  favorites?: Record<string, string[]>;
  favoriteIds?: string[];
  unreadMessages?: number;
  /** Portal: the group link the client can pass on, while it is switched on, and how many came in with it. */
  share?: { url: string; guests: number; selling?: boolean } | null;
  /** Portal: hearts per photo from the people the group link reached. */
  groupHearts?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** What the client gallery shows: the portal's project, or the part a group link gets to see. */
export type GalleryLayoutChoice = "rows" | "story" | "masonry" | "sheet" | "tempo";

export type GalleryProject = Pick<Project, "title" | "stage" | "gallerySettings" | "gallery" | "downloads" | "downloadsUntil" | "galleryDelivered"> & {
  events?: Pick<StudioEvent, "kind" | "startsAt">[];
  /** The photos are watermarked copies, also when there is nothing to download. */
  watermarked?: boolean;
};

/** Admin: a project's group link and everyone who came in with it. */
export interface ShareState {
  share: {
    url: string; active: boolean; downloads: boolean; consentRequired: boolean; createdAt: string;
    /** Voorrang: guests may ask for their photos first, at this price (incl. btw) and within so many working days. */
    priority: boolean; priorityPrice: number; priorityDays: number;
    /** Photos for sale while the gallery is watermarked: the start-up price and the normal one (incl. btw). */
    sales: boolean; photoPrice: number; photoPriceNormal: number;
    /** "5 foto's voor €20"; 0 is no bundle. */
    bundleSize: number; bundlePrice: number;
    /** The start-up price runs until this day (YYYY-MM-DD); empty: no end. */
    discountUntil: string;
    /** What guests pay today. */
    priceNow: number;
    /** Mollie runs on the live key, so guests can pay. */
    paymentsLive: boolean;
  } | null;
  guests: ShareGuest[];
  /** Hearts per photo. */
  hearts: Record<string, number>;
  totals: { guests: number; visits: number; hearts: number; downloads: number; sold: number; revenue: number; buyers: number };
}

/** Admin: everything a gallery did, per photo and in lists. */
export interface GalleryInsights {
  perImage: { hearts: Record<string, number>; downloads: Record<string, number>; sold: Record<string, number> };
  /** The latest downloads, a zip as one entry. */
  downloads: { id: string; who: string; guestId: string | null; clientId: string | null; source: "portal" | "link" | "account"; version: "original" | "watermark"; count: number; images: string[]; at: string }[];
  orders: GalleryOrder[];
  totals: { downloads: number; downloaders: number; sold: number; revenue: number; buyers: number; baskets: number };
}

export interface GalleryOrder {
  id: string;
  guest: { id: string; name: string; email: string };
  images: string[];
  amount: number;
  paid: boolean;
  invoice: { id: string; number: string; status: Invoice["status"] } | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ShareGuest {
  id: string;
  name: string;
  email: string;
  visits: number;
  downloads: number;
  hearts: number;
  /** Asked for a mail when new photos arrive. */
  notifyPhotos: boolean;
  /** Signed in with an account (to buy). */
  account?: boolean;
  /** Photos bought, and what they paid. */
  bought?: number;
  spent?: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

/**
 * Admin: a guest who asked for the photos of one person first. new: waiting for
 * the studio. offered: payment link sent. delivered: photos sent. booking: too
 * few photos, a shoot of their own offered. closed: stopped by the studio.
 */
export type PriorityStatus = "new" | "offered" | "delivered" | "booking" | "closed";

export interface PriorityRequest {
  id: string;
  projectId: string;
  person: string;
  number: string;
  note: string;
  language: "nl" | "en";
  status: PriorityStatus;
  price: number;
  days: number;
  /** How many photos the studio said it found. */
  photos: number | null;
  guest: { id: string; name: string; email: string };
  invoice: { id: string; number: string; status: Invoice["status"] } | null;
  paid: boolean;
  /** Once paid: the last working day for the photos. */
  dueBy: string;
  /** The photos picked for it. */
  images: string[];
  createdAt: string;
  answeredAt: string | null;
  deliveredAt: string | null;
}

/** What a parent says may be done with their child at a shoot. */
export type ConsentAnswer = "full" | Restriction;

/** Admin: a child a parent pointed out on a photo, with what the answers say about them. */
export interface ChildTag {
  id: string;
  imageId: string;
  child: string;
  /** One name per child, however each parent wrote it. */
  name: string;
  answer: ConsentAnswer | "unknown";
  number: string;
  by: string;
}

/** Admin: a project's consent link and its answers per child, strictest first. */
export interface ConsentState {
  form: { url: string; active: boolean; createdAt: string } | null;
  children: ConsentChild[];
  /** Per child, by the answer that counts. */
  totals: Record<ConsentAnswer, number>;
}

/** Both parents of a child can answer, each with their own row. */
export interface ConsentChild {
  name: string;
  /** "7 / 8" when parents gave different numbers. */
  number: string;
  /** The strictest answer: the one that counts. */
  answer: ConsentAnswer;
  /** The parents chose differently. */
  mixed: boolean;
  note: string;
  photoUrl: string;
  answers: ConsentRow[];
}

export interface ConsentRow {
  id: string;
  childName: string;
  shirtNumber: string;
  answer: ConsentAnswer;
  note: string;
  photoUrl: string;
  parentName: string;
  parentEmail: string;
  /** Word for word what the parent agreed to. */
  statement: string;
  /** The language they filled in the form in. */
  language: "nl" | "en";
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  userId: string | null;
  hasAccount: boolean;
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
  projectCount?: number;
  lastSignIn?: string | null;
  /** A test client: the studio can try the whole portal out as them. */
  isTest?: boolean;
  /** Portal: the studio is looking along as this client. */
  viewAs?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "pdc";
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Shot {
  id: string;
  projectId: string;
  label: string;
  required: boolean;
  done: boolean;
  sort: number;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  dueAt: string | null;
  doneAt: string | null;
  done: boolean;
  kind: string;
  projectId: string | null;
  projectTitle: string;
  clientId: string | null;
  clientName: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  brand: string;
  message: string;
  package: string;
  handledAt: string | null;
  handled: boolean;
  clientId: string | null;
  projectId: string | null;
  /** The site visit it was sent from (Statistieken shows the whole route). */
  visitId?: string | null;
  createdAt: string;
}

export interface LocationPhoto {
  id: string;
  url: string;
  caption: string;
}

export interface StudioLocation {
  id: string;
  name: string;
  kind: LocationKind;
  lat: number;
  lng: number;
  address: string;
  notes: string;
  parking: string;
  permitRequired: boolean;
  bestLight: BestLight;
  tags: string[];
  photos: LocationPhoto[];
  usedCount: number;
  lastUsed: string | null;
  projects: { id: string; title: string; stage: Stage }[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLine {
  label: string;
  amount: number;
  note: string;
  qty?: number;
  unit?: string;
  price?: number;
  optional?: boolean;
}

export interface Quote {
  id: string;
  number: string;
  type: "photo" | "web";
  title: string;
  subtitle: string;
  clientName: string;
  clientEmail: string;
  clientId: string;
  projectId: string;
  intro: string;
  monthly: QuoteLine[];
  oneTime: QuoteLine[];
  included: string[];
  terms: { label: string; text: string }[];
  notes: string;
  validUntil: string;
  vatBasis: "incl" | "excl";
  vatRate: number;
  status: "draft" | "sent" | "accepted" | "declined" | "replaced";
  sentAt: string;
  respondedAt: string;
  response: string;
  viewedAt: string;
  viewCount: number;
  sendCount: number;
  /** Everything the builder adds: payment schedule, planning, ownership, licence, open points. */
  details: QuoteDetails;
  /** Without options; the chosen ones include what the client picked. */
  totals: { monthly: number; oneTime: number; chosenMonthly?: number; chosenOneTime?: number };
  link: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  label: string;
  quantity: number;
  amount: number;
  note: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: "draft" | "sent" | "paid" | "void";
  overdue: boolean;
  quoteId: string | null;
  projectId: string | null;
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  lines: InvoiceLine[];
  vatBasis: "incl" | "excl";
  vatRate: number;
  issuedOn: string;
  dueOn: string;
  notes: string;
  sentAt: string | null;
  remindedAt: string | null;
  paidAt: string | null;
  totals: { net: number; vat: number; total: number; vatRate: number };
  link: string;
  createdAt: string;
  updatedAt: string;
  /** Online payments through Mollie; only on the admin's single invoice. */
  payments?: InvoicePayment[];
  /** How much one refund can give back through Mollie; 0 when nothing (admin). */
  refundMax?: number;
  /** "iDEAL" when paid online, "" when marked paid by hand. */
  paidVia?: string;
  /** The client's copy: the Betaal nu button shows. */
  payable?: boolean;
  /** The client's copy: payments still run on Mollie's test key. */
  onlineTest?: boolean;
}

export interface InvoicePayment {
  id: string;
  mollieId: string;
  mode: "test" | "live";
  status: "open" | "pending" | "authorized" | "paid" | "canceled" | "expired" | "failed";
  method: string;
  methodLabel: string;
  amount: number;
  amountRefunded: number;
  amountChargedBack: number;
  paidAt: string | null;
  createdAt: string;
}

export interface Business {
  name: string;
  address: string;
  kvk: string;
  vatNumber: string;
  iban: string;
  email: string;
}

export interface Overview {
  events: StudioEvent[];
  unreadMessages: { id: string; projectId: string; projectTitle: string; senderName: string; content: string; createdAt: string }[];
  openQuotes: { id: string; number: string; title: string; clientName: string; sentAt: string; viewedAt: string | null; viewCount: number; total: number; monthly: number }[];
  overdueInvoices: { id: string; number: string; clientName: string; dueOn: string; total: number }[];
  openInvoiceTotal: number;
  paidThisMonth: number;
  tasks: { id: string; title: string; notes: string; dueAt: string | null; kind: string; projectId: string | null; projectTitle: string }[];
  newInquiries: { id: string; name: string; email: string; message: string; createdAt: string }[];
  stageCounts: Partial<Record<Stage, number>>;
  dueSoon: { id: string; title: string; dueDate: string; overdue: boolean }[];
}

export interface SearchResults {
  clients: { id: string; name: string; email: string; company: string }[];
  projects: { id: string; title: string; stage: Stage; type: ProjectType }[];
  locations: { id: string; name: string; address: string; kind: LocationKind }[];
  quotes: { id: string; number: string; title: string; client_name: string; status: string }[];
  invoices: { id: string; number: string; client_name: string; status: string }[];
}

export interface PortalLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  parking: string;
}
