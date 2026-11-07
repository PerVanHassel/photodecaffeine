import { Hono, type MiddlewareHandler } from "npm:hono";
import { hasPermission } from "../lib/auth.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_INVOICE_BCC, EMAIL_RE, SITE_URL } from "../lib/config.ts";
import { db, found, must, nextDocumentNumber } from "../lib/db.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, requireAdmin, text, z } from "../lib/http.ts";
import { amountOf, createPayment, createRefund, getPayment, type MolliePayment, mollieMode } from "../lib/mollie.ts";
import { notify } from "../lib/notify.ts";
import { kept, keptOf, methodLabel, paymentsOf } from "../lib/payments.ts";
import { orderPaidMail } from "../lib/orders.ts";
import { paidMail, personLabel, priorityForInvoice } from "../lib/priority.ts";
import { shareFor, shareUrl } from "../lib/shares.ts";
import { greetingOf, invoiceLink, invoiceMail, invoiceTotals, payableOnline } from "./invoices.ts";
import { euro } from "./quotes.ts";

// Paying an invoice online, through Mollie's own payment page. The client
// clicks Betaal nu on their copy (/factuur/…), pays at Mollie and comes back.
// Mollie then posts the payment id to /api/mollie on the site, which forwards it
// here (the function gateway wants a key Mollie cannot send). What happened is
// always asked of Mollie itself: nothing a request says about a payment is
// believed. Terms article 5 and the privacy statement describe this.

const r = new Hono<Env>();
export default r;

const BASE = "/make-server-0951c59e";
const round2 = (n: number) => Math.round(n * 100) / 100;
const todayIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const STATUS_WORD: Record<string, string> = { draft: "concept", sent: "open", paid: "betaald", void: "vervallen" };

/** The invoice a public link points at, checked like the client's copy in routes/invoices.ts. */
async function invoiceByToken(id: string, token: string): Promise<any> {
  const row = must(await db.from("invoices").select("*").eq("id", id).maybeSingle()) as any;
  if (!row || !token || token !== row.token || row.status === "draft") fail(404, "Deze factuur bestaat niet (meer).");
  return row;
}

const tokenBody = z.object({ token: z.string().min(1).max(200), test: z.boolean().default(false) });

// ---------------------------------------------------------------------------
// The client pays
// ---------------------------------------------------------------------------

r.post(`${BASE}/invoice/:id/pay`, async (c) => {
  const { token, test } = await readBody(c, tokenBody);
  const inv = await invoiceByToken(c.req.param("id"), token);
  if (inv.status === "paid") fail(409, "Deze factuur is al betaald.");
  if (!payableOnline(inv, test)) fail(409, "Online betalen kan nu niet. Maak het bedrag over naar het rekeningnummer op de factuur.");
  // Always the amount on the invoice, never one from the browser.
  const total = invoiceTotals(inv).total;
  const attempts = await paymentsOf(inv.id);
  // A bank still finishing a payment: a second one would be paid twice.
  if (attempts.some((p) => p.status === "pending" || p.status === "authorized")) {
    fail(409, "Er loopt al een betaling voor deze factuur. Het kan een paar minuten duren voor die binnen is.");
  }
  // Clicking again soon after goes back to the same payment page.
  const open = attempts.find((p) =>
    p.status === "open" && p.mode === mollieMode() && p.checkout_url && Number(p.amount) === total &&
    Date.now() - new Date(p.created_at).getTime() < 10 * 60_000
  );
  if (open) return c.json({ id: inv.id, checkoutUrl: open.checkout_url, amount: total, reused: true });

  const back = `${SITE_URL}/factuur/${inv.id}?t=${inv.token}${test ? "&test=1" : ""}`;
  const mp = await createPayment({
    amount: total,
    // What the client sees on their bank statement.
    description: `Factuur ${inv.number} PhotoDeCaffeine`,
    redirectUrl: `${back}&betaling=terug`,
    cancelUrl: `${back}&betaling=gestopt`,
    webhookUrl: `${SITE_URL}/api/mollie`,
    metadata: { invoiceId: inv.id, invoice: inv.number },
  });
  const checkoutUrl = mp._links?.checkout?.href || "";
  if (!checkoutUrl) fail(502, "De betaaldienst gaf geen betaalpagina terug. Probeer het zo opnieuw.");
  must(await db.from("payments").insert({
    invoice_id: inv.id,
    mollie_id: mp.id,
    mode: mp.mode,
    status: mp.status,
    amount: total,
    checkout_url: checkoutUrl,
  }));
  return c.json({ id: inv.id, checkoutUrl, amount: total, reused: false });
});

