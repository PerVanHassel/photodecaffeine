import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/** Honour the visitor's "reduce motion" setting for every scripted scroll. */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

// The public pages are prerendered, where useLayoutEffect only warns.
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Scroll positions by history entry, so Back and Forward return to where the
// visitor was.
const positions = new Map<string, number>();

/**
 * Scroll handling for the public site, where React Router leaves it to us:
 *  - a new page opens at the top,
 *  - a link with a hash (/#contact) lands on that section, smoothly when it
 *    is on the page already,
 *  - Back and Forward restore the position the page was left at.
 */
export function usePageScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const save = () => {
      const key = window.history.state?.key;
      if (key) positions.set(key, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  useClientLayoutEffect(() => {
    const from = previousPath.current;
    previousPath.current = location.pathname;
    // First load: the browser has already placed the page (hash included).
    if (from === null) return;

    if (navigationType === "POP") {
      const y = positions.get(location.key);
      if (y !== undefined) {
        window.scrollTo(0, y);
        return;
      }
    }
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        target.scrollIntoView({ behavior: from === location.pathname ? scrollBehavior() : "auto", block: "start" });
        return;
      }
    }
    if (from !== location.pathname) window.scrollTo(0, 0);
    // location.key changes on every navigation, including to the same URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}
