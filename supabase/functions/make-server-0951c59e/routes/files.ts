import { Hono } from "npm:hono";
import { isAdminUser } from "../lib/auth.ts";
import { OWNER_EMAIL, SITE_URL } from "../lib/config.ts";
import { db, found, must } from "../lib/db.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { type Env, fail, nameOf, readBody, requireAdmin, text, uuid, z } from "../lib/http.ts";
import { sanitizeFileName } from "../lib/util.ts";

// The team's file pool: files one admin hands to another. The browser sends a
// file straight to the bucket with a signed URL, so it never passes through
// this function. Sending takes three steps: /start checks there is room and
// signs, the browser uploads, and POST /admin/files records what arrived.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/files";
r.use(`${A}/*`, requireAdmin);

const BUCKET = "team-files-0951c59e";
// The free Supabase plan: 50 MB per file (also set on the bucket) and 1 GB for
// all storage together, the site's photos included. Going over can get the
// whole project restricted, so the pool stops well before that. On a paid plan,
// raise both numbers here and the limit on the bucket.
const MAX_FILE = 50 * 1024 * 1024;
const STORAGE_CEILING = 950_000_000;

const LINK_SECONDS = 60 * 60;
// Only what a browser shows safely on its own. Everything else is downloaded.
const VIEWABLE = /^(image\/(jpeg|png|webp|gif)|application\/pdf|video\/(mp4|quicktime))$/;

type Row = {
  id: string; path: string; name: string; size: number; type: string; note: string;
  from_id: string; from_name: string; to_id: string | null; to_name: string; created_at: string;
};

async function freeBytes(): Promise<number> {
  const used = Number(must(await db.rpc("storage_used_bytes")));
  return Math.max(0, STORAGE_CEILING - used);
}

