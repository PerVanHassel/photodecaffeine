// A portfolio article as a page: a header (the "kop") and a list of blocks,
// built in the admin's page maker and rendered by components/article.
//
// An article without a saved page is laid out automatically from its text and
// photos with the "verhaal" template, so every older article reads as an
// article too. Everything here is pure: the prerender, the site and the admin
// all build the same page from the same data.

export type MediaKind = "image" | "video";

export interface MediaItem {
  url: string;
  kind: MediaKind;
  /** What the photo shows, for screen readers. Empty: the article title and a number. */
  alt?: string;
  /** Which part stays in view when the layout crops the photo. */
  focus?: "top" | "center" | "bottom";
  /** Videos: play with sound and controls instead of looping silently. */
  sound?: boolean;
}

export type MediaLayout = "full" | "wide" | "inset" | "duo" | "offset" | "trio" | "mosaic" | "slices" | "marquee";

export type TextStyle = "body" | "lead" | "statement";

/** How letters are set: "auto" follows the page's typeface. */
export type LetterCase = "auto" | "upper" | "smallcaps" | "normal" | "lower";

/** A text's look on top of the typeface. Every field is optional; empty is the typeface's own. */
export interface TextLook {
  size?: "s" | "m" | "l" | "xl";
  align?: "left" | "center" | "right";
  case?: LetterCase;
  italic?: boolean;
  tracking?: "tight" | "normal" | "wide";
  /** A large first letter (paragraphs only). */
  dropcap?: boolean;
  /** A face of its own (a key from lib/typefaces.ts). */
  font?: string;
  weight?: number;
}

export type Block =
  | { id: string; type: "text"; style: TextStyle; text: string; look?: TextLook }
  | { id: string; type: "heading"; text: string; inline: MediaItem | null; after: number; look?: TextLook }
  | { id: string; type: "media"; layout: MediaLayout; items: MediaItem[]; caption: string }
  | { id: string; type: "split"; media: MediaItem | null; heading: string; text: string; side: "left" | "right"; look?: TextLook }
  | { id: string; type: "quote"; text: string; name: string; role: string; look?: TextLook }
  | { id: string; type: "facts"; items: Fact[] }
  | { id: string; type: "embed"; url: string; caption: string }
  | { id: string; type: "series" };

export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export interface Fact {
  label: string;
  value: string;
}

export type HeroStyle = "cinema" | "offset" | "split" | "plain";
export type ArticleTheme = "dark" | "light";
export type TemplateId = "verhaal" | "fotoserie" | "case" | "film" | "leeg";
export type TypeId = "huisstijl" | "premiere" | "galerie" | "magazine" | "atelier" | "affiche" | "elegant" | "panorama" | "vrolijk";

export interface ArticlePage {
  template: TemplateId;
  hero: HeroStyle;
  theme: ArticleTheme;
  /** The typeface pair for headings and text (lib/typefaces.ts). Missing: the site's own. */
  type?: TypeId;
  /** Faces chosen instead of the pair's. */
  displayFont?: string;
  textFont?: string;
  /** The Adobe Fonts project the page's Adobe faces come from. */
  kit?: string;
  /** The title's look in the header. */
  titleLook?: TextLook;
  /** A line under the title. */
  subtitle: string;
  blocks: Block[];
}

/** A look as data attributes for article.css. Unset fields add nothing. */
export function lookAttrs(look?: TextLook): Record<string, string> {
  if (!look) return {};
  const out: Record<string, string> = {};
  if (look.size && look.size !== "m") out["data-size"] = look.size;
  if (look.align) out["data-align"] = look.align;
  if (look.case && look.case !== "auto") out["data-case"] = look.case;
  if (look.italic !== undefined) out["data-italic"] = look.italic ? "on" : "off";
  if (look.tracking && look.tracking !== "normal") out["data-track"] = look.tracking;
  if (look.dropcap) out["data-dropcap"] = "on";
  return out;
}

