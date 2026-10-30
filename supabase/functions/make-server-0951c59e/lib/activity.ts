import type { Context, MiddlewareHandler } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { isAdminUser, verifyAuth } from "./auth.ts";
import { AD_VISIT_MARKER, OWNER_EMAIL } from "./config.ts";
import { db } from "./db.ts";

// Logboek: one row in public.activity_log for every change made through this
// function, by anyone: the studio, a client in the portal, a guest on a share
// link, a visitor on the contact form. The middleware sits in front of every
// route, lets the request run, and writes the row afterwards, in the
// background, only when the request succeeded. Nothing here may fail or slow
// down the request itself.

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const BASE = "/make-server-0951c59e";
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type Row = Record<string, any>;
type Kind = "owner" | "team" | "client" | "guest" | "visitor";
type Actor = { id: string | null; name: string; email: string; kind: Kind };
type Change = { field: string; from?: unknown; to?: unknown };

// ---------------------------------------------------------------------------
// The things a request can change
// ---------------------------------------------------------------------------

/** Where something is stored, what it is called, and where the admin shows it. */
type Source = {
  load: (id: string) => Promise<Row | null>;
  label: (row: Row) => string;
  link?: (row: Row, id: string) => string;
  /** The id to keep in the log, when the one in the path must not be kept (a share token). */
  idOf?: (row: Row) => string;
};

const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v ?? null);

function table(name: string, label: Source["label"], link?: Source["link"], key = "id"): Source {
  return {
    load: async (id) => (await db.from(name).select("*").eq(key, id).maybeSingle()).data,
    label,
    link,
  };
}

function stored(prefix: string, label: Source["label"], link?: Source["link"]): Source {
  return { load: async (id) => parse(await kv.get(prefix + id)), label, link };
}

const join = (...parts: unknown[]) => parts.filter((p) => p !== null && p !== undefined && p !== "").join(" · ");
const euro = (n: unknown) => (typeof n === "number" ? `€ ${n.toFixed(2).replace(".", ",")}` : "");

const PROJECT = table("projects", (r) => r.title, (_r, id) => `/admin/project/${id}`);
const CLIENT = table("clients", (r) => r.name || r.email, (_r, id) => `/admin/client/${id}`);
const TASK = table("tasks", (r) => r.title, () => "/admin/tasks");
const EVENT = table("events", (r) => r.title, () => "/admin/planning");
const LOCATION = table("locations", (r) => r.name, () => "/admin/locations");
const LOCATION_PHOTO = table("location_photos", (r) => r.caption || "Foto", () => "/admin/locations");
const SHOT = table("shot_list_items", (r) => r.label);
const IMAGE = table("gallery_images", (r) => r.file_name);
const GUEST = table("gallery_guests", (r) => r.name || r.email);
const QUOTE = table("quotes", (r) => join(r.number, r.title), () => "/admin/quotes");
const INVOICE = table("invoices", (r) => join(r.number, r.client_name), (_r, id) => `/admin/invoice/${id}`);
const INQUIRY = table("inquiries", (r) => r.name || r.email, () => "/admin/inquiries");
const AD = table("ad_campaigns", (r) => r.label || r.ref, () => "/admin/ads", "ref");
// A share is only ever about its project, which the log shows on its own.
const SHARE: Source = { ...table("gallery_shares", () => "", undefined, "token"), idOf: (r) => r.project_id };
const ARTICLE = stored("portfolio:article:", (r) => r.title, (_r, id) => `/admin/portfolio/${id}`);
const REVIEW = stored("review:", (r) => r.clientName || r.googleName || "Review", () => "/admin/reviews");
const INVESTMENT = stored("investments:item:", (r) => join(r.title, euro(r.price)), () => "/admin/investments");
const DECLARATION = stored("declarations:declaration:", (r) => join(r.description || r.category, euro(r.amount)), () => "/admin/declarations");
const ROLE = stored("roles:role:", (r) => r.name, () => "/admin/team");
const SETTINGS: Source = { load: async () => parse(await kv.get("site:settings")), label: () => "", link: () => "/admin/settings" };
const WORKER: Source = {
  load: async (id) => (await db.auth.admin.getUserById(id)).data?.user ?? null,
  label: (u) => u.user_metadata?.name || u.email,
  link: () => "/admin/team",
};
const DOCUMENT: Source = {
  load: async (id) => ({ id }),
  label: (r) => String(r.id).replace(/-/g, " ").replace(/^./, (s) => s.toUpperCase()),
  link: (_r, id) => `/admin/documents/${id}`,
};

