import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// --- Email ---
const EMAIL_FROM = "PhotoDeCaffeine <noreply@photodecaffeine.com>";
const EMAIL_ADMIN_NOTIFY = "contact@photodecaffeine.com";
const SITE_URL = "https://www.photodecaffeine.com";

async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log("sendEmail: RESEND_API_KEY not set, skipping email send");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.log("sendEmail: Resend API error", res.status, errBody);
    }
  } catch (err) {
    console.log("sendEmail: failed to send", err);
  }
}

// Looks up a Supabase Auth user's email + display name by id. Used to notify
// clients by project.clientId, since project records only store the id.
async function getPortalUser(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return {
      email: data.user.email,
      name: data.user.user_metadata?.name || data.user.email,
    };
  } catch {
    return null;
  }
}

const EMAIL_LOGO_ROW = `
  <tr>
    <td style="padding:28px 36px 24px;border-bottom:1px solid rgba(255,251,224,0.08);">
      <img src="${SITE_URL}/email-logo.png" width="150" height="60" alt="PhotoDeCaffeine Productions" style="display:block;width:150px;height:60px;" />
    </td>
  </tr>`;

// Wraps a set of <tr> rows in the shared 560px dark card + logo header that
// every outgoing email uses.
function emailWrap(bodyRows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#0d0703;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${EMAIL_LOGO_ROW}${bodyRows}</table>`;
}

// A full-bleed photo card with a tinted "glass" panel over the bottom holding
// eyebrow/title/subtitle text, wrapped in a link. Falls back to a solid dark
// card (no photo) if imageUrl is omitted. Used for gallery-update, delivery,
// and portfolio-promo emails.
function glassImageCard(opts: {
  imageUrl?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Optional link text rendered inside the glass panel, under the title (e.g. "Bekijk in de portfolio →"). */
  ctaText?: string;
  accentColor?: string;
  linkUrl: string;
  topSpace?: number;
}): string {
  const accent = opts.accentColor || "#c8905a";
  const top = opts.topSpace ?? 180;
  const bg = opts.imageUrl
    ? `background="${opts.imageUrl}" bgcolor="#0d0703" style="background-image:url('${opts.imageUrl}');background-size:cover;background-position:center;"`
    : `bgcolor="#0d0703" style="background-color:#0d0703;"`;
  return `
    <tr>
      <td style="padding:0;">
        <a href="${opts.linkUrl}" style="display:block;text-decoration:none;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td ${bg}>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="height:${top}px;line-height:${top}px;font-size:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="background-color:rgba(8,4,1,0.82);padding:22px 30px 26px;">
                      <span style="color:${accent};font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">${opts.eyebrow}</span>
                      <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
                      <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${opts.title}</span>
                      ${opts.subtitle ? `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div><span style="color:rgba(255,251,224,0.5);font-size:12px;">${opts.subtitle}</span>` : ""}
                      ${opts.ctaText ? `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div><span style="color:${accent};font-size:11px;font-weight:700;letter-spacing:0.08em;">${opts.ctaText}</span>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </a>
      </td>
    </tr>`;
}

// Picks a portfolio piece to feature in the visitor-confirmation email:
// published, image-covered, not an internal/system entry (category
// starting with "_", e.g. the automotive-gallery placeholder). Prefers
// featured pieces, picks randomly among the pool for variety.
async function getPromoPortfolioArticle() {
  try {
    const allIdsStr = await kv.get("portfolio:articleIds");
    if (!allIdsStr) return null;
    const allIds = JSON.parse(allIdsStr) as string[];
    const values = await Promise.all(allIds.map((id) => kv.get(`portfolio:article:${id}`)));
    const articles = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .filter(
        (a) => a.published && a.coverType === "image" && a.coverUrl && !String(a.category || "").startsWith("_")
      );
    if (articles.length === 0) return null;
    const featured = articles.filter((a) => a.featured);
    const pool = featured.length > 0 ? featured : articles;
    return pool[Math.floor(Math.random() * pool.length)];
  } catch {
    return null;
  }
}

// --- Auth helpers ---
async function verifyAuth(authHeader: string | null) {
  if (!authHeader) {
    console.log("verifyAuth: no auth header");
    return null;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    console.log("verifyAuth: no token in header");
    return null;
  }
  console.log("verifyAuth: token received (first 20 chars):", token.substring(0, 20) + "...");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error) {
    console.log("verifyAuth: getUser error:", JSON.stringify(error));
    return null;
  }
  if (!user) {
    console.log("verifyAuth: no user returned");
    return null;
  }
  console.log("verifyAuth: user returned, id:", user.id);
  console.log("verifyAuth: user_metadata:", JSON.stringify(user.user_metadata));
  console.log("verifyAuth: role from metadata:", user.user_metadata?.role);
  return user;
}

async function verifyAdmin(authHeader: string | null) {
  const user = await verifyAuth(authHeader);
  if (!user) {
    console.log("verifyAdmin: auth failed - no user from verifyAuth");
    return null;
  }
  const userRole = user.user_metadata?.role;
  console.log("verifyAdmin: checking role, found:", userRole, "expected: admin");
  if (userRole !== "admin") {
    console.log("verifyAdmin: FAILED - user is not admin");
    return null;
  }
  console.log("verifyAdmin: SUCCESS - user is admin");
  return user;
}

// --- Storage bucket setup ---
app.post("/make-server-0951c59e/admin/storage/ensure-bucket", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const { bucketName } = await c.req.json();
    if (!bucketName) return c.json({ error: "bucketName is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if bucket exists using REST API
    const listRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    const buckets = await listRes.json();
    const exists = buckets?.some((b: any) => b.name === bucketName);

    if (!exists) {
      // Create bucket using REST API with RLS disabled
      const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          name: bucketName,
          public: true,
          file_size_limit: 52428800, // 50MB
          allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"],
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        console.log("Bucket creation failed:", errorData);
        throw new Error(errorData.message || "Failed to create bucket");
      }

      return c.json({ created: true, bucketName });
    }

    return c.json({ created: false, bucketName, message: "Bucket already exists" });
  } catch (err) {
    console.log("Bucket setup error:", err);
    return c.json({ error: `Failed to setup bucket: ${err}` }, 500);
  }
});

// Helper function to sanitize filename for storage
function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf(".");
  const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";

  // Sanitize the name part:
  // - Replace spaces with hyphens
  // - Remove or replace special characters (keep only alphanumeric, hyphens, underscores)
  // - Convert to lowercase for consistency
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "-")              // spaces to hyphens
    .replace(/['"`]/g, "")             // remove quotes and apostrophes
    .replace(/[[\](){}]/g, "")         // remove brackets and parentheses
    .replace(/[^a-z0-9._-]/g, "-")     // replace other special chars with hyphen
    .replace(/-+/g, "-")               // collapse multiple hyphens
    .replace(/^-|-$/g, "");            // remove leading/trailing hyphens

  return sanitized + ext.toLowerCase();
}

