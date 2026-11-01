import * as kv from "../kv_store.tsx";
import { SITE_URL } from "./config.ts";
import { shareToken } from "./shares.ts";

// Consent per portfolio piece: whoever is recognisable on it says where it may be
// shown (the separate form the terms promise, part 3 article 12). routes/articleConsent.ts
// is both sides. A no, or a yes without the website, takes the piece off the site.
//
// In the kv store, like the pieces themselves:
//   portfolio:consent:<article>             who the studio asks, and the link's token
//   portfolio:consentLink:<token>           the piece a link belongs to
//   portfolio:consentAnswer:<article>:<id>  one answer; its own row, so two people
//                                           answering at once cannot overwrite each other

export const PLACES = ["website", "social", "print", "ads"] as const;
export type Place = (typeof PLACES)[number];
export const NAME_USES = ["none", "first", "full"] as const;
export type Language = "nl" | "en";

/** What someone agrees to, word for word. The form shows it and the answer keeps its own copy. */
export function statementFor(title: string, language: Language): string {
  return language === "en"
    ? `I give PDC permission to publish the photos or footage of "${title}" in the places I ticked, to show PDC's work. This is voluntary and does not change the quality or the price of a booking. There is no end date, and I can withdraw at any time with the link in the confirmation e-mail. PDC then stops this use and removes the work from places PDC manages. Earlier use stays lawful, and PDC cannot always remove posts that others shared themselves. I have read the privacy statement.`
    : `Ik geef PDC toestemming om de foto's of opnamen van "${title}" te publiceren op de plaatsen die ik heb aangevinkt, om het werk van PDC te laten zien. Dit is vrijwillig en verandert niets aan de kwaliteit of de prijs van een boeking. Er zit geen einddatum aan en ik kan mijn toestemming altijd intrekken via de link in de bevestigingsmail. PDC stopt dan met dit gebruik en haalt het werk weg van plaatsen die PDC beheert. Eerder gebruik blijft rechtmatig, en berichten die anderen zelf hebben gedeeld, kan PDC niet altijd weghalen. Ik heb de privacyverklaring gelezen.`;
}

export const consentPageUrl = (token: string, key?: string) => `${SITE_URL}/werk-toestemming/${token}${key ? `?k=${key}` : ""}`;

const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);

export type ConsentPerson = { name: string; email: string; sentAt: string };
export type ConsentSettings = { needed: boolean | null; people: ConsentPerson[]; note: string; token: string };

const settingsKey = (id: string) => `portfolio:consent:${id}`;

export async function settingsOf(id: string): Promise<ConsentSettings> {
  const raw = await kv.get(settingsKey(id));
  const s = raw ? (parse(raw) as any) : {};
  return { needed: typeof s.needed === "boolean" ? s.needed : null, people: Array.isArray(s.people) ? s.people : [], note: s.note || "", token: s.token || "" };
}

export const saveSettings = (id: string, s: ConsentSettings) => kv.set(settingsKey(id), JSON.stringify(s));

/** The piece's link: made the first time someone asks for it. */
export async function ensureToken(id: string): Promise<string> {
  const settings = await settingsOf(id);
  if (settings.token) return settings.token;
  const token = shareToken();
  await kv.set(`portfolio:consentLink:${token}`, JSON.stringify({ articleId: id }));
  await saveSettings(id, { ...settings, token });
  return token;
}

export async function articleOfToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{8,64}$/.test(token)) return null;
  const raw = await kv.get(`portfolio:consentLink:${token}`);
  return raw ? (parse(raw) as { articleId: string }).articleId : null;
}

export type ConsentAnswer = {
  id: string; articleId: string; key: string; answer: "given" | "refused"; places: Place[]; nameUse: (typeof NAME_USES)[number];
  limits: string; name: string; email: string; guardianOf: string; statement: string; language: Language; termsVersion: string;
  createdAt: string; updatedAt: string;
};

const answerKey = (articleId: string, id: string) => `portfolio:consentAnswer:${articleId}:${id}`;

export async function answersOf(articleId: string): Promise<ConsentAnswer[]> {
  const rows = await kv.getByPrefix(`portfolio:consentAnswer:${articleId}:`);
  return (rows.map(parse) as ConsentAnswer[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function allAnswers(): Promise<ConsentAnswer[]> {
  return (await kv.getByPrefix("portfolio:consentAnswer:")).map(parse) as ConsentAnswer[];
}

export const saveAnswer = (a: ConsentAnswer) => kv.set(answerKey(a.articleId, a.id), JSON.stringify(a));
export const removeAnswer = (articleId: string, id: string) => kv.del(answerKey(articleId, id));

/** A key of its own for each answer, in the mail, to change or withdraw it later. */
export function answerSecret(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Someone on this piece does not want it on the website. */
export async function websiteBlocked(id: string): Promise<boolean> {
  return (await answersOf(id)).some((a) => a.answer === "refused" || !a.places.includes("website"));
}

/** Takes a piece off the site when an answer says so; true when it actually came down. */
export async function takeDownIfBlocked(id: string): Promise<boolean> {
  if (!(await websiteBlocked(id))) return false;
  const raw = await kv.get(`portfolio:article:${id}`);
  if (!raw) return false;
  const article = JSON.parse(raw as string);
  if (!article.published) return false;
  await kv.set(`portfolio:article:${id}`, JSON.stringify({ ...article, published: false, featured: false, updatedAt: new Date().toISOString() }));
  return true;
}
