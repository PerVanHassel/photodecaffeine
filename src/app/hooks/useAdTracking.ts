import { useEffect } from "react";
import { portalFetch } from "../../lib/supabase";

/**
 * Reads ad tracking params from the URL (?ref= or UTM params), persists them in
 * sessionStorage, and fires a single visit-ping per session/campaign/page combo.
 * Returns void — use getStoredAdRef() to read the value in form handlers.
 *
 * @param page - The current page path, e.g. "/services/automotive"
 */
export function useAdTracking(page: string): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Support ?ref= as primary, fall back to standard UTM params
    const ref =
      params.get("ref") ||
      params.get("utm_campaign") ||
      params.get("utm_source") ||
      "";

    if (ref) {
      sessionStorage.setItem("adRef", ref);
      sessionStorage.setItem("adPage", page);
    }

    const stored = sessionStorage.getItem("adRef") || "";

    // Fire exactly one visit ping per campaign+page combo per browser session
    if (stored) {
      const dedupKey = `adPing_${stored}_${page}`;
      if (!sessionStorage.getItem(dedupKey)) {
        sessionStorage.setItem(dedupKey, "1");
        portalFetch("/contact", {
          method: "POST",
          body: JSON.stringify({
            name: "__ad_visit__",
            email: "visit@tracking.internal",
            phone: "",
            brand: stored,
            package: "__visit__",
            message: JSON.stringify({ ref: stored, page, ts: Date.now() }),
          }),
        }).catch(() => {
          // Non-fatal: tracking pings should never surface errors to the user
        });
      }
    }
  }, [page]);
}

/**
 * Returns the stored ad ref from sessionStorage without triggering a visit ping.
 * Used in form submissions to attribute a lead to a campaign.
 */
export function getStoredAdRef(): string {
  return sessionStorage.getItem("adRef") || "";
}
