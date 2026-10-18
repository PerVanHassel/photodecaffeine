import { Hono } from "npm:hono";
import { fail, isoDateTime, readBody, requireAdmin, requirePermission, text as textField, uuid, z } from "../lib/http.ts";
import * as kv from "../kv_store.tsx";
import { verifyAdmin, verifyAuth } from "../lib/auth.ts";
import { clientForUser, projectIdsForClient, projectRecipients } from "../lib/clients.ts";
import { EMAIL_ADMIN_NOTIFY, SITE_URL } from "../lib/config.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { deleteReply, googleConnection, putReply } from "../lib/google.ts";
import { notify } from "../lib/notify.ts";
import { clientIdsOf, gallerySigner, loadProject, projectToApi } from "../lib/projects.ts";
import { db } from "../lib/db.ts";
import {
  googleLinks, linkProject, loadReview, loadReviews, removeReview, type Review, reviewsForProject, saveReviews, syncIfStale,
} from "../lib/reviews.ts";
import { imageKey, signPaths } from "../lib/storage.ts";
import { randomToken } from "../lib/util.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

/** Feedback keeps gallery image ids; turn them into URLs that work right now. */
async function withFreshPhotos(entries: any[]): Promise<any[]> {
  const ids = [...new Set(entries.flatMap((e) => (e.items || []).flatMap((i: any) => i.photoIds || [])))];
  if (!ids.length) return entries;
  const { data } = await db.from("gallery_images").select("id, url, storage_path").in("id", ids);
  const signed = await signPaths((data || []).map((g: any) => g.storage_path));
  const urlOf = new Map((data || []).map((g: any) => [g.id, g.storage_path ? signed.get(g.storage_path) || "" : g.url]));
  return entries.map((e) => ({
    ...e,
    items: (e.items || []).map((i: any) => (i.photoIds?.length ? { ...i, photoUrls: i.photoIds.map((id: string) => urlOf.get(id)).filter(Boolean) } : i)),
  }));
}

const r = new Hono();
export default r;

// Publishing reviews is part of the public site, like the portfolio.
r.use("/make-server-0951c59e/admin/reviews", requireAdmin as any, requirePermission("managePortfolio", "reviews") as any);
r.use("/make-server-0951c59e/admin/reviews/*", requireAdmin as any, requirePermission("managePortfolio", "reviews") as any);
r.use("/make-server-0951c59e/admin/feedback", requireAdmin as any, requirePermission("managePortfolio", "reviews") as any);

// ============================================================================
// REVIEWS & FEEDBACK
// ============================================================================
//
// Two separate things that both start with the studio asking:
//
//   Review   — written on Google. The request mails the client a link that
//              records the click and goes on to Google's review form; the
//              review comes back through the connected business profile (see
//              lib/reviews.ts). Never on the site until an admin publishes
//              it, and optionally tied to a project and a portfolio piece.
//   Feedback — private, and can be many per project: notes attached to one
//              photo, to several photos at once, or to no photo at all
//              (service, communication, whatever the client wants to raise).
//
// Requests are keyed by project. Feedback is given in the portal, so the
// project + the client's own login is all the authorisation needed; the
// review link carries a token instead, so it works without logging in.

const GENERAL_FEEDBACK_SCOPE = "general";

async function loadProjectForClient(projectId: string, user: any) {
  const client = await clientForUser(user);
  const ids = await projectIdsForClient(client.id);
  if (!ids.includes(projectId)) return { error: "Unauthorized", status: 403 as const };
  const row = await loadProject(projectId).catch(() => null);
  if (!row) return { error: "Project not found", status: 404 as const };
  return { project: projectToApi(row, await gallerySigner([row]), { forClient: true }), client };
}

