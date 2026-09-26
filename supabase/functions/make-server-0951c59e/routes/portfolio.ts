import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { verifyAdmin } from "../lib/auth.ts";


const r = new Hono();
export default r;

// ============================================================================
// PORTFOLIO ENDPOINTS
// ============================================================================

// --- GET /portfolio — list all published portfolio articles ---
r.get("/make-server-0951c59e/portfolio", async (c) => {
  try {
    const allIdsStr = await kv.get("portfolio:articleIds");
    if (!allIdsStr) return c.json({ articles: [] });

    const allIds = JSON.parse(allIdsStr) as string[];
    const values = await Promise.all(
      allIds.map((id) => kv.get(`portfolio:article:${id}`))
    );

    const articles = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .filter((a) => a.published)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ articles });
  } catch (err) {
    console.log("Get portfolio error:", err);
    return c.json({ error: `Failed to fetch portfolio: ${err}` }, 500);
  }
});

// --- GET /portfolio/:id — get single portfolio article ---
r.get("/make-server-0951c59e/portfolio/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const articleStr = await kv.get(`portfolio:article:${id}`);
    if (!articleStr) return c.json({ error: "Article not found" }, 404);

    const article = JSON.parse(articleStr);
    if (!article.published) return c.json({ error: "Article not found" }, 404);

    return c.json({ article });
  } catch (err) {
    console.log("Get portfolio article error:", err);
    return c.json({ error: `Failed to fetch article: ${err}` }, 500);
  }
});

// --- GET /admin/portfolio — list ALL portfolio articles (including unpublished) ---
r.get("/make-server-0951c59e/admin/portfolio", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const allIdsStr = await kv.get("portfolio:articleIds");
    if (!allIdsStr) return c.json({ articles: [] });

    const allIds = JSON.parse(allIdsStr) as string[];
    const values = await Promise.all(
      allIds.map((id) => kv.get(`portfolio:article:${id}`))
    );

    const articles = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ articles });
  } catch (err) {
    console.log("Admin get portfolio error:", err);
    return c.json({ error: `Failed to fetch portfolio: ${err}` }, 500);
  }
});

// --- GET /admin/portfolio/:id — get single portfolio article (admin, no publish check) ---
r.get("/make-server-0951c59e/admin/portfolio/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const articleStr = await kv.get(`portfolio:article:${id}`);
    if (!articleStr) return c.json({ error: "Article not found" }, 404);

    return c.json({ article: JSON.parse(articleStr) });
  } catch (err) {
    console.log("Admin get portfolio article error:", err);
    return c.json({ error: `Failed to fetch article: ${err}` }, 500);
  }
});

// --- POST /admin/portfolio — create new portfolio article ---
r.post("/make-server-0951c59e/admin/portfolio", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const { title, category, coverUrl, coverType, description, galleryUrls, published, featured } = await c.req.json();
    if (!title?.trim()) return c.json({ error: "Title is required" }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const article = {
      id,
      title: title.trim(),
      category: category?.trim() || "",
      coverUrl: coverUrl || "",
      coverType: coverType || "image",
      description: description?.trim() || "",
      galleryUrls: galleryUrls || [],
      published: published ?? false,
      featured: featured ?? false,
      createdAt: now,
      updatedAt: now,
      createdBy: {
        id: admin.id,
        email: admin.email,
        name: admin.user_metadata?.name || admin.email,
      },
      updatedBy: {
        id: admin.id,
        email: admin.email,
        name: admin.user_metadata?.name || admin.email,
      },
    };

    await kv.set(`portfolio:article:${id}`, JSON.stringify(article));

    const allIdsStr = await kv.get("portfolio:articleIds");
    const allIds = allIdsStr ? JSON.parse(allIdsStr) : [];
    allIds.push(id);
    await kv.set("portfolio:articleIds", JSON.stringify(allIds));

    return c.json({ article });
  } catch (err) {
    console.log("Admin create portfolio article error:", err);
    return c.json({ error: `Failed to create article: ${err}` }, 500);
  }
});

// --- PUT /admin/portfolio/:id — update portfolio article ---
r.put("/make-server-0951c59e/admin/portfolio/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const updates = await c.req.json();

    const articleStr = await kv.get(`portfolio:article:${id}`);
    if (!articleStr) return c.json({ error: "Article not found" }, 404);

    const existing = JSON.parse(articleStr);
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: {
        id: admin.id,
        email: admin.email,
        name: admin.user_metadata?.name || admin.email,
      },
    };

    await kv.set(`portfolio:article:${id}`, JSON.stringify(updated));
    return c.json({ article: updated });
  } catch (err) {
    console.log("Admin update portfolio article error:", err);
    return c.json({ error: `Failed to update article: ${err}` }, 500);
  }
});

// --- DELETE /admin/portfolio/:id — delete portfolio article ---
r.delete("/make-server-0951c59e/admin/portfolio/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const articleStr = await kv.get(`portfolio:article:${id}`);
    if (!articleStr) return c.json({ error: "Article not found" }, 404);

    await kv.del(`portfolio:article:${id}`);

    const allIdsStr = await kv.get("portfolio:articleIds");
    if (allIdsStr) {
      const allIds = JSON.parse(allIdsStr).filter((aid: string) => aid !== id);
      await kv.set("portfolio:articleIds", JSON.stringify(allIds));
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Admin delete portfolio article error:", err);
    return c.json({ error: `Failed to delete article: ${err}` }, 500);
  }
});

// ============================================================================
// AI WRITING ASSISTANT
// ============================================================================

// --- POST /admin/ai/generate-description — generate portfolio description ---
r.post("/make-server-0951c59e/admin/ai/generate-description", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const { title, category, keywords } = await c.req.json();
    if (!title) return c.json({ error: "Title is required" }, 400);

    // Simple AI-like description generator (can be replaced with actual AI API)
    const templates = [
      `${title} is a stunning ${category || 'visual'} project that showcases ${keywords || 'exceptional creativity and attention to detail'}. This work combines artistic vision with technical excellence to deliver a compelling visual narrative.`,
      `Explore ${title}, a ${category || 'captivating'} piece that demonstrates ${keywords || 'innovative approach and refined aesthetics'}. Every frame tells a story, crafted with precision and creative vision.`,
      `${title} represents ${category || 'visual storytelling'} at its finest. ${keywords ? `Featuring ${keywords}, this` : 'This'} project embodies the perfect balance between artistic expression and commercial appeal.`,
    ];

    const description = templates[Math.floor(Math.random() * templates.length)];

    return c.json({ description });
  } catch (err) {
    console.log("AI generate description error:", err);
    return c.json({ error: `Failed to generate description: ${err}` }, 500);
  }
});

