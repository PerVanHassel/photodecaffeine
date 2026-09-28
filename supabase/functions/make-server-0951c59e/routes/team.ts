import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "../kv_store.tsx";
import { ensureDefaultRoles, getRole, hasPermission, isAdminUser, roleIdOf, verifyAdmin } from "../lib/auth.ts";
import { DEFAULT_ROLES, OWNER_EMAIL } from "../lib/config.ts";
import { passwordProblem } from "../lib/passwords.ts";


const r = new Hono();
export default r;

// ============================================================================
// WORKERS / ADMIN USERS MANAGEMENT
// ============================================================================

// --- GET /admin/workers — get all admin users, with their role + permissions ---
r.get("/make-server-0951c59e/admin/workers", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get all users via REST API
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to fetch users");
    }

    const data = await res.json();
    const users = data.users || [];
    const roles = await ensureDefaultRoles();
    const roleById = new Map(roles.map((r) => [r.id, r]));

    // Filter only admin users (owner included even if their metadata role tag ever drifts)
    const workers = users
      .filter((u: any) => isAdminUser(u))
      .map((u: any) => {
        const isOwner = u.email === OWNER_EMAIL;
        const role = isOwner ? null : roleById.get(roleIdOf(u));
        return {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || u.email,
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
          isOwner,
          roleId: isOwner ? null : roleIdOf(u),
          roleName: isOwner ? "Eigenaar" : (role?.name || "Geen rol"),
          permissions: isOwner ? null : (role?.permissions || {}),
        };
      });

    return c.json({ workers, roles });
  } catch (err) {
    console.log("Get workers error:", err);
    return c.json({ error: `Failed to fetch workers: ${err}` }, 500);
  }
});

// --- POST /admin/workers — create a new admin account (requires manageAdmins permission) ---
r.post("/make-server-0951c59e/admin/workers", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (!(await hasPermission(admin, "manageAdmins"))) {
      return c.json({ error: "Je hebt geen rechten om admins toe te voegen" }, 403);
    }

    const { email, password, name, roleId } = await c.req.json();
    if (!email?.trim() || !password || !roleId) {
      return c.json({ error: "E-mail, wachtwoord en rol zijn verplicht" }, 400);
    }
    const role = await getRole(roleId);
    if (!role) return c.json({ error: "Onbekende rol" }, 400);

    const workerPwProblem = await passwordProblem(password);
    if (workerPwProblem) return c.json({ error: workerPwProblem }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        user_metadata: { name: name?.trim() || email.trim() },
        app_metadata: { role: "admin", roleId },
        email_confirm: true,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.log("Create admin error:", JSON.stringify(createData));
      return c.json({ error: createData.message || createData.msg || "Aanmaken admin mislukt" }, 400);
    }

    return c.json({ success: true, userId: createData.id });
  } catch (err) {
    console.log("Create admin unexpected error:", err);
    return c.json({ error: `Failed to create admin: ${err}` }, 500);
  }
});

// --- PUT /admin/workers/:id/role — assign a role to an admin (requires manageAdmins permission) ---
r.put("/make-server-0951c59e/admin/workers/:id/role", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (!(await hasPermission(admin, "manageAdmins"))) {
      return c.json({ error: "Je hebt geen rechten om rollen te wijzigen" }, 403);
    }

    const targetId = c.req.param("id");
    const { roleId } = await c.req.json();
    if (!roleId) return c.json({ error: "roleId is verplicht" }, 400);

    const role = await getRole(roleId);
    if (!role) return c.json({ error: "Onbekende rol" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { data: { user: target }, error: lookupError } = await createClient(supabaseUrl, serviceKey).auth.admin.getUserById(targetId);
    if (lookupError || !target) return c.json({ error: "Admin niet gevonden" }, 404);
    if (target.email === OWNER_EMAIL) {
      return c.json({ error: "De rol van de eigenaar kan niet worden gewijzigd" }, 403);
    }

    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        app_metadata: { role: "admin", roleId },
      }),
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      return c.json({ error: updateData.message || "Rol wijzigen mislukt" }, 400);
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Assign role error:", err);
    return c.json({ error: `Failed to assign role: ${err}` }, 500);
  }
});

