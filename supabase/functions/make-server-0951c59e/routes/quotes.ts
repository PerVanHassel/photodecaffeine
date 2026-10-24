import { Hono, type MiddlewareHandler } from "npm:hono";
import { hasPermission } from "../lib/auth.ts";
import { business } from "../lib/business.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, SITE_URL } from "../lib/config.ts";
import { db, found, must, nextDocumentNumber } from "../lib/db.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { type Env, fail, nameOf, requireAdmin } from "../lib/http.ts";
import { notify } from "../lib/notify.ts";

const r = new Hono<Env>();
export default r;

// ---------------------------------------------------------------------------
// An offer is a small document: a couple of monthly lines, a couple of one-off
// lines, what is included, and the terms underneath. The same shape covers a
// photo shoot (only one-off lines) and a website (monthly + one-off), so there
// is one editor and one email template rather than two of each.
//
// It goes out by email and carries a link to a public page. That link is the
// only way in — quotes go to people who often do not have a portal account —
// so every quote gets a random token and the public routes check it.
//
// Everything beyond the lines (payment schedule, planning, revisions, who owns
// the website, the licence on photos) sits in `details`, built in the admin's
// quote builder. src/app/components/quote/model.ts describes its shape.
// ============================================================================

export interface QuoteLine {
  label: string;
  /** The line total, on the quote's VAT basis. With qty and price it is qty × price. */
  amount: number;
  note: string;
  qty?: number;
  unit?: string;
  price?: number;
  /** Not in the total: the client may pick it when accepting. */
  optional?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteLines(raw: any): QuoteLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l: any) => {
      const qty = Number(l?.qty);
      const price = l?.price === "" || l?.price == null ? NaN : Number(l.price);
      const perUnit = qty > 0 && Number.isFinite(price);
      const line: QuoteLine = {
        label: String(l?.label ?? "").trim(),
        amount: round2(perUnit ? qty * price : Number(l?.amount) || 0),
        note: String(l?.note ?? "").trim(),
      };
      if (perUnit) {
        line.qty = round2(qty);
        line.price = round2(price);
        const unit = String(l?.unit ?? "").trim().slice(0, 30);
        if (unit) line.unit = unit;
      }
      if (l?.optional === true) line.optional = true;
      return line;
    })
    .filter((l) => l.label !== "")
    .slice(0, 30);
}

/**
 * The options a client picked, as "o2" (third one-off line) or "m0" (first
 * monthly line). Only lines that are actually optional count.
 */
export function chosenOptions(quote: { oneTime: any; monthly: any; details?: any }): Set<string> {
  const picked = new Set<string>(Array.isArray(quote.details?.accepted?.options) ? quote.details.accepted.options : []);
  const out = new Set<string>();
  quoteLines(quote.oneTime).forEach((l, i) => { if (l.optional && picked.has(`o${i}`)) out.add(`o${i}`); });
  quoteLines(quote.monthly).forEach((l, i) => { if (l.optional && picked.has(`m${i}`)) out.add(`m${i}`); });
  return out;
}

/** The lines that count: everything that is not optional, plus the options the client picked. */
export function linesThatCount(lines: QuoteLine[], prefix: "o" | "m", chosen?: Set<string>): QuoteLine[] {
  return lines
    .filter((l, i) => !l.optional || chosen?.has(`${prefix}${i}`))
    .map(({ optional: _o, ...l }) => l);
}

// The details are free-form JSON from the builder. They are cleaned rather
// than checked field by field: plain values only, bounded in size, and the
// client's own answer (`accepted`) is never taken from the admin.
function cleanJson(v: unknown, depth: number): unknown {
  if (depth > 5) return undefined;
  if (typeof v === "string") return v.trim().slice(0, 4000);
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean" || v === null) return v;
  if (Array.isArray(v)) return v.slice(0, 40).map((x) => cleanJson(x, depth + 1)).filter((x) => x !== undefined);
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 60)) {
      if (!/^[a-zA-Z][a-zA-Z0-9]{0,30}$/.test(k)) continue;
      const cleaned = cleanJson(x, depth + 1);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return undefined;
}

export function quoteDetails(raw: any): Record<string, any> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const d = cleanJson(raw, 0) as Record<string, any>;
  delete d.accepted;
  if (JSON.stringify(d).length > 60000) fail(400, "Deze prijsopgave is te lang geworden.");
  return d;
}

