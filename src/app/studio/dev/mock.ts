// Development only: answers the studio's API calls from memory, so the admin
// and portal can be clicked through in a browser without a real login.
// Turned on with localStorage["pdc-mock"] = "1" on the dev server; never part
// of a production build (api.ts only imports this behind import.meta.env.DEV).

import { ApiError } from "../api";

type Json = any;

const now = Date.now();
const day = 86400000;
const iso = (offsetDays: number, hour = 10, minute = 0) => {
  const d = new Date(now + offsetDays * day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const dateOnly = (offsetDays: number) => new Date(now + offsetDays * day).toISOString().slice(0, 10);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Stock photos so the gallery and cards look real while clicking through.
const PHOTOS = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=70",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&q=70",
  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=70",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=70",
  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=70",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&q=70",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=900&q=70",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=70",
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&q=70",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=70",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=70",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=70",
];

// A wedding with every shape a real shoot has: portraits, landscapes, a
// panorama, squares. Some come without a size, as older uploads do.
const pic = (n: number, w: number, h: number, sized = true) => ({ url: `https://picsum.photos/id/${n}/${w}/${h}`, ...(sized ? { w, h } : {}) });
const WEDDING = [
  pic(1015, 1500, 1000), pic(1027, 800, 1200), pic(1011, 800, 1000), pic(1016, 1800, 640), pic(1025, 1000, 1000),
  pic(1035, 1280, 720), pic(1036, 1500, 1000), pic(1039, 800, 1200, false), pic(1040, 800, 1200), pic(1041, 1500, 1000),
  pic(1043, 1000, 1250), pic(1044, 1500, 1000, false), pic(1045, 1200, 800), pic(1047, 800, 1200), pic(1048, 1600, 900),
  pic(1049, 900, 1350), pic(1050, 2000, 700), pic(1051, 1200, 1200), pic(1053, 1500, 1000), pic(1054, 800, 1000, false),
  pic(1055, 1200, 800), pic(1056, 800, 1200), pic(1057, 1500, 1000), pic(1058, 1000, 1250),
];

const clients: Json[] = [
  { id: id(1), userId: id(101), hasAccount: true, name: "Joris de Wit", email: "joris@garagedewit.nl", company: "Garage De Wit", phone: "06 12345678", notes: "Klassieke Porsches, liefst avondlicht.", projectCount: 1, lastSignIn: iso(-1), createdAt: iso(-60), updatedAt: iso(-2) },
  { id: id(2), userId: id(102), hasAccount: true, name: "Sanne Veldhuis", email: "sanne@studioveldhuis.nl", company: "Studio Veldhuis", phone: "", notes: "", projectCount: 1, lastSignIn: iso(0, 9), createdAt: iso(-40), updatedAt: iso(-1) },
  { id: id(3), userId: null, hasAccount: false, name: "Noor Bakker", email: "noor@example.nl", company: "", phone: "06 87654321", notes: "Portret voor LinkedIn en website.", projectCount: 1, lastSignIn: null, createdAt: iso(-6), updatedAt: iso(-6) },
  { id: id(4), userId: null, hasAccount: false, name: "Café Maas", email: "info@cafemaas.nl", company: "Café Maas", phone: "", notes: "", projectCount: 1, lastSignIn: null, createdAt: iso(-90), updatedAt: iso(-20) },
];

const locations: Json[] = [
  { id: id(21), name: "Vrouwenpolder duinovergang", kind: "beach", lat: 51.5846, lng: 3.6203, address: "Duinweg, Vrouwenpolder", notes: "Laag standpunt in het helmgras werkt goed.", parking: "Strandparkeerplaats, betaald", permitRequired: false, bestLight: "evening", tags: ["duinen", "zonsondergang"], photos: [{ id: id(301), url: PHOTOS[10], caption: "" }], usedCount: 2, lastUsed: iso(-30), projects: [], createdAt: iso(-100), updatedAt: iso(-30) },
  { id: id(22), name: "Markt Roosendaal", kind: "urban", lat: 51.5308, lng: 4.4653, address: "Markt, Roosendaal", notes: "Zondagochtend leeg.", parking: "Parkeergarage Nieuwe Markt", permitRequired: true, bestLight: "morning", tags: ["plein", "architectuur"], photos: [{ id: id(302), url: PHOTOS[9], caption: "" }], usedCount: 1, lastUsed: iso(-12), projects: [], createdAt: iso(-80), updatedAt: iso(-12) },
  { id: id(23), name: "Maasboulevard, kade", kind: "urban", lat: 51.9185, lng: 4.4935, address: "Maasboulevard, Rotterdam", notes: "Skyline in de rug bij zonsondergang.", parking: "Boompjeskade, betaald", permitRequired: false, bestLight: "evening", tags: ["auto", "skyline", "water"], photos: [{ id: id(303), url: PHOTOS[0], caption: "" }, { id: id(304), url: PHOTOS[3], caption: "" }], usedCount: 4, lastUsed: iso(-3), projects: [{ id: id(51), title: "Porsche 911 Targa", stage: "booked" }], createdAt: iso(-120), updatedAt: iso(-3) },
  { id: id(24), name: "Kalmthoutse Heide", kind: "nature", lat: 51.405, lng: 4.4486, address: "Putsesteenweg, Kalmthout (BE)", notes: "Paars in augustus.", parking: "Bezoekerscentrum", permitRequired: false, bestLight: "morning", tags: ["heide", "portret"], photos: [], usedCount: 0, lastUsed: null, projects: [], createdAt: iso(-20), updatedAt: iso(-20) },
  { id: id(25), name: "Studio Westblaak", kind: "studio", lat: 51.9163, lng: 4.4731, address: "Westblaak 142, Rotterdam", notes: "", parking: "Garage Westblaak", permitRequired: false, bestLight: "any", tags: ["studio"], photos: [{ id: id(305), url: PHOTOS[6], caption: "" }], usedCount: 3, lastUsed: iso(-8), projects: [], createdAt: iso(-200), updatedAt: iso(-8) },
];

const shootStart = iso(1, 18, 15);
const projects: Json[] = [
  mkProject(51, "Porsche 911 Targa", "photo", "booked", [id(1)], { valueCents: 89500, locationId: id(23), dueDate: dateOnly(12),
    events: [
      { id: id(61), kind: "shoot", title: "Shoot 911 Targa", startsAt: shootStart, endsAt: iso(1, 20, 0), allDay: false, locationId: id(23), locationText: "", link: "", notes: "Volgauto: Joris rijdt.", clientVisible: true },
      { id: id(62), kind: "meeting", title: "Intake", startsAt: iso(-5, 10), endsAt: iso(-5, 11), allDay: false, locationId: null, locationText: "Telefonisch", link: "", notes: "", clientVisible: true },
    ],
    gallery: PHOTOS.slice(0, 4), description: "Avondshoot aan de Maas met rollers op de brug.", deliverables: [{ name: "bewerkte foto's", count: 25, done: false }, { name: "reel van 30 s", count: 1, done: false }] }),
  mkProject(52, "Teamfoto's 2026", "photo", "editing", [id(2)], { valueCents: 118000, dueDate: dateOnly(-2), gallery: PHOTOS.slice(4, 12), favorites: [0, 2, 3, 6] }),
  mkProject(53, "Portret Noor Bakker", "photo", "quote", [id(3)], { valueCents: 45000 }),
  mkProject(54, "Najaarsmenu", "photo", "lead", [id(4)], { events: [{ id: id(63), kind: "shoot", title: "", startsAt: iso(4, 9, 30), endsAt: iso(4, 12), allDay: false, locationId: null, locationText: "Witte de Withstraat", link: "", notes: "", clientVisible: true }] }),
  mkProject(55, "Zomerterras", "photo", "delivered", [id(4)], { valueCents: 54000, gallery: PHOTOS.slice(8, 11) }),
  mkProject(56, "Bruiloft Lotte & Sem", "photo", "editing", [id(2)], { valueCents: 125000, gallery: WEDDING, favorites: [1, 4, 9],
    gallerySettings: { style: "editorial", subtitle: "Kasteel Wouw, 14 juni 2026" },
    events: [{ id: id(64), kind: "shoot", title: "Bruiloft", startsAt: iso(-20, 11), endsAt: iso(-20, 23), allDay: false, locationId: null, locationText: "Kasteel Wouw", link: "", notes: "", clientVisible: true }] }),
  mkProject(57, "Stratenloop Roosendaal 10K", "photo", "delivered", [id(2)], { valueCents: 68000, gallery: [...WEDDING].reverse().slice(0, 18), favorites: [2, 5],
    gallerySettings: { style: "arena", subtitle: "12 oktober, Markt Roosendaal" } }),
];

// Group links: the run's link with downloads on, the wedding's with them off.
const shares: Json[] = [
  { projectId: id(57), token: "k3F9xQ2mPz7Lw4Rb", active: true, downloads: true, createdAt: iso(-3) },
  { projectId: id(56), token: "Wd8hT4nE2sYq9cVa", active: true, downloads: false, createdAt: iso(-6) },
];
const guestList: Json[] = [
  ["Ruben Smit", "ruben@example.nl", 4, 12, -3, 0],
  ["Fatima el Amrani", "fatima@example.nl", 2, 0, -3, -1],
  ["Daan Verhoeven", "daan.v@example.nl", 1, 3, -2, -2],
  ["Lieke de Jong", "lieke@example.nl", 3, 0, -2, 0],
  ["Thomas Bakker", "thomas@example.nl", 1, 0, -1, -1],
  ["Sophie Visser", "sophie@example.nl", 2, 18, -1, 0],
  ["Milan Jansen", "milan@example.nl", 1, 0, -1, -1],
  ["Emma de Vries", "emma@example.nl", 5, 6, -3, 0],
  ["Noah Mulder", "noah@example.nl", 1, 0, 0, 0],
  ["Julia Bos", "julia@example.nl", 2, 2, -2, -1],
].map(([name, email, visits, downloads, first, last], i) => ({
  id: id(1000 + i), projectId: id(57), key: String(i).padStart(32, "a"), name, email, visits, downloads,
  firstSeenAt: iso(first as number, 20, i), lastSeenAt: iso(last as number, 9 + i, 5 * i),
}));
// Who hearted which photo of the run, by photo index and guest index.
const guestHearts: { imageId: string; guestId: string }[] = [
  [0, [0, 1, 2, 3, 5, 7]], [3, [0, 3, 5, 7, 9]], [5, [1, 2, 4]], [8, [0, 5, 7]], [2, [6]], [11, [3, 9]], [14, [7]],
].flatMap(([img, who]) => (who as number[]).map((g) => ({ imageId: id(5700 + (img as number)), guestId: id(1000 + g) })));

function heartCounts(projectId: string): Record<string, number> {
  const ids = new Set((projects.find((x) => x.id === projectId)?.gallery || []).map((g: Json) => g.id));
  const out: Record<string, number> = {};
  for (const h of guestHearts) if (ids.has(h.imageId)) out[h.imageId] = (out[h.imageId] || 0) + 1;
  return out;
}

function shareState(projectId: string) {
  const share = shares.find((s) => s.projectId === projectId);
  if (!share) return { share: null, guests: [], hearts: {}, totals: { guests: 0, visits: 0, hearts: 0, downloads: 0 } };
  const list = guestList.filter((g) => g.projectId === projectId).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .map((g) => ({ ...g, hearts: guestHearts.filter((h) => h.guestId === g.id).length }));
  const hearts = heartCounts(projectId);
  const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0);
  return {
    share: { url: `https://www.photodecaffeine.com/galerij/${share.token}`, active: share.active, downloads: share.downloads, createdAt: share.createdAt },
    guests: list.map(({ projectId: _p, key: _k, ...g }) => g),
    hearts,
    totals: { guests: list.length, visits: sum(list.map((g) => g.visits)), hearts: sum(Object.values(hearts)), downloads: sum(list.map((g) => g.downloads)) },
  };
}

