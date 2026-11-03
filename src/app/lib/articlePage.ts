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
  /** Older pages: which part stays in view when the photo is cropped. `point` replaces it. */
  focus?: "top" | "center" | "bottom";
  /** The point that stays in view when the photo is cropped. */
  point?: FocusPoint;
  /** Videos: play with sound and controls instead of looping silently. */
  sound?: boolean;
  /** The free layout: width in twelfths, where in the row, and how far it drops below the row's top. Empty: chosen from the photo's shape. */
  span?: number;
  place?: "start" | "center" | "end";
  drop?: 0 | 1 | 2;
}

/** A point in a photo, in percent from the left and from the top. */
export interface FocusPoint {
  x: number;
  y: number;
}

export type MediaLayout = "full" | "wide" | "inset" | "duo" | "offset" | "trio" | "mosaic" | "slices" | "marquee" | "free";

/**
 * The shape a media block gives its photos: each its own ("natural", the
 * default) or one shape for all, cropped around each photo's point. "grid" is
 * the mosaic's tight grid, which crops to fit.
 */
export type MediaShape = "natural" | "16:9" | "3:2" | "1:1" | "4:5" | "grid";

export const SHAPE_RATIO: Record<Exclude<MediaShape, "natural" | "grid">, number> = { "16:9": 16 / 9, "3:2": 3 / 2, "1:1": 1, "4:5": 4 / 5 };

/** Room between the photos of a block. Empty: the layout's own. */
export type MediaGap = "none" | "s" | "m" | "l";

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
  | { id: string; type: "media"; layout: MediaLayout; items: MediaItem[]; caption: string; shape?: MediaShape; gap?: MediaGap }
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
export type TemplateId = "verhaal" | "fotoserie" | "tijdschrift" | "case" | "film" | "leeg";
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
  /** The header photo's shape (offset and split; cinema always fills the screen) and the point that stays in view. */
  heroShape?: MediaShape;
  coverPoint?: FocusPoint;
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
  /** Each photo's shape (width / height) by URL, measured in the page maker. */
  shapes?: Record<string, number>;
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
  free: { label: "Vrij", min: 1, max: 8 },
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

/**
 * The shapes a layout can give its photos. The accordion always crops (its
 * slices change width as they open) and the running row always shows them
 * whole, so those two have no choice.
 */
export function shapesFor(layout: MediaLayout): MediaShape[] {
  if (layout === "slices" || layout === "marquee") return [];
  const all: MediaShape[] = ["natural", "16:9", "3:2", "1:1", "4:5"];
  return layout === "mosaic" ? [...all, "grid"] : all;
}

/** The shape a block's photos get: its own choice when the layout has it, else each photo's own. */
export function blockShape(block: BlockOf<"media">): MediaShape {
  const shape = block.shape ?? "natural";
  return shapesFor(effectiveLayout(block)).includes(shape) ? shape : "natural";
}

/** The point that stays in view when a photo is cropped. Older pages chose top, middle or bottom. */
export function pointOf(item: { point?: FocusPoint; focus?: MediaItem["focus"] }): FocusPoint {
  if (item.point) return item.point;
  return { x: 50, y: item.focus === "top" ? 18 : item.focus === "bottom" ? 82 : 50 };
}

/** A shape as landscape, square or portrait; unknown shapes count as anything. */
export const isLandscape = (r?: number) => r === undefined || r >= 1.2;
export const isPortrait = (r?: number) => r === undefined || r < 0.9;

export interface FreePlace {
  span: number;
  place: "start" | "center" | "end";
  /** The first of its twelve columns. */
  column: number;
  drop: 0 | 1 | 2;
}

/**
 * Where each photo goes in the free layout: what the studio chose, and for the
 * rest a magazine rhythm. Photos go in pairs, the first to one side and the
 * second to the other, lower; the next pair mirrors it. Landscapes get more
 * columns than portraits, and a photo left alone in the last pair is centred.
 */
export function freePlaces(items: MediaItem[], ratioOf: (url: string) => number | undefined): FreePlace[] {
  const autoSpan = (r = 1.5) => (r >= 1.6 ? 8 : r >= 1.2 ? 7 : 5);
  const spans = items.map((item) => Math.max(3, Math.min(12, Math.round(item.span ?? autoSpan(ratioOf(item.url))))));
  return items.map((item, i) => {
    const span = spans[i];
    const pair = Math.floor(i / 2);
    const second = i % 2 === 1;
    const alone = !second && i === items.length - 1;
    const mirrored = pair % 2 === 1;
    const place = item.place ?? (alone ? "center" : second !== mirrored ? "end" : "start");
    // The second of a pair only drops when it shares the row with the first.
    const fits = second && spans[i - 1] + span <= 12;
    const drop = item.drop ?? (fits ? 2 : 0);
    const column = place === "start" ? 1 : place === "end" ? 13 - span : Math.floor((12 - span) / 2) + 1;
    return { span, place, column, drop };
  });
}

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

