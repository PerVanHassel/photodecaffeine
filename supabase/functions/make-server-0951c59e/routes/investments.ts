import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { db } from "../lib/db.ts";
import { type Env, fail, HttpError, nameOf, readBody, requireAdmin, text, uuid, z } from "../lib/http.ts";
import { PRIVATE_BUCKET, removePrivate, signPaths } from "../lib/storage.ts";
import { sanitizeFileName } from "../lib/util.ts";

// Investeringen: the gear the studio has (status "bought", with how many) and
// what it wants to buy, for every admin to add to and weigh. A wish says
// whether it fits the gear already there. An item starts from a link to a
// product page, which is read here for its name, price and photo, or from a
// photo of the product.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/investments";
r.use(A, requireAdmin);
r.use(`${A}/*`, requireAdmin);

const KEY = "investments:item:";
const PRIVATE_PREFIX = "private:";
const STATUSES = ["wish", "planned", "bought"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;
const COMPAT = ["", "fits", "adapter", "no"] as const;

/** Items saved before gear, counts and compatibility existed read as one of each, not yet checked. */
const normalize = (i: any) => ({
  quantity: 1, system: "", compatibility: "", worksWith: [], compatNote: "", ...i,
});

async function all(): Promise<any[]> {
  const values = await kv.getByPrefix(KEY);
  return values.map((v) => (typeof v === "string" ? JSON.parse(v) : v)).filter(Boolean);
}

async function load(id: string): Promise<any> {
  const v = await kv.get(KEY + id);
  if (!v) fail(404, "Investering niet gevonden");
  return typeof v === "string" ? JSON.parse(v) : v;
}

/** Photos stored privately get a short-lived link; the stored value stays the reference. */
async function withPhotos(items: any[]) {
  const paths = items.map((i) => String(i.photo || "")).filter((p) => p.startsWith(PRIVATE_PREFIX)).map((p) => p.slice(PRIVATE_PREFIX.length));
  const signed = await signPaths(paths);
  return items.map((i) => {
    const photo = String(i.photo || "");
    return { ...i, photo, photoUrl: photo.startsWith(PRIVATE_PREFIX) ? signed.get(photo.slice(PRIVATE_PREFIX.length)) || "" : photo };
  });
}

r.get(A, async (c) => {
  const items = (await all()).map(normalize);
  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return c.json({ investments: await withPhotos(items) });
});

const schema = z.object({
  title: text(300).min(1, "Geef het product een naam."),
  url: text(2000).default(""),
  shop: text(200).default(""),
  price: z.number().min(0).max(10_000_000).nullable().default(null),
  quantity: z.number().int("Een aantal is een heel getal.").min(1).max(999).default(1),
  status: z.enum(STATUSES).default("wish"),
  priority: z.enum(PRIORITIES).default("medium"),
  category: text(100).default(""),
  system: text(100).default(""),
  compatibility: z.enum(COMPAT).default(""),
  worksWith: z.array(uuid).max(200).default([]),
  compatNote: text(1000).default(""),
  notes: text(5000).default(""),
  photo: text(2000).default(""),
});

// A signed link sent back by a screen must never replace the stored reference.
const keepPhoto = (sent: string | undefined, existing: string) => (sent !== undefined && sent.includes("/object/sign/") ? existing : sent);

r.post(A, async (c) => {
  const b = await readBody(c, schema);
  const user = c.get("user");
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    ...b,
    addedBy: { id: user.id, name: nameOf(user) },
    boughtAt: b.status === "bought" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  await kv.set(KEY + item.id, item);
  return c.json({ investment: (await withPhotos([item]))[0] });
});

r.put(`${A}/:id`, async (c) => {
  const existing = normalize(await load(c.req.param("id")));
  const b = await readBody(c, schema.partial());
  const now = new Date().toISOString();
  const photo = keepPhoto(b.photo, existing.photo);
  const item = {
    ...existing,
    ...b,
    ...(photo !== undefined && { photo }),
    id: existing.id,
    addedBy: existing.addedBy,
    createdAt: existing.createdAt,
    boughtAt: b.status === undefined ? existing.boughtAt ?? null : b.status === "bought" ? existing.boughtAt || now : null,
    updatedAt: now,
  };
  await kv.set(KEY + item.id, item);
  if (existing.photo !== item.photo && String(existing.photo || "").startsWith(PRIVATE_PREFIX)) {
    await removePrivate([existing.photo.slice(PRIVATE_PREFIX.length)]);
  }
  return c.json({ investment: (await withPhotos([item]))[0] });
});

r.delete(`${A}/:id`, async (c) => {
  const existing = await load(c.req.param("id"));
  await kv.del(KEY + existing.id);
  if (String(existing.photo || "").startsWith(PRIVATE_PREFIX)) await removePrivate([existing.photo.slice(PRIVATE_PREFIX.length)]);
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// A photo of the product
// ---------------------------------------------------------------------------

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic"];
const MAX_IMAGE = 10_000_000;

async function storePhoto(data: Blob, type: string, name: string): Promise<string> {
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const base = sanitizeFileName(name.replace(/\.[^.]*$/, "")).slice(0, 60) || "product";
  const path = `investments/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;
  const { error } = await db.storage.from(PRIVATE_BUCKET).upload(path, data, { contentType: type, cacheControl: "31536000" });
  if (error) {
    console.error("investment photo upload failed:", error.message);
    fail(500, "De foto kon niet worden opgeslagen.");
  }
  return path;
}

async function photoAnswer(path: string) {
  const signed = await signPaths([path]);
  return { photoRef: PRIVATE_PREFIX + path, photoUrl: signed.get(path) || "" };
}

r.post(`${A}/photo`, async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) fail(400, "Kies een foto.");
  if (!IMAGE_TYPES.includes(file.type)) fail(400, "Upload een foto (jpg, png of webp).");
  if (file.size > MAX_IMAGE) fail(400, "Die foto is te groot. Maximaal 10 MB.");
  return c.json(await photoAnswer(await storePhoto(file, file.type, file.name)));
});

// ---------------------------------------------------------------------------
// A link to a product page
// ---------------------------------------------------------------------------

// Says what it is. Shops that keep automated visitors out (bol, Kamera Express,
// Cameranu, MediaMarkt) answer 403 to this; that is their choice, and the
// screen then asks for a screenshot instead.
const BROWSER = {
  "User-Agent": "Mozilla/5.0 (compatible; PhotoDeCaffeine-linkpreview/1.0; +https://www.photodecaffeine.com)",
  "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
};
const MAX_PAGE = 3_000_000;

/** Only the public internet: no local addresses, nothing on the platform's own network. */
function publicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    fail(400, "Dat is geen geldige link.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") fail(400, "Alleen http- en https-links.");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost = host.includes(":")
    ? host === "::1" || /^(fc|fd|fe80|::ffff:)/.test(host)
    : !host.includes(".") || host === "localhost" || /\.(localhost|internal|local)$/.test(host) ||
      /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  if (privateHost) fail(400, "Deze link kan niet worden gelezen.");
  return u;
}

/** fetch, following redirects one by one so each hop is checked too. */
async function fetchPublic(raw: string, init: RequestInit = {}): Promise<Response> {
  let url = publicUrl(raw);
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!next) return res;
    await res.body?.cancel();
    url = publicUrl(new URL(next, url).toString());
  }
  fail(400, "Deze link stuurt te vaak door.");
}

async function readCapped(res: Response, max: number) {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euro: "€" };
function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&(\w+);/g, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function attrOf(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[2] ?? m[3]) : null;
}

/**
 * The content of every <meta> tag, by its property or name, and of every
 * schema.org microdata field (itemprop) on any tag: a shop that shows its
 * price as <span itemprop="price" content="1299.00"> has it here as "price".
 */
function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const keep = (k: string | null, v: string | null) => {
    if (k && v && !out.has(k.toLowerCase())) out.set(k.toLowerCase(), v);
  };
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    keep(attrOf(tag, "property") || attrOf(tag, "name") || attrOf(tag, "itemprop"), attrOf(tag, "content"));
  }
  for (const m of html.matchAll(/<(\w+)\b([^>]*\sitemprop\s*=\s*["'](name|price|lowPrice|priceCurrency|image)["'][^>]*)>([^<]{0,300})/gi)) {
    const tag = ` ${m[2]}`;
    const inner = decode(m[4]);
    keep(m[3], attrOf(tag, "content") || attrOf(tag, "src") || attrOf(tag, "href") || inner || null);
  }
  return out;
}

/** "Canon EOS R10 | Coolblue - Voor 23.59u, morgen in huis" → "Canon EOS R10". */
function cleanTitle(title: string, shop: string): string {
  const brand = shop.split(".")[0].toLowerCase();
  const parts = title.split(/\s+[|–—]\s+|\s+-\s+/);
  const kept = parts.filter((p, i) => i === 0 || !p.toLowerCase().replace(/[^a-z0-9]/g, "").includes(brand.replace(/[^a-z0-9]/g, "")));
  // Everything after the part that names the shop is the shop's slogan.
  const at = parts.findIndex((p, i) => i > 0 && p.toLowerCase().replace(/[^a-z0-9]/g, "").includes(brand.replace(/[^a-z0-9]/g, "")));
  const clean = (at > 0 ? parts.slice(0, at) : kept).join(" - ").replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return clean || title;
}

/** The first schema.org Product in the page's JSON-LD blocks. */
function ldProduct(html: string): any | null {
  const blocks = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const find = (node: any): any => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const n of node) {
        const hit = find(n);
        if (hit) return hit;
      }
      return null;
    }
    const types = [node["@type"]].flat().map(String);
    if (types.some((t) => /^(Product|ProductGroup|IndividualProduct|ProductModel)$/.test(t))) {
      // A product with variants keeps its price on the first variant.
      const variant = Array.isArray(node.hasVariant) ? node.hasVariant[0] : null;
      return node.offers || !variant ? node : { ...variant, ...node, offers: variant.offers, image: node.image || variant.image };
    }
    return find(node["@graph"]) || find(node.mainEntity) || find(node.itemListElement);
  };
  for (const block of blocks) {
    try {
      const hit = find(JSON.parse(block.replace(/^<script[^>]*>|<\/script>$/gi, "").trim()));
      if (hit) return hit;
    } catch {
      // A shop's broken JSON-LD: the meta tags may still have it.
    }
  }
  return null;
}

/** 1299, "1299.00", "1.299,00", "€ 1.299,-" → 1299. */
export function toPrice(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/[,.]\s*[-–]\s*$/, "").replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    s = comma > dot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (comma >= 0) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (dot >= 0 && /\.\d{3}$/.test(s) && !/^0\./.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function firstOffer(offers: any): any {
  if (!offers) return null;
  if (Array.isArray(offers)) return offers[0] || null;
  if (offers.price === undefined && offers.lowPrice === undefined && offers.offers) return firstOffer(offers.offers);
  return offers;
}

function imageOf(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return imageOf(v[0]);
  return v.url || v.contentUrl || "";
}

function siteName(u: URL): string {
  return u.hostname.replace(/^www\./, "");
}

/** A name from the link itself, for shops that keep their page closed: ".../sony-a7-iv-body" → "Sony a7 iv body". */
function titleFromUrl(u: URL): string {
  const words = u.pathname.split("/").map((p) => decodeURIComponent(p).replace(/\.html?$/i, ""))
    .filter((p) => /[a-z].*-.*[a-z0-9]/i.test(p) && !/^\d+$/.test(p.replace(/-/g, "")))
    .sort((a, b) => b.length - a.length)[0];
  if (!words) return "";
  const t = words.replace(/[-_]+/g, " ").replace(/\s\d{5,}$/, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const linkSchema = z.object({ url: text(2000).min(1, "Plak een link.") });

r.post(`${A}/link`, async (c) => {
  const { url } = await readBody(c, linkSchema);
  const asked = publicUrl(url);
  const shop = siteName(asked);
  // What the screen gets when the page itself could not be read: a name from
  // the link, and `closed` so it offers to read a screenshot instead.
  const unread = (notice: string) => ({ url, title: titleFromUrl(asked), price: null, shop, photoRef: "", photoUrl: "", closed: true, notice });
  const closedNotice = `${shop} laat zijn pagina's niet automatisch lezen. De naam komt uit de link. Upload een screenshot van de pagina, dan lezen we de prijs eruit.`;
  let res: Response;
  try {
    res = await fetchPublic(url, { headers: { ...BROWSER, Accept: "text/html,application/xhtml+xml" } });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.log("investment link: no answer", shop, String(err));
    return c.json(unread(`${shop} gaf geen antwoord. Upload een screenshot van de pagina, dan lezen we de prijs eruit.`));
  }
  const page = new URL(res.url || url);
  if (!res.ok || !(res.headers.get("content-type") || "").includes("html")) {
    await res.body?.cancel();
    console.log("investment link: refused", shop, res.status);
    return c.json(unread(res.status === 404 || res.status === 410 ? "Deze pagina bestaat niet (meer). Kijk of de link klopt." : closedNotice));
  }
  const bytes = await readCapped(res, MAX_PAGE);
  const html = bytes ? new TextDecoder().decode(bytes) : "";

  const meta = metaTags(html);
  const product = ldProduct(html);
  const offer = firstOffer(product?.offers);
  const price =
    toPrice(offer?.price ?? offer?.lowPrice) ??
    toPrice(meta.get("product:price:amount") || meta.get("og:price:amount") || meta.get("price") || meta.get("lowprice") || "");
  const named = decode(String(product?.name || "")) || meta.get("og:title") || meta.get("twitter:title") || "";
  // A page with no product data at all is a cookie wall or a robot check (Amazon answers 200 with one).
  if (!product && !named && price === null) {
    console.log("investment link: no product data", shop, res.status);
    return c.json(unread(closedNotice));
  }
  const titleTag = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const title = cleanTitle(named || meta.get("name") || titleTag, shop) || titleFromUrl(asked);
  const currency = String(offer?.priceCurrency || meta.get("product:price:currency") || meta.get("og:price:currency") || meta.get("pricecurrency") || "EUR").toUpperCase();
  const imageUrl = imageOf(product?.image) || meta.get("og:image") || meta.get("og:image:secure_url") || meta.get("twitter:image") || meta.get("image") || "";

  let photo = { photoRef: "", photoUrl: "" };
  if (imageUrl) {
    try {
      const img = await fetchPublic(new URL(imageUrl, page).toString(), { headers: { ...BROWSER, Accept: "image/*", Referer: page.toString() } });
      const type = (img.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const data = img.ok && IMAGE_TYPES.includes(type) ? await readCapped(img, MAX_IMAGE) : (await img.body?.cancel(), null);
      if (data) photo = await photoAnswer(await storePhoto(new Blob([data], { type }), type, title || "product"));
    } catch (err) {
      console.log("investment image not fetched:", imageUrl, String(err));
    }
  }
  console.log("investment link: read", shop, { title: !!title, price: price !== null, photo: !!photo.photoRef });

  const notice = price === null
    ? "De prijs stond niet op de pagina. Vul hem zelf in, of upload een screenshot."
    : currency !== "EUR"
      ? `De prijs staat in ${currency}. Reken hem om naar euro's.`
      : undefined;
  return c.json({ url, title: title.slice(0, 300), price, shop, ...photo, closed: false, notice });
});