// Back from Mollie's page: ask how it went instead of waiting for the webhook.
r.post(`${BASE}/invoice/:id/payment-check`, async (c) => {
  const { token } = await readBody(c, tokenBody);
  const inv = await invoiceByToken(c.req.param("id"), token);
  const latest = (await paymentsOf(inv.id))[0];
  if (!latest || latest.mode !== mollieMode()) return c.json({ id: inv.id, event: "", status: latest?.status || "" });
  return c.json({ ...(await syncPayment(await getPayment(latest.mollie_id))), id: inv.id });
});

// Mollie posts only the id, form-encoded, through api/mollie.ts. A 200 tells
// Mollie it arrived; anything else and it tries again later.
r.post(`${BASE}/mollie/webhook`, async (c) => {
  const form = await c.req.parseBody().catch(() => ({} as Record<string, unknown>));
  const id = typeof form.id === "string" ? form.id : "";
  const none = { id: "", event: "" };
  if (!/^tr_\w+$/.test(id) || !mollieMode()) return c.json(none);
  // Not ours, or made with the other key (test before live): nothing to do.
  const row = (await db.from("payments").select("mode").eq("mollie_id", id).maybeSingle()).data as any;
  if (!row || row.mode !== mollieMode()) return c.json(none);
  return c.json(await syncPayment(await getPayment(id)));
});

// ---------------------------------------------------------------------------
// Keeping our record in step with Mollie
// ---------------------------------------------------------------------------

type Sync = { id: string; event: string; status: string; method: string; methodLabel: string; amount: number };

/**
 * Brings our record of one payment up to date and acts on what changed. The
 * webhook and the client's return can call this at the same moment: only the
 * call whose update actually changed the row goes on to mail anyone.
 */
export async function syncPayment(mp: MolliePayment): Promise<Sync> {
  const row = (await db.from("payments").select("*").eq("mollie_id", mp.id).maybeSingle()).data as any;
  const out: Sync = { id: row?.invoice_id || "", event: "", status: mp.status, method: mp.method || "", methodLabel: methodLabel(mp.method), amount: amountOf(mp.amount) };
  if (!row) return out;
  const patch = {
    status: mp.status,
    method: mp.method || row.method || "",
    amount_refunded: amountOf(mp.amountRefunded),
    amount_charged_back: amountOf(mp.amountChargedBack),
    paid_at: mp.paidAt || row.paid_at,
  };
  const unchanged = patch.status === row.status && patch.method === row.method &&
    patch.amount_refunded === Number(row.amount_refunded) && patch.amount_charged_back === Number(row.amount_charged_back);
  if (unchanged) return out;
  const won = must(await db.from("payments").update(patch)
    .eq("id", row.id).eq("status", row.status).eq("amount_charged_back", row.amount_charged_back).select("id")) || [];
  if (!won.length) return out;

  // A basket of photos from a group gallery: its invoice is made once it is paid.
  if (!row.invoice_id) {
    if (row.order_id && row.status !== "paid" && mp.status === "paid") Object.assign(out, await onOrderPaid(row, mp));
    return out;
  }
  const inv = (await db.from("invoices").select("*").eq("id", row.invoice_id).maybeSingle()).data as any;
  if (!inv) return out;
  if (row.status !== "paid" && mp.status === "paid") out.event = await onPaid(inv, mp);
  else if (patch.amount_charged_back > Number(row.amount_charged_back)) out.event = await onChargeback(inv, round2(patch.amount_charged_back - Number(row.amount_charged_back)));
  return out;
}

