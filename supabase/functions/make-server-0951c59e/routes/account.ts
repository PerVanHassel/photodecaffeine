import { Hono } from "npm:hono";
import { accountName, checkCode, codeMinutes, guestsOfAccount, isBuyerOnly, newCode, sessionTokenFor } from "../lib/accounts.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, SITE_URL } from "../lib/config.ts";
import { db, must } from "../lib/db.ts";
import { sendEmail } from "../lib/email.ts";
import { logDownloads } from "../lib/downloads.ts";
import { type Env, fail, readBody, requireUser, text, uuid, z } from "../lib/http.ts";
import { boughtImageIds, guestWindowOpen, orderAmount } from "../lib/orders.ts";
import { deliveredImageIds, mailCard } from "../lib/priority.ts";
import { downloadLinks, downloadsUntil, gallerySigner, heldBack, imageToApi, loadProjects } from "../lib/projects.ts";
import { shareFor, shareUrl } from "../lib/shares.ts";
import { invoiceLink } from "./invoices.ts";

// Mijn foto's (/mijn-fotos): the account of someone who bought photos. Signing
// in goes with a code by mail (lib/accounts.ts); once in, they see every photo
// that is theirs, per gallery, and download it again while downloading is open.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/account";
r.use(`${A}/me`, requireUser);
r.use(`${A}/photos`, requireUser);
r.use(`${A}/downloads`, requireUser);
r.use(A, requireUser);

const lang = z.enum(["nl", "en"]).default("nl");
const email = text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in.");

function codeMail(language: "nl" | "en", code: string) {
  if (language === "en") {
    return {
      subject: `Your sign-in code: ${code}`,
      html: mailCard({
        eyebrow: "Sign in · PhotoDeCaffeine",
        title: code,
        sub: `Works for ${codeMinutes} minutes`,
        text: ["Enter this code to sign in to your photos. Did you not ask for it? Then you can ignore this mail."],
        foot: `Your photos stay under <a href="${SITE_URL}/mijn-fotos" style="color:rgba(255,251,224,0.7);">My photos</a>.`,
      }),
    };
  }
  return {
    subject: `Je inlogcode: ${code}`,
    html: mailCard({
      eyebrow: "Inloggen · PhotoDeCaffeine",
      title: code,
      sub: `Werkt ${codeMinutes} minuten`,
      text: ["Vul deze code in om bij je foto's te komen. Heb je niets aangevraagd? Dan kun je deze mail negeren."],
      foot: `Je foto's blijven staan bij <a href="${SITE_URL}/mijn-fotos" style="color:rgba(255,251,224,0.7);">Mijn foto's</a>.`,
    }),
  };
}

// --- a code by mail ---
// Says the same whether or not there is an account for the address.
r.post(`${A}/code`, async (c) => {
  const b = await readBody(c, z.object({ email, language: lang }));
  const code = await newCode(b.email);
  const sent = await sendEmail({ to: b.email, replyTo: EMAIL_ADMIN_NOTIFY, ...codeMail(b.language, code) });
  if (!sent.ok) fail(502, "De mail met je code kon niet worden verstuurd. Probeer het zo opnieuw.");
  return c.json({ sent: true });
});

// --- the code back: the browser gets a one-time token for its session ---
r.post(`${A}/verify`, async (c) => {
  const b = await readBody(c, z.object({ email, code: z.string().trim().regex(/^\d{6}$/, "De code heeft 6 cijfers."), name: text(120).default("") }));
  await checkCode(b.email, b.code);
  const { tokenHash, created } = await sessionTokenFor(b.email, b.name);
  return c.json({ tokenHash, type: "magiclink", created });
});

// --- who is signed in ---
r.get(`${A}/me`, async (c) => {
  const user = c.get("user");
  return c.json({ account: { email: user.email, name: accountName(user), buyerOnly: await isBuyerOnly(user) } });
});

r.put(`${A}/me`, async (c) => {
  const user = c.get("user");
  const b = await readBody(c, z.object({ name: text(120).min(1, "Vul je naam in.") }));
  await db.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, name: b.name } });
  must(await db.from("gallery_guests").update({ name: b.name }).eq("user_id", user.id));
  return c.json({ account: { email: user.email, name: b.name, buyerOnly: await isBuyerOnly(user) } });
});