async function teamMembers() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("listing the team failed:", error.message);
    fail(500, "Het team kon niet worden opgehaald.");
  }
  return data.users
    .filter((u) => isAdminUser(u))
    .map((u) => ({ id: u.id, name: u.user_metadata?.name || u.email || "", email: u.email || "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

const mayDelete = (row: Row, user: any) => row.from_id === user.id || row.to_id === user.id || user.email === OWNER_EMAIL;

const toApi = (row: Row, user: any, viewUrl = "") => ({
  id: row.id,
  name: row.name,
  size: row.size,
  type: row.type,
  note: row.note,
  createdAt: row.created_at,
  from: { id: row.from_id, name: row.from_name },
  to: row.to_id ? { id: row.to_id, name: row.to_name } : null,
  viewUrl,
  canDelete: mayDelete(row, user),
});

/** What the file is called in the bucket; the row keeps the name it came with. */
function objectName(name: string) {
  const clean = sanitizeFileName(name).replace(/[^a-z0-9._-]/g, "-").slice(-120);
  return /^[a-z0-9]/.test(clean) ? clean : `bestand${clean}`;
}

r.get(A, async (c) => {
  const user = c.get("user");
  const [rows, free, team] = await Promise.all([
    db.from("team_files").select("*").order("created_at", { ascending: false }).limit(500),
    freeBytes(),
    teamMembers(),
  ]);
  const files = must(rows) as Row[];
  const viewable = files.filter((f) => VIEWABLE.test(f.type)).map((f) => f.path);
  const signed = viewable.length ? (await db.storage.from(BUCKET).createSignedUrls(viewable, LINK_SECONDS)).data || [] : [];
  const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return c.json({
    files: files.map((f) => toApi(f, user, urls.get(f.path) || "")),
    people: team.map(({ id, name }) => ({ id, name })),
    free,
    maxFile: MAX_FILE,
  });
});

r.post(`${A}/start`, async (c) => {
  const body = await readBody(c, z.object({ name: text(255).min(1), size: z.number().int().min(1) }));
  if (body.size > MAX_FILE) fail(400, `${body.name} is te groot. Het maximum is 50 MB per bestand.`);
  if (body.size > await freeBytes()) fail(400, "De opslag zit vol. Verwijder eerst iets uit de pool.");
  const id = crypto.randomUUID();
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(`${id}/${objectName(body.name)}`);
  if (error || !data) {
    console.error("signing an upload failed:", error?.message);
    fail(500, `${body.name} kon niet worden geüpload.`);
  }
  return c.json({ id, url: data.signedUrl });
});

r.post(A, async (c) => {
  const body = await readBody(c, z.object({
    id: uuid,
    name: text(255).min(1),
    note: text(500).default(""),
    toId: uuid.nullable().default(null),
  }));
  const user = c.get("user");
  const to = body.toId ? (await teamMembers()).find((p) => p.id === body.toId) : null;
  if (body.toId && !to) fail(400, "Deze persoon zit niet meer in het team.");
  // Size and type as storage measured them, not as the browser announced them.
  const { data: objects } = await db.storage.from(BUCKET).list(body.id, { limit: 1 });
  const object = objects?.[0];
  if (!object) fail(400, `${body.name} is niet aangekomen. Probeer het opnieuw.`);
  const row = must(await db.from("team_files").insert({
    id: body.id,
    path: `${body.id}/${object.name}`,
    name: body.name,
    size: Number(object.metadata?.size) || 0,
    type: String(object.metadata?.mimetype || ""),
    note: body.note,
    from_id: user.id,
    from_name: nameOf(user),
    to_id: to?.id ?? null,
    to_name: to?.name ?? "",
  }).select().single()) as Row;
  return c.json({ file: toApi(row, user) });
});

// One mail for one batch, however many files were in it.
r.post(`${A}/announce`, async (c) => {
  const body = await readBody(c, z.object({ ids: z.array(uuid).min(1).max(200) }));
  const user = c.get("user");
  const rows = must(await db.from("team_files").select("*").in("id", body.ids).eq("from_id", user.id)) as Row[];
  const toId = rows.find((f) => f.to_id)?.to_id;
  const person = toId ? (await teamMembers()).find((p) => p.id === toId) : null;
  if (!person?.email) return c.json({ mailed: false });
  const files = rows.filter((f) => f.to_id === toId);
  const sender = nameOf(user);
  const what = files.length === 1 ? "een bestand" : `${files.length} bestanden`;
  const shown = files.slice(0, 10).map((f) => `<div style="padding:7px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${escapeHtml(f.name)}</div>`).join("");
  const more = files.length > 10 ? `<div style="padding:7px 0;color:rgba(255,251,224,0.5);font-size:13px;">En nog ${files.length - 10}.</div>` : "";
  const note = files[0].note ? `<p style="margin:16px 0 0;color:rgba(255,251,224,0.7);font-size:14px;line-height:1.5;">${escapeHtml(files[0].note)}</p>` : "";
  const sent = await sendEmail({
    to: person.email,
    replyTo: user.email,
    subject: `${sender} stuurde je ${what}`,
    html: emailWrap(`
      <tr>
        <td style="padding:32px 36px 0;">
          <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Bestanden</span>
          <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
          <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(sender)} stuurde je ${what}</span>
          ${note}
        </td>
      </tr>
      <tr><td style="padding:18px 36px 0;">${shown}${more}</td></tr>
      <tr>
        <td style="padding:26px 36px 36px;">
          <a href="${SITE_URL}/admin/files?filter=voor-mij" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Naar de bestanden</a>
        </td>
      </tr>
    `),
  });
  return c.json({ mailed: sent.ok });
});

r.post(`${A}/:id/download`, async (c) => {
  const row = found(await db.from("team_files").select("path, name").eq("id", c.req.param("id")).maybeSingle(), "Dit bestand staat niet meer in de pool.") as Row;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(row.path, LINK_SECONDS, { download: row.name });
  if (error || !data?.signedUrl) fail(500, "De downloadlink kon niet worden gemaakt.");
  return c.json({ url: data.signedUrl });
});

r.delete(`${A}/:id`, async (c) => {
  const row = found(await db.from("team_files").select("*").eq("id", c.req.param("id")).maybeSingle(), "Dit bestand staat niet meer in de pool.") as Row;
  if (!mayDelete(row, c.get("user"))) fail(403, "Alleen wie het stuurde of kreeg kan dit verwijderen.");
  const { error } = await db.storage.from(BUCKET).remove([row.path]);
  if (error) {
    console.error("removing a file failed:", row.path, error.message);
    fail(500, "Het bestand kon niet worden verwijderd.");
  }
  must(await db.from("team_files").delete().eq("id", row.id));
  return c.json({ success: true });
});
