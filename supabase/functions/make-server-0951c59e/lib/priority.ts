import { SITE_URL } from "./config.ts";
import { db, must } from "./db.ts";
import { emailWrap, escapeHtml } from "./email.ts";
import { addWorkdays } from "./util.ts";

// Voorrang in a group gallery. A guest asks for the photos of one person (a
// player, usually) before the rest of the gallery. The studio looks whether
// there are enough of them, then sends a payment link (an invoice), or with too
// few an offer for a shoot of their own. Once paid, the studio picks the photos
// and delivers them: that guest can download them straight away.
//
// The guest asks in routes/share.ts, the studio answers in routes/priority.ts,
// and a payment arrives through routes/payments.ts.

export type PriorityStatus = "new" | "offered" | "delivered" | "booking" | "closed";
type Lang = "nl" | "en";

/** Requests a guest can have going at once: more than one family has players in a team. */
export const MAX_OPEN_PER_GUEST = 4;

/** Where someone with too few photos can book a shoot of their own. */
export const BOOKING_URL = `${SITE_URL}/services/fotografie/sport?utm_source=galerij&utm_campaign=voorrang#pakketten`;

/** "€5", "€7,50": as the quotes and invoices write it. */
export function euro(amount: number): string {
  const n = Number(amount) || 0;
  const decimals = Math.round(n * 100) % 100 === 0 ? 0 : 2;
  return `€${n.toLocaleString("nl-NL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const firstOf = (name: string) => String(name || "").trim().split(/\s+/)[0] || "";

/** "Sem de Vries #7". */
export const personLabel = (r: { person: string; number?: string }) => `${r.person}${r.number ? ` #${r.number}` : ""}`;

/** What a guest agrees to when asking, word for word. The gallery shows this same text. */
export function priorityStatement(language: Lang, price: number, days: number): string {
  return language === "en"
    ? `I agree to the terms and conditions. If there are enough photos, I pay ${euro(price)} and you may start right away. Once the photos are delivered, my right of withdrawal ends.`
    : `Ik ga akkoord met de algemene voorwaarden. Zijn er genoeg foto's, dan betaal ik ${euro(price)} en mogen jullie meteen beginnen. Zijn de foto's geleverd, dan vervalt mijn herroepingsrecht.`;
}

/** The last working day for the photos: so many working days after the payment. */
export function dueBy(paidAt: string | null | undefined, days: number): string {
  if (!paidAt) return "";
  const day = new Date(paidAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  return addWorkdays(day, days);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** The photos picked per request. */
export async function imagesOf(ids: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  if (ids.length === 0) return out;
  const rows = (must(await db.from("gallery_priority_images").select("priority_id, image_id").in("priority_id", ids)) || []) as any[];
  for (const r of rows) out.get(r.priority_id)?.push(r.image_id);
  return out;
}

/** The invoices behind the requests, by id. */
export async function invoicesOf(rows: { invoice_id: string | null }[]): Promise<Map<string, any>> {
  const ids = [...new Set(rows.map((r) => r.invoice_id).filter(Boolean))] as string[];
  if (ids.length === 0) return new Map();
  const list = (must(await db.from("invoices").select("id, number, status, token, paid_at").in("id", ids)) || []) as any[];
  return new Map(list.map((i) => [i.id, i]));
}

/** The photos a guest may download for their delivered requests. */
export async function deliveredImageIds(guestId: string): Promise<Set<string>> {
  const rows = (must(await db.from("gallery_priority").select("id").eq("guest_id", guestId).eq("status", "delivered")) || []) as any[];
  const images = await imagesOf(rows.map((r) => r.id));
  return new Set([...images.values()].flat());
}

/** The request an invoice was made for, if it was. */
export async function priorityForInvoice(invoiceId: string): Promise<any | null> {
  return must(await db.from("gallery_priority").select("*, gallery_guests ( name, email ), projects ( title, gallery_settings )")
    .eq("invoice_id", invoiceId).maybeSingle()) as any;
}

// ---------------------------------------------------------------------------
// Mails
// ---------------------------------------------------------------------------

const BUTTON = "display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;";

/** One card in the house style. Everything except `quote` and `button.link` is HTML the caller escaped. */
export function mailCard(o: { eyebrow: string; title: string; sub?: string; text: string[]; quote?: string; button?: { label: string; link: string }; foot?: string }): string {
  const paragraphs = o.text.map((p) => `
              <tr>
                <td style="padding:16px 36px 0;"><span style="color:rgba(255,251,224,0.75);font-size:14px;line-height:1.7;">${p}</span></td>
              </tr>`).join("");
  return emailWrap(`              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${o.eyebrow}</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${o.title}</span>
                  ${o.sub ? `<span style="display:block;color:rgba(255,251,224,0.35);font-size:12px;margin-top:4px;">${o.sub}</span>` : ""}
                </td>
              </tr>${paragraphs}
              ${o.quote ? `<tr>
                <td style="padding:20px 36px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
                    <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.7);font-size:13.5px;line-height:1.7;">${escapeHtml(o.quote).replace(/\n/g, "<br>")}</td></tr>
                  </table>
                </td>
              </tr>` : ""}
              ${o.button ? `<tr>
                <td style="padding:26px 36px 0;">
                  <a href="${o.button.link}" style="${BUTTON}">${o.button.label}</a>
                </td>
              </tr>` : ""}
              <tr>
                <td style="padding:20px 36px 32px;"><span style="color:rgba(255,251,224,0.45);font-size:12px;line-height:1.6;">${o.foot || ""}</span></td>
              </tr>
            `);
}

type MailRow = { person: string; number?: string; price: number | string; days: number; language: string; photos?: number | null };
type Mail = { subject: string; html: string };

const langOf = (r: MailRow): Lang => (r.language === "en" ? "en" : "nl");
const photoCount = (lang: Lang, n: number) => (lang === "en" ? `${n} ${n === 1 ? "photo" : "photos"}` : `${n} ${n === 1 ? "foto" : "foto's"}`);
const TERMS = `<a href="${SITE_URL}/algemene-voorwaarden" style="color:rgba(255,251,224,0.7);">photodecaffeine.com/algemene-voorwaarden</a>`;
const RIGHTS = `${SITE_URL}/gebruiksrechten`;

/** To the guest, right after asking: what happens next, and what they agreed to. */
export function receivedMail(r: MailRow, o: { guestName: string; galleryTitle: string; galleryLink: string }): Mail {
  const lang = langOf(r);
  const g = escapeHtml(firstOf(o.guestName));
  const p = escapeHtml(firstOf(r.person));
  const label = escapeHtml(personLabel(r));
  const price = euro(Number(r.price));
  if (lang === "en") {
    return {
      subject: `Priority request: ${personLabel(r)}`,
      html: mailCard({
        eyebrow: "Priority requested",
        title: label,
        sub: escapeHtml(o.galleryTitle),
        text: [
          `Hi ${g}, we've received your request. We're now checking whether there are enough photos of ${p}.`,
          `If there are, you'll get an email with a payment link for ${price}. Once you've paid, you'll get the photos within ${r.days} working days, before the rest of the gallery. If there are too few, you don't pay anything.`,
        ],
        button: { label: "Go to the gallery", link: o.galleryLink },
        foot: `You asked us to start right after your payment. Once the photos are delivered, your right of withdrawal ends. Our terms: ${TERMS}. Questions? Just reply to this email.`,
      }),
    };
  }
  return {
    subject: `Aanvraag voor voorrang: ${personLabel(r)}`,
    html: mailCard({
      eyebrow: "Voorrang aangevraagd",
      title: label,
      sub: escapeHtml(o.galleryTitle),
      text: [
        `Hoi ${g}, we hebben je aanvraag ontvangen. We kijken nu of er genoeg foto's van ${p} zijn.`,
        `Zijn er genoeg, dan krijg je een mail met een betaallink van ${price}. Na je betaling krijg je de foto's binnen ${r.days} werkdagen, nog voor de rest van de galerij. Zijn er te weinig, dan betaal je niets.`,
      ],
      button: { label: "Naar de galerij", link: o.galleryLink },
      foot: `Je gaf aan dat we na je betaling meteen mogen beginnen. Zijn de foto's geleverd, dan vervalt je herroepingsrecht. Onze voorwaarden: ${TERMS}. Vragen? Beantwoord deze mail gewoon.`,
    }),
  };
}

