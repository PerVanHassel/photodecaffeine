import { SITE_URL } from "./config.ts";
import { emailWrap, escapeHtml } from "./email.ts";

// The mails the terms promise: the confirmation of a booking, a withdrawal and
// a portfolio consent. Nested tables and inline styles, like the other mails.

const muted = "rgba(255,251,224,0.55)";
const faint = "rgba(255,251,224,0.28)";

const head = (eyebrow: string, title: string) => `
  <tr>
    <td style="padding:32px 36px 0;">
      <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${escapeHtml(eyebrow)}</span>
      <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
      <span style="display:block;color:#fffbe0;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">${escapeHtml(title)}</span>
    </td>
  </tr>`;

const para = (html: string) => `
  <tr><td style="padding:16px 36px 0;"><span style="color:${muted};font-size:14px;font-weight:300;line-height:1.75;">${html}</span></td></tr>`;

const facts = (rows: [string, string][]) => `
  <tr>
    <td style="padding:18px 36px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border:1px solid rgba(255,251,224,0.08);">
        ${rows.map(([k, v]) => `
        <tr>
          <td valign="top" style="padding:10px 16px;border-bottom:1px solid rgba(255,251,224,0.05);"><span style="color:${faint};font-size:12px;">${escapeHtml(k)}</span></td>
          <td style="padding:10px 16px;border-bottom:1px solid rgba(255,251,224,0.05);"><span style="color:#fffbe0;font-size:13px;line-height:1.6;">${escapeHtml(v)}</span></td>
        </tr>`).join("")}
      </table>
    </td>
  </tr>`;

const button = (label: string, href: string) => `
  <tr>
    <td style="padding:26px 36px 0;">
      <a href="${href}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">${escapeHtml(label)}</a>
    </td>
  </tr>`;

const foot = (text: string) => `
  <tr><td style="padding:24px 36px 36px;"><span style="color:rgba(255,251,224,0.3);font-size:11px;line-height:1.7;">${text}</span></td></tr>`;

const link = (href: string, label: string) => `<a href="${href}" style="color:#fffbe0;">${escapeHtml(label)}</a>`;

