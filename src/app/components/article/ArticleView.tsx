import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  blockHasContent, effectiveLayout, embedSrc, heroCover, pagePhotos, plainText, seriesRest, shownItems,
  type ArticlePage, type ArticleSource, type Block, type BlockOf, type MediaItem, type MediaLayout,
} from "../../lib/articlePage";
import { HIGH_PRIORITY, webSrcSet } from "../../lib/images";
import { useLanguage } from "../../context/LanguageContext";
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
  const ctx: Ctx = {
    title: source.title,
    alt: (item) => item.alt?.trim() || t.portfolioDetail.photoAlt(source.title, photos.indexOf(item.url) + 1),
    open: editor ? undefined : onOpen,
    editing: !!editor,
  };
  useArticleMotion(root, !editor, page);

  const shown = page.blocks.filter((b) => editor || blockHasContent(b, source, page));

  return (
    <article ref={root} className={`pa${editor ? " pa--editing" : ""}`} data-theme={page.theme}>
      <Selectable id="hero" editor={editor} className="pa-hero-slot">
        <Hero source={source} page={page} back={back} />
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
 * split (title left, photo right) and plain (title only).
 */
function Hero({ source, page, back }: { source: ArticleSource; page: ArticlePage; back?: ReactNode }) {
  const cover = page.hero === "plain" ? null : heroCover(source);
  const style = cover ? page.hero : "plain";
  const head = (
    <div className="pa-hero-head">
      {source.category && <p className="pa-kicker">{source.category}</p>}
      <h1 className="pa-title">{source.title}</h1>
    </div>
  );
  const sub = page.subtitle.trim() ? <p className="pa-sub">{page.subtitle}</p> : null;
  const media = cover && (
    <div className="pa-hero-media" data-m="drift" aria-hidden="true">
      {cover.kind === "video"
        ? <AmbientVideo src={cover.url} />
        : <img src={cover.url} srcSet={webSrcSet(cover.url)} sizes={style === "cinema" ? "100vw" : "(max-width: 767px) 100vw, 60vw"} alt="" {...HIGH_PRIORITY} />}
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
        <p className="pa-statement" data-m="words">
          {words.map((w, i) => <span key={i} className="pa-word">{w}{i < words.length - 1 ? " " : ""}</span>)}
        </p>
      </div>
    );
  }
  return (
    <div className="pa-wrap">
      <div className={block.style === "lead" ? "pa-lead" : "pa-body"}><Rich text={block.text} /></div>
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
      <h2 className="pa-heading">
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
};

function MediaBlock({ block, ctx }: { block: BlockOf<"media">; ctx: Ctx }) {
  const layout = effectiveLayout(block);
  const items = shownItems(block);
  const caption = block.caption.trim() && <figcaption className="pa-caption">{block.caption}</figcaption>;
  const shot = (item: MediaItem, i: number, sizes = SIZES[layout]) => (
    <Shot key={`${item.url}-${i}`} item={item} ctx={ctx} sizes={i === 0 && layout === "mosaic" ? "(max-width: 767px) 100vw, 60vw" : sizes} />
  );

  if (layout === "marquee") {
    // The row twice over, so it can run on without a seam. The copy is hidden from screen readers.
    return (
      <figure className="pa-figure">
        <div className="pa-marquee">
          <div className="pa-marquee-track">
            {items.map((item, i) => shot(item, i))}
            <div className="pa-marquee-copy" aria-hidden="true">{items.map((item, i) => <Shot key={`c${i}`} item={item} ctx={{ ...ctx, open: undefined }} sizes={SIZES.marquee} decorative />)}</div>
          </div>
        </div>
        {caption && <div className="pa-wrap">{caption}</div>}
      </figure>
    );
  }

  return (
    <figure className={`pa-figure${layout === "full" ? "" : " pa-wrap"}`}>
      <div className={`pa-media pa-media--${layout}${layout === "mosaic" ? ` pa-mosaic--${items.length}` : ""}`} data-m={layout === "full" ? "cinema" : layout === "slices" ? undefined : "grow"}>
        {items.map((item, i) => shot(item, i))}
      </div>
      {caption && (layout === "full" ? <div className="pa-wrap">{caption}</div> : caption)}
    </figure>
  );
}

function SplitBlock({ block, ctx }: { block: BlockOf<"split">; ctx: Ctx }) {
  return (
    <div className={`pa-wrap pa-split pa-split--${block.side}`}>
      <div className="pa-split-media" data-m="grow">
        {block.media && <Shot item={block.media} ctx={ctx} sizes="(max-width: 767px) 100vw, 58vw" />}
      </div>
      <div className="pa-split-text">
        {block.heading.trim() && <h2 className="pa-split-heading">{block.heading}</h2>}
        {block.text.trim() && <div className="pa-body"><Rich text={block.text} /></div>}
      </div>
    </div>
  );
}

function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  return (
    <div className="pa-wrap">
      <figure className="pa-quote">
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
  return (
    <figure className="pa-figure pa-wrap">
      <div className="pa-embed">
        {src && (
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
          return <Shot key={url} item={{ url, kind: /\.(mp4|mov|m4v|webm)$/i.test(url.split("?")[0]) ? "video" : "image" }} ctx={ctx} natural
            sizes={small && urls.length > 1 ? "(max-width: 767px) 100vw, 34vw" : "(max-width: 767px) 100vw, 60vw"} />;
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Photos, videos and text
// ---------------------------------------------------------------------------

function Shot({ item, ctx, sizes, decorative, natural }: { item: MediaItem; ctx: Ctx; sizes: string; decorative?: boolean; natural?: boolean }) {
  const focus = item.focus && item.focus !== "center" ? ` pa-focus--${item.focus}` : "";
  if (item.kind === "video") {
    return (
      <span className={`pa-frame${focus}`}>
        {item.sound
          ? <video src={item.url} controls playsInline preload="metadata" aria-label={decorative ? undefined : item.alt?.trim() || ctx.title} />
          : <AmbientVideo src={item.url} />}
      </span>
    );
  }
  const img = <img src={item.url} srcSet={webSrcSet(item.url)} sizes={sizes} alt={decorative ? "" : ctx.alt(item)} loading="lazy" decoding="async" />;
  if (!ctx.open || decorative) return <span className={`pa-frame${focus}`}>{img}</span>;
  const open = ctx.open;
  return (
    <button type="button" className={`pa-frame pa-zoom${focus}${natural ? " pa-frame--natural" : ""}`} onClick={() => open(item.url)}>
      {img}
    </button>
  );
}

/** A silent looping clip; still for visitors who ask for less motion. */
function AmbientVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.pause();
    video.removeAttribute("autoplay");
  }, []);
  return <video ref={ref} src={src} autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />;
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
