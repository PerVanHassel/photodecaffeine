import { Hono } from "npm:hono";
import { accountName, accountOf, type GuestRow, guestForAccount } from "../lib/accounts.ts";
import { verifyAdmin } from "../lib/auth.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, SITE_URL, TERMS_VERSION } from "../lib/config.ts";
import { childStatus, consentUrl, formFields } from "../lib/consents.ts";
import { db, found, must } from "../lib/db.ts";
import { logDownloads } from "../lib/downloads.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, text, uuid, z } from "../lib/http.ts";
import { createPayment, getPayment, mollieMode } from "../lib/mollie.ts";
import { notify } from "../lib/notify.ts";
import {
  ACCESS_SELECT, basketTotal, boughtImageIds, guestWindowOpen, orderStatement, payableNow, pricingOf, salesOpen,
} from "../lib/orders.ts";
import { galleryDelivered } from "../lib/parts.ts";
import {
  BOOKING_URL, deliveredImageIds, imagesOf, invoicesOf, MAX_OPEN_PER_GUEST, personLabel, priorityStatement, receivedMail, studioMail,
} from "../lib/priority.ts";
import { childTagEmail } from "../lib/projectEmails.ts";
import {
  downloadLink, downloadLinks, type Downloads, downloadsUntil, galleryAccess, gallerySigner, guestAccess, heldBack, imageToApi, loadProject, type ProjectRow,
  publicSettings, type Signer, type Version,
} from "../lib/projects.ts";
import { noteGuestReviewer, reviewLink } from "../lib/reviews.ts";
import { guestCount, guestHearts, setPhotoMails, shareUrl, VISIT_GAP_MS, wantsPhotoMails } from "../lib/shares.ts";
import { signPaths } from "../lib/storage.ts";
import { invoiceLink } from "./invoices.ts";
import { syncPayment } from "./payments.ts";

const r = new Hono<Env>();
export default r;

// ============================================================================
// GROUP LINK — the guests' side (/galerij/<token> on the site)
// ============================================================================
//
// No login to look. The token gets someone to the door; the name and e-mail
// they leave there get them a key that their browser keeps. Every request
// after that carries it, so the studio sees who looked, how often, which
// photos they liked and what they downloaded. Buying takes an account
// (lib/accounts.ts): someone signed in is known by that account instead of a
// key, here and on Mijn foto's. A studio admin can look without being counted.

const S = "/make-server-0951c59e/share/:token";

type Share = {
  project_id: string; downloads: boolean; consent_required: boolean;
  /** Voorrang: whether guests may ask, for how much, and how fast it comes (lib/priority.ts). */
  priority: boolean; priority_price: number | string; priority_days: number;
  /** Photos for sale with a watermark, at the start-up price and the normal one, maybe in bundles (lib/orders.ts). */
  sales: boolean; photo_price: number | string; photo_price_normal: number | string;
  bundle_size: number; bundle_price: number | string; discount_until: string | null;
};
type Guest = GuestRow;
type Who = { guest: Guest; account: any | null };

async function openShare(token: string): Promise<Share> {
  const share = /^[A-Za-z0-9]{8,64}$/.test(token)
    ? must(await db.from("gallery_shares")
      .select("project_id, active, downloads, consent_required, priority, priority_price, priority_days, sales, photo_price, photo_price_normal, bundle_size, bundle_price, discount_until")
      .eq("token", token).maybeSingle()) as any
    : null;
  if (!share?.active) fail(404, "Deze link werkt niet (meer). Vraag degene die hem stuurde om een nieuwe.");
  return share;
}

async function guestByKey(share: Share, key: string): Promise<Guest | null> {
  if (!/^[0-9a-f]{32}$/.test(key)) return null;
  return must(await db.from("gallery_guests").select("id, project_id, name, email, visits, downloads, last_seen_at, user_id")
    .eq("key", key).eq("project_id", share.project_id).maybeSingle()) as Guest | null;
}

/** Who is asking: an account that is signed in, or a guest by the key from the door. */
async function identify(c: any, share: Share, key: string): Promise<Who | null> {
  const account = await accountOf(c);
  if (account) return { guest: await guestForAccount(share.project_id, account), account };
  const guest = await guestByKey(share, key);
  return guest ? { guest, account: null } : null;
}

