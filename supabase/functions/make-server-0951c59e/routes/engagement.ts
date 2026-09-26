import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { verifyAdmin, verifyAuth } from "../lib/auth.ts";
import { clientForUser, projectIdsForClient, projectRecipients } from "../lib/clients.ts";
import { EMAIL_ADMIN_NOTIFY, SITE_URL } from "../lib/config.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { notify } from "../lib/notify.ts";
import { clientIdsOf, gallerySigner, loadProject, projectToApi } from "../lib/projects.ts";
import { imageKey } from "../lib/storage.ts";

const r = new Hono();
export default r;

// ============================================================================
// REVIEWS & FEEDBACK
// ============================================================================
//
// Two separate things that share one shape: the studio asks, the client
// answers from inside the portal.
//
//   Review   — one per project: 1-5 stars + a short text, meant for the public
//              site. Never public until an admin publishes it, and optionally
//              tied to a portfolio piece so a reader can jump to the work.
//   Feedback — private, and can be many per project: notes attached to one
//              photo, to several photos at once, or to no photo at all
//              (service, communication, whatever the client wants to raise).
//
// Requests are keyed by project rather than by a token: the client reaches the
// form by logging in, so the project + their own user id is all the
// authorisation needed.

const GENERAL_FEEDBACK_SCOPE = "general";

function starString(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

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

  const request = {
    projectId,
    clientId: project.clientId,
    clientIds: clientIdsOf(row),
    kind,
    status: "pending",
    requestedAt: new Date().toISOString(),
    requestedBy: adminName,
  };
  await kv.set(`${kind}:request:${projectId}`, JSON.stringify(request));

  const firstName = client.name.split(" ")[0];
  const link = `${SITE_URL}/portal/project/${projectId}`;
  const isReview = kind === "review";

  const sent = await sendEmail({
    to: clients.map((c2) => c2.email),
    replyTo: EMAIL_ADMIN_NOTIFY,
    subject: isReview
      ? `Wil je een review achterlaten? — ${project.title}`
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
            ? "we zijn benieuwd hoe je de samenwerking hebt ervaren. Een korte review met een sterbeoordeling helpt ons enorm — en helpt anderen kiezen."
            : "we willen graag weten wat je van het resultaat vindt. Je kunt opmerkingen achterlaten bij losse foto&#39;s, bij meerdere foto&#39;s tegelijk, of over de samenwerking in het algemeen."}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:26px 36px 40px;">
          <a href="${link}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">${isReview ? "Review achterlaten" : "Feedback geven"}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);">
          <span style="color:rgba(255,251,224,0.2);font-size:11px;">Log in op je klantenportaal met dit e-mailadres; het formulier staat klaar bij je project. Vragen? Antwoord gerust op deze mail.</span>
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

    const [reviewReqStr, feedbackReqStr, reviewIdStr, feedbackIdsStr] = await Promise.all([
      kv.get(`review:request:${projectId}`),
      kv.get(`feedback:request:${projectId}`),
      kv.get(`review:byProject:${projectId}`),
      kv.get(`feedback:byProject:${projectId}`),
    ]);

    const review = reviewIdStr ? JSON.parse((await kv.get(`review:${reviewIdStr}`)) || "null") : null;
    const feedbackIds: string[] = feedbackIdsStr ? JSON.parse(feedbackIdsStr) : [];
    const feedbackValues = await Promise.all(feedbackIds.map((id) => kv.get(`feedback:${id}`)));
    const feedback = feedbackValues.filter(Boolean).map((v) => JSON.parse(v as string));

    return c.json({
      reviewRequest: reviewReqStr ? JSON.parse(reviewReqStr) : null,
      feedbackRequest: feedbackReqStr ? JSON.parse(feedbackReqStr) : null,
      review,
      feedback,
    });
  } catch (err) {
    console.log("Get engagement error:", err);
    return c.json({ error: `Failed to fetch engagement: ${err}` }, 500);
  }
});

