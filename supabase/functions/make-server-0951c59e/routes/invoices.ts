import { Hono, type MiddlewareHandler } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { hasPermission } from "../lib/auth.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, SITE_URL } from "../lib/config.ts";
import { db, found, must, nextDocumentNumber } from "../lib/db.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { type Env, fail, isoDate, readBody, requireAdmin, text, uuid, z } from "../lib/http.ts";
import { euro, quoteLines, rowToQuote } from "./quotes.ts";

const r = new Hono<Env>();
export default r;

// ---------------------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------------------
// A line is {label, quantity, amount, note}; amount is the price of one unit.
// vat_basis says which side of the VAT the amounts are on, like on a quote.

type Line = { label: string; quantity: number; amount: number; note: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function invoiceLines(raw: any): Line[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l: any) => ({
      label: String(l?.label ?? "").trim(),
      quantity: Number.isFinite(Number(l?.quantity)) && Number(l.quantity) > 0 ? round2(Number(l.quantity)) : 1,
      amount: round2(Number(l?.amount) || 0),
      note: String(l?.note ?? "").trim(),
    }))
    .filter((l) => l.label)
    .slice(0, 50);
}

export function invoiceTotals(inv: { lines: any; vat_basis: string; vat_rate: number | string }) {
  const lines = invoiceLines(inv.lines);
  const rate = Number(inv.vat_rate) || 0;
  const sum = round2(lines.reduce((s, l) => s + l.quantity * l.amount, 0));
  if (inv.vat_basis === "incl") {
    const vat = round2((sum * rate) / (100 + rate));
    return { net: round2(sum - vat), vat, total: sum, vatRate: rate };
  }
  const vat = round2((sum * rate) / 100);
  return { net: sum, vat, total: round2(sum + vat), vatRate: rate };
}

function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function isOverdue(inv: any): boolean {
  return inv.status === "sent" && inv.due_on < todayIso();
}

function invoiceLink(inv: any): string {
  return `${SITE_URL}/factuur/${inv.id}?t=${inv.token}`;
}

function toApi(inv: any) {
  return {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    overdue: isOverdue(inv),
    quoteId: inv.quote_id,
    projectId: inv.project_id,
    clientId: inv.client_id,
    clientName: inv.client_name,
    clientEmail: inv.client_email,
    clientAddress: inv.client_address,
    lines: invoiceLines(inv.lines),
    vatBasis: inv.vat_basis,
    vatRate: Number(inv.vat_rate),
    issuedOn: inv.issued_on,
    dueOn: inv.due_on,
    notes: inv.notes,
    sentAt: inv.sent_at,
    remindedAt: inv.reminded_at,
    paidAt: inv.paid_at,
    totals: invoiceTotals(inv),
    link: invoiceLink(inv),
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
  };
}

