import { Hono } from "npm:hono";
import { db, found, must } from "../lib/db.ts";
import { type Env, isoDateTime, readBody, requireAdmin, text, uuid, z } from "../lib/http.ts";

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin";
r.use(`${A}/tasks`, requireAdmin);
r.use(`${A}/tasks/*`, requireAdmin);
r.use(`${A}/reminders`, requireAdmin);
r.use(`${A}/reminders/*`, requireAdmin);

function taskToApi(t: any) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    dueAt: t.due_at,
    doneAt: t.done_at,
    done: Boolean(t.done_at),
    kind: t.kind,
    projectId: t.project_id,
    projectTitle: t.projects?.title || "",
    clientId: t.client_id,
    clientName: t.clients?.name || "",
    createdAt: t.created_at,
  };
}

const SELECT = "*, projects ( title ), clients ( name )";

r.get(`${A}/tasks`, async (c) => {
  let q = db.from("tasks").select(SELECT).order("done_at", { ascending: false, nullsFirst: true }).order("due_at", { ascending: true, nullsFirst: false });
  if (c.req.query("open") === "1") q = q.is("done_at", null);
  const projectId = c.req.query("projectId");
  if (projectId) q = q.eq("project_id", projectId);
  return c.json({ tasks: (must(await q) || []).map(taskToApi) });
});

const taskSchema = z.object({
  title: text(300).min(1, "Omschrijf de taak."),
  notes: text(5000).default(""),
  dueAt: isoDateTime.nullable().optional(),
  kind: text(40).default("general"),
  projectId: uuid.nullable().optional(),
  clientId: uuid.nullable().optional(),
});

r.post(`${A}/tasks`, async (c) => {
  const b = await readBody(c, taskSchema);
  const row = must(await db.from("tasks").insert({
    title: b.title,
    notes: b.notes,
    due_at: b.dueAt || null,
    kind: b.kind,
    project_id: b.projectId || null,
    client_id: b.clientId || null,
    created_by: c.get("user").id,
  }).select(SELECT).single());
  return c.json({ task: taskToApi(row) });
});

r.put(`${A}/tasks/:id`, async (c) => {
  const b = await readBody(c, taskSchema.partial().extend({ done: z.boolean().optional() }));
  const patch: Record<string, unknown> = {};
  if (b.title !== undefined) patch.title = b.title;
  if (b.notes !== undefined) patch.notes = b.notes;
  if (b.dueAt !== undefined) patch.due_at = b.dueAt;
  if (b.kind !== undefined) patch.kind = b.kind;
  if (b.projectId !== undefined) patch.project_id = b.projectId;
  if (b.clientId !== undefined) patch.client_id = b.clientId;
  if (b.done !== undefined) patch.done_at = b.done ? new Date().toISOString() : null;
  const row = found(await db.from("tasks").update(patch).eq("id", c.req.param("id")).select(SELECT).maybeSingle(), "Taak niet gevonden");
  return c.json({ task: taskToApi(row) });
});

r.delete(`${A}/tasks/:id`, async (c) => {
  must(await db.from("tasks").delete().eq("id", c.req.param("id")));
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// The older reminders API, used by the mobile app, on top of tasks.
// ---------------------------------------------------------------------------

function reminderToApi(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.notes,
    dueDate: t.due_at || "",
    type: t.kind,
    relatedId: t.project_id || t.client_id || null,
    completed: Boolean(t.done_at),
    createdBy: t.created_by,
    createdAt: t.created_at,
  };
}

r.get(`${A}/reminders`, async (c) => {
  const rows = must(await db.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false })) || [];
  return c.json({ reminders: rows.map(reminderToApi) });
});

r.post(`${A}/reminders`, async (c) => {
  const b = await readBody(c, z.object({
    title: text(300).min(1, "Title and dueDate are required"),
    description: text(5000).default(""),
    dueDate: isoDateTime,
    type: text(40).default("general"),
  }).passthrough());
  const row = must(await db.from("tasks").insert({
    title: b.title, notes: b.description, due_at: new Date(b.dueDate).toISOString(), kind: b.type, created_by: c.get("user").id,
  }).select("*").single());
  return c.json({ reminder: reminderToApi(row) });
});

r.put(`${A}/reminders/:id`, async (c) => {
  const b = await readBody(c, z.object({
    title: text(300).optional(),
    description: text(5000).optional(),
    dueDate: isoDateTime.optional(),
    type: text(40).optional(),
    completed: z.boolean().optional(),
  }).passthrough());
  const patch: Record<string, unknown> = {};
  if (b.title !== undefined) patch.title = b.title;
  if (b.description !== undefined) patch.notes = b.description;
  if (b.dueDate !== undefined) patch.due_at = new Date(b.dueDate).toISOString();
  if (b.type !== undefined) patch.kind = b.type;
  if (b.completed !== undefined) patch.done_at = b.completed ? new Date().toISOString() : null;
  const row = found(await db.from("tasks").update(patch).eq("id", c.req.param("id")).select("*").maybeSingle(), "Reminder not found");
  return c.json({ reminder: reminderToApi(row) });
});

r.delete(`${A}/reminders/:id`, async (c) => {
  must(await db.from("tasks").delete().eq("id", c.req.param("id")));
  return c.json({ success: true });
});
