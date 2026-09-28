import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { hasPermission, verifyAdmin } from "../lib/auth.ts";
import { getPortalUser } from "../lib/people.ts";
import { computeQuarter, computeVatAmount, sanitizeFileName } from "../lib/util.ts";
import { db } from "../lib/db.ts";
import { PRIVATE_BUCKET, signPaths } from "../lib/storage.ts";


const r = new Hono();
export default r;

// ============================================================================
// DECLARATIONS ENDPOINTS
// ============================================================================

// --- GET /admin/declarations — list declarations (own only, unless viewAllDeclarations) ---
r.get("/make-server-0951c59e/admin/declarations", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const canViewAll = await hasPermission(admin, "viewAllDeclarations");

    const allIdsStr = await kv.get("declarations:declarationIds");
    const allIds: string[] = allIdsStr ? JSON.parse(allIdsStr) : [];
    const values = await Promise.all(allIds.map((id) => kv.get(`declarations:declaration:${id}`)));
    let declarations = values.filter(Boolean).map((v) => JSON.parse(v as string));

    if (!canViewAll) {
      declarations = declarations.filter((d) => d.adminId === admin.id);
    }

    const quarter = c.req.query("quarter");
    if (quarter) {
      declarations = declarations.filter((d) => computeQuarter(d.date) === quarter);
    }
    const category = c.req.query("category");
    if (category) {
      declarations = declarations.filter((d) => d.category === category);
    }
    const adminIdFilter = canViewAll ? c.req.query("adminId") : null;
    if (adminIdFilter) {
      declarations = declarations.filter((d) => d.adminId === adminIdFilter);
    }

    declarations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Receipts uploaded since the move to private storage are stored as
    // "private:<path>" and get a short-lived link here.
    const signed = await signPaths(declarations.map((d) => String(d.receiptUrl || "")).filter((u) => u.startsWith(PRIVATE_PREFIX)).map((u) => u.slice(PRIVATE_PREFIX.length)));
    declarations = declarations.map((d) => ({
      ...d,
      receiptRef: d.receiptUrl || "",
      receiptUrl: String(d.receiptUrl || "").startsWith(PRIVATE_PREFIX) ? signed.get(d.receiptUrl.slice(PRIVATE_PREFIX.length)) || "" : d.receiptUrl || "",
      vatRate: d.vatRate ?? 21,
      vatAmount: computeVatAmount(Number(d.amount) || 0, d.vatRate ?? 21),
    }));

    const totalAmount = declarations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalVat = declarations.reduce((sum, d) => sum + d.vatAmount, 0);
    const byCategory: Record<string, number> = {};
    for (const d of declarations) {
      byCategory[d.category] = (byCategory[d.category] || 0) + (Number(d.amount) || 0);
    }

    return c.json({
      declarations,
      canViewAll,
      totals: { amount: totalAmount, vatAmount: Math.round(totalVat * 100) / 100, count: declarations.length, byCategory },
    });
  } catch (err) {
    console.log("Get declarations error:", err);
    return c.json({ error: `Failed to fetch declarations: ${err}` }, 500);
  }
});

const PRIVATE_PREFIX = "private:";

// --- POST /admin/declarations/receipt — store a receipt privately ---
r.post("/make-server-0951c59e/admin/declarations/receipt", async (c) => {
  const admin = await verifyAdmin(c.req.header("Authorization"));
  if (!admin) return c.json({ error: "Unauthorized" }, 401);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "Kies een bestand." }, 400);
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"].includes(file.type)) {
    return c.json({ error: "Upload een foto of pdf van het bonnetje." }, 400);
  }
  const path = `receipts/${admin.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFileName(file.name)}`;
  const { error } = await db.storage.from(PRIVATE_BUCKET).upload(path, file, { contentType: file.type });
  if (error) return c.json({ error: "Het bonnetje kon niet worden opgeslagen." }, 500);
  return c.json({ receiptRef: PRIVATE_PREFIX + path });
});

