import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard handling for a hand-made modal (the photo lightboxes):
 * focus moves into it when it opens, Tab and Shift+Tab stay inside it, Escape
 * closes it, the page behind does not scroll, and focus returns to whatever
 * opened it when it closes.
 */
export function useModalFocus(
  container: RefObject<HTMLElement | null>,
  onClose: () => void,
  initial?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const box = container.current;
    (initial?.current ?? box?.querySelector<HTMLElement>(FOCUSABLE) ?? box)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !box) return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
    // Runs once per opening; onClose may change identity between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