// --- Upload file to storage (server-side with service role) ---
app.post("/make-server-0951c59e/admin/storage/upload", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const bucketName = formData.get("bucketName") as string;

    if (!file || !bucketName) {
      return c.json({ error: "file and bucketName are required" }, 400);
    }

    // Sanitize the original filename to remove problematic characters
    const sanitizedOriginalName = sanitizeFileName(file.name);
    const fileName = `${Date.now()}-${sanitizedOriginalName}`;

    console.log("Upload file:", {
      original: file.name,
      sanitized: sanitizedOriginalName,
      final: fileName,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.log("Upload error:", error);
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    return c.json({ url: publicUrl, fileName });
  } catch (err) {
    console.log("Upload error:", err);
    return c.json({ error: `Upload failed: ${err}` }, 500);
  }
});

// --- POST /portal/signup ---
app.post("/make-server-0951c59e/portal/signup", async (c) => {
  try {
    const { email, password, name, company } = await c.req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use REST API directly to avoid SDK version parsing issues
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        email,
        password,
        user_metadata: { name: name || email, company: company || "" },
        email_confirm: true,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.log("Signup error:", JSON.stringify(createData));
      return c.json({ error: createData.message || createData.msg || "Signup failed" }, 400);
    }

    const userId = createData.id;

    // Initialize empty project list for new client
    await kv.set(`portal:client:${userId}:projectIds`, JSON.stringify([]));

    // Notify admin of the new signup
    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      subject: `Nieuwe klantaccount — ${name || email}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Nieuwe Klant</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${name || email}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);width:88px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">E-mail</td>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${email}</td>
              </tr>
              ${company ? `<tr><td style="padding:9px 0;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Bedrijf</td><td style="padding:9px 0;color:#fffbe0;font-size:13px;">${company}</td></tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 36px;">
            <a href="${SITE_URL}/admin/clients" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk klanten</a>
          </td>
        </tr>
      `),
    });

    return c.json({ success: true });
  } catch (err) {
    console.log("Signup unexpected error:", err);
    return c.json({ error: `Internal server error during signup: ${err}` }, 500);
  }
});

// --- GET /portal/projects ---
app.get("/make-server-0951c59e/portal/projects", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectIdsStr = await kv.get(`portal:client:${user.id}:projectIds`);
    if (!projectIdsStr) return c.json({ projects: [] });

    const projectIds = JSON.parse(projectIdsStr) as string[];
    const projectValues = await Promise.all(
      projectIds.map((id) => kv.get(`portal:project:${id}`))
    );
    const projects = projectValues
      .filter(Boolean)
      .map((v) => JSON.parse(v as string));

    return c.json({ projects });
  } catch (err) {
    console.log("Get projects error:", err);
    return c.json({ error: `Failed to fetch projects: ${err}` }, 500);
  }
});

// --- GET /portal/project/:id ---
app.get("/make-server-0951c59e/portal/project/:id", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (!projectStr) return c.json({ error: "Project not found" }, 404);

    const project = JSON.parse(projectStr);
    if (project.clientId !== user.id)
      return c.json({ error: "Unauthorized" }, 403);

    return c.json({ project });
  } catch (err) {
    console.log("Get project error:", err);
    return c.json({ error: `Failed to fetch project: ${err}` }, 500);
  }
});

// --- GET /portal/project/:id/messages ---
app.get("/make-server-0951c59e/portal/project/:id/messages", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");

    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (!projectStr) return c.json({ error: "Project not found" }, 404);
    const project = JSON.parse(projectStr);
    if (project.clientId !== user.id)
      return c.json({ error: "Unauthorized" }, 403);

    const messagesStr = await kv.get(`portal:project:${projectId}:messages`);
    const messages = messagesStr ? JSON.parse(messagesStr) : [];

    return c.json({ messages });
  } catch (err) {
    console.log("Get messages error:", err);
    return c.json({ error: `Failed to fetch messages: ${err}` }, 500);
  }
});

// --- POST /portal/project/:id/messages ---
app.post("/make-server-0951c59e/portal/project/:id/messages", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const { content } = await c.req.json();

    if (!content?.trim())
      return c.json({ error: "Message content is required" }, 400);

    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (!projectStr) return c.json({ error: "Project not found" }, 404);
    const project = JSON.parse(projectStr);
    if (project.clientId !== user.id)
      return c.json({ error: "Unauthorized" }, 403);

    const messagesStr = await kv.get(`portal:project:${projectId}:messages`);
    const messages = messagesStr ? JSON.parse(messagesStr) : [];

    const newMessage = {
      id: crypto.randomUUID(),
      projectId,
      senderId: user.id,
      senderName: user.user_metadata?.name || user.email || "Client",
      senderRole: "client",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    await kv.set(
      `portal:project:${projectId}:messages`,
      JSON.stringify(messages)
    );

    // Notify admin — clients otherwise only surface in the portal, which isn't checked daily
    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      subject: `${newMessage.senderName} heeft gereageerd — ${project.title}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Klant Reactie</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${newMessage.senderName}</span>
            <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${project.title}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${newMessage.content.replace(/\n/g, "<br>")}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 36px;">
            <a href="${SITE_URL}/admin/project/${projectId}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Open in admin</a>
          </td>
        </tr>
      `),
    });

    return c.json({ message: newMessage });
  } catch (err) {
    console.log("Post message error:", err);
    return c.json({ error: `Failed to send message: ${err}` }, 500);
  }
});

// =============================================================
// ADMIN ROUTES
// =============================================================

// --- POST /admin/signup — create admin account (requires ADMIN_SECRET) ---
app.post("/make-server-0951c59e/admin/signup", async (c) => {
  try {
    const { email, password, name, adminSecret } = await c.req.json();
    const expectedSecret = Deno.env.get("ADMIN_SECRET");
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return c.json({ error: "Invalid admin secret key" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use REST API directly to avoid SDK version parsing issues
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        email,
        password,
        user_metadata: { name: name || email, role: "admin" },
        email_confirm: true,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.log("Admin signup error:", JSON.stringify(createData));
      return c.json({ error: createData.message || createData.msg || "Admin signup failed" }, 400);
    }

    return c.json({ success: true, userId: createData.id });
  } catch (err) {
    console.log("Admin signup unexpected error:", err);
    return c.json({ error: `Internal error during admin signup: ${err}` }, 500);
  }
});

// --- GET /admin/clients — list all non-admin users ---
app.get("/make-server-0951c59e/admin/clients", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (error) return c.json({ error: `Failed to list users: ${error.message}` }, 500);

    const clients = data.users.filter(
      (u) => u.user_metadata?.role !== "admin"
    );

    const clientsWithMeta = await Promise.all(
      clients.map(async (client) => {
        const projectIdsStr = await kv.get(`portal:client:${client.id}:projectIds`);
        const projectIds = projectIdsStr ? JSON.parse(projectIdsStr) : [];
        return {
          id: client.id,
          email: client.email,
          name: client.user_metadata?.name || client.email,
          company: client.user_metadata?.company || "",
          projectCount: projectIds.length,
          createdAt: client.created_at,
          lastSignIn: client.last_sign_in_at,
        };
      })
    );

    // Sort newest first
    clientsWithMeta.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ clients: clientsWithMeta });
  } catch (err) {
    console.log("Admin get clients error:", err);
    return c.json({ error: `Failed to fetch clients: ${err}` }, 500);
  }
});

// --- GET /admin/auth/test — test endpoint to verify auth is working ---
app.get("/make-server-0951c59e/admin/auth/test", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    console.log("=== AUTH TEST ENDPOINT ===");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader) {
      return c.json({ error: "No auth header", authenticated: false }, 200);
    }

    const user = await verifyAuth(authHeader);
    if (!user) {
      return c.json({ error: "Token invalid", authenticated: false }, 200);
    }

    return c.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      isAdmin: user.user_metadata?.role === "admin",
      fullMetadata: user.user_metadata,
    });
  } catch (err) {
    console.log("Auth test error:", err);
    return c.json({ error: String(err), authenticated: false }, 200);
  }
});

// --- POST /admin/auth/check-user — check user status by email (requires ADMIN_SECRET) ---
app.post("/make-server-0951c59e/admin/auth/check-user", async (c) => {
  try {
    console.log("=== CHECK USER REQUEST ===");

    const { adminSecret, email } = await c.req.json();
    console.log("Email received:", email);
    console.log("Secret provided:", !!adminSecret);

    const expectedSecret = Deno.env.get("ADMIN_SECRET");
    console.log("Expected secret exists:", !!expectedSecret);

    if (!expectedSecret) {
      console.log("ERROR: ADMIN_SECRET not set in environment!");
      return c.json({ error: "Server configuration error: ADMIN_SECRET not set" }, 500);
    }

    if (!adminSecret || adminSecret !== expectedSecret) {
      console.log("ERROR: Secret mismatch");
      return c.json({ error: "Invalid admin secret key" }, 403);
    }

    if (!email) {
      console.log("ERROR: No email provided");
      return c.json({ error: "Email is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Supabase URL:", supabaseUrl);
    console.log("Service key exists:", !!serviceKey);

    // List all users and find by email
    console.log("Fetching users from Supabase...");
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    console.log("List users response status:", listRes.status);

    const listData = await listRes.json();
    if (!listRes.ok) {
      console.log("List users error:", JSON.stringify(listData));

      // Geef specifieke foutmelding bij 401
      if (listRes.status === 401) {
        return c.json({
          error: "Server configuratie fout: SUPABASE_SERVICE_ROLE_KEY is niet correct ingesteld. Controleer je Supabase Edge Function environment variables.",
          details: listData
        }, 500);
      }

      return c.json({ error: "Failed to list users from Supabase", details: listData }, 500);
    }

    console.log("Total users found:", listData.users?.length);

    const user = listData.users?.find((u: any) => u.email === email);
    if (!user) {
      console.log("User not found with email:", email);
      const allEmails = listData.users?.map((u: any) => u.email).join(", ");
      console.log("Available emails:", allEmails);
      return c.json({ error: `User not found with email: ${email}`, found: false }, 404);
    }

    console.log("User found:", user.id);
    console.log("User role:", user.user_metadata?.role);
    console.log("Is admin:", user.user_metadata?.role === "admin");

    return c.json({
      found: true,
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      isAdmin: user.user_metadata?.role === "admin",
      metadata: user.user_metadata,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.log("Check user error:", err);
    console.error("Full error:", err);
    return c.json({ error: `Failed to check user: ${err}` }, 500);
  }
});

// --- POST /admin/auth/fix-my-role — fix your own admin role using your session (requires ADMIN_SECRET) ---
app.post("/make-server-0951c59e/admin/auth/fix-my-role", async (c) => {
  try {
    console.log("=== FIX MY ROLE REQUEST ===");

    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    // Verify the user is authenticated
    const user = await verifyAuth(authHeader);
    if (!user) {
      return c.json({ error: "Invalid session token" }, 401);
    }

    console.log("Authenticated user:", user.id, user.email);
    console.log("Current role:", user.user_metadata?.role);

    const { adminSecret } = await c.req.json();
    const expectedSecret = Deno.env.get("ADMIN_SECRET");

    console.log("Secret provided:", !!adminSecret);
    console.log("Expected secret exists:", !!expectedSecret);

    if (!expectedSecret || adminSecret !== expectedSecret) {
      console.log("Secret mismatch!");
      return c.json({ error: "Invalid admin secret key" }, 403);
    }

    // Update this user's metadata to add admin role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Updating user", user.id, "to admin...");

    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        user_metadata: {
          ...user.user_metadata,
          name: user.user_metadata?.name || user.email,
          role: "admin",
        },
      }),
    });

    console.log("Update response status:", updateRes.status);

    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      console.log("Update error:", JSON.stringify(updateData));

      if (updateRes.status === 401) {
        return c.json({
          error: "Server configuratie fout: Neem contact op met de ontwikkelaar om de Supabase credentials te controleren.",
          technical: "SUPABASE_SERVICE_ROLE_KEY is niet correct ingesteld"
        }, 500);
      }

      return c.json({ error: updateData.message || "Failed to update role" }, 400);
    }

    console.log("✅ Role successfully updated to admin!");
    console.log("New metadata:", JSON.stringify(updateData.user_metadata));

    return c.json({
      success: true,
      message: "Je account heeft nu admin rechten. Log opnieuw in om de wijzigingen te zien.",
      userId: user.id,
      email: user.email,
      oldRole: user.user_metadata?.role,
      newRole: updateData.user_metadata?.role,
    });
  } catch (err) {
    console.log("Fix my role error:", err);
    return c.json({ error: `Failed to fix role: ${err}` }, 500);
  }
});

// --- POST /admin/auth/fix-role — fix admin role by email (requires ADMIN_SECRET) ---
app.post("/make-server-0951c59e/admin/auth/fix-role", async (c) => {
  try {
    const { adminSecret, email } = await c.req.json();
    const expectedSecret = Deno.env.get("ADMIN_SECRET");

    console.log("=== FIX ROLE REQUEST ===");
    console.log("Email:", email);
    console.log("Secret provided:", !!adminSecret);
    console.log("Expected secret exists:", !!expectedSecret);

    if (!expectedSecret || adminSecret !== expectedSecret) {
      console.log("Secret mismatch!");
      return c.json({ error: "Invalid admin secret key" }, 403);
    }

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Listing users to find:", email);

    // List all users and find by email
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    console.log("List response status:", listRes.status);

    const listData = await listRes.json();
    if (!listRes.ok) {
      console.log("List users error:", JSON.stringify(listData));

      if (listRes.status === 401) {
        return c.json({
          error: "Server configuratie fout: SUPABASE_SERVICE_ROLE_KEY is niet correct. Neem contact op met de ontwikkelaar om de environment variables te controleren.",
          details: listData
        }, 500);
      }

      return c.json({ error: "Failed to list users", details: listData }, 500);
    }

    console.log("Total users found:", listData.users?.length);

    const user = listData.users?.find((u: any) => u.email === email);
    if (!user) {
      console.log("User not found with email:", email);
      return c.json({ error: `User not found with email: ${email}` }, 404);
    }

    console.log("Found user:", user.id);
    console.log("Current metadata:", JSON.stringify(user.user_metadata));
    console.log("Current role:", user.user_metadata?.role);

    // Update user metadata to set role=admin
    console.log("Updating user metadata...");
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        user_metadata: {
          name: user.user_metadata?.name || user.email,
          role: "admin"
        },
      }),
    });

    console.log("Update response status:", updateRes.status);

    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      console.log("Fix role error:", JSON.stringify(updateData));
      return c.json({ error: updateData.message || "Failed to update role" }, 400);
    }

    console.log("✅ Admin role fixed successfully!");
    console.log("New metadata:", JSON.stringify(updateData.user_metadata));

    return c.json({
      success: true,
      message: "Role updated to admin. Please sign out and sign in again for changes to take effect.",
      userId: user.id,
      email: user.email,
      oldRole: user.user_metadata?.role,
      newRole: updateData.user_metadata?.role,
      newMetadata: updateData.user_metadata,
    });
  } catch (err) {
    console.log("Fix role error:", err);
    return c.json({ error: `Failed to fix role: ${err}` }, 500);
  }
});

// --- GET /admin/client/:id — get client info + their projects ---
app.get("/make-server-0951c59e/admin/client/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    console.log("=== ADMIN CLIENT DETAIL REQUEST ===");
    console.log("Admin client request - auth header present:", !!authHeader);
    console.log("Client ID requested:", c.req.param("id"));

    const admin = await verifyAdmin(authHeader);
    console.log("Admin verification result:", admin ? "success" : "failed");
    if (admin) {
      console.log("Admin user ID:", admin.id, "role:", admin.user_metadata?.role);
    } else {
      console.log("AUTHORIZATION FAILED - returning 401");
    }

    if (!admin) return c.json({ error: "Unauthorized - admin verification failed" }, 401);

    const clientId = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error } = await supabase.auth.admin.getUserById(clientId);
    if (error || !user) {
      console.log("Client lookup error:", error);
      return c.json({ error: "Client not found" }, 404);
    }

    const projectIdsStr = await kv.get(`portal:client:${clientId}:projectIds`);
    const projectIds = projectIdsStr ? JSON.parse(projectIdsStr) : [];
    const projectValues = await Promise.all(
      projectIds.map((id: string) => kv.get(`portal:project:${id}`))
    );
    const projects = projectValues.filter(Boolean).map((v) => JSON.parse(v as string));

    return c.json({
      client: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        company: user.user_metadata?.company || "",
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      },
      projects,
    });
  } catch (err) {
    console.log("Admin get client error:", err);
    return c.json({ error: `Failed to fetch client: ${err}` }, 500);
  }
});

// --- DELETE /admin/client/:id — delete a client + all their data ---
app.delete("/make-server-0951c59e/admin/client/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const clientId = c.req.param("id");

    // Delete all KV data for this client
    const projectIdsStr = await kv.get(`portal:client:${clientId}:projectIds`);
    if (projectIdsStr) {
      const projectIds = JSON.parse(projectIdsStr) as string[];
      await Promise.all(
        projectIds.flatMap((id) => [
          kv.del(`portal:project:${id}`),
          kv.del(`portal:project:${id}:messages`),
        ])
      );
    }
    await kv.del(`portal:client:${clientId}:projectIds`);

    // Delete the auth user via REST API
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${clientId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    if (!deleteRes.ok) {
      const errBody = await deleteRes.json().catch(() => ({}));
      console.log("Delete user error:", JSON.stringify(errBody));
      return c.json({ error: errBody.message || "Failed to delete auth user" }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Admin delete client error:", err);
    return c.json({ error: `Failed to delete client: ${err}` }, 500);
  }
});

// --- GET /admin/project/:id — get single project (no ownership check) ---
app.get("/make-server-0951c59e/admin/project/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (!projectStr) return c.json({ error: "Project not found" }, 404);

    return c.json({ project: JSON.parse(projectStr) });
  } catch (err) {
    console.log("Admin get project error:", err);
    return c.json({ error: `Failed to fetch project: ${err}` }, 500);
  }
});

// --- POST /admin/project — create project for a client ---
app.post("/make-server-0951c59e/admin/project", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const { clientId, title, status, phase, description, dueDate } = await c.req.json();
    if (!clientId || !title) return c.json({ error: "clientId and title are required" }, 400);

    const projectId = crypto.randomUUID();
    const project = {
      id: projectId,
      title,
      status: status || "in_progress",
      phase: phase || "Pre-Production",
      description: description || "",
      dueDate: dueDate || "",
      clientId,
      createdAt: new Date().toISOString(),
      deliverables: [],
    };

    const projectIdsStr = await kv.get(`portal:client:${clientId}:projectIds`);
    const projectIds = projectIdsStr ? JSON.parse(projectIdsStr) : [];
    projectIds.push(projectId);

    await kv.set(`portal:project:${projectId}`, JSON.stringify(project));
    await kv.set(`portal:client:${clientId}:projectIds`, JSON.stringify(projectIds));
    await kv.set(`portal:project:${projectId}:messages`, JSON.stringify([]));

    return c.json({ project });
  } catch (err) {
    console.log("Admin create project error:", err);
    return c.json({ error: `Failed to create project: ${err}` }, 500);
  }
});

// --- PUT /admin/project/:id — update project ---
app.put("/make-server-0951c59e/admin/project/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const updates = await c.req.json();

    console.log("=== UPDATE PROJECT ===");
    console.log("Project ID:", projectId);
    console.log("Updates received:", JSON.stringify(updates, null, 2));
    console.log("Meeting in updates:", updates.meeting);

    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (!projectStr) return c.json({ error: "Project not found" }, 404);

    const existing = JSON.parse(projectStr);
    console.log("Existing project meeting:", existing.meeting);

    // Merge updates with existing data
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      clientId: existing.clientId,
      createdAt: existing.createdAt,
    };

    // If meeting is explicitly null, remove it from the project
    if (updates.meeting === null) {
      delete updated.meeting;
      console.log("Meeting set to null - removing from project");
    }

    // Clean up null values in meeting object (convert to undefined for cleaner storage)
    if (updated.meeting) {
      if (updated.meeting.location === null) delete updated.meeting.location;
      if (updated.meeting.link === null) delete updated.meeting.link;
      if (updated.meeting.notes === null) delete updated.meeting.notes;
    }

    console.log("Updated project meeting:", updated.meeting);
    console.log("Full updated project:", JSON.stringify(updated, null, 2));

    await kv.set(`portal:project:${projectId}`, JSON.stringify(updated));
    console.log("✅ Project saved to KV store");

    // Client notifications for the changes that actually matter to them.
    // Compared against `existing` (pre-update) so re-saving unrelated fields
    // never re-fires these.
    const galleryGrew = (updated.galleryUrls?.length || 0) > (existing.galleryUrls?.length || 0);
    const justDelivered = existing.status !== "delivered" && updated.status === "delivered";
    const meetingChanged = !!updated.meeting?.date && existing.meeting?.date !== updated.meeting.date;

    if (galleryGrew || justDelivered || meetingChanged) {
      const clientUser = await getPortalUser(existing.clientId);
      if (clientUser) {
        const firstName = clientUser.name.split(" ")[0];
        const gs = updated.gallerySettings || {};
        const galleryTitle = gs.title || updated.title;
        const accent = gs.accentColor || "#c8905a";
        const coverUrl = gs.coverUrl || updated.galleryUrls?.[0];
        const galleryLink = `${SITE_URL}/portal/project/${projectId}/gallery`;
        const projectLink = `${SITE_URL}/portal/project/${projectId}`;

        if (galleryGrew) {
          const added = (updated.galleryUrls?.length || 0) - (existing.galleryUrls?.length || 0);
          const photoWord = added === 1 ? "foto" : "foto's";
          await sendEmail({
            to: clientUser.email,
            subject: `Je galerij is bijgewerkt — ${added} nieuwe ${photoWord}`,
            html: emailWrap(`
              ${glassImageCard({
                imageUrl: coverUrl,
                eyebrow: "Galerij Bijgewerkt",
                title: galleryTitle,
                subtitle: `${added} nieuwe ${photoWord} toegevoegd &middot; ${updated.galleryUrls.length} in totaal`,
                accentColor: accent,
                linkUrl: galleryLink,
              })}
              <tr>
                <td style="padding:32px 36px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Hi ${firstName}, we hebben ${added} nieuwe ${photoWord} aan je galerij toegevoegd. Bekijk en download ze via de link hieronder.</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 40px;text-align:center;">
                  <a href="${galleryLink}" style="display:inline-block;background-color:${accent};color:#0a1413;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">Bekijk je galerij</a>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Je hebt deze mail ontvangen omdat je een actief project hebt bij PhotoDeCaffeine.</span></td>
              </tr>
            `),
          });
        }

        if (justDelivered) {
          await sendEmail({
            to: clientUser.email,
            subject: `Je project is afgerond — ${updated.title}`,
            html: emailWrap(`
              ${glassImageCard({
                imageUrl: coverUrl,
                eyebrow: "Project Afgerond",
                title: updated.title,
                accentColor: "#c8905a",
                linkUrl: galleryLink,
                topSpace: 150,
              })}
              <tr>
                <td style="padding:32px 36px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Hi ${firstName}, je volledige galerij staat klaar. Alle foto's zijn bewerkt en in hoge resolutie beschikbaar om te bekijken en downloaden.</span></td>
              </tr>
              <tr>
                <td style="padding:26px 36px 44px;text-align:center;">
                  <a href="${galleryLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:14px 32px;">Bekijk &amp; download</a>
                  <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
                  <span style="color:rgba(255,251,224,0.3);font-size:11px;">Bedankt voor het vertrouwen &mdash; we horen graag hoe de shoot is bevallen.</span>
                </td>
              </tr>
            `),
          });
        }

        if (meetingChanged) {
          const meetingDate = new Date(updated.meeting.date).toLocaleString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });
          await sendEmail({
            to: clientUser.email,
            subject: `Meeting ingepland — ${updated.title}`,
            html: emailWrap(`
              <tr>
                <td style="padding:32px 36px 0;">
                  <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Meeting Ingepland</span>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${updated.title}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 36px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border:1px solid rgba(255,251,224,0.06);">
                    <tr>
                      <td style="padding:20px 22px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="padding-bottom:14px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Wanneer</td></tr>
                          <tr><td style="padding-bottom:${updated.meeting.location ? "16px" : "0"};color:#fffbe0;font-size:15px;font-weight:600;">${meetingDate}</td></tr>
                          ${updated.meeting.location ? `<tr><td style="padding-bottom:8px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Locatie</td></tr><tr><td style="color:rgba(255,251,224,0.7);font-size:13px;">${updated.meeting.location}</td></tr>` : ""}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 36px 36px;">
                  <a href="${projectLink}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk projectdetails</a>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Kun je niet? Stuur even een berichtje via het portaal.</span></td>
              </tr>
            `),
          });
        }
      }
    }

    return c.json({ project: updated });
  } catch (err) {
    console.log("Admin update project error:", err);
    return c.json({ error: `Failed to update project: ${err}` }, 500);
  }
});

// --- DELETE /admin/project/:id — delete project ---
app.delete("/make-server-0951c59e/admin/project/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (!projectStr) return c.json({ error: "Project not found" }, 404);

    const project = JSON.parse(projectStr);
    const clientId = project.clientId;

    const projectIdsStr = await kv.get(`portal:client:${clientId}:projectIds`);
    if (projectIdsStr) {
      const projectIds = JSON.parse(projectIdsStr).filter((id: string) => id !== projectId);
      await kv.set(`portal:client:${clientId}:projectIds`, JSON.stringify(projectIds));
    }

    await kv.del(`portal:project:${projectId}`);
    await kv.del(`portal:project:${projectId}:messages`);

    return c.json({ success: true });
  } catch (err) {
    console.log("Admin delete project error:", err);
    return c.json({ error: `Failed to delete project: ${err}` }, 500);
  }
});

// --- GET /admin/project/:id/messages — get messages (no ownership check) ---
app.get("/make-server-0951c59e/admin/project/:id/messages", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const messagesStr = await kv.get(`portal:project:${projectId}:messages`);
    const messages = messagesStr ? JSON.parse(messagesStr) : [];

    return c.json({ messages });
  } catch (err) {
    console.log("Admin get messages error:", err);
    return c.json({ error: `Failed to fetch messages: ${err}` }, 500);
  }
});

// --- POST /admin/project/:id/messages — send message as PDC Studio ---
app.post("/make-server-0951c59e/admin/project/:id/messages", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const { content } = await c.req.json();
    if (!content?.trim()) return c.json({ error: "Message content is required" }, 400);

    const messagesStr = await kv.get(`portal:project:${projectId}:messages`);
    const messages = messagesStr ? JSON.parse(messagesStr) : [];

    const newMessage = {
      id: crypto.randomUUID(),
      projectId,
      senderId: "pdc",
      senderName: admin.user_metadata?.name || "PDC Studio",
      senderRole: "pdc",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    await kv.set(`portal:project:${projectId}:messages`, JSON.stringify(messages));

    // Notify the client — otherwise they'd only see this by logging into the portal
    const projectStr = await kv.get(`portal:project:${projectId}`);
    if (projectStr) {
      const project = JSON.parse(projectStr);
      const clientUser = await getPortalUser(project.clientId);
      if (clientUser) {
        await sendEmail({
          to: clientUser.email,
          subject: "Nieuw bericht van PDC Studio",
          html: emailWrap(`
            <tr>
              <td style="padding:32px 36px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:30px;height:30px;background-color:rgba(200,144,90,0.15);border:1px solid rgba(200,144,90,0.3);text-align:center;vertical-align:middle;">
                    <span style="color:#c8905a;font-size:11px;font-weight:800;">P</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="display:block;color:#c8905a;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">PDC Studio</span>
                    <span style="display:block;color:rgba(255,251,224,0.3);font-size:11px;">over ${project.title}</span>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,144,90,0.06);border:1px solid rgba(200,144,90,0.12);">
                  <tr><td style="padding:18px 20px;color:rgba(255,251,224,0.75);font-size:14px;line-height:1.7;">${newMessage.content.replace(/\n/g, "<br>")}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 36px 36px;">
                <a href="${SITE_URL}/portal/project/${projectId}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk &amp; reageer</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Reageren kan direct in je projectportaal.</span></td>
            </tr>
          `),
        });
      }
    }

    return c.json({ message: newMessage });
  } catch (err) {
    console.log("Admin send message error:", err);
    return c.json({ error: `Failed to send message: ${err}` }, 500);
  }
});

// --- GET /admin/inquiries — list all contact form submissions ---
app.get("/make-server-0951c59e/admin/inquiries", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const allIdsStr = await kv.get("contact:inquiryIds");
    if (!allIdsStr) return c.json({ inquiries: [] });

    const allIds = JSON.parse(allIdsStr) as string[];
    const values = await Promise.all(
      allIds.map((id) => kv.get(`contact:inquiry:${id}`))
    );
    const inquiries = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .reverse();

    return c.json({ inquiries });
  } catch (err) {
    console.log("Admin get inquiries error:", err);
    return c.json({ error: `Failed to fetch inquiries: ${err}` }, 500);
  }
});

// --- POST /contact — public contact form submission ---
app.post("/make-server-0951c59e/contact", async (c) => {
  try {
    const { name, email, phone, brand, message, package: pkg } = await c.req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return c.json({ error: "Name, email, and message are required" }, 400);
    }

    const id = crypto.randomUUID();
    const inquiry = {
      id,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || "",
      brand: brand?.trim() || "",
      message: message.trim(),
      package: pkg || "",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`contact:inquiry:${id}`, JSON.stringify(inquiry));

    const allIdsStr = await kv.get("contact:inquiryIds");
    const allIds = allIdsStr ? JSON.parse(allIdsStr) : [];
    allIds.push(id);
    await kv.set("contact:inquiryIds", JSON.stringify(allIds));

    // Notify admin — reply-to set to the visitor so replying goes straight to them
    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      replyTo: inquiry.email,
      subject: `Nieuwe aanvraag van ${inquiry.name}${inquiry.brand ? ` (${inquiry.brand})` : ""}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Nieuwe Aanvraag</span>
            <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:24px;font-weight:800;letter-spacing:-0.01em;line-height:1.2;">${inquiry.name}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);width:88px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">E-mail</td>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);"><a href="mailto:${inquiry.email}" style="color:#c8905a;font-size:13px;text-decoration:none;">${inquiry.email}</a></td>
              </tr>
              ${inquiry.phone ? `<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Telefoon</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${inquiry.phone}</td></tr>` : ""}
              ${inquiry.brand ? `<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Merk</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${inquiry.brand}</td></tr>` : ""}
              ${inquiry.package ? `<tr><td style="padding:9px 0;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Pakket</td><td style="padding:9px 0;color:#fffbe0;font-size:13px;">${inquiry.package}</td></tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 0;"><span style="color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Bericht</span></td>
        </tr>
        <tr>
          <td style="padding:10px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${inquiry.message.replace(/\n/g, "<br>")}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 36px;">
            <a href="mailto:${inquiry.email}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Reageer naar ${inquiry.name.split(" ")[0]}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Verzonden via het contactformulier op photodecaffeine.com</span></td>
        </tr>
      `),
    });

    // Confirmation to the visitor, with an optional "meer van ons werk" promo card
    const promo = await getPromoPortfolioArticle();
    const promoRows = promo
      ? `
        <tr>
          <td style="padding:40px 36px 0;"><span style="color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Meer Van Ons Werk</span></td>
        </tr>
        ${glassImageCard({
          imageUrl: promo.coverUrl,
          eyebrow: promo.category || "Portfolio",
          title: promo.title,
          ctaText: "Bekijk in de portfolio &rarr;",
          accentColor: "#c8905a",
          linkUrl: `${SITE_URL}/portfolio/${promo.id}`,
          topSpace: 190,
        })}`
      : "";

    await sendEmail({
      to: inquiry.email,
      subject: "We hebben je bericht ontvangen — PhotoDeCaffeine",
      html: emailWrap(`
        <tr>
          <td style="padding:40px 36px 0;text-align:center;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Bericht Ontvangen</span>
            <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;text-transform:uppercase;">Bedankt, ${inquiry.name.split(" ")[0]}.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">We bekijken jouw brief en nemen binnen één werkdag contact met je op. Bedankt voor het overwegen van PDC.</span></td>
        </tr>
        <tr>
          <td style="padding:32px 36px 0;"><span style="color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Jouw Bericht</span></td>
        </tr>
        <tr>
          <td style="padding:10px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.55);font-size:13.5px;line-height:1.7;font-style:italic;">"${inquiry.message.replace(/\n/g, "<br>")}"</td></tr>
            </table>
          </td>
        </tr>
        ${promoRows}
        <tr>
          <td style="padding:36px 36px 0;text-align:center;"><span style="color:#c8905a;font-size:14px;font-style:italic;font-weight:300;">Gemaakt als Koffie, Geschoten als Cinema.</span></td>
        </tr>
        <tr>
          <td style="padding:32px 36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,251,224,0.06);">
              <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="padding:5px 0;color:rgba(255,251,224,0.25);font-size:11px;text-align:center;"><a href="mailto:contact@photodecaffeine.com" style="color:rgba(255,251,224,0.45);text-decoration:none;">contact@photodecaffeine.com</a> &nbsp;·&nbsp; +31 6 36112514 &nbsp;·&nbsp; Roosendaal, Nederland</td></tr>
              <tr><td style="padding:5px 0;color:rgba(255,251,224,0.2);font-size:11px;text-align:center;">Reactie binnen 24u &nbsp;·&nbsp; @photodecaffeine</td></tr>
            </table>
          </td>
        </tr>
      `),
    });

    return c.json({ success: true });
  } catch (err) {
    console.log("Contact form error:", err);
    return c.json({ error: `Failed to submit contact form: ${err}` }, 500);
  }
});

