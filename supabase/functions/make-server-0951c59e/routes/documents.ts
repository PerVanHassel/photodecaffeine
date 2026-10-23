import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { type Env, fail, nameOf, readBody, requireAdmin, text, z } from "../lib/http.ts";

// Notes on long documents (terms, policies) that the team reads together in
// the admin. The text itself ships with the admin; only the notes and how far
// each person has read live here, in the kv store.

const r = new Hono<Env>();
export default r;

const A = "/make-server-0951c59e/admin/documents";
r.use(`${A}/*`, requireAdmin);

const docId = (c: any) => {
  const id = c.req.param("doc");
  if (!/^[a-z0-9-]{1,60}$/.test(id)) fail(400, "Onbekend document.");
  return id as string;
};
const notesKey = (doc: string) => `documents:${doc}:notes`;
const readKey = (doc: string, userId: string) => `documents:${doc}:read:${userId}`;

// Values are stored as JSON text, but older rows elsewhere are objects; accept both.
const parse = <T,>(v: unknown, fallback: T): T => (v == null ? fallback : typeof v === "string" ? JSON.parse(v) : (v as T));

type Note = { id: string; sectionId: string; text: string; authorId: string; authorName: string; createdAt: string; updatedAt: string };

async function loadNotes(doc: string): Promise<Note[]> {
  return parse<Note[]>(await kv.get(notesKey(doc)), []);
}

r.get(`${A}/:doc`, async (c) => {
  const doc = docId(c);
  const user = c.get("user");
  const [notes, read] = await Promise.all([loadNotes(doc), kv.get(readKey(doc, user.id))]);
  return c.json({ notes, read: parse(read, { done: [], at: null }) });
});

const sectionId = z.string().regex(/^[a-z0-9-]{1,120}$/, "Onbekend stuk.");
const noteText = text(4000).min(1, "Schrijf eerst iets.");

r.post(`${A}/:doc/notes`, async (c) => {
  const doc = docId(c);
  const body = await readBody(c, z.object({ sectionId, text: noteText }));
  const user = c.get("user");
  const now = new Date().toISOString();
  const note: Note = { id: crypto.randomUUID(), sectionId: body.sectionId, text: body.text, authorId: user.id, authorName: nameOf(user), createdAt: now, updatedAt: now };
  const notes = await loadNotes(doc);
  await kv.set(notesKey(doc), JSON.stringify([...notes, note]));
  return c.json({ note });
});

async function ownNote(c: any, doc: string) {
  const notes = await loadNotes(doc);
  const note = notes.find((n) => n.id === c.req.param("id"));
  if (!note) fail(404, "Deze notitie bestaat niet meer.");
  if (note.authorId !== c.get("user").id) fail(403, "Je kunt alleen je eigen notities aanpassen.");
  return { notes, note };
}

r.put(`${A}/:doc/notes/:id`, async (c) => {
  const doc = docId(c);
  const body = await readBody(c, z.object({ text: noteText }));
  const { notes, note } = await ownNote(c, doc);
  const updated = { ...note, text: body.text, updatedAt: new Date().toISOString() };
  await kv.set(notesKey(doc), JSON.stringify(notes.map((n) => (n.id === note.id ? updated : n))));
  return c.json({ note: updated });
});

r.delete(`${A}/:doc/notes/:id`, async (c) => {
  const doc = docId(c);
  const { notes, note } = await ownNote(c, doc);
  await kv.set(notesKey(doc), JSON.stringify(notes.filter((n) => n.id !== note.id)));
  return c.json({ success: true });
});

r.put(`${A}/:doc/read`, async (c) => {
  const doc = docId(c);
  const body = await readBody(c, z.object({ done: z.array(sectionId).max(1000), at: sectionId.nullable() }));
  const read = { done: [...new Set(body.done)], at: body.at };
  await kv.set(readKey(doc, c.get("user").id), JSON.stringify(read));
  return c.json({ read });
});