/** What the client may see of the details: the internal open points stay behind. */
export function publicDetails(d: any): Record<string, any> {
  const { openPoints: _open, ...rest } = d && typeof d === "object" ? d : {};
  return rest;
}

export function quoteTexts(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s: any) => String(s ?? "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function quoteTerms(raw: any): { label: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: any) => ({
      label: String(t?.label ?? "").trim(),
      text: String(t?.text ?? "").trim(),
    }))
    .filter((t) => t.label !== "" || t.text !== "")
    .slice(0, 20);
}

/** The total of a list, without the optional lines. */
export function quoteSum(lines: QuoteLine[]): number {
  return round2(lines.filter((l) => !l.optional).reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
}

/** €45 / €1.234,50 — no cents when the amount is round, the way a price reads. */
export function euro(amount: number): string {
  const n = Number(amount) || 0;
  const decimals = Math.round(n * 100) % 100 === 0 ? 0 : 2;
  return `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "replaced"];

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  sent: "Verstuurd",
  accepted: "Geaccepteerd",
  declined: "Afgewezen",
  replaced: "Vervangen",
};

/** OF-2026-004 — sequential within the year the quote is made. */

export function quoteFields(body: any) {
  // Een offerte aan een bedrijf schrijf je normaal exclusief btw, aan een
  // particulier inclusief. Het bedrag in de regel blijft precies wat er is
  // ingevuld; dit zegt alleen aan welke kant het staat, zodat de pagina de
  // andere kant kan uitrekenen.
  const rawRate = Number(body.vatRate);
  return {
    type: body.type === "photo" ? "photo" : "web",
    vatBasis: body.vatBasis === "incl" ? "incl" : "excl",
    vatRate: Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 100 ? Math.round(rawRate * 100) / 100 : 21,
    title: String(body.title ?? "").trim(),
    subtitle: String(body.subtitle ?? "").trim(),
    clientId: String(body.clientId ?? "").trim(),
    clientName: String(body.clientName ?? "").trim(),
    clientEmail: String(body.clientEmail ?? "").trim().toLowerCase(),
    intro: String(body.intro ?? "").trim(),
    monthly: quoteLines(body.monthly),
    oneTime: quoteLines(body.oneTime),
    included: quoteTexts(body.included),
    terms: quoteTerms(body.terms),
    notes: String(body.notes ?? "").trim(),
    validUntil: String(body.validUntil ?? "").trim(),
    details: quoteDetails(body.details),
  };
}

/** The public shape — the token and the internal bookkeeping stay behind. */
export function publicQuote(quote: any) {
  const monthly = quoteLines(quote.monthly);
  const oneTime = quoteLines(quote.oneTime);
  const chosen = chosenOptions(quote);
  return {
    id: quote.id,
    number: quote.number || "",
    type: quote.type || "web",
    title: quote.title || "",
    subtitle: quote.subtitle || "",
    clientName: quote.clientName || "",
    intro: quote.intro || "",
    monthly,
    oneTime,
    included: quoteTexts(quote.included),
    terms: quoteTerms(quote.terms),
    notes: quote.notes || "",
    validUntil: quote.validUntil || "",
    vatBasis: quote.vatBasis === "incl" ? "incl" : "excl",
    vatRate: typeof quote.vatRate === "number" ? quote.vatRate : 21,
    status: quote.status || "draft",
    sentAt: quote.sentAt || "",
    respondedAt: quote.respondedAt || "",
    details: publicDetails(quote.details),
    totals: {
      monthly: quoteSum(monthly),
      oneTime: quoteSum(oneTime),
      // With the options the client picked; the same as above until then.
      chosenMonthly: quoteSum(linesThatCount(monthly, "m", chosen)),
      chosenOneTime: quoteSum(linesThatCount(oneTime, "o", chosen)),
    },
  };
}

export function quoteLink(quote: any): string {
  return `${SITE_URL}/offerte/${quote.id}?t=${quote.token}`;
}

export type PaymentStep = { label: string; percent: number; moment: string };

/** The payment schedule from the builder, or nothing when it does not add up to 100%. */
export function paymentSteps(details: any): PaymentStep[] {
  const raw = Array.isArray(details?.payment?.steps) ? details.payment.steps : [];
  const steps = raw
    .map((s: any) => ({ label: String(s?.label ?? "").trim(), percent: round2(Number(s?.percent) || 0), moment: String(s?.moment ?? "").trim() }))
    .filter((s: PaymentStep) => s.percent > 0);
  return Math.abs(steps.reduce((sum: number, s: PaymentStep) => sum + s.percent, 0) - 100) < 0.01 ? steps : [];
}

export function quoteDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// --- The offer, as email rows ---
// Mail clients drop flexbox and most modern CSS, so the whole thing is nested
// tables with inline styles, matching the other emails in this file.
export function quoteEmailRows(quote: any, message: string): string {
  const monthly = quoteLines(quote.monthly);
  const oneTime = quoteLines(quote.oneTime);
  const included = quoteTexts(quote.included);
  const terms = quoteTerms(quote.terms);
  const steps = paymentSteps(quote.details);
  const link = quoteLink(quote);

  const muted = "rgba(255,251,224,0.55)";
  const faint = "rgba(255,251,224,0.28)";
  const cardStyle =
    "background-color:rgba(255,251,224,0.03);border:1px solid rgba(255,251,224,0.08);";

  const lineRow = (l: QuoteLine) => {
    const sub = [l.qty ? `${l.qty}${l.unit ? ` ${l.unit}` : ""} × ${euro(l.price ?? 0)}` : "", l.note].filter(Boolean).join(" · ");
    return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.05);">
        <span style="color:#fffbe0;font-size:14px;">${escapeHtml(l.label)}</span>${l.optional ? `<span style="color:#c8905a;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">&nbsp;&nbsp;Optie</span>` : ""}
        ${sub ? `<br /><span style="color:${faint};font-size:11.5px;">${escapeHtml(sub)}</span>` : ""}
      </td>
      <td align="right" valign="top" style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.05);white-space:nowrap;">
        <span style="color:${l.optional ? muted : "#fffbe0"};font-size:14px;font-weight:600;">${l.optional ? "+ " : ""}${euro(l.amount)}</span>
      </td>
    </tr>`;
  };

  const block = (label: string, lines: QuoteLine[], baseLabel: string, perMonth: boolean) => {
    if (lines.length === 0) return "";
    const total = quoteSum(lines);
    const totalLabel = lines.some((l) => l.optional) ? `${baseLabel}, zonder opties` : baseLabel;
    return `
    <tr>
      <td style="padding:0 36px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${cardStyle}">
          <tr>
            <td style="padding:20px 20px 4px;">
              <span style="color:${faint};font-size:9px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${escapeHtml(label)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines.map(lineRow).join("")}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,144,90,0.08);">
                <tr>
                  <td style="padding:14px 16px;">
                    <span style="color:${muted};font-size:12px;">${escapeHtml(totalLabel)}</span>
                  </td>
                  <td align="right" style="padding:14px 16px;white-space:nowrap;">
                    <span style="color:#c8905a;font-size:24px;font-weight:800;letter-spacing:-0.02em;">${euro(total)}</span>
                    ${perMonth ? `<span style="color:${faint};font-size:12px;"> p/m</span>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  };

  const includedBlock =
    included.length === 0
      ? ""
      : `
    <tr>
      <td style="padding:6px 36px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(120,190,140,0.07);border:1px solid rgba(120,190,140,0.2);">
          <tr>
            <td style="padding:20px 20px 12px;">
              <span style="color:rgba(120,190,140,0.95);font-size:13px;font-weight:700;">&#10003;&nbsp;&nbsp;Wat is inbegrepen</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${included
                  .map(
                    (item) => `
                <tr>
                  <td valign="top" width="18" style="padding:5px 0;">
                    <span style="color:rgba(120,190,140,0.7);font-size:13px;">&bull;</span>
                  </td>
                  <td style="padding:5px 0;">
                    <span style="color:rgba(120,190,140,0.95);font-size:13.5px;line-height:1.6;">${escapeHtml(item)}</span>
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const termsBlock =
    terms.length === 0
      ? ""
      : `
    <tr>
      <td style="padding:10px 36px 0;border-top:1px solid rgba(255,251,224,0.06);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${terms
            .map(
              (t) => `
          <tr>
            <td style="padding:9px 0;">
              <span style="color:#fffbe0;font-size:13px;font-weight:700;">${escapeHtml(t.label)}${t.label ? ":" : ""}</span>
              <span style="color:${muted};font-size:13px;line-height:1.7;"> ${escapeHtml(t.text)}</span>
            </td>
          </tr>`
            )
            .join("")}
        </table>
      </td>
    </tr>`;

  const greeting = quote.clientName
    ? `Hallo ${escapeHtml(String(quote.clientName).split(" ")[0])},`
    : "Hallo,";

  return `
    <tr>
      <td style="padding:32px 36px 0;">
        <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Prijsopgave${quote.number ? ` &middot; ${escapeHtml(quote.number)}` : ""}</span>
        <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
        <span style="display:block;color:#fffbe0;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">${escapeHtml(quote.title || "Prijsopgave")}</span>
        ${quote.subtitle ? `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div><span style="color:${muted};font-size:14px;font-weight:300;">${escapeHtml(quote.subtitle)}</span>` : ""}
      </td>
    </tr>
    <tr>
      <td style="padding:22px 36px 20px;">
        <span style="color:${muted};font-size:14px;font-weight:300;line-height:1.75;">${greeting}${message ? ` ${escapeHtml(message)}` : ""}</span>
        ${quote.intro ? `<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div><span style="color:${muted};font-size:14px;font-weight:300;line-height:1.75;">${escapeHtml(quote.intro)}</span>` : ""}
      </td>
    </tr>
    ${block("Maandelijks", monthly, "Totaal per maand", true)}
    ${block("Eenmalig", oneTime, "Totaal eenmalig", false)}
    ${
      monthly.length > 0 || oneTime.length > 0
        ? `<tr><td style="padding:10px 36px 0;"><span style="color:${faint};font-size:12px;">Alle bedragen zijn ${quote.vatBasis === "incl" ? "inclusief" : "exclusief"} ${Number(quote.vatRate ?? 21)}% btw. Op de offertepagina kun je wisselen tussen beide weergaves.</span></td></tr>`
        : ""
    }
    ${
      steps.length > 0
        ? `<tr><td style="padding:10px 36px 0;"><span style="color:${muted};font-size:13px;line-height:1.7;"><strong style="color:#fffbe0;">Betaling:</strong> ${escapeHtml(steps.map((s) => `${s.percent}% ${s.moment || s.label}`.trim()).join(", "))}.</span></td></tr>`
        : ""
    }
    ${includedBlock}
    ${termsBlock}
    ${
      quote.notes
        ? `<tr><td style="padding:14px 36px 0;"><span style="color:${muted};font-size:13px;line-height:1.75;">${escapeHtml(quote.notes)}</span></td></tr>`
        : ""
    }
    ${
      quote.validUntil
        ? `<tr><td style="padding:14px 36px 0;"><span style="color:${faint};font-size:12px;">Deze prijsopgave is geldig tot ${escapeHtml(quoteDate(quote.validUntil))}.</span></td></tr>`
        : ""
    }
    <tr>
      <td style="padding:26px 36px 40px;">
        <a href="${link}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">Bekijk en reageer</a>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);">
        <span style="color:rgba(255,251,224,0.2);font-size:11px;">Werkt de knop niet? Open dan deze link: ${link}<br />Vragen of iets aanpassen? Antwoord gerust op deze mail.</span>
      </td>
    </tr>`;
}


