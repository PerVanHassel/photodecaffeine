import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAdmin } from "../lib/auth.ts";
import { sanitizeFileName } from "../lib/util.ts";


const r = new Hono();
export default r;

// The only buckets the admin UI writes to.
const UPLOAD_BUCKETS = ["portfolio-images-0951c59e", "declaration-files-0951c59e"];

// --- Storage bucket setup ---
r.post("/make-server-0951c59e/admin/storage/ensure-bucket", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const { bucketName } = await c.req.json();
    if (!bucketName) return c.json({ error: "bucketName is required" }, 400);
    if (!UPLOAD_BUCKETS.includes(bucketName)) return c.json({ error: "Onbekende bucket" }, 400);

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
          allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "application/pdf"],
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

// --- Upload file to storage (server-side with service role) ---
r.post("/make-server-0951c59e/admin/storage/upload", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const bucketName = formData.get("bucketName") as string;

    if (!file || !bucketName) {
      return c.json({ error: "file and bucketName are required" }, 400);
    }
    if (!UPLOAD_BUCKETS.includes(bucketName)) {
      return c.json({ error: "Onbekende bucket" }, 400);
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