/** With the studio's switch on: no answer from this e-mail address yet, so no photos yet. */
async function owesConsent(share: Share, guest: Guest): Promise<boolean> {
  if (!share.consent_required) return false;
  const res = await db.from("consents").select("id", { count: "exact", head: true }).eq("project_id", share.project_id).eq("parent_email", guest.email);
  must(res);
  return (res.count || 0) === 0;
}

/** 401 sends the page back to the door (the studio may have removed this guest). */
async function mustGuest(c: any, share: Share, key: string): Promise<Who> {
  const who = await identify(c, share, key);
  if (!who) fail(401, "Vul eerst je naam en e-mail in.");
  if (await owesConsent(share, who.guest)) fail(403, "Vul eerst de toestemming in.");
  return who;
}

const isVideo = (g: any) => /\.(mp4|mov|m4v|webm)$/i.test(String(g.file_name || g.url).split("?")[0]);

/** What shows at the door: enough to see whose photos these are. */
async function gateOf(row: ProjectRow, share: Share, test: boolean) {
  const gs = row.gallery_settings || {};
  const sees = doorSees(row, share, test);
  const images = (row.gallery_images || []).filter((g: any) => !heldBack(g) && (sees === "original" || g.preview_path)).sort((a: any, b: any) => a.sort - b.sort);
  const videos = images.filter(isVideo).length;
  const cover = images.find((g: any) => g.id === gs.coverImageId) || images.find((g: any) => !isVideo(g));
  // The same copy the gallery shows: watermarked while guests see the watermark.
  const path = cover && (sees === "watermark" ? cover.preview_path : cover.display_path || cover.storage_path);
  const coverUrl = !cover ? "" : path ? (await signPaths([path])).get(path) || "" : cover.url;
  const look = publicSettings(gs);
  delete look.coverUrl;
  return {
    ...look,
    title: gs.title || row.title,
    subtitle: gs.subtitle || "",
    shootDate: shootOf(row)?.starts_at || "",
    style: gs.style || "",
    accentColor: gs.accentColor || "",
    cover: coverUrl,
    photos: images.length - videos,
    videos,
    selling: !!salesView(share, row, test, false),
  };
}

/** At the door, selling only counts when paying works (or the link is the studio's test). */
function doorSees(row: ProjectRow, share: Share, test: boolean): Version {
  const selling = share.sales && salesOpen(row) && payableNow(test);
  return guestAccess(row, { downloads: share.downloads, sales: selling }).sees;
}

function shootOf(row: ProjectRow): any {
  return (row.events || [])
    .filter((e: any) => e.kind === "shoot" && e.client_visible)
    .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))[0];
}

/**
 * The photos and how they are shown; nothing about the client or the planning.
 * `own` are this guest's own photos (voorrang, and bought ones once signed in):
 * the original, to download. `bought` are photos bought with an account that
 * is not signed in here. With `forSale` every other photo with a watermarked
 * copy can be bought.
 */
function guestProject(row: ProjectRow, sign: Signer, access: { sees: Version; downloads: Downloads }, own: Set<string>, bought: Set<string>, forSale: boolean) {
  const gs = publicSettings(row.gallery_settings || {});
  const shoot = shootOf(row);
  const images = (row.gallery_images || []).filter((g: any) => !heldBack(g)).sort((a: any, b: any) => a.sort - b.sort);
  const gallery: Record<string, any>[] = [];
  for (const g of images) {
    if (own.has(g.id)) {
      gallery.push({ ...imageToApi(g, sign, "original"), download: true, mine: true });
      continue;
    }
    // Someone who sees watermarks only gets photos that have one; videos have none.
    if (access.sees === "watermark" && !g.preview_path) continue;
    const img: Record<string, any> = { ...imageToApi(g, sign, access.sees), download: access.downloads !== "none" };
    if (bought.has(g.id)) img.bought = true;
    else if (forSale && g.preview_path) img.buy = true;
    gallery.push(img);
  }
  const cover = gallery.find((g: any) => g.id === gs.coverImageId) || gallery.find((g: any) => !isVideo({ file_name: g.fileName }));
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    gallerySettings: { ...gs, coverImageId: cover?.id, coverUrl: cover?.url || "" },
    gallery,
    downloads: access.downloads,
    downloadsUntil: downloadsUntil(row),
    watermarked: access.sees === "watermark",
    galleryDelivered: galleryAccess(row).delivered,
    events: shoot ? [{ kind: "shoot", startsAt: shoot.starts_at }] : [],
  };
}

