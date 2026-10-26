/**
 * The site's own visitor statistics, read back in the admin under
 * Advertenties. Where a visitor came in, every page they open, how far they
 * scroll and how long they stay, what they click and where, and which forms
 * they start: it goes in small batches to the site itself (/api/v, which
 * passes it to the edge function) and into our own database. Nothing is sent
 * to a third party.
 *
 * A random id in localStorage recognises a second visit. No IP address and
 * nothing anyone types is kept. Left out: devices that opened the admin, the
 * admin's own page previews (an iframe), bots, and the dev server.
 */

const ENDPOINT = "/api/v";
const STORE = "pdc-visit";
const OFF = "pdc-no-track";
/** localStorage["pdc-track-debug"] = "1" logs every batch; on the dev server it only logs. */
const DEBUG = "pdc-track-debug";
/** A visit ends after half an hour without anything happening. */
const SESSION_GAP = 30 * 60_000;
/** Time on a page only counts while someone is still doing something. */
const IDLE = 60_000;
const FLUSH_EVERY = 10_000;
const BATCH = 40;

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|prerender|phantom|selenium|puppeteer|playwright/i;

type Props = Record<string, string>;

type Meta = {
  landing: string;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  paid: boolean;
  device: string;
  browser: string;
  os: string;
  screen: string;
  language: string;
  timezone: string;
  returning: boolean;
};

type Session = { id: string; start: number; last: number; meta: Meta };

type Event = {
  t: "pageview" | "progress" | "click" | "form" | "event";
  at: number;
  v?: string;
  path?: string;
  label?: string;
  target?: string;
  x?: number;
  y?: number;
  scroll?: number;
  ms?: number;
  props?: Props;
};

type View = {
  id: string;
  path: string;
  ms: number;
  scroll: number;
  sent: string;
  converted: boolean;
  /** Forms started on this page, with the last field that had focus. */
  forms: Map<string, string>;
};

let visitor = "";
let session: Session | null = null;
let view: View | null = null;
let queue: Event[] = [];
let started = false;
let debug = false;
let lastInput = 0;
let lastTick = 0;
let measuring = false;
let recent: { t: number; x: number; y: number }[] = [];

// ---------------------------------------------------------------------------
// Who and where from
// ---------------------------------------------------------------------------

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function read(): { visitor?: string; session?: Session } {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ visitor, session }));
  } catch {
    // Private mode or full storage: the visit is still counted, only not recognised later.
  }
}

const AI: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/^gemini\.google\.com$/, "Gemini"],
  [/^copilot\.microsoft\.com$/, "Copilot"],
];
const SOCIAL: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|^fb\.me$/, "Facebook"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "X"],
  [/(^|\.)pinterest\./, "Pinterest"],
  [/(^|\.)snapchat\.com$/, "Snapchat"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)whatsapp\.(com|net)$|^wa\.me$/, "WhatsApp"],
];
const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)yahoo\./, "Yahoo"],
];
/** How people tend to write a source in a link, and what it is called. */
const NAMES: Record<string, string> = {
  ig: "Instagram", insta: "Instagram", instagram: "Instagram",
  fb: "Facebook", facebook: "Facebook", meta: "Meta",
  tt: "TikTok", tiktok: "TikTok",
  google: "Google", gads: "Google", adwords: "Google",
  linkedin: "LinkedIn", yt: "YouTube", youtube: "YouTube",
  email: "E-mail", mail: "E-mail", nieuwsbrief: "Nieuwsbrief", newsletter: "Nieuwsbrief",
  whatsapp: "WhatsApp", wa: "WhatsApp", qr: "QR-code", flyer: "Flyer",
};
const PAID_MEDIUM = /^(cpc|ppc|cpm|paid|paid[_-]?social|paidsocial|ads?|display|sponsored|advertentie)$/i;

function referrerHost(): string {
  try {
    if (!document.referrer) return "";
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    // Own pages (a reload, another tab) are not where anyone came from.
    return host === location.hostname.replace(/^www\./, "") ? "" : host;
  } catch {
    return "";
  }
}

function fromHost(host: string): { source: string; medium: string } | null {
  if (!host) return null;
  for (const [re, name] of AI) if (re.test(host)) return { source: name, medium: "ai" };
  for (const [re, name] of SOCIAL) if (re.test(host)) return { source: name, medium: "social" };
  for (const [re, name] of SEARCH) if (re.test(host)) return { source: name, medium: "organic" };
  return { source: host, medium: "referral" };
}

const named = (raw: string) => NAMES[raw.toLowerCase()] || raw.charAt(0).toUpperCase() + raw.slice(1);