/** To the guest: enough photos, here is how to pay. */
export function offerMail(r: MailRow, o: { guestName: string; galleryTitle: string; payLink: string; online: boolean; message: string }): Mail {
  const lang = langOf(r);
  const g = escapeHtml(firstOf(o.guestName));
  const p = escapeHtml(firstOf(r.person));
  const price = euro(Number(r.price));
  const n = r.photos ?? null;
  if (lang === "en") {
    return {
      subject: `There are enough photos of ${firstOf(r.person)}`,
      html: mailCard({
        eyebrow: `Priority · ${escapeHtml(personLabel(r))}`,
        title: n ? `${photoCount(lang, n)} of ${p}` : `Enough photos of ${p}`,
        sub: escapeHtml(o.galleryTitle),
        text: [`Hi ${g}, good news. We found ${n ? photoCount(lang, n) : "enough photos"} of ${p}. Pay ${price} and you'll get them within ${r.days} working days, before the rest of the gallery.`],
        quote: o.message,
        button: { label: o.online ? `Pay ${price}` : "View the invoice", link: o.payLink },
        foot: `${o.online ? "You pay safely with iDEAL | Wero, your card or Bancontact." : "The invoice says how to pay."} Changed your mind? Let us know and we'll cancel the invoice.`,
      }),
    };
  }
  return {
    subject: `Er zijn genoeg foto's van ${firstOf(r.person)}`,
    html: mailCard({
      eyebrow: `Voorrang · ${escapeHtml(personLabel(r))}`,
      title: n ? `${photoCount(lang, n)} van ${p}` : `Genoeg foto's van ${p}`,
      sub: escapeHtml(o.galleryTitle),
      text: [`Hoi ${g}, goed nieuws. We hebben ${n ? photoCount(lang, n) : "genoeg foto's"} van ${p} gevonden. Betaal ${price} en je krijgt ze binnen ${r.days} werkdagen, nog voor de rest van de galerij.`],
      quote: o.message,
      button: { label: o.online ? `Betaal ${price}` : "Bekijk de factuur", link: o.payLink },
      foot: `${o.online ? "Je betaalt veilig met iDEAL | Wero, je kaart of Bancontact." : "Op de factuur staat hoe je kunt betalen."} Toch liever niet? Laat het ons weten, dan vervalt de factuur.`,
    }),
  };
}