// ---------------------------------------------------------------------------
// Rows <-> the quote object the helpers above were written for
// ---------------------------------------------------------------------------

export function rowToQuote(q: any) {
  return {
    id: q.id,
    number: q.number,
    type: q.type,
    status: q.status,
    title: q.title,
    subtitle: q.subtitle,
    intro: q.intro,
    notes: q.notes,
    clientId: q.client_id || "",
    clientName: q.client_name,
    clientEmail: q.client_email,
    projectId: q.project_id || "",
    monthly: q.monthly,
    oneTime: q.one_time,
    included: q.included,
    terms: q.terms,
    vatBasis: q.vat_basis,
    vatRate: Number(q.vat_rate),
    validUntil: q.valid_until || "",
    token: q.token,
    sentAt: q.sent_at || "",
    sendCount: q.send_count,
    viewedAt: q.viewed_at || "",
    viewCount: q.view_count,
    respondedAt: q.responded_at || "",
    response: q.response || "",
    details: q.details && typeof q.details === "object" ? q.details : {},
    createdBy: q.created_by,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };
}

function fieldsToRow(f: ReturnType<typeof quoteFields>) {
  return {
    type: f.type,
    vat_basis: f.vatBasis,
    vat_rate: f.vatRate,
    title: f.title,
    subtitle: f.subtitle,
    client_id: f.clientId || null,
    client_name: f.clientName,
    client_email: f.clientEmail,
    intro: f.intro,
    monthly: f.monthly,
    one_time: f.oneTime,
    included: f.included,
    terms: f.terms,
    notes: f.notes,
    valid_until: f.validUntil || null,
    details: f.details,
  };
}

