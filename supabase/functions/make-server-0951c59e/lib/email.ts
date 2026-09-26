import * as kv from "../kv_store.tsx";
import { EMAIL_FROM, SITE_URL } from "./config.ts";

// Returns whether the message actually left the building. Notification callers
// fire-and-forget it (a failed notification must never fail the request that
// triggered it), but callers whose whole purpose IS the email — the client
// invite — check the result so the admin is never told "sent" when it wasn't.
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log("sendEmail: RESEND_API_KEY not set, skipping email send");
    return { ok: false, error: "E-mailversturen is niet geconfigureerd (RESEND_API_KEY ontbreekt)." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.log("sendEmail: Resend API error", res.status, errBody);
      return { ok: false, error: `De mailprovider gaf een fout (${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.log("sendEmail: failed to send", err);
    return { ok: false, error: "De mailprovider was niet bereikbaar." };
  }
}

// Escapes values interpolated into email HTML so a stray quote or angle
// bracket in a name or address can't break out of the surrounding markup.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EMAIL_LOGO_ROW = `
  <tr>
    <td style="padding:28px 36px 24px;border-bottom:1px solid rgba(255,251,224,0.08);">
      <img src="${SITE_URL}/email-logo.png" width="150" height="60" alt="PhotoDeCaffeine Productions" style="display:block;width:150px;height:60px;" />
    </td>
  </tr>`;

// Wraps a set of <tr> rows in the shared 560px dark card + logo header that
// every outgoing email uses, inside a full HTML document that declares
// color-scheme support. The template is a FIXED dark design, not a
// light/dark-adaptive one — declaring "dark light" support previously told
// Gmail's app it was free to run its own automatic remap on the message,
// which flipped our intentionally-dark colors to light (dark bg -> cream,
// cream text -> near-black). "only light" tells clients this message does
// NOT adapt and to render it exactly as authored, which is what stops that
// remap (per Gmail/Google's own color-scheme meta documentation).
export function emailWrap(bodyRows: string): string {
  const innerTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d0703" style="max-width:560px;margin:0 auto;background-color:#0d0703;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${EMAIL_LOGO_ROW}${bodyRows}</table>`;
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="only light" />
<meta name="supported-color-schemes" content="only light" />
<style>:root { color-scheme: light; }</style>
</head>
<body bgcolor="#0d0703" style="margin:0;padding:0;background-color:#0d0703;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d0703" style="background-color:#0d0703;">
<tr><td align="center" style="padding:24px 16px;">
${innerTable}
</td></tr>
</table>
</body>
</html>`;
}

// A full-bleed photo card with a tinted "glass" panel over the bottom holding
// eyebrow/title/subtitle text, wrapped in a link. Falls back to a solid dark
// card (no photo) if imageUrl is omitted. Used for gallery-update, delivery,
// and portfolio-promo emails.
export function glassImageCard(opts: {
  imageUrl?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Optional link text rendered inside the glass panel, under the title (e.g. "Bekijk in de portfolio →"). */
  ctaText?: string;
  accentColor?: string;
  linkUrl: string;
  topSpace?: number;
}): string {
  const accent = opts.accentColor || "#c8905a";
  const top = opts.topSpace ?? 180;
  const bg = opts.imageUrl
    ? `background="${opts.imageUrl}" bgcolor="#0d0703" style="background-image:url('${opts.imageUrl}');background-size:cover;background-position:center;"`
    : `bgcolor="#0d0703" style="background-color:#0d0703;"`;
  return `
    <tr>
      <td style="padding:0;">
        <a href="${opts.linkUrl}" style="display:block;text-decoration:none;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td ${bg}>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="height:${top}px;line-height:${top}px;font-size:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="background-color:rgba(8,4,1,0.82);padding:22px 30px 26px;">
                      <span style="color:${accent};font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">${opts.eyebrow}</span>
                      <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
                      <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${opts.title}</span>
                      ${opts.subtitle ? `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div><span style="color:rgba(255,251,224,0.5);font-size:12px;">${opts.subtitle}</span>` : ""}
                      ${opts.ctaText ? `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div><span style="color:${accent};font-size:11px;font-weight:700;letter-spacing:0.08em;">${opts.ctaText}</span>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </a>
      </td>
    </tr>`;
}

// Picks a portfolio piece to feature in the visitor-confirmation email:
// published, image-covered, not an internal/system entry (category
// starting with "_", e.g. the automotive-gallery placeholder). Prefers
// featured pieces, picks randomly among the pool for variety.
export async function getPromoPortfolioArticle() {
  try {
    const allIdsStr = await kv.get("portfolio:articleIds");
    if (!allIdsStr) return null;
    const allIds = JSON.parse(allIdsStr) as string[];
    const values = await Promise.all(allIds.map((id) => kv.get(`portfolio:article:${id}`)));
    const articles = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .filter(
        (a) => a.published && a.coverType === "image" && a.coverUrl && !String(a.category || "").startsWith("_")
      );
    if (articles.length === 0) return null;
    const featured = articles.filter((a) => a.featured);
    const pool = featured.length > 0 ? featured : articles;
    return pool[Math.floor(Math.random() * pool.length)];
  } catch {
    return null;
  }
}