// ---------------------------------------------------------------------------
// What each route does, in words
// ---------------------------------------------------------------------------

type Ctx = { body: any; json: any; params: Record<string, string>; row: Row | null };
type Text = string | ((x: Ctx) => string | Promise<string>);

type Rule = {
  area: string;
  action: Text;
  of?: Source;
  /** The path parameter that names the thing; the last one when left out. */
  param?: string;
  /** The thing is new: its id comes from the response. */
  created?: boolean;
  /** Load the thing before and after, and keep what changed. */
  diff?: boolean;
  detail?: Text;
  /** Who it was, for requests without a login. */
  who?: (x: Ctx) => Promise<Partial<Actor> | null> | Partial<Actor> | null;
  /** A counter rather than a change: not logged when this says so. */
  skip?: (x: Ctx) => boolean;
};

const clip = (s: unknown, n = 140) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

async function guestByKey(projectToken: string, key: unknown): Promise<Partial<Actor> | null> {
  const share = (await db.from("gallery_shares").select("project_id").eq("token", projectToken).maybeSingle()).data;
  if (!share || typeof key !== "string") return { kind: "guest" };
  const g = (await db.from("gallery_guests").select("name, email").eq("key", key).eq("project_id", share.project_id).maybeSingle()).data;
  return { kind: "guest", name: g?.name || "", email: g?.email || "" };
}

async function imageName(id: unknown): Promise<string> {
  if (typeof id !== "string") return "";
  return (await db.from("gallery_images").select("file_name").eq("id", id).maybeSingle()).data?.file_name || "";
}

// Routes that change nothing worth reading back: read markers, counters, and
// steps that belong to another logged change (a receipt before its declaration).
const QUIET = [
  "POST /admin/notifications/read",
  "POST /admin/project/:id/messages/read",
  "POST /portal/project/:id/messages/read",
  "PUT /admin/documents/:doc/read",
  "PUT /admin/project/:id/gallery/sizes",
  "PUT /admin/project/:id/gallery/:imageId/preview",
  "POST /admin/ai/generate-description",
  "POST /admin/declarations/receipt",
  "POST /admin/investments/photo",
  "POST /admin/investments/link",
  "POST /admin/storage/ensure-bucket",
  "POST /admin/google/start",
  "POST /review/open",
  // A batch of visitor statistics from the site, many per visit.
  "POST /v",
];