/** To the guest: too few photos, so nothing to pay; a shoot of their own instead. */
export function bookingMail(r: MailRow, o: { guestName: string; galleryTitle: string; message: string }): Mail {
  const lang = langOf(r);
  const g = escapeHtml(firstOf(o.guestName));
  const p = escapeHtml(firstOf(r.person));
  if (lang === "en") {
    return {
      subject: `About your request for ${firstOf(r.person)}`,
      html: mailCard({
        eyebrow: `Priority · ${escapeHtml(personLabel(r))}`,
        title: `A shoot of their own for ${p}?`,
        sub: escapeHtml(o.galleryTitle),
        text: [
          `Hi ${g}, we had a good look, but there are too few photos of ${p} to ask anything for priority. So you don't pay anything. The photos we do have will simply be in the gallery.`,
          `Would you like really good photos of ${p}? Book a shoot of their own at a match or training. We'll keep our eyes on ${p} the whole time.`,
        ],
        quote: o.message,
        button: { label: "See the packages", link: BOOKING_URL },
        foot: "Questions? Just reply to this email.",
      }),
    };
  }
  return {
    subject: `Over je aanvraag voor ${firstOf(r.person)}`,
    html: mailCard({
      eyebrow: `Voorrang · ${escapeHtml(personLabel(r))}`,
      title: `Een eigen shoot voor ${p}?`,
      sub: escapeHtml(o.galleryTitle),
      text: [
        `Hoi ${g}, we hebben goed gekeken, maar er staan te weinig foto's van ${p} tussen om voorrang voor te vragen. Je betaalt dus niets. De foto's die er wel zijn, komen gewoon in de galerij.`,
        `Wil je echt mooie foto's van ${p}? Boek dan een eigen shoot bij een wedstrijd of training. Dan letten we de hele tijd op ${p}.`,
      ],
      quote: o.message,
      button: { label: "Bekijk de pakketten", link: BOOKING_URL },
      foot: "Vragen? Beantwoord deze mail gewoon.",
    }),
  };
}

