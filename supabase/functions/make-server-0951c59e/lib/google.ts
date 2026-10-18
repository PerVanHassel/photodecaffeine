import * as kv from "../kv_store.tsx";
import { HttpError } from "./http.ts";

// ============================================================================
// GOOGLE BUSINESS PROFILE
// ============================================================================
//
// The studio's own Google reviews, read and answered from the admin. The
// owner connects once with the Google account that manages the business
// profile; the refresh token that comes back is kept server-side and never
// leaves this function.
//
// Setting it up needs a Google Cloud project with the Business Profile APIs
// approved for it, and an OAuth client. The client id and secret come from
// the function's environment when they are set there, and otherwise from the
// admin, which stores them in the kv store (readable by the service role only).

/** Where a client writes a review. Used until a connected profile says otherwise. */
export const GOOGLE_REVIEW_URL = "https://g.page/r/CUkHU8gqLEm4EBI/review";
/** The business on Google Maps, from the same link (it carries the place's cid). */
export const GOOGLE_MAPS_URL = "https://www.google.com/maps?cid=13279193538539751241";

const SCOPES = ["https://www.googleapis.com/auth/business.manage", "openid", "email"];
const CLIENT_KEY = "google:client";
const CONNECTION_KEY = "google:connection";
const STATE_PREFIX = "google:state:";
const STATE_MINUTES = 15;
// Opening the reviews page waits for a sync; Google must not be able to hold it up for long.
const TIMEOUT_MS = 15_000;

export type GoogleClient = { clientId: string; clientSecret: string };

export type GoogleConnection = {
  refreshToken: string;
  email: string;
  account: string;
  location: string;
  title: string;
  mapsUrl: string;
  reviewUrl: string;
  connectedAt: string;
  connectedBy: string;
  lastSyncAt?: string;
  lastTryAt?: string;
  lastError?: string;
  rating?: number;
  count?: number;
};

export type GoogleReview = {
  name: string;
  reviewId: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime: string;
  updateTime?: string;
  reviewReply?: { comment: string; updateTime?: string };
};

const parse = (raw: unknown) => (typeof raw === "string" ? JSON.parse(raw) : raw ?? null);

export async function googleClient(): Promise<GoogleClient | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (clientId && clientSecret) return { clientId, clientSecret };
  const stored = parse(await kv.get(CLIENT_KEY));
  return stored?.clientId && stored?.clientSecret ? stored : null;
}

export async function saveGoogleClient(client: GoogleClient): Promise<void> {
  await kv.set(CLIENT_KEY, JSON.stringify(client));
}

export async function googleConnection(): Promise<GoogleConnection | null> {
  return parse(await kv.get(CONNECTION_KEY));
}

export async function saveConnection(conn: GoogleConnection): Promise<void> {
  await kv.set(CONNECTION_KEY, JSON.stringify(conn));
}