/** The admin shape: the public view plus the bookkeeping. */
function adminQuote(q: ReturnType<typeof rowToQuote>) {
  return {
    ...publicQuote(q),
    // The admin sees the open points the client does not.
    details: q.details,
    clientId: q.clientId,
    clientEmail: q.clientEmail,
    projectId: q.projectId,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    response: q.response,
    viewedAt: q.viewedAt,
    viewCount: q.viewCount,
    sendCount: q.sendCount,
    link: quoteLink(q),
  };
}

async function loadQuote(id: string) {
  return rowToQuote(found(await db.from("quotes").select("*").eq("id", id).maybeSingle(), "Prijsopgave niet gevonden"));
}

const A = "/make-server-0951c59e/admin/quotes";
const canManageQuotes: MiddlewareHandler<Env> = async (c, next) => {
  if (!(await hasPermission(c.get("user"), "manageQuotes"))) {
    return c.json({ error: "Je hebt geen rechten voor prijsopgaves." }, 403);
  }
  await next();
};
r.use(A, requireAdmin, canManageQuotes);
r.use(`${A}/*`, requireAdmin, canManageQuotes);

// A client id or project id that does not exist is dropped, not stored.
async function checkedLinks(body: any): Promise<{ clientId: string; projectId: string | null }> {
  const isId = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
  const client = isId(body.clientId) ? must(await db.from("clients").select("id").eq("id", body.clientId).maybeSingle()) as any : null;
  const project = isId(body.projectId) ? must(await db.from("projects").select("id").eq("id", body.projectId).maybeSingle()) as any : null;
  return { clientId: client?.id || "", projectId: project?.id || null };
}

