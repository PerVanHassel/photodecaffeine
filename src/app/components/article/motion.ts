import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The article's scroll motion, driven by data-m on the elements:
 *   grow    photos grow into place as they come up the screen
 *   cinema  a full-width photo grows in, and dims again as it leaves the top
 *   words   a statement lights up word by word while it scrolls past
 *   drift   the header photo moves a little slower than the page
 *
 * Everything is in place without it: the prerendered page shows it all, and
 * visitors who ask for less motion get the page as it is.
 */
export function useArticleMotion(root: RefObject<HTMLElement | null>, enabled: boolean, deps: unknown) {
  useGSAP(
    () => {
      const el = root.current;
      if (!enabled || !el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        for (const node of gsap.utils.toArray<HTMLElement>("[data-m='grow']", el)) {
          gsap.fromTo(node, { scale: 0.9, opacity: 0.4 }, {
            scale: 1, opacity: 1, ease: "none",
            scrollTrigger: { trigger: node, start: "top 98%", end: "top 55%", scrub: 0.6 },
          });
        }
        for (const node of gsap.utils.toArray<HTMLElement>("[data-m='cinema']", el)) {
          gsap.timeline({ scrollTrigger: { trigger: node, start: "top bottom", end: "bottom top", scrub: 0.6 } })
            .fromTo(node, { scale: 0.86, opacity: 0.4 }, { scale: 1, opacity: 1, ease: "none", duration: 0.4 })
            .to(node, { opacity: 1, duration: 0.35 })
            .to(node, { opacity: 0.25, ease: "none", duration: 0.25 });
        }
        for (const node of gsap.utils.toArray<HTMLElement>("[data-m='words']", el)) {
          gsap.fromTo(node.querySelectorAll(".pa-word"), { opacity: 0.14 }, {
            opacity: 1, stagger: 0.1, ease: "none",
            scrollTrigger: { trigger: node, start: "top 85%", end: "bottom 50%", scrub: true },
          });
        }
        for (const node of gsap.utils.toArray<HTMLElement>("[data-m='drift']", el)) {
          const media = node.querySelector("img, video");
          if (!media) continue;
          gsap.fromTo(media, { yPercent: -3, scale: 1.08 }, {
            yPercent: 7, scale: 1.08, ease: "none",
            scrollTrigger: { trigger: node, start: "top top", end: "bottom top", scrub: true },
          });
        }
      });

      // Photos load lazily and push the page down; the triggers measure again.
      let timer = 0;
      const remeasure = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
      };
      el.addEventListener("load", remeasure, true);
      return () => {
        el.removeEventListener("load", remeasure, true);
        window.clearTimeout(timer);
        mm.revert();
      };
    },
    { scope: root, dependencies: [enabled, deps], revertOnUpdate: true },
  );
}
