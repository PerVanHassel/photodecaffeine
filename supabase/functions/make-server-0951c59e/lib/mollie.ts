import { HttpError } from "./http.ts";

// Online payments through Mollie (docs.mollie.com), always on Mollie's own
// hosted page: no Mollie script or cookie ever runs on the site. The key is the
// Supabase secret MOLLIE_API_KEY: test_… while testing, live_… once Mollie has
// approved the account. Without a key nothing here is offered.

const API = "https://api.mollie.com/v2";

export type Amount = { value: string; currency: string };

export type MolliePayment = {
  id: string;
  mode: "test" | "live";
  status: "open" | "pending" | "authorized" | "paid" | "canceled" | "expired" | "failed";
  method: string | null;
  amount: Amount;
  amountRefunded?: Amount;
  amountChargedBack?: Amount;
  paidAt?: string;
  _links?: { checkout?: { href: string } };
};

function key(): string {
  return (Deno.env.get("MOLLIE_API_KEY") || "").trim();
}

/** "live", "test", or "" when there is no (usable) key. */
export function mollieMode(): "" | "test" | "live" {
  const k = key();
  return k.startsWith("live_") ? "live" : k.startsWith("test_") ? "test" : "";
}

const money = (n: number): Amount => ({ currency: "EUR", value: n.toFixed(2) });
export const amountOf = (a?: Amount | null): number => (a ? Number(a.value) || 0 : 0);

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!mollieMode()) throw new HttpError(503, "Online betalen staat nog niet aan.");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.log("mollie: unreachable", err);
    throw new HttpError(502, "De betaaldienst is even niet bereikbaar. Probeer het zo opnieuw.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Mollie says what went wrong in title/detail; never log the whole object,
    // a payment can carry the payer's name and account.
    console.log("mollie:", method, path.replace(/tr_\w+/, "tr_…"), res.status, data?.title, data?.detail);
    throw new HttpError(502, "De betaaldienst gaf een fout. Probeer het zo opnieuw.");
  }
  return data as T;
}

export function createPayment(p: {
  amount: number;
  description: string;
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata: Record<string, string>;
}): Promise<MolliePayment> {
  return call("POST", "/payments", {
    amount: money(p.amount),
    description: p.description.slice(0, 255),
    redirectUrl: p.redirectUrl,
    cancelUrl: p.cancelUrl,
    webhookUrl: p.webhookUrl,
    metadata: p.metadata,
    locale: "nl_NL",
  });
}

export function getPayment(id: string): Promise<MolliePayment> {
  return call("GET", `/payments/${encodeURIComponent(id)}`);
}

export function createRefund(paymentId: string, amount: number, description: string): Promise<{ id: string; status: string }> {
  return call("POST", `/payments/${encodeURIComponent(paymentId)}/refunds`, {
    amount: money(amount),
    description: description.slice(0, 140),
  });
}