r.get(A, async (c) => {
  const [rows, biz] = await Promise.all([db.from("quotes").select("*").order("created_at", { ascending: false }), business()]);
  // The builder prints the studio's details on the quote and checks them.
  return c.json({ quotes: (must(rows) || []).map((q: any) => adminQuote(rowToQuote(q))), business: biz });
});

r.post(A, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const links = await checkedLinks(body);
  const fields = quoteFields({ ...body, clientId: links.clientId });
  if (!fields.title) fail(400, "Vul een titel in.");
  if (fields.monthly.length === 0 && fields.oneTime.length === 0) fail(400, "Zet er minstens één bedrag in.");
  const admin = c.get("user");
  const row = must(await db.from("quotes").insert({
    ...fieldsToRow(fields),
    number: await nextDocumentNumber("OF"),
    project_id: links.projectId,
    status: "draft",
    created_by: { id: admin.id, name: nameOf(admin) },
  }).select("*").single());
  if (links.projectId) await db.from("projects").update({ stage: "quote" }).eq("id", links.projectId).eq("stage", "lead");
  return c.json({ quote: adminQuote(rowToQuote(row)) });
});

r.put(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  const existing = await loadQuote(id);
  const body = await c.req.json().catch(() => ({}));
  const links = await checkedLinks({ clientId: existing.clientId, projectId: existing.projectId, ...body });
  const fields = quoteFields({ ...existing, ...body, clientId: links.clientId });
  if (!fields.title) fail(400, "Vul een titel in.");
  // The options the client picked are theirs; saving the quote keeps them.
  if (existing.details?.accepted) fields.details.accepted = existing.details.accepted;
  // The status is set by sending and by the client's answer; an admin may
  // only put it back to a concept or mark it by hand from the list.
  const status = typeof body.status === "string" && QUOTE_STATUSES.includes(body.status) ? body.status : existing.status;
  const row = must(await db.from("quotes").update({ ...fieldsToRow(fields), project_id: links.projectId, status }).eq("id", id).select("*").single());
  if (status === "accepted" && existing.status !== "accepted") await onAccepted(rowToQuote(row));
  return c.json({ quote: adminQuote(rowToQuote(row)) });
});

