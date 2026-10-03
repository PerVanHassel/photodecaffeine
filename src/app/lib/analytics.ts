/**
 * Custom events for Plausible (cookieless, loaded in index.html). Each name
 * only shows up in Plausible once it is added there as a goal.
 */
type Props = Record<string, string>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

export function track(event: string, props?: Props) {
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Analytics must never break the page.
  }
}

/** Counts taps on phone numbers and e-mail addresses anywhere on the public site. */
export function trackContactClicks(e: MouseEvent) {
  const link = (e.target as Element | null)?.closest?.("a[href^='tel:'], a[href^='mailto:']");
  if (!link) return;
  track(link.getAttribute("href")!.startsWith("tel:") ? "Telefoon" : "E-mail");
}