// --- GET /admin/reviews — every review, published or not ---
r.get("/make-server-0951c59e/admin/reviews", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const idsStr = await kv.get("review:reviewIds");
    const ids: string[] = idsStr ? JSON.parse(idsStr) : [];
    const values = await Promise.all(ids.map((id) => kv.get(`review:${id}`)));
    const reviews = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reviews });
  } catch (err) {
    console.log("Get reviews error:", err);
    return c.json({ error: `Failed to fetch reviews: ${err}` }, 500);
  }
});

// --- PUT /admin/reviews/:id — publish/unpublish, link a portfolio piece ---
r.put("/make-server-0951c59e/admin/reviews/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const existingStr = await kv.get(`review:${id}`);
    if (!existingStr) return c.json({ error: "Review niet gevonden" }, 404);
    const existing = JSON.parse(existingStr);

    const updates = await c.req.json();
    const updated = {
      ...existing,
      ...updates,
      // The client owns what they wrote; an admin may only publish it and
      // decide which portfolio piece it belongs to.
      id: existing.id,
      projectId: existing.projectId,
      clientId: existing.clientId,
      clientName: existing.clientName,
      rating: existing.rating,
      text: existing.text,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`review:${id}`, JSON.stringify(updated));
    return c.json({ review: updated });
  } catch (err) {
    console.log("Update review error:", err);
    return c.json({ error: `Failed to update review: ${err}` }, 500);
  }
});

// --- DELETE /admin/reviews/:id ---
r.delete("/make-server-0951c59e/admin/reviews/:id", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const existingStr = await kv.get(`review:${id}`);
    if (!existingStr) return c.json({ error: "Review niet gevonden" }, 404);
    const existing = JSON.parse(existingStr);

    await kv.del(`review:${id}`);
    await kv.del(`review:byProject:${existing.projectId}`);
    // Drop the request too, so the project can be asked again.
    await kv.del(`review:request:${existing.projectId}`);

    const idsStr = await kv.get("review:reviewIds");
    if (idsStr) {
      const ids = JSON.parse(idsStr).filter((rid: string) => rid !== id);
      await kv.set("review:reviewIds", JSON.stringify(ids));
    }

    return c.json({ success: true });
  } catch (err) {
    console.log("Delete review error:", err);
    return c.json({ error: `Failed to delete review: ${err}` }, 500);
  }
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

    return c.json({ feedback });
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

    const [reviewReqStr, feedbackReqStr, reviewIdStr, feedbackIdsStr] = await Promise.all([
      kv.get(`review:request:${projectId}`),
      kv.get(`feedback:request:${projectId}`),
      kv.get(`review:byProject:${projectId}`),
      kv.get(`feedback:byProject:${projectId}`),
    ]);

    const review = reviewIdStr ? JSON.parse((await kv.get(`review:${reviewIdStr}`)) || "null") : null;
    const feedbackIds: string[] = feedbackIdsStr ? JSON.parse(feedbackIdsStr) : [];

    return c.json({
      reviewRequested: !!reviewReqStr,
      feedbackRequested: !!feedbackReqStr,
      review,
      feedbackCount: feedbackIds.length,
    });
  } catch (err) {
    console.log("Portal get engagement error:", err);
    return c.json({ error: `Failed to fetch engagement: ${err}` }, 500);
  }
});