async function onPaid(inv: any, mp: MolliePayment): Promise<string> {
  const amount = amountOf(mp.amount);
  const total = invoiceTotals(inv).total;
  const via = methodLabel(mp.method);
  if (Math.abs(amount - total) >= 0.005) {
    await alert(inv, `Betaling voor ${inv.number} klopt niet`, `Er is ${euro(amount)} betaald via ${via}, de factuur is ${euro(total)}. Kijk het na in Mollie.`);
    return "mismatch";
  }
  const flipped = must(await db.from("invoices").update({ status: "paid", paid_at: mp.paidAt || new Date().toISOString() })
    .eq("id", inv.id).eq("status", "sent").select("id")) || [];
  if (!flipped.length) {
    const now = (await db.from("invoices").select("status").eq("id", inv.id).maybeSingle()).data?.status || inv.status;
    if (now === "paid") {
      await alert(inv, `${inv.number} is twee keer betaald`, `Er kwam nog een betaling van ${euro(amount)} binnen via ${via}. Stort er één terug met Terugbetalen bij de factuur.`);
      return "double";
    }
    await alert(inv, `Betaling voor ${inv.number} ontvangen`, `Er is ${euro(amount)} betaald via ${via}, maar de factuur staat op ${STATUS_WORD[now] || now}. Kijk hem na.`);
    return "unexpected";
  }

  // Voorrang in a group gallery (lib/priority.ts): the studio hears whose photos
  // to do first, and the guest when to expect them.
  const priority = await priorityForInvoice(inv.id).catch(() => null);
  if (priority) {
    await notify({
      type: "priority", title: `Voorrang betaald: ${personLabel(priority)}`,
      body: `${euro(amount)} via ${via}, door ${inv.client_name} · ${priority.projects?.title || ""}`, link: `/admin/project/${priority.project_id}?tab=gallery`,
    });
  } else {
    await notify({ type: "invoice", title: `${inv.number} is online betaald`, body: `${euro(amount)} via ${via}${inv.client_name ? `, door ${inv.client_name}` : ""}`, link: `/admin/invoice/${inv.id}` });
  }
  if (EMAIL_RE.test(inv.client_email || "")) {
    const mail = priority ? paidMail(priority, { guestName: inv.client_name, invoiceNumber: inv.number, via, invoiceLink: invoiceLink(inv) }) : null;
    await sendEmail({
      to: inv.client_email,
      subject: mail?.subject || `Betaling ontvangen: factuur ${inv.number}`,
      replyTo: EMAIL_ADMIN_NOTIFY,
      bcc: EMAIL_INVOICE_BCC,
      html: mail?.html || invoiceMail({
        eyebrow: `Betaald · ${inv.number}`,
        amount,
        sub: `Ontvangen via ${via}`,
        text: `${greetingOf(inv)} dank je wel. We hebben je betaling voor factuur ${escapeHtml(inv.number)} ontvangen. Je hoeft verder niets te doen.`,
        button: "Bekijk factuur",
        link: invoiceLink(inv),
      }),
    });
  }
  return "paid";
}

// The client's bank took the money back. The invoice is open again, unless
// what is left online (a second payment) still covers it.
async function onChargeback(inv: any, amount: number): Promise<string> {
  if (keptOf(await paymentsOf(inv.id)) < invoiceTotals(inv).total - 0.005) {
    must(await db.from("invoices").update({ status: "sent", paid_at: null }).eq("id", inv.id).eq("status", "paid"));
  }
  await alert(inv, `Betaling van ${inv.number} teruggedraaid`, `De bank van de klant heeft ${euro(amount)} teruggehaald. Kijk in Mollie waarom; de factuur staat weer open.`);
  return "chargeback";
}

/**
 * A basket from a group gallery is paid (lib/orders.ts): now its invoice is
 * made, already paid, as the receipt. The photos open up for the guest by
 * themselves, since what they bought is read from paid invoices.
 */