/** The studio's own details, printed on every invoice; kept with the site settings. */
async function business() {
  const raw = await kv.get("site:settings");
  const s = raw ? JSON.parse(raw) : {};
  return {
    name: s.business?.name || "PhotoDeCaffeine Productions",
    address: s.business?.address || "",
    kvk: s.business?.kvk || "",
    vatNumber: s.business?.vatNumber || "",
    iban: s.business?.iban || "",
    email: s.business?.email || EMAIL_ADMIN_NOTIFY,
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const A = "/make-server-0951c59e/admin/invoices";
const canManage: MiddlewareHandler<Env> = async (c, next) => {
  if (!(await hasPermission(c.get("user"), "manageQuotes"))) return c.json({ error: "Je hebt geen rechten voor facturen." }, 403);
  await next();
};
r.use(A, requireAdmin, canManage);
r.use(`${A}/*`, requireAdmin, canManage);

const lineSchema = z.object({
  label: text(300).min(1, "Elke regel heeft een omschrijving nodig."),
  quantity: z.number().positive().max(100000).default(1),
  amount: z.number().min(-1_000_000).max(1_000_000),
  note: text(500).default(""),
});

const invoiceSchema = z.object({
  clientId: uuid.nullable().optional(),
  projectId: uuid.nullable().optional(),
  clientName: text(200).default(""),
  clientEmail: z.string().trim().toLowerCase().refine((v) => v === "" || EMAIL_RE.test(v), "Vul een geldig e-mailadres in.").default(""),
  clientAddress: text(1000).default(""),
  lines: z.array(lineSchema).min(1, "Zet er minstens één regel op.").max(50),
  vatBasis: z.enum(["incl", "excl"]).default("excl"),
  vatRate: z.number().min(0).max(100).default(21),
  issuedOn: isoDate.optional(),
  dueOn: isoDate.optional(),
  notes: text(4000).default(""),
});

function toRow(b: z.infer<typeof invoiceSchema>) {
  return {
    client_id: b.clientId || null,
    project_id: b.projectId || null,
    client_name: b.clientName,
    client_email: b.clientEmail,
    client_address: b.clientAddress,
    lines: b.lines,
    vat_basis: b.vatBasis,
    vat_rate: b.vatRate,
    notes: b.notes,
    ...(b.issuedOn ? { issued_on: b.issuedOn } : {}),
    ...(b.dueOn ? { due_on: b.dueOn } : {}),
  };
}

r.get(A, async (c) => {
  const rows = must(await db.from("invoices").select("*").order("issued_on", { ascending: false }).order("number", { ascending: false })) || [];
  return c.json({ invoices: rows.map(toApi) });
});

r.get(`${A}/:id`, async (c) => {
  const row = found(await db.from("invoices").select("*").eq("id", c.req.param("id")).maybeSingle(), "Factuur niet gevonden");
  return c.json({ invoice: toApi(row), business: await business() });
});

r.post(A, async (c) => {
  const b = await readBody(c, invoiceSchema);
  const row = must(await db.from("invoices").insert({ ...toRow(b), number: await nextDocumentNumber("FA") }).select("*").single());
  return c.json({ invoice: toApi(row) });
});

// One-off lines become invoice lines as they are; monthly lines are billed
// for the first month.
r.post(`${A}/from-quote/:quoteId`, async (c) => {
  const quote = rowToQuote(found(await db.from("quotes").select("*").eq("id", c.req.param("quoteId")).maybeSingle(), "Prijsopgave niet gevonden"));
  const lines = [
    ...quoteLines(quote.oneTime).map((l) => ({ label: l.label, quantity: 1, amount: l.amount, note: l.note })),
    ...quoteLines(quote.monthly).map((l) => ({ label: `${l.label} (eerste maand)`, quantity: 1, amount: l.amount, note: l.note })),
  ];
  if (lines.length === 0) fail(400, "Deze prijsopgave heeft geen bedragen.");
  const row = must(await db.from("invoices").insert({
    number: await nextDocumentNumber("FA"),
    quote_id: quote.id,
    project_id: quote.projectId || null,
    client_id: quote.clientId || null,
    client_name: quote.clientName,
    client_email: quote.clientEmail,
    lines,
    vat_basis: quote.vatBasis,
    vat_rate: quote.vatRate,
    notes: `Volgens prijsopgave ${quote.number}.`,
  }).select("*").single());
  return c.json({ invoice: toApi(row) });
});

r.put(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  const existing = found(await db.from("invoices").select("*").eq("id", id).maybeSingle(), "Factuur niet gevonden") as any;
  if (existing.status !== "draft") fail(409, "Een verstuurde factuur pas je niet meer aan. Maak een creditfactuur of zet hem terug naar concept.");
  const b = await readBody(c, invoiceSchema);
  const row = must(await db.from("invoices").update(toRow(b)).eq("id", id).select("*").single());
  return c.json({ invoice: toApi(row) });
});

// Status by hand: back to draft (to correct it), paid/unpaid, or void.
r.post(`${A}/:id/status`, async (c) => {
  const id = c.req.param("id");
  const { status } = await readBody(c, z.object({ status: z.enum(["draft", "sent", "paid", "void"]) }));
  const existing = found(await db.from("invoices").select("*").eq("id", id).maybeSingle(), "Factuur niet gevonden") as any;
  const patch: Record<string, unknown> = { status };
  if (status === "paid") patch.paid_at = existing.paid_at || new Date().toISOString();
  else patch.paid_at = null;
  if (status === "sent" && !existing.sent_at) patch.sent_at = new Date().toISOString();
  const row = must(await db.from("invoices").update(patch).eq("id", id).select("*").single());
  return c.json({ invoice: toApi(row) });
});

r.delete(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  const existing = found(await db.from("invoices").select("status").eq("id", id).maybeSingle(), "Factuur niet gevonden") as any;
  if (existing.status !== "draft") fail(409, "Alleen een concept kan weg. Zet een verstuurde factuur op 'vervallen'.");
  must(await db.from("invoices").delete().eq("id", id));
  return c.json({ success: true });
});

