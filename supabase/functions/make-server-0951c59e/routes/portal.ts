import { Hono } from "npm:hono";
import { clientForUser, clientToApi, projectIdsForClient } from "../lib/clients.ts";
import { EMAIL_ADMIN_NOTIFY, SITE_URL } from "../lib/config.ts";
import { db, found, must } from "../lib/db.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, requireUser, text, uuid, z } from "../lib/http.ts";
import { notify } from "../lib/notify.ts";
import { eventToApi, gallerySigner, loadProject, loadProjects, projectToApi } from "../lib/projects.ts";
import { clientMessageToStudioEmail } from "../lib/projectEmails.ts";
import { signDownload } from "../lib/storage.ts";
import { invoiceTotals } from "./invoices.ts";
import { quoteLines, quoteSum } from "./quotes.ts";
import { messageToApi } from "./projects.ts";

const r = new Hono<Env>();
export default r;

const P = "/make-server-0951c59e/portal";
r.use(`${P}/*`, async (c, next) => {
  // Sign-up is the one portal route that runs before there is a login.
  if (c.req.path === `${P}/signup`) return next();
  return requireUser(c, next);
});

/** The signed-in client, and whether they may see this project. */
async function access(c: any, projectId?: string) {
  const client = await clientForUser(c.get("user"));
  if (projectId) {
    const ids = await projectIdsForClient(client.id);
    if (!ids.includes(projectId)) fail(403, "Dit project hoort niet bij je account.");
  }
  return client;
}

async function locationsFor(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const rows = must(await db.from("locations").select("id, name, address, lat, lng, parking").in("id", unique)) || [];
  return Object.fromEntries(rows.map((l: any) => [l.id, l]));
}

// --- account ---
r.get(`${P}/me`, async (c) => {
  const client = await access(c);
  return c.json({ client: clientToApi(client) });
});

r.put(`${P}/me`, async (c) => {
  const client = await access(c);
  const b = await readBody(c, z.object({ name: text(200).min(1, "Vul je naam in.").optional(), company: text(200).optional(), phone: text(50).optional() }));
  const row = must(await db.from("clients").update(b).eq("id", client.id).select("*").single());
  const user = c.get("user");
  await db.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, name: (row as any).name, company: (row as any).company },
  });
  return c.json({ client: clientToApi(row as any) });
});

// --- projects ---
r.get(`${P}/projects`, async (c) => {
  const client = await access(c);
  const rows = await loadProjects({ ids: await projectIdsForClient(client.id) });
  const sign = await gallerySigner(rows);
  const ids = rows.map((p) => p.id);
  const unread = ids.length
    ? must(await db.from("messages").select("project_id").in("project_id", ids).eq("sender_role", "pdc").is("read_at", null)) || []
    : [];
  const unreadBy: Record<string, number> = {};
  for (const m of unread as any[]) unreadBy[m.project_id] = (unreadBy[m.project_id] || 0) + 1;
  const locations = await locationsFor(rows.flatMap((p) => [p.location_id, ...(p.events || []).map((e: any) => e.location_id)]));
  return c.json({
    projects: rows.map((row) => ({ ...projectToApi(row, sign, { forClient: true }), unreadMessages: unreadBy[row.id] || 0 })),
    locations,
  });
});

r.get(`${P}/project/:id`, async (c) => {
  const id = c.req.param("id");
  const client = await access(c, id);
  const row = await loadProject(id);
  const project = projectToApi(row, await gallerySigner([row]), { forClient: true });
  const imageIds = project.gallery.map((g: any) => g.id);
  const favs = imageIds.length
    ? must(await db.from("gallery_favorites").select("image_id").eq("client_id", client.id).in("image_id", imageIds)) || []
    : [];
  const locations = await locationsFor([row.location_id, ...(row.events || []).map((e: any) => e.location_id)]);
  return c.json({ project: { ...project, favoriteIds: favs.map((f: any) => f.image_id) }, locations });
});

// --- messages ---
r.get(`${P}/project/:id/messages`, async (c) => {
  const id = c.req.param("id");
  await access(c, id);
  const rows = must(await db.from("messages").select("*").eq("project_id", id).order("created_at")) || [];
  return c.json({ messages: rows.map(messageToApi) });
});

r.post(`${P}/project/:id/messages/read`, async (c) => {
  const id = c.req.param("id");
  await access(c, id);
  must(await db.from("messages").update({ read_at: new Date().toISOString() })
    .eq("project_id", id).eq("sender_role", "pdc").is("read_at", null));
  return c.json({ success: true });
});

r.post(`${P}/project/:id/messages`, async (c) => {
  const id = c.req.param("id");
  const client = await access(c, id);
  const { content } = await readBody(c, z.object({ content: text(10000).min(1, "Schrijf eerst een bericht.") }));
  const project = found(await db.from("projects").select("id, title").eq("id", id).maybeSingle(), "Project niet gevonden") as any;
  const row = must(await db.from("messages").insert({
    project_id: id,
    sender_id: c.get("user").id,
    sender_name: client.name || client.email || "Klant",
    sender_role: "client",
    content,
  }).select("*").single()) as any;

  await sendEmail({
    to: EMAIL_ADMIN_NOTIFY,
    subject: `${row.sender_name} heeft gereageerd — ${project.title}`,
    html: clientMessageToStudioEmail({ senderName: row.sender_name, content }, project, id),
  });
  await notify({ type: "message", title: `${row.sender_name} stuurde een bericht`, body: content, link: `/admin/project/${id}` });
  return c.json({ message: messageToApi(row) });
});

