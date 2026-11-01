import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import {
  allAnswers, answersOf, answerSecret, articleOfToken, type ConsentAnswer, consentPageUrl, ensureToken, NAME_USES, PLACES, removeAnswer, saveAnswer,
  saveSettings, settingsOf, statementFor, takeDownIfBlocked,
} from "../lib/articleConsents.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, TERMS_VERSION } from "../lib/config.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, requireAdmin, requirePermission, text, z } from "../lib/http.ts";
import { articleConsentReceiptEmail, articleConsentRequestEmail, articleConsentStudioEmail } from "../lib/legalEmails.ts";
import { notify } from "../lib/notify.ts";
import { loadArticles } from "../lib/portfolio.ts";

const r = new Hono<Env>();
export default r;

// ============================================================================
// CONSENT PER PORTFOLIO PIECE
// ============================================================================
//
// Like the parents' form: no login, one token per piece that can go to everyone
// on it, and every answer gets a key of its own to change or withdraw it later.

const CLOSED = "Deze link werkt niet (meer). Vraag PhotoDeCaffeine om een nieuwe.";
// More than one piece has people on it; keeps a leaked link from filling the store.
const MAX_ANSWERS = 200;
const MAX_PHOTOS = 12;

async function articleOf(id: string): Promise<any | null> {
  const raw = await kv.get(`portfolio:article:${id}`);
  return raw ? JSON.parse(raw as string) : null;
}

// ---------------------------------------------------------------------------
// The person's side (/werk-toestemming/<token> on the site)
// ---------------------------------------------------------------------------
const S = "/make-server-0951c59e/article-consent/:token";

r.get(S, async (c) => {
  const articleId = await articleOfToken(c.req.param("token"));
  const article = articleId ? await articleOf(articleId) : null;
  if (!article) fail(404, CLOSED);
  const key = c.req.query("key") || "";
  const mine = key ? (await answersOf(article.id)).find((a) => a.key === key) : undefined;
  const urls: string[] = [article.coverUrl, ...(article.galleryUrls || [])].filter(Boolean);
  return c.json({
    title: article.title,
    photos: [...new Set(urls)].filter((u) => !/\.(mp4|mov|m4v|webm)$/i.test(u)).slice(0, MAX_PHOTOS),
    statements: { nl: statementFor(article.title, "nl"), en: statementFor(article.title, "en") },
    answer: mine
      ? { answer: mine.answer, places: mine.places, nameUse: mine.nameUse, limits: mine.limits, name: mine.name, email: mine.email, guardianOf: mine.guardianOf }
      : null,
  });
});

const answerSchema = z.object({
  key: z.string().optional(),
  answer: z.enum(["given", "refused"], { errorMap: () => ({ message: "Zeg ja of nee." }) }),
  places: z.array(z.enum(PLACES)).max(PLACES.length).default([]),
  nameUse: z.enum(NAME_USES).default("none"),
  limits: text(500).default(""),
  name: text(120).min(1, "Vul je naam in."),
  email: text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in."),
  guardianOf: text(120).default(""),
  declared: z.boolean().default(false),
  language: z.enum(["nl", "en"]).default("nl"),
});

r.post(S, async (c) => {
  const token = c.req.param("token");
  const articleId = await articleOfToken(token);
  const article = articleId ? await articleOf(articleId) : null;
  if (!article) fail(404, CLOSED);
  const b = await readBody(c, answerSchema);
  if (b.answer === "given" && b.places.length === 0) fail(400, "Kies waar het mag, of zeg nee.");
  if (b.answer === "given" && !b.declared) fail(400, "Bevestig eerst de tekst onderaan.");
  const answers = await answersOf(article.id);
  const mine = b.key ? answers.find((a) => a.key === b.key) : undefined;
  if (!mine && answers.length >= MAX_ANSWERS) fail(429, "Er zijn al veel antwoorden op dit formulier. Neem contact op met PhotoDeCaffeine.");

  const now = new Date().toISOString();
  const saved: ConsentAnswer = {
    id: mine?.id || crypto.randomUUID(),
    articleId: article.id,
    key: mine?.key || answerSecret(),
    answer: b.answer,
    places: b.answer === "given" ? b.places : [],
    nameUse: b.answer === "given" ? b.nameUse : "none",
    limits: b.answer === "given" ? b.limits : "",
    name: b.name,
    email: b.email,
    guardianOf: b.guardianOf,
    statement: statementFor(article.title, b.language),
    language: b.language,
    termsVersion: TERMS_VERSION,
    createdAt: mine?.createdAt || now,
    updatedAt: now,
  };
  await saveAnswer(saved);

  const tookDown = await takeDownIfBlocked(article.id);
  const receipt = await sendEmail({
    to: b.email,
    replyTo: EMAIL_ADMIN_NOTIFY,
    subject: b.language === "en" ? `Your choice for ${article.title}` : `Je keuze voor ${article.title}`,
    html: articleConsentReceiptEmail({ language: b.language, firstName: b.name.split(" ")[0], title: article.title, answer: b.answer, places: saved.places, link: consentPageUrl(token, saved.key) }),
  });
  await Promise.all([
    sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      replyTo: b.email,
      subject: `Toestemming ${article.title}: ${b.name} zegt ${b.answer === "given" ? "ja" : "nee"}`,
      html: articleConsentStudioEmail({ title: article.title, name: b.name, email: b.email, answer: b.answer, places: saved.places, nameUse: saved.nameUse, limits: saved.limits, guardianOf: b.guardianOf, tookDown, articleId: article.id }),
    }),
    notify({
      type: "consent",
      title: `${b.name} zegt ${b.answer === "given" ? "ja" : "nee"}: ${article.title}`,
      body: tookDown ? "Staat niet meer op de site. Haal het ook weg van social media." : "Toestemming portfolio",
      link: "/admin/portfolio?filter=consent",
    }),
  ]);
  return c.json({ key: saved.key, answer: b.answer, mailed: receipt.ok });
});

