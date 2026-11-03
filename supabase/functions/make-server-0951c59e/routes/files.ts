import { Hono } from "npm:hono";
import { hasPermission } from "../lib/auth.ts";
import { OWNER_EMAIL } from "../lib/config.ts";
import { db, must } from "../lib/db.ts";
import { type Env, fail, requireAdmin } from "../lib/http.ts";
import { PRIVATE_BUCKET } from "../lib/storage.ts";

// Bestanden: everything stored for the site, as folders to look through. It only
// reads, so nothing here reaches the logboek. A file shows only when placeOf knows
// where it belongs and the person's role opens the screen those files come from.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/files";
r.use(`${A}/*`, requireAdmin);

const WEBSITE_BUCKET = "portfolio-images-0951c59e";
const OLD_RECEIPT_BUCKET = "declaration-files-0951c59e";
const POOL_BUCKET = "team-files-0951c59e";
const PUBLIC_BUCKETS = [WEBSITE_BUCKET, OLD_RECEIPT_BUCKET];

const LINK_SECONDS = 60 * 60;
// All storage together on the free Supabase plan.
const PLAN_LIMIT = 1024 ** 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CLIENT_FOLDERS = new Map([["galleries", "galerijen"], ["consents", "toestemming"], ["locations", "locaties"]]);

const FOLDER_NAMES: Record<string, string> = {
  website: "Website",
  web: "Verkleind voor de site",
  galerijen: "Galerijen",
  wm: "Met watermerk",
  toestemming: "Toestemming",
  locaties: "Locaties",
  bonnetjes: "Bonnetjes",
  oud: "Oude bonnetjes",
  investeringen: "Investeringen",
  pool: "Bestandenpool",
  overig: "Overig",
};

type Can = { id: string; owner: boolean; portfolio: boolean; clients: boolean; allReceipts: boolean };
type Stored = { bucket: string; path: string; size: number; type: string; updatedAt: string };

async function abilities(user: any): Promise<Can> {
  const [portfolio, clients, allReceipts] = await Promise.all(
    ["managePortfolio", "manageClients", "viewAllDeclarations"].map((p) => hasPermission(user, p)),
  );
  return { id: user.id, owner: user.email === OWNER_EMAIL, portfolio, clients, allReceipts };
}

/** The folder a stored file shows under, or null when this person may not see it. Anything unknown stays hidden. */
function placeOf(bucket: string, path: string, can: Can): string | null {
  const parts = path.split("/");
  if (parts.some((p) => !p || p === "." || p === "..") || path.endsWith(".emptyFolderPlaceholder")) return null;
  const folders = parts.slice(0, -1);
  const rest = folders.slice(1);
  if (bucket === WEBSITE_BUCKET) return can.portfolio ? ["website", ...folders].join("/") : null;
  if (bucket === OLD_RECEIPT_BUCKET) return can.allReceipts ? ["bonnetjes", "oud", ...folders].join("/") : null;
  // One file per folder, and the folder is only a random id.
  if (bucket === POOL_BUCKET) return "pool";
  if (bucket !== PRIVATE_BUCKET) return null;
  const section = CLIENT_FOLDERS.get(folders[0]);
  if (section) return can.clients ? [section, ...rest].join("/") : null;
  if (folders[0] === "receipts") return can.allReceipts || folders[1] === can.id ? ["bonnetjes", ...rest].join("/") : null;
  if (folders[0] === "investments") return ["investeringen", ...rest].join("/");
  return can.owner ? ["overig", ...folders].join("/") : null;
}

/** The name a file was uploaded with, without the timestamp and random part stored in front of it. */
function shownName(path: string) {
  const file = path.split("/").pop() || path;
  return file.replace(/^\d{10,}-([0-9a-f]{8}-)?/, "") || file;
}

r.get(A, async (c) => {
  const can = await abilities(c.get("user"));
  const [stored, used, projects, locations, team] = await Promise.all([
    db.rpc("storage_files"),
    db.rpc("storage_used_bytes"),
    db.from("projects").select("id, title"),
    db.from("locations").select("id, name"),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Folders are named after ids; people read what those ids stand for.
  const names = new Map<string, string>();
  for (const p of must(projects) as any[]) names.set(p.id, p.title);
  for (const l of must(locations) as any[]) names.set(l.id, l.name);
  for (const u of team.data?.users || []) names.set(u.id, u.user_metadata?.name || u.email || "");

  const labels = { ...FOLDER_NAMES };
  const files = [];
  for (const f of must(stored) as unknown as Stored[]) {
    const folder = placeOf(f.bucket, f.path, can);
    if (folder === null) continue;
    for (const part of folder.split("/")) {
      if (UUID.test(part)) labels[part] = names.get(part) || `Verwijderd (${part.slice(0, 8)})`;
    }
    files.push({ ...f, folder, name: shownName(f.path), public: PUBLIC_BUCKETS.includes(f.bucket) });
  }
  return c.json({ files, labels, used: Number(must(used)), limit: PLAN_LIMIT });
});

// With ?download=<name> the link makes the browser save the file under that name.
r.get(`${A}/link`, async (c) => {
  const bucket = c.req.query("bucket") || "";
  const path = c.req.query("path") || "";
  const download = c.req.query("download");
  if (placeOf(bucket, path, await abilities(c.get("user"))) === null) fail(404, "Dit bestand bestaat niet of je mag het niet zien.");
  const options = download ? { download } : undefined;
  if (PUBLIC_BUCKETS.includes(bucket)) return c.json({ url: db.storage.from(bucket).getPublicUrl(path, options).data.publicUrl });
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, LINK_SECONDS, options);
  if (error || !data?.signedUrl) fail(404, "Dit bestand staat er niet meer.");
  return c.json({ url: data.signedUrl });
});
