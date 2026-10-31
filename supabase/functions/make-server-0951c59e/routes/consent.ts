import { Hono } from "npm:hono";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, SITE_URL } from "../lib/config.ts";
import { type Answer, ANSWERS, consentUrl, statementsFor } from "../lib/consents.ts";
import { db, found, must } from "../lib/db.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, text, z } from "../lib/http.ts";
import { notify } from "../lib/notify.ts";
import { consentReceiptEmail, consentStudioEmail } from "../lib/projectEmails.ts";
import { removePrivate, signPaths, uploadPrivate } from "../lib/storage.ts";

const r = new Hono<Env>();
export default r;

// ============================================================================
// CONSENT — the parents' side (/toestemming/<token> on the site)
// ============================================================================
//
// There is no login. The token gets a parent to the form; the answer then gets
// a key of its own, which the confirmation mail links to. That key keeps working
// when the studio switches the link off, so a parent can always withdraw.

const S = "/make-server-0951c59e/consent/:token";
const CLOSED = "Deze link werkt niet (meer). Vraag de fotograaf om een nieuwe.";
// Far more than one shoot has children; keeps a leaked link from filling the storage.
const MAX_ANSWERS = 500;
// The browser shrinks the photo first, so this only stops what didn't come from the form.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Form = { project_id: string; token: string; active: boolean };

async function formOf(token: string): Promise<Form | null> {
  if (!/^[A-Za-z0-9]{8,64}$/.test(token)) return null;
  return must(await db.from("consent_forms").select("project_id, token, active").eq("token", token).maybeSingle()) as Form | null;
}

async function answerOf(form: Form, key: string): Promise<any | null> {
  if (!/^[0-9a-f]{32}$/.test(key)) return null;
  return must(await db.from("consents").select("*").eq("key", key).eq("project_id", form.project_id).maybeSingle());
}

/** The shoot this is about: the next one, or else the most recent. */
function shootOf(events: any[]): any {
  const shoots = (events || []).filter((e) => e.kind === "shoot" && e.client_visible).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const since = new Date(Date.now() - 86400000).toISOString();
  return shoots.find((e) => e.starts_at >= since) || shoots[shoots.length - 1];
}

// --- the form, with a parent's own answer when they came back with their key ---
r.get(S, async (c) => {
  const form = await formOf(c.req.param("token"));
  if (!form) fail(404, CLOSED);
  const mine = await answerOf(form, c.req.query("key") || "");
  if (!form.active && !mine) fail(404, CLOSED);
  const project = found(
    await db.from("projects").select("title, gallery_settings, events ( kind, starts_at, client_visible )").eq("id", form.project_id).maybeSingle(),
    CLOSED,
  ) as any;
  const photoUrl = mine?.photo_path ? (await signPaths([mine.photo_path])).get(mine.photo_path) || "" : "";
  return c.json({
    title: project.gallery_settings?.title || project.title,
    shootDate: shootOf(project.events)?.starts_at || "",
    accentColor: project.gallery_settings?.accentColor || "",
    statements: statementsFor(project.gallery_settings?.consentClub || ""),
    answer: mine
      ? { childName: mine.child_name, answer: mine.answer, note: mine.note, parentName: mine.parent_name, parentEmail: mine.parent_email, photoUrl }
      : null,
  });
});

// --- an answer, new or changed ---
const answerSchema = z.object({
  key: z.string().optional(),
  childName: text(120).min(1, "Vul de naam van je kind in."),
  answer: z.enum(ANSWERS, { errorMap: () => ({ message: "Kies wat er mag." }) }),
  note: text(300).default(""),
  parentName: text(120).min(1, "Vul je naam in."),
  parentEmail: text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in."),
  // The tick at "I am this child's parent or legal representative".
  declared: z.literal("yes", { errorMap: () => ({ message: "Vink aan dat je ouder of wettelijk vertegenwoordiger bent." }) }),
  language: z.enum(["nl", "en"]).default("nl"),
});