/**
 * At a shoot with a consent form: this guest's own children, from the form they
 * filled in and the photos they pointed out, and only theirs. Other parents'
 * children and every answer stay out of this: names go to the studio alone.
 */
async function kidsOf(projectId: string, guest: Guest) {
  const form = must(await db.from("consent_forms").select("token, active").eq("project_id", projectId).maybeSingle()) as any;
  if (!form) return null;
  const [answers, tagged] = await Promise.all([
    db.from("consents").select("child_name").eq("project_id", projectId).eq("parent_email", guest.email),
    db.from("gallery_child_tags").select("image_id, child_name").eq("guest_id", guest.id),
  ]);
  const own = (must(answers) || []) as any[];
  const rows = (must(tagged) || []) as any[];
  const tags: Record<string, string[]> = {};
  for (const t of rows) (tags[t.image_id] ||= []).push(t.child_name);
  return {
    names: [...new Set([...own.map((c) => c.child_name), ...rows.map((t) => t.child_name)])],
    tags,
    // Someone who has not said anything yet can still do so from here.
    consentUrl: own.length === 0 && form.active ? consentUrl(form.token) : "",
  };
}

async function seen(guest: Guest, patch: Record<string, unknown> = {}) {
  must(await db.from("gallery_guests").update({ last_seen_at: new Date().toISOString(), ...patch }).eq("id", guest.id));
}

/**
 * Voorrang in this gallery: whether this guest can still ask (not once the
 * photos are delivered to everyone), and their own requests. `own` are the
 * photos of their delivered requests, which they may download.
 */
async function priorityOf(share: Share, row: ProjectRow, guest: Guest | null) {
  const price = Number(share.priority_price);
  const days = share.priority_days;
  const offer = share.priority && !galleryDelivered(row)
    ? { price, days, statement: { nl: priorityStatement("nl", price, days), en: priorityStatement("en", price, days) } }
    : null;
  const own = new Set<string>();
  if (!guest) return { view: offer ? { offer, requests: [] } : null, own };
  const rows = (must(await db.from("gallery_priority").select("*").eq("guest_id", guest.id).neq("status", "closed").order("created_at")) || []) as any[];
  if (!offer && rows.length === 0) return { view: null, own };
  const [invoices, images] = await Promise.all([invoicesOf(rows), imagesOf(rows.map((x) => x.id))]);
  // Never a photo that is held back for a child.
  const visible = new Set((row.gallery_images || []).filter((g: any) => !heldBack(g)).map((g: any) => g.id));
  const open = guestWindowOpen(row);
  const requests = rows.map((x) => {
    const inv = invoices.get(x.invoice_id);
    const photos = x.status === "delivered" ? (images.get(x.id) || []).filter((id) => visible.has(id)) : [];
    if (open) photos.forEach((id) => own.add(id));
    return {
      id: x.id,
      person: x.person,
      number: x.number,
      status: x.status,
      price: Number(x.price),
      days: x.days,
      photos: x.photos,
      paid: inv?.status === "paid",
      payUrl: x.status === "offered" && inv?.status === "sent" ? invoiceLink(inv) : "",
      bookingUrl: x.status === "booking" ? BOOKING_URL : "",
      images: open ? photos : [],
    };
  });
  return { view: { offer, requests }, own };
}

/**
 * The photos that are this guest's to take as originals: their voorrang, and
 * what they bought, when they are signed in with the account they bought with.
 */
async function ownPhotos(share: Share, who: Who): Promise<Set<string>> {
  const project = found(await db.from("projects").select(ACCESS_SELECT).eq("id", share.project_id).maybeSingle(), "Project niet gevonden") as any;
  if (!guestWindowOpen(project)) return new Set();
  const [first, bought] = await Promise.all([deliveredImageIds(who.guest.id), who.account ? boughtImageIds(who.guest.id) : new Set<string>()]);
  return new Set([...first, ...bought]);
}

