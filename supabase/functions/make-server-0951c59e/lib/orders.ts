import { SITE_URL } from "./config.ts";
import { db, must } from "./db.ts";
import { escapeHtml } from "./email.ts";
import { mollieMode } from "./mollie.ts";
import { euro, mailCard } from "./priority.ts";
import { galleryAccess } from "./projects.ts";
import { todayAmsterdam } from "./util.ts";

// Buying photos in a group gallery. With selling on for a group link, its
// guests see every photo with its watermark and buy the ones they want: they
// put them in a basket, sign in with an account (routes/account.ts), pay at
// Mollie's own page, and download those photos as originals, also later from
// Mijn foto's. What the client sees in the portal stays as the studio set it.
// The invoice is made only once paid, as a receipt, so a basket that is never
// paid leaves nothing behind in the books.
//
// The guest's side is in routes/share.ts, the payment in routes/payments.ts.

type Lang = "nl" | "en";

/** The columns access needs, for a project loaded on its own. */
export const ACCESS_SELECT = "id, title, stage, type, gallery_settings, archived_at, project_parts ( id, kind, stage, hold, sort, created_at )";

/**
 * What a guest bought or got first stays theirs to download, and photos stay
 * for sale, until downloading closes for the project: a quarter after
 * delivery, or the date the studio set.
 */
export function guestWindowOpen(row: any): boolean {
  return galleryAccess(row).open;
}

export const salesOpen = guestWindowOpen;

/** Paying online works: always with a live key, with a test key only when the link says test=1. */
export const payableNow = (test: boolean) => mollieMode() === "live" || (mollieMode() === "test" && test);

export type Pricing = { price: number; normal: number; bundleSize: number; bundlePrice: number; discountUntil: string };