r.delete(`${A}/:id`, async (c) => {
  must(await db.from("quotes").delete().eq("id", c.req.param("id")));
  return c.json({ success: true });
});

r.post(`${A}/:id/send`, async (c) => {
  const id = c.req.param("id");
  const quote = await loadQuote(id);
  const body = await c.req.json().catch(() => ({}));
  const to = String(body.email || quote.clientEmail || "").trim().toLowerCase();
  if (!EMAIL_RE.test(to)) fail(400, "Vul een geldig e-mailadres in om naar te versturen.");
  const message = String(body.message || "").trim();

  // This email IS the request, so a failure has to come back as a failure.
  const sent = await sendEmail({
    to,
    subject: `Prijsopgave — ${quote.title || "PhotoDeCaffeine"}`,
    replyTo: EMAIL_ADMIN_NOTIFY,
    html: emailWrap(quoteEmailRows(quote, message)),
  });
  if (!sent.ok) fail(502, sent.error || "De prijsopgave kon niet verstuurd worden.");

  const row = must(await db.from("quotes").update({
    client_email: to,
    // An answer already given stays standing; re-sending does not undo it.
    status: ["accepted", "declined", "replaced"].includes(quote.status) ? quote.status : "sent",
    sent_at: new Date().toISOString(),
    send_count: (Number(quote.sendCount) || 0) + 1,
  }).eq("id", id).select("*").single());
  if (quote.projectId) await db.from("projects").update({ stage: "quote" }).eq("id", quote.projectId).eq("stage", "lead");
  // The quote this one replaces can no longer be accepted, unless it already was.
  const replaces = String(quote.details?.replaces?.id || "");
  if (/^[0-9a-f-]{36}$/.test(replaces) && replaces !== id) {
    await db.from("quotes").update({ status: "replaced" }).eq("id", replaces).in("status", ["draft", "sent", "declined"]);
  }
  return c.json({ success: true, quote: adminQuote(rowToQuote(row)) });
});

/**
 * An accepted quote books the work: the linked project moves to "booked"
 * (one is made if there is none), and a task to plan the shoot appears.
 */
async function onAccepted(quote: ReturnType<typeof rowToQuote>) {
  let projectId = quote.projectId;
  if (!projectId && quote.clientId) {
    const created = must(await db.from("projects").insert({
      title: quote.title,
      type: quote.type === "web" ? "web" : "photo",
      stage: "booked",
      status: "in_progress",
      value_cents: Math.round((quoteSum(linesThatCount(quoteLines(quote.oneTime), "o", chosenOptions(quote))) || 0) * 100),
    }).select("id").single()) as any;
    projectId = created.id;
    must(await db.from("project_clients").insert({ project_id: projectId, client_id: quote.clientId, position: 0 }));
    must(await db.from("quotes").update({ project_id: projectId }).eq("id", quote.id));
  } else if (projectId) {
    await db.from("projects").update({ stage: "booked", status: "in_progress" }).eq("id", projectId).in("stage", ["lead", "quote"]);
  }
  must(await db.from("tasks").insert({
    title: `${quote.type === "web" ? "Start het project" : "Plan de shoot"}: ${quote.title}`,
    notes: `Prijsopgave ${quote.number} is geaccepteerd.`,
    kind: "quote",
    project_id: projectId || null,
    client_id: quote.clientId || null,
    due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
  }));
}