/**
 * Photos for sale (lib/orders.ts): while the group sees watermarked copies and
 * paying online works. The studio's preview shows it, without a checkout.
 */
function salesView(share: Share, row: ProjectRow, test: boolean, preview: boolean) {
  if (!share.sales || !salesOpen(row)) return null;
  const payable = !preview && payableNow(test);
  if (!payable && !preview) return null;
  const p = pricingOf(share);
  return {
    price: p.price,
    normalPrice: p.normal,
    bundleSize: p.bundleSize,
    bundlePrice: p.bundlePrice,
    discountUntil: p.discountUntil,
    payable,
    statement: { nl: orderStatement("nl", p), en: orderStatement("en", p) },
  };
}

// --- the gallery, or the door ---
r.get(S, async (c) => {
  const share = await openShare(c.req.param("token"));
  const row = await loadProject(share.project_id);
  const test = c.req.query("test") === "1";
  const preview = c.req.query("preview") === "1" && Boolean(await verifyAdmin(c.req.header("Authorization") ?? null));
  const who = preview ? null : await identify(c, share, c.req.query("key") || "");
  const guest = who?.guest || null;
  // Photos for sale: the door shows the cover with its watermark too.
  if (!guest && !preview) return c.json({ gate: await gateOf(row, share, test) });
  if (guest && await owesConsent(share, guest)) {
    const form = found(await db.from("consent_forms").select("token").eq("project_id", row.id).maybeSingle(), "Deze link werkt niet (meer).") as any;
    return c.json({ consent: { token: form.token, ...formFields(row), answer: null }, guest: { name: guest.name, email: guest.email } });
  }

  if (guest) {
    const away = Date.now() - new Date(guest.last_seen_at).getTime() >= VISIT_GAP_MS;
    await seen(guest, { visits: guest.visits === 0 || away ? guest.visits + 1 : guest.visits });
  }
  const [sign, hearts, guests, mine, kids, priority, bought] = await Promise.all([
    gallerySigner([row]),
    guestHearts(row.id),
    guestCount(row.id),
    guest ? db.from("gallery_guest_hearts").select("image_id").eq("guest_id", guest.id) : null,
    guest ? kidsOf(row.id, guest) : null,
    priorityOf(share, row, guest),
    guest ? boughtImageIds(guest.id) : new Set<string>(),
  ]);
  const open = guestWindowOpen(row);
  // Bought photos are theirs to take while downloading is open, and only signed in with the account.
  const own = new Set([...priority.own, ...(open && who?.account ? bought : [])]);
  const boughtElsewhere = new Set(!who?.account ? [...bought] : []);
  const sales = salesView(share, row, test, preview);
  const access = guestAccess(row, { downloads: share.downloads && !preview, sales: !!sales });
  return c.json({
    guest: guest ? { name: guest.name, email: guest.email, notifyPhotos: await wantsPhotoMails(row.id, guest.id) } : null,
    account: who?.account ? { email: who.account.email, name: accountName(who.account) } : null,
    preview,
    project: guestProject(row, sign, access, own, boughtElsewhere, !!sales),
    hearts: hearts.images,
    mine: mine ? (must(mine) || []).map((h: any) => h.image_id) : [],
    kids,
    priority: priority.view,
    sales,
    guests,
    // Once the photos are delivered. The studio looking along should not count as a click.
    reviewUrl: guest && galleryDelivered(row) ? await reviewLink(row.id) : "",
  });
});

// --- name and e-mail at the door ---
r.post(`${S}/guest`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({
    name: text(120).min(1, "Vul je naam in."),
    email: text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in."),
  }));
  // The same address on another phone gets the same guest back, hearts and all.
  const guest = must(await db.from("gallery_guests")
    .upsert({ project_id: share.project_id, email: b.email, name: b.name }, { onConflict: "project_id,email" })
    .select("key, name").single()) as { key: string; name: string };
  return c.json(guest);
});

