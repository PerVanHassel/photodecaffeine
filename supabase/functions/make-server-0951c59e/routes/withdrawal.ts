import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE } from "../lib/config.ts";
import { db, must } from "../lib/db.ts";
import { sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, text, z } from "../lib/http.ts";
import { withdrawalEmail, withdrawalStudioEmail, withdrawalSubject } from "../lib/legalEmails.ts";
import { notify } from "../lib/notify.ts";
import { withinContactLimit } from "./inquiries.ts";

const r = new Hono<Env>();
export default r;

// ============================================================================
// OVEREENKOMST HERROEPEN — the online withdrawal function (/herroepen on the site)
// ============================================================================
//
// Required since 19 June 2026 where consumers can agree online. No login: someone
// must be able to do this without remembering how they got here. The withdrawal
// counts from the moment it arrives, so it is kept whether or not a quote matches;
// the studio sees it, gets a task, and decides what is owed.

const REFUND_DAYS = 14;

/** The quote this is about: by the link from the quote page, or by number and address. */
async function findQuote(b: { quoteId?: string; token?: string; reference: string; email: string }) {
  if (b.quoteId && b.token && /^[0-9a-f-]{36}$/.test(b.quoteId)) {
    const q = must(await db.from("quotes").select("*").eq("id", b.quoteId).eq("token", b.token).maybeSingle()) as any;
    if (q) return q;
  }
  const number = b.reference.toUpperCase().match(/OF-\d{4}-\d+/)?.[0];
  if (!number) return null;
  return must(await db.from("quotes").select("*").eq("number", number).eq("client_email", b.email).maybeSingle()) as any;
}

r.post("/make-server-0951c59e/withdrawal", async (c) => {
  const b = await readBody(c, z.object({
    name: text(120).min(1, "Vul je naam in."),
    email: text(254).toLowerCase().regex(EMAIL_RE, "Vul een geldig e-mailadres in."),
    reference: text(120).min(1, "Zeg om welke offerte of boeking het gaat."),
    message: text(2000).default(""),
    quoteId: z.string().optional(),
    token: z.string().optional(),
    // The site's language when the withdrawal was made; the confirmation follows it.
    lang: z.string().optional(),
  }));
  const language = b.lang === "en" ? "en" : "nl";
  // This mails whatever address is typed in, just like the contact form.
  if (!(await withinContactLimit(c.req.header("x-forwarded-for")))) {
    fail(429, "Je hebt net al een paar berichten gestuurd. Probeer het over een uur opnieuw, of mail naar contact@photodecaffeine.com.");
  }

  const at = new Date().toISOString();
  const quote = await findQuote(b);
  const id = crypto.randomUUID();
  await kv.set(`withdrawals:${id}`, JSON.stringify({ id, at, name: b.name, email: b.email, reference: b.reference, message: b.message, quoteId: quote?.id || "", language }));

  if (quote) {
    const details = { ...(quote.details || {}), withdrawal: { at, name: b.name, email: b.email } };
    must(await db.from("quotes").update({ details }).eq("id", quote.id));
  }
  must(await db.from("tasks").insert({
    title: `Herroeping: ${b.name}`,
    notes: `${b.reference}\n${b.email}${b.message ? `\n\n${b.message}` : ""}${language === "en" ? "\n\nTaal: Engels" : ""}\n\nBetaal terug waar de klant recht op heeft, uiterlijk ${REFUND_DAYS} dagen na ontvangst.`,
    kind: "quote",
    project_id: quote?.project_id || null,
    client_id: quote?.client_id || null,
    due_at: new Date(Date.now() + REFUND_DAYS * 86400000).toISOString(),
  }));

  // The law wants the confirmation without delay; a failure here must not lose the withdrawal.
  const firstName = b.name.split(" ")[0];
  const reference = quote?.number ? `${quote.number}, ${quote.title}` : b.reference;
  const [mailed] = await Promise.all([
    sendEmail({ to: b.email, replyTo: EMAIL_ADMIN_NOTIFY, subject: withdrawalSubject(language), html: withdrawalEmail({ firstName, at, reference, language }) }),
    sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      replyTo: b.email,
      subject: `Herroeping: ${b.name} (${reference})`,
      html: withdrawalStudioEmail({ name: b.name, email: b.email, at, reference, message: b.message, known: quote ? `Gekoppeld aan ${quote.number}` : "Niet automatisch gekoppeld, zoek de boeking op", language }),
    }),
    notify({ type: "quote", title: `Herroeping: ${b.name}`, body: reference, link: "/admin/tasks" }),
  ]);
  return c.json({ at, mailed: mailed.ok });
});
