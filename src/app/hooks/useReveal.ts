import { useEffect, type RefObject } from "react";

/**
 * Lets content fade in as it scrolls into view. Everything starts visible, as
 * the prerendered HTML must show it; only what is still below the fold once
 * the page runs is hidden first, with [data-reveal="wait"], and gets
 * [data-reveal="in"] when it comes into view. The styles are in site.css.
 * Nothing moves for visitors who ask for less motion.
 *
 * `selector` picks targets inside the element (each revealed on its own);
 * without it the element itself is the target. Pass whatever changes the
 * targets as `deps`.
 */
export function useReveal(ref: RefObject<HTMLElement | null>, selector: string | null, deps: unknown) {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "in";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    const targets = selector ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : [root];
    for (const el of targets) {
      if (el.dataset.reveal === "in") continue;
      if (el.dataset.reveal !== "wait") {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.88) continue;
        el.dataset.reveal = "wait";
      }
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ref, selector, deps]);
}
