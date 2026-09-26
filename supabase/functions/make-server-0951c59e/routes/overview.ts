import { Hono } from "npm:hono";
import { db, must } from "../lib/db.ts";
import { type Env, requireAdmin } from "../lib/http.ts";
import { demoSlugOf, projectDemos } from "../lib/util.ts";
import { verifyAdmin } from "../lib/auth.ts";
import { invoiceTotals } from "./invoices.ts";
import { quoteLines, quoteSum } from "./quotes.ts";

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin";
r.use(`${A}/overview`, requireAdmin);
r.use(`${A}/search`, requireAdmin);

// Everything the "Vandaag" screen needs, in one round trip.
r.get(`${A}/overview`, async (c) => {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 8 * 86400000).toISOString();
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const startOfMonth = `${today.slice(0, 7)}-01`;

  const [events, unread, quotes, invoices, tasks, inquiries, projects] = await Promise.all([
    db.from("events").select("*, projects ( id, title ), locations ( id, name, address, lat, lng )")
      .gte("starts_at", new Date(now.getTime() - 12 * 3600000).toISOString()).lt("starts_at", weekAhead).order("starts_at"),
    db.from("messages").select("id, project_id, sender_name, content, created_at, projects ( title )")
      .eq("sender_role", "client").is("read_at", null).order("created_at", { ascending: false }).limit(20),
    db.from("quotes").select("id, number, title, client_name, status, sent_at, viewed_at, view_count, one_time, monthly")
      .eq("status", "sent").order("sent_at"),
    db.from("invoices").select("*").in("status", ["sent", "paid"]),
    db.from("tasks").select("*, projects ( title )").is("done_at", null).order("due_at", { ascending: true, nullsFirst: false }).limit(30),
    db.from("inquiries").select("id, name, email, message, created_at").is("handled_at", null).order("created_at", { ascending: false }).limit(20),
    db.from("projects").select("id, stage, value_cents, due_date, title"),
  ]);

  const inv = must(invoices) || [];
  const open = inv.filter((i: any) => i.status === "sent");
  const overdue = open.filter((i: any) => i.due_on < today);
  const paidThisMonth = inv.filter((i: any) => i.status === "paid" && (i.paid_at || "").slice(0, 10) >= startOfMonth);

  const stageCounts: Record<string, number> = {};
  for (const p of must(projects) || []) stageCounts[(p as any).stage] = (stageCounts[(p as any).stage] || 0) + 1;

  const dueSoon = (must(projects) || []).filter((p: any) =>
    p.due_date && !["delivered", "review", "archived"].includes(p.stage) && p.due_date <= new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10)
  ).map((p: any) => ({ id: p.id, title: p.title, dueDate: p.due_date, overdue: p.due_date < today }));

  return c.json({
    events: (must(events) || []).map((e: any) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      allDay: e.all_day,
      projectId: e.project_id,
      projectTitle: e.projects?.title || "",
      location: e.locations ? { id: e.locations.id, name: e.locations.name, address: e.locations.address, lat: e.locations.lat, lng: e.locations.lng } : null,
      locationText: e.location_text,
    })),
    unreadMessages: (must(unread) || []).map((m: any) => ({
      id: m.id, projectId: m.project_id, projectTitle: m.projects?.title || "", senderName: m.sender_name, content: m.content, createdAt: m.created_at,
    })),
    openQuotes: (must(quotes) || []).map((q: any) => ({
      id: q.id, number: q.number, title: q.title, clientName: q.client_name, sentAt: q.sent_at, viewedAt: q.viewed_at, viewCount: q.view_count,
      total: quoteSum(quoteLines(q.one_time)), monthly: quoteSum(quoteLines(q.monthly)),
    })),
    overdueInvoices: overdue.map((i: any) => ({ id: i.id, number: i.number, clientName: i.client_name, dueOn: i.due_on, total: invoiceTotals(i).total })),
    openInvoiceTotal: open.reduce((s: number, i: any) => s + invoiceTotals(i).total, 0),
    paidThisMonth: paidThisMonth.reduce((s: number, i: any) => s + invoiceTotals(i).total, 0),
    tasks: (must(tasks) || []).map((t: any) => ({
      id: t.id, title: t.title, notes: t.notes, dueAt: t.due_at, kind: t.kind, projectId: t.project_id, projectTitle: t.projects?.title || "",
    })),
    newInquiries: (must(inquiries) || []).map((i: any) => ({ id: i.id, name: i.name, email: i.email, message: i.message, createdAt: i.created_at })),
    stageCounts,
    dueSoon,
  });
});

// Ctrl+K: one query per kind, small limits, ilike on the obvious columns.
r.get(`${A}/search`, async (c) => {
  const raw = (c.req.query("q") || "").trim().slice(0, 80);
  if (raw.length < 2) return c.json({ clients: [], projects: [], locations: [], quotes: [], invoices: [] });
  // Commas and parentheses would break the PostgREST or() syntax.
  const q = raw.replace(/[,()*%\\]/g, " ").trim();
  const like = `%${q}%`;
  const [clients, projects, locations, quotes, invoices] = await Promise.all([
    db.from("clients").select("id, name, email, company").or(`name.ilike.${like},email.ilike.${like},company.ilike.${like}`).limit(6),
    db.from("projects").select("id, title, stage, type").ilike("title", like).order("created_at", { ascending: false }).limit(6),
    db.from("locations").select("id, name, address, kind").or(`name.ilike.${like},address.ilike.${like}`).limit(6),
    db.from("quotes").select("id, number, title, client_name, status").or(`number.ilike.${like},title.ilike.${like},client_name.ilike.${like}`).limit(6),
    db.from("invoices").select("id, number, client_name, status").or(`number.ilike.${like},client_name.ilike.${like}`).limit(6),
  ]);
  return c.json({
    clients: must(clients) || [],
    projects: must(projects) || [],
    locations: must(locations) || [],
    quotes: must(quotes) || [],
    invoices: must(invoices) || [],
  });
});

// ---------------------------------------------------------------------------
// Web demos
// ---------------------------------------------------------------------------

async function findDemo(slug: string) {
  const rows = must(await db.from("projects").select("id, title, demos").eq("type", "web")) || [];
  for (const p of rows as any[]) {
    const demo = projectDemos(p).find((d) => d.slug === slug);
    if (demo) return { project: p, demo };
  }
  return null;
}

// Public on purpose: an unknown and a switched-off demo answer the same way,
// so the endpoint never reveals that a demo exists before it is shown.
r.get("/make-server-0951c59e/demo/:slug", async (c) => {
  const slug = demoSlugOf(c.req.param("slug"));
  if (!slug) return c.json({ live: false });
  const hit = await findDemo(slug);
  if (!hit || !hit.demo.live) return c.json({ live: false });
  return c.json({ live: true, title: hit.project.title });
});

r.get("/make-server-0951c59e/admin/demo/:slug", async (c) => {
  const admin = await verifyAdmin(c.req.header("Authorization") ?? null);
  if (!admin) return c.json({ error: "Unauthorized" }, 401);
  const hit = await findDemo(demoSlugOf(c.req.param("slug")));
  if (!hit) return c.json({ error: "Demo not found" }, 404);
  return c.json({ live: Boolean(hit.demo.live), title: hit.project.title });
});