/** The prices of a group link today: after the start-up price ends, guests pay the normal price. */
export function pricingOf(share: { photo_price: number | string; photo_price_normal: number | string; bundle_size?: number; bundle_price?: number | string; discount_until?: string | null }): Pricing {
  const normal = Number(share.photo_price_normal);
  const ended = !!share.discount_until && share.discount_until < todayAmsterdam();
  const price = ended && normal > 0 ? normal : Number(share.photo_price);
  const bundleSize = Number(share.bundle_size) || 0;
  const bundlePrice = Number(share.bundle_price) || 0;
  // A bundle only counts when it is cheaper than the photos one by one.
  const bundle = bundleSize >= 2 && bundlePrice > 0 && bundlePrice < price * bundleSize;
  return {
    price,
    normal: ended ? price : normal,
    bundleSize: bundle ? bundleSize : 0,
    bundlePrice: bundle ? bundlePrice : 0,
    discountUntil: ended ? "" : share.discount_until || "",
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a basket of `count` photos costs: as many bundles as fit, the rest one by one. */
export function basketTotal(count: number, p: Pick<Pricing, "price" | "bundleSize" | "bundlePrice">): number {
  if (p.bundleSize >= 2 && p.bundlePrice > 0) {
    const bundles = Math.floor(count / p.bundleSize);
    return round2(bundles * p.bundlePrice + (count - bundles * p.bundleSize) * p.price);
  }
  return round2(count * p.price);
}

/** The lines of the receipt: bundles first, then single photos. */
export function receiptLines(count: number, o: { price: number; normal: number; bundleSize: number; bundlePrice: number; title: string }) {
  const note = (extra: string) => [o.title, extra].filter(Boolean).join(". ");
  const bundles = o.bundleSize >= 2 && o.bundlePrice > 0 ? Math.floor(count / o.bundleSize) : 0;
  const singles = count - bundles * o.bundleSize;
  const lines = [];
  if (bundles) lines.push({ label: `Bundel van ${o.bundleSize} foto's zonder watermerk`, quantity: bundles, amount: o.bundlePrice, note: note("") });
  if (singles) {
    lines.push({
      label: "Foto's zonder watermerk",
      quantity: singles,
      amount: o.price,
      note: note(o.normal > o.price ? `Start-up korting: normaal ${euro(o.normal)} per foto` : ""),
    });
  }
  return lines;
}

/** What a guest agrees to at checkout, word for word. The gallery shows this same text. */
export function orderStatement(language: Lang, p: Pick<Pricing, "price" | "bundleSize" | "bundlePrice">): string {
  const bundleEn = p.bundleSize ? ` or ${euro(p.bundlePrice)} for every ${p.bundleSize} photos` : "";
  const bundleNl = p.bundleSize ? ` of ${euro(p.bundlePrice)} per ${p.bundleSize} foto's` : "";
  return language === "en"
    ? `I agree to the terms and conditions and pay ${euro(p.price)} per photo${bundleEn}. I want the photos right away, so my right of withdrawal ends as soon as I can download them.`
    : `Ik ga akkoord met de algemene voorwaarden en betaal ${euro(p.price)} per foto${bundleNl}. Ik wil de foto's meteen krijgen. Daardoor vervalt mijn herroepingsrecht zodra ik ze kan downloaden.`;
}

/** The photos bought by these guest rows: those of their orders whose receipt is paid. */
export async function boughtImageIds(guestIds: string | string[]): Promise<Set<string>> {
  const ids = (Array.isArray(guestIds) ? guestIds : [guestIds]).filter(Boolean);
  if (ids.length === 0) return new Set();
  const orders = (must(await db.from("gallery_orders").select("id, invoices ( status )").in("guest_id", ids).not("invoice_id", "is", null)) || []) as any[];
  const paid = orders.filter((o) => o.invoices?.status === "paid").map((o) => o.id);
  if (paid.length === 0) return new Set();
  const rows = (must(await db.from("gallery_order_images").select("image_id").in("order_id", paid)) || []) as any[];
  return new Set(rows.map((r) => r.image_id));
}

/** What an order came to: its amount, or for older orders price x count. */
export const orderAmount = (o: { amount?: number | string | null; price: number | string }, count: number) =>
  o.amount != null ? Number(o.amount) : round2(Number(o.price) * count);

/** A project's baskets, newest first, with who and what. Paid ones carry their receipt. */
export async function ordersOf(projectId: string) {
  const orders = (must(await db.from("gallery_orders")
    .select("id, price, amount, created_at, language, invoice_id, invoices ( id, number, status, paid_at ), gallery_guests ( id, name, email ), gallery_order_images ( image_id )")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(500)) || []) as any[];
  return orders.map((o) => {
    const images = (o.gallery_order_images || []).map((x: any) => x.image_id);
    return {
      id: o.id,
      guest: { id: o.gallery_guests?.id || "", name: o.gallery_guests?.name || "", email: o.gallery_guests?.email || "" },
      images,
      amount: orderAmount(o, images.length),
      paid: o.invoices?.status === "paid",
      invoice: o.invoices ? { id: o.invoices.id, number: o.invoices.number, status: o.invoices.status } : null,
      paidAt: o.invoices?.paid_at || null,
      createdAt: o.created_at,
    };
  });
}

/** What a project sold: photos and money, from paid orders only. */
export async function salesOf(projectId: string): Promise<{ photos: number; revenue: number; buyers: number }> {
  const paid = (await ordersOf(projectId)).filter((o) => o.paid);
  return {
    photos: paid.reduce((s, o) => s + o.images.length, 0),
    revenue: round2(paid.reduce((s, o) => s + o.amount, 0)),
    buyers: new Set(paid.map((o) => o.guest.email || o.guest.id)).size,
  };
}

const photoCount = (lang: Lang, n: number) => (lang === "en" ? `${n} ${n === 1 ? "photo" : "photos"}` : `${n} ${n === 1 ? "foto" : "foto's"}`);

/** To the guest once the payment is in: the photos are there, with the receipt and what they agreed to. */
export function orderPaidMail(language: string, o: {
  guestName: string; count: number; amount: number; via: string; invoiceNumber: string; invoiceLink: string; galleryLink: string;
}): { subject: string; html: string } {
  const lang: Lang = language === "en" ? "en" : "nl";
  const g = escapeHtml(String(o.guestName || "").trim().split(/\s+/)[0] || "");
  const link = (href: string, text: string) => `<a href="${href}" style="color:rgba(255,251,224,0.7);">${text}</a>`;
  const mine = `${SITE_URL}/mijn-fotos`;
  if (lang === "en") {
    return {
      subject: `Your photos are ready: ${photoCount(lang, o.count)} without watermark`,
      html: mailCard({
        eyebrow: `Paid · ${escapeHtml(o.invoiceNumber)}`,
        title: `${photoCount(lang, o.count)} without watermark`,
        sub: `${euro(o.amount)}, received via ${escapeHtml(o.via)}`,
        text: [
          `Hi ${g}, thank you. Your photos are ready. You can download them now in full quality, without the watermark.`,
          `They also stay in your account under ${link(mine, "My photos")}, so you can download them again later.`,
        ],
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
      text: [
        `Hoi ${g}, dank je wel. Je foto's staan klaar. Je kunt ze nu downloaden in volle kwaliteit, zonder watermerk.`,
        `Ze blijven ook in je account staan, bij ${link(mine, "Mijn foto's")}. Zo kun je ze later opnieuw downloaden.`,
      ],
      button: { label: "Naar je foto's", link: o.galleryLink },
      foot: `Je factuur: ${link(o.invoiceLink, "bekijk factuur")}. Je gaf toestemming om de foto's meteen te leveren. Daardoor is je herroepingsrecht vervallen. Wat je met de foto's mag doen, staat in onze ${link(`${SITE_URL}/gebruiksrechten`, "gebruiksrechten")}.`,
    }),
  };
}