/** The description saved on a photo in the page maker, by its URL. */
export function altByUrl(page: ArticlePage): Map<string, string> {
  const map = new Map<string, string>();
  const put = (item: MediaItem | null | undefined) => {
    const alt = item?.alt?.trim();
    if (item?.url && alt) map.set(item.url, alt);
  };
  for (const block of page.blocks) {
    if (block.type === "media") block.items.forEach(put);
    else if (block.type === "split") put(block.media);
    else if (block.type === "heading") put(block.inline);
  }
  return map;
}

/** A hand-written description for a photo we know, matched on the file name. */
export function altFromFile(url: string, known: readonly { file: string; alt: string }[]) {
  const file = url.split("?")[0].split("/").pop() ?? "";
  return known.find((item) => file.includes(item.file))?.alt ?? "";
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
    beats: [{ layout: "wide", count: 1 }, { layout: "offset", count: 2 }, { layout: "slices", count: 4 }, { layout: "full", count: 1 }, { layout: "trio", count: 3 }, { layout: "mosaic", count: 5 }, { layout: "free", count: 3 }, { layout: "marquee", count: 6 }],
    textPerBeat: 2,
    trailing: 7,
  },
  tijdschrift: {
    hero: "offset",
    theme: "light",
    type: "magazine",
    beats: [{ layout: "free", count: 2 }, { layout: "wide", count: 1 }, "split", { layout: "free", count: 3 }, { layout: "duo", count: 2 }, { layout: "free", count: 2 }, { layout: "mosaic", count: 4 }],
    textPerBeat: 1,
    trailing: 3,
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
  { id: "tijdschrift", name: "Tijdschrift", about: "Licht papier, foto's verspringend over de pagina zoals in een magazine." },
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
  const ratioOf = (u: string) => source.shapes?.[u];
  const coverItem = heroCover(source);
  const coverRatio = coverItem ? ratioOf(coverItem.url) : undefined;
  // A standing cover would lose most of itself in a full-screen header; beside the title it shows whole.
  const hero: HeroStyle = recipe.hero === "cinema" && coverRatio !== undefined && coverRatio < 1 ? "split" : recipe.hero;
  const cover = hero === "plain" ? null : coverItem?.url;
  const intro = recipe.intro?.(source, next) ?? [];
  const taken = new Set([cover, ...intro.flatMap(blockUrls)]);
  const photos = source.galleryUrls.filter((u) => !taken.has(u));
  const blocks: Block[] = [...intro];
  let beat = 0;

  /**
   * Takes `n` of the next few photos, those that fit `want` first, so a
   * layout gets the shapes it shows best. Photos of unknown shape fit
   * anything, which keeps the gallery order.
   */
  function take(n: number, want: (r?: number) => boolean = () => true): string[] {
    const near = photos.slice(0, n + 3);
    const chosen = near.filter((u) => want(ratioOf(u))).slice(0, n);
    for (const u of near) if (chosen.length < n && !chosen.includes(u)) chosen.push(u);
    for (const u of chosen) photos.splice(photos.indexOf(u), 1);
    return chosen;
  }
  const nearCount = (n: number, want: (r?: number) => boolean) => photos.slice(0, n + 3).filter((u) => want(ratioOf(u))).length;
  const media = (layout: MediaLayout, urls: string[]): Block => ({ id: next(), type: "media", layout, items: urls.map(mediaItem), caption: "" });

  /** The next media moment there are photos for, or null when none fits. */
  function takeBeat(para?: string): Block | null {
    for (let tries = 0; tries < recipe.beats.length; tries++) {
      const b = recipe.beats[beat % recipe.beats.length];
      beat++;
      if (b === "split") {
        if (!para || !photos.length) continue;
        // A standing photo sits best beside a column of text.
        return { id: next(), type: "split", media: mediaItem(take(1, isPortrait)[0]), heading: "", text: para, side: beat % 2 ? "right" : "left" };
      }
      const { min, max } = LAYOUTS[b.layout];
      if (photos.length < min) continue;
      const n = Math.min(b.count, max, photos.length);
      switch (b.layout) {
        case "full":
        case "wide":
          // Across the page wants a landscape; with only portraits near, two side by side or one narrow.
          if (nearCount(1, isLandscape)) return media(b.layout, take(1, isLandscape));
          return photos.length >= 2 ? media("duo", take(2, isPortrait)) : media("inset", take(1));
        case "duo":
        case "trio":
          // Portraits side by side, or landscapes; a mixed row still lines up, at one height.
          return media(b.layout, take(n, nearCount(n, isPortrait) >= n ? isPortrait : isLandscape));
        case "offset":
          // A large landscape, a smaller portrait beside it.
          return media("offset", [...take(1, isLandscape), ...take(1, isPortrait)]);
        case "slices":
          // The accordion shows tall slices: only with enough portraits.
          if (nearCount(n, isPortrait) < n) continue;
          return media("slices", take(n, isPortrait));
        default:
          return media(b.layout, take(n));
      }
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

  return { template, hero, theme: recipe.theme, type: recipe.type, subtitle, blocks };
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
