import { Hono } from "npm:hono";
import { EMAIL_ADMIN_NOTIFY, EMAIL_INVOICE_BCC, PAYMENT_WORKDAYS } from "../lib/config.ts";
import { db, found, must, nextDocumentNumber } from "../lib/db.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, requireAdmin, requirePermission, text, uuid, z } from "../lib/http.ts";
import { mollieMode } from "../lib/mollie.ts";
import { paymentsOf } from "../lib/payments.ts";
import { bookingMail, deliveredMail, dueBy, imagesOf, invoicesOf, offerMail } from "../lib/priority.ts";
import { heldBack } from "../lib/projects.ts";
import { shareFor, shareUrl } from "../lib/shares.ts";
import { addWorkdays, todayAmsterdam } from "../lib/util.ts";
import { invoiceLink } from "./invoices.ts";

// ============================================================================
// VOORRANG: the studio's side (see lib/priority.ts)
// ============================================================================
//
// A guest asked for the photos of one person first. The studio looks whether
// there are enough of them and answers: a payment link (an invoice of the price
// the guest agreed to), or too few photos and an offer for a shoot of their own.
// Paid, the studio picks the photos in the gallery and delivers them.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/priority";
r.use(`${A}/*`, requireAdmin, requirePermission("manageClients", "projecten en planning"));

const SELECT = "*, gallery_guests ( name, email ), projects ( id, title, stage, gallery_settings )";

function toApi(row: any, inv: any, images: string[]) {
  return {
    id: row.id,
    projectId: row.project_id,
    person: row.person,
    number: row.number,
    note: row.note,
    language: row.language,
    status: row.status,
    price: Number(row.price),
    days: row.days,
    photos: row.photos,
    guest: { id: row.guest_id, name: row.gallery_guests?.name || "", email: row.gallery_guests?.email || "" },
    invoice: inv ? { id: inv.id, number: inv.number, status: inv.status } : null,
    paid: inv?.status === "paid",
    /** The last working day for the photos, once paid. */
    dueBy: inv?.status === "paid" ? dueBy(inv.paid_at, row.days) : "",
    images,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    deliveredAt: row.delivered_at,
  };
}

async function listFor(projectId: string) {
  const rows = (must(await db.from("gallery_priority").select(SELECT).eq("project_id", projectId).order("created_at", { ascending: false })) || []) as any[];
  const [invoices, images] = await Promise.all([invoicesOf(rows), imagesOf(rows.map((x) => x.id))]);
  return rows.map((row) => toApi(row, invoices.get(row.invoice_id), images.get(row.id) || []));
}

async function load(id: string): Promise<any> {
  return found(await db.from("gallery_priority").select(SELECT).eq("id", id).maybeSingle(), "Aanvraag niet gevonden");
}

async function invoiceOf(row: any): Promise<any | null> {
  return row.invoice_id ? must(await db.from("invoices").select("*").eq("id", row.invoice_id).maybeSingle()) : null;
}

/** What every change answers with: the request, and all of the project's for the list. */
async function respond(c: any, row: any, extra: Record<string, unknown> = {}) {
  const requests = await listFor(row.project_id);
  return c.json({ request: requests.find((x) => x.id === row.id), requests, ...extra });
}

const titleOf = (row: any) => row.projects?.gallery_settings?.title || row.projects?.title || "";

/**
 * An offer that was not paid falls away with its invoice. Not while a bank is
 * still finishing a payment, nor once money came in: then it stays as it is.
 */
async function dropUnpaid(inv: any) {
  if (!inv || inv.status !== "sent") return;
  const attempts = await paymentsOf(inv.id);
  if (attempts.some((p) => ["pending", "authorized", "paid"].includes(p.status))) {
    fail(409, "Er loopt een betaling voor deze factuur. Wacht tot die binnen is.");
  }
  must(await db.from("invoices").update({ status: "void" }).eq("id", inv.id).eq("status", "sent"));
}

const messageBody = z.object({ message: text(2000).default("") });

// --- the requests of one project ---
r.get(`${A}/project/:projectId`, async (c) => c.json({ requests: await listFor(c.req.param("projectId")) }));

