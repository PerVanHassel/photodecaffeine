import { SITE_URL } from "./config.ts";
import { emailWrap, escapeHtml, glassImageCard } from "./email.ts";

// The emails a project sends. Kept verbatim from the original templates; the
// callers pass plain values and everything user-written is escaped here.

export function clientMessageToStudioEmail(newMessage: { senderName: string; content: string }, project: { title: string }, projectId: string): string {
  return emailWrap(`        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Klant Reactie</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(newMessage.senderName)}</span>
            <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(project.title)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${escapeHtml(newMessage.content).replace(/\n/g, "<br>")}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 36px;">
            <a href="${SITE_URL}/admin/project/${projectId}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Open in admin</a>
          </td>
        </tr>
      `);
}

export function studioMessageToClientEmail(newMessage: { content: string }, project: { title: string }, projectId: string): string {
  return emailWrap(`            <tr>
              <td style="padding:32px 36px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:30px;height:30px;background-color:rgba(200,144,90,0.15);border:1px solid rgba(200,144,90,0.3);text-align:center;vertical-align:middle;">
                    <span style="color:#c8905a;font-size:11px;font-weight:800;">P</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="display:block;color:#c8905a;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">PDC Studio</span>
                    <span style="display:block;color:rgba(255,251,224,0.3);font-size:11px;">over ${escapeHtml(project.title)}</span>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,144,90,0.06);border:1px solid rgba(200,144,90,0.12);">
                  <tr><td style="padding:18px 20px;color:rgba(255,251,224,0.75);font-size:14px;line-height:1.7;">${escapeHtml(newMessage.content).replace(/\n/g, "<br>")}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 36px 36px;">
                <a href="${SITE_URL}/portal/project/${projectId}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk &amp; reageer</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Reageren kan direct in je projectportaal.</span></td>
            </tr>
          `);
}

export function galleryGrewEmail(o: { firstName: string; galleryTitle: string; coverUrl?: string; accent: string; galleryLink: string; added: number; total: number }): string {
  const { firstName, galleryTitle, coverUrl, accent, galleryLink, added } = o;
  const photoWord = added === 1 ? "foto" : "foto's";
  const updated = { galleryUrls: { length: o.total } };
  return emailWrap(`              ${glassImageCard({
                imageUrl: coverUrl,
                eyebrow: "Galerij Bijgewerkt",
                title: galleryTitle,
                subtitle: `${added} nieuwe ${photoWord} toegevoegd &middot; ${updated.galleryUrls.length} in totaal`,
                accentColor: accent,
                linkUrl: galleryLink,
              })}
              <tr>
                <td style="padding:32px 36px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Hi ${firstName}, we hebben ${added} nieuwe ${photoWord} aan je galerij toegevoegd. Bekijk en download ze via de link hieronder.</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 40px;text-align:center;">
                  <a href="${galleryLink}" style="display:inline-block;background-color:${accent};color:#0a1413;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">Bekijk je galerij</a>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Je hebt deze mail ontvangen omdat je een actief project hebt bij PhotoDeCaffeine.</span></td>
              </tr>
            `);
}

export function deliveredEmail(o: { firstName: string; title: string; coverUrl?: string; galleryLink: string }): string {
  const { firstName, coverUrl, galleryLink } = o;
  const updated = { title: o.title };
  return emailWrap(`              ${glassImageCard({
                imageUrl: coverUrl,
                eyebrow: "Project Afgerond",
                title: escapeHtml(updated.title),
                accentColor: "#c8905a",
                linkUrl: galleryLink,
                topSpace: 150,
              })}
              <tr>
                <td style="padding:32px 36px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Hi ${firstName}, je volledige galerij staat klaar. Alle foto's zijn bewerkt en in hoge resolutie beschikbaar om te bekijken en downloaden.</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 44px;text-align:center;">
                  <a href="${galleryLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:14px 32px;">Bekijk &amp; download</a>
                  <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
                  <span style="color:rgba(255,251,224,0.3);font-size:11px;">Bedankt voor het vertrouwen &mdash; we horen graag hoe de shoot is bevallen.</span>
                </td>
              </tr>
            `);
}

export function meetingEmail(o: { title: string; date: string; location?: string; projectLink: string }): string {
  const { projectLink } = o;
  const updated = { title: o.title, meeting: { location: o.location || "" } };
  const meetingDate = new Date(o.date).toLocaleString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
  });
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Meeting Ingepland</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(updated.title)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 36px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border:1px solid rgba(255,251,224,0.06);">
                    <tr>
                      <td style="padding:20px 22px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="padding-bottom:14px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Wanneer</td></tr>
                          <tr><td style="padding-bottom:${updated.meeting.location ? "16px" : "0"};color:#fffbe0;font-size:15px;font-weight:600;">${meetingDate}</td></tr>
                          ${updated.meeting.location ? `<tr><td style="padding-bottom:8px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Locatie</td></tr><tr><td style="color:rgba(255,251,224,0.7);font-size:13px;">${escapeHtml(updated.meeting.location)}</td></tr>` : ""}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 36px 36px;">
                  <a href="${projectLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk projectdetails</a>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Kun je niet? Stuur even een berichtje via het portaal.</span></td>
              </tr>
            `);
}