// Shared by both request endpoints — they differ only in wording and key.
async function createRequest(kind: "review" | "feedback", projectId: string, adminName: string) {
  const row = await loadProject(projectId).catch(() => null);
  if (!row) return { error: "Project not found", status: 404 };
  const project = { id: row.id, title: row.title, clientId: clientIdsOf(row)[0] || "" };
  const clients = await projectRecipients(projectId);
  if (clients.length === 0) return { error: "Klant niet gevonden bij dit project.", status: 404 };
  const client = clients[0];
  const isReview = kind === "review";

  // Asking again keeps the link from the first mail working.
  const previous = JSON.parse((await kv.get(`${kind}:request:${projectId}`)) || "null");
  const token = isReview ? previous?.token || randomToken() : undefined;
  const request = {
    projectId,
    clientId: project.clientId,
    clientIds: clientIdsOf(row),
    kind,
    status: previous?.status === "clicked" ? "clicked" : "pending",
    requestedAt: new Date().toISOString(),
    requestedBy: adminName,
    ...(isReview ? { token, clickedAt: previous?.clickedAt, clicks: previous?.clicks || 0 } : {}),
  };
  await kv.set(`${kind}:request:${projectId}`, JSON.stringify(request));
  if (token) await kv.set(`review:token:${token}`, JSON.stringify(projectId));

  const firstName = client.name.split(" ")[0];
  const link = isReview ? `${SITE_URL}/review/${token}` : `${SITE_URL}/portal/project/${projectId}`;

  const sent = await sendEmail({
    to: clients.map((c2) => c2.email),
    replyTo: EMAIL_ADMIN_NOTIFY,
    subject: isReview
      ? `Wil je ons een review geven op Google? — ${project.title}`
      : `We horen graag je feedback — ${project.title}`,
    html: emailWrap(`
      <tr>
        <td style="padding:32px 36px 0;">
          <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${isReview ? "Review" : "Feedback"}</span>
          <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
          <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${isReview ? "Hoe was het?" : "Wat vond je ervan?"}</span>
          <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:6px;">${escapeHtml(project.title)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 36px 0;">
          <span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Hallo ${escapeHtml(firstName)}, ${isReview
            ? "we zijn benieuwd hoe je de samenwerking hebt ervaren. Een korte review op Google kost je een minuutje, helpt ons enorm — en helpt anderen kiezen."
            : "we willen graag weten wat je van het resultaat vindt. Je kunt opmerkingen achterlaten bij losse foto&#39;s, bij meerdere foto&#39;s tegelijk, of over de samenwerking in het algemeen."}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:26px 36px 40px;">
          <a href="${link}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">${isReview ? "Review schrijven op Google" : "Feedback geven"}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);">
          <span style="color:rgba(255,251,224,0.2);font-size:11px;">${isReview
            ? "De knop opent het reviewformulier van Google; daarvoor heb je een Google-account nodig. Vragen? Antwoord gerust op deze mail."
            : "Log in op je klantenportaal met dit e-mailadres; het formulier staat klaar bij je project. Vragen? Antwoord gerust op deze mail."}</span>
        </td>
      </tr>
    `),
  });

  if (!sent.ok) {
    return { error: sent.error || "De uitnodiging kon niet verstuurd worden.", status: 502 };
  }
  return { request, clientEmail: clients.map((c2) => c2.email).join(", ") };
}

// --- POST /admin/project/:id/request-review ---
r.post("/make-server-0951c59e/admin/project/:id/request-review", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    const res = await createRequest("review", c.req.param("id"), admin.user_metadata?.name || "PDC Studio");
    if (res.error) return c.json({ error: res.error }, res.status as any);
    return c.json({ success: true, request: res.request, sentTo: res.clientEmail });
  } catch (err) {
    console.log("Request review error:", err);
    return c.json({ error: `Review aanvragen mislukt: ${err}` }, 500);
  }
});

