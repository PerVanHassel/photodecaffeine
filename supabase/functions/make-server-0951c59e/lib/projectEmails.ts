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

/**
 * To a guest who asked to hear about new photos. No photo in here: what a guest
 * may see depends on the door they still have to pass (consent, a held back photo).
 */
export function guestNewPhotosEmail(o: { language: "nl" | "en"; name: string; title: string; added: number; link: string; offLink: string }): string {
  const first = escapeHtml(o.name.split(" ")[0]);
  const t = o.language === "en"
    ? {
      eyebrow: "New photos",
      intro: `Hi ${first}, ${o.added === 1 ? "there is 1 new photo" : `there are ${o.added} new photos`} in the gallery. You asked us to let you know.`,
      button: "View the photos",
      foot: "You get this e-mail because you turned it on in the gallery.",
      off: "Stop these e-mails",
    }
    : {
      eyebrow: "Nieuwe foto's",
      intro: `Hoi ${first}, er ${o.added === 1 ? "staat 1 nieuwe foto" : `staan ${o.added} nieuwe foto's`} in de galerij. Je vroeg of we je dat wilden laten weten.`,
      button: "Bekijk de foto's",
      foot: "Je krijgt deze mail omdat je dit in de galerij hebt aangezet.",
      off: "Geen mails meer",
    };
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${t.eyebrow}</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(o.title)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 36px 0;"><span style="color:rgba(255,251,224,0.7);font-size:14px;line-height:1.7;">${t.intro}</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 0;">
                  <a href="${o.link}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">${t.button}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px 32px;"><span style="color:rgba(255,251,224,0.45);font-size:12px;line-height:1.6;">${t.foot} <a href="${o.offLink}" style="color:rgba(255,251,224,0.7);">${t.off}</a></span></td>
              </tr>
            `);
}

/**
 * The delivery: the gallery is open, or the website is live. What it says
 * follows what the client actually gets: originals to download, photos with a
 * watermark (and maybe for sale), or a site to visit.
 */
export function deliveredEmail(o: {
  firstName: string; title: string; coverUrl?: string; galleryLink: string; until?: string;
  kind?: "photo" | "video" | "web";
  /** The client sees the photos with the watermark. */
  watermarked?: boolean;
  /** The client may download. */
  downloads?: boolean;
  /** Photos are for sale on the group link. */
  selling?: boolean;
}): string {
  const { firstName, coverUrl, galleryLink } = o;
  const kind = o.kind || "photo";
  const name = escapeHtml(firstName);
  const until = o.until ? new Date(o.until).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
  const text = kind === "web"
    ? `Hoi ${name}, je website staat live. Bekijk hem gerust nog even goed en laat het ons weten als je iets ziet.`
    : kind === "video"
      ? `Hoi ${name}, je video staat klaar.${o.downloads ? " Je kunt hem bekijken en downloaden." : " Je kunt hem bekijken in je galerij."}`
      : o.watermarked
        ? `Hoi ${name}, alle foto's staan online. Ze hebben een watermerk.${o.selling ? " Losse foto's zonder watermerk zijn te koop in de galerij, voor jou en voor iedereen met de groepslink." : ""}`
        : `Hoi ${name}, je galerij staat klaar. Alle foto's zijn bewerkt en in volle kwaliteit te bekijken${o.downloads ? " en te downloaden" : ""}.`;
  const button = kind === "web" ? "Bekijk je project" : o.downloads && !o.watermarked ? "Bekijk &amp; download" : "Bekijk de galerij";
  const eyebrow = kind === "web" ? "Website live" : kind === "video" ? "Video klaar" : "Galerij klaar";
  return emailWrap(`              ${glassImageCard({
                imageUrl: coverUrl,
                eyebrow,
                title: escapeHtml(o.title),
                accentColor: "#c8905a",
                linkUrl: galleryLink,
                topSpace: 150,
              })}
              <tr>
                <td style="padding:32px 36px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">${text}</span></td>
              </tr>
              ${until && o.downloads && kind !== "web" ? `<tr>
                <td style="padding:16px 36px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:13px;font-weight:300;line-height:1.7;">Je kunt alles downloaden tot ${until}. Bewaar de bestanden zelf goed. Wat je ermee mag doen, staat in onze <a href="${SITE_URL}/gebruiksrechten" style="color:#fffbe0;">gebruiksrechten</a>.</span></td>
              </tr>` : ""}
              <tr>
                <td style="padding:26px 36px 44px;text-align:center;">
                  <a href="${galleryLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:14px 32px;">${button}</a>
                  <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
                  <span style="color:rgba(255,251,224,0.3);font-size:11px;">Bedankt voor het vertrouwen. We horen graag hoe het is bevallen.</span>
                </td>
              </tr>
            `);
}

/** The subject of the delivery mail. */
export function deliveredSubject(kind: "photo" | "video" | "web", title: string): string {
  return kind === "web" ? `Je website staat live: ${title}` : kind === "video" ? `Je video staat klaar: ${title}` : `Je foto's staan klaar: ${title}`;
}