/** What a page is built from: the parts of a portfolio article it uses. */
export interface ArticleSource {
  title: string;
  category: string;
  coverUrl: string;
  coverType: MediaKind;
  description: string;
  galleryUrls: string[];
  createdAt?: string;
  page?: ArticlePage | null;
  /** What Google shows; empty: made from the title and the first paragraph. */
  seoTitle?: string;
  seoDescription?: string;
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

/** How many photos each layout shows. Extra photos stay in the block but are not shown. */
export const LAYOUTS: Record<MediaLayout, { label: string; min: number; max: number }> = {
  full: { label: "Rand tot rand", min: 1, max: 1 },
  wide: { label: "Breed", min: 1, max: 1 },
  inset: { label: "Smal", min: 1, max: 1 },
  duo: { label: "Twee naast elkaar", min: 2, max: 2 },
  offset: { label: "Groot en klein", min: 2, max: 2 },
  trio: { label: "Drie op een rij", min: 3, max: 3 },
  mosaic: { label: "Mozaïek", min: 3, max: 6 },
  slices: { label: "Accordeon", min: 3, max: 6 },
  marquee: { label: "Loopband", min: 4, max: 12 },
};

export const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm)$/i.test(url.split("?")[0]);

export const mediaItem = (url: string): MediaItem => ({ url, kind: isVideoUrl(url) ? "video" : "image" });

/** The layout a media block shows: with too few photos for its own, a simpler one. */
export function effectiveLayout(block: BlockOf<"media">): MediaLayout {
  const n = block.items.length;
  if (n >= LAYOUTS[block.layout].min) return block.layout;
  return n <= 1 ? "wide" : n === 2 ? "duo" : "trio";
}

/** The items a media block actually shows. */
export const shownItems = (block: BlockOf<"media">) => block.items.slice(0, LAYOUTS[effectiveLayout(block)].max);

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export type TextPiece = { kind: "headline" | "statement" | "para"; text: string };

/**
 * Splits an article text into its paragraphs and says what each one is: a
 * short line without a full stop reads as a headline, one or two short
 * sentences as a statement, the rest as an ordinary paragraph.
 */
export function textPieces(text: string): TextPiece[] {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const oneLine = !p.includes("\n");
      if (oneLine && p.length <= 90 && !/[.!?:;,…]$/.test(p)) return { kind: "headline", text: p };
      if (oneLine && p.length <= 130 && /[.!?]$/.test(p)) return { kind: "statement", text: p };
      return { kind: "para", text: p };
    });
}

/** All text in a page, for the language check and a search snippet. */
export function pageText(page: ArticlePage): string[] {
  const out: string[] = [];
  if (page.subtitle) out.push(page.subtitle);
  for (const b of page.blocks) {
    if (b.type === "text" || b.type === "heading") out.push(b.text);
    if (b.type === "split") out.push(b.heading, b.text);
    if (b.type === "quote") out.push(b.text);
    if (b.type === "media" || b.type === "embed") out.push(b.caption);
  }
  return out.filter((t) => t.trim());
}

/** A plain sentence or two for search engines: the page's first real paragraph. */
export function pageSummary(source: ArticleSource, page: ArticlePage): string {
  const first = page.blocks.find((b) => b.type === "text" && b.text.trim()) as BlockOf<"text"> | undefined;
  const raw = first?.text || textPieces(source.description).find((p) => p.kind === "para")?.text || source.description || "";
  return plainText(raw).replace(/\s+/g, " ").trim();
}

/** Google shows about 60 characters of a title and 155 of a description. */
export const SEO_LIMITS = { title: 60, description: 155 };

/** The title and description for search engines: the studio's own, or made from the article. */
export function seoMeta(source: ArticleSource, page: ArticlePage) {
  const autoTitle = `${source.title} | Portfolio | PhotoDeCaffeine`;
  const summary = pageSummary(source, page);
  const max = SEO_LIMITS.description;
  const autoDescription = summary
    ? (summary.length > max ? `${summary.slice(0, max - 3).trimEnd()}…` : summary)
    : `Bekijk de shoot ‘${source.title}’ van PhotoDeCaffeine: professionele ${/automotive/i.test(source.category) ? "automotive fotografie" : "fotografie"} door heel Nederland.`;
  return {
    title: source.seoTitle?.trim() || autoTitle,
    description: source.seoDescription?.trim() || autoDescription,
    autoTitle,
    autoDescription,
  };
}

