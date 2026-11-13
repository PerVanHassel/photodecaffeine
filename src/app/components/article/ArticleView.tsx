import { Children, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import {
  altFromFile, blockHasContent, blockShape, effectiveLayout, embedSrc, freePlaces, heroCover, lookAttrs, pagePhotos, plainText, pointOf, seriesRest, SHAPE_RATIO, shownItems,
  type ArticlePage, type ArticleSource, type Block, type BlockOf, type FocusPoint, type MediaItem, type MediaLayout, type MediaShape, type TextLook,
} from "../../lib/articlePage";
import { lookVars, pageFontLinks, pageVars, type LookRole } from "../../lib/typefaces";
import { HIGH_PRIORITY, webSrcSet } from "../../lib/images";
import { useLanguage } from "../../context/LanguageContext";
import { categoryLabel } from "../../i18n/format";
import { useArticleMotion } from "./motion";

// One portfolio article as a page (styles: src/styles/article.css). The site
// and the admin's page maker render it with this same component; the page
// maker passes `editor`, which makes every block selectable, shows empty
// blocks as a hint instead of leaving them out and turns the motion off.

export interface EditorHooks {
  selected: string | null;
  /** "hero" for the header. */
  onSelect: (id: string) => void;
  /** Controls between blocks: before block `index`, and after the last one. */
  between?: (index: number) => ReactNode;
  /** Shown on the selected block. */
  tools?: (id: string) => ReactNode;
}

interface Ctx {
  title: string;
  alt: (item: MediaItem) => string;
  open?: (url: string) => void;
  editing: boolean;
  /** A photo's shape (width / height), when it is known. */
  ratio: (url: string) => number | undefined;
  /** Reports a shape measured in the browser, for photos the article has none for yet. */
  measure: (url: string, w: number, h: number) => void;
}

/** The frame a photo gets in a shape: its own shape for "natural", else the chosen one. */
function frameRatio(shape: MediaShape, own: number | undefined) {
  return shape === "natural" || shape === "grid" ? own : SHAPE_RATIO[shape];
}

export function ArticleView({ source, page, onOpen, editor, back, children }: {
  source: ArticleSource;
  page: ArticlePage;
  /** Opens a photo full screen. */
  onOpen?: (url: string) => void;
  editor?: EditorHooks;
  /** The way back, in the header (site only). */
  back?: ReactNode;
  /** Shown after the blocks, in the page's colours: reviews, the call to action. */
  children?: ReactNode;
}) {
  const { t } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const photos = useMemo(() => pagePhotos(source, page), [source, page]);
  // Shapes the article does not have yet are measured as the photos load; the layout follows.
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const shapes = source.shapes;
  const measure = useCallback((url: string, w: number, h: number) => {
    if (!w || !h || shapes?.[url]) return;
    const r = Math.round((w / h) * 1e4) / 1e4;
    // The same photo can load at 1280 and 2560 px (the header and a block), a hair apart in shape; the first one counts.
    setMeasured((m) => (m[url] && Math.abs(m[url] - r) < 0.01 ? m : { ...m, [url]: r }));
  }, [shapes]);
  const ctx: Ctx = {
    title: source.title,
    alt: (item) => item.alt?.trim() || altFromFile(item.url, t.servicePages.photoAlts) || t.portfolioDetail.photoAlt(source.title, photos.indexOf(item.url) + 1),
    open: editor ? undefined : onOpen,
    editing: !!editor,
    ratio: (url) => shapes?.[url] ?? measured[url],
    measure,
  };
  useArticleMotion(root, !editor, page);

  const shown = page.blocks.filter((b) => editor || blockHasContent(b, source, page));
  const fontLinks = pageFontLinks(page);

  return (
    <article ref={root} className={`pa${editor ? " pa--editing" : ""}`} data-theme={page.theme} style={pageVars(page) as CSSProperties}>
      {fontLinks.length > 0 && <Helmet>{fontLinks.map((href) => <link key={href} rel="stylesheet" href={href} />)}</Helmet>}
      <Selectable id="hero" editor={editor} className="pa-hero-slot">
        <Hero source={source} page={page} back={back} ctx={ctx} />
      </Selectable>
      <div className="pa-flow">
        {shown.map((block, i) => (
          <BlockSlot key={block.id} block={block} prev={shown[i - 1]} index={i} editor={editor}>
            <BlockView block={block} source={source} page={page} ctx={ctx} />
          </BlockSlot>
        ))}
        {editor?.between && <div className="pa-between pa-between--end" data-tool>{editor.between(shown.length)}</div>}
      </div>
      {children}
    </article>
  );
}

/** A text's own look: data attributes for the styles, custom properties for its face. */
function lookProps(look: TextLook | undefined, role: LookRole) {
  const vars = lookVars(look, role);
  return { ...lookAttrs(look), style: Object.keys(vars).length ? (vars as CSSProperties) : undefined };
}

const isProse = (b?: Block) => b?.type === "text" && b.style !== "statement";

/** Paragraphs follow each other closely; everything else gets a wide gap. */
function spacing(prev: Block | undefined, block: Block) {
  if (!prev || !isProse(block)) return "";
  if (prev.type === "heading" || (prev.type === "text" && prev.style === "lead")) return " pa-near";
  return isProse(prev) ? " pa-close" : "";
}

function BlockSlot({ block, prev, index, editor, children }: { block: Block; prev?: Block; index: number; editor?: EditorHooks; children: ReactNode }) {
  const kind = block.type === "media" ? `media pa-b--${effectiveLayout(block)}` : block.type === "text" ? `text pa-b--${block.style}` : block.type;
  return (
    <div className={`pa-b pa-b--${kind}${spacing(prev, block)}`}>
      {editor?.between && <div className="pa-between" data-tool>{editor.between(index)}</div>}
      <Selectable id={block.id} editor={editor} className="pa-block">
        {children}
      </Selectable>
    </div>
  );
}

/** A block, or in the page maker a block that is selected by clicking it. */
function Selectable({ id, editor, className, children }: { id: string; editor?: EditorHooks; className: string; children: ReactNode }) {
  if (!editor) return <div className={className}>{children}</div>;
  const selected = editor.selected === id;
  return (
    <div
      className={`${className} pa-sel${selected ? " is-selected" : ""}`}
      data-block={id}
      onClickCapture={(e) => {
        // Links and players do nothing while editing; the click selects.
        if ((e.target as HTMLElement).closest("a, button:not([data-tool]), video")) e.preventDefault();
        if (!(e.target as HTMLElement).closest("[data-tool]")) editor.onSelect(id);
      }}
    >
      {children}
      {selected && editor.tools && <div className="pa-tools" data-tool>{editor.tools(id)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * The header in one of four styles: cinema (title centred over a full-width
 * photo), offset (huge title with the photo tucked under its last line),
 * split (title left, photo right) and plain (title only). Cinema fills the
 * screen and so crops around the cover's point; offset and split show the
 * cover in its own shape unless the page chose one.
 */
function Hero({ source, page, back, ctx }: { source: ArticleSource; page: ArticlePage; back?: ReactNode; ctx: Ctx }) {
  const { t } = useLanguage();
  const cover = page.hero === "plain" ? null : heroCover(source);
  const style = cover ? page.hero : "plain";
  const head = (
    <div className="pa-hero-head">
      {source.category && <p className="pa-kicker">{categoryLabel(t, source.category)}</p>}
      <h1 className="pa-title" {...lookProps(page.titleLook, "display")}>{source.title}</h1>
    </div>
  );
  const sub = page.subtitle.trim() ? <p className="pa-sub">{page.subtitle}</p> : null;
  const r = cover && style !== "cinema" ? frameRatio(page.heroShape ?? "natural", ctx.ratio(cover.url)) : undefined;
  const onSize = cover ? (w: number, h: number) => ctx.measure(cover.url, w, h) : undefined;
  const media = cover && (
    <div className={`pa-hero-media${r ? " pa-hero-media--fixed" : ""}`} data-m={style === "cinema" ? "drift" : undefined} aria-hidden="true"
      style={pointVars(page.coverPoint ?? { x: 50, y: 50 }, r)}>
      {cover.kind === "video"
        ? <AmbientVideo src={cover.url} onSize={onSize} />
        : <MeasuredImg src={cover.url} srcSet={webSrcSet(cover.url)} sizes={style === "cinema" ? "100vw" : "(max-width: 767px) 100vw, 60vw"} alt="" onSize={onSize} {...HIGH_PRIORITY} />}
    </div>
  );
  return (
    <header className={`pa-hero pa-hero--${style}`}>
      {back && <div className="pa-wrap pa-back">{back}</div>}
      {style === "cinema" ? (
        <>
          {media}
          <div className="pa-hero-wash" aria-hidden="true" />
          <div className="pa-wrap pa-hero-text">{head}{sub}</div>
        </>
      ) : (
        <div className="pa-wrap pa-hero-grid">
          {head}
          {media}
          {sub}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function BlockView({ block, source, page, ctx }: { block: Block; source: ArticleSource; page: ArticlePage; ctx: Ctx }) {
  const empty = !blockHasContent(block, source, page);
  if (empty) return ctx.editing ? <Placeholder block={block} noPhotos={!source.galleryUrls.length} /> : null;
  switch (block.type) {
    case "text": return <TextBlock block={block} />;
    case "heading": return <HeadingBlock block={block} />;
    case "media": return <MediaBlock block={block} ctx={ctx} />;
    case "split": return <SplitBlock block={block} ctx={ctx} />;
    case "quote": return <QuoteBlock block={block} />;
    case "facts": return <FactsBlock block={block} editing={ctx.editing} />;
    case "embed": return <EmbedBlock block={block} title={source.title} />;
    case "series": return <SeriesBlock urls={seriesRest(source, page)} ctx={ctx} />;
  }
}

const HINTS: Record<Block["type"], string> = {
  text: "Tekstblok: typ rechts je tekst.",
  heading: "Tussenkop: typ rechts de kop.",
  media: "Fotoblok: kies rechts foto's of video's.",
  split: "Foto met tekst: kies rechts een foto en typ de tekst.",
  quote: "Citaat: typ rechts wat de klant zei.",
  facts: "Feiten: vul rechts de gegevens in.",
  embed: "Video-link: plak rechts een YouTube- of Vimeo-link.",
  series: "Rest van de serie: alle foto's staan al in de blokken erboven. Voeg foto's toe bij Pagina om ze hier te tonen.",
};

function Placeholder({ block, noPhotos }: { block: Block; noPhotos: boolean }) {
  const hint = block.type === "series" && noPhotos
    ? "Rest van de serie: dit stuk heeft nog geen foto's. Zet ze erin bij Pagina, onder Foto's en video's."
    : HINTS[block.type];
  return <div className="pa-wrap"><div className="pa-empty">{hint}</div></div>;
}

function TextBlock({ block }: { block: BlockOf<"text"> }) {
  if (block.style === "statement") {
    const words = plainText(block.text).split(/\s+/).filter(Boolean);
    return (
      <div className="pa-wrap">
        <p className="pa-statement" data-m="words" {...lookProps(block.look, "display")}>
          {words.map((w, i) => <span key={i} className="pa-word">{w}{i < words.length - 1 ? " " : ""}</span>)}
        </p>
      </div>
    );
  }
  return (
    <div className="pa-wrap">
      <div className={block.style === "lead" ? "pa-lead" : "pa-body"} {...lookProps(block.look, "text")}><Rich text={block.text} /></div>
    </div>
  );
}

function HeadingBlock({ block }: { block: BlockOf<"heading"> }) {
  const words = block.text.trim().split(/\s+/);
  const at = Math.max(0, Math.min(words.length, block.after));
  const pill = block.inline && (
    <span className="pa-pill" aria-hidden="true">
      {block.inline.kind === "video" ? <AmbientVideo src={block.inline.url} /> : <img src={block.inline.url} alt="" loading="lazy" decoding="async" />}
    </span>
  );
  return (
    <div className="pa-wrap">
      <h2 className="pa-heading" {...lookProps(block.look, "display")}>
        {pill ? <>{words.slice(0, at).join(" ")}{at > 0 && " "}{pill}{at < words.length && " "}{words.slice(at).join(" ")}</> : block.text}
      </h2>
    </div>
  );
}

const SIZES: Record<MediaLayout, string> = {
  full: "100vw",
  wide: "100vw",
  inset: "(max-width: 767px) 100vw, 880px",
  duo: "(max-width: 767px) 100vw, 50vw",
  offset: "(max-width: 767px) 100vw, 58vw",
  trio: "(max-width: 767px) 100vw, 34vw",
  mosaic: "(max-width: 767px) 50vw, 34vw",
  slices: "(max-width: 767px) 80vw, 40vw",
  marquee: "(max-width: 767px) 60vw, 30vw",
  free: "(max-width: 767px) 100vw, 60vw",
};

/**
 * A media block. Every layout shows each photo in its own shape unless the
 * block chose one shape for all; then each is cropped around its point.
 * Photos side by side line up at one height (a justified row), so a portrait
 * and a landscape can share a row without either losing anything. Only the
 * accordion and the tight mosaic grid crop by design.
 */
function MediaBlock({ block, ctx }: { block: BlockOf<"media">; ctx: Ctx }) {
  const layout = effectiveLayout(block);
  const items = shownItems(block);
  const shape = blockShape(block);
  const caption = block.caption.trim() && <figcaption className="pa-caption">{block.caption}</figcaption>;
  const ratioOf = (item: MediaItem) => frameRatio(shape, ctx.ratio(item.url));
  const shot = (item: MediaItem, i: number, r?: number, sizes = SIZES[layout]) => (
    <Shot key={`${item.url}-${i}`} item={item} ctx={ctx} r={r} sizes={sizes} />
  );
  const gap = block.gap ? { "data-gap": block.gap } : {};

  if (layout === "marquee") {
    // The row twice over, so it can run on without a seam. The copy is hidden from screen readers.
    return (
      <figure className="pa-figure">
        <div className="pa-marquee" {...gap}>
          <div className="pa-marquee-track">
            {items.map((item, i) => shot(item, i))}
            <div className="pa-marquee-copy" aria-hidden="true">{items.map((item, i) => <Shot key={`c${i}`} item={item} ctx={{ ...ctx, open: undefined }} sizes={SIZES.marquee} decorative />)}</div>
          </div>
        </div>
        {caption && <div className="pa-wrap">{caption}</div>}
      </figure>
    );
  }

  if (layout === "slices") {
    return (
      <figure className="pa-figure pa-wrap">
        <Slices count={items.length} nudge={!ctx.editing} gap={block.gap}>{items.map((item, i) => shot(item, i))}</Slices>
        {caption}
      </figure>
    );
  }

  let body: ReactNode;
  if (layout === "mosaic" && shape === "grid") {
    // The tight grid: twelve columns filled without gaps, every photo cropped to its cell.
    body = (
      <div className={`pa-media pa-media--grid pa-mosaic--${items.length}`} data-m="grow" {...gap}>
        {items.map((item, i) => shot(item, i, undefined, i === 0 ? "(max-width: 767px) 100vw, 60vw" : SIZES.mosaic))}
      </div>
    );
  } else if (layout === "free") {
    const places = freePlaces(items, ctx.ratio);
    body = (
      <div className="pa-media pa-media--free" {...gap}>
        {items.map((item, i) => {
          const p = places[i];
          return (
            <div key={`${item.url}-${i}`} className="pa-free-item" data-m="grow" data-place={p.place} data-small={p.span < 7 || undefined}
              style={{ "--c": p.column, "--s": p.span, "--d": p.drop } as CSSProperties}>
              {shot(item, i, ratioOf(item), `(max-width: 767px) 100vw, ${Math.round((p.span / 12) * 100)}vw`)}
            </div>
          );
        })}
      </div>
    );
  } else {
    const ratios = items.map(ratioOf);
    const known = ratios.every((r) => r !== undefined);
    const sum = known ? ratios.reduce((s, r) => s + r!, 0) : undefined;
    // Rows (two, three, the mosaic) know their total shape, so a row of tall photos never grows taller than the screen.
    const vars = { "--n": items.length, ...(sum ? { "--sum": sum } : {}) } as CSSProperties;
    const tall = layout === "full" && ratios[0] !== undefined && ratios[0] < 1.25;
    body = (
      <div className={`pa-media pa-media--${layout}${tall ? " is-tall" : ""}`} data-m={layout === "full" ? "cinema" : "grow"} style={vars} {...gap}>
        {items.map((item, i) => shot(item, i, ratios[i]))}
      </div>
    );
  }

  return (
    <figure className={`pa-figure${layout === "full" ? "" : " pa-wrap"}`}>
      {body}
      {caption && (layout === "full" ? <div className="pa-wrap">{caption}</div> : caption)}
    </figure>
  );
}

/**
 * The accordion. On a computer the slices open under the pointer. On a phone
 * one photo is open at full width and the others stand beside it as thin
 * slices: swipe, or tap a slice, to open the next. A counter and a bar show
 * where you are, and the first time it comes into view it opens the second
 * photo for a moment, so it is clear it moves. The bar and the hint only show
 * on phones (article.css).
 */
function Slices({ count, nudge, gap, children }: { count: number; nudge: boolean; gap?: string; children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [at, setAt] = useState(0);
  const [moved, setMoved] = useState(false);
  const movedRef = useRef(false);

  const onPhone = () => ((strip.current?.closest(".pa") as HTMLElement | null)?.clientWidth ?? 1000) < 768;
  function show(i: number) {
    setAt(Math.max(0, Math.min(count - 1, i)));
    setMoved(true);
    movedRef.current = true;
  }

  useEffect(() => {
    const el = strip.current;
    if (!nudge || !el || count < 2 || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || !onPhone()) return;
      observer.disconnect();
      timers.push(window.setTimeout(() => !movedRef.current && setAt(1), 500));
      timers.push(window.setTimeout(() => !movedRef.current && setAt(0), 1700));
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [nudge, count]);

  return (
    <>
      <div
        ref={strip}
        className="pa-media pa-media--slices"
        data-gap={gap}
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) show(at + (dx < 0 ? 1 : -1));
        }}
      >
        {Children.map(children, (child, i) => (
          <div
            className="pa-slice"
            data-on={i === at || undefined}
            // On a phone a closed slice opens first; tapping the open one enlarges it.
            onClickCapture={(e) => {
              if (i === at || !onPhone()) return;
              e.preventDefault();
              e.stopPropagation();
              show(i);
            }}
          >
            {child}
          </div>
        ))}
      </div>
      <div className="pa-swipe" aria-hidden="true">
        <span className="pa-swipe-count">{String(at + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
        <span className="pa-swipe-bar">{Array.from({ length: count }, (_, i) => <i key={i} data-on={i === at || undefined} />)}</span>
        <span className={`pa-swipe-hint${moved ? " is-gone" : ""}`}>
          Swipe
          <svg viewBox="0 0 28 10" width="28" height="10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 5h25M22 1l4 4-4 4" />
          </svg>
        </span>
      </div>
    </>
  );
}

function SplitBlock({ block, ctx }: { block: BlockOf<"split">; ctx: Ctx }) {
  return (
    <div className={`pa-wrap pa-split pa-split--${block.side}`}>
      <div className="pa-split-media" data-m="grow">
        {block.media && <Shot item={block.media} ctx={ctx} r={ctx.ratio(block.media.url)} sizes="(max-width: 767px) 100vw, 58vw" />}
      </div>
      <div className="pa-split-text">
        {block.heading.trim() && <h2 className="pa-split-heading" {...lookProps(block.look, "display")}>{block.heading}</h2>}
        {block.text.trim() && <div className="pa-body"><Rich text={block.text} /></div>}
      </div>
    </div>
  );
}

function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  return (
    <div className="pa-wrap">
      <figure className="pa-quote" {...lookProps(block.look, "text")}>
        <blockquote><p>{block.text}</p></blockquote>
        {(block.name.trim() || block.role.trim()) && (
          <figcaption>
            {block.name.trim() && <b>{block.name}</b>}
            {block.role.trim() && <span>{block.role}</span>}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function FactsBlock({ block, editing }: { block: BlockOf<"facts">; editing: boolean }) {
  // The page maker also shows the ones still to fill in.
  const facts = block.items.filter((f) => f.label.trim() && (editing || f.value.trim()));
  return (
    <div className="pa-wrap">
      <dl className="pa-facts">
        {facts.map((f, i) => (
          <div key={i}>
            <dt>{f.label}</dt>
            <dd>{f.value.trim() || <span className="pa-todo">Nog invullen</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmbedBlock({ block, title }: { block: BlockOf<"embed">; title: string }) {
  const { t } = useLanguage();
  const src = embedSrc(block.url);
  // YouTube and Vimeo hear about a visitor only after a click (see the Cookiebeleid).
  const [loaded, setLoaded] = useState(false);
  const provider = src?.includes("vimeo") ? "Vimeo" : "YouTube";
  return (
    <figure className="pa-figure pa-wrap">
      <div className="pa-embed">
        {src && !loaded && (
          <button type="button" className="pa-embed-load" onClick={() => setLoaded(true)}>
            <b>{t.portfolioDetail.videoLoad}</b>
            <span>{t.portfolioDetail.videoNote(provider)}</span>
          </button>
        )}
        {src && loaded && (
          <iframe
            src={src}
            title={block.caption.trim() || t.portfolioDetail.video(title)}
            loading="lazy"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      {block.caption.trim() && <figcaption className="pa-caption">{block.caption}</figcaption>}
    </figure>
  );
}

function SeriesBlock({ urls, ctx }: { urls: string[]; ctx: Ctx }) {
  const { t } = useLanguage();
  return (
    <section className="pa-wrap pa-series" aria-labelledby="pa-series-title">
      <h2 id="pa-series-title" className="pa-series-title">{t.portfolioDetail.moreFromSeries}</h2>
      <div className={`pa-spread${urls.length === 1 ? " pa-spread--single" : ""}`}>
        {urls.map((url, i) => {
          const small = i % 4 === 1 || i % 4 === 2;
          return <Shot key={url} item={{ url, kind: /\.(mp4|mov|m4v|webm)$/i.test(url.split("?")[0]) ? "video" : "image" }} ctx={ctx} natural r={ctx.ratio(url)}
            sizes={small && urls.length > 1 ? "(max-width: 767px) 100vw, 34vw" : "(max-width: 767px) 100vw, 60vw"} />;
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Photos, videos and text
// ---------------------------------------------------------------------------

/**
 * One photo or video in its frame. With `r` the frame has that shape and the
 * photo fills it around its point (with the photo's own shape nothing is cut
 * off); without, the photo sets its own height.
 */
function Shot({ item, ctx, sizes, r, decorative, natural }: { item: MediaItem; ctx: Ctx; sizes: string; r?: number; decorative?: boolean; natural?: boolean }) {
  const frame = `pa-frame${r ? " pa-frame--fixed" : ""}`;
  const style = pointVars(pointOf(item), r);
  const onSize = (w: number, h: number) => ctx.measure(item.url, w, h);
  if (item.kind === "video") {
    return (
      <span className={frame} style={style}>
        {item.sound
          ? <video src={item.url} controls playsInline preload="metadata" aria-label={decorative ? undefined : item.alt?.trim() || ctx.title}
              onLoadedMetadata={(e) => onSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
          : <AmbientVideo src={item.url} onSize={onSize} />}
      </span>
    );
  }
  const img = <MeasuredImg src={item.url} srcSet={webSrcSet(item.url)} sizes={sizes} alt={decorative ? "" : ctx.alt(item)} loading="lazy" decoding="async" onSize={onSize} />;
  if (!ctx.open || decorative) return <span className={frame} style={style}>{img}</span>;
  const open = ctx.open;
  return (
    <button type="button" className={`${frame} pa-zoom${natural ? " pa-frame--natural" : ""}`} style={style} onClick={() => open(item.url)}>
      {img}
    </button>
  );
}

/** The point that stays in view and the frame's shape, as custom properties for article.css. */
function pointVars(p: FocusPoint, r?: number): CSSProperties {
  return { "--px": `${p.x}%`, "--py": `${p.y}%`, ...(r ? { "--r": r } : {}) } as CSSProperties;
}

/** A photo that reports its pixel size once loaded, also when it was already loaded before the page came alive. */
function MeasuredImg({ onSize, ...props }: ImgHTMLAttributes<HTMLImageElement> & { onSize?: (w: number, h: number) => void }) {
  const ref = useRef<HTMLImageElement>(null);
  const report = useRef(onSize);
  report.current = onSize;
  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth) report.current?.(el.naturalWidth, el.naturalHeight);
  }, [props.src]);
  return <img {...props} ref={ref} onLoad={(e) => report.current?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} />;
}

/** A silent looping clip; still for visitors who ask for less motion. */
function AmbientVideo({ src, onSize }: { src: string; onSize?: (w: number, h: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.pause();
    video.removeAttribute("autoplay");
  }, []);
  return (
    <video ref={ref} src={src} autoPlay loop muted playsInline preload="metadata" aria-hidden="true"
      onLoadedMetadata={onSize && ((e) => onSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight))} />
  );
}

/**
 * Text with paragraphs (an empty line), line breaks and three small marks:
 * **vet**, *schuin* and [een link](https://…). Links go to http, https or
 * mailto only.
 */
export function Rich({ text }: { text: string }) {
  const paras = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return <>{paras.map((p, i) => <p key={i}>{inline(p)}</p>)}</>;
}

const MARKS = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\n/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(MARKS)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[0] === "\n") out.push(<br key={k++} />);
    else if (m[1] !== undefined) {
      const href = /^(https?:\/\/|mailto:)/i.test(m[2]) ? m[2] : null;
      out.push(href
        ? <a key={k++} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{m[1]}</a>
        : m[1]);
    } else if (m[3] !== undefined) out.push(<strong key={k++}>{m[3]}</strong>);
    else out.push(<em key={k++}>{m[4]}</em>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