/** To the guest: the photos are there. */
export function deliveredMail(r: MailRow, o: { guestName: string; guestEmail: string; galleryTitle: string; link: string; count: number; message: string }): Mail {
  const lang = langOf(r);
  const g = escapeHtml(firstOf(o.guestName));
  const p = escapeHtml(firstOf(r.person));
  const email = escapeHtml(o.guestEmail);
  if (lang === "en") {
    return {
      subject: `The photos of ${firstOf(r.person)} are ready`,
      html: mailCard({
        eyebrow: "Priority · ready",
        title: `${photoCount(lang, o.count)} of ${p}`,
        sub: escapeHtml(o.galleryTitle),
        text: [`Hi ${g}, the photos of ${p} are ready for you in the gallery. You can download them right away.`],
        quote: o.message,
        button: { label: "View the photos", link: o.link },
        foot: `Opening the gallery on another device? Enter the same email address: ${email}. What you may do with the photos is in our <a href="${RIGHTS}" style="color:rgba(255,251,224,0.7);">usage rights</a>.`,
      }),
    };
  }
  return {
    subject: `De foto's van ${firstOf(r.person)} staan klaar`,
    html: mailCard({
      eyebrow: "Voorrang · klaar",
      title: `${photoCount(lang, o.count)} van ${p}`,
      sub: escapeHtml(o.galleryTitle),
      text: [`Hoi ${g}, de foto's van ${p} staan voor je klaar in de galerij. Je kunt ze meteen downloaden.`],
      quote: o.message,
      button: { label: "Bekijk de foto's", link: o.link },
      foot: `Open je de galerij op een ander apparaat? Vul dan hetzelfde e-mailadres in: ${email}. Wat je met de foto's mag doen, staat in onze <a href="${RIGHTS}" style="color:rgba(255,251,224,0.7);">gebruiksrechten</a>.`,
    }),
  };
}

/** To the guest, once the payment is in: replaces the plain receipt (routes/payments.ts). */
export function paidMail(r: MailRow, o: { guestName: string; invoiceNumber: string; via: string; invoiceLink: string }): Mail {
  const lang = langOf(r);
  const g = escapeHtml(firstOf(o.guestName));
  const p = escapeHtml(firstOf(r.person));
  const price = euro(Number(r.price));
  if (lang === "en") {
    return {
      subject: `Payment received: priority for ${firstOf(r.person)}`,
      html: mailCard({
        eyebrow: `Paid · ${escapeHtml(o.invoiceNumber)}`,
        title: price,
        sub: `Received via ${escapeHtml(o.via)}`,
        text: [`Hi ${g}, thank you. We've received your payment and we're getting started on the photos of ${p}. You'll get them within ${r.days} working days, and an email as soon as they're ready.`],
        button: { label: "View invoice", link: o.invoiceLink },
        foot: "Questions? Just reply to this email.",
      }),
    };
  }
  return {
    subject: `Betaling ontvangen: voorrang voor ${firstOf(r.person)}`,
    html: mailCard({
      eyebrow: `Betaald · ${escapeHtml(o.invoiceNumber)}`,
      title: price,
      sub: `Ontvangen via ${escapeHtml(o.via)}`,
      text: [`Hoi ${g}, dank je wel. We hebben je betaling ontvangen en gaan meteen aan de slag met de foto's van ${p}. Je krijgt ze binnen ${r.days} werkdagen, en een mail zodra ze klaarstaan.`],
      button: { label: "Bekijk factuur", link: o.invoiceLink },
      foot: "Vragen? Beantwoord deze mail gewoon.",
    }),
  };
}

/** To the studio: someone asks. No photo in here: those stay behind the login. */
export function studioMail(r: MailRow & { note?: string }, o: { guestName: string; guestEmail: string; projectTitle: string; link: string }): Mail {
  const lines = [
    `Gevraagd door ${escapeHtml(o.guestName)} (${escapeHtml(o.guestEmail)}).`,
    r.note ? `Herkenbaar aan: ${escapeHtml(r.note)}.` : "",
    `${euro(Number(r.price))}, binnen ${r.days} werkdagen na betaling.`,
  ].filter(Boolean).join("<br>");
  return {
    subject: `Voorrang gevraagd: ${personLabel(r)} · ${o.projectTitle}`,
    html: mailCard({
      eyebrow: "Voorrang gevraagd",
      title: escapeHtml(personLabel(r)),
      sub: escapeHtml(o.projectTitle),
      text: [lines, "Kijk of er genoeg foto's zijn. Stuur dan vanuit de admin een betaallink, of bij te weinig foto's een aanbod voor een eigen shoot."],
      button: { label: "Open in admin", link: o.link },
    }),
  };
}
