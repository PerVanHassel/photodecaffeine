import { db, must } from "./db.ts";

// What the admin and the client's copy show of an online payment
// (routes/payments.ts makes and updates them). Mollie keeps the rest.

const METHOD_LABEL: Record<string, string> = {
  ideal: "iDEAL",
  wero: "Wero",
  creditcard: "kaart",
  bancontact: "Bancontact",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  paypal: "PayPal",
  banktransfer: "overboeking",
  belfius: "Belfius",
  kbc: "KBC/CBC",
};

export const methodLabel = (method: string | null | undefined): string => (method ? METHOD_LABEL[method] || method : "online");

const round2 = (n: number) => Math.round(n * 100) / 100;

export function paymentToApi(p: any) {
  return {
    id: p.id,
    mollieId: p.mollie_id,
    mode: p.mode,
    status: p.status,
    method: p.method,
    methodLabel: methodLabel(p.method),
    amount: Number(p.amount),
    amountRefunded: Number(p.amount_refunded),
    amountChargedBack: Number(p.amount_charged_back),
    paidAt: p.paid_at,
    createdAt: p.created_at,
  };
}

/** Every attempt for one invoice, newest first. */
export async function paymentsOf(invoiceId: string): Promise<any[]> {
  return must(await db.from("payments").select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false })) || [];
}

/** What one payment still holds: paid, minus what went back by refund or chargeback. */
export const kept = (p: any): number =>
  p.status === "paid" ? round2(Number(p.amount) - Number(p.amount_refunded) - Number(p.amount_charged_back)) : 0;

/** All of an invoice's online money that is still with us. */
export const keptOf = (rows: any[]): number => round2(rows.reduce((s, p) => s + kept(p), 0));