// --- hearts ---
r.post(`${S}/heart`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string().default(""), imageId: uuid, on: z.boolean() }));
  const { guest } = await mustGuest(c, share, b.key);
  found(await db.from("gallery_images").select("id").eq("id", b.imageId).eq("project_id", share.project_id).maybeSingle(), "Foto niet gevonden");
  if (b.on) {
    must(await db.from("gallery_guest_hearts").upsert({ image_id: b.imageId, guest_id: guest.id }, { onConflict: "image_id,guest_id" }));
  } else {
    must(await db.from("gallery_guest_hearts").delete().eq("image_id", b.imageId).eq("guest_id", guest.id));
  }
  await seen(guest);
  const res = await db.from("gallery_guest_hearts").select("image_id", { count: "exact", head: true }).eq("image_id", b.imageId);
  must(res);
  return c.json({ count: res.count || 0 });
});

// --- a mail when new photos arrive, on or off ---
r.post(`${S}/notify`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string().default(""), on: z.boolean(), language: z.enum(["nl", "en"]).default("nl") }));
  const { guest } = await mustGuest(c, share, b.key);
  await setPhotoMails(share.project_id, guest.id, b.on, b.language);
  await seen(guest);
  return c.json({ notifyPhotos: b.on });
});

// --- voorrang: the photos of one person first (lib/priority.ts) ---
// Asking costs nothing yet: the studio first looks whether there are enough
// photos. The price and the terms are those of this moment, kept word for word.
r.post(`${S}/priority`, async (c) => {
  const token = c.req.param("token");
  const share = await openShare(token);
  const b = await readBody(c, z.object({
    key: z.string().default(""),
    person: text(120).min(1, "Vul in wie er op de foto's staat."),
    number: text(8).default(""),
    note: text(300).default(""),
    language: z.enum(["nl", "en"]).default("nl"),
    agree: z.literal(true, { errorMap: () => ({ message: "Vink aan dat je akkoord gaat." }) }),
  }));
  const { guest } = await mustGuest(c, share, b.key);
  if (!share.priority) fail(409, "Voorrang kan niet (meer) bij deze galerij.");
  const project = found(await db.from("projects").select(ACCESS_SELECT).eq("id", share.project_id).maybeSingle(), "Project niet gevonden") as any;
  if (galleryDelivered(project)) fail(409, "De foto's zijn al geleverd, dus voorrang is niet meer nodig.");

  const theirs = (must(await db.from("gallery_priority").select("person, status").eq("guest_id", guest.id).neq("status", "closed")) || []) as any[];
  const same = (s: string) => s.trim().toLocaleLowerCase("nl");
  if (theirs.some((x) => same(x.person) === same(b.person))) fail(409, `Je hebt al voorrang gevraagd voor ${b.person}.`);
  if (theirs.filter((x) => x.status === "new" || x.status === "offered").length >= MAX_OPEN_PER_GUEST) {
    fail(400, "Je hebt al een paar aanvragen lopen. Neem contact op met de fotograaf.");
  }

  const price = Number(share.priority_price);
  const days = share.priority_days;
  const row = must(await db.from("gallery_priority").insert({
    project_id: share.project_id,
    guest_id: guest.id,
    person: b.person,
    number: b.number,
    note: b.note,
    language: b.language,
    price,
    days,
    statement: priorityStatement(b.language, price, days),
    terms_version: TERMS_VERSION,
  }).select("*").single()) as any;
  await seen(guest);

  const title = project.gallery_settings?.title || project.title;
  const toGuest = receivedMail(row, { guestName: guest.name, galleryTitle: title, galleryLink: shareUrl(token) });
  const toStudio = studioMail(row, { guestName: guest.name, guestEmail: guest.email, projectTitle: project.title, link: `${SITE_URL}/admin/project/${project.id}?tab=sharing` });
  await Promise.all([
    sendEmail({ to: guest.email, replyTo: EMAIL_ADMIN_NOTIFY, ...toGuest }),
    sendEmail({ to: EMAIL_ADMIN_NOTIFY, replyTo: guest.email, ...toStudio }),
    notify({ type: "priority", title: `Voorrang gevraagd: ${personLabel(row)}`, body: `Door ${guest.name} · ${project.title}`, link: `/admin/project/${project.id}?tab=sharing` }),
  ]);
  return c.json({ id: row.id, person: row.person, number: row.number });
});