/** Where this visit came from: the link's own parameters first, then the referring site. */
function sourceOf(params: URLSearchParams, host: string) {
  const utm = (k: string) => (params.get(`utm_${k}`) || "").trim().slice(0, 100);
  const ref = (params.get("ref") || "").trim().slice(0, 100);
  // Click ids that only ad platforms add. Facebook's fbclid is on every link
  // shared there, paid or not, so it says nothing about an ad.
  const clickId = params.has("gclid") || params.has("gbraid") || params.has("wbraid") ? "Google"
    : params.has("ttclid") ? "TikTok"
    : params.has("msclkid") ? "Bing"
    : params.has("li_fat_id") ? "LinkedIn"
    : "";
  const site = fromHost(host);
  // Older campaign links name the platform in the ref: "ig-automotive-2".
  const fromRef = ref ? NAMES[ref.toLowerCase().split(/[^a-z]+/)[0]] || "" : "";
  const source = utm("source") ? named(utm("source")) : clickId || site?.source || fromRef || "Direct";
  const medium = (utm("medium") || (clickId || ref ? "paid" : "") || site?.medium || (utm("source") ? "referral" : "direct")).toLowerCase();
  return {
    referrer: host,
    source: source.slice(0, 100),
    medium: medium.slice(0, 50),
    campaign: ref || utm("campaign"),
    content: utm("content"),
    term: utm("term"),
    paid: Boolean(ref || clickId || PAID_MEDIUM.test(utm("medium"))),
  };
}

function deviceOf() {
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const tablet = /iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || touchMac;
  const mobile = !tablet && /Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua);
  const browser = /Instagram/.test(ua) ? "Instagram-app"
    : /FBAN|FBAV|FB_IAB/.test(ua) ? "Facebook-app"
    : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? "TikTok-app"
    : /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Firefox|FxiOS/.test(ua) ? "Firefox"
    : /Chrome|CriOS/.test(ua) ? "Chrome"
    : /Safari/.test(ua) ? "Safari"
    : "Anders";
  const os = /iPhone|iPad|iPod/.test(ua) || touchMac ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Anders";
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    // Old browsers.
  }
  return {
    device: tablet ? "tablet" : mobile ? "mobile" : "desktop",
    browser,
    os,
    screen: `${screen.width}x${screen.height}`,
    language: (navigator.language || "").slice(0, 20),
    timezone: timezone.slice(0, 60),
  };
}

/** Continues the visit in this browser, or starts a new one: after half an hour, or on a new campaign link. */
function resume(now: number, forceNew = false) {
  const stored = read();
  const known = Boolean(stored.visitor);
  visitor = stored.visitor || uuid();
  const params = new URLSearchParams(location.search);
  const host = referrerHost();
  const link = sourceOf(params, host);
  const prev = stored.session;
  const newLink = (link.campaign && link.campaign !== prev?.meta.campaign) || (host && link.source !== prev?.meta.source);
  if (prev && !forceNew && now - prev.last < SESSION_GAP && !newLink) {
    session = { ...prev, last: now };
  } else {
    session = {
      id: uuid(),
      start: now,
      last: now,
      meta: { landing: location.pathname.slice(0, 300), ...link, ...deviceOf(), returning: known },
    };
  }
  save();
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

function push(e: Omit<Event, "at">) {
  if (!session) return;
  queue.push({ ...e, at: Date.now() });
  session.last = Date.now();
  if (queue.length >= BATCH) flush();
}

function progress() {
  if (!view) return;
  const ms = Math.round(view.ms);
  const key = `${view.scroll}:${Math.round(ms / 1000)}`;
  if (key === view.sent) return;
  view.sent = key;
  queue.push({ t: "progress", at: Date.now(), v: view.id, scroll: view.scroll, ms });
}

function flush() {
  progress();
  if (!session || !queue.length) return;
  save();
  const now = Date.now();
  while (queue.length) {
    const events = queue.splice(0, BATCH).map(({ at, ...e }) => ({ ...e, age: Math.max(0, now - at) }));
    send(JSON.stringify({ s: { id: session.id, visitor, age: Math.max(0, now - session.start), ...session.meta }, e: events }));
  }
}

function send(body: string) {
  if (debug) console.info("[statistieken]", body);
  if (import.meta.env.DEV) return;
  try {
    // A beacon also goes out while the page closes.
    if (navigator.sendBeacon?.(ENDPOINT, body)) return;
  } catch {
    // Falls through to fetch.
  }
  fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
}

// ---------------------------------------------------------------------------
// What happens on the page
// ---------------------------------------------------------------------------

function measure() {
  measuring = false;
  if (!view) return;
  const doc = document.documentElement;
  const height = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
  const seen = height > 0 ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100)) : 100;
  if (seen > view.scroll) view.scroll = seen;
}