const RULES: Record<string, Rule> = {
  // Projects
  "POST /admin/project": { area: "Projecten", action: "Project aangemaakt", of: PROJECT, created: true },
  "PUT /admin/project/:id": { area: "Projecten", action: "Project bijgewerkt", of: PROJECT, diff: true },
  "DELETE /admin/project/:id": { area: "Projecten", action: "Project verwijderd", of: PROJECT },
  "POST /admin/project/:id/messages": { area: "Berichten", action: "Bericht gestuurd aan de klant", detail: (x) => clip(x.body?.content) },
  "POST /admin/project/:id/gallery": {
    area: "Galerij", action: "Foto's geüpload", detail: (x) => (x.json?.added ? plural(x.json.added, "bestand", "bestanden") : ""),
  },
  "PUT /admin/project/:id/gallery/order": { area: "Galerij", action: "Volgorde van de galerij aangepast" },
  "DELETE /admin/project/:id/gallery/:imageId": { area: "Galerij", action: "Foto verwijderd", of: IMAGE },
  "POST /admin/project/:id/gallery/privatize": { area: "Galerij", action: "Galerij naar privé-opslag verplaatst" },
  "POST /admin/project/:id/gallery/notify": { area: "Galerij", action: "Klant gemaild dat de galerij klaar staat" },
  "POST /admin/project/:id/share": { area: "Galerij", action: "Deellink aangezet" },
  "PUT /admin/project/:id/share": {
    area: "Galerij", action: "Deellink aangepast",
    detail: (x) => join(
      x.body?.active === undefined ? "" : x.body.active ? "aan" : "uit",
      x.body?.downloads === undefined ? "" : x.body.downloads ? "downloaden mag" : "downloaden mag niet",
    ),
  },
  "POST /admin/project/:id/share/renew": { area: "Galerij", action: "Nieuwe deellink gemaakt, de oude werkt niet meer" },
  "DELETE /admin/project/:id/share/guests/:guestId": { area: "Galerij", action: "Gast van de deellink verwijderd", of: GUEST },
  "POST /admin/project/:id/shots": { area: "Projecten", action: "Shot toegevoegd", of: SHOT, created: true },
  "PUT /admin/project/:id/shots/order": { area: "Projecten", action: "Volgorde van de shotlijst aangepast" },
  "PUT /admin/shots/:id": { area: "Projecten", action: "Shot bijgewerkt", of: SHOT, diff: true },
  "DELETE /admin/shots/:id": { area: "Projecten", action: "Shot verwijderd", of: SHOT },
  "POST /admin/project/:id/request-review": { area: "Reviews", action: "Om een review gevraagd" },
  "POST /admin/project/:id/request-feedback": { area: "Reviews", action: "Om feedback gevraagd" },

  // Planning
  "POST /admin/events": { area: "Planning", action: "Afspraak gepland", of: EVENT, created: true },
  "PUT /admin/events/:id": { area: "Planning", action: "Afspraak bijgewerkt", of: EVENT, diff: true },
  "DELETE /admin/events/:id": { area: "Planning", action: "Afspraak verwijderd", of: EVENT },
  "POST /admin/calendar-feed": { area: "Planning", action: "Nieuwe agenda-link gemaakt" },
  "POST /admin/locations": { area: "Locaties", action: "Locatie toegevoegd", of: LOCATION, created: true },
  "PUT /admin/locations/:id": { area: "Locaties", action: "Locatie bijgewerkt", of: LOCATION, diff: true },
  "DELETE /admin/locations/:id": { area: "Locaties", action: "Locatie verwijderd", of: LOCATION },
  "POST /admin/locations/:id/photos": { area: "Locaties", action: "Foto's bij locatie gezet", of: LOCATION },
  "PUT /admin/locations/:id/photos/:photoId": { area: "Locaties", action: "Locatiefoto bijgewerkt", of: LOCATION_PHOTO, diff: true },
  "DELETE /admin/locations/:id/photos/:photoId": { area: "Locaties", action: "Locatiefoto verwijderd", of: LOCATION_PHOTO },
  "POST /admin/tasks": { area: "Taken", action: "Taak toegevoegd", of: TASK, created: true },
  "PUT /admin/tasks/:id": {
    area: "Taken", of: TASK, diff: true,
    action: (x) => (x.body?.done === true ? "Taak afgevinkt" : x.body?.done === false ? "Taak weer open gezet" : "Taak bijgewerkt"),
  },
  "DELETE /admin/tasks/:id": { area: "Taken", action: "Taak verwijderd", of: TASK },
  "POST /admin/reminders": { area: "Taken", action: "Herinnering toegevoegd", of: TASK, created: true },
  "PUT /admin/reminders/:id": { area: "Taken", action: "Herinnering bijgewerkt", of: TASK, diff: true },
  "DELETE /admin/reminders/:id": { area: "Taken", action: "Herinnering verwijderd", of: TASK },

  // Clients and money
  "POST /admin/client": { area: "Klanten", action: "Klant toegevoegd", of: CLIENT, created: true },
  "PUT /admin/client/:id": { area: "Klanten", action: "Klant bijgewerkt", of: CLIENT, diff: true },
  "DELETE /admin/client/:id": { area: "Klanten", action: "Klant verwijderd", of: CLIENT },
  "POST /admin/clients/invite": { area: "Klanten", action: "Uitnodiging voor het portaal gestuurd", detail: (x) => x.body?.email || "" },
  "PUT /admin/inquiry/:id": {
    area: "Aanvragen", of: INQUIRY, diff: true,
    action: (x) => (x.body?.handled === true ? "Aanvraag afgehandeld" : x.body?.handled === false ? "Aanvraag weer open gezet" : "Aanvraag bijgewerkt"),
  },
  "DELETE /admin/inquiry/:id": { area: "Aanvragen", action: "Aanvraag verwijderd", of: INQUIRY },
  "POST /admin/inquiry/:id/convert": { area: "Aanvragen", action: "Aanvraag omgezet in klant en project", of: INQUIRY },
  "PUT /admin/ads/:ref": { area: "Advertenties", action: "Advertentie bijgewerkt", of: AD, diff: true },
  "DELETE /admin/analytics/visit/:id": { area: "Advertenties", action: "Bezoek uit de statistieken gehaald" },
  "POST /admin/quotes": { area: "Offertes", action: "Offerte aangemaakt", of: QUOTE, created: true },
  "PUT /admin/quotes/:id": { area: "Offertes", action: "Offerte bijgewerkt", of: QUOTE, diff: true },
  "DELETE /admin/quotes/:id": { area: "Offertes", action: "Offerte verwijderd", of: QUOTE },
  "POST /admin/quotes/:id/send": { area: "Offertes", action: "Offerte verstuurd", of: QUOTE },
  "POST /admin/invoices": { area: "Facturen", action: "Factuur aangemaakt", of: INVOICE, created: true },
  "POST /admin/invoices/from-quote/:quoteId": { area: "Facturen", action: "Factuur gemaakt van een offerte", of: INVOICE, created: true },
  "PUT /admin/invoices/:id": { area: "Facturen", action: "Factuur bijgewerkt", of: INVOICE, diff: true },
  "POST /admin/invoices/:id/status": { area: "Facturen", action: "Status van factuur gewijzigd", of: INVOICE, diff: true },
  "DELETE /admin/invoices/:id": { area: "Facturen", action: "Factuur verwijderd", of: INVOICE },
  "POST /admin/invoices/:id/send": { area: "Facturen", action: "Factuur verstuurd", of: INVOICE },
  "POST /admin/invoices/:id/remind": { area: "Facturen", action: "Herinnering voor factuur gestuurd", of: INVOICE },
  "POST /admin/declarations": { area: "Declaraties", action: "Declaratie ingediend", of: DECLARATION, created: true },
  "PUT /admin/declarations/:id": { area: "Declaraties", action: "Declaratie bijgewerkt", of: DECLARATION, diff: true },
  "DELETE /admin/declarations/:id": { area: "Declaraties", action: "Declaratie verwijderd", of: DECLARATION },
  "POST /admin/investments": {
    area: "Investeringen", of: INVESTMENT, created: true,
    action: (x) => (x.body?.status === "bought" ? "Gear toegevoegd" : "Investering toegevoegd"),
  },
  "PUT /admin/investments/:id": {
    area: "Investeringen", of: INVESTMENT, diff: true,
    action: (x) => (x.body?.status === "bought" ? "Investering gekocht, staat bij de gear" : x.body?.quantity !== undefined && Object.keys(x.body).length === 1 ? "Aantal aangepast" : "Investering bijgewerkt"),
  },
  "DELETE /admin/investments/:id": { area: "Investeringen", action: "Investering verwijderd", of: INVESTMENT },

  // Website
  "POST /admin/portfolio": { area: "Portfolio", action: "Portfolio-artikel aangemaakt", of: ARTICLE, created: true },
  "PUT /admin/portfolio/:id": { area: "Portfolio", action: "Portfolio-artikel bijgewerkt", of: ARTICLE, diff: true },
  "DELETE /admin/portfolio/:id": { area: "Portfolio", action: "Portfolio-artikel verwijderd", of: ARTICLE },
  "POST /admin/reviews": { area: "Reviews", action: "Review toegevoegd", of: REVIEW, created: true },
  "PUT /admin/reviews/:id": { area: "Reviews", action: "Review bijgewerkt", of: REVIEW, diff: true },
  "PUT /admin/reviews/:id/reply": { area: "Reviews", action: "Review beantwoord", of: REVIEW, detail: (x) => clip(x.body?.text) },
  "DELETE /admin/reviews/:id/reply": { area: "Reviews", action: "Antwoord op review weggehaald", of: REVIEW },
  "DELETE /admin/reviews/:id": { area: "Reviews", action: "Review verwijderd", of: REVIEW },
  "PUT /admin/google/client": { area: "Reviews", action: "Google-gegevens ingevuld" },
  "POST /admin/google/connect": { area: "Reviews", action: "Google-bedrijfsprofiel gekoppeld" },
  "POST /admin/google/sync": { area: "Reviews", action: "Google-reviews opgehaald" },
  "DELETE /admin/google": { area: "Reviews", action: "Google-bedrijfsprofiel ontkoppeld" },
  "PUT /admin/settings": { area: "Instellingen", action: "Site-instellingen bijgewerkt", of: SETTINGS, diff: true, param: "-" },
  "POST /admin/storage/upload": {
    area: "Bestanden", action: "Bestand geüpload",
    detail: (x) => decodeURIComponent(String(x.json?.url || x.json?.path || "").split("?")[0].split("/").pop() || ""),
  },

  // Team
  "POST /admin/workers": { area: "Team", action: "Teamlid toegevoegd", detail: (x) => join(x.body?.name, x.body?.email) },
  "PUT /admin/workers/:id/role": {
    area: "Team", action: "Rol van teamlid gewijzigd", of: WORKER,
    detail: async (x) => (typeof x.body?.roleId === "string" ? parse(await kv.get(`roles:role:${x.body.roleId}`))?.name || "" : ""),
  },
  "PUT /admin/workers/:id/password": { area: "Team", action: "Wachtwoord van teamlid gewijzigd", of: WORKER },
  "DELETE /admin/workers/:id": { area: "Team", action: "Teamlid verwijderd", of: WORKER },
  "POST /admin/roles": { area: "Team", action: "Rol aangemaakt", of: ROLE, created: true },
  "PUT /admin/roles/:id": { area: "Team", action: "Rol bijgewerkt", of: ROLE, diff: true },
  "DELETE /admin/roles/:id": { area: "Team", action: "Rol verwijderd", of: ROLE },
  "DELETE /admin/notifications": { area: "Meldingen", action: "Alle meldingen gewist" },
  "DELETE /admin/notifications/:id": { area: "Meldingen", action: "Melding verwijderd" },
  "POST /admin/documents/:doc/notes": { area: "Documenten", action: "Notitie geplaatst", of: DOCUMENT, param: "doc", detail: (x) => clip(x.body?.text) },
  "PUT /admin/documents/:doc/notes/:id": { area: "Documenten", action: "Notitie aangepast", of: DOCUMENT, param: "doc", detail: (x) => clip(x.body?.text) },
  "DELETE /admin/documents/:doc/notes/:id": { area: "Documenten", action: "Notitie verwijderd", of: DOCUMENT, param: "doc" },

  // Clients in the portal
  "POST /portal/signup": {
    area: "Portaal", action: "Account aangemaakt in het portaal",
    who: (x) => ({ kind: "client", name: x.body?.name || "", email: x.body?.email || "" }),
  },
  "POST /portal/password-reset": {
    area: "Portaal", action: "Nieuw wachtwoord aangevraagd",
    who: (x) => ({ kind: "visitor", email: x.body?.email || "" }),
  },
  "PUT /portal/me": { area: "Portaal", action: "Eigen gegevens bijgewerkt" },
  "POST /portal/project/:id/messages": { area: "Berichten", action: "Bericht gestuurd aan de studio", detail: (x) => clip(x.body?.content) },
  "POST /portal/project/:id/favorites": {
    area: "Galerij", action: (x) => (x.body?.favorite ? "Foto als favoriet gekozen" : "Foto uit favorieten gehaald"),
    detail: (x) => imageName(x.body?.imageId),
  },
  "POST /portal/project/:id/favorites/submit": { area: "Galerij", action: "Favorieten ingestuurd", detail: (x) => clip(x.body?.note) },
  "POST /portal/project/:id/feedback": { area: "Reviews", action: "Feedback gegeven" },

  // Without a login
  "POST /contact": {
    area: "Aanvragen", action: "Aanvraag gestuurd via de site",
    skip: (x) => x.body?.name === AD_VISIT_MARKER,
    who: (x) => ({ kind: "visitor", name: x.body?.name || "", email: x.body?.email || x.body?.phone || "" }),
    detail: (x) => clip(x.body?.message),
  },
  "POST /quote/:id/respond": {
    area: "Offertes", of: QUOTE,
    action: (x) => (x.body?.answer === "accepted" ? "Offerte geaccepteerd" : "Offerte afgewezen"),
    who: (x) => ({ kind: "client", name: x.row?.client_name || "", email: x.row?.client_email || "" }),
    detail: (x) => clip(x.body?.message),
  },
  "POST /share/:token/guest": {
    area: "Galerij", action: "Gedeelde galerij geopend", of: SHARE,
    who: (x) => ({ kind: "guest", name: x.body?.name || "", email: x.body?.email || "" }),
  },
  "POST /share/:token/heart": {
    area: "Galerij", of: SHARE,
    action: (x) => (x.body?.on ? "Hartje gegeven aan een foto" : "Hartje weggehaald"),
    who: (x) => guestByKey(x.params.token, x.body?.key),
    detail: (x) => imageName(x.body?.imageId),
  },
  "POST /share/:token/download": {
    area: "Galerij", action: "Foto gedownload", of: SHARE,
    who: (x) => guestByKey(x.params.token, x.body?.key),
    detail: (x) => imageName(x.body?.imageId),
  },
  "POST /share/:token/downloaded": {
    area: "Galerij", action: "Foto's gedownload als zip", of: SHARE,
    who: (x) => guestByKey(x.params.token, x.body?.key),
    detail: (x) => (x.body?.count ? plural(x.body.count, "foto", "foto's") : ""),
  },
};