/** Text without the little markup the text blocks allow. */
export function plainText(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Every media URL a block uses. */
export function blockUrls(block: Block): string[] {
  if (block.type === "media") return shownItems(block).map((i) => i.url);
  if (block.type === "split") return block.media ? [block.media.url] : [];
  if (block.type === "heading") return block.inline ? [block.inline.url] : [];
  return [];
}

/** The article's own photos the blocks leave for the series block, in gallery order. */
export function seriesRest(source: ArticleSource, page: ArticlePage): string[] {
  const used = new Set(page.blocks.flatMap(blockUrls));
  if (page.hero !== "plain") used.add(heroCover(source)?.url || "");
  return source.galleryUrls.filter((u) => !used.has(u));
}

/** The header's photo or video: the cover, or the first gallery photo. */
export function heroCover(source: ArticleSource): MediaItem | null {
  if (source.coverUrl) return { url: source.coverUrl, kind: source.coverType === "video" ? "video" : mediaItem(source.coverUrl).kind };
  const first = source.galleryUrls[0];
  return first ? mediaItem(first) : null;
}

/** Photos in the order the page shows them, for the full-screen viewer. Videos are left out. */
export function pagePhotos(source: ArticleSource, page: ArticlePage): string[] {
  const urls: string[] = [];
  for (const b of page.blocks) {
    if (b.type === "media") urls.push(...shownItems(b).filter((i) => i.kind === "image").map((i) => i.url));
    if (b.type === "split" && b.media?.kind === "image") urls.push(b.media.url);
    if (b.type === "series") urls.push(...seriesRest(source, page).filter((u) => !isVideoUrl(u)));
  }
  return [...new Set(urls)];
}

// ---------------------------------------------------------------------------
// Embeds
// ---------------------------------------------------------------------------

/**
 * A YouTube or Vimeo link as a player address. Only these two are allowed; any
 * other link gives null, so a pasted address never ends up in an iframe as is.
 */
export function embedSrc(url: string): string | null {
  const u = (() => {
    try {
      return new URL(url.trim());
    } catch {
      return null;
    }
  })();
  if (!u || !/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const clean = (id: string | null | undefined) => (id && /^[\w-]{6,20}$/.test(id) ? id : null);
  if (host === "youtu.be") {
    const id = clean(u.pathname.slice(1));
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = clean(u.searchParams.get("v") || u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(\d{6,12})/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type Beat = { layout: MediaLayout; count: number } | "split";

interface Recipe {
  hero: HeroStyle;
  theme: ArticleTheme;
  type: TypeId;
  /** Media moments, used in turn and from the start again. */
  beats: Beat[];
  /** Paragraphs between two media moments. */
  textPerBeat: number;
  /** Media moments after the text has run out, while photos last. */
  trailing: number;
  /** Blocks before the text starts. */
  intro?: (source: ArticleSource, next: () => string) => Block[];
}

const RECIPES: Record<Exclude<TemplateId, "leeg">, Recipe> = {
  verhaal: {
    hero: "cinema",
    theme: "dark",
    type: "huisstijl",
    beats: [{ layout: "full", count: 1 }, { layout: "duo", count: 2 }, "split", { layout: "mosaic", count: 5 }, { layout: "wide", count: 1 }, { layout: "offset", count: 2 }, { layout: "trio", count: 3 }],
    textPerBeat: 1,
    trailing: 2,
  },
  fotoserie: {
    hero: "offset",
    theme: "dark",
    type: "galerie",
    beats: [{ layout: "wide", count: 1 }, { layout: "offset", count: 2 }, { layout: "slices", count: 4 }, { layout: "full", count: 1 }, { layout: "trio", count: 3 }, { layout: "mosaic", count: 4 }, { layout: "marquee", count: 6 }],
    textPerBeat: 2,
    trailing: 7,
  },
  case: {
    hero: "split",
    theme: "light",
    type: "atelier",
    beats: ["split", { layout: "mosaic", count: 3 }, { layout: "full", count: 1 }, "split", { layout: "duo", count: 2 }, { layout: "mosaic", count: 5 }],
    textPerBeat: 1,
    trailing: 2,
    intro: (source, next) => [{
      id: next(),
      type: "facts",
      items: [
        { label: "Klant", value: "" },
        { label: "Locatie", value: "" },
        { label: "Dienst", value: source.category || "" },
        { label: "Jaar", value: source.createdAt ? String(new Date(source.createdAt).getFullYear()) : "" },
      ],
    }],
  },
  film: {
    hero: "plain",
    theme: "dark",
    type: "premiere",
    beats: [{ layout: "duo", count: 2 }, { layout: "wide", count: 1 }, { layout: "marquee", count: 5 }, { layout: "trio", count: 3 }],
    textPerBeat: 2,
    trailing: 2,
    // The film first: a video from the gallery, or a link still to fill in.
    intro: (source, next) => {
      const video = source.galleryUrls.find(isVideoUrl) || (source.coverType === "video" ? source.coverUrl : "");
      return [video
        ? { id: next(), type: "media", layout: "full", items: [{ url: video, kind: "video", sound: true }], caption: "" }
        : { id: next(), type: "embed", url: "", caption: "" }];
    },
  },
};

export const TEMPLATES: { id: TemplateId; name: string; about: string }[] = [
  { id: "verhaal", name: "Verhaal", about: "Tekst en foto's om en om, met een grote foto als opening." },
  { id: "fotoserie", name: "Fotoserie", about: "De foto's voorop, weinig tekst. Voor een serie die voor zich spreekt." },
  { id: "case", name: "Klantcase", about: "Feiten bovenaan, dan het verhaal van de opdracht. Lichte pagina." },
  { id: "film", name: "Film", about: "Begint met een video, daarna stills en tekst." },
  { id: "leeg", name: "Leeg", about: "Alleen de kop en de tekst. Je bouwt de rest zelf op." },
];

/**
 * Builds a page from an article with a template: the text in its own order,
 * the photos spread over the template's layouts in gallery order, and whatever
 * is left over in the series at the end.
 */
export function buildPage(source: ArticleSource, template: TemplateId): ArticlePage {
  let n = 0;
  const next = () => `b${++n}`;
  const pieces = textPieces(source.description);
  // A headline at the very top is the line under the title.
  const subtitle = pieces[0]?.kind === "headline" ? pieces.shift()!.text : "";

  if (template === "leeg") {
    return {
      template,
      hero: "plain",
      theme: "dark",
      type: "huisstijl",
      subtitle,
      blocks: [
        ...pieces.map((p, i): Block => (p.kind === "headline"
          ? { id: next(), type: "heading", text: p.text, inline: null, after: 2 }
          : { id: next(), type: "text", style: i === 0 ? "lead" : p.kind === "statement" ? "statement" : "body", text: p.text })),
        { id: next(), type: "series" },
      ],
    };
  }

  const recipe = RECIPES[template];
  const cover = recipe.hero === "plain" ? null : heroCover(source)?.url;
  const intro = recipe.intro?.(source, next) ?? [];
  const taken = new Set([cover, ...intro.flatMap(blockUrls)]);
  const photos = source.galleryUrls.filter((u) => !taken.has(u));
  const blocks: Block[] = [...intro];
  let beat = 0;

  /** The next media moment there are photos for, or null when none fits. */
  function takeBeat(para?: string): Block | null {
    for (let tries = 0; tries < recipe.beats.length; tries++) {
      const b = recipe.beats[beat % recipe.beats.length];
      beat++;
      if (b === "split") {
        if (!para || !photos.length) continue;
        return { id: next(), type: "split", media: mediaItem(photos.shift()!), heading: "", text: para, side: beat % 2 ? "right" : "left" };
      }
      const { min, max } = LAYOUTS[b.layout];
      if (photos.length < min) continue;
      const items = photos.splice(0, Math.min(b.count, max, photos.length)).map(mediaItem);
      return { id: next(), type: "media", layout: b.layout, items, caption: "" };
    }
    return null;
  }

  // The first paragraph after the intro is followed by a photo straight away.
  let sinceBeat = recipe.textPerBeat;
  let lead = true;
  for (const p of pieces) {
    if (p.kind === "headline") {
      blocks.push({ id: next(), type: "heading", text: p.text, inline: null, after: 2 });
      continue;
    }
    if (p.kind === "statement") {
      blocks.push({ id: next(), type: "text", style: "statement", text: p.text });
      continue;
    }
    if (lead) {
      blocks.push({ id: next(), type: "text", style: "lead", text: p.text });
      lead = false;
      continue;
    }
    if (sinceBeat >= recipe.textPerBeat && photos.length) {
      sinceBeat = 0;
      const moment = takeBeat(p.text);
      if (moment?.type === "split") {
        blocks.push(moment);
        continue;
      }
      if (moment) blocks.push(moment);
    }
    blocks.push({ id: next(), type: "text", style: "body", text: p.text });
    sinceBeat++;
  }
  // A page without text still opens with a photo after the header.
  for (let i = 0; i < recipe.trailing + (pieces.length ? 0 : 1) && photos.length; i++) {
    const moment = takeBeat();
    if (!moment) break;
    blocks.push(moment);
  }
  blocks.push({ id: next(), type: "series" });

  return { template, hero: recipe.hero, theme: recipe.theme, type: recipe.type, subtitle, blocks };
}

/** The page an article shows: its saved page, or the automatic one. */
export function pageOf(source: ArticleSource): ArticlePage {
  const saved = source.page;
  if (saved && Array.isArray(saved.blocks)) return saved;
  // Without text the photos lead.
  const hasText = textPieces(source.description).some((p) => p.kind !== "headline");
  // The automatic page keeps the site's own typeface.
  return { ...buildPage(source, hasText ? "verhaal" : "fotoserie"), type: "huisstijl" };
}

// ---------------------------------------------------------------------------
// New blocks
// ---------------------------------------------------------------------------

export const BLOCK_TYPES: { type: BlockType; name: string; about: string }[] = [
  { type: "text", name: "Tekst", about: "Een alinea, een intro of een grote uitspraak" },
  { type: "heading", name: "Tussenkop", about: "Grote kop, eventueel met een fotootje erin" },
  { type: "media", name: "Foto's", about: "Eén of meer foto's of video's in een opmaak" },
  { type: "split", name: "Foto met tekst", about: "Foto aan de ene kant, tekst aan de andere" },
  { type: "quote", name: "Citaat", about: "Wat de klant zei" },
  { type: "facts", name: "Feiten", about: "Klant, locatie, dienst en meer op een rij" },
  { type: "embed", name: "Video-link", about: "YouTube of Vimeo" },
  { type: "series", name: "Rest van de serie", about: "De foto's die nog nergens staan" },
];

export const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "text": return { id, type, style: "body", text: "" };
    case "heading": return { id, type, text: "", inline: null, after: 2 };
    case "media": return { id, type, layout: "wide", items: [], caption: "" };
    case "split": return { id, type, media: null, heading: "", text: "", side: "left" };
    case "quote": return { id, type, text: "", name: "", role: "" };
    case "facts": return { id, type, items: [{ label: "Klant", value: "" }, { label: "Locatie", value: "" }, { label: "Dienst", value: "" }] };
    case "embed": return { id, type, url: "", caption: "" };
    case "series": return { id, type };
  }
}

/** Whether a block has anything to show on the site. Empty ones are skipped there. */
export function blockHasContent(block: Block, source: ArticleSource, page: ArticlePage): boolean {
  switch (block.type) {
    case "text": case "heading": return !!block.text.trim();
    case "media": return block.items.length > 0;
    case "split": return !!(block.media || block.text.trim() || block.heading.trim());
    case "quote": return !!block.text.trim();
    case "facts": return block.items.some((f) => f.value.trim());
    case "embed": return !!embedSrc(block.url);
    case "series": return seriesRest(source, page).length > 0;
  }
}