export const whenText = (iso: string, language: "nl" | "en" = "nl") => new Date(iso).toLocaleString(language === "en" ? "en-GB" : "nl-NL", {
  timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

/** The written confirmation that makes a booking binding (terms, article 3). */
export function bookingConfirmedEmail(o: {
  firstName: string; number: string; title: string; at: string; amounts: [string, string][]; quoteLink: string; termsVersion: string;
  consumer: boolean; withdrawLink: string; earlyStart: boolean; portfolio: boolean; web: boolean;
}): string {
  const terms = [
    link(`${SITE_URL}/algemene-voorwaarden`, "Algemene voorwaarden"),
    link(`${SITE_URL}/gebruiksrechten`, "Gebruiksrechten"),
    link(`${SITE_URL}/annuleren-en-terugbetaling`, "Annuleren en terugbetaling"),
    link(`${SITE_URL}/oplevering-en-revisies`, "Oplevering en revisies"),
    ...(o.web ? [link(`${SITE_URL}/voorwaarden-websites`, "Websites")] : []),
  ].join(" · ");
  return emailWrap(`
    ${head("Bevestiging van je boeking", o.title)}
    ${para(`Hallo ${escapeHtml(o.firstName)}, bedankt! Je ging op ${escapeHtml(whenText(o.at))} akkoord met prijsopgave ${escapeHtml(o.number)}. Daarmee is je boeking bevestigd.`)}
    ${facts(o.amounts)}
    ${para(`Bij deze boeking horen onze voorwaarden, versie ${escapeHtml(o.termsVersion)}: ${terms}. Op die pagina's kun je ze ook opslaan als pdf.`)}
    ${o.consumer ? para(`<strong style="color:#fffbe0;">Bedenktijd.</strong> Je hebt 14 dagen bedenktijd. Je hoeft geen reden te geven. Herroepen kan via ${link(o.withdrawLink, "deze link")}. ${o.earlyStart ? "Je hebt ons gevraagd om in die tijd al te beginnen. Herroep je daarna, dan kan een evenredige vergoeding gelden voor wat we al hebben gedaan." : "We beginnen pas na de bedenktijd, tenzij je ons vraagt om eerder te starten."}`) : ""}
    ${o.portfolio ? para("Je gaf toestemming om het opgeleverde werk te tonen in ons portfolio. Dat is vrijwillig. Antwoord op deze mail als je dat wilt intrekken.") : ""}
    ${button("Bekijk je prijsopgave", o.quoteLink)}
    ${foot("Bewaar deze mail goed. Vragen of iets aanpassen? Antwoord gerust.")}
  `);
}

/** Confirms a withdrawal straight away, with the date and time (what the law asks of the function). */
/** The subject of the withdrawal confirmation, in the language the withdrawal was made in. */
export const withdrawalSubject = (language: "nl" | "en") =>
  language === "en" ? "Confirmation: we've received your withdrawal" : "Bevestiging: we hebben je herroeping ontvangen";

export function withdrawalEmail(o: { firstName: string; at: string; reference: string; language?: "nl" | "en" }): string {
  if (o.language === "en") {
    return emailWrap(`
    ${head("Withdrawal received", o.reference)}
    ${para(`Hello ${escapeHtml(o.firstName)}, we received your withdrawal on ${escapeHtml(whenText(o.at, "en"))}.`)}
    ${para("Anything you're entitled to, we'll refund no later than 14 days after that date, using the same means of payment. If you asked us to start during the cooling-off period, a proportionate amount may apply for what we have already done.")}
    ${para(`How it works exactly is explained in ${link(`${SITE_URL}/annuleren-en-terugbetaling`, "Cancellation and refunds")}. The Dutch text of our terms is the one that applies.`)}
    ${foot("Please keep this email. Questions? Just reply.")}
  `);
  }
  return emailWrap(`
    ${head("Herroeping ontvangen", o.reference)}
    ${para(`Hallo ${escapeHtml(o.firstName)}, we hebben je herroeping ontvangen op ${escapeHtml(whenText(o.at))}.`)}
    ${para("Waar je recht op hebt, betalen we uiterlijk 14 dagen na die datum terug, via hetzelfde betaalmiddel. Heb je ons gevraagd om tijdens de bedenktijd al te beginnen, dan kan een evenredige vergoeding gelden voor wat we al hebben gedaan.")}
    ${para(`Hoe het precies werkt, staat in ${link(`${SITE_URL}/annuleren-en-terugbetaling`, "Annuleren en terugbetaling")}.`)}
    ${foot("Bewaar deze mail goed. Vragen? Antwoord gerust.")}
  `);
}

export function withdrawalStudioEmail(o: { name: string; email: string; at: string; reference: string; message: string; known: string; language?: "nl" | "en" }): string {
  return emailWrap(`
    ${head("Herroeping", `${o.name} herroept een overeenkomst`)}
    ${facts([["Wanneer", whenText(o.at)], ["Offerte of boeking", o.reference], ["E-mail", o.email], ["In de admin", o.known], ...(o.language === "en" ? [["Taal", "Engels, de klant kreeg de bevestiging in het Engels"] as [string, string]] : [])])}
    ${o.message ? para(`&ldquo;${escapeHtml(o.message)}&rdquo;`) : ""}
    ${para("Betaal terug waar de klant recht op heeft, uiterlijk 14 dagen na deze datum. Er staat een taak klaar.")}
    ${button("Open in het adminpaneel", `${SITE_URL}/admin/tasks`)}
    ${foot("&nbsp;")}
  `);
}

/** Asks someone whether a piece may be shown. */
export function articleConsentRequestEmail(o: { firstName: string; title: string; link: string }): string {
  return emailWrap(`
    ${head("Mag dit in ons portfolio?", o.title)}
    ${para(`Hallo ${escapeHtml(o.firstName)}, we willen ${escapeHtml(o.title)} graag laten zien in ons portfolio. Dat doen we alleen als jij het goed vindt. Het is vrijwillig en verandert niets aan je opdracht.`)}
    ${para("Via de knop zie je om welke beelden het gaat. Je kiest waar het mag en of je naam erbij mag, of je zegt nee. Je kunt je keuze later altijd veranderen.")}
    ${button("Kies wat er mag", o.link)}
    ${foot("Vragen? Antwoord gerust op deze mail.")}
  `);
}

const PLACE_NL: Record<string, string> = { website: "website", social: "social media", print: "gedrukt portfolio", ads: "betaalde advertenties" };
const PLACE_EN: Record<string, string> = { website: "website", social: "social media", print: "printed portfolio", ads: "paid advertising" };

export function articleConsentReceiptEmail(o: { language: "nl" | "en"; firstName: string; title: string; answer: string; places: string[]; link: string }): string {
  const en = o.language === "en";
  const names = o.places.map((p) => (en ? PLACE_EN : PLACE_NL)[p] || p).join(", ");
  const said = o.answer === "given"
    ? (en ? `You said yes, for: ${names}.` : `Je zei ja, voor: ${names}.`)
    : (en ? "You said no. We will not show this work." : "Je zei nee. We laten dit werk niet zien.");
  return emailWrap(`
    ${head(en ? "Your choice is saved" : "Je keuze is opgeslagen", o.title)}
    ${para(`${en ? "Hi" : "Hallo"} ${escapeHtml(o.firstName)}, ${escapeHtml(said)}`)}
    ${button(en ? "Change my choice" : "Mijn keuze wijzigen", o.link)}
    ${foot(en ? "You can change or withdraw your choice at any time with this button. Questions? Just reply to this e-mail." : "Met deze knop kun je je keuze altijd wijzigen of intrekken. Vragen? Antwoord gerust op deze mail.")}
  `);
}

export function articleConsentStudioEmail(o: { title: string; name: string; email: string; answer: string; places: string[]; nameUse: string; limits: string; guardianOf: string; tookDown: boolean; articleId: string }): string {
  const nameUse: Record<string, string> = { none: "Geen naam", first: "Alleen voornaam", full: "Volledige naam" };
  const rows: [string, string][] = [
    ["Antwoord", o.answer === "given" ? "Ja" : "Nee"],
    ...(o.answer === "given" ? [["Waar", o.places.map((p) => PLACE_NL[p] || p).join(", ")] as [string, string], ["Naam erbij", nameUse[o.nameUse] || o.nameUse] as [string, string]] : []),
    ["E-mail", o.email],
    ...(o.guardianOf ? [["Ouder of voogd van", o.guardianOf] as [string, string]] : []),
    ...(o.limits ? [["Beperkingen", o.limits] as [string, string]] : []),
  ];
  return emailWrap(`
    ${head("Toestemming portfolio", `${o.name}: ${o.title}`)}
    ${facts(rows)}
    ${o.tookDown ? para("Dit werk staat niet meer op de site. Haal het ook weg van social media en kijk of de foto nog ergens anders op de site staat, zoals op de homepage.") : ""}
    ${o.answer === "given" && o.nameUse !== "full" ? para("Let op: kijk of de naam in de titel of de tekst van het stuk nog klopt met deze keuze.") : ""}
    ${button("Open in het adminpaneel", `${SITE_URL}/admin/portfolio?filter=consent`)}
    ${foot("&nbsp;")}
  `);
}