// --- POST /admin/project/:id/request-feedback ---
r.post("/make-server-0951c59e/admin/project/:id/request-feedback", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    const res = await createRequest("feedback", c.req.param("id"), admin.user_metadata?.name || "PDC Studio");
    if (res.error) return c.json({ error: res.error }, res.status as any);
    return c.json({ success: true, request: res.request, sentTo: res.clientEmail });
  } catch (err) {
    console.log("Request feedback error:", err);
    return c.json({ error: `Feedback aanvragen mislukt: ${err}` }, 500);
  }
});

// --- GET /admin/project/:id/engagement — request state + answers for one project ---
r.get("/make-server-0951c59e/admin/project/:id/engagement", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    const projectId = c.req.param("id");

    const [reviewReqStr, feedbackReqStr, reviews, feedbackIdsStr] = await Promise.all([
      kv.get(`review:request:${projectId}`),
      kv.get(`feedback:request:${projectId}`),
      reviewsForProject(projectId),
      kv.get(`feedback:byProject:${projectId}`),
    ]);

    const feedbackIds: string[] = feedbackIdsStr ? JSON.parse(feedbackIdsStr) : [];
    const feedbackValues = await Promise.all(feedbackIds.map((id) => kv.get(`feedback:${id}`)));
    const feedback = await withFreshPhotos(feedbackValues.filter(Boolean).map((v) => JSON.parse(v as string)));
    const { token, ...reviewRequest } = reviewReqStr ? JSON.parse(reviewReqStr) : { token: null };

    return c.json({
      // The link from the mail, to pass on by WhatsApp or text as well.
      reviewRequest: reviewReqStr ? { ...reviewRequest, link: token ? `${SITE_URL}/review/${token}` : null } : null,
      feedbackRequest: feedbackReqStr ? JSON.parse(feedbackReqStr) : null,
      review: reviews[0] || null,
      feedback,
    });
  } catch (err) {
    console.log("Get engagement error:", err);
    return c.json({ error: `Failed to fetch engagement: ${err}` }, 500);
  }
});

// --- GET /admin/reviews — every review, published or not ---
r.get("/make-server-0951c59e/admin/reviews", async (c) => {
  // Opening the page is the natural moment to look for new ones on Google.
  await syncIfStale(10);
  return c.json({ reviews: await loadReviews() });
});

const stars = z.number().int().min(1, "Kies 1 tot 5 sterren.").max(5, "Kies 1 tot 5 sterren.");

