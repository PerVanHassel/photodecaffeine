// Shapes returned by the make-server edge function. Kept in one place so the
// admin and the portal read the same fields the same way.

import type { QuoteDetails } from "../components/quote/model";

export type Stage = "lead" | "quote" | "booked" | "shoot" | "editing" | "delivered" | "review" | "archived";
export type ProjectType = "photo" | "video" | "web";
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
    /** The look of the client's gallery; see gallery/styles.ts. */
    style?: string;
  };
  /** Portal only: what this client may download right now. */
  downloads?: EarlyDownloads;
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
  share?: { url: string; guests: number } | null;
  /** Portal: hearts per photo from the people the group link reached. */
  groupHearts?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** What the client gallery shows: the portal's project, or the part a group link gets to see. */
export type GalleryProject = Pick<Project, "title" | "stage" | "gallerySettings" | "gallery" | "downloads"> & {
  events?: Pick<StudioEvent, "kind" | "startsAt">[];
  /** The photos are watermarked copies, also when there is nothing to download. */
  watermarked?: boolean;
};

/** Admin: a project's group link and everyone who came in with it. */
export interface ShareState {
  share: { url: string; active: boolean; downloads: boolean; createdAt: string } | null;
  guests: ShareGuest[];
  /** Hearts per photo. */
  hearts: Record<string, number>;
  totals: { guests: number; visits: number; hearts: number; downloads: number };
}

export interface ShareGuest {
  id: string;
  name: string;
  email: string;
  visits: number;
  downloads: number;
  hearts: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** What a parent says may be done with their child at a shoot. */
export type ConsentAnswer = "full" | Restriction;

/** Admin: a project's consent link and every answer, strictest first. */
export interface ConsentState {
  form: { url: string; active: boolean; createdAt: string } | null;
  consents: ConsentRow[];
  totals: Record<ConsentAnswer, number>;
}

export interface ConsentRow {
  id: string;
  childName: string;
  answer: ConsentAnswer;
  note: string;
  photoUrl: string;
  parentName: string;
  parentEmail: string;
  /** Word for word what the parent agreed to. */
  statement: string;
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
  /** The site visit it was sent from (Advertenties shows the whole route). */
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