// Changed their mind before the studio looked: the request goes.
r.post(`${S}/priority/:priorityId/cancel`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const { key } = await readBody(c, z.object({ key: z.string().default("") }));
  const { guest } = await mustGuest(c, share, key);
  const row = found(
    await db.from("gallery_priority").select("id, status, person, number").eq("id", c.req.param("priorityId")).eq("guest_id", guest.id).maybeSingle(),
    "Aanvraag niet gevonden",
  ) as any;
  if (row.status !== "new") fail(409, "We hebben je aanvraag al bekeken. Wil je toch stoppen? Beantwoord dan onze mail.");
  must(await db.from("gallery_priority").delete().eq("id", row.id));
  await notify({ type: "priority", title: `Voorrang ingetrokken: ${personLabel(row)}`, body: `Door ${guest.name}`, link: `/admin/project/${share.project_id}?tab=sharing` });
  return c.json({ success: true, person: row.person, number: row.number });
});

// --- buying photos while the gallery is watermarked (lib/orders.ts) ---
// Only signed in: the account is where the photos stay. The basket goes to
// Mollie's page as one payment; its invoice is made once it is paid
// (routes/payments.ts). The prices are the studio's, never the browser's.
r.post(`${S}/order`, async (c) => {
  const token = c.req.param("token");
  const share = await openShare(token);
  const b = await readBody(c, z.object({
    key: z.string().default(""),
    imageIds: z.array(uuid).min(1, "Kies eerst een foto.").max(500),
    language: z.enum(["nl", "en"]).default("nl"),
    agree: z.literal(true, { errorMap: () => ({ message: "Vink aan dat je akkoord gaat." }) }),
    test: z.boolean().default(false),
  }));
  const who = await mustGuest(c, share, b.key);
  if (!who.account) fail(403, "Log eerst in of maak een account. Daar blijven je foto's staan.");
  const project = found(await db.from("projects").select(ACCESS_SELECT).eq("id", share.project_id).maybeSingle(), "Project niet gevonden") as any;
  if (!share.sales || !salesOpen(project)) fail(409, "Foto's kopen kan niet (meer) bij deze galerij.");
  if (!payableNow(b.test)) fail(409, "Online betalen staat nog niet aan. Probeer het later opnieuw.");

  const ids = [...new Set(b.imageIds)];
  const images: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    images.push(...((must(await db.from("gallery_images").select("id, preview_path, restriction").eq("project_id", share.project_id).in("id", ids.slice(i, i + 200))) || []) as any[]));
  }
  // Only watermarked photos that may be shown, and none they already have.
  const own = await ownPhotos(share, who);
  const buy = images.filter((g) => g.preview_path && !heldBack(g) && !own.has(g.id));
  if (buy.length === 0) fail(400, "Deze foto's heb je al, of ze zijn niet te koop.");

  const pricing = pricingOf(share);
  const total = basketTotal(buy.length, pricing);
  const order = must(await db.from("gallery_orders").insert({
    project_id: share.project_id,
    guest_id: who.guest.id,
    price: pricing.price,
    normal_price: pricing.normal,
    amount: total,
    bundle_size: pricing.bundleSize,
    bundle_price: pricing.bundlePrice,
    language: b.language,
    statement: orderStatement(b.language, pricing),
    terms_version: TERMS_VERSION,
  }).select("id").single()) as any;
  try {
    must(await db.from("gallery_order_images").insert(buy.map((g) => ({ order_id: order.id, image_id: g.id }))));
    const back = `${shareUrl(token)}?bestelling=${order.id}${b.test ? "&test=1" : ""}`;
    const mp = await createPayment({
      amount: total,
      // What the guest sees on their bank statement.
      description: `${buy.length} ${buy.length === 1 ? "foto" : "foto's"} PhotoDeCaffeine`,
      redirectUrl: back,
      cancelUrl: `${back}&betaling=gestopt`,
      webhookUrl: `${SITE_URL}/api/mollie`,
      metadata: { order: order.id },
    });
    const checkoutUrl = mp._links?.checkout?.href || "";
    if (!checkoutUrl) fail(502, "De betaaldienst gaf geen betaalpagina terug. Probeer het zo opnieuw.");
    must(await db.from("payments").insert({ order_id: order.id, mollie_id: mp.id, mode: mp.mode, status: mp.status, amount: total, checkout_url: checkoutUrl }));
    await seen(who.guest);
    return c.json({ id: order.id, checkoutUrl, count: buy.length, amount: total });
  } catch (err) {
    // No basket without a way to pay for it.
    await db.from("gallery_orders").delete().eq("id", order.id);
    throw err;
  }
});