function onScroll() {
  lastInput = Date.now();
  if (measuring) return;
  measuring = true;
  requestAnimationFrame(measure);
}

function onInput() {
  lastInput = Date.now();
}

function tick() {
  const now = Date.now();
  if (view && document.visibilityState === "visible" && now - lastInput < IDLE) view.ms += Math.min(now - lastTick, 2000);
  lastTick = now;
}

const clip = (s: string | null | undefined, n = 80) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

function fieldName(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  return clip(el.getAttribute("aria-label") || el.labels?.[0]?.textContent || ("placeholder" in el ? el.placeholder : "") || el.name || el.id || el.type, 60);
}

function formName(form: HTMLFormElement): string {
  return clip(form.getAttribute("data-track") || form.getAttribute("aria-label") || form.getAttribute("name") || form.id, 60) || "Formulier";
}

function linkTarget(a: Element): string {
  const href = a.getAttribute("href") || "";
  if (/^(tel|mailto|sms):/i.test(href)) return href.slice(0, 200);
  try {
    const u = new URL(href, location.href);
    // No query strings: they can hold tokens.
    return (u.origin === location.origin ? u.pathname + u.hash : u.host + u.pathname).slice(0, 300);
  } catch {
    return href.slice(0, 300);
  }
}

/** What was clicked, in words: the kind of element, its text and where it leads. */
function describe(el: Element): { kind: string; label: string; target: string } {
  const hit = el.closest("a[href], button, [role='button'], input, select, textarea, label, summary, [data-track]");
  if (!hit) {
    const media = el.closest("img, picture, video");
    const img = media?.matches("img") ? (media as HTMLImageElement) : media?.querySelector("img");
    if (media) return { kind: "other", label: clip(img?.alt) || "Foto", target: media.tagName.toLowerCase() };
    const text = clip(el.textContent, 200);
    return { kind: "other", label: text.length <= 80 ? text : "", target: el.tagName.toLowerCase() };
  }
  const own = hit.getAttribute("data-track") || hit.getAttribute("aria-label") || "";
  const text = clip(own || (hit as HTMLElement).innerText || hit.querySelector("img")?.alt || hit.getAttribute("title"));
  if (hit.matches("a[href]")) return { kind: "link", label: text, target: linkTarget(hit) };
  if (hit instanceof HTMLInputElement && /^(submit|button|reset)$/.test(hit.type)) return { kind: "button", label: clip(own || hit.value), target: "button" };
  if (hit instanceof HTMLInputElement || hit instanceof HTMLTextAreaElement || hit instanceof HTMLSelectElement) {
    return { kind: "field", label: fieldName(hit), target: hit instanceof HTMLInputElement ? hit.type : hit.tagName.toLowerCase() };
  }
  if (hit.matches("label")) return { kind: "field", label: text, target: "label" };
  return { kind: "button", label: text, target: "button" };
}

/** Three quick clicks on one spot: something that looks clickable but does nothing. */
function isRage(e: MouseEvent): boolean {
  const now = Date.now();
  recent = [...recent.filter((c) => now - c.t < 1000), { t: now, x: e.clientX, y: e.clientY }];
  return recent.filter((c) => Math.abs(c.x - e.clientX) < 40 && Math.abs(c.y - e.clientY) < 40).length >= 3;
}

function onClick(e: MouseEvent) {
  lastInput = Date.now();
  if (!view || !(e.target instanceof Element)) return;
  const { kind, label, target } = describe(e.target);
  const props: Props = { kind };
  // detail is 0 when the click came from the keyboard: there is no spot on the page.
  const pointer = e.detail > 0;
  let x: number | undefined;
  let y: number | undefined;
  if (pointer) {
    const doc = document.documentElement;
    x = Math.round(Math.min(1, Math.max(0, e.pageX / Math.max(doc.scrollWidth, 1))) * 10000) / 10000;
    y = Math.round(Math.min(1, Math.max(0, e.pageY / Math.max(doc.scrollHeight, 1))) * 10000) / 10000;
    if (isRage(e)) props.rage = "1";
  }
  push({ t: "click", v: view.id, path: view.path, label, target, x, y, props });
  // Calling or mailing straight from the site is as good as a form.
  if (target.startsWith("tel:")) track("Telefoon");
  else if (target.startsWith("mailto:")) track("E-mail");
  else if (/^(wa\.me|api\.whatsapp\.com)\//.test(target)) track("WhatsApp");
}

function onFocusIn(e: FocusEvent) {
  const el = e.target;
  if (!view || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) || !el.form) return;
  const name = formName(el.form);
  const field = fieldName(el);
  if (!view.forms.has(name)) push({ t: "form", v: view.id, path: view.path, label: name, props: { step: "start", field } });
  view.forms.set(name, field);
}