r.post(S, async (c) => {
  const form = await formOf(c.req.param("token"));
  if (!form) fail(404, CLOSED);
  const data = await c.req.formData().catch(() => fail(400, "Dit formulier kon niet worden gelezen. Probeer het opnieuw."));
  const parsed = answerSchema.safeParse(Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) fail(400, parsed.error.issues[0]?.message || "Ongeldige invoer.");
  const b = parsed.data;

  const before = b.key ? await answerOf(form, b.key) : null;
  if (b.key && !before) fail(404, "Deze link werkt niet (meer). Vul het formulier opnieuw in.");
  if (!form.active && !before) fail(404, CLOSED);
  if (!before) {
    const res = await db.from("consents").select("id", { count: "exact", head: true }).eq("project_id", form.project_id);
    must(res);
    if ((res.count || 0) >= MAX_ANSWERS) fail(429, "Er zijn te veel antwoorden binnengekomen. Neem contact op met de fotograaf.");
  }

  const restricted = b.answer !== "full";
  const sent = data.get("photo");
  const file = restricted && sent instanceof File && sent.size > 0 ? sent : null;
  if (file && (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES)) fail(400, "Deze foto kan niet worden opgeslagen. Kies een andere foto.");
  if (restricted && !file && !before?.photo_path && !b.note) fail(400, "Voeg een foto toe, of schrijf hoe we je kind herkennen.");

  const project = found(await db.from("projects").select("title, gallery_settings").eq("id", form.project_id).maybeSingle(), CLOSED) as any;
  const statement = statementsFor(project.gallery_settings?.consentClub || "")[b.language][b.answer];
  const path = file ? await uploadPrivate(`consents/${form.project_id}`, file) : "";
  const fields = {
    child_name: b.childName,
    answer: b.answer,
    // With a full yes there is nothing to recognise a child by any more.
    note: restricted ? b.note : "",
    photo_path: restricted ? path || before?.photo_path || "" : "",
    parent_name: b.parentName,
    parent_email: b.parentEmail,
    statement: `${statement.title}: ${statement.body}`,
    language: b.language,
  };
  let saved: any;
  try {
    saved = before
      ? must(await db.from("consents").update(fields).eq("id", before.id).select("*").single())
      : must(await db.from("consents").insert({ ...fields, project_id: form.project_id }).select("*").single());
  } catch (err) {
    await removePrivate([path]);
    throw err;
  }
  if (before?.photo_path && before.photo_path !== saved.photo_path) await removePrivate([before.photo_path]);

  const projectTitle = project.gallery_settings?.title || project.title;
  const receipt = await sendEmail({
    to: saved.parent_email,
    replyTo: EMAIL_ADMIN_NOTIFY,
    subject: b.language === "en" ? `Your choice for ${saved.child_name} is saved` : `Je keuze voor ${saved.child_name} is opgeslagen`,
    html: consentReceiptEmail({
      language: b.language, childName: saved.child_name, parentName: saved.parent_name, projectTitle,
      title: statement.title, body: statement.body, changeLink: consentUrl(form.token, saved.key),
    }),
  });

  // The studio hears about every limit and every change, as these change the shoot.
  const changed = Boolean(before) && before.answer !== saved.answer;
  if (restricted || changed) {
    const titles = statementsFor("").nl;
    const label = titles[b.answer].title;
    await Promise.all([
      sendEmail({
        to: EMAIL_ADMIN_NOTIFY,
        replyTo: saved.parent_email,
        subject: `${saved.child_name}: ${label.toLowerCase()} · ${project.title}`,
        html: consentStudioEmail({
          childName: saved.child_name, parentName: saved.parent_name, parentEmail: saved.parent_email, projectTitle: project.title, label,
          changedFrom: changed ? titles[before.answer as Answer].title : "", hasPhoto: Boolean(saved.photo_path), note: saved.note,
          link: `${SITE_URL}/admin/project/${form.project_id}?tab=consent`,
        }),
      }),
      notify({
        type: "consent",
        title: `${saved.child_name}: ${label.toLowerCase()}`,
        body: `${changed ? "Gewijzigd" : "Ingevuld"} door ${saved.parent_name} · ${project.title}`,
        link: `/admin/project/${form.project_id}?tab=consent`,
      }),
    ]);
  }

  return c.json({
    key: saved.key,
    childName: saved.child_name,
    answer: saved.answer,
    parentName: saved.parent_name,
    parentEmail: saved.parent_email,
    changed: Boolean(before),
    mailed: receipt.ok,
  });
});