// ---------------------------------------------------------------------------
// Matching a request to its rule
// ---------------------------------------------------------------------------

type Compiled = { method: string; re: RegExp; names: string[]; pattern: string; rule: Rule | null };

function compile(key: string, rule: Rule | null): Compiled {
  const [method, pattern] = key.split(" ");
  const names: string[] = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_m, name) => { names.push(name); return "([^/]+)"; })}/?$`);
  return { method, re, names, pattern, rule };
}

// Literal segments win over parameters ("/gallery/order" before "/gallery/:imageId").
const COMPILED = [
  ...QUIET.map((k) => compile(k, null)),
  ...Object.entries(RULES).map(([k, rule]) => compile(k, rule)),
].sort((a, b) => b.pattern.replace(/:\w+/g, "").length - a.pattern.replace(/:\w+/g, "").length);

function match(method: string, path: string) {
  for (const c of COMPILED) {
    if (c.method !== method) continue;
    const m = path.match(c.re);
    if (!m) continue;
    const params = Object.fromEntries(c.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    return { ...c, params };
  }
  return null;
}

const VERB: Record<string, string> = { POST: "Toegevoegd of uitgevoerd", PUT: "Bijgewerkt", PATCH: "Bijgewerkt", DELETE: "Verwijderd" };

/** For a route nobody wrote a rule for yet: still logged, in plain terms. */
function fallback(method: string, path: string): Rule {
  return { area: "Overig", action: `${VERB[method] || method}: ${path}` };
}

// ---------------------------------------------------------------------------
// What changed
// ---------------------------------------------------------------------------

const HIDDEN = /^(id|key|created_at|updated_at|createdAt|updatedAt|createdBy|updatedBy|created_by|updated_by|.*(token|password|secret|hash).*)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A value worth reading back; undefined when it only matters that it changed. */
function shown(field: string, v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v !== "string") return undefined;
  if (/(_id|Id|_ids|Ids)$/.test(field) || UUID.test(v)) return undefined;
  if (/^(https?:|private:)/.test(v)) return undefined;
  return clip(v, 160);
}

const isPlain = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);

function diff(a: Row, b: Row, prefix = ""): Change[] {
  const out: Change[] = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (HIDDEN.test(key)) continue;
    const from = a[key];
    const to = b[key];
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    const field = prefix + key;
    // One level into settings-like objects ("permissions.manageClients").
    if (!prefix && isPlain(from) && isPlain(to)) {
      out.push(...diff(from, to, `${field}.`));
      continue;
    }
    const change: Change = { field };
    const f = shown(key, from);
    const t = shown(key, to);
    if (f !== undefined && t !== undefined) {
      change.from = f;
      change.to = t;
    }
    out.push(change);
  }
  return out.slice(0, 40);
}

/** The fields a request sent, for edits whose effect the stored row does not show. */
function sentFields(body: unknown): Change[] {
  if (!isPlain(body)) return [];
  return Object.keys(body).filter((k) => !HIDDEN.test(k)).slice(0, 40).map((field) => ({ field }));
}

// ---------------------------------------------------------------------------
// The middleware
// ---------------------------------------------------------------------------

async function attempt<T>(fn: () => Promise<T> | T, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function actorOf(c: Context, rule: Rule, x: Ctx): Promise<Actor> {
  const user = c.get("user") || (await attempt(() => verifyAuth(c.req.header("Authorization") ?? null), null));
  if (user) {
    const kind: Kind = user.email === OWNER_EMAIL ? "owner" : isAdminUser(user) ? "team" : "client";
    return { id: user.id, name: user.user_metadata?.name || user.email || "", email: user.email || "", kind };
  }
  const who = (await attempt(async () => (await rule.who?.(x)) || null, null)) || {};
  return { id: null, name: clip(who.name, 120), email: clip(who.email, 254), kind: who.kind || "visitor" };
}

const text = (t: Text | undefined, x: Ctx) => attempt(async () => (typeof t === "function" ? await t(x) : t || ""), "");

const idFrom = (json: any): string => {
  if (typeof json?.id === "string") return json.id;
  for (const v of Object.values(json || {})) if (isPlain(v) && typeof v.id === "string") return v.id;
  return "";
};

export const activityLog: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (!WRITES.has(method)) return next();
  const path = c.req.path.startsWith(BASE) ? c.req.path.slice(BASE.length) : c.req.path;
  const found = match(method, path);
  if (found && !found.rule) return next();
  const rule = found?.rule || fallback(method, path);
  const params = found?.params || {};
  const names = found?.names || [];
  const id = rule.param === "-" ? "-" : params[rule.param || names[names.length - 1]] || "";

  // What it was, read before the handler changes or removes it.
  const before = rule.of && id && !rule.created && (rule.diff || method === "DELETE")
    ? await attempt(() => rule.of!.load(id), null)
    : null;

  await next();
  if (c.res.status < 200 || c.res.status >= 300) return;

  const isJson = (c.req.header("Content-Type") || "").includes("application/json");
  const body = isJson ? await attempt(() => c.req.json(), null) : null;
  const res = c.res.clone();
  const done = write(c, { method, path, status: c.res.status, pattern: found?.pattern || "", rule, params, id, before, body, res })
    .catch((err) => console.log("activity log failed:", err));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(done);
};

async function write(c: Context, m: {
  method: string; path: string; status: number; pattern: string; rule: Rule;
  params: Record<string, string>; id: string; before: Row | null; body: any; res: Response;
}) {
  const { rule } = m;
  const json = await attempt(() => m.res.json(), null);
  const x: Ctx = { body: m.body, json, params: m.params, row: null };
  if (rule.skip?.(x)) return;

  const id = rule.created ? idFrom(json) : m.id;
  const after = rule.of && id && m.method !== "DELETE" ? await attempt(() => rule.of!.load(id), null) : null;
  const row = after || m.before;
  x.row = row;

  const changes = rule.diff && m.before && after ? diff(m.before, after) : [];
  const projectId = rule.of === PROJECT
    ? id
    : /^\/(admin|portal)\/project\/:id/.test(m.pattern) ? m.params.id : row?.project_id || "";
  const label = rule.of && row ? await attempt(() => rule.of!.label(row), "") : "";
  const projectTitle = rule.of === PROJECT
    ? label
    : projectId ? await attempt(async () => (await db.from("projects").select("title").eq("id", projectId).maybeSingle()).data?.title || "", "") : "";
  const gone = m.method === "DELETE";
  const link = (!gone && rule.of && row && rule.of.link?.(row, id)) || (projectId && !(gone && rule.of === PROJECT) ? `/admin/project/${projectId}` : "");

  const actor = await actorOf(c, rule, x);
  const entry = {
    actor_id: actor.id,
    actor_name: actor.name,
    actor_email: actor.email,
    actor_kind: actor.kind,
    area: rule.area,
    action: clip(await text(rule.action, x), 200),
    target_id: rule.of?.idOf ? (row ? String(rule.of.idOf(row) || "") : "") : id === "-" ? "" : id,
    target_label: clip(label, 200),
    // A removed project keeps its name here but no longer anything to point at.
    project_id: UUID.test(projectId) && !(gone && rule.of === PROJECT) ? projectId : null,
    project_title: clip(projectTitle, 200),
    detail: clip(await text(rule.detail, x), 300),
    changes: changes.length ? changes : rule.diff ? sentFields(m.body) : [],
    link,
    method: m.method,
    path: m.path.slice(0, 300),
    status: m.status,
  };
  const { error } = await db.from("activity_log").insert(entry);
  if (error) console.log("activity log insert failed:", error.message);
}
