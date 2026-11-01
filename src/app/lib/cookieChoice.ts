// What a visitor chose in the cookie banner. Nothing optional runs before this
// says yes, and "no" is as easy to give as "yes" (see the Cookiebeleid).

const KEY = "pdc-cookie-keuze";
const VALID_FOR = 365 * 24 * 3600_000;

/** Fired on window when the choice changes; the statistics listen for it. */
export const COOKIE_CHOICE_CHANGED = "pdc-cookie-changed";
const OPEN_SETTINGS = "pdc-cookie-open";

export type CookieChoice = { analytics: boolean; at: string };

// With storage blocked the choice still lasts for this visit.
let memory: CookieChoice | null = null;

export function readChoice(): CookieChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (c && typeof c.analytics === "boolean" && Date.now() - new Date(c.at).getTime() < VALID_FOR) return c;
  } catch {
    // Falls through to this visit's answer.
  }
  return memory;
}

export const analyticsAllowed = () => readChoice()?.analytics === true;

export function saveChoice(analytics: boolean) {
  memory = { analytics, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Private mode: asked again next visit.
  }
  window.dispatchEvent(new Event(COOKIE_CHOICE_CHANGED));
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS));
export const onOpenCookieSettings = (fn: () => void) => {
  window.addEventListener(OPEN_SETTINGS, fn);
  return () => window.removeEventListener(OPEN_SETTINGS, fn);
};
