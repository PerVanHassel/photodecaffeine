import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "../kv_store.tsx";
import { DEFAULT_ROLES, OWNER_EMAIL } from "./config.ts";

// Ensures the seeded CEO/CFO/COO roles exist, returning the full role list.
// Runs once (idempotent — only seeds when the roles collection is empty), so
// roles created/edited by the owner afterwards are never overwritten.
export async function ensureDefaultRoles(): Promise<any[]> {
  const idsStr = await kv.get("roles:roleIds");
  const ids: string[] = idsStr ? JSON.parse(idsStr) : [];
  if (ids.length > 0) {
    const values = await Promise.all(ids.map((id) => kv.get(`roles:role:${id}`)));
    return values.filter(Boolean).map((v) => JSON.parse(v as string));
  }

  const now = new Date().toISOString();
  const seeded = DEFAULT_ROLES.map((r) => ({
    id: crypto.randomUUID(),
    name: r.name,
    permissions: r.permissions,
    createdAt: now,
    updatedAt: now,
  }));
  await Promise.all(seeded.map((r) => kv.set(`roles:role:${r.id}`, JSON.stringify(r))));
  await kv.set("roles:roleIds", JSON.stringify(seeded.map((r) => r.id)));
  return seeded;
}

export async function getRole(roleId: string | undefined | null): Promise<any | null> {
  if (!roleId) return null;
  const s = await kv.get(`roles:role:${roleId}`);
  return s ? JSON.parse(s) : null;
}

// Owner bypasses the roles table entirely and always has every permission.
// Everyone else needs a roleId pointing at a role that grants it.
export async function hasPermission(user: any, permission: string): Promise<boolean> {
  if (user.email === OWNER_EMAIL) return true;
  const role = await getRole(roleIdOf(user));
  return !!role?.permissions?.[permission];
}

// --- Auth helpers ---
// Admin status and role live in app_metadata. user_metadata is writable by the
// user themselves (supabase.auth.updateUser), so nothing there may grant access.
export function isAdminUser(user: any): boolean {
  return user?.app_metadata?.role === "admin" || user?.email === OWNER_EMAIL;
}

export function roleIdOf(user: any): string | null {
  return user?.app_metadata?.roleId || null;
}

export async function verifyAuth(authHeader: string | null) {
  const token = authHeader?.split(" ")[1];
  if (!token) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function verifyAdmin(authHeader: string | null) {
  const user = await verifyAuth(authHeader);
  return user && isAdminUser(user) ? user : null;
}