// ---------------------------------------------------------------------------
// The studio's side
// ---------------------------------------------------------------------------
const A = "/make-server-0951c59e/admin/article-consents";
r.use(A, requireAdmin, requirePermission("managePortfolio", "het portfolio"));
r.use(`${A}/*`, requireAdmin, requirePermission("managePortfolio", "het portfolio"));

/** The studio sees everything of an answer but the key that opens it for changes. */
const toApi = ({ key: _key, ...a }: ConsentAnswer) => a;

// --- per piece: is it needed, how many said what; for the portfolio list ---
r.get(A, async (c) => {
  const [articles, answers] = await Promise.all([loadArticles(), allAnswers()]);
  const entries = await Promise.all(articles.map(async (a) => {
    const s = await settingsOf(a.id);
    const mine = answers.filter((x) => x.articleId === a.id);
    return [a.id, {
      needed: s.needed,
      people: s.people.length,
      given: mine.filter((x) => x.answer === "given").length,
      refused: mine.filter((x) => x.answer === "refused").length,
    }];
  }));
  return c.json({ summary: Object.fromEntries(entries) });
});

r.get(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  if (!(await articleOf(id))) fail(404, "Dit stuk bestaat niet (meer).");
  const token = await ensureToken(id);
  const [settings, answers] = await Promise.all([settingsOf(id), answersOf(id)]);
  return c.json({ needed: settings.needed, people: settings.people, note: settings.note, url: consentPageUrl(token), answers: answers.map(toApi) });
});

const person = z.object({
  name: text(120).default(""),
  email: z.string().trim().toLowerCase().refine((v) => v === "" || EMAIL_RE.test(v), "Vul een geldig e-mailadres in.").default(""),
  sentAt: z.string().max(40).default(""),
});

r.put(`${A}/:id`, async (c) => {
  const id = c.req.param("id");
  if (!(await articleOf(id))) fail(404, "Dit stuk bestaat niet (meer).");
  const b = await readBody(c, z.object({ needed: z.boolean().nullable(), people: z.array(person).max(60), note: text(1000).default("") }));
  const current = await settingsOf(id);
  const settings = { ...current, needed: b.needed, people: b.people.filter((p) => p.name || p.email), note: b.note };
  await saveSettings(id, settings);
  return c.json({ needed: settings.needed, people: settings.people, note: settings.note });
});

r.post(`${A}/:id/send`, async (c) => {
  const id = c.req.param("id");
  const article = await articleOf(id);
  if (!article) fail(404, "Dit stuk bestaat niet (meer).");
  const b = await readBody(c, z.object({ name: text(120).default(""), email: text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in.") }));
  const token = await ensureToken(id);
  // This mail IS the request, so a failure has to come back as a failure.
  const sent = await sendEmail({
    to: b.email,
    replyTo: EMAIL_ADMIN_NOTIFY,
    subject: `Mag ${article.title} in ons portfolio?`,
    html: articleConsentRequestEmail({ firstName: b.name.split(" ")[0] || "daar", title: article.title, link: consentPageUrl(token) }),
  });
  if (!sent.ok) fail(502, sent.error || "De mail kon niet verstuurd worden.");
  const settings = await settingsOf(id);
  const now = new Date().toISOString();
  const known = settings.people.some((p) => p.email === b.email);
  await saveSettings(id, {
    ...settings,
    people: known ? settings.people.map((p) => (p.email === b.email ? { ...p, sentAt: now } : p)) : [...settings.people, { name: b.name, email: b.email, sentAt: now }],
  });
  return c.json({ success: true, sentAt: now });
});

r.delete(`${A}/:id/answers/:answerId`, async (c) => {
  await removeAnswer(c.req.param("id"), c.req.param("answerId"));
  return c.json({ success: true });
});
