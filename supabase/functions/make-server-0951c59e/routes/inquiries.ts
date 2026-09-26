import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { AD_VISIT_MARKER, EMAIL_RE, SITE_URL } from "../lib/config.ts";
import { clientToApi } from "../lib/clients.ts";
import { db, found, must, nextDocumentNumber } from "../lib/db.ts";
import { emailWrap, escapeHtml, getPromoPortfolioArticle, glassImageCard, sendEmail } from "../lib/email.ts";
import { EMAIL_ADMIN_NOTIFY } from "../lib/config.ts";
import { type Env, fail, readBody, requireAdmin, text, uuid, z } from "../lib/http.ts";
import { notify } from "../lib/notify.ts";

const r = new Hono<Env>();
export default r;

const CONTACT_LIMIT_PER_HOUR = 5;

/** Counts a contact submission for this IP; false once the hourly limit is reached. */
async function withinContactLimit(forwardedFor: string | undefined): Promise<boolean> {
  const ip = String(forwardedFor || "").split(",")[0].trim();
  if (!ip) return true;
  const key = `ratelimit:contact:${ip}`;
  const now = Date.now();
  const str = await kv.get(key);
  const entry = str ? JSON.parse(str) : null;
  const fresh = !entry || now - entry.windowStart > 3600_000;
  const next = fresh ? { windowStart: now, count: 1 } : { ...entry, count: entry.count + 1 };
  if (next.count > CONTACT_LIMIT_PER_HOUR) return false;
  await kv.set(key, JSON.stringify(next));
  return true;
}