export async function forgetConnection(): Promise<void> {
  const conn = await googleConnection();
  await kv.del(CONNECTION_KEY);
  cached = null;
  // Tell Google too, so the grant disappears from the owner's account page.
  if (conn?.refreshToken) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(conn.refreshToken)}`, { method: "POST" }).catch(() => {});
  }
}

// --- OAuth --------------------------------------------------------------------

/** The consent screen, with a one-time state that remembers who asked and where to come back. */
export async function authUrl(client: GoogleClient, redirectUri: string, adminId: string): Promise<string> {
  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + STATE_MINUTES * 60_000).toISOString();
  await kv.set(STATE_PREFIX + state, JSON.stringify({ adminId, redirectUri, expiresAt }));
  const q = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    // Offline + consent: Google only hands out a refresh token when asked for both.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Trades the code from the consent screen for tokens. The state must be ours, fresh and unused. */
export async function exchangeCode(client: GoogleClient, code: string, state: string, adminId: string) {
  const saved = parse(await kv.get(STATE_PREFIX + state));
  await kv.del(STATE_PREFIX + state);
  if (!saved || saved.adminId !== adminId || Date.parse(saved.expiresAt) < Date.now()) {
    throw new HttpError(400, "Deze koppelpoging is verlopen. Klik nog een keer op Koppelen met Google.");
  }
  const tokens = await tokenRequest(client, {
    grant_type: "authorization_code",
    code,
    redirect_uri: saved.redirectUri,
  });
  if (!tokens.refresh_token) {
    throw new HttpError(400, "Google gaf geen blijvende toegang terug. Haal PhotoDeCaffeine weg op myaccount.google.com/permissions en koppel opnieuw.");
  }
  const scopes = String(tokens.scope || "").split(" ");
  if (!scopes.includes(SCOPES[0])) {
    throw new HttpError(400, "Je gaf geen toegang tot je bedrijfsprofiel. Koppel opnieuw en zet het vinkje bij Google Bedrijfsprofiel aan.");
  }
  cached = { token: tokens.access_token, expires: Date.now() + (tokens.expires_in - 60) * 1000 };
  return { refreshToken: tokens.refresh_token as string, email: emailFromIdToken(tokens.id_token) };
}

async function tokenRequest(client: GoogleClient, params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body;
  console.log("google token error:", res.status, body);
  if (body.error === "invalid_grant") throw new HttpError(401, "De koppeling met Google werkt niet meer. Koppel opnieuw.");
  if (body.error === "invalid_client" || body.error === "unauthorized_client") {
    throw new HttpError(400, "Google herkent de client-ID of het geheim niet. Controleer ze bij Google koppelen.");
  }
  if (body.error === "redirect_uri_mismatch") {
    throw new HttpError(400, "De doorstuur-URL in Google Cloud klopt niet. Kopieer hem opnieuw uit de stappen.");
  }
  throw new HttpError(502, `Google gaf een fout: ${body.error_description || body.error || res.status}`);
}

function emailFromIdToken(idToken?: string): string {
  try {
    const payload = idToken?.split(".")[1];
    if (!payload) return "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).email || "";
  } catch {
    return "";
  }
}

// One access token per warm instance is plenty: they last an hour.
let cached: { token: string; expires: number } | null = null;

async function accessToken(conn: GoogleConnection): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.token;
  const client = await googleClient();
  if (!client) throw new HttpError(400, "Vul eerst de client-ID en het geheim in bij Google koppelen.");
  const tokens = await tokenRequest(client, { grant_type: "refresh_token", refresh_token: conn.refreshToken });
  cached = { token: tokens.access_token, expires: Date.now() + (tokens.expires_in - 60) * 1000 };
  return cached.token;
}

// --- API ----------------------------------------------------------------------

const API_NAMES: Record<string, string> = {
  "mybusinessaccountmanagement.googleapis.com": "My Business Account Management API",
  "mybusinessbusinessinformation.googleapis.com": "My Business Business Information API",
  "mybusiness.googleapis.com": "Google My Business API",
};

/** A Business Profile call, with Google's errors turned into something the owner can act on. */
async function call(conn: GoogleConnection, url: string, init: RequestInit = {}): Promise<any> {
  const token = await accessToken(conn);
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 204) return {};
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body;

  const message: string = body?.error?.message || "";
  const api = API_NAMES[new URL(url).host] || "de Business Profile API";
  console.log("google api error:", res.status, url, message);
  if (res.status === 401) {
    cached = null;
    throw new HttpError(401, "De koppeling met Google werkt niet meer. Koppel opnieuw.");
  }
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(message + JSON.stringify(body?.error?.details || ""))) {
    throw new HttpError(400, `Zet in Google Cloud de ${api} aan en probeer het dan opnieuw.`);
  }
  // A project Google has not approved yet gets a quota of zero requests.
  if (res.status === 429 || /quota/i.test(message)) {
    throw new HttpError(400, "Google heeft de toegang tot de Business Profile API nog niet goedgekeurd. Dat duurt meestal een paar dagen.");
  }
  if (res.status === 403) throw new HttpError(403, "Dit Google-account mag het bedrijfsprofiel niet beheren. Koppel met het account dat eigenaar is.");
  if (res.status === 404) throw new HttpError(404, "Google kon dit niet meer vinden. Misschien is de review verwijderd.");
  throw new HttpError(502, `Google gaf een fout: ${message || res.status}`);
}

/**
 * The business profile to read reviews from. A single location is the
 * normal case; with several, the one called PhotoDeCaffeine wins.
 */
export async function findLocation(conn: Pick<GoogleConnection, "refreshToken">) {
  const c = conn as GoogleConnection;
  const { accounts = [] } = await call(c, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20");
  const found: { account: string; location: string; title: string; mapsUrl: string; reviewUrl: string }[] = [];
  for (const account of accounts) {
    const q = new URLSearchParams({ readMask: "name,title,metadata", pageSize: "100" });
    const { locations = [] } = await call(c, `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${q}`);
    for (const l of locations) {
      found.push({
        account: account.name,
        location: l.name,
        title: l.title || "",
        mapsUrl: l.metadata?.mapsUri || GOOGLE_MAPS_URL,
        reviewUrl: l.metadata?.newReviewUri || GOOGLE_REVIEW_URL,
      });
    }
  }
  if (!found.length) throw new HttpError(404, "Bij dit Google-account staat geen bedrijfsprofiel. Koppel met het account dat PhotoDeCaffeine beheert.");
  return found.find((l) => /photo\s*de\s*caff?eine/i.test(l.title)) || found[0];
}

/** Every review on the profile, newest first, plus Google's own average and count. */
export async function fetchReviews(conn: GoogleConnection) {
  const reviews: GoogleReview[] = [];
  let pageToken = "";
  let averageRating = 0;
  let totalReviewCount = 0;
  // 50 per page; 20 pages is far beyond what a studio collects.
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ pageSize: "50", orderBy: "updateTime desc" });
    if (pageToken) q.set("pageToken", pageToken);
    const body = await call(conn, `https://mybusiness.googleapis.com/v4/${conn.account}/${conn.location}/reviews?${q}`);
    reviews.push(...(body.reviews || []));
    averageRating = body.averageRating ?? averageRating;
    totalReviewCount = body.totalReviewCount ?? totalReviewCount;
    pageToken = body.nextPageToken || "";
    if (!pageToken) return { reviews, averageRating, totalReviewCount, complete: true };
  }
  return { reviews, averageRating, totalReviewCount, complete: false };
}

export async function putReply(conn: GoogleConnection, reviewName: string, comment: string) {
  return await call(conn, `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, { method: "PUT", body: JSON.stringify({ comment }) });
}

export async function deleteReply(conn: GoogleConnection, reviewName: string) {
  await call(conn, `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, { method: "DELETE" });
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
export const starsOf = (r: GoogleReview) => STARS[r.starRating || ""] || 0;

/**
 * Google shows a translation first when the reviewer's language differs from
 * the viewer's ("(Translated by Google) … (Original) …"); keep what they wrote.
 */
export function originalText(comment = ""): string {
  const original = comment.match(/\(Original\)\s*([\s\S]*)$/);
  if (original) return original[1].trim();
  return comment.replace(/\s*\(Translated by Google\)[\s\S]*$/, "").trim();
}
