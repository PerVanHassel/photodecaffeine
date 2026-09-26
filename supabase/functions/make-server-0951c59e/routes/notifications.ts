import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { verifyAdmin } from "../lib/auth.ts";
import { notificationItems } from "../lib/notify.ts";


const r = new Hono();
export default r;

// ============================================================================

// --- GET /admin/notifications ---
r.get("/make-server-0951c59e/admin/notifications", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const items = await notificationItems();
    const readAt = (await kv.get(`notifications:read:${admin.id}`)) || "";
    const unread = readAt
      ? items.filter((n: any) => new Date(n.createdAt).getTime() > new Date(readAt).getTime()).length
      : items.length;

    return c.json({ notifications: items, unread, readAt });
  } catch (err) {
    console.log("Get notifications error:", err);
    return c.json({ error: `Meldingen ophalen mislukt: ${err}` }, 500);
  }
});

// --- POST /admin/notifications/read — everything up to now is seen ---
r.post("/make-server-0951c59e/admin/notifications/read", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    await kv.set(`notifications:read:${admin.id}`, new Date().toISOString());
    return c.json({ success: true, unread: 0 });
  } catch (err) {
    console.log("Mark notifications read error:", err);
    return c.json({ error: `Markeren als gelezen mislukt: ${err}` }, 500);
  }
});

// --- DELETE /admin/notifications — clear the list ---
r.delete("/make-server-0951c59e/admin/notifications", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    await kv.set("notifications:items", JSON.stringify([]));
    await kv.set(`notifications:read:${admin.id}`, new Date().toISOString());
    return c.json({ success: true });
  } catch (err) {
    console.log("Clear notifications error:", err);
    return c.json({ error: `Meldingen wissen mislukt: ${err}` }, 500);
  }
});

// --- DELETE /admin/notifications/:id — drop one ---
r.delete("/make-server-0951c59e/admin/notifications/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const items = await notificationItems();
    await kv.set("notifications:items", JSON.stringify(items.filter((n: any) => n.id !== id)));
    return c.json({ success: true });
  } catch (err) {
    console.log("Delete notification error:", err);
    return c.json({ error: `Melding verwijderen mislukt: ${err}` }, 500);
  }
});