// --- POST /contact — public contact form submission ---
r.post("/make-server-0951c59e/contact", async (c) => {
  try {
    const { name, email, phone, brand, message, package: pkg } = await c.req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return c.json({ error: "Name, email, and message are required" }, 400);
    }
    if (name !== AD_VISIT_MARKER) {
      if (!EMAIL_RE.test(String(email).trim())) {
        return c.json({ error: "Vul een geldig e-mailadres in." }, 400);
      }
      if (String(message).length > 5000 || String(name).length > 200) {
        return c.json({ error: "Je bericht is te lang." }, 400);
      }
      // The form mails a confirmation to whatever address is typed in, so it
      // must not be usable as a free mail cannon.
      if (!(await withinContactLimit(c.req.header("x-forwarded-for")))) {
        return c.json({ error: "Je hebt net al een paar berichten gestuurd. Probeer het over een uur opnieuw." }, 429);
      }
    }

    // An ad click is a counter, not an enquiry: nobody wrote it and its email
    // address does not exist. Counting it is the whole job.
    if (name === AD_VISIT_MARKER) {
      let page = "";
      try { page = JSON.parse(String(message))?.page || ""; } catch { /* not JSON */ }
      must(await db.from("ad_visits").insert({ ref: String(brand || "").slice(0, 100), page: String(page).slice(0, 300) }));
      return c.json({ success: true });
    }

    const inquiry = must(await db.from("inquiries").insert({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || "",
      brand: brand?.trim() || "",
      message: message.trim(),
      package: pkg || "",
    }).select("*").single()) as any;

    await notify({
      type: "inquiry",
      title: `Nieuwe aanvraag van ${inquiry.name}`,
      body: inquiry.message,
      link: `/admin/inquiries?open=${inquiry.id}`,
    });

    // Notify admin — reply-to set to the visitor so replying goes straight to them
    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      replyTo: inquiry.email,
      subject: `Nieuwe aanvraag van ${inquiry.name}${inquiry.brand ? ` (${inquiry.brand})` : ""}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Nieuwe Aanvraag</span>
            <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:24px;font-weight:800;letter-spacing:-0.01em;line-height:1.2;">${escapeHtml(inquiry.name)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);width:88px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">E-mail</td>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);"><a href="mailto:${inquiry.email}" style="color:#c8905a;font-size:13px;text-decoration:none;">${inquiry.email}</a></td>
              </tr>
              ${inquiry.phone ? `<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Telefoon</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${escapeHtml(inquiry.phone)}</td></tr>` : ""}
              ${inquiry.brand ? `<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Merk</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${escapeHtml(inquiry.brand)}</td></tr>` : ""}
              ${inquiry.package ? `<tr><td style="padding:9px 0;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Pakket</td><td style="padding:9px 0;color:#fffbe0;font-size:13px;">${escapeHtml(inquiry.package)}</td></tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 0;"><span style="color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Bericht</span></td>
        </tr>
        <tr>
          <td style="padding:10px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 36px;">
            <a href="mailto:${inquiry.email}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Reageer naar ${inquiry.name.split(" ")[0]}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Verzonden via het contactformulier op photodecaffeine.com</span></td>
        </tr>
      `),
    });

    // Confirmation to the visitor, with an optional "meer van ons werk" promo card
    const promo = await getPromoPortfolioArticle();
    const promoRows = promo
      ? `
        <tr>
          <td style="padding:40px 36px 0;"><span style="color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Meer Van Ons Werk</span></td>
        </tr>
        ${glassImageCard({
          imageUrl: promo.coverUrl,
          eyebrow: promo.category || "Portfolio",
          title: promo.title,
          ctaText: "Bekijk in de portfolio &rarr;",
          accentColor: "#c8905a",
          linkUrl: `${SITE_URL}/portfolio/${promo.id}`,
          topSpace: 190,
        })}`
      : "";

    await sendEmail({
      to: inquiry.email,
      subject: "We hebben je bericht ontvangen — PhotoDeCaffeine",
      html: emailWrap(`
        <tr>
          <td style="padding:40px 36px 0;text-align:center;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Bericht Ontvangen</span>
            <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;text-transform:uppercase;">Bedankt, ${escapeHtml(inquiry.name.split(" ")[0])}.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px 0;text-align:center;"><span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">We bekijken jouw brief en nemen binnen één werkdag contact met je op. Bedankt voor het overwegen van PDC.</span></td>
        </tr>
        <tr>
          <td style="padding:32px 36px 0;"><span style="color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">Jouw Bericht</span></td>
        </tr>
        <tr>
          <td style="padding:10px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.55);font-size:13.5px;line-height:1.7;font-style:italic;">"${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}"</td></tr>
            </table>
          </td>
        </tr>
        ${promoRows}
        <tr>
          <td style="padding:36px 36px 0;text-align:center;"><span style="color:#c8905a;font-size:14px;font-style:italic;font-weight:300;">Gemaakt als Koffie, Geschoten als Cinema.</span></td>
        </tr>
        <tr>
          <td style="padding:32px 36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,251,224,0.06);">
              <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="padding:5px 0;color:rgba(255,251,224,0.25);font-size:11px;text-align:center;"><a href="mailto:contact@photodecaffeine.com" style="color:rgba(255,251,224,0.45);text-decoration:none;">contact@photodecaffeine.com</a> &nbsp;·&nbsp; +31 6 36112514 &nbsp;·&nbsp; Roosendaal, Nederland</td></tr>
              <tr><td style="padding:5px 0;color:rgba(255,251,224,0.2);font-size:11px;text-align:center;">Reactie binnen 24u &nbsp;·&nbsp; @photodecaffeine</td></tr>
            </table>
          </td>
        </tr>
      `),
    });

    return c.json({ success: true });
  } catch (err) {
    console.log("Contact form error:", err);
    return c.json({ error: `Failed to submit contact form: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Admin: inquiries
// ---------------------------------------------------------------------------

const A = "/make-server-0951c59e/admin";
r.use(`${A}/inquiries`, requireAdmin);
r.use(`${A}/inquiry/*`, requireAdmin);
r.use(`${A}/ads`, requireAdmin);
r.use(`${A}/ads/*`, requireAdmin);

function inquiryToApi(i: any) {
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    phone: i.phone,
    brand: i.brand,
    message: i.message,
    package: i.package,
    handledAt: i.handled_at,
    handled: Boolean(i.handled_at),
    clientId: i.client_id,
    projectId: i.project_id,
    createdAt: i.created_at,
  };
}

// Ad clicks used to be stored as inquiries and older screens still count them
// from this list, so they are included in that shape unless ?visits=0.
r.get(`${A}/inquiries`, async (c) => {
  const rows = must(await db.from("inquiries").select("*").order("created_at", { ascending: false })) || [];
  const inquiries = rows.map(inquiryToApi);
  if (c.req.query("visits") === "0") return c.json({ inquiries });
  const visits = must(await db.from("ad_visits").select("*").order("created_at", { ascending: false }).limit(5000)) || [];
  return c.json({
    inquiries: [
      ...inquiries,
      ...visits.map((v: any) => ({
        id: v.id,
        name: AD_VISIT_MARKER,
        email: "visit@tracking.internal",
        phone: "",
        brand: v.ref,
        message: JSON.stringify({ ref: v.ref, page: v.page }),
        package: "__visit__",
        createdAt: v.created_at,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
});

r.put(`${A}/inquiry/:id`, async (c) => {
  const b = await readBody(c, z.object({ handled: z.boolean() }));
  const row = found(
    await db.from("inquiries").update({ handled_at: b.handled ? new Date().toISOString() : null }).eq("id", c.req.param("id")).select("*").maybeSingle(),
    "Aanvraag niet gevonden",
  );
  return c.json({ inquiry: inquiryToApi(row) });
});

r.delete(`${A}/inquiry/:id`, async (c) => {
  const id = c.req.param("id");
  must(await db.from("inquiries").delete().eq("id", id));
  // Older screens also delete ad clicks through this route.
  must(await db.from("ad_visits").delete().eq("id", id));
  return c.json({ success: true });
});

// Turns an inquiry into work in one step: a client (reused when the email is
// already known), optionally a project in the pipeline, optionally a draft
// quote. The inquiry is marked handled and linked to what it became.
r.post(`${A}/inquiry/:id/convert`, async (c) => {
  const id = c.req.param("id");
  const inq = found(await db.from("inquiries").select("*").eq("id", id).maybeSingle(), "Aanvraag niet gevonden") as any;
  const b = await readBody(c, z.object({
    name: text(200).optional(),
    company: text(200).optional(),
    project: z.object({
      title: text(200).min(1, "Geef het project een titel."),
      type: z.enum(["photo", "video", "web"]).default("photo"),
    }).nullable().default(null),
    quote: z.boolean().default(false),
  }));

  const email = String(inq.email || "").trim().toLowerCase();
  let client = email && EMAIL_RE.test(email)
    ? must(await db.from("clients").select("*").ilike("email", email).maybeSingle()) as any
    : null;
  if (!client) {
    client = must(await db.from("clients").insert({
      name: b.name || inq.name,
      email: EMAIL_RE.test(email) ? email : "",
      phone: inq.phone || "",
      company: b.company ?? inq.brand ?? "",
      notes: `Aanvraag van ${new Date(inq.created_at).toLocaleDateString("nl-NL")}:\n${inq.message}`,
    }).select("*").single());
  }

  let projectId: string | null = null;
  if (b.project) {
    const project = must(await db.from("projects").insert({
      title: b.project.title,
      type: b.project.type,
      stage: b.quote ? "quote" : "lead",
      status: "in_progress",
      description: inq.message,
      inquiry_id: inq.id,
      created_by: c.get("user").id,
    }).select("id").single()) as any;
    projectId = project.id;
    must(await db.from("project_clients").insert({ project_id: projectId, client_id: client.id, position: 0 }));
  }

  let quoteId: string | null = null;
  if (b.quote) {
    const quote = must(await db.from("quotes").insert({
      number: await nextDocumentNumber("OF"),
      type: b.project?.type === "web" ? "web" : "photo",
      title: b.project?.title || `Prijsopgave ${client.name}`,
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      project_id: projectId,
      status: "draft",
      created_by: { id: c.get("user").id, name: c.get("user").user_metadata?.name || c.get("user").email },
    }).select("id").single()) as any;
    quoteId = quote.id;
  }

  must(await db.from("inquiries").update({ handled_at: new Date().toISOString(), client_id: client.id, project_id: projectId }).eq("id", id));
  return c.json({ client: clientToApi(client), projectId, quoteId });
});

// ---------------------------------------------------------------------------
// Admin: ad campaigns
// ---------------------------------------------------------------------------
// Visits per campaign ref per day, plus the labels and switches the Ads page
// used to keep in the browser.

r.get(`${A}/ads`, async (c) => {
  const since = new Date(Date.now() - 365 * 86400000).toISOString();
  const [visits, campaigns] = await Promise.all([
    db.from("ad_visits").select("ref, page, created_at").gte("created_at", since).order("created_at"),
    db.from("ad_campaigns").select("*"),
  ]);
  return c.json({
    visits: (must(visits) || []).map((v: any) => ({ ref: v.ref, page: v.page, createdAt: v.created_at })),
    campaigns: (must(campaigns) || []).map((x: any) => ({ ref: x.ref, label: x.label, active: x.active, hidden: x.hidden })),
  });
});

r.put(`${A}/ads/:ref`, async (c) => {
  const ref = decodeURIComponent(c.req.param("ref")).slice(0, 100);
  const b = await readBody(c, z.object({ label: text(200).optional(), active: z.boolean().optional(), hidden: z.boolean().optional() }));
  const row = must(await db.from("ad_campaigns").upsert({ ref, ...b, updated_at: new Date().toISOString() }, { onConflict: "ref" }).select("*").single()) as any;
  return c.json({ campaign: { ref: row.ref, label: row.label, active: row.active, hidden: row.hidden } });
});

