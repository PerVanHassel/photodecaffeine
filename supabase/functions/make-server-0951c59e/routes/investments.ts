import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { db } from "../lib/db.ts";
import { type Env, fail, HttpError, nameOf, readBody, requireAdmin, text, z } from "../lib/http.ts";
import { PRIVATE_BUCKET, removePrivate, signPaths } from "../lib/storage.ts";
import { sanitizeFileName } from "../lib/util.ts";

// Investeringen: what the studio wants to buy, for every admin to add to and
// weigh. An item starts from a link to a product page, which is read here for
// its name, price and photo, or from a photo of the product.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/investments";
r.use(A, requireAdmin);
r.use(`${A}/*`, requireAdmin);

const KEY = "investments:item:";
const PRIVATE_PREFIX = "private:";
const STATUSES = ["wish", "planned", "bought"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;

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
  const items = await all();
  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const sum = (status: string) => items.filter((i) => i.status === status).reduce((s, i) => s + (Number(i.price) || 0), 0);
  return c.json({
    investments: await withPhotos(items),
    totals: { wish: sum("wish"), planned: sum("planned"), bought: sum("bought") },
  });
});

const schema = z.object({
  title: text(300).min(1, "Geef het product een naam."),
  url: text(2000).default(""),
  shop: text(200).default(""),
  price: z.number().min(0).max(10_000_000).nullable().default(null),
  status: z.enum(STATUSES).default("wish"),
  priority: z.enum(PRIORITIES).default("medium"),
  category: text(100).default(""),
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
  const existing = await load(c.req.param("id"));
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

// Shops answer a browser with the full page; a bare fetch often gets a block page.
const BROWSER = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
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

/** The content of every <meta> tag, by its property, name or itemprop. */
function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
    const key = attr("property") || attr("name") || attr("itemprop");
    const content = attr("content");
    if (!key || !content) continue;
    const k = (key[2] ?? key[3]).toLowerCase();
    if (!out.has(k)) out.set(k, decode(content[2] ?? content[3]));
  }
  return out;
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
    const type = node["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return node;
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
  const unread = { url, title: titleFromUrl(asked), price: null, shop: siteName(asked), photoRef: "", photoUrl: "" };
  let res: Response;
  try {
    res = await fetchPublic(url, { headers: { ...BROWSER, Accept: "text/html,application/xhtml+xml" } });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    return c.json({ ...unread, notice: "De winkel gaf geen antwoord. Vul de prijs zelf in en upload eventueel een foto." });
  }
  const page = new URL(res.url || url);
  if (!res.ok || !(res.headers.get("content-type") || "").includes("html")) {
    await res.body?.cancel();
    const notice = res.status === 404 || res.status === 410
      ? "Deze pagina bestaat niet (meer). Kijk of de link klopt."
      : "Deze winkel laat zijn pagina niet uitlezen. Vul de prijs zelf in en upload eventueel een foto.";
    return c.json({ ...unread, notice });
  }
  const bytes = await readCapped(res, MAX_PAGE);
  const html = bytes ? new TextDecoder().decode(bytes) : "";

  const meta = metaTags(html);
  const product = ldProduct(html);
  const offer = firstOffer(product?.offers);
  const titleTag = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const title = decode(String(product?.name || "")) || meta.get("og:title") || meta.get("twitter:title") || titleTag || unread.title;
  const price =
    toPrice(offer?.price ?? offer?.lowPrice) ??
    toPrice(meta.get("product:price:amount") || meta.get("og:price:amount") || meta.get("price") || "");
  const currency = String(offer?.priceCurrency || meta.get("product:price:currency") || meta.get("og:price:currency") || meta.get("pricecurrency") || "EUR").toUpperCase();
  const imageUrl = imageOf(product?.image) || meta.get("og:image") || meta.get("og:image:secure_url") || meta.get("twitter:image") || "";

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

  const found = !!title || price !== null;
  const notice = !found
    ? "Op deze pagina stond geen productinformatie. Vul de gegevens zelf in."
    : price === null
      ? "De prijs stond niet op de pagina. Vul hem zelf in."
      : currency !== "EUR"
        ? `De prijs staat in ${currency}. Reken hem om naar euro's.`
        : undefined;
  return c.json({ url, title: title.slice(0, 300), price, shop: unread.shop, ...photo, notice });
});
