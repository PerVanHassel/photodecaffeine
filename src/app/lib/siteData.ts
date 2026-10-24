import { useEffect, useSyncExternalStore } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import type { ArticlePage } from "./articlePage";

// The public site's content — settings, portfolio and reviews — as one small
// store shared by every page.
//
// The build prerenders the marketing pages with this data already filled in
// and writes the same data into the page as `window.__PDC_DATA__`. The browser
// starts from that copy, so its first render matches the prerendered HTML and
// hydration succeeds; each resource is then fetched once in the background and
// the page updates if anything changed since the build.

export type SectionKey = "workProcess" | "portfolio" | "about" | "services" | "socialProof" | "customCTA";

export interface SiteSettings {
  heroImageUrl?: string;
  heroImageMobileUrl?: string;
  frameImageUrl?: string;
  sections?: Partial<Record<SectionKey, boolean>>;
  /** The photography niche: a portfolio category the photography page leads with. Empty for none. */
  photoFocus?: string;
}

export interface PortfolioArticle {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  /** The layout from the page maker; without one the page is built from the text and photos. */
  page?: ArticlePage | null;
  /** Title and description for Google; empty: made from the article. */
  seoTitle?: string;
  seoDescription?: string;
}

export interface PublicReview {
  id: string;
  /** "google" for reviews from the Google business profile; older ones were written in the portal. */
  source?: "google" | "portal";
  clientName: string;
  /** The reviewer's Google profile picture, when there is one. */
  photoUrl?: string;
  rating: number;
  text: string;
  projectTitle: string;
  portfolioArticleId: string | null;
  createdAt: string;
}

/** The pseudo-article that holds the photo strip on the automotive page. */
export const AUTOMOTIVE_GALLERY_TITLE = "__automotive_gallery__";

/** The business profile as a whole: Google's own average and count. */
export interface GoogleSummary {
  rating: number;
  count: number;
  url: string;
}

export interface SiteData {
  settings?: SiteSettings | null;
  articles?: PortfolioArticle[];
  reviews?: PublicReview[];
  /** Comes with the reviews; `null` when Google is not connected. */
  googleSummary?: GoogleSummary | null;
}

type Key = "settings" | "articles" | "reviews";

declare global {
  interface Window {
    __PDC_DATA__?: SiteData;
  }
}

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;
const ENDPOINT: Record<Key, string> = { settings: "/settings", articles: "/portfolio", reviews: "/reviews" };
const PICK: Record<Key, (json: any) => Partial<SiteData>> = {
  settings: (j) => ({ settings: j?.settings ?? null }),
  articles: (j) => ({ articles: j?.articles ?? [] }),
  reviews: (j) => ({ reviews: j?.reviews ?? [], googleSummary: j?.google ?? null }),
};

let data: SiteData = (typeof window !== "undefined" && window.__PDC_DATA__) || {};
let failed: Partial<Record<Key, true>> = {};
const inflight: Partial<Record<Key, Promise<void>>> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Server side: the data one prerendered page is built from. */
export function seedSiteData(seed: SiteData) {
  data = { ...seed };
  failed = {};
}

/** Fetches a resource once per page load; `force` retries after a failure. */
export function loadSiteData(key: Key, force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (inflight[key] && !force) return inflight[key]!;
  if (force && failed[key]) {
    const { [key]: _cleared, ...rest } = failed;
    failed = rest;
    emit();
  }
  const run = fetch(BASE + ENDPOINT[key], { headers: { Authorization: `Bearer ${publicAnonKey}` } })
    .then((res) => {
      if (!res.ok) throw new Error(`${ENDPOINT[key]} -> ${res.status}`);
      return res.json();
    })
    .then((json) => {
      data = { ...data, ...PICK[key](json) };
      emit();
    })
    .catch(() => {
      // A baked copy is still good to show; only an empty slot is a failure.
      if (data[key] === undefined) {
        failed = { ...failed, [key]: true };
        emit();
      }
    });
  inflight[key] = run;
  return run;
}

function useSiteData<K extends Key>(key: K) {
  const value = useSyncExternalStore(subscribe, () => data[key], () => data[key]);
  const error = useSyncExternalStore(subscribe, () => !!failed[key], () => false);
  useEffect(() => {
    void loadSiteData(key);
  }, [key]);
  return { data: value, error, retry: () => loadSiteData(key, true) };
}

/** Site settings: `undefined` while loading, `null` when none are set. */
export const useSiteSettings = () => useSiteData("settings");
/** Published portfolio articles, including the automotive gallery record. */
export const usePortfolio = () => useSiteData("articles");
/** Reviews an admin has published. */
export const useReviews = () => useSiteData("reviews");

/** Google's average and count for the whole profile, loaded with the reviews. */
export function useGoogleSummary() {
  const value = useSyncExternalStore(subscribe, () => data.googleSummary, () => data.googleSummary);
  useEffect(() => {
    void loadSiteData("reviews");
  }, []);
  return value ?? null;
}

/** The portfolio as visitors browse it: without the automotive gallery record. */
export function visibleArticles(articles: PortfolioArticle[] | undefined) {
  return articles?.filter((a) => a.title !== AUTOMOTIVE_GALLERY_TITLE);
}