// An account that only buys can go, with what it bought: the receipts stay, as the law asks.
r.delete(A, async (c) => {
  const user = c.get("user");
  if (!(await isBuyerOnly(user))) fail(409, "Dit account hoort ook bij het klantportaal. Mail ons, dan regelen we het samen.");
  must(await db.from("gallery_guests").update({ user_id: null }).eq("user_id", user.id));
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) fail(500, "Je account kon niet worden verwijderd. Probeer het zo opnieuw.");
  return c.json({ success: true });
});

/** Per gallery: the photos that are this account's, bought or got first. */
async function ownByProject(userId: string) {
  const guests = await guestsOfAccount(userId);
  const out = new Map<string, { guestIds: string[]; ids: Set<string> }>();
  for (const g of guests) {
    const entry = out.get(g.project_id) || { guestIds: [], ids: new Set<string>() };
    entry.guestIds.push(g.id);
    out.set(g.project_id, entry);
  }
  for (const entry of out.values()) {
    const [bought, first] = await Promise.all([boughtImageIds(entry.guestIds), Promise.all(entry.guestIds.map(deliveredImageIds))]);
    for (const id of bought) entry.ids.add(id);
    for (const set of first) for (const id of set) entry.ids.add(id);
  }
  return out;
}

r.get(`${A}/photos`, async (c) => {
  const user = c.get("user");
  const own = await ownByProject(user.id);
  const projectIds = [...own.keys()];
  const rows = await loadProjects({ ids: projectIds });
  const sign = await gallerySigner(rows);
  const guestIds = [...own.values()].flatMap((e) => e.guestIds);
  const orders = guestIds.length
    ? (must(await db.from("gallery_orders").select("id, project_id, price, amount, created_at, invoices ( id, number, status, token, paid_at ), gallery_order_images ( image_id )").in("guest_id", guestIds).not("invoice_id", "is", null)) || []) as any[]
    : [];
  const galleries = [];
  for (const row of rows) {
    const entry = own.get(row.id);
    if (!entry) continue;
    const photos = (row.gallery_images || []).filter((g: any) => entry.ids.has(g.id) && !heldBack(g)).sort((a: any, b: any) => a.sort - b.sort);
    if (photos.length === 0) continue;
    const share = await shareFor(row.id);
    const gs = row.gallery_settings || {};
    galleries.push({
      id: row.id,
      title: gs.title || row.title,
      subtitle: gs.subtitle || "",
      style: gs.style || "",
      accentColor: gs.accentColor || "",
      link: share?.active ? shareUrl(share.token) : "",
      open: guestWindowOpen(row),
      until: downloadsUntil(row),
      photos: photos.map((g: any) => ({ ...imageToApi(g, sign, "original"), download: true, mine: true })),
      orders: orders.filter((o) => o.project_id === row.id && o.invoices?.status === "paid").map((o) => ({
        id: o.id,
        number: o.invoices.number,
        amount: orderAmount(o, (o.gallery_order_images || []).length),
        count: (o.gallery_order_images || []).length,
        paidAt: o.invoices.paid_at,
        invoiceLink: invoiceLink(o.invoices),
      })),
    });
  }
  return c.json({ galleries });
});

// Links to save own photos, one or a zip's worth; each is written in the log.
r.post(`${A}/downloads`, async (c) => {
  const user = c.get("user");
  const b = await readBody(c, z.object({ projectId: uuid, imageIds: z.array(uuid).min(1).max(2000) }));
  const entry = (await ownByProject(user.id)).get(b.projectId);
  if (!entry) fail(404, "Deze foto's horen niet bij je account.");
  const [row] = await loadProjects({ ids: [b.projectId] });
  if (!row) fail(404, "Deze galerij bestaat niet meer.");
  if (!guestWindowOpen(row)) fail(403, `Downloaden kon tot ${downloadsUntil(row)}. Mail ons als je de foto's toch nog nodig hebt.`);
  const wanted = new Set(b.imageIds.filter((id) => entry.ids.has(id)));
  const images = (row.gallery_images || []).filter((g: any) => wanted.has(g.id));
  const files = await downloadLinks(images, () => "original");
  const guestId = entry.guestIds[0];
  const batch = files.length > 1 ? crypto.randomUUID() : null;
  await logDownloads(files.map((f) => ({ project_id: row.id, image_id: f.id, guest_id: guestId, who: accountName(user), source: "account", version: f.version })), batch);
  if (files.length) {
    must(await db.from("gallery_guests").update({ last_seen_at: new Date().toISOString() }).in("id", entry.guestIds));
  }
  return c.json({ files });
});