// --- the client's own copy, no login ---
r.get("/make-server-0951c59e/quote/:id", async (c) => {
  const row = must(await db.from("quotes").select("*").eq("id", c.req.param("id")).maybeSingle()) as any;
  if (!row) fail(404, "Deze prijsopgave bestaat niet (meer).");
  const token = c.req.query("t") || "";
  if (!token || token !== row.token) fail(403, "Deze link klopt niet.");
  if (row.status === "draft") fail(404, "Deze prijsopgave is nog niet verstuurd.");
  // Knowing the client opened it tells the studio when to follow up. The
  // studio previewing its own link does not count.
  if (c.req.query("preview") !== "1") {
    await db.from("quotes").update({ viewed_at: row.viewed_at || new Date().toISOString(), view_count: row.view_count + 1 }).eq("id", row.id);
  }
  // A replaced quote points the client to the one that took its place.
  let replacedBy: { number: string; link: string } | null = null;
  if (row.status === "replaced") {
    const next = must(await db.from("quotes").select("id, number, token, status").eq("details->replaces->>id", row.id).neq("status", "draft")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()) as any;
    if (next) replacedBy = { number: next.number, link: quoteLink(next) };
  }
  return c.json({ quote: { ...publicQuote(rowToQuote(row)), replacedBy }, business: await business() });
});

r.post("/make-server-0951c59e/quote/:id/respond", async (c) => {
  const id = c.req.param("id");
  const raw = must(await db.from("quotes").select("*").eq("id", id).maybeSingle()) as any;
  if (!raw) fail(404, "Deze prijsopgave bestaat niet (meer).");
  const quote = rowToQuote(raw);
  const token = c.req.query("t") || "";
  if (!token || token !== quote.token) fail(403, "Deze link klopt niet.");
  if (quote.status === "draft") fail(404, "Deze prijsopgave is nog niet verstuurd.");
  if (quote.status === "replaced") fail(409, "Deze prijsopgave is vervangen door een nieuwere. Kijk in je mail of je portaal voor de nieuwe.");

  const body = await c.req.json().catch(() => ({}));
  const answer = body.answer === "accepted" ? "accepted" : body.answer === "declined" ? "declined" : "";
  if (!answer) fail(400, "Kies akkoord of niet akkoord.");
  const response = String(body.message || "").trim().slice(0, 2000);

  // Options the client ticked, kept only when they point at an optional line.
  const picked = Array.isArray(body.options) ? body.options.filter((o: unknown) => typeof o === "string" && /^[om]\d{1,2}$/.test(o)) : [];
  const details = { ...quote.details };
  if (answer === "accepted") {
    details.accepted = { options: [...chosenOptions({ ...quote, details: { accepted: { options: picked } } })], at: new Date().toISOString() };
  }

  const row = must(await db.from("quotes").update({ status: answer, response, responded_at: new Date().toISOString(), details }).eq("id", id).select("*").single());
  const updated = rowToQuote(row);
  if (answer === "accepted" && quote.status !== "accepted") await onAccepted(updated);
  const chosen = chosenOptions(updated);
  const optionNames = [
    ...quoteLines(updated.oneTime).filter((_, i) => chosen.has(`o${i}`)),
    ...quoteLines(updated.monthly).filter((_, i) => chosen.has(`m${i}`)),
  ].map((l) => l.label);

    const who = escapeHtml(quote.clientName || quote.clientEmail || "De klant");
    const verdict = answer === "accepted" ? "gaat akkoord" : "gaat niet akkoord";
    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      subject: `Prijsopgave ${answer === "accepted" ? "geaccepteerd" : "afgewezen"} — ${quote.title || ""}`,
      replyTo: quote.clientEmail || undefined,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Reactie op prijsopgave</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${who} ${verdict}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 0;">
            <span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">${escapeHtml(quote.number || "")} &mdash; ${escapeHtml(quote.title || "")}</span>
          </td>
        </tr>
        ${
          response
            ? `<tr><td style="padding:16px 36px 0;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">&ldquo;${escapeHtml(response)}&rdquo;</span></td></tr>`
            : ""
        }
        ${
          answer === "accepted" && optionNames.length > 0
            ? `<tr><td style="padding:16px 36px 0;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Gekozen opties: ${escapeHtml(optionNames.join(", "))}</span></td></tr>`
            : ""
        }
        <tr>
          <td style="padding:26px 36px 40px;">
            <a href="${SITE_URL}/admin/quotes" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">Open in het adminpaneel</a>
          </td>
        </tr>
      `),
    });

    await notify({
      type: "quote",
      title: `${quote.clientName || quote.clientEmail || "De klant"} ${verdict}`,
      body: response || `${quote.number || ""} — ${quote.title || ""}`,
      link: "/admin/quotes",
    });

  return c.json({ quote: publicQuote(updated) });
});