function invoiceEmail(inv: any, message: string, reminder: boolean): string {
  const t = invoiceTotals(inv);
  const due = new Date(inv.due_on).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const greeting = inv.client_name ? `Hallo ${escapeHtml(String(inv.client_name).split(" ")[0])},` : "Hallo,";
  const intro = reminder
    ? `volgens onze administratie staat factuur ${escapeHtml(inv.number)} nog open. Zou je die willen voldoen? Heb je al betaald, dan kun je dit bericht negeren.`
    : `hierbij ontvang je factuur ${escapeHtml(inv.number)}. Je kunt hem bekijken en downloaden via de knop hieronder.`;
  return emailWrap(`
    <tr><td style="padding:32px 36px 0;">
      <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${reminder ? "Herinnering" : "Factuur"} &middot; ${escapeHtml(inv.number)}</span>
      <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
      <span style="display:block;color:#fffbe0;font-size:28px;font-weight:800;letter-spacing:-0.02em;">${euro(t.total)}</span>
      <span style="display:block;color:rgba(255,251,224,0.4);font-size:12px;margin-top:4px;">Te betalen voor ${escapeHtml(due)}</span>
    </td></tr>
    <tr><td style="padding:22px 36px 0;">
      <span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">${greeting} ${intro}${message ? ` ${escapeHtml(message)}` : ""}</span>
    </td></tr>
    <tr><td style="padding:26px 36px 40px;">
      <a href="${invoiceLink(inv)}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">Bekijk factuur</a>
    </td></tr>
    <tr><td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);">
      <span style="color:rgba(255,251,224,0.2);font-size:11px;">Werkt de knop niet? Open dan deze link: ${invoiceLink(inv)}<br />Vragen over deze factuur? Antwoord gerust op deze mail.</span>
    </td></tr>`);
}

r.post(`${A}/:id/send`, async (c) => {
  const id = c.req.param("id");
  const inv = found(await db.from("invoices").select("*").eq("id", id).maybeSingle(), "Factuur niet gevonden") as any;
  if (inv.status === "void") fail(409, "Deze factuur is vervallen.");
  const b = await readBody(c, z.object({ email: z.string().optional(), message: text(2000).default("") }));
  const to = String(b.email || inv.client_email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(to)) fail(400, "Vul een geldig e-mailadres in om naar te versturen.");
  const sent = await sendEmail({ to, subject: `Factuur ${inv.number} — PhotoDeCaffeine`, replyTo: EMAIL_ADMIN_NOTIFY, html: invoiceEmail(inv, b.message, false) });
  if (!sent.ok) fail(502, sent.error || "De factuur kon niet verstuurd worden.");
  const row = must(await db.from("invoices").update({
    client_email: to,
    status: inv.status === "paid" ? "paid" : "sent",
    sent_at: new Date().toISOString(),
  }).eq("id", id).select("*").single());
  return c.json({ invoice: toApi(row) });
});

r.post(`${A}/:id/remind`, async (c) => {
  const id = c.req.param("id");
  const inv = found(await db.from("invoices").select("*").eq("id", id).maybeSingle(), "Factuur niet gevonden") as any;
  if (inv.status !== "sent") fail(409, "Alleen een verstuurde, onbetaalde factuur krijgt een herinnering.");
  if (!EMAIL_RE.test(inv.client_email)) fail(400, "Deze factuur heeft geen geldig e-mailadres.");
  const b = await readBody(c, z.object({ message: text(2000).default("") }));
  const sent = await sendEmail({ to: inv.client_email, subject: `Herinnering: factuur ${inv.number}`, replyTo: EMAIL_ADMIN_NOTIFY, html: invoiceEmail(inv, b.message, true) });
  if (!sent.ok) fail(502, sent.error || "De herinnering kon niet verstuurd worden.");
  const row = must(await db.from("invoices").update({ reminded_at: new Date().toISOString() }).eq("id", id).select("*").single());
  return c.json({ invoice: toApi(row) });
});

// ---------------------------------------------------------------------------
// Public copy, by token
// ---------------------------------------------------------------------------

r.get("/make-server-0951c59e/invoice/:id", async (c) => {
  const row = must(await db.from("invoices").select("*").eq("id", c.req.param("id")).maybeSingle()) as any;
  const token = c.req.query("t") || "";
  if (!row || !token || token !== row.token || row.status === "draft") fail(404, "Deze factuur bestaat niet (meer).");
  const { quoteId: _q, projectId: _p, clientId: _c, link: _l, ...pub } = toApi(row);
  return c.json({ invoice: pub, business: await business() });
});