function onSubmit(e: SubmitEvent) {
  if (!view || !(e.target instanceof HTMLFormElement)) return;
  push({ t: "form", v: view.id, path: view.path, label: formName(e.target), props: { step: "submit" } });
}

/** Forms started on the page being left, but never sent: and the field they stopped at. */
function leaveView() {
  if (!view) return;
  if (!view.converted) {
    for (const [name, field] of view.forms) push({ t: "form", v: view.id, path: view.path, label: name, props: { step: "abandon", field } });
  }
  progress();
  view = null;
}

function startView(path: string) {
  leaveView();
  view = { id: Math.random().toString(36).slice(2, 10), path: path.slice(0, 300), ms: 0, scroll: 0, sent: "", converted: false, forms: new Map() };
  lastInput = lastTick = Date.now();
  push({ t: "pageview", v: view.id, path: view.path });
  // The router has already put the new page in place and scrolled it.
  requestAnimationFrame(measure);
}

function onVisibility() {
  if (document.visibilityState === "hidden") {
    flush();
    return;
  }
  // Back after a long time away: that is a new visit.
  if (session && Date.now() - session.last > SESSION_GAP) {
    const path = view?.path || location.pathname;
    view = null;
    resume(Date.now(), true);
    startView(path);
  }
  lastInput = lastTick = Date.now();
}

function onPageHide() {
  leaveView();
  flush();
}

function onPageShow(e: PageTransitionEvent) {
  // Restored from the back/forward cache: the page is shown again.
  if (e.persisted && !view) startView(location.pathname);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

function allowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(OFF) === "1") return false;
    debug = localStorage.getItem(DEBUG) === "1";
  } catch {
    // No storage: still counted.
  }
  if (window.top !== window.self) return false;
  if (import.meta.env.DEV) return debug;
  return !navigator.webdriver && !BOTS.test(navigator.userAgent);
}

/** Starts listening on the public site (Root). Returns the cleanup for React. */
export function startAnalytics(): () => void {
  if (started || !allowed()) return () => {};
  started = true;
  resume(Date.now());
  const opts = { capture: true, passive: true } as const;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  document.addEventListener("click", onClick, opts);
  document.addEventListener("focusin", onFocusIn, opts);
  document.addEventListener("submit", onSubmit, opts);
  document.addEventListener("keydown", onInput, opts);
  document.addEventListener("pointermove", onInput, opts);
  document.addEventListener("touchstart", onInput, opts);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  const ticking = window.setInterval(tick, 1000);
  const flushing = window.setInterval(flush, FLUSH_EVERY);
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    document.removeEventListener("click", onClick, opts);
    document.removeEventListener("focusin", onFocusIn, opts);
    document.removeEventListener("submit", onSubmit, opts);
    document.removeEventListener("keydown", onInput, opts);
    document.removeEventListener("pointermove", onInput, opts);
    document.removeEventListener("touchstart", onInput, opts);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    window.clearInterval(ticking);
    window.clearInterval(flushing);
    leaveView();
    flush();
    started = false;
  };
}

/** A page was opened; the same path twice in a row is one view. */
export function trackPageview(path: string) {
  if (!started || view?.path === path) return;
  startView(path);
}

/**
 * A named moment ("Aanvraag", "Pakket gekozen"). "Aanvraag" marks the visit
 * as converted, and is sent right away: the page changes next.
 */
export function track(event: string, props?: Props) {
  if (!started || !view) return;
  if (event === "Aanvraag") view.converted = true;
  push({ t: "event", v: view.id, path: view.path, label: clip(event, 60), props });
  if (event === "Aanvraag") flush();
}

/** The current visit, sent along with a form so the inquiry shows how its sender got there. */
export function visitId(): string {
  return started && session ? session.id : "";
}

/** The campaign this visit came in on (?ref= or utm_campaign), if any. */
export function visitCampaign(): string {
  if (session) return session.meta.campaign;
  // Not counted on this device: the link is still read, so an inquiry keeps its campaign.
  try {
    const params = new URLSearchParams(location.search);
    return (params.get("ref") || params.get("utm_campaign") || read().session?.meta.campaign || "").slice(0, 100);
  } catch {
    return "";
  }
}

/** Leaves this browser out of the statistics: someone from the studio uses it. */
export function excludeThisDevice() {
  try {
    localStorage.setItem(OFF, "1");
  } catch {
    // Nothing to remember it in.
  }
}