async function onOrderPaid(row: any, mp: MolliePayment): Promise<{ event: string; id: string }> {
  const amount = amountOf(mp.amount);
  const via = methodLabel(mp.method);
  const order = (await db.from("gallery_orders").select("*, gallery_guests ( name, email ), projects ( title, gallery_settings )").eq("id", row.order_id).maybeSingle()).data as any;
  const where = { number: "Foto's", link: order ? `/admin/project/${order.project_id}?tab=gallery` : "/admin/invoices", button: "Open het project" };
  if (!order) {
    await alert(where, "Betaling voor foto's zonder bestelling", `Er is ${euro(amount)} betaald via ${via}, maar de bestelling staat er niet meer. Kijk het na in Mollie.`);
    return { event: "unexpected", id: "" };
  }
  const images = (must(await db.from("gallery_order_images").select("image_id").eq("order_id", order.id)) || []) as any[];
  const count = images.length;
  const price = Number(order.price);
  if (count === 0 || Math.abs(amount - round2(price * count)) >= 0.005) {
    await alert(where, "Betaling voor foto's klopt niet", `Er is ${euro(amount)} betaald via ${via} voor ${count} foto's van ${euro(price)}. Kijk het na in Mollie.`);
    return { event: "mismatch", id: "" };
  }
  if (order.invoice_id) {
    await alert(where, "Foto's twee keer betaald", `Er kwam nog een betaling van ${euro(amount)} binnen via ${via} voor dezelfde foto's. Stort er één terug in Mollie.`);
    return { event: "double", id: order.invoice_id };
  }

  const guest = order.gallery_guests || {};
  const title = order.projects?.gallery_settings?.title || order.projects?.title || "";
  const normal = Number(order.normal_price);
  const now = new Date().toISOString();
  const inv = must(await db.from("invoices").insert({
    number: await nextDocumentNumber("FA"),
    status: "paid",
    project_id: order.project_id,
    client_name: guest.name || "",
    client_email: guest.email || "",
    lines: [{
      label: "Foto's zonder watermerk",
      quantity: count,
      amount: price,
      note: [title, normal > price ? `Start-up korting: normaal ${euro(normal)} per foto` : ""].filter(Boolean).join(". "),
    }],
    vat_basis: "incl",
    vat_rate: 21,
    notes: "Je gaf toestemming om de foto's meteen te leveren. Daardoor is je herroepingsrecht vervallen.",
    due_on: todayIso(),
    sent_at: now,
    paid_at: mp.paidAt || now,
  }).select("*").single()) as any;
  must(await db.from("payments").update({ invoice_id: inv.id }).eq("id", row.id));
  must(await db.from("gallery_orders").update({ invoice_id: inv.id }).eq("id", order.id));

  await notify({
    type: "invoice", title: `${count} ${count === 1 ? "foto" : "foto's"} verkocht`,
    body: `${euro(amount)} via ${via}, door ${guest.name || "een gast"} · ${order.projects?.title || ""}`, link: `/admin/invoice/${inv.id}`,
  });
  if (EMAIL_RE.test(guest.email || "")) {
    const share = await shareFor(order.project_id);
    const mail = orderPaidMail(order.language, {
      guestName: guest.name || "", count, amount, via, invoiceNumber: inv.number, invoiceLink: invoiceLink(inv),
      galleryLink: share ? `${shareUrl(share.token)}?bestelling=${order.id}` : SITE_URL,
    });
    await sendEmail({ to: guest.email, subject: mail.subject, html: mail.html, replyTo: EMAIL_ADMIN_NOTIFY, bcc: EMAIL_INVOICE_BCC });
  }
  return { event: "order", id: inv.id };
}

/** Something about a payment the owner has to look at: a melding and a mail. */
async function alert(inv: { id?: string; number: string; link?: string; button?: string }, title: string, body: string) {
  const link = inv.link || `/admin/invoice/${inv.id}`;
  await notify({ type: "invoice", title, body, link });
  await sendEmail({
    to: EMAIL_ADMIN_NOTIFY,
    bcc: EMAIL_INVOICE_BCC,
    subject: title,
    html: emailWrap(`
    <tr><td style="padding:32px 36px 0;">
      <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Let op &middot; ${escapeHtml(inv.number)}</span>
      <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
      <span style="display:block;color:#fffbe0;font-size:20px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(title)}</span>
    </td></tr>
    <tr><td style="padding:16px 36px 0;">
      <span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">${escapeHtml(body)}</span>
    </td></tr>
    <tr><td style="padding:26px 36px 40px;">
      <a href="${SITE_URL}${link}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">${escapeHtml(inv.button || "Open de factuur")}</a>
    </td></tr>`),
  });
}