/** Mirrors routes/share.ts: the door without a key, the photos with one. */
function shareReply(token: string, key: string, preview: boolean) {
  const share = shares.find((s) => s.token === token && s.active);
  if (!share) throw new ApiError(404, "Deze link werkt niet (meer). Vraag degene die hem stuurde om een nieuwe.");
  const x = projects.find((y) => y.id === share.projectId);
  const guest = guestList.find((g) => g.key === key && g.projectId === share.projectId);
  const shoot = x.events.find((e: Json) => e.kind === "shoot");
  if (!guest && !preview) {
    const cover = x.gallery.find((g: Json) => g.id === x.gallerySettings.coverImageId) || x.gallery[0];
    return { gate: {
      title: x.gallerySettings.title || x.title, subtitle: x.gallerySettings.subtitle || "", shootDate: shoot?.startsAt || "",
      style: x.gallerySettings.style || "", accentColor: x.gallerySettings.accentColor || "", cover: cover?.url || "", photos: x.gallery.length, videos: 0,
    } };
  }
  const client = forClient(x);
  const canDownload = share.downloads && !preview;
  return {
    guest: guest ? { name: guest.name } : null,
    preview: !guest,
    project: {
      id: x.id, title: x.title, stage: x.stage, gallerySettings: x.gallerySettings,
      gallery: client.gallery.map((g: Json) => ({ ...g, download: canDownload && g.download })),
      downloads: canDownload ? client.downloads : "none", watermarked: client.downloads === "watermark",
      events: shoot ? [{ kind: "shoot", startsAt: shoot.startsAt }] : [],
    },
    hearts: heartCounts(x.id),
    mine: guest ? guestHearts.filter((h) => h.guestId === guest.id).map((h) => h.imageId) : [],
    guests: guestList.filter((g) => g.projectId === x.id).length,
  };
}

