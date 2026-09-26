import { db, must } from "./db.ts";

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
