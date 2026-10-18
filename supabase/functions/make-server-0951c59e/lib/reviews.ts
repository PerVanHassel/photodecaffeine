import * as kv from "../kv_store.tsx";
import { db, must } from "./db.ts";
import { fetchReviews, GOOGLE_MAPS_URL, GOOGLE_REVIEW_URL, googleConnection, originalText, saveConnection, starsOf } from "./google.ts";
import { HttpError } from "./http.ts";
import { notify } from "./notify.ts";

// ============================================================================
// REVIEWS
// ============================================================================
//
// Reviews live on Google. The studio sends clients there, the connected
// business profile brings every review back here, and the admin decides which
// ones the site shows and which project or portfolio piece each belongs to.
// A Google review can also be typed in by hand (before the profile is
// connected); those carry no googleId. Reviews written in the portal before
// the switch keep source "portal".
//
// Stored in the kv store as review:{id}, listed in review:reviewIds. A review
// that came from Google has the id "g-" + Google's own id, so two syncs that
// overlap write the same record instead of a duplicate.

export type Review = {
  id: string;
  source: "google" | "portal";
  googleId: string | null;
  /** Google's resource name, needed to answer the review. */
  googleName: string | null;
  clientName: string;
  photoUrl: string;
  rating: number;
  text: string;
  reply: { text: string; updatedAt: string } | null;
  projectId: string | null;
  projectTitle: string;
  portfolioArticleId: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

const IDS_KEY = "review:reviewIds";
const parse = (raw: unknown) => (typeof raw === "string" ? JSON.parse(raw) : raw ?? null);

function normalize(r: any): Review {
  return {
    ...r,
    source: r.source || "portal",
    googleId: r.googleId || null,
    googleName: r.googleName || null,
    photoUrl: r.photoUrl || "",
    reply: r.reply || null,
    projectId: r.projectId || null,
    projectTitle: r.projectTitle || "",
    portfolioArticleId: r.portfolioArticleId || null,
    published: !!r.published,
  };
}

/** Every review, newest first. */
export async function loadReviews(): Promise<Review[]> {
  const ids: string[] = parse(await kv.get(IDS_KEY)) || [];
  if (!ids.length) return [];
  const values = await kv.mget(ids.map((id) => `review:${id}`));
  return values
    .map(parse)
    .filter(Boolean)
    .map(normalize)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function loadReview(id: string): Promise<Review> {
  const raw = parse(await kv.get(`review:${id}`));
  if (!raw) throw new HttpError(404, "Review niet gevonden.");
  return normalize(raw);
}

export async function saveReviews(list: Review[]): Promise<void> {
  if (!list.length) return;
  await kv.mset(list.map((r) => `review:${r.id}`), list.map((r) => JSON.stringify(r)));
  const ids: string[] = parse(await kv.get(IDS_KEY)) || [];
  const next = [...new Set([...ids, ...list.map((r) => r.id)])];
  if (next.length !== ids.length) await kv.set(IDS_KEY, JSON.stringify(next));
}

export async function removeReview(review: Review): Promise<void> {
  if (review.projectId) await settleRequest(review.projectId, null, review.id);
  await kv.del(`review:${review.id}`);
  // Left over from when a project had exactly one review from the portal.
  if (review.projectId && parse(await kv.get(`review:byProject:${review.projectId}`)) === review.id) {
    await kv.del(`review:byProject:${review.projectId}`);
  }
  const ids: string[] = parse(await kv.get(IDS_KEY)) || [];
  await kv.set(IDS_KEY, JSON.stringify(ids.filter((id) => id !== review.id)));
}

// --- Projects -----------------------------------------------------------------

/** Ties a review to a project, or loosens it, and keeps the project's request in step. */
export async function linkProject(review: Review, projectId: string | null): Promise<Review> {
  let projectTitle = "";
  if (projectId) {
    const row = must(await db.from("projects").select("id, title").eq("id", projectId).maybeSingle()) as { title: string } | null;
    if (!row) throw new HttpError(404, "Project niet gevonden.");
    projectTitle = row.title;
  }
  if (review.projectId && review.projectId !== projectId) await settleRequest(review.projectId, null, review.id);
  if (projectId) await settleRequest(projectId, review.id);
  return { ...review, projectId, projectTitle };
}

/** Marks the request as answered by this review, or opens it again when the review leaves. */
async function settleRequest(projectId: string, reviewId: string | null, previousId?: string) {
  const key = `review:request:${projectId}`;
  const request = parse(await kv.get(key));
  if (!request) return;
  if (reviewId) {
    await kv.set(key, JSON.stringify({ ...request, status: "submitted", submittedAt: request.submittedAt || new Date().toISOString(), reviewId }));
  } else if (!request.reviewId || request.reviewId === previousId) {
    const { reviewId: _id, submittedAt: _at, ...rest } = request;
    await kv.set(key, JSON.stringify({ ...rest, status: rest.clickedAt ? "clicked" : "pending" }));
  }
}

export const reviewsForProject = async (projectId: string) => (await loadReviews()).filter((r) => r.projectId === projectId);

// Google shows a name the way the reviewer set it up: "Thomas Rooijmans",
// "thomas rooijmans", "Thomas R.". Compare on letters only.
function nameParts(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sameName(client: string, reviewer: string): boolean {
  const a = nameParts(client);
  const b = nameParts(reviewer);
  if (!a.length || !b.length) return false;
  if (a.join(" ") === b.join(" ")) return true;
  if (a.length < 2 || b.length < 2 || a[0] !== b[0]) return false;
  const lastA = a[a.length - 1];
  const lastB = b[b.length - 1];
  return lastA === lastB || (lastB.length === 1 && lastA.startsWith(lastB));
}

/**
 * New reviews from clients the studio asked: when exactly one open request
 * belongs to someone with the reviewer's name, the review joins that project.
 */
async function matchToProjects(fresh: Review[]) {
  const yearAgo = Date.now() - 365 * 86400_000;
  const requests = (await kv.getByPrefix("review:request:"))
    .map(parse)
    .filter((r: any) => r?.projectId && r.status !== "submitted" && Date.parse(r.requestedAt) > yearAgo);
  if (!requests.length) return;
  const clientIds = [...new Set(requests.flatMap((r: any) => r.clientIds || [r.clientId]).filter(Boolean))];
  const clients = (must(await db.from("clients").select("id, name").in("id", clientIds)) || []) as { id: string; name: string }[];
  const nameOf = new Map(clients.map((c) => [c.id, c.name || ""]));

  for (const review of fresh) {
    if (review.projectId) continue;
    const hits = requests.filter((req: any) =>
      req.status !== "submitted" && (req.clientIds || [req.clientId]).some((id: string) => sameName(nameOf.get(id) || "", review.clientName))
    );
    if (hits.length !== 1) continue;
    Object.assign(review, await linkProject(review, hits[0].projectId));
    hits[0].status = "submitted";
  }
}

// --- Google -------------------------------------------------------------------

/** Where to send a client, and what the site can say about the profile as a whole. */
export async function googleLinks() {
  const conn = await googleConnection();
  return {
    reviewUrl: conn?.reviewUrl || GOOGLE_REVIEW_URL,
    mapsUrl: conn?.mapsUrl || GOOGLE_MAPS_URL,
    rating: conn?.rating || 0,
    count: conn?.count || 0,
  };
}

const differs = (a: Review, b: Review) =>
  a.clientName !== b.clientName || a.photoUrl !== b.photoUrl || a.rating !== b.rating || a.text !== b.text ||
  a.googleName !== b.googleName || a.updatedAt !== b.updatedAt || (a.reply?.text || "") !== (b.reply?.text || "");

/**
 * Brings the profile's reviews in: new ones are added (unpublished), changed
 * ones updated, and ones that are gone from Google removed here too. Links
 * and the published flag are the studio's and survive every sync.
 */
export async function syncGoogle(): Promise<{ added: number; updated: number; removed: number }> {
  const conn = await googleConnection();
  if (!conn) throw new HttpError(400, "Google is nog niet gekoppeld.");
  const now = new Date().toISOString();
  // Claimed up front, so a second visitor in the same minute does not start another round.
  await saveConnection({ ...conn, lastTryAt: now });

  try {
    const google = await fetchReviews(conn);
    const existing = await loadReviews();
    const byGoogleId = new Map(existing.filter((r) => r.googleId).map((r) => [r.googleId, r]));
    // Typed in by hand before the profile was connected; the real one takes its place.
    const typed = existing.filter((r) => r.source === "google" && !r.googleId);
    const replaced: { typed: Review; by: Review }[] = [];
    const fresh: Review[] = [];
    const changed: Review[] = [];

    for (const g of google.reviews) {
      const known = byGoogleId.get(g.reviewId);
      const twin = known ? undefined : typed.find((r) =>
        !replaced.some((t) => t.typed === r) && r.rating === starsOf(g) && sameName(r.clientName, g.reviewer?.displayName || "")
      );
      const old = known || twin;
      const next: Review = {
        id: known?.id || `g-${g.reviewId}`,
        source: "google",
        googleId: g.reviewId,
        googleName: g.name,
        clientName: g.reviewer?.isAnonymous ? "Anoniem" : g.reviewer?.displayName || "Google-gebruiker",
        photoUrl: g.reviewer?.profilePhotoUrl || "",
        rating: starsOf(g),
        text: originalText(g.comment),
        reply: g.reviewReply ? { text: g.reviewReply.comment, updatedAt: g.reviewReply.updateTime || now } : null,
        projectId: old?.projectId || null,
        projectTitle: old?.projectTitle || "",
        portfolioArticleId: old?.portfolioArticleId || null,
        published: old?.published || false,
        createdAt: g.createTime,
        updatedAt: g.updateTime || g.createTime,
      };
      if (twin) replaced.push({ typed: twin, by: next });
      else if (!known) fresh.push(next);
      else if (differs(known, next)) changed.push(next);
    }

    await matchToProjects(fresh);
    await saveReviews([...fresh, ...changed, ...replaced.map((t) => t.by)]);
    for (const { typed: old, by } of replaced) {
      await kv.del(`review:${old.id}`);
      const ids: string[] = parse(await kv.get(IDS_KEY)) || [];
      await kv.set(IDS_KEY, JSON.stringify(ids.filter((id) => id !== old.id)));
      if (by.projectId) await settleRequest(by.projectId, by.id);
    }

    // Only a complete list can say a review is gone.
    let removed = 0;
    if (google.complete) {
      const seen = new Set(google.reviews.map((g) => g.reviewId));
      for (const r of existing) {
        if (r.googleId && !seen.has(r.googleId)) {
          await removeReview(r);
          removed++;
        }
      }
    }

    // The first round brings in everything that was already there; that is not news.
    if (conn.lastSyncAt) {
      for (const r of fresh) {
        await notify({
          type: "review",
          title: `${r.rating}/5 op Google van ${r.clientName}`,
          body: r.text || "Zonder tekst",
          link: "/admin/reviews",
        });
      }
    }

    const latest = await googleConnection();
    if (latest?.refreshToken === conn.refreshToken) {
      await saveConnection({ ...latest, lastSyncAt: now, lastError: "", rating: google.averageRating, count: google.totalReviewCount });
    }
    return { added: fresh.length, updated: changed.length, removed };
  } catch (err) {
    const latest = await googleConnection();
    if (latest?.refreshToken === conn.refreshToken) {
      await saveConnection({ ...latest, lastError: err instanceof HttpError ? err.message : "Ophalen bij Google mislukt." });
    }
    throw err;
  }
}

/** Syncs when the last attempt is older than the given age. Never throws. */
export async function syncIfStale(minutes: number): Promise<void> {
  const conn = await googleConnection();
  if (!conn) return;
  const last = Date.parse(conn.lastTryAt || conn.lastSyncAt || "") || 0;
  if (Date.now() - last < minutes * 60_000) return;
  await syncGoogle().catch((err) => console.log("google sync:", err?.message || err));
}