function guestOf(token: string, key: string) {
  const share = shares.find((s) => s.token === token && s.active);
  if (!share) throw new ApiError(404, "Deze link werkt niet (meer).");
  const guest = guestList.find((g) => g.key === key && g.projectId === share.projectId);
  if (!guest) throw new ApiError(401, "Vul eerst je naam en e-mail in.");
  return { share, guest };
}

// Mirrors projectToApi's client view: watermarked copies and download rights.
function forClient(x: Json) {
  if (!x) return x;
  const done = ["delivered", "review", "archived"].includes(x.stage);
  const downloads = done ? "original" : x.gallerySettings.earlyDownloads || "original";
  const gallery = x.gallery.map((g: Json) => ({
    id: g.id, fileName: g.fileName, w: g.w, h: g.h,
    url: downloads === "watermark" && g.previewUrl ? g.previewUrl : g.url,
    download: downloads === "original" || (downloads === "watermark" && !!g.previewUrl),
  }));
  return { ...x, downloads, gallery, galleryUrls: gallery.map((g: Json) => g.url) };
}

function mkProject(n: number, title: string, type: string, stage: string, clientIds: string[], extra: Json = {}) {
  const gallery = (extra.gallery || []).map((g: string | Json, i: number) => ({ id: id(n * 100 + i), fileName: `IMG_${2200 + i}.jpg`, ...(typeof g === "string" ? { url: g } : g) }));
  const favorites: Record<string, string[]> = {};
  for (const i of extra.favorites || []) if (gallery[i]) favorites[gallery[i].id] = ["Sanne Veldhuis"];
  const cl = clients.filter((c) => clientIds.includes(c.id));
  return {
    id: id(n), title, type, stage, status: stage === "delivered" ? "delivered" : stage === "editing" ? "in_review" : "in_progress",
    phase: "", description: extra.description || "", dueDate: extra.dueDate || "", deliverables: extra.deliverables || [],
    gallerySettings: extra.gallerySettings || {}, galleryUrls: gallery.map((g: Json) => g.url), gallery, events: extra.events || [], demos: [], demoUrl: "", demoNotes: "",
    locationId: extra.locationId || null, clientIds, clientId: clientIds[0], clients: cl.map((c) => ({ id: c.id, name: c.name, email: c.email, company: c.company, userId: c.userId })),
    clientNames: cl.map((c) => c.name), briefing: "Intake: wil vooral de Targa-beugel en het interieur. Geen kentekens zichtbaar.", briefingUpdatedAt: iso(-4),
    valueCents: extra.valueCents ?? null, inquiryId: null, favorites, favoriteIds: Object.keys(favorites), unreadMessages: n === 52 ? 1 : 0,
    createdAt: iso(-n % 30 - 5), updatedAt: iso(-1),
  };
}

const messages: Json[] = [
  { id: id(71), projectId: id(52), senderId: id(102), senderName: "Sanne Veldhuis", senderRole: "client", content: "Kan de achtergrond iets warmer? Verder super!", readAt: null, createdAt: iso(0, 9, 12) },
  { id: id(72), projectId: id(51), senderId: "pdc", senderName: "Per", senderRole: "pdc", content: "Tot zondag! Ik ben er om 17:30.", readAt: iso(-1), createdAt: iso(-1, 21, 40) },
];

const shots: Json[] = [
  { id: id(81), projectId: id(51), label: "Voorkant driekwart, laag standpunt", required: true, done: false, sort: 0 },
  { id: id(82), projectId: id(51), label: "Targa-beugel close-up", required: true, done: false, sort: 1 },
  { id: id(83), projectId: id(51), label: "Rolling shot, Erasmusbrug", required: true, done: false, sort: 2 },
  { id: id(84), projectId: id(51), label: "Interieur, stuur en klokken", required: false, done: false, sort: 3 },
];

const tasks: Json[] = [
  { id: id(91), title: "Selectie van Sanne Veldhuis bewerken", notes: "", dueAt: iso(0, 17), doneAt: null, done: false, kind: "favorites", projectId: id(52), projectTitle: "Teamfoto's 2026", clientId: id(2), clientName: "Sanne Veldhuis", createdAt: iso(-1) },
  { id: id(92), title: "Batterijen laden en ND-filters mee", notes: "", dueAt: iso(1, 12), doneAt: null, done: false, kind: "general", projectId: id(51), projectTitle: "Porsche 911 Targa", clientId: null, clientName: "", createdAt: iso(-2) },
  { id: id(93), title: "Offerte Noor opvolgen", notes: "", dueAt: iso(-1, 10), doneAt: null, done: false, kind: "general", projectId: id(53), projectTitle: "Portret Noor Bakker", clientId: null, clientName: "", createdAt: iso(-3) },
];

const inquiries: Json[] = [
  { id: id(41), name: "Lotte en Sem", email: "lotte@example.nl", phone: "06 11112222", brand: "", message: "Wij gaan trouwen in juni en zoeken een fotograaf voor de hele dag. Hebben jullie nog plek?", package: "", handledAt: null, handled: false, clientId: null, projectId: null, createdAt: iso(0, 8, 5) },
  { id: id(42), name: "Marco Visser", email: "marco@example.nl", phone: "", brand: "BMW M3 Touring", message: "Automotive shoot van mijn M3 voor Instagram.", package: "Automotive", handledAt: null, handled: false, clientId: null, projectId: null, createdAt: iso(-3) },
  // The automotive and social media forms take a phone number instead of an email.
  { id: id(43), name: "Daan Mulder", email: "", phone: "06 33334444", brand: "", message: "Boeking automotive-pakket: €50 per voertuig, 1 uur op locatie.\n\nVehicle: Audi RS4 Avant", package: "automotive", handledAt: null, handled: false, clientId: null, projectId: null, createdAt: iso(-1) },
];

