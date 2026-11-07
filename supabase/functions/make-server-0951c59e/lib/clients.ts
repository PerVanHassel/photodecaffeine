import type { Context } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { hasPermission, isAdminUser } from "./auth.ts";
import { db, must } from "./db.ts";
import { fail } from "./http.ts";

export type ClientRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export function clientToApi(c: ClientRow, extra: Record<string, unknown> = {}) {
  return {
    id: c.id,
    userId: c.user_id,
    hasAccount: Boolean(c.user_id),
    name: c.name || c.email,
    email: c.email,
    company: c.company,
    phone: c.phone,
    notes: c.notes,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    ...extra,
  };
}

/** The client record behind a portal login, created on first use if missing. */
export async function clientForUser(user: any): Promise<ClientRow> {
  const existing = must(await db.from("clients").select("*").eq("user_id", user.id).maybeSingle()) as ClientRow | null;
  if (existing) return existing;

  // A client made by the studio before this person signed up is matched by
  // email and linked; otherwise the login gets a fresh record.
  const email = String(user.email || "").toLowerCase();
  if (email) {
    const byEmail = must(await db.from("clients").select("*").ilike("email", email).is("user_id", null).maybeSingle()) as ClientRow | null;
    if (byEmail) {
      return must(await db.from("clients").update({ user_id: user.id }).eq("id", byEmail.id).select("*").single()) as ClientRow;
    }
  }
  return must(await db.from("clients").insert({
    id: user.id,
    user_id: user.id,
    email,
    name: user.user_metadata?.name || email,
    company: user.user_metadata?.company || "",
  }).select("*").single()) as ClientRow;
}

// ---------------------------------------------------------------------------
// Looking along as a client
// ---------------------------------------------------------------------------
// The studio can open the portal as any client ("Bekijk als klant" on the
// client page). Its requests then carry X-View-As with that client's id. That
// only reads: looking never changes a real client's portal (no messages marked
// read, no favourites). A test client is the exception: there everything works,
// to try the portal out from start to end.

const TEST_CLIENTS = "portal:test-clients";

/** The clients marked as test clients, kept with the settings. */
export async function testClientIds(): Promise<Set<string>> {
  let raw: unknown = await kv.get(TEST_CLIENTS);
  while (typeof raw === "string") raw = JSON.parse(raw);
  return new Set(Array.isArray(raw) ? raw.map(String) : []);
}

export async function setTestClient(id: string, on: boolean): Promise<void> {
  const ids = await testClientIds();
  if (on) ids.add(id);
  else ids.delete(id);
  await kv.set(TEST_CLIENTS, JSON.stringify([...ids]));
}

/** The studio is looking along as a client on this request. */
export const viewingAs = (c: Context) => Boolean(c.req.header("X-View-As"));

/**
 * The client a portal request is for: the signed-in client, or for the studio
 * the client it looks along as. Writing that way only works for a test client.
 */
export async function portalClient(c: Context, user: any): Promise<ClientRow> {
  const id = c.req.header("X-View-As") || "";
  if (!id) return clientForUser(user);
  if (!isAdminUser(user) || !(await hasPermission(user, "manageClients"))) fail(403, "Alleen de studio kan meekijken als klant.");
  const client = must(await db.from("clients").select("*").eq("id", id).maybeSingle()) as ClientRow | null;
  if (!client) fail(404, "Deze klant bestaat niet (meer).");
  if (c.req.method !== "GET" && !(await testClientIds()).has(client.id)) {
    fail(403, "Dit is een voorbeeld, dus er wordt niets opgeslagen. Wil je het echt uitproberen? Zet de klant dan op testklant.");
  }
  return client;
}

/** Project ids the client is attached to. */
export async function projectIdsForClient(clientId: string): Promise<string[]> {
  const rows = must(await db.from("project_clients").select("project_id").eq("client_id", clientId)) || [];
  return rows.map((r: any) => r.project_id);
}

/** Emails of every client on a project that can receive mail. */
export async function projectRecipients(projectId: string): Promise<{ id: string; name: string; email: string }[]> {
  const rows = must(await db.from("project_clients").select("clients ( id, name, email )").eq("project_id", projectId).order("position")) || [];
  return rows.map((r: any) => r.clients).filter((c: any) => c?.email).map((c: any) => ({ id: c.id, name: c.name || c.email, email: c.email }));
}