/** To a parent: what they chose for their child, and the way to change it. */
export function consentReceiptEmail(o: {
  language: "nl" | "en"; childName: string; parentName: string; projectTitle: string; title: string; body: string; changeLink: string;
}): string {
  const firstName = escapeHtml(o.parentName.split(" ")[0]);
  const child = escapeHtml(o.childName);
  const project = escapeHtml(o.projectTitle);
  const t = o.language === "en"
    ? {
      eyebrow: "Consent for photos",
      intro: `Hi ${firstName}, we have saved your choice for ${child} for ${project}.`,
      button: "Change my choice",
      foot: "You can change or withdraw your choice at any time with this button. Questions? Just reply to this e-mail.",
    }
    : {
      eyebrow: "Toestemming voor foto's",
      intro: `Hoi ${firstName}, we hebben je keuze voor ${child} bij ${project} opgeslagen.`,
      button: "Keuze wijzigen",
      foot: "Je kunt je keuze altijd wijzigen of intrekken met deze knop. Vragen? Beantwoord deze mail gewoon.",
    };
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${t.eyebrow}</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${child}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 36px 0;"><span style="color:rgba(255,251,224,0.7);font-size:14px;line-height:1.7;">${t.intro}</span></td>
              </tr>
              <tr>
                <td style="padding:20px 36px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
                    <tr><td style="padding:16px 18px;">
                      <span style="display:block;color:#fffbe0;font-size:14px;font-weight:700;">${escapeHtml(o.title)}</span>
                      <span style="display:block;margin-top:6px;color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${escapeHtml(o.body)}</span>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 36px 0;">
                  <a href="${o.changeLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">${t.button}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px 32px;"><span style="color:rgba(255,251,224,0.45);font-size:12px;line-height:1.6;">${t.foot}</span></td>
              </tr>
            `);
}

/** To a parent: a message the studio wrote itself about their child, with the way to change their choice. */
export function consentMessageEmail(o: { language: "nl" | "en"; childName: string; projectTitle: string; message: string; changeLink: string }): string {
  const t = o.language === "en"
    ? { eyebrow: "Consent for photos", button: "View or change my choice", foot: "Questions? Just reply to this e-mail." }
    : { eyebrow: "Toestemming voor foto's", button: "Keuze bekijken of wijzigen", foot: "Vragen? Beantwoord deze mail gewoon." };
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${t.eyebrow}</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(o.childName)}</span>
                  <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(o.projectTitle)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 0;"><span style="color:rgba(255,251,224,0.75);font-size:14px;line-height:1.7;">${escapeHtml(o.message).replace(/\n/g, "<br>")}</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 0;">
                  <a href="${o.changeLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">${t.button}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px 32px;"><span style="color:rgba(255,251,224,0.45);font-size:12px;line-height:1.6;">${t.foot}</span></td>
              </tr>
            `);
}

/** To the studio: a child who may not be shown or posted, or a parent who changed their mind. No photo in here: it stays behind the login. */
export function consentStudioEmail(o: {
  childName: string; shirtNumber: string; parentName: string; parentEmail: string; projectTitle: string; label: string; changedFrom: string; hasPhoto: boolean; note: string; link: string;
}): string {
  const lines = [
    o.changedFrom ? `Eerst was het: ${escapeHtml(o.changedFrom)}.` : "",
    `Ingevuld door ${escapeHtml(o.parentName)} (${escapeHtml(o.parentEmail)}).`,
    o.shirtNumber ? `Rugnummer: ${escapeHtml(o.shirtNumber)}.` : "",
    o.note ? `Herkenbaar aan: ${escapeHtml(o.note)}.` : "",
    o.hasPhoto ? "De foto van het kind staat in de admin." : "",
  ].filter(Boolean).join("<br>");
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Toestemming</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(o.childName)}: ${escapeHtml(o.label.toLowerCase())}</span>
                  <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(o.projectTitle)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 0;"><span style="color:rgba(255,251,224,0.65);font-size:14px;line-height:1.7;">${lines}</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 36px;">
                  <a href="${o.link}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Open in admin</a>
                </td>
              </tr>
            `);
}

/** To the studio: a parent says their child is on a photo, and that child needs care. No photo in here: it stays behind the login. */
export function childTagEmail(o: { childName: string; label: string; guestName: string; guestEmail: string; fileName: string; projectTitle: string; link: string }): string {
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Kind op een foto</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(o.childName)}: ${escapeHtml(o.label)}</span>
                  <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(o.projectTitle)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 0;"><span style="color:rgba(255,251,224,0.65);font-size:14px;line-height:1.7;">${escapeHtml(o.guestName)} (${escapeHtml(o.guestEmail)}) geeft aan dat dit kind op ${escapeHtml(o.fileName || "een foto")} staat. Komen er meer foto's bij, dan zie je die in de galerij.</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 36px;">
                  <a href="${o.link}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Open de galerij</a>
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