// --- favourites ---
r.post(`${P}/project/:id/favorites`, async (c) => {
  const id = c.req.param("id");
  const client = await access(c, id);
  const b = await readBody(c, z.object({ imageId: uuid, favorite: z.boolean() }));
  found(await db.from("gallery_images").select("id").eq("id", b.imageId).eq("project_id", id).maybeSingle(), "Foto niet gevonden");
  if (b.favorite) {
    must(await db.from("gallery_favorites").upsert({ image_id: b.imageId, client_id: client.id }, { onConflict: "image_id,client_id" }));
  } else {
    must(await db.from("gallery_favorites").delete().eq("image_id", b.imageId).eq("client_id", client.id));
  }
  return c.json({ success: true });
});

// The client says their selection is done; the studio hears about it.
r.post(`${P}/project/:id/favorites/submit`, async (c) => {
  const id = c.req.param("id");
  const client = await access(c, id);
  const { note } = await readBody(c, z.object({ note: text(2000).default("") }));
  const project = found(await db.from("projects").select("id, title").eq("id", id).maybeSingle(), "Project niet gevonden") as any;
  const imgs = must(await db.from("gallery_images").select("id").eq("project_id", id)) || [];
  const favs = imgs.length
    ? must(await db.from("gallery_favorites").select("image_id").eq("client_id", client.id).in("image_id", imgs.map((i: any) => i.id))) || []
    : [];
  if (favs.length === 0) fail(400, "Kies eerst minstens één favoriet.");

  const who = client.name || client.email;
  await sendEmail({
    to: EMAIL_ADMIN_NOTIFY,
    subject: `${who} koos ${favs.length} favorieten — ${project.title}`,
    html: emailWrap(`
      <tr><td style="padding:32px 36px 0;">
        <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Selectie klaar</span>
        <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
        <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;">${escapeHtml(who)} koos ${favs.length} foto&#39;s</span>
        <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(project.title)}</span>
      </td></tr>
      ${note ? `<tr><td style="padding:18px 36px 0;"><span style="color:rgba(255,251,224,0.6);font-size:14px;line-height:1.7;">&ldquo;${escapeHtml(note)}&rdquo;</span></td></tr>` : ""}
      <tr><td style="padding:26px 36px 36px;">
        <a href="${SITE_URL}/admin/project/${id}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk de selectie</a>
      </td></tr>
    `),
  });
  await notify({ type: "favorites", title: `${who} koos ${favs.length} favorieten`, body: note || project.title, link: `/admin/project/${id}` });
  must(await db.from("tasks").insert({
    title: `Selectie van ${who} bewerken`,
    notes: note,
    kind: "favorites",
    project_id: id,
    client_id: client.id,
  }));
  return c.json({ success: true, count: favs.length });
});

// --- downloads ---
r.get(`${P}/project/:id/download/:imageId`, async (c) => {
  const id = c.req.param("id");
  await access(c, id);
  const img = found(
    await db.from("gallery_images").select("*").eq("id", c.req.param("imageId")).eq("project_id", id).maybeSingle(),
    "Foto niet gevonden",
  ) as any;
  const url = img.storage_path ? await signDownload(img.storage_path, img.file_name) : img.url;
  return c.json({ url, fileName: img.file_name });
});

// --- agenda ---
r.get(`${P}/events`, async (c) => {
  const client = await access(c);
  const ids = await projectIdsForClient(client.id);
  if (!ids.length) return c.json({ events: [], locations: {} });
  const since = new Date(Date.now() - 86400000).toISOString();
  const rows = must(await db.from("events").select("*, projects ( title )").in("project_id", ids)
    .eq("client_visible", true).gte("starts_at", since).order("starts_at")) || [];
  const locations = await locationsFor(rows.map((e: any) => e.location_id));
  return c.json({
    events: rows.map((e: any) => ({ ...eventToApi(e), projectId: e.project_id, projectTitle: e.projects?.title || "" })),
    locations,
  });
});

// --- quotes and invoices ---
r.get(`${P}/quotes`, async (c) => {
  const client = await access(c);
  const email = String(c.get("user").email || "").toLowerCase();
  // Older quotes only carry an email address, so match on both.
  const rows = must(await db.from("quotes").select("*").neq("status", "draft")
    .or(`client_id.eq.${client.id},client_email.eq."${email.replace(/"/g, "")}"`).order("sent_at", { ascending: false })) || [];
  return c.json({
    quotes: rows.map((q: any) => ({
      id: q.id,
      number: q.number,
      title: q.title,
      subtitle: q.subtitle,
      status: q.status,
      sentAt: q.sent_at || "",
      respondedAt: q.responded_at || "",
      response: q.response || "",
      validUntil: q.valid_until || "",
      totals: { monthly: quoteSum(quoteLines(q.monthly)), oneTime: quoteSum(quoteLines(q.one_time)) },
      token: q.token,
    })),
  });
});

r.get(`${P}/invoices`, async (c) => {
  const client = await access(c);
  const rows = must(await db.from("invoices").select("*").eq("client_id", client.id).neq("status", "draft")
    .order("issued_on", { ascending: false })) || [];
  return c.json({
    invoices: rows.map((i: any) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      issuedOn: i.issued_on,
      dueOn: i.due_on,
      paidAt: i.paid_at,
      totals: invoiceTotals(i),
      token: i.token,
    })),
  });
});