// ---------------------------------------------------------------------------
// Admin: money back
// ---------------------------------------------------------------------------

const ADMIN = `${BASE}/admin/invoices`;
const canManage: MiddlewareHandler<Env> = async (c, next) => {
  if (!(await hasPermission(c.get("user"), "manageQuotes"))) return c.json({ error: "Je hebt geen rechten voor facturen." }, 403);
  await next();
};
r.use(`${ADMIN}/:id/refund`, requireAdmin, canManage);

// Back to the account or card it came from (terms, part 4), with a credit
// note so the VAT in the books adds up. The client gets both by mail.
r.post(`${ADMIN}/:id/refund`, async (c) => {
  const id = c.req.param("id");
  const inv = found(await db.from("invoices").select("*").eq("id", id).maybeSingle(), "Factuur niet gevonden") as any;
  const b = await readBody(c, z.object({ amount: z.number().positive().max(1_000_000).optional(), reason: text(200).default("") }));
  const mode = mollieMode();
  if (!mode) fail(409, "Online betalen staat niet aan, dus terugstorten kan hier niet. Doe het in het dashboard van Mollie.");

  // Mollie first: a refund made in its own dashboard counts too.
  for (const p of await paymentsOf(id)) {
    if (p.status === "paid" && p.mode === mode) await syncPayment(await getPayment(p.mollie_id));
  }
  const pay = (await paymentsOf(id)).find((p) => p.mode === mode && kept(p) > 0);
  if (!pay) fail(409, "Op deze factuur is niets online betaald dat nog terug kan.");
  const left = kept(pay);
  const amount = round2(b.amount ?? left);
  if (amount > left) fail(400, `Van deze betaling kan nog ${euro(left)} terug.`);

  await createRefund(pay.mollie_id, amount, `Terugbetaling factuur ${inv.number}`);
  must(await db.from("payments").update({ amount_refunded: round2(Number(pay.amount_refunded) + amount) }).eq("id", pay.id));

  // Prices including VAT, so the credit note comes to the refunded amount to the cent.
  const now = new Date().toISOString();
  const credit = must(await db.from("invoices").insert({
    number: await nextDocumentNumber("FA"),
    status: "paid",
    quote_id: inv.quote_id,
    project_id: inv.project_id,
    client_id: inv.client_id,
    client_name: inv.client_name,
    client_email: inv.client_email,
    client_address: inv.client_address,
    lines: [{ label: `Terugbetaling factuur ${inv.number}`, quantity: 1, amount: -amount, note: b.reason }],
    vat_basis: "incl",
    vat_rate: inv.vat_rate,
    notes: `Creditfactuur bij factuur ${inv.number}. Het bedrag is via Mollie teruggestort op de rekening of kaart waarmee is betaald.`,
    due_on: todayIso(),
    paid_at: now,
  }).select("*").single()) as any;

  let mailed = false;
  if (EMAIL_RE.test(inv.client_email || "")) {
    const sent = await sendEmail({
      to: inv.client_email,
      subject: `Terugbetaling: factuur ${inv.number}`,
      replyTo: EMAIL_ADMIN_NOTIFY,
      bcc: EMAIL_INVOICE_BCC,
      html: invoiceMail({
        eyebrow: `Terugbetaling · ${credit.number}`,
        amount,
        sub: "Teruggestort via Mollie",
        text: `${greetingOf(inv)} we hebben ${euro(amount)} van factuur ${escapeHtml(inv.number)} teruggestort op de rekening of kaart waarmee je betaalde. Meestal staat het binnen een paar werkdagen bij je. Via de knop vind je de creditfactuur ${escapeHtml(credit.number)}.`,
        button: "Bekijk creditfactuur",
        link: invoiceLink(credit),
      }),
    });
    mailed = sent.ok;
    if (sent.ok) must(await db.from("invoices").update({ sent_at: now }).eq("id", credit.id));
  }
  return c.json({ invoice: { id: inv.id }, credit: { id: credit.id, number: credit.number }, amount, mailed });
});
