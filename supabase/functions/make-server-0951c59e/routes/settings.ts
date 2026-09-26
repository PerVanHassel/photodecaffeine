import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { verifyAdmin } from "../lib/auth.ts";


const r = new Hono();
export default r;

// ============================================================================
// SITE SETTINGS ENDPOINTS
// ============================================================================

// --- GET /settings — get public site settings ---
r.get("/make-server-0951c59e/settings", async (c) => {
  try {
    const settingsStr = await kv.get("site:settings");
    if (!settingsStr) {
      return c.json({
        settings: {
          heroImageUrl: "",
          heroImageMobileUrl: "",
        },
      });
    }
    // Who edited last and the invoice details are for the admin only.
    const { updatedBy: _by, business: _business, ...publicSettings } = JSON.parse(settingsStr);
    return c.json({ settings: publicSettings });
  } catch (err) {
    console.log("Get settings error:", err);
    return c.json({ error: `Failed to fetch settings: ${err}` }, 500);
  }
});

// --- GET /admin/settings — everything, including the invoice details ---
r.get("/make-server-0951c59e/admin/settings", async (c) => {
  const admin = await verifyAdmin(c.req.header("Authorization"));
  if (!admin) return c.json({ error: "Unauthorized" }, 401);
  const settingsStr = await kv.get("site:settings");
  return c.json({ settings: settingsStr ? JSON.parse(settingsStr) : {} });
});

// --- PUT /admin/settings — update site settings ---
r.put("/make-server-0951c59e/admin/settings", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const updates = await c.req.json();
    const existingStr = await kv.get("site:settings");
    const existing = existingStr ? JSON.parse(existingStr) : {};

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: {
        id: admin.id,
        email: admin.email,
        name: admin.user_metadata?.name || admin.email,
      },
    };

    await kv.set("site:settings", JSON.stringify(updated));
    return c.json({ settings: updated });
  } catch (err) {
    console.log("Update settings error:", err);
    return c.json({ error: `Failed to update settings: ${err}` }, 500);
  }
});