// --- POST /admin/reviews — a Google review typed in by hand ---
// For before the business profile is connected. Once it is, the real review
// replaces this one (same name and stars) and keeps its links.
r.post("/make-server-0951c59e/admin/reviews", async (c) => {
  const body = await readBody(c, z.object({
    clientName: textField(120).min(1, "Vul de naam in zoals die op Google staat."),
    rating: stars,
    text: textField(5000),
    createdAt: isoDateTime.optional(),
    projectId: uuid.nullable().optional(),
    published: z.boolean().optional(),
  }));
  const now = new Date().toISOString();
  let review: Review = {
    id: crypto.randomUUID(),
    source: "google",
    googleId: null,
    googleName: null,
    clientName: body.clientName,
    photoUrl: "",
    rating: body.rating,
    text: body.text,
    reply: null,
    projectId: null,
    projectTitle: "",
    portfolioArticleId: null,
    published: body.published ?? false,
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  if (body.projectId) review = await linkProject(review, body.projectId);
  await saveReviews([review]);
  return c.json({ review });
});

// --- PUT /admin/reviews/:id — publish, link to a project or portfolio piece ---
// What a reviewer wrote stays theirs; only a review typed in by hand can be
// corrected here.
r.put("/make-server-0951c59e/admin/reviews/:id", async (c) => {
  const body = await readBody(c, z.object({
    published: z.boolean().optional(),
    portfolioArticleId: z.string().trim().min(1).nullable().optional(),
    projectId: uuid.nullable().optional(),
    clientName: textField(120).min(1).optional(),
    rating: stars.optional(),
    text: textField(5000).optional(),
    createdAt: isoDateTime.optional(),
  }));
  let review = await loadReview(c.req.param("id"));
  const typedByHand = review.source === "google" && !review.googleId;
  if (!typedByHand && (body.clientName !== undefined || body.rating !== undefined || body.text !== undefined || body.createdAt !== undefined)) {
    fail(400, "Wat de klant schreef kun je niet aanpassen.");
  }
  if (body.projectId !== undefined && body.projectId !== review.projectId) review = await linkProject(review, body.projectId);
  review = {
    ...review,
    ...(body.published !== undefined ? { published: body.published } : {}),
    ...(body.portfolioArticleId !== undefined ? { portfolioArticleId: body.portfolioArticleId } : {}),
    ...(typedByHand ? {
      clientName: body.clientName ?? review.clientName,
      rating: body.rating ?? review.rating,
      text: body.text ?? review.text,
      createdAt: body.createdAt ?? review.createdAt,
    } : {}),
    updatedAt: new Date().toISOString(),
  };
  await saveReviews([review]);
  return c.json({ review });
});

// --- PUT /admin/reviews/:id/reply — answer a review on Google ---
r.put("/make-server-0951c59e/admin/reviews/:id/reply", async (c) => {
  const { text } = await readBody(c, z.object({ text: textField(4000).min(1, "Schrijf eerst een antwoord.") }));
  const review = await loadReview(c.req.param("id"));
  const conn = await googleConnection();
  if (!review.googleName) fail(400, "Deze review komt niet van het gekoppelde Google-profiel; antwoorden kan alleen op Google zelf.");
  if (!conn) fail(400, "Koppel eerst Google om te kunnen antwoorden.");
  const reply = await putReply(conn, review.googleName, text);
  const updated = { ...review, reply: { text: reply.comment || text, updatedAt: reply.updateTime || new Date().toISOString() } };
  await saveReviews([updated]);
  return c.json({ review: updated });
});

// --- DELETE /admin/reviews/:id/reply ---
r.delete("/make-server-0951c59e/admin/reviews/:id/reply", async (c) => {
  const review = await loadReview(c.req.param("id"));
  const conn = await googleConnection();
  if (!review.googleName || !conn) fail(400, "Koppel eerst Google om je antwoord te verwijderen.");
  await deleteReply(conn, review.googleName);
  const updated = { ...review, reply: null };
  await saveReviews([updated]);
  return c.json({ review: updated });
});

// --- DELETE /admin/reviews/:id ---
// A review from the Google profile would only come back with the next sync;
// it leaves the site by unpublishing it, or for good by deleting it on Google.
r.delete("/make-server-0951c59e/admin/reviews/:id", async (c) => {
  const review = await loadReview(c.req.param("id"));
  if (review.googleId) fail(400, "Deze review staat op Google. Haal hem van de site met Verbergen.");
  await removeReview(review);
  return c.json({ success: true });
});

// --- GET /admin/feedback — all feedback across projects ---
r.get("/make-server-0951c59e/admin/feedback", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const idsStr = await kv.get("feedback:feedbackIds");
    const ids: string[] = idsStr ? JSON.parse(idsStr) : [];
    const values = await Promise.all(ids.map((id) => kv.get(`feedback:${id}`)));
    const feedback = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ feedback: await withFreshPhotos(feedback) });
  } catch (err) {
    console.log("Get feedback error:", err);
    return c.json({ error: `Failed to fetch feedback: ${err}` }, 500);
  }
});