// --- DELETE /admin/workers/:id — revoke admin access (requires manageAdmins permission) ---
r.delete("/make-server-0951c59e/admin/workers/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (!(await hasPermission(admin, "manageAdmins"))) {
      return c.json({ error: "Je hebt geen rechten om admins te verwijderen" }, 403);
    }

    const targetId = c.req.param("id");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { data: { user: target }, error: lookupError } = await createClient(supabaseUrl, serviceKey).auth.admin.getUserById(targetId);
    if (lookupError || !target) return c.json({ error: "Admin niet gevonden" }, 404);
    if (target.email === OWNER_EMAIL) {
      return c.json({ error: "De eigenaar kan niet worden verwijderd" }, 403);
    }

    // Revoke admin access by clearing the role/roleId tags — keeps the auth
    // account intact (they simply become a regular, non-admin user) rather
    // than destructively deleting it. app_metadata is merged, so null clears.
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ app_metadata: { role: null, roleId: null } }),
    });
    if (!updateRes.ok) {
      const errData = await updateRes.json();
      return c.json({ error: errData.message || "Verwijderen mislukt" }, 400);
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Remove admin error:", err);
    return c.json({ error: `Failed to remove admin: ${err}` }, 500);
  }
});

// ============================================================================
// ROLES ENDPOINTS
// ============================================================================

// --- GET /admin/roles — list roles (any admin — needed to render role badges) ---
r.get("/make-server-0951c59e/admin/roles", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const roles = await ensureDefaultRoles();
    return c.json({ roles });
  } catch (err) {
    console.log("Get roles error:", err);
    return c.json({ error: `Failed to fetch roles: ${err}` }, 500);
  }
});

// --- POST /admin/roles — create a role (requires manageAdmins permission) ---
r.post("/make-server-0951c59e/admin/roles", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (!(await hasPermission(admin, "manageAdmins"))) {
      return c.json({ error: "Je hebt geen rechten om rollen te beheren" }, 403);
    }

    const { name, permissions } = await c.req.json();
    if (!name?.trim()) return c.json({ error: "Naam is verplicht" }, 400);

    const now = new Date().toISOString();
    const role = {
      id: crypto.randomUUID(),
      name: name.trim(),
      permissions: permissions || {},
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(`roles:role:${role.id}`, JSON.stringify(role));

    const idsStr = await kv.get("roles:roleIds");
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.push(role.id);
    await kv.set("roles:roleIds", JSON.stringify(ids));

    return c.json({ role });
  } catch (err) {
    console.log("Create role error:", err);
    return c.json({ error: `Failed to create role: ${err}` }, 500);
  }
});

// --- PUT /admin/roles/:id — update a role's name/permissions (requires manageAdmins permission) ---
r.put("/make-server-0951c59e/admin/roles/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (!(await hasPermission(admin, "manageAdmins"))) {
      return c.json({ error: "Je hebt geen rechten om rollen te beheren" }, 403);
    }

    const id = c.req.param("id");
    const existing = await getRole(id);
    if (!existing) return c.json({ error: "Rol niet gevonden" }, 404);

    const updates = await c.req.json();
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`roles:role:${id}`, JSON.stringify(updated));

    return c.json({ role: updated });
  } catch (err) {
    console.log("Update role error:", err);
    return c.json({ error: `Failed to update role: ${err}` }, 500);
  }
});

// --- DELETE /admin/roles/:id — delete a role (requires manageAdmins permission) ---
r.delete("/make-server-0951c59e/admin/roles/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (!(await hasPermission(admin, "manageAdmins"))) {
      return c.json({ error: "Je hebt geen rechten om rollen te beheren" }, 403);
    }

    const id = c.req.param("id");

    // Block deletion while any admin still has this role — force a
    // reassignment first so nobody silently ends up with no permissions.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });
    const listData = await listRes.json();
    const inUse = (listData.users || []).some((u: any) => roleIdOf(u) === id);
    if (inUse) {
      return c.json({ error: "Deze rol is nog toegewezen aan een admin. Wijs eerst een andere rol toe." }, 400);
    }

    await kv.del(`roles:role:${id}`);
    const idsStr = await kv.get("roles:roleIds");
    if (idsStr) {
      const ids = JSON.parse(idsStr).filter((rid: string) => rid !== id);
      await kv.set("roles:roleIds", JSON.stringify(ids));
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Delete role error:", err);
    return c.json({ error: `Failed to delete role: ${err}` }, 500);
  }
});


// --- GET /admin/me — who is signed in and what their role allows ---
// The admin uses this to hide what a role cannot open; the server still
// checks every request on its own.
r.get("/make-server-0951c59e/admin/me", async (c) => {
  const admin = await verifyAdmin(c.req.header("Authorization"));
  if (!admin) return c.json({ error: "Unauthorized" }, 401);
  const isOwner = admin.email === OWNER_EMAIL;
  const role = isOwner ? null : await getRole(roleIdOf(admin));
  const all = Object.keys(DEFAULT_ROLES[0].permissions);
  const permissions = Object.fromEntries(all.map((p) => [p, isOwner || !!role?.permissions?.[p]]));
  return c.json({
    id: admin.id,
    email: admin.email,
    name: admin.user_metadata?.name || admin.email,
    isOwner,
    roleName: isOwner ? "Eigenaar" : role?.name || "Geen rol",
    permissions,
  });
});