// ============================================================================
// PORTFOLIO ENDPOINTS
// ============================================================================

// --- GET /portfolio — list all published portfolio articles ---
app.get("/make-server-0951c59e/portfolio", async (c) => {
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
app.get("/make-server-0951c59e/portfolio/:id", async (c) => {
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
app.get("/make-server-0951c59e/admin/portfolio", async (c) => {
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
app.get("/make-server-0951c59e/admin/portfolio/:id", async (c) => {
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
app.post("/make-server-0951c59e/admin/portfolio", async (c) => {
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
app.put("/make-server-0951c59e/admin/portfolio/:id", async (c) => {
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
app.delete("/make-server-0951c59e/admin/portfolio/:id", async (c) => {
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
// REMINDERS ENDPOINTS
// ============================================================================

// --- GET /admin/reminders — get all reminders for admin ---
app.get("/make-server-0951c59e/admin/reminders", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const allIdsStr = await kv.get("reminder:reminderIds");
    if (!allIdsStr) return c.json({ reminders: [] });

    const allIds = JSON.parse(allIdsStr) as string[];
    const values = await Promise.all(
      allIds.map((id) => kv.get(`reminder:${id}`))
    );

    const reminders = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return c.json({ reminders });
  } catch (err) {
    console.log("Get reminders error:", err);
    return c.json({ error: `Failed to fetch reminders: ${err}` }, 500);
  }
});

// --- POST /admin/reminders — create reminder ---
app.post("/make-server-0951c59e/admin/reminders", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const { title, description, dueDate, type, relatedId } = await c.req.json();
    if (!title?.trim() || !dueDate) {
      return c.json({ error: "Title and dueDate are required" }, 400);
    }

    const id = crypto.randomUUID();
    const reminder = {
      id,
      title: title.trim(),
      description: description?.trim() || "",
      dueDate,
      type: type || "general", // general, portfolio, project, client
      relatedId: relatedId || null,
      completed: false,
      createdBy: admin.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`reminder:${id}`, JSON.stringify(reminder));

    const allIdsStr = await kv.get("reminder:reminderIds");
    const allIds = allIdsStr ? JSON.parse(allIdsStr) : [];
    allIds.push(id);
    await kv.set("reminder:reminderIds", JSON.stringify(allIds));

    return c.json({ reminder });
  } catch (err) {
    console.log("Create reminder error:", err);
    return c.json({ error: `Failed to create reminder: ${err}` }, 500);
  }
});

// --- PUT /admin/reminders/:id — update reminder ---
app.put("/make-server-0951c59e/admin/reminders/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const updates = await c.req.json();

    const reminderStr = await kv.get(`reminder:${id}`);
    if (!reminderStr) return c.json({ error: "Reminder not found" }, 404);

    const existing = JSON.parse(reminderStr);
    const updated = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt };

    await kv.set(`reminder:${id}`, JSON.stringify(updated));
    return c.json({ reminder: updated });
  } catch (err) {
    console.log("Update reminder error:", err);
    return c.json({ error: `Failed to update reminder: ${err}` }, 500);
  }
});

// --- DELETE /admin/reminders/:id — delete reminder ---
app.delete("/make-server-0951c59e/admin/reminders/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    await kv.del(`reminder:${id}`);

    const allIdsStr = await kv.get("reminder:reminderIds");
    if (allIdsStr) {
      const allIds = JSON.parse(allIdsStr).filter((rid: string) => rid !== id);
      await kv.set("reminder:reminderIds", JSON.stringify(allIds));
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Delete reminder error:", err);
    return c.json({ error: `Failed to delete reminder: ${err}` }, 500);
  }
});

// ============================================================================
// AI WRITING ASSISTANT
// ============================================================================

// --- POST /admin/ai/generate-description — generate portfolio description ---
app.post("/make-server-0951c59e/admin/ai/generate-description", async (c) => {
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

// ============================================================================
// WORKERS / ADMIN USERS MANAGEMENT
// ============================================================================

// --- GET /admin/workers — get all admin users ---
app.get("/make-server-0951c59e/admin/workers", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get all users via REST API
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
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

    // Filter only admin users
    const workers = users
      .filter((u: any) => u.user_metadata?.role === "admin")
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.email,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
      }));

    return c.json({ workers });
  } catch (err) {
    console.log("Get workers error:", err);
    return c.json({ error: `Failed to fetch workers: ${err}` }, 500);
  }
});

// ============================================================================
// SITE SETTINGS ENDPOINTS
// ============================================================================

// --- GET /settings — get public site settings ---
app.get("/make-server-0951c59e/settings", async (c) => {
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
    return c.json({ settings: JSON.parse(settingsStr) });
  } catch (err) {
    console.log("Get settings error:", err);
    return c.json({ error: `Failed to fetch settings: ${err}` }, 500);
  }
});

// --- PUT /admin/settings — update site settings ---
app.put("/make-server-0951c59e/admin/settings", async (c) => {
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

Deno.serve(app.fetch);