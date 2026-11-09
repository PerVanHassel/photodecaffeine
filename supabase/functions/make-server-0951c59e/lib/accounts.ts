import type { Context } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { isAdminUser, verifyAuth } from "./auth.ts";
import { db, must } from "./db.ts";
import { fail } from "./http.ts";

// Accounts for people who buy photos in a group gallery. They are Supabase
// Auth users, marked buyer in app_metadata (which only the server can write).
// Signing in goes with a six-digit code by mail: the code proves the address,
// and only then does the browser get a one-time token to start its session.
// Someone can also set a password later, on Mijn foto's.
//
// A client of the studio can sign in the same way and buy with their portal
// account. The studio's own logins never get a code: they use their password.

export type GuestRow = { id: string; project_id: string; name: string; email: string; visits: number; downloads: number; last_seen_at: string; user_id: string | null; key?: string };

/** The signed-in account behind a request, when it is not the studio. */
export async function accountOf(c: Context): Promise<any | null> {
  const header = c.req.header("Authorization") ?? null;
  if (!header) return null;
  const user = await verifyAuth(header);
  if (!user || isAdminUser(user)) return null;
  return user;
}

export const accountName = (user: any) =>
  String(user?.user_metadata?.name || "").trim().slice(0, 120) || String(user?.email || "").split("@")[0].slice(0, 120) || "Koper";

/**
 * The account's guest row in a gallery: found by the account, else by its
 * (verified) address, else made. Hearts and children pointed out with the
 * same address come along.
 */
export async function guestForAccount(projectId: string, user: any): Promise<GuestRow> {
  const cols = "id, project_id, name, email, visits, downloads, last_seen_at, user_id";
  const email = String(user.email || "").toLowerCase();
  const byUser = must(await db.from("gallery_guests").select(cols).eq("project_id", projectId).eq("user_id", user.id).maybeSingle()) as GuestRow | null;
  if (byUser) return byUser;
  if (email) {
    const byEmail = must(await db.from("gallery_guests").select(cols).eq("project_id", projectId).eq("email", email).maybeSingle()) as GuestRow | null;
    if (byEmail) {
      must(await db.from("gallery_guests").update({ user_id: user.id }).eq("id", byEmail.id));
      return { ...byEmail, user_id: user.id };
    }
  }
  if (!email) fail(400, "Dit account heeft geen e-mailadres.");
  return must(await db.from("gallery_guests")
    .upsert({ project_id: projectId, email, name: accountName(user), user_id: user.id }, { onConflict: "project_id,email" })
    .select(cols).single()) as GuestRow;
}

/** Every guest row of an account, across galleries. */
export async function guestsOfAccount(userId: string): Promise<GuestRow[]> {
  return (must(await db.from("gallery_guests").select("id, project_id, name, email, visits, downloads, last_seen_at, user_id").eq("user_id", userId)) || []) as GuestRow[];
}

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

const CODE_MINUTES = 15;
const MAX_TRIES = 5;
const MAX_PER_HOUR = 5;
const RESEND_SECONDS = 30;

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const pepper = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "pdc";
const codeKey = async (email: string) => `account-code:${await sha256(email.toLowerCase())}`;

type CodeState = { hash: string; expires: number; tries: number; sent: number[] };

async function readState(key: string): Promise<CodeState | null> {
  let raw: unknown = await kv.get(key);
  while (typeof raw === "string") raw = JSON.parse(raw);
  return raw && typeof raw === "object" ? raw as CodeState : null;
}