// --- enough photos: the invoice, and a mail with the way to pay ---
r.post(`${A}/:id/offer`, async (c) => {
  const row = await load(c.req.param("id"));
  const b = await readBody(c, messageBody.extend({ photos: z.number().int().min(1).max(10000).nullable().default(null) }));
  if (!["new", "booking"].includes(row.status)) fail(409, "Op deze aanvraag is al een betaallink gestuurd.");
  const guest = row.gallery_guests;
  if (!guest) fail(409, "Deze bezoeker staat niet meer bij de galerij.");

  // An invoice from an earlier offer that is still open is used again.
  let inv = await invoiceOf(row);
  if (inv?.status === "paid") fail(409, "Deze aanvraag is al betaald.");
  if (!inv || inv.status !== "sent") {
    const first = String(row.person).trim().split(/\s+/)[0];
    inv = must(await db.from("invoices").insert({
      number: await nextDocumentNumber("FA"),
      status: "sent",
      project_id: row.project_id,
      client_name: guest.name,
      client_email: guest.email,
      // First name and number only: an invoice is kept for years.
      lines: [{ label: `Voorrang foto's: ${first}${row.number ? ` #${row.number}` : ""}`, quantity: 1, amount: Number(row.price), note: `${titleOf(row)}. Binnen ${row.days} werkdagen na betaling.` }],
      vat_basis: "incl",
      vat_rate: 21,
      notes: "Je vroeg om na je betaling meteen te beginnen. Zijn de foto's geleverd, dan vervalt je herroepingsrecht.",
      due_on: addWorkdays(todayAmsterdam(), PAYMENT_WORKDAYS),
      sent_at: new Date().toISOString(),
    }).select("*").single()) as any;
  }
  must(await db.from("gallery_priority").update({ status: "offered", photos: b.photos, invoice_id: inv.id, answered_at: new Date().toISOString() }).eq("id", row.id));

  const mail = offerMail({ ...row, photos: b.photos }, {
    guestName: guest.name,
    galleryTitle: titleOf(row),
    payLink: invoiceLink(inv),
    online: mollieMode() === "live",
    message: b.message,
  });
  const sent = await sendEmail({ to: guest.email, subject: mail.subject, html: mail.html, replyTo: EMAIL_ADMIN_NOTIFY, bcc: EMAIL_INVOICE_BCC });
  return respond(c, row, { mailed: sent.ok, invoice: { id: inv.id, number: inv.number } });
});

// --- too few photos: nothing to pay, a shoot of their own instead ---
r.post(`${A}/:id/booking`, async (c) => {
  const row = await load(c.req.param("id"));
  const b = await readBody(c, messageBody);
  if (!["new", "offered"].includes(row.status)) fail(409, "Deze aanvraag is al afgerond.");
  const guest = row.gallery_guests;
  if (!guest) fail(409, "Deze bezoeker staat niet meer bij de galerij.");
  const inv = await invoiceOf(row);
  if (inv?.status === "paid") fail(409, "Deze aanvraag is al betaald. Lever de foto's, of geef het geld terug bij de factuur.");
  await dropUnpaid(inv);
  must(await db.from("gallery_priority").update({ status: "booking", answered_at: new Date().toISOString() }).eq("id", row.id));

  const mail = bookingMail(row, { guestName: guest.name, galleryTitle: titleOf(row), message: b.message });
  const sent = await sendEmail({ to: guest.email, subject: mail.subject, html: mail.html, replyTo: EMAIL_ADMIN_NOTIFY });
  return respond(c, row, { mailed: sent.ok });
});

// --- the photos for this request, picked in the gallery ---
r.put(`${A}/:id/images`, async (c) => {
  const row = await load(c.req.param("id"));
  const { ids, on } = await readBody(c, z.object({ ids: z.array(uuid).min(1).max(2000), on: z.boolean() }));
  if (["booking", "closed"].includes(row.status)) fail(409, "Deze aanvraag loopt niet meer.");
  let skipped = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    if (!on) {
      must(await db.from("gallery_priority_images").delete().eq("priority_id", row.id).in("image_id", part));
      continue;
    }
    // A photo that is held back for a child never goes to a guest.
    const images = (must(await db.from("gallery_images").select("id, restriction").eq("project_id", row.project_id).in("id", part)) || []) as any[];
    const allowed = images.filter((g) => !heldBack(g));
    skipped += part.length - allowed.length;
    if (allowed.length) {
      must(await db.from("gallery_priority_images").upsert(
        allowed.map((g) => ({ priority_id: row.id, image_id: g.id })),
        { onConflict: "priority_id,image_id", ignoreDuplicates: true },
      ));
    }
  }
  return respond(c, row, { skipped });
});

// --- the photos are picked: the guest can download them ---
r.post(`${A}/:id/deliver`, async (c) => {
  const row = await load(c.req.param("id"));
  const b = await readBody(c, messageBody);
  if (["booking", "closed"].includes(row.status)) fail(409, "Deze aanvraag loopt niet meer.");
  const guest = row.gallery_guests;
  if (!guest) fail(409, "Deze bezoeker staat niet meer bij de galerij.");
  const ids = (await imagesOf([row.id])).get(row.id) || [];
  const shown = ids.length
    ? ((must(await db.from("gallery_images").select("id, restriction").in("id", ids.slice(0, 2000))) || []) as any[]).filter((g) => !heldBack(g))
    : [];
  if (shown.length === 0) fail(400, "Kies eerst de foto's. Vink ze aan in de galerij en kies 'Voor voorrang'.");
  const share = await shareFor(row.project_id);
  if (!share?.active) fail(409, "Zet eerst de groepslink aan. Daarmee haalt de gast de foto's op.");

  must(await db.from("gallery_priority").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", row.id));
  const mail = deliveredMail(row, {
    guestName: guest.name,
    guestEmail: guest.email,
    galleryTitle: titleOf(row),
    link: `${shareUrl(share.token)}?voorrang=${row.id}`,
    count: shown.length,
    message: b.message,
  });
  const sent = await sendEmail({ to: guest.email, subject: mail.subject, html: mail.html, replyTo: EMAIL_ADMIN_NOTIFY });
  return respond(c, row, { mailed: sent.ok, count: shown.length });
});

// --- stop it without a mail: a double request, or one that is no longer wanted ---
r.post(`${A}/:id/close`, async (c) => {
  const row = await load(c.req.param("id"));
  const inv = await invoiceOf(row);
  if (inv?.status === "paid") fail(409, "Deze aanvraag is betaald. Lever de foto's, of geef eerst het geld terug bij de factuur.");
  await dropUnpaid(inv);
  must(await db.from("gallery_priority").update({ status: "closed" }).eq("id", row.id));
  return respond(c, row);
});