// Back from Mollie: ask how it went instead of waiting for the webhook.
r.post(`${S}/order/:orderId/check`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const { key } = await readBody(c, z.object({ key: z.string().default("") }));
  const { guest } = await mustGuest(c, share, key);
  const order = found(
    await db.from("gallery_orders").select("id, invoice_id").eq("id", c.req.param("orderId")).eq("guest_id", guest.id).maybeSingle(),
    "Bestelling niet gevonden",
  ) as any;
  const latest = ((must(await db.from("payments").select("mollie_id, mode, status").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1)) || []) as any[])[0];
  if (!latest || latest.mode !== mollieMode()) return c.json({ id: order.invoice_id || "", event: "", status: latest?.status || "" });
  return c.json(await syncPayment(await getPayment(latest.mollie_id)));
});

// The link in such a mail. The key is enough, so it keeps working when the
// group link was switched off or replaced after the mail went out.
r.post("/make-server-0951c59e/guest-mails/off", async (c) => {
  const { key } = await readBody(c, z.object({ key: z.string().regex(/^[0-9a-f]{32}$/, "Deze link werkt niet.") }));
  const guest = must(await db.from("gallery_guests").select("id, project_id").eq("key", key).maybeSingle()) as any;
  if (guest) await setPhotoMails(guest.project_id, guest.id, false);
  return c.json({ success: true });
});

// --- the review button: the link itself counts the click, this says who it was ---
r.post(`${S}/review`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const { key } = await readBody(c, z.object({ key: z.string().default("") }));
  const { guest } = await mustGuest(c, share, key);
  await noteGuestReviewer(share.project_id, guest.name);
  await seen(guest);
  return c.json({ success: true });
});

// --- "my child is on this photo" ---
const CHILD_LABEL: Record<string, string> = { no_photo: "mag niet op de foto", no_social: "mag niet op social media", unknown: "geen toestemming gevonden" };
// More children than one family has: keeps this from becoming a place to leave text.
const MAX_CHILDREN_PER_GUEST = 6;
// Pointing out a whole gallery should not become a mail per photo.
const CHILD_MAIL_GAP_MS = 30 * 60 * 1000;