/** A fresh code for this address, or a 429 when it asked too often. */
export async function newCode(email: string): Promise<string> {
  const key = await codeKey(email);
  const state = await readState(key);
  const now = Date.now();
  const recent = (state?.sent || []).filter((t) => now - t < 3600_000);
  if (recent.length && now - recent[recent.length - 1] < RESEND_SECONDS * 1000) {
    fail(429, "Je hebt net een code gekregen. Wacht een halve minuut en probeer het dan opnieuw.");
  }
  if (recent.length >= MAX_PER_HOUR) fail(429, "Je hebt al een paar codes gevraagd. Probeer het over een uur opnieuw.");
  // Uniform over 000000 to 999999: values past the last whole million are drawn again.
  let n = 0;
  do n = crypto.getRandomValues(new Uint32Array(1))[0]; while (n >= 4_294_000_000);
  const code = String(n % 1_000_000).padStart(6, "0");
  await kv.set(key, JSON.stringify({
    hash: await sha256(`${email.toLowerCase()}:${code}:${pepper()}`),
    expires: now + CODE_MINUTES * 60_000,
    tries: 0,
    sent: [...recent, now],
  } satisfies CodeState));
  return code;
}

/** Checks a code; it works once. */
export async function checkCode(email: string, code: string): Promise<void> {
  const key = await codeKey(email);
  const state = await readState(key);
  if (!state || state.expires < Date.now() || !state.hash) fail(400, "Deze code is verlopen. Vraag een nieuwe aan.");
  if (state.tries >= MAX_TRIES) fail(429, "Te vaak een verkeerde code. Vraag een nieuwe aan.");
  const ok = (await sha256(`${email.toLowerCase()}:${code.trim()}:${pepper()}`)) === state.hash;
  if (!ok) {
    await kv.set(key, JSON.stringify({ ...state, tries: state.tries + 1 }));
    fail(400, state.tries + 1 >= MAX_TRIES ? "Te vaak een verkeerde code. Vraag een nieuwe aan." : "Deze code klopt niet. Kijk hem nog eens na.");
  }
  // Used: it cannot sign in a second time. The send times stay, for the limit.
  await kv.set(key, JSON.stringify({ ...state, hash: "", expires: 0 }));
}

/** CODE_MINUTES, for the mail. */
export const codeMinutes = CODE_MINUTES;

/**
 * The account for a verified address: the one that is there, or a new buyer
 * account. An account nobody confirmed yet gets a fresh random password, so a
 * password someone else set for this address before can never sign in.
 * Returns a one-time token the browser turns into its session.
 */
export async function sessionTokenFor(email: string, name: string): Promise<{ tokenHash: string; created: boolean }> {
  const found = ((must(await db.rpc("auth_user_by_email", { p_email: email })) || []) as { id: string; confirmed: boolean }[])[0];
  let created = false;
  if (!found) {
    const { error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: name || email.split("@")[0] },
      app_metadata: { buyer: true },
    });
    if (error) fail(500, "Je account kon niet worden gemaakt. Probeer het zo opnieuw.");
    created = true;
  } else {
    const { data } = await db.auth.admin.getUserById(found.id);
    const user = data?.user;
    if (!user) fail(500, "Je account kon niet worden geladen. Probeer het zo opnieuw.");
    if (isAdminUser(user)) fail(403, "Log met je wachtwoord in bij de studio.");
    if (!found.confirmed) {
      const random = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
      await db.auth.admin.updateUserById(found.id, { email_confirm: true, password: random });
    }
    if (name && !user.user_metadata?.name) await db.auth.admin.updateUserById(found.id, { user_metadata: { ...user.user_metadata, name } });
  }
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = (data as any)?.properties?.hashed_token;
  if (error || !tokenHash) fail(500, "Inloggen lukte niet. Probeer het zo opnieuw.");
  return { tokenHash, created };
}

/** A buyer account is only a buyer: no client of the studio, not the studio itself. */
export async function isBuyerOnly(user: any): Promise<boolean> {
  if (isAdminUser(user)) return false;
  const byUser = must(await db.from("clients").select("id").eq("user_id", user.id).limit(1)) as any[];
  if (byUser.length) return false;
  const email = String(user.email || "").toLowerCase();
  if (!email) return true;
  // The address as typed, case aside: % and _ would otherwise match anything.
  const byEmail = must(await db.from("clients").select("id").ilike("email", email.replace(/[\\%_]/g, (ch) => `\\${ch}`)).limit(1)) as any[];
  return byEmail.length === 0;
}