const quotes: Json[] = [
  mkQuote(31, "OF-2026-004", "Portret Noor Bakker", "Noor Bakker", "noor@example.nl", id(3), id(53), "sent", 450, { sentAt: iso(-7), viewedAt: iso(-6), viewCount: 2 }),
  mkQuote(32, "OF-2026-003", "Porsche 911 Targa", "Joris de Wit", "joris@garagedewit.nl", id(1), id(51), "accepted", 895, { sentAt: iso(-12), respondedAt: iso(-10) }),
  mkQuote(33, "OF-2026-005", "Fotoreportage bruiloft", "Lotte en Sem", "lotte@example.nl", "", "", "draft", 1250, {}),
];

function mkQuote(n: number, number: string, title: string, clientName: string, clientEmail: string, clientId: string, projectId: string, status: string, amount: number, extra: Json) {
  return {
    id: id(n), number, type: "photo", title, subtitle: "Shoot + nabewerking", clientName, clientEmail, clientId, projectId, intro: "", status,
    monthly: [], oneTime: [{ label: "Shoot", amount: amount - 150, note: "" }, { label: "Nabewerking", amount: 150, note: "" }], included: ["Online galerij"], terms: [],
    notes: "", validUntil: dateOnly(20), vatBasis: "excl", vatRate: 21, sentAt: extra.sentAt || "", respondedAt: extra.respondedAt || "", response: "",
    viewedAt: extra.viewedAt || "", viewCount: extra.viewCount || 0, sendCount: extra.sentAt ? 1 : 0, totals: { monthly: 0, oneTime: amount },
    link: `https://www.photodecaffeine.com/offerte/${id(n)}?t=abc`, createdAt: iso(-15 + n % 5), updatedAt: iso(-2),
  };
}

const invoices: Json[] = [
  mkInvoice(11, "FA-2026-031", "Café Maas", "info@cafemaas.nl", id(4), id(55), "sent", 540, dateOnly(-23), dateOnly(-9)),
  mkInvoice(12, "FA-2026-029", "Studio Veldhuis", "sanne@studioveldhuis.nl", id(2), id(52), "paid", 1180, dateOnly(-30), dateOnly(-16)),
  mkInvoice(13, "FA-2026-032", "Garage De Wit", "joris@garagedewit.nl", id(1), id(51), "draft", 300, dateOnly(0), dateOnly(14)),
];

function mkInvoice(n: number, number: string, clientName: string, clientEmail: string, clientId: string, projectId: string, status: string, amount: number, issuedOn: string, dueOn: string) {
  const net = amount;
  const vat = Math.round(net * 21) / 100;
  return {
    id: id(n), number, status, overdue: status === "sent" && dueOn < dateOnly(0), quoteId: null, projectId, clientId, clientName, clientEmail, clientAddress: "",
    lines: [{ label: "Fotografie", quantity: 1, amount, note: "" }], vatBasis: "excl", vatRate: 21, issuedOn, dueOn, notes: "", sentAt: status === "draft" ? null : issuedOn,
    remindedAt: null, paidAt: status === "paid" ? iso(-10) : null, totals: { net, vat, total: net + vat, vatRate: 21 },
    link: `https://www.photodecaffeine.com/factuur/${id(n)}?t=abc`, createdAt: iso(-20), updatedAt: iso(-2),
  };
}

// Reviews as they come back from the Google profile, plus one from the portal era.
const reviews: Json[] = [
  { id: "g-AbC1", source: "google", googleId: "AbC1", googleName: "accounts/1/locations/2/reviews/AbC1", clientName: "Café Maas", photoUrl: "", rating: 5, text: "Prachtige foto's, snel geleverd en heel prettig samengewerkt.", reply: { text: "Dank jullie wel! Het was een mooie zomeravond om te shooten.", updatedAt: iso(-11) }, projectId: id(55), projectTitle: "Zomerterras", portfolioArticleId: id(403), published: true, createdAt: iso(-12) },
  { id: "g-DeF2", source: "google", googleId: "DeF2", googleName: "accounts/1/locations/2/reviews/DeF2", clientName: "Thomas Rooijmans", photoUrl: "https://lh3.googleusercontent.com/a/mock-thomas", rating: 5, text: "Per is een fijne, vriendelijke kerel en gaat professioneel te werk. Dat zie je terug in de kwaliteit van de foto's. Zeker een aanrader!", reply: null, projectId: null, projectTitle: "", portfolioArticleId: null, published: false, createdAt: iso(0, 9) },
  { id: "g-GhI3", source: "google", googleId: "GhI3", googleName: "accounts/1/locations/2/reviews/GhI3", clientName: "Jeroen de Vries", photoUrl: "", rating: 4, text: "", reply: null, projectId: null, projectTitle: "", portfolioArticleId: null, published: false, createdAt: iso(-20) },
  { id: id(412), source: "portal", googleId: null, googleName: null, clientName: "Sanne Veldhuis", photoUrl: "", rating: 4, text: "Mooi resultaat, iedereen blij.", reply: null, projectId: id(52), projectTitle: "Teamfoto's 2026", portfolioArticleId: null, published: false, createdAt: iso(-1) },
];
const google: Json = {
  configured: false, clientId: "", fromEnv: false, connected: false, email: "", title: "", mapsUrl: "", reviewUrl: "",
  rating: 0, count: 0, lastSyncAt: null, lastError: "",
};
const reviewRequests: Record<string, Json> = {
  [id(57)]: { status: "clicked", requestedAt: iso(-2), clickedAt: iso(-1), link: "http://localhost/review/0123456789abcdef0123456789abcdef" },
  [id(52)]: { status: "submitted", requestedAt: iso(-3), link: "http://localhost/review/fedcba9876543210fedcba9876543210" },
};

function eventsWithContext() {
  return projects.flatMap((p) => p.events.map((e: Json) => {
    const loc = locations.find((l) => l.id === e.locationId);
    return { ...e, projectId: p.id, projectTitle: p.title, projectStage: p.stage, clientNames: p.clientNames, location: loc ? { id: loc.id, name: loc.name, address: loc.address, lat: loc.lat, lng: loc.lng } : null };
  }));
}