// --- POST /portal/project/:id/review — client submits their review ---
r.post("/make-server-0951c59e/portal/project/:id/review", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const loaded = await loadProjectForClient(projectId, user);
    if (loaded.error) return c.json({ error: loaded.error }, loaded.status);
    const project = loaded.project;

    const { rating, text } = await c.req.json();
    const stars = Math.round(Number(rating));
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return c.json({ error: "Kies een beoordeling van 1 tot 5 sterren." }, 400);
    }
    if (!String(text || "").trim()) {
      return c.json({ error: "Schrijf er een korte toelichting bij." }, 400);
    }

    // One review per project — a second submit edits the first rather than
    // stacking duplicates.
    const existingId = await kv.get(`review:byProject:${projectId}`);
    const id = existingId || crypto.randomUUID();
    const now = new Date().toISOString();
    const previousStr = existingId ? await kv.get(`review:${id}`) : null;
    const previous = previousStr ? JSON.parse(previousStr) : null;

    const review = {
      id,
      projectId,
      projectTitle: project.title,
      clientId: user.id,
      clientName: user.user_metadata?.name || user.email,
      rating: stars,
      text: String(text).trim(),
      portfolioArticleId: previous?.portfolioArticleId || null,
      published: previous?.published || false,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    await kv.set(`review:${id}`, JSON.stringify(review));
    await kv.set(`review:byProject:${projectId}`, id);

    if (!existingId) {
      const idsStr = await kv.get("review:reviewIds");
      const ids = idsStr ? JSON.parse(idsStr) : [];
      ids.push(id);
      await kv.set("review:reviewIds", JSON.stringify(ids));
    }

    const requestStr = await kv.get(`review:request:${projectId}`);
    if (requestStr) {
      const request = JSON.parse(requestStr);
      await kv.set(`review:request:${projectId}`, JSON.stringify({ ...request, status: "submitted", submittedAt: now }));
    }

    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      subject: `${stars}/5 sterren van ${review.clientName} — ${project.title}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Nieuwe Review</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#c8905a;font-size:26px;letter-spacing:0.12em;">${starString(stars)}</span>
            <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:18px;font-weight:800;">${escapeHtml(review.clientName)}</span>
            <span style="display:block;color:rgba(255,251,224,0.3);font-size:12px;margin-top:4px;">${escapeHtml(project.title)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,251,224,0.03);border-left:2px solid #c8905a;">
              <tr><td style="padding:16px 18px;color:rgba(255,251,224,0.65);font-size:13.5px;line-height:1.7;">${escapeHtml(review.text).replace(/\n/g, "<br>")}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 36px;">
            <a href="${SITE_URL}/admin/reviews" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Beoordelen &amp; publiceren</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);"><span style="color:rgba(255,251,224,0.2);font-size:11px;">Deze review staat nog niet op de site. Publiceren doe je zelf in de admin.</span></td>
        </tr>
      `),
    });

    await notify({
      type: "review",
      title: `${stars}/5 sterren van ${review.clientName}`,
      body: review.text,
      link: "/admin/reviews",
    });

    return c.json({ review });
  } catch (err) {
    console.log("Submit review error:", err);
    return c.json({ error: `Review opslaan mislukt: ${err}` }, 500);
  }
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
    const galleryKeys = new Set<string>((project.galleryUrls || []).map((u: string) => imageKey(u)));

    const items = rawItems
      .map((item: any) => {
        const text = String(item?.text || "").trim();
        if (!text) return null;
        // Only accept photo references that actually belong to this gallery.
        const photoUrls = (Array.isArray(item?.photoUrls) ? item.photoUrls : [])
          .filter((u: any) => typeof u === "string" && galleryKeys.has(imageKey(u)));
        return {
          id: crypto.randomUUID(),
          scope: photoUrls.length > 0 ? "photos" : GENERAL_FEEDBACK_SCOPE,
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
  try {
    const idsStr = await kv.get("review:reviewIds");
    const ids: string[] = idsStr ? JSON.parse(idsStr) : [];
    const values = await Promise.all(ids.map((id) => kv.get(`review:${id}`)));
    const reviews = values
      .filter(Boolean)
      .map((v) => JSON.parse(v as string))
      .filter((r) => r.published)
      // Only what a visitor needs — no client id, no project id.
      .map((r) => ({
        id: r.id,
        clientName: r.clientName,
        rating: r.rating,
        text: r.text,
        projectTitle: r.projectTitle,
        portfolioArticleId: r.portfolioArticleId || null,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reviews });
  } catch (err) {
    console.log("Get public reviews error:", err);
    return c.json({ error: `Failed to fetch reviews: ${err}` }, 500);
  }
});

