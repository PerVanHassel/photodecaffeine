/**
 * PWA plumbing for the admin app: the iOS standalone meta tags, service worker
 * registration, and install-state detection.
 *
 * The iOS-specific tags are injected here at runtime instead of living in
 * index.html because that document is also the shell for the public marketing
 * site. A static `apple-mobile-web-app-capable` there would make a visitor who
 * adds photodecaffeine.com to their home screen get a chromeless standalone
 * marketing site — no back button, no address bar, no way out. Injecting on
 * mount scopes the behaviour to /app, and Safari reads the live DOM when the
 * user taps "Zet op beginscherm", so the tags are present exactly when needed.
 */

const MANAGED_ATTR = "data-pdc-app-meta";

type MetaSpec = { name?: string; property?: string; content: string };

const APP_META: MetaSpec[] = [
  // Still the tag iOS honours, despite being formally deprecated in favour of
  // the standards-track `mobile-web-app-capable` below. Both are set.
  { name: "apple-mobile-web-app-capable", content: "yes" },
  { name: "mobile-web-app-capable", content: "yes" },
  // "black-translucent" lets the app paint behind the status bar, which is
  // what makes the safe-area padding in the shell meaningful.
  { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
  { name: "apple-mobile-web-app-title", content: "PDC" },
  { name: "theme-color", content: "#070301" },
];

function setMeta(spec: MetaSpec) {
  const el = document.createElement("meta");
  if (spec.name) el.setAttribute("name", spec.name);
  if (spec.property) el.setAttribute("property", spec.property);
  el.setAttribute("content", spec.content);
  el.setAttribute(MANAGED_ATTR, "");
  document.head.appendChild(el);
  return el;
}

/**
 * Installs the app's head tags and returns a cleanup function that restores the
 * document to its pre-app state — important because /app and the marketing site
 * share one SPA document, so navigating away must not leave the site claiming
 * to be a standalone app.
 */
export function applyAppMeta(): () => void {
  if (typeof document === "undefined") return () => {};

  // The site's own theme-color and apple-touch-icon have to step aside while
  // the app is mounted, then come back.
  const siteThemeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]:not([' + MANAGED_ATTR + "])"
  );
  const prevSiteThemeColor = siteThemeColor?.content;
  siteThemeColor?.remove();

  const siteTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const prevTouchIconHref = siteTouchIcon?.getAttribute("href");
  siteTouchIcon?.setAttribute("href", "/icons/icon-180.png");

  const created = APP_META.map(setMeta);

  return () => {
    created.forEach((el) => el.remove());
    if (siteTouchIcon && prevTouchIconHref) siteTouchIcon.setAttribute("href", prevTouchIconHref);
    if (siteThemeColor && prevSiteThemeColor !== undefined) {
      siteThemeColor.content = prevSiteThemeColor;
      document.head.appendChild(siteThemeColor);
    }
  };
}

/** Keeps the status-bar tint in step with the app's light/dark theme. */
export function setThemeColor(color: string) {
  const el = document.querySelector<HTMLMetaElement>(
    `meta[name="theme-color"][${MANAGED_ATTR}]`
  );
  if (el) el.content = color;
}

/** True when launched from the home screen rather than a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's non-standard flag — the only signal that works on iOS.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch-point count gives it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Registers the service worker and calls `onUpdate` when a new version has
 * been downloaded and is waiting. Resolves to null when unsupported or when
 * running on the Vite dev server, where the worker would cache the dev shell
 * and fight HMR.
 */
export async function registerServiceWorker(
  onUpdate?: () => void
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (import.meta.env.DEV) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    if (reg.waiting) onUpdate?.();

    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // `controller` being set means this is a replacement, not a first install.
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          onUpdate?.();
        }
      });
    });

    return reg;
  } catch {
    // A failed worker registration must never take the app down with it —
    // everything still works, just without the offline shell.
    return null;
  }
}

/** Activates a waiting worker and reloads once it has taken over. */
export async function applyUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg?.waiting) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  reg.waiting.postMessage("skip-waiting");
}