// Notes on the reader documents, with one from Majd so the panel is not empty.
const docNotes: Json[] = [
  { id: id(950), sectionId: "p3--2-portretten-artikel-19-auteurswet", text: "Goed dat dit erin staat. Moeten we dit ook op de offerte zetten?", authorId: id(902), authorName: "Majd", createdAt: iso(-1, 14), updatedAt: iso(-1, 14) },
];
const docRead: Record<string, Json> = {};
function me(): { id: string; name: string } {
  try {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    const user = key ? JSON.parse(localStorage.getItem(key) || "{}").user : null;
    return { id: user?.id || id(901), name: user?.user_metadata?.name || "Per" };
  } catch {
    return { id: id(901), name: "Per" };
  }
}

function overview() {
  const evs = eventsWithContext().filter((e) => new Date(e.startsAt).getTime() > now - 12 * 3600000 && new Date(e.startsAt).getTime() < now + 8 * day).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const stageCounts: Record<string, number> = {};
  for (const p of projects) stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
  return {
    events: evs,
    unreadMessages: messages.filter((m) => m.senderRole === "client" && !m.readAt).map((m) => ({ id: m.id, projectId: m.projectId, projectTitle: projects.find((p) => p.id === m.projectId)?.title, senderName: m.senderName, content: m.content, createdAt: m.createdAt })),
    openQuotes: quotes.filter((q) => q.status === "sent").map((q) => ({ id: q.id, number: q.number, title: q.title, clientName: q.clientName, sentAt: q.sentAt, viewedAt: q.viewedAt, viewCount: q.viewCount, total: q.totals.oneTime, monthly: 0 })),
    overdueInvoices: invoices.filter((i) => i.overdue).map((i) => ({ id: i.id, number: i.number, clientName: i.clientName, dueOn: i.dueOn, total: i.totals.total })),
    openInvoiceTotal: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.totals.total, 0),
    paidThisMonth: 0,
    tasks: tasks.filter((t) => !t.done),
    newInquiries: inquiries.filter((i) => !i.handled),
    stageCounts,
    dueSoon: projects.filter((p) => p.dueDate && p.dueDate <= dateOnly(3) && !["delivered", "review", "archived"].includes(p.stage)).map((p) => ({ id: p.id, title: p.title, dueDate: p.dueDate, overdue: p.dueDate < dateOnly(0) })),
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mirrors the edge function's routes closely enough to drive every screen. */
export async function mockApi(path: string, method: string, body: Json): Promise<Json> {
  await delay(120 + Math.random() * 180);
  const url = new URL(path, "http://mock");
  const p = url.pathname;
  const m = (re: RegExp) => p.match(re);
  let r: RegExpMatchArray | null;

  if (method === "GET") {
    if ((r = m(/^\/admin\/documents\/([^/]+)$/))) return structuredClone({ notes: docNotes, read: docRead[r[1]] || { done: [], at: null } });
    if (p === "/admin/overview") return overview();
    if (p === "/admin/projects") return { projects };
    if ((r = m(/^\/admin\/project\/([^/]+)$/))) return { project: projects.find((x) => x.id === r![1]) };
    if ((r = m(/^\/admin\/project\/([^/]+)\/messages$/))) return { messages: messages.filter((x) => x.projectId === r![1]) };
    if ((r = m(/^\/admin\/project\/([^/]+)\/shots$/))) return { shots: shots.filter((x) => x.projectId === r![1]).sort((a, b) => a.sort - b.sort) };
    if ((r = m(/^\/admin\/project\/([^/]+)\/engagement$/))) return { reviewRequest: reviewRequests[r[1]] || null, feedbackRequest: null, review: structuredClone(reviews.find((x) => x.projectId === r![1]) || null), feedback: [] };
    if ((r = m(/^\/admin\/project\/([^/]+)\/share$/))) return shareState(r[1]);
    if ((r = m(/^\/share\/([^/]+)$/))) return shareReply(r[1], url.searchParams.get("key") || "", url.searchParams.get("preview") === "1");
    if (p === "/admin/clients") return { clients };
    if ((r = m(/^\/admin\/client\/([^/]+)$/))) {
      const c = clients.find((x) => x.id === r![1]);
      return { client: c, projects: projects.filter((x) => x.clientIds.includes(c.id)), quotes: quotes.filter((q) => q.clientId === c.id).map((q) => ({ id: q.id, number: q.number, title: q.title, status: q.status, sent_at: q.sentAt, created_at: q.createdAt })), invoices: invoices.filter((i) => i.clientId === c.id).map((i) => ({ id: i.id, number: i.number, status: i.status, due_on: i.dueOn, created_at: i.createdAt })), inquiries: [] };
    }
    if (p === "/admin/inquiries") return { inquiries };
    if (p === "/admin/locations") return { locations };
    if (p === "/admin/events") {
      const from = url.searchParams.get("from"), to = url.searchParams.get("to"), pid = url.searchParams.get("projectId");
      return { events: eventsWithContext().filter((e) => (!from || e.startsAt >= from) && (!to || e.startsAt < to) && (!pid || e.projectId === pid)) };
    }
    if (p === "/admin/tasks") return { tasks };
    if (p === "/admin/quotes") return { quotes };
    if (p === "/admin/invoices") return { invoices };
    if ((r = m(/^\/admin\/invoices\/([^/]+)$/))) return { invoice: invoices.find((x) => x.id === r![1]), business: { name: "PhotoDeCaffeine Productions", address: "Roosendaal", kvk: "12345678", vatNumber: "NL001234567B01", iban: "NL00 BANK 0123 4567 89", email: "contact@photodecaffeine.com" } };
    if (p === "/admin/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      return {
        clients: clients.filter((c) => `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(q)),
        projects: projects.filter((x) => x.title.toLowerCase().includes(q)).map((x) => ({ id: x.id, title: x.title, stage: x.stage, type: x.type })),
        locations: locations.filter((l) => l.name.toLowerCase().includes(q)).map((l) => ({ id: l.id, name: l.name, address: l.address, kind: l.kind })),
        quotes: quotes.filter((x) => `${x.number} ${x.title}`.toLowerCase().includes(q)).map((x) => ({ id: x.id, number: x.number, title: x.title, client_name: x.clientName, status: x.status })),
        invoices: [],
      };
    }
    if (p === "/admin/calendar-feed") return { url: "https://www.photodecaffeine.com/api/calendar/0123456789abcdef0123456789abcdef0123456789abcdef.ics" };
    if (p === "/admin/settings") return { settings: { heroImageUrl: PHOTOS[0], heroImageMobileUrl: "", frameImageUrl: PHOTOS[6], studioName: "PhotoDeCaffeine", contactEmail: "contact@photodecaffeine.com", sections: { workProcess: true, portfolio: true, about: true, services: true, socialProof: false, customCTA: true }, business: { name: "PhotoDeCaffeine Productions" } } };
    if (p === "/admin/notifications") return { notifications: [], unread: 0, readAt: "" };
    if (p === "/admin/me") return { id: id(999), email: "per@example.nl", name: "Per van Hassel", isOwner: true, roleName: "Eigenaar", permissions: Object.fromEntries(["manageClients", "manageQuotes", "manageInquiries", "managePortfolio", "manageAds", "manageSettings", "manageDeclarations", "viewAllDeclarations", "manageAdmins"].map((k) => [k, true])) };
    if (p === "/admin/portfolio") return { articles: [
      { id: id(401), title: "BMW 320i Touring", category: "Automotive", coverUrl: PHOTOS[0], coverType: "image", description: "Avondshoot in de haven.", galleryUrls: PHOTOS.slice(0, 5), published: true, featured: true, createdAt: iso(-40), updatedAt: iso(-3) },
      { id: id(402), title: "Studio Veldhuis team", category: "Portret", coverUrl: PHOTOS[6], coverType: "image", description: "", galleryUrls: PHOTOS.slice(6, 9), published: true, featured: false, createdAt: iso(-30), updatedAt: iso(-10) },
      { id: id(403), title: "Café Maas zomer", category: "Horeca", coverUrl: PHOTOS[9], coverType: "image", description: "", galleryUrls: [], published: false, featured: false, createdAt: iso(-5), updatedAt: iso(-1) },
      { id: id(404), title: "__automotive_gallery__", category: "_automotive-gallery", coverUrl: PHOTOS[1], coverType: "image", description: "", galleryUrls: PHOTOS.slice(0, 6), published: true, featured: false, createdAt: iso(-90), updatedAt: iso(-2) },
    ] };
    // Copies: react-query keeps its old data when the objects it holds were changed in place.
    if (p === "/admin/reviews") return { reviews: structuredClone(reviews).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    if (p === "/admin/google") return { ...google };
    if (p === "/admin/feedback") return { feedback: [{ id: id(421), projectId: id(52), projectTitle: "Teamfoto's 2026", clientName: "Sanne Veldhuis", createdAt: iso(-1), items: [{ id: id(422), scope: "photos", photoUrls: PHOTOS.slice(4, 6), category: "", text: "Kan de achtergrond hier iets warmer?" }] }] };
    if (p === "/admin/workers") return { workers: [
      { id: id(999), email: "per@example.nl", name: "Per van Hassel", lastSignIn: iso(0, 9), isOwner: true, roleId: null, roleName: "Eigenaar" },
      { id: id(998), email: "majd@example.nl", name: "Majd", lastSignIn: iso(-2), isOwner: false, roleId: id(431), roleName: "CEO" },
    ], roles: [
      { id: id(431), name: "CEO", permissions: { manageClients: true, managePortfolio: true, manageInquiries: true, manageAds: true, manageSettings: true, manageDeclarations: true } },
      { id: id(432), name: "CFO", permissions: { manageClients: true, manageQuotes: true, manageInquiries: true, manageDeclarations: true, viewAllDeclarations: true } },
    ] };
    if (p === "/admin/declarations") return { canViewAll: true, declarations: [
      { id: id(441), adminId: id(999), adminName: "Per van Hassel", amount: 121, vatRate: 21, vatAmount: 21, date: dateOnly(-10), category: "Apparatuur", description: "SD-kaarten 128 GB", receiptUrl: "", receiptRef: "", createdAt: iso(-10) },
      { id: id(442), adminId: id(998), adminName: "Majd", amount: 38.5, vatRate: 21, vatAmount: 6.68, date: dateOnly(-3), category: "Reiskosten", description: "Parkeren Maasboulevard", receiptUrl: PHOTOS[3], receiptRef: "private:x", createdAt: iso(-3) },
    ], totals: { amount: 159.5, vatAmount: 27.68, count: 2, byCategory: {} } };
    if (p === "/admin/ads") return {
      visits: Array.from({ length: 60 }, (_, i) => ({ ref: i % 3 ? "insta-automotive-1" : "fb-portret", page: i % 3 ? "/services/automotive" : "/", createdAt: iso(-(i % 28), 12) })),
      leads: [{ id: id(451), name: "Marco", ref: "insta-automotive-1", createdAt: iso(-3) }],
      campaigns: [{ ref: "insta-automotive-1", label: "Insta automotive september", active: true, hidden: false }],
    };
    // portal
    if (p === "/portal/projects") return { projects: projects.filter((x) => x.clientIds.includes(id(2)) || x.clientIds.includes(id(1))).map((x) => ({ ...x, briefing: undefined })), locations: Object.fromEntries(locations.map((l) => [l.id, l])) };
    if ((r = m(/^\/portal\/project\/([^/]+)$/))) {
      const share = shares.find((s) => s.projectId === r![1] && s.active);
      return {
        project: {
          ...forClient(projects.find((x) => x.id === r![1])),
          share: share ? { url: `https://www.photodecaffeine.com/galerij/${share.token}`, guests: guestList.filter((g) => g.projectId === r![1]).length } : null,
          groupHearts: heartCounts(r[1]),
        },
        locations: Object.fromEntries(locations.map((l) => [l.id, l])),
      };
    }
    if ((r = m(/^\/portal\/project\/([^/]+)\/messages$/))) return { messages: messages.filter((x) => x.projectId === r![1]) };
    if (p === "/portal/events") return { events: eventsWithContext().filter((e) => e.startsAt > iso(-1)), locations: Object.fromEntries(locations.map((l) => [l.id, l])) };
    if (p === "/portal/quotes") return { quotes: quotes.filter((q) => q.status !== "draft").map((q) => ({ ...q, token: "abc" })) };
    if (p === "/portal/invoices") return { invoices: invoices.filter((i) => i.status !== "draft").map((i) => ({ id: i.id, number: i.number, status: i.status, issuedOn: i.issuedOn, dueOn: i.dueOn, paidAt: i.paidAt, totals: i.totals, token: "abc" })) };
    if (p === "/portal/me") return { client: clients[1] };
    if ((r = m(/^\/portal\/project\/([^/]+)\/engagement$/))) {
      const rv = reviews.find((x) => x.projectId === r![1]);
      return { reviewRequested: !!reviewRequests[r[1]], reviewLink: "https://g.page/r/CUkHU8gqLEm4EBI/review", review: rv ? { rating: rv.rating, text: rv.text, source: rv.source } : null, feedbackRequested: false, feedbackCount: 0 };
    }
    if ((r = m(/^\/portal\/project\/([^/]+)\/download\/([^/]+)$/))) return { url: PHOTOS[0], fileName: "foto.jpg" };
    if ((r = m(/^\/invoice\/([^/]+)$/))) {
      const { quoteId: _q, projectId: _p, clientId: _c, link: _l, ...pub } = invoices.find((x) => x.id === r![1]) || invoices[0];
      return { invoice: pub, business: { name: "PhotoDeCaffeine Productions", address: "Roosendaal", kvk: "12345678", vatNumber: "", iban: "NL00 BANK 0123 4567 89", email: "contact@photodecaffeine.com" } };
    }
  }

  // Writes: apply the obvious change in memory and answer like the server.
  if (p === "/admin/declarations/receipt") {
    await delay(800);
    const file = (body as FormData).get("file") as File;
    return { receiptRef: `private:receipts/${id(999)}/${Date.now()}-0a1b2c3d-${file.name}` };
  }
  if ((r = m(/^\/admin\/project\/([^/]+)\/share(\/renew)?$/)) && method !== "GET") {
    const share = shares.find((s) => s.projectId === r![1]);
    const token = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    if (r[2]) Object.assign(share, { token: token(), active: true });
    else if (method === "PUT") Object.assign(share, body);
    else if (share) share.active = true;
    else shares.push({ projectId: r[1], token: token(), active: true, downloads: false, createdAt: new Date().toISOString() });
    return shareState(r[1]);
  }
  if ((r = m(/^\/admin\/project\/([^/]+)\/share\/guests\/([^/]+)$/)) && method === "DELETE") {
    guestList.splice(guestList.findIndex((g) => g.id === r![2]), 1);
    return shareState(r[1]);
  }
  if ((r = m(/^\/share\/([^/]+)\/guest$/))) {
    const share = shares.find((s) => s.token === r![1] && s.active);
    if (!share) throw new ApiError(404, "Deze link werkt niet (meer).");
    const email = String(body.email).trim().toLowerCase();
    let guest = guestList.find((g) => g.projectId === share.projectId && g.email === email);
    if (!guest) {
      guest = { id: id(1100 + guestList.length), projectId: share.projectId, key: Math.random().toString(16).slice(2).padEnd(32, "0"), email, visits: 1, downloads: 0, firstSeenAt: new Date().toISOString() };
      guestList.push(guest);
    }
    Object.assign(guest, { name: String(body.name).trim(), lastSeenAt: new Date().toISOString() });
    return { key: guest.key, name: guest.name };
  }
  if ((r = m(/^\/share\/([^/]+)\/heart$/))) {
    const { guest } = guestOf(r[1], body.key);
    const at = guestHearts.findIndex((h) => h.imageId === body.imageId && h.guestId === guest.id);
    if (body.on && at < 0) guestHearts.push({ imageId: body.imageId, guestId: guest.id });
    if (!body.on && at >= 0) guestHearts.splice(at, 1);
    return { count: guestHearts.filter((h) => h.imageId === body.imageId).length };
  }
  if ((r = m(/^\/share\/([^/]+)\/download(ed)?$/))) {
    const { share, guest } = guestOf(r[1], body.key);
    if (!share.downloads) throw new ApiError(403, "Downloaden staat uit voor deze galerij.");
    guest.downloads += body.count || 1;
    const img = projects.find((x) => x.id === share.projectId).gallery.find((g: Json) => g.id === body.imageId);
    return r[2] ? { success: true } : { url: img.url, fileName: img.fileName };
  }
  if ((r = m(/^\/admin\/project\/([^/]+)\/gallery\/sizes$/)) && method === "PUT") {
    const x = projects.find((y) => y.id === r![1]);
    for (const s of body.sizes) Object.assign(x.gallery.find((g: Json) => g.id === s.id) || {}, { w: s.w, h: s.h });
    return { success: true, updated: body.sizes.length };
  }
  if ((r = m(/^\/admin\/project\/([^/]+)\/gallery\/([^/]+)\/preview$/)) && method === "PUT") {
    const g = projects.find((y) => y.id === r![1])?.gallery.find((y: Json) => y.id === r![2]);
    g.previewUrl = URL.createObjectURL((body as FormData).get("file") as File);
    g.watermark = true;
    return { success: true };
  }
  if ((r = m(/^\/admin\/project\/([^/]+)$/)) && method === "PUT") {
    const x = projects.find((y) => y.id === r![1]);
    if (body.stage) x.stage = body.stage;
    if (body.locationId !== undefined) x.locationId = body.locationId;
    Object.assign(x, Object.fromEntries(Object.entries(body).filter(([k]) => ["title", "description", "dueDate", "deliverables", "valueCents", "briefing", "gallerySettings"].includes(k))));
    return { project: x };
  }
  if (p === "/admin/project" && method === "POST") {
    const x = mkProject(projects.length + 60, body.title, body.type, body.stage, body.clientIds);
    projects.unshift(x);
    return { project: x };
  }
  if (p === "/admin/client" && method === "POST") {
    const c = { ...clients[0], id: id(clients.length + 10), userId: null, hasAccount: false, projectCount: 0, lastSignIn: null, ...body, createdAt: new Date().toISOString() };
    clients.push(c);
    return { client: c };
  }
  if ((r = m(/^\/admin\/project\/([^/]+)\/messages$/)) && method === "POST") {
    const msg = { id: id(900 + messages.length), projectId: r[1], senderId: "pdc", senderName: "Per", senderRole: "pdc", content: body.content, readAt: null, createdAt: new Date().toISOString() };
    messages.push(msg);
    return { message: msg };
  }
  if (m(/^\/admin\/documents\/[^/]+\/notes$/) && method === "POST") {
    const note = { id: id(960 + docNotes.length), sectionId: body.sectionId, text: body.text || "", quote: body.quote || null, authorId: me().id, authorName: me().name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    docNotes.push(note);
    return { note };
  }
  if ((r = m(/^\/admin\/documents\/[^/]+\/notes\/([^/]+)$/))) {
    const note = docNotes.find((x) => x.id === r![1]);
    if (method === "DELETE") { docNotes.splice(docNotes.indexOf(note), 1); return { success: true }; }
    Object.assign(note, { text: body.text, updatedAt: new Date().toISOString() });
    return { note };
  }
  if ((r = m(/^\/admin\/documents\/([^/]+)\/read$/))) { docRead[r[1]] = body; return { read: body }; }
  if (m(/\/messages\/read$/)) { messages.forEach((x) => { x.readAt ||= new Date().toISOString(); }); return { success: true }; }
  if ((r = m(/^\/admin\/project\/([^/]+)\/shots$/)) && method === "POST") {
    const s = { id: id(800 + shots.length), projectId: r[1], label: body.label, required: !!body.required, done: false, sort: shots.length };
    shots.push(s);
    return { shot: s };
  }
  if ((r = m(/^\/admin\/shots\/([^/]+)$/))) {
    const s = shots.find((x) => x.id === r![1]);
    if (method === "DELETE") { shots.splice(shots.indexOf(s), 1); return { success: true }; }
    Object.assign(s, body);
    return { shot: s };
  }
  if (p === "/admin/locations" && method === "POST") {
    const l = { id: id(700 + locations.length), ...body, photos: [], usedCount: 0, lastUsed: null, projects: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    locations.push(l);
    return { location: l };
  }
  if ((r = m(/^\/admin\/locations\/([^/]+)$/))) {
    const l = locations.find((x) => x.id === r![1]);
    if (method === "DELETE") { locations.splice(locations.indexOf(l), 1); return { success: true }; }
    Object.assign(l, body);
    return { location: l };
  }
  if (p === "/admin/tasks" && method === "POST") {
    const t = { id: id(600 + tasks.length), title: body.title, notes: "", dueAt: body.dueAt, doneAt: null, done: false, kind: "general", projectId: body.projectId, projectTitle: projects.find((x) => x.id === body.projectId)?.title || "", clientId: null, clientName: "", createdAt: new Date().toISOString() };
    tasks.push(t);
    return { task: t };
  }
  if ((r = m(/^\/admin\/tasks\/([^/]+)$/))) {
    const t = tasks.find((x) => x.id === r![1]);
    if (method === "DELETE") { tasks.splice(tasks.indexOf(t), 1); return { success: true }; }
    if (body.done !== undefined) { t.done = body.done; t.doneAt = body.done ? new Date().toISOString() : null; }
    Object.assign(t, { ...body, done: t.done });
    return { task: t };
  }
  if (p === "/admin/events" && method === "POST") {
    const x = projects.find((y) => y.id === body.projectId) || projects[0];
    const e = { id: id(500 + x.events.length + 20), ...body };
    x.events.push(e);
    return { event: e };
  }
  if ((r = m(/^\/admin\/events\/([^/]+)$/))) {
    for (const x of projects) {
      const e = x.events.find((y: Json) => y.id === r![1]);
      if (!e) continue;
      if (method === "DELETE") { x.events.splice(x.events.indexOf(e), 1); return { success: true }; }
      Object.assign(e, body);
      return { event: e };
    }
  }
  if (p === "/admin/google/client" && method === "PUT") { Object.assign(google, { configured: true, clientId: body.clientId }); return google; }
  if (p === "/admin/google/start" && method === "POST") return { url: `${window.location.origin}/admin/reviews/google?code=mock&state=mock` };
  if (p === "/admin/google/connect" && method === "POST") {
    Object.assign(google, { configured: true, connected: true, email: "pervanhassel@gmail.com", title: "PhotoDeCaffeine", mapsUrl: "https://www.google.com/maps?cid=13279193538539751241", rating: 4.8, count: 14, lastSyncAt: new Date().toISOString() });
    return { ...google, synced: { added: 3, updated: 0, removed: 0 } };
  }
  if (p === "/admin/google/sync" && method === "POST") { google.lastSyncAt = new Date().toISOString(); return { ...google, synced: { added: 0, updated: 1, removed: 0 } }; }
  if (p === "/admin/google" && method === "DELETE") { Object.assign(google, { connected: false, email: "", title: "" }); return google; }
  if (p === "/admin/reviews" && method === "POST") {
    const rv = { id: crypto.randomUUID(), source: "google", googleId: null, googleName: null, photoUrl: "", reply: null, portfolioArticleId: null, ...body, projectTitle: projects.find((x) => x.id === body.projectId)?.title || "" };
    reviews.push(rv);
    return { review: rv };
  }
  if ((r = m(/^\/admin\/reviews\/([^/]+)\/reply$/))) {
    const rv = reviews.find((x) => x.id === r![1]);
    rv.reply = method === "DELETE" ? null : { text: body.text, updatedAt: new Date().toISOString() };
    return { review: rv };
  }
  if ((r = m(/^\/admin\/reviews\/([^/]+)$/))) {
    const rv = reviews.find((x) => x.id === r![1]);
    if (method === "DELETE") { reviews.splice(reviews.indexOf(rv), 1); return { success: true }; }
    Object.assign(rv, body);
    if ("projectId" in body) rv.projectTitle = projects.find((x) => x.id === body.projectId)?.title || "";
    return { review: rv };
  }
  if (p === "/review/open" && method === "POST") return { url: "https://g.page/r/CUkHU8gqLEm4EBI/review" };
  if ((r = m(/^\/admin\/inquiry\/([^/]+)$/)) && method === "PUT") {
    const i = inquiries.find((x) => x.id === r![1]);
    i.handled = body.handled; i.handledAt = body.handled ? new Date().toISOString() : null;
    return { inquiry: i };
  }
  if ((r = m(/^\/admin\/invoices\/([^/]+)\/status$/))) {
    const i = invoices.find((x) => x.id === r![1]);
    i.status = body.status;
    return { invoice: i };
  }
  if ((r = m(/^\/portal\/project\/([^/]+)\/favorites$/)) && method === "POST") {
    const x = projects.find((y) => y.id === r![1]);
    x.favoriteIds = body.favorite ? [...new Set([...(x.favoriteIds || []), body.imageId])] : (x.favoriteIds || []).filter((f: string) => f !== body.imageId);
    return { success: true };
  }
  return { success: true };
}