// --- POST /admin/declarations — submit a declaration ---
r.post("/make-server-0951c59e/admin/declarations", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const canViewAll = await hasPermission(admin, "viewAllDeclarations");
    const body = await c.req.json();
    const { amount, date, category, description, receiptUrl, vatRate } = body;

    if (!amount || !date || !category) {
      return c.json({ error: "Bedrag, datum en categorie zijn verplicht" }, 400);
    }

    // Only CFO-type roles (viewAllDeclarations) may submit on behalf of someone else.
    let adminId = admin.id;
    let adminName = admin.user_metadata?.name || admin.email;
    if (canViewAll && body.adminId && body.adminId !== admin.id) {
      const target = await getPortalUser(body.adminId);
      if (target) {
        adminId = body.adminId;
        adminName = target.name;
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const declaration = {
      id,
      adminId,
      adminName,
      amount: Number(amount),
      date,
      category,
      description: description?.trim() || "",
      receiptUrl: receiptUrl || "",
      vatRate: vatRate === undefined || vatRate === null || vatRate === "" ? 21 : Number(vatRate),
      submittedBy: { id: admin.id, name: admin.user_metadata?.name || admin.email },
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(`declarations:declaration:${id}`, JSON.stringify(declaration));

    const idsStr = await kv.get("declarations:declarationIds");
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.push(id);
    await kv.set("declarations:declarationIds", JSON.stringify(ids));

    return c.json({ declaration });
  } catch (err) {
    console.log("Create declaration error:", err);
    return c.json({ error: `Failed to create declaration: ${err}` }, 500);
  }
});

// --- PUT /admin/declarations/:id — edit a declaration (own, or any with viewAllDeclarations) ---
r.put("/make-server-0951c59e/admin/declarations/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const existingStr = await kv.get(`declarations:declaration:${id}`);
    if (!existingStr) return c.json({ error: "Declaratie niet gevonden" }, 404);
    const existing = JSON.parse(existingStr);

    const canViewAll = await hasPermission(admin, "viewAllDeclarations");
    if (existing.adminId !== admin.id && !canViewAll) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const updates = await c.req.json();
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      adminId: existing.adminId,
      submittedBy: existing.submittedBy,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    // A short-lived signed link sent back by a screen must not replace the
    // stored reference to a private receipt; neither may the listing's extras.
    if (typeof updates.receiptUrl === "string" && updates.receiptUrl.includes("/object/sign/")) updated.receiptUrl = existing.receiptUrl;
    delete updated.receiptRef;
    delete updated.vatAmount;
    if (updates.amount !== undefined) updated.amount = Number(updates.amount);
    if (updates.vatRate !== undefined) updated.vatRate = Number(updates.vatRate);
    await kv.set(`declarations:declaration:${id}`, JSON.stringify(updated));

    return c.json({ declaration: updated });
  } catch (err) {
    console.log("Update declaration error:", err);
    return c.json({ error: `Failed to update declaration: ${err}` }, 500);
  }
});

// --- DELETE /admin/declarations/:id — delete a declaration (own, or any with viewAllDeclarations) ---
r.delete("/make-server-0951c59e/admin/declarations/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const existingStr = await kv.get(`declarations:declaration:${id}`);
    if (!existingStr) return c.json({ error: "Declaratie niet gevonden" }, 404);
    const existing = JSON.parse(existingStr);

    const canViewAll = await hasPermission(admin, "viewAllDeclarations");
    if (existing.adminId !== admin.id && !canViewAll) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await kv.del(`declarations:declaration:${id}`);
    const idsStr = await kv.get("declarations:declarationIds");
    if (idsStr) {
      const ids = JSON.parse(idsStr).filter((did: string) => did !== id);
      await kv.set("declarations:declarationIds", JSON.stringify(ids));
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Delete declaration error:", err);
    return c.json({ error: `Failed to delete declaration: ${err}` }, 500);
  }
});