r.post(`${S}/child`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string().default(""), imageId: uuid, child: text(120).min(1, "Vul de naam van je kind in."), on: z.boolean() }));
  const { guest } = await mustGuest(c, share, b.key);
  found(await db.from("consent_forms").select("project_id").eq("project_id", share.project_id).maybeSingle(), "Dit kan niet bij deze galerij.");
  const img = found(
    await db.from("gallery_images").select("id, file_name, restriction").eq("id", b.imageId).eq("project_id", share.project_id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  if (heldBack(img)) fail(404, "Foto niet gevonden");
  await seen(guest);

  if (!b.on) {
    must(await db.from("gallery_child_tags").delete().eq("image_id", img.id).eq("guest_id", guest.id).eq("child_name", b.child));
    return c.json({ success: true });
  }

  const own = (must(await db.from("gallery_child_tags").select("child_name").eq("guest_id", guest.id)) || []) as any[];
  const names = new Set(own.map((t) => t.child_name));
  if (!names.has(b.child) && names.size >= MAX_CHILDREN_PER_GUEST) fail(400, "Je hebt al veel kinderen ingevuld. Neem contact op met de fotograaf.");
  must(await db.from("gallery_child_tags").upsert(
    { project_id: share.project_id, image_id: img.id, guest_id: guest.id, child_name: b.child },
    { onConflict: "image_id,guest_id,child_name", ignoreDuplicates: true },
  ));

  // The studio hears about a child who needs care: at the first photo, not at every photo.
  const answers = (must(await db.from("consents").select("child_name, answer, shirt_number").eq("project_id", share.project_id)) || []) as any[];
  const { answer, number } = childStatus(b.child, answers);
  if (answer !== "full") {
    const res = await db.from("gallery_child_tags").select("id", { count: "exact", head: true })
      .eq("project_id", share.project_id).eq("child_name", b.child).gte("created_at", new Date(Date.now() - CHILD_MAIL_GAP_MS).toISOString());
    must(res);
    if ((res.count || 0) <= 1) {
      const project = found(await db.from("projects").select("title").eq("id", share.project_id).maybeSingle(), "Project niet gevonden") as any;
      const label = CHILD_LABEL[answer];
      await Promise.all([
        sendEmail({
          to: EMAIL_ADMIN_NOTIFY,
          replyTo: guest.email,
          subject: `${b.child} staat op een foto: ${label} · ${project.title}`,
          html: childTagEmail({
            childName: number ? `${b.child} #${number}` : b.child, label, guestName: guest.name, guestEmail: guest.email, fileName: img.file_name, projectTitle: project.title,
            link: `${SITE_URL}/admin/project/${share.project_id}?tab=gallery`,
          }),
        }),
        notify({ type: "consent", title: `${b.child} staat op een foto: ${label}`, body: `Aangewezen door ${guest.name} · ${project.title}`, link: `/admin/project/${share.project_id}?tab=gallery` }),
      ]);
    }
  }
  return c.json({ success: true });
});

// --- downloads ---
/** What a guest may take of each photo: their own as the original, the rest as far as the link allows. */
async function rightsOf(share: Share, who: Who, test: boolean) {
  const row = await loadProject(share.project_id);
  const sales = share.sales && salesOpen(row) && payableNow(test);
  const access = guestAccess(row, { downloads: share.downloads, sales });
  const own = await ownPhotos(share, who);
  return { row, own, of: (img: any): Downloads => (own.has(img.id) ? "original" : access.downloads) };
}

const whoName = (who: Who) => (who.account ? accountName(who.account) : who.guest.name);

r.post(`${S}/download`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string().default(""), imageId: uuid, test: z.boolean().default(false) }));
  const who = await mustGuest(c, share, b.key);
  const { row, of } = await rightsOf(share, who, b.test);
  const img = (row.gallery_images || []).find((g: any) => g.id === b.imageId);
  if (!img) fail(404, "Foto niet gevonden");
  const link = await downloadLink(img, of(img));
  await seen(who.guest, { downloads: who.guest.downloads + 1 });
  await logDownloads([{ project_id: row.id, image_id: img.id, guest_id: who.guest.id, who: whoName(who), source: "link", version: link.version }]);
  return c.json(link);
});

// Links for a zip of many photos, made in the browser; each photo goes in the log.
r.post(`${S}/downloads`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string().default(""), imageIds: z.array(uuid).min(1).max(2000), test: z.boolean().default(false) }));
  const who = await mustGuest(c, share, b.key);
  const { row, of } = await rightsOf(share, who, b.test);
  const wanted = new Set(b.imageIds);
  const images = (row.gallery_images || []).filter((g: any) => wanted.has(g.id)).sort((a: any, b: any) => a.sort - b.sort);
  const files = await downloadLinks(images, of);
  if (files.length === 0) fail(403, "Downloaden kan nu niet bij deze foto's.");
  await seen(who.guest, { downloads: who.guest.downloads + files.length });
  await logDownloads(files.map((f) => ({ project_id: row.id, image_id: f.id, guest_id: who.guest.id, who: whoName(who), source: "link", version: f.version })), crypto.randomUUID());
  return c.json({ files });
});

// Pages from before the zip links counted a zip here; kept so an open tab still works.
r.post(`${S}/downloaded`, async (c) => {
  const share = await openShare(c.req.param("token"));
  const b = await readBody(c, z.object({ key: z.string().default(""), count: z.number().int().min(1).max(5000), test: z.boolean().default(false) }));
  const who = await mustGuest(c, share, b.key);
  await seen(who.guest, { downloads: who.guest.downloads + b.count });
  return c.json({ success: true });
});