// --- GET /portal/project/:id/engagement — what the client is being asked ---
r.get("/make-server-0951c59e/portal/project/:id/engagement", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const loaded = await loadProjectForClient(projectId, user);
    if (loaded.error) return c.json({ error: loaded.error }, loaded.status);

    const [reviewReqStr, feedbackReqStr, reviews, feedbackIdsStr, links] = await Promise.all([
      kv.get(`review:request:${projectId}`),
      kv.get(`feedback:request:${projectId}`),
      reviewsForProject(projectId),
      kv.get(`feedback:byProject:${projectId}`),
      googleLinks(),
    ]);

    const feedbackIds: string[] = feedbackIdsStr ? JSON.parse(feedbackIdsStr) : [];
    const request = reviewReqStr ? JSON.parse(reviewReqStr) : null;
    const review = reviews[0];

    return c.json({
      reviewRequested: !!request,
      // Through the request's link when there is one, so the click is counted.
      reviewLink: request?.token ? `${SITE_URL}/review/${request.token}` : links.reviewUrl,
      review: review ? { rating: review.rating, text: review.text, source: review.source } : null,
      feedbackRequested: !!feedbackReqStr,
      feedbackCount: feedbackIds.length,
    });
  } catch (err) {
    console.log("Portal get engagement error:", err);
    return c.json({ error: `Failed to fetch engagement: ${err}` }, 500);
  }
});

// --- POST /review/open — the link in the review mail ---
// Public: the token stands in for a login. Counts the click and says where
// Google's review form is; an unknown token still gets the form.
r.post("/make-server-0951c59e/review/open", async (c) => {
  const { token } = await readBody(c, z.object({ token: z.string().regex(/^[a-f0-9]{32}$/, "Ongeldige link.") }));
  const links = await googleLinks();
  const projectId = JSON.parse((await kv.get(`review:token:${token}`)) || "null");
  const key = `review:request:${projectId}`;
  const request = projectId ? JSON.parse((await kv.get(key)) || "null") : null;
  if (request?.token === token) {
    const now = new Date().toISOString();
    await kv.set(key, JSON.stringify({
      ...request,
      status: request.status === "submitted" ? "submitted" : "clicked",
      clickedAt: request.clickedAt || now,
      lastClickAt: now,
      clicks: (request.clicks || 0) + 1,
    }));
  }
  return c.json({ url: links.reviewUrl });
});

