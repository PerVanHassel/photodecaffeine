import { SITE_URL } from "./config.ts";
import { db, must } from "./db.ts";
import { escapeHtml } from "./email.ts";
import { mollieMode } from "./mollie.ts";
import { euro, mailCard } from "./priority.ts";
import { downloadsUntil } from "./projects.ts";
import { todayAmsterdam } from "./util.ts";

// Buying photos in a group gallery. With selling on for a group link, its
// guests see every photo that has a watermarked copy with that watermark, and
// buy the ones they want: they put them in a basket and pay at Mollie's own
// page, then download those photos as originals. What the client sees in the
// portal stays as the studio set it. The invoice is made only once paid, as a
// receipt, so a basket that is never paid leaves nothing behind in the books.
//
// The guest's side is in routes/share.ts, the payment in routes/payments.ts.

type Lang = "nl" | "en";

const DONE = ["delivered", "review", "archived"];

/**
 * What a guest bought or got first stays theirs to download, and photos stay
 * for sale, until downloading closes for the project: a quarter after
 * delivery, or the date the studio set.
 */
export function guestWindowOpen(row: { stage?: string; gallery_settings?: any }): boolean {
  if (!DONE.includes(String(row.stage))) return true;
  const until = downloadsUntil(row);
  return !until || until >= todayAmsterdam();
}

export const salesOpen = guestWindowOpen;

/** Paying online works: always with a live key, with a test key only when the link says test=1. */
export const payableNow = (test: boolean) => mollieMode() === "live" || (mollieMode() === "test" && test);

/** What a guest agrees to at checkout, word for word. The gallery shows this same text. */
export function orderStatement(language: Lang, price: number): string {
  return language === "en"
    ? `I agree to the terms and conditions and pay ${euro(price)} per photo. I want the photos right away, so my right of withdrawal ends as soon as I can download them.`
    : `Ik ga akkoord met de algemene voorwaarden en betaal ${euro(price)} per foto. Ik wil de foto's meteen krijgen. Daardoor vervalt mijn herroepingsrecht zodra ik ze kan downloaden.`;
}

/** The photos a guest bought: those of their orders whose receipt is paid. */
export async function boughtImageIds(guestId: string): Promise<Set<string>> {
  const orders = (must(await db.from("gallery_orders").select("id, invoices ( status )").eq("guest_id", guestId).not("invoice_id", "is", null)) || []) as any[];
  const paid = orders.filter((o) => o.invoices?.status === "paid").map((o) => o.id);
  if (paid.length === 0) return new Set();
  const rows = (must(await db.from("gallery_order_images").select("image_id").in("order_id", paid)) || []) as any[];
  return new Set(rows.map((r) => r.image_id));
}

/** What a project sold: photos and money, from paid orders only. */
export async function salesOf(projectId: string): Promise<{ photos: number; revenue: number }> {
  const orders = (must(await db.from("gallery_orders").select("id, price, invoices ( status )").eq("project_id", projectId).not("invoice_id", "is", null)) || []) as any[];
  const paid = orders.filter((o) => o.invoices?.status === "paid");
  if (paid.length === 0) return { photos: 0, revenue: 0 };
  const rows = (must(await db.from("gallery_order_images").select("order_id").in("order_id", paid.map((o) => o.id))) || []) as any[];
  const count = new Map<string, number>();
  for (const r of rows) count.set(r.order_id, (count.get(r.order_id) || 0) + 1);
  const revenue = paid.reduce((s, o) => s + Number(o.price) * (count.get(o.id) || 0), 0);
  return { photos: rows.length, revenue: Math.round(revenue * 100) / 100 };
}

const photoCount = (lang: Lang, n: number) => (lang === "en" ? `${n} ${n === 1 ? "photo" : "photos"}` : `${n} ${n === 1 ? "foto" : "foto's"}`);

/** To the guest once the payment is in: the photos are there, with the receipt and what they agreed to. */
export function orderPaidMail(language: string, o: {
  guestName: string; count: number; amount: number; via: string; invoiceNumber: string; invoiceLink: string; galleryLink: string;
}): { subject: string; html: string } {
  const lang: Lang = language === "en" ? "en" : "nl";
  const g = escapeHtml(String(o.guestName || "").trim().split(/\s+/)[0] || "");
  const link = (href: string, text: string) => `<a href="${href}" style="color:rgba(255,251,224,0.7);">${text}</a>`;
  if (lang === "en") {
    return {
      subject: `Your photos are ready: ${photoCount(lang, o.count)} without watermark`,
      html: mailCard({
        eyebrow: `Paid · ${escapeHtml(o.invoiceNumber)}`,
        title: `${photoCount(lang, o.count)} without watermark`,
        sub: `${euro(o.amount)}, received via ${escapeHtml(o.via)}`,
        text: [`Hi ${g}, thank you. Your photos are ready in the gallery. You can download them now in full quality, without the watermark.`],
        button: { label: "Go to your photos", link: o.galleryLink },
        foot: `Your invoice: ${link(o.invoiceLink, "view invoice")}. You agreed to get the photos right away, so your right of withdrawal has ended. What you may do with the photos is in our ${link(`${SITE_URL}/gebruiksrechten`, "usage rights")}.`,
      }),
    };
  }
  return {
    subject: `Je foto's staan klaar: ${photoCount(lang, o.count)} zonder watermerk`,
    html: mailCard({
      eyebrow: `Betaald · ${escapeHtml(o.invoiceNumber)}`,
      title: `${photoCount(lang, o.count)} zonder watermerk`,
      sub: `${euro(o.amount)}, ontvangen via ${escapeHtml(o.via)}`,
      text: [`Hoi ${g}, dank je wel. Je foto's staan klaar in de galerij. Je kunt ze nu downloaden in volle kwaliteit, zonder watermerk.`],
      button: { label: "Naar je foto's", link: o.galleryLink },
      foot: `Je factuur: ${link(o.invoiceLink, "bekijk factuur")}. Je gaf toestemming om de foto's meteen te leveren. Daardoor is je herroepingsrecht vervallen. Wat je met de foto's mag doen, staat in onze ${link(`${SITE_URL}/gebruiksrechten`, "gebruiksrechten")}.`,
    }),
  };
}