// --- POST /portal/project/:id/feedback — client submits feedback notes ---
r.post("/make-server-0951c59e/portal/project/:id/feedback", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const loaded = await loadProjectForClient(projectId, user);
    if (loaded.error) return c.json({ error: loaded.error }, loaded.status);
    const project = loaded.project;

    const body = await c.req.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    // Photos are referenced by gallery image id (newer screens) or by URL
    // (older ones); only images that belong to this gallery are accepted. The
    // id is what is kept, because private image URLs expire.
    const gallery: { id: string; url: string }[] = project.gallery || [];
    const byKey = new Map(gallery.map((g) => [imageKey(g.url), g]));
    const byId = new Map(gallery.map((g) => [g.id, g]));

    const items = rawItems
      .map((item: any) => {
        const text = String(item?.text || "").trim();
        if (!text) return null;
        const picked = [
          ...(Array.isArray(item?.photoIds) ? item.photoIds : []).map((id: any) => byId.get(String(id))),
          ...(Array.isArray(item?.photoUrls) ? item.photoUrls : []).map((u: any) => (typeof u === "string" ? byKey.get(imageKey(u)) : undefined)),
        ].filter(Boolean) as { id: string; url: string }[];
        const unique = [...new Map(picked.map((g) => [g.id, g])).values()];
        const photoUrls = unique.map((g) => g.url);
        return {
          id: crypto.randomUUID(),
          scope: photoUrls.length > 0 ? "photos" : GENERAL_FEEDBACK_SCOPE,
          photoIds: unique.map((g) => g.id),
          photoUrls,
          category: photoUrls.length > 0 ? "" : String(item?.category || "").trim() || "Algemeen",
          text,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      return c.json({ error: "Schrijf minstens één opmerking voordat je verstuurt." }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const entry = {
      id,
      projectId,
      projectTitle: project.title,
      clientId: user.id,
      clientName: user.user_metadata?.name || user.email,
      items,
      createdAt: now,
    };
    await kv.set(`feedback:${id}`, JSON.stringify(entry));

    const byProjectStr = await kv.get(`feedback:byProject:${projectId}`);
    const byProject: string[] = byProjectStr ? JSON.parse(byProjectStr) : [];
    byProject.push(id);
    await kv.set(`feedback:byProject:${projectId}`, JSON.stringify(byProject));

    const idsStr = await kv.get("feedback:feedbackIds");
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.push(id);
    await kv.set("feedback:feedbackIds", JSON.stringify(ids));

    const requestStr = await kv.get(`feedback:request:${projectId}`);
    if (requestStr) {
      const request = JSON.parse(requestStr);
      await kv.set(`feedback:request:${projectId}`, JSON.stringify({ ...request, status: "submitted", submittedAt: now }));
    }

    const photoNoteCount = items.filter((i: any) => i.scope === "photos").length;
    const generalNoteCount = items.length - photoNoteCount;
    const rows = items
      .map((i: any) => {
        const head = i.scope === "photos"
          ? `${i.photoUrls.length} foto${i.photoUrls.length === 1 ? "" : "'s"}`
          : escapeHtml(i.category);
        const thumbs = i.photoUrls
          .slice(0, 4)
          .map((u: string) => `<img src="${u}" width="54" height="54" alt="" style="width:54px;height:54px;object-fit:cover;display:inline-block;margin:6px 6px 0 0;border:1px solid rgba(255,251,224,0.12);" />`)
          .join("");
        return `<tr><td style="padding:14px 0;border-bottom:1px solid rgba(255,251,224,0.06);">
          <span style="display:block;color:#c8905a;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">${head}</span>
          <div style="height:7px;line-height:7px;font-size:0;">&nbsp;</div>
          <span style="color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${escapeHtml(i.text).replace(/\n/g, "<br>")}</span>
          ${thumbs ? `<div>${thumbs}</div>` : ""}
        </td></tr>`;
      })
      .join("");

    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      subject: `Feedback van ${entry.clientName} — ${project.title}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Nieuwe Feedback</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:20px;font-weight:800;">${escapeHtml(entry.clientName)}</span>
            <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(project.title)} &middot; ${photoNoteCount} bij foto&#39;s, ${generalNoteCount} algemeen</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 36px;">
            <a href="${SITE_URL}/admin/project/${projectId}" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Open het project</a>
          </td>
        </tr>
      `),
    });

    await notify({
      type: "feedback",
      title: `Feedback van ${entry.clientName}`,
      body: `${project.title} — ${items.length} opmerking${items.length === 1 ? "" : "en"}`,
      link: `/admin/project/${projectId}`,
    });

    return c.json({ feedback: entry });
  } catch (err) {
    console.log("Submit feedback error:", err);
    return c.json({ error: `Feedback opslaan mislukt: ${err}` }, 500);
  }
});

// --- GET /reviews — published reviews for the public site ---
r.get("/make-server-0951c59e/reviews", async (c) => {
  // The site is visited far more often than the admin, so it keeps the
  // Google reviews fresh too — after the answer has gone out.
  const sync = syncIfStale(6 * 60);
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(sync);
  else await sync;

  const [all, links] = await Promise.all([loadReviews(), googleLinks()]);
  const reviews = all
    .filter((r) => r.published)
    // Only what a visitor needs — no client id, no project id.
    .map((r) => ({
      id: r.id,
      source: r.source,
      clientName: r.clientName,
      photoUrl: r.photoUrl,
      rating: r.rating,
      text: r.text,
      projectTitle: r.projectTitle,
      portfolioArticleId: r.portfolioArticleId,
      createdAt: r.createdAt,
    }));
  const google = links.count ? { rating: links.rating, count: links.count, url: links.mapsUrl } : null;
  return c.json({ reviews, google });
});

