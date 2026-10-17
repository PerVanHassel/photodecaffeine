import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Download, Flame, Grid3x3, Heart, Play, Rows2, Share2, Users, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useModalFocus } from "../../lib/dialog";
import { fmt } from "../format";
import { useT } from "../portal/i18n";
import type { GalleryImage, GalleryProject } from "../types";
import { cx, isVideo } from "../ui";
import { useUrlState } from "../urlState";
import { DEFAULT_RATIO, justify, masonry, rowBoxes, story, type Box } from "./layout";
import { accentOf, onAccent, styleOf, type StyleDef } from "./styles";
import "./gallery.css";

// The client's gallery in the look the studio chose for the project. Used by
// the portal (hearts, downloads, sending the choice), by the group link's page
// (everyone's hearts counted, shared photos) and by the admin preview
// (read-only, with everyone's favourites).

type T = ReturnType<typeof useT>;
type View = "large" | "compact";
type Filter = "all" | "fav" | "popular";
/** How a photo's hearts from the group show: in the heart itself (guests), as a badge (the client), or not. */
type CountAs = "heart" | "badge" | "none";
type TileFn = (g: GalleryImage, i: number, opts?: { heart?: boolean; eager?: boolean }) => ReactNode;

export interface GalleryActions {
  toggle?: (img: GalleryImage) => void;
  downloadOne?: (img: GalleryImage) => void;
  downloadAll?: (list: GalleryImage[]) => void;
  zip?: { done: number; total: number } | null;
  submit?: () => void;
  /** Opens the panel to pass the group link on. */
  share?: () => void;
  /** Passes on a link to one photo. */
  sharePhoto?: (img: GalleryImage) => void;
}

const DONE = ["delivered", "review", "archived"];
const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Row heights per look: larger on wide screens, a photo or two across on a
 * phone, where a lone portrait may also take the full width.
 */
const ROWS: Record<string, (w: number) => { target: number; gap: number; max?: number }> = {
  atelier: (w) => (w < 560 ? { target: w * 0.56, gap: 4, max: w * 1.5 } : { target: clamp(200, w * 0.21, 320), gap: 8 }),
  noir: (w) => (w < 560 ? { target: w * 0.62, gap: 3, max: w * 1.5 } : { target: clamp(240, w * 0.27, 440), gap: 4 }),
  compact: (w) => (w < 560 ? { target: w * 0.3, gap: 3 } : { target: clamp(110, w * 0.11, 170), gap: 4 }),
};

/**
 * Arena's tempo: one tall row with a highlight or two, then two low rows that
 * read like a burst of frames. On a phone: one photo across, then pairs.
 */
function tempo(ratios: number[], w: number) {
  const base = w < 560 ? w * 0.3 : clamp(150, w * 0.15, 230);
  const gap = w < 560 ? 3 : 4;
  const rows = justify(ratios, w, (row) => (row % 3 === 0 ? base * 1.9 : base), gap, w < 560 ? w * 1.5 : undefined);
  return rowBoxes(rows, ratios, w, gap);
}

export function ClientGallery({ project: p, favs, favNames, counts, guest, actions, back, after, openId, preview }: {
  project: GalleryProject;
  favs: Set<string>;
  /** Preview: who picked each photo. */
  favNames?: Record<string, string[]>;
  /** Hearts per photo from the people the group link reached. */
  counts?: Record<string, number>;
  /** Someone who came in with the group link: their texts, and the hearts counted in the heart. */
  guest?: { name: string; guests: number };
  actions: GalleryActions;
  back: ReactNode;
  /** Under the photos, above the footer. */
  after?: ReactNode;
  /** A photo to open straight away (a link to one photo). */
  openId?: string;
  preview?: boolean;
}) {
  const t = useT();
  const style = styleOf(p);
  const accent = accentOf(p);
  const [filter, setFilter] = useUrlState<Filter>("filter", "all", ["all", "fav", "popular"]);
  const [view, setView] = useUrlState<View>("view", "large", ["large", "compact"]);
  const [open, setOpen] = useState<{ list: GalleryImage[]; index: number } | null>(null);
  const { ratioOf, report } = useRatios();
  const top = useStickyTop();
  const grid = useRef<HTMLElement>(null);

  const delivered = DONE.includes(p.stage);
  const downloads = preview ? "none" : p.downloads || "original";
  const numberOf = useMemo(() => new Map(p.gallery.map((g, i) => [g.id, i + 1])), [p.gallery]);
  const countOf = (g: GalleryImage) => counts?.[g.id] || 0;
  // Most hearts first; equal ones keep the studio's order.
  const popular = p.gallery.filter((g) => countOf(g) > 0).sort((a, b) => countOf(b) - countOf(a) || numberOf.get(a.id)! - numberOf.get(b.id)!);
  const showPopular = popular.length > 0 || filter === "popular";
  const shown = filter === "fav" ? p.gallery.filter((g) => favs.has(g.id)) : filter === "popular" ? popular : p.gallery;
  const countAs: CountAs = guest ? "heart" : filter === "popular" ? "badge" : "none";
  const ratios = shown.map(ratioOf);
  const videos = p.gallery.filter((g) => isVideo(g.fileName || g.url)).length;

  // A link to one photo opens it once the gallery is there.
  useEffect(() => {
    const index = openId ? p.gallery.findIndex((g) => g.id === openId) : -1;
    if (index >= 0) setOpen({ list: p.gallery, index });
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const coverImage = p.gallery.find((g) => g.id === p.gallerySettings.coverImageId) || p.gallery.find((g) => !isVideo(g.fileName || g.url));
  const cover = p.gallerySettings.coverUrl || coverImage?.url || "";
  // Arena opens with the cover and the next few photos side by side, like a burst.
  const strip = [cover, ...p.gallery.filter((g) => g !== coverImage && !isVideo(g.fileName || g.url)).slice(0, 3).map((g) => g.url)].filter(Boolean);
  const shoot = p.events?.find((e) => e.kind === "shoot");
  const kicker = p.gallerySettings.subtitle || (shoot ? fmt(shoot.startsAt, "d MMMM yyyy") : "");

  const tile: TileFn = (g, i, opts = {}) => (
    <Tile
      img={g}
      label={t.viewPhoto(numberOf.get(g.id) || i + 1)}
      alt={t.photoOf(numberOf.get(g.id) || i + 1, p.gallery.length)}
      fav={favs.has(g.id)}
      favBy={favNames?.[g.id]}
      count={countOf(g)}
      countAs={countAs}
      onOpen={() => setOpen({ list: shown, index: i })}
      onToggle={actions.toggle && (() => actions.toggle!(g))}
      onSize={(w, h) => report(g, w, h)}
      eager={opts.eager ?? i < 8}
      heart={opts.heart}
      t={t}
    />
  );

  const layout = view === "compact" ? "compact" : style.layout;
  let body: ReactNode;
  if (layout === "story") body = <StoryLayout images={shown} ratios={ratios} tile={tile} numberOf={numberOf} total={p.gallery.length} />;
  else if (layout === "sheet") {
    body = <SheetLayout images={shown} ratios={ratios} tile={tile} numberOf={numberOf} favs={favs} favNames={favNames} counts={countAs === "heart" ? counts : undefined} onToggle={actions.toggle} t={t} />;
  }
  else if (layout === "tempo") body = <PlacedLayout images={shown} tile={tile} place={(w) => tempo(ratios, w)} />;
  else if (layout === "masonry") {
    body = <PlacedLayout images={shown} tile={tile} place={(w) => masonry(ratios, w, w < 620 ? 2 : w < 1080 ? 3 : 4, w < 620 ? 8 : 16)} />;
  } else {
    const sizing = ROWS[layout === "compact" ? "compact" : style.id] || ROWS.atelier;
    body = (
      <PlacedLayout images={shown} tile={tile} place={(w) => {
        const { target, gap, max } = sizing(w);
        const g = layout === "compact" && style.id === "noir" ? 2 : gap;
        return rowBoxes(justify(ratios, w, target, g, max), ratios, w, g);
      }} />
    );
  }

  const facts = (
    <dl className="g-facts">
      <div><dt>{t.statPhotos}</dt><dd>{p.gallery.length - videos}</dd></div>
      {videos > 0 && <div><dt>{t.statVideos}</dt><dd>{videos}</dd></div>}
      {favs.size > 0 && <div><dt>{t.statFavorites}</dt><dd>{favs.size}</dd></div>}
      {guest && guest.guests > 0 && <div><dt>{t.statGuests}</dt><dd>{guest.guests}</dd></div>}
    </dl>
  );
  const intro = (
    <>
      <p className="g-intro">
        {guest ? t.guestIntro(guest.name.split(" ")[0], downloads !== "none") : delivered ? t.galleryDownloadIntro : t.galleryChooseIntro}
      </p>
      {(downloads === "watermark" || p.watermarked) && <p className="g-small">{guest ? t.watermarkNoteGuest : t.watermarkNote}</p>}
      {actions.share && !guest && (
        <button type="button" className="g-share-cta" onClick={actions.share}><Users />{t.shareCta}</button>
      )}
    </>
  );
  const title = p.gallerySettings.title || p.title;
  // Catalogus shows three figures; for a guest the last one is how many came by.
  const third: [string, string] = guest ? [t.statGuests, String(guest.guests)] : [t.statStatus, delivered ? t.statusReady : t.statusChoosing];

  return (
    <main
      className={cx("g-page", preview && "framed")}
      data-style={style.id}
      data-tone={style.dark ? "dark" : "light"}
      data-view={view}
      style={{ "--g-accent": accent, "--g-on-accent": onAccent(accent), "--g-top": `${top}px` } as CSSProperties}
    >
      <Helmet>
        {style.font && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${style.font}&display=swap`} />}
        {style.dark && !preview && <meta name="theme-color" content="#0f0e0d" />}
      </Helmet>
      {back && <div className="g-back">{back}</div>}

      <Hero style={style} title={title} kicker={kicker} cover={cover} strip={strip} intro={intro} facts={facts} t={t}
        third={third} count={p.gallery.length} favCount={favs.size}
        onScroll={() => grid.current?.scrollIntoView({ behavior: "smooth" })} />

      <section ref={grid} className="g-wrap" aria-label={t.yourGallery} style={{ scrollMarginTop: top }}
        onContextMenu={downloads === "original" || preview ? undefined : (e) => e.preventDefault()}>
        {p.gallery.length === 0 ? (
          <div className="g-empty"><p className="g-title">{t.noPhotos}</p><p>{guest ? t.noPhotosGuest : t.noPhotosHint}</p></div>
        ) : (
          <>
            <div className="g-bar">
              <div className={cx("g-tabs", showPopular && "three")} role="group" aria-label="Filter">
                <button type="button" className="g-tab" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                  {t.allShort}<span className="n">{p.gallery.length}</span>
                </button>
                <button type="button" className="g-tab" aria-pressed={filter === "fav"} onClick={() => setFilter("fav")}>
                  <Heart fill={filter === "fav" ? "currentColor" : "none"} /><span className="g-tab-label">{t.favoritesShort}</span><span className="n">{favs.size}</span>
                </button>
                {showPopular && (
                  <button type="button" className="g-tab" aria-pressed={filter === "popular"} onClick={() => setFilter("popular")}>
                    <Flame /><span className="g-tab-label">{t.popularShort}</span><span className="n">{popular.length}</span>
                  </button>
                )}
              </div>
              <div className="g-tools">
                <div className="g-views" role="group" aria-label={t.viewLabel}>
                  <button type="button" aria-pressed={view === "large"} title={t.viewLarge} aria-label={t.viewLarge} onClick={() => setView("large")}><Rows2 /></button>
                  <button type="button" aria-pressed={view === "compact"} title={t.viewCompact} aria-label={t.viewCompact} onClick={() => setView("compact")}><Grid3x3 /></button>
                </div>
                {actions.downloadAll && downloads !== "none" && shown.length > 0 && filter !== "popular" && (
                  <button type="button" className="g-btn" disabled={!!actions.zip} onClick={() => actions.downloadAll!(shown)}
                    aria-label={filter === "fav" ? t.downloadFavorites : t.downloadAll}>
                    <Download />
                    <span className="g-btn-label">{actions.zip ? t.zipping(actions.zip.done, actions.zip.total) : filter === "fav" ? t.downloadFavorites : t.downloadAll}</span>
                  </button>
                )}
                {actions.share && (
                  <button type="button" className="g-btn" onClick={actions.share} aria-label={guest ? t.share : t.shareWithGroup}>
                    <Share2 /><span className="g-btn-label">{guest ? t.share : t.shareWithGroup}</span>
                  </button>
                )}
              </div>
            </div>
            {shown.length > 0 ? body : filter === "popular" ? (
              <div className="g-empty"><Flame /><p className="g-title">{t.noHearts}</p><p>{t.noHeartsHint}</p></div>
            ) : (
              <div className="g-empty"><Heart /><p className="g-title">{t.noFavorites}</p><p>{t.noFavoritesHint}</p></div>
            )}
          </>
        )}
      </section>

      {after}

      <footer className="g-foot">
        <span>{t.madeBy}</span>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp />{t.backToTop}</button>
      </footer>

      {actions.submit && !delivered && p.gallery.length > 0 && !open && (
        <div className="g-dock">
          <span className="g-dock-count" aria-live="polite">
            {favs.size ? <><Heart fill="currentColor" />{t.chosenCount(favs.size)}</> : t.tapToChoose}
          </span>
          <button type="button" className="g-btn primary" disabled={!favs.size} onClick={actions.submit}>{t.submitChoice}<ArrowRight /></button>
        </div>
      )}

      {open && (
        <Lightbox list={open.list} start={open.index} total={p.gallery.length} numberOf={numberOf} favs={favs} favNames={favNames}
          counts={counts} countAs={guest ? "heart" : "badge"}
          onToggle={actions.toggle} onDownload={downloads === "none" ? undefined : actions.downloadOne} onShare={actions.sharePhoto}
          protect={downloads !== "original" && !preview} onClose={() => setOpen(null)} t={t} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// The opening of each look
// ---------------------------------------------------------------------------

function Hero({ style, title, kicker, cover, strip, intro, facts, third, count, favCount, onScroll, t }: {
  style: StyleDef; title: string; kicker: string; cover: string; strip: string[]; intro: ReactNode; facts: ReactNode;
  /** Catalogus's third figure, as [label, value]. */
  third: [string, string];
  count: number; favCount: number; onScroll: () => void; t: T;
}) {
  const coverFig = cover ? <figure className="g-cover"><img src={cover} alt="" /></figure> : null;
  switch (style.id) {
    case "editorial":
      return (
        <header className="g-hero g-hero--editorial">
          <div className="g-masthead"><span>PhotoDeCaffeine</span>{kicker && <span>{kicker}</span>}<span>{t.photosCount(count)}</span></div>
          <div className="g-head">
            <h1 className="g-title">{title}</h1>
            {intro}
          </div>
          {coverFig}
        </header>
      );
    case "noir":
      return (
        <header className={cx("g-hero g-hero--noir", !cover && "no-cover")}>
          {coverFig}
          <div className="g-head">
            <div>
              {kicker && <p className="g-kicker">{kicker}</p>}
              <h1 className="g-title">{title}</h1>
              {intro}
            </div>
            <div className="g-side">
              {facts}
              <button type="button" className="g-scroll" onClick={onScroll}><ArrowDown />{t.toPhotos}</button>
            </div>
          </div>
        </header>
      );
    case "zacht":
      return (
        <header className="g-hero g-hero--zacht">
          {coverFig}
          {kicker && <p className="g-kicker">{kicker}</p>}
          <h1 className="g-title">{title}</h1>
          {intro}
          {facts}
        </header>
      );
    case "arena":
      return (
        <header className="g-hero g-hero--arena">
          {kicker && <p className="g-kicker"><span>{kicker}</span></p>}
          <h1 className="g-title">{title}</h1>
          {strip.length > 0 && (
            <div className="g-burst">
              {strip.map((src, k) => <figure key={k} style={{ "--i": k } as CSSProperties}><img src={src} alt="" /></figure>)}
            </div>
          )}
          <div className="g-head">{intro}</div>
          {facts}
        </header>
      );
    case "catalogus":
      return (
        <header className="g-hero g-hero--catalogus">
          <p className="g-kicker"><span>PhotoDeCaffeine</span>{kicker && <span>{kicker}</span>}</p>
          <div className="g-head">
            <h1 className="g-title">{title}</h1>
            {intro}
          </div>
          <dl className="g-spec">
            <div><dt>{t.statPhotos}</dt><dd>{count}</dd></div>
            <div><dt>{t.statFavorites}</dt><dd>{favCount}</dd></div>
            <div><dt>{third[0]}</dt><dd>{third[1]}</dd></div>
          </dl>
        </header>
      );
    default:
      return (
        <header className="g-hero g-hero--atelier">
          <div className="g-head">
            {kicker && <p className="g-kicker">{kicker}</p>}
            <h1 className="g-title">{title}</h1>
            {intro}
          </div>
          {facts}
          {coverFig}
        </header>
      );
  }
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

/** Rows and masonry: every photo placed by position, so a resize moves photos instead of rebuilding them. */
function PlacedLayout({ images, tile, place }: { images: GalleryImage[]; tile: TileFn; place: (width: number) => { boxes: Box[]; height: number } }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { boxes, height } = width ? place(width) : { boxes: [] as Box[], height: 0 };
  return (
    <div ref={ref} className="g-placed" style={{ height }}>
      {boxes.map((b, i) => (
        <div key={images[i].id} className="g-cell"
          style={{ width: b.width, height: b.height, transform: `translate3d(${b.left}px, ${b.top}px, 0)`, containIntrinsicSize: `${Math.round(b.width)}px ${Math.round(b.height)}px` }}>
          {tile(images[i], i)}
        </div>
      ))}
    </div>
  );
}

function StoryLayout({ images, ratios, tile, numberOf, total }: { images: GalleryImage[]; ratios: number[]; tile: TileFn; numberOf: Map<string, number>; total: number }) {
  const r = (i: number) => ({ "--r": ratios[i] }) as CSSProperties;
  return (
    <div className="g-story">
      {story(ratios).map((b) => {
        const first = images[b.items[0]];
        if (b.kind === "full") return <div key={first.id} className="g-full" style={r(b.items[0])}>{tile(first, b.items[0])}</div>;
        if (b.kind === "row") {
          const sum = b.items.reduce((s, i) => s + ratios[i], 0);
          return (
            <div key={first.id} className={cx("g-pair", sum > 2.2 && "wide")} style={{ "--sum": sum, "--n": b.items.length } as CSSProperties}>
              {b.items.map((i) => <div key={images[i].id} className="g-fig" style={r(i)}>{tile(images[i], i)}</div>)}
            </div>
          );
        }
        return (
          <div key={first.id} className="g-aside" data-side={b.side}>
            <div className="g-fig" style={r(b.items[0])}>{tile(first, b.items[0])}</div>
            <p className="g-note">
              <span className="g-num">{pad(numberOf.get(first.id) || 0)}</span>
              <span className="g-of">/ {pad(total)}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** A contact sheet: every photo whole, centred in a square, with its number and name. */
function SheetLayout({ images, ratios, tile, numberOf, favs, favNames, counts, onToggle, t }: {
  images: GalleryImage[]; ratios: number[]; tile: TileFn; numberOf: Map<string, number>; favs: Set<string>;
  favNames?: Record<string, string[]>;
  /** Hearts to count in the heart itself (a guest's view). */
  counts?: Record<string, number>;
  onToggle?: (g: GalleryImage) => void; t: T;
}) {
  return (
    <ul className="g-sheet">
      {images.map((g, i) => (
        <li key={g.id} className="g-slot">
          <div className="g-frame"><div className="g-fit" style={{ "--r": ratios[i] } as CSSProperties}>{tile(g, i, { heart: false })}</div></div>
          <div className="g-cap">
            <span className="g-num">{String(numberOf.get(g.id) || i + 1).padStart(3, "0")}</span>
            <span className="g-file">{g.fileName}</span>
            <HeartButton on={favs.has(g.id)} by={favNames?.[g.id]} count={counts?.[g.id]} onToggle={onToggle && (() => onToggle(g))} t={t} inline />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// One photo
// ---------------------------------------------------------------------------

/** Photos already shown once this visit appear without fading in again. */
const seen = new Set<string>();

function Tile({ img, label, alt, fav, favBy, count, countAs, onOpen, onToggle, onSize, eager, heart = true, t }: {
  img: GalleryImage; label: string; alt: string; fav: boolean; favBy?: string[]; count: number; countAs: CountAs; onOpen: () => void; onToggle?: () => void;
  onSize: (w: number, h: number) => void; eager?: boolean; heart?: boolean; t: T;
}) {
  const video = isVideo(img.fileName || img.url);
  const [loaded, setLoaded] = useState(() => seen.has(img.url));
  const done = (el: HTMLImageElement) => {
    seen.add(img.url);
    setLoaded(true);
    onSize(el.naturalWidth, el.naturalHeight);
  };
  return (
    <figure className={cx("g-tile", fav && "is-fav")}>
      <button type="button" className="g-open" aria-label={label} onClick={onOpen} />
      {video ? (
        <video src={img.url} muted playsInline preload="metadata" onLoadedMetadata={(e) => onSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
      ) : (
        <img
          ref={(el) => { if (el && !loaded && el.complete && el.naturalWidth) done(el); }}
          src={img.url} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" draggable={false}
          className={loaded ? "in" : undefined} onLoad={(e) => done(e.currentTarget)}
        />
      )}
      {video && <span className="g-play" aria-hidden="true"><Play fill="currentColor" /></span>}
      {heart && <HeartButton on={fav} by={favBy} count={countAs === "heart" ? count : 0} onToggle={onToggle} t={t} />}
      {countAs === "badge" && count > 0 && (
        <span className="g-group" title={t.groupLikes(count)}>
          <Users aria-hidden="true" /><span aria-hidden="true">{count}</span><span className="s-sr">{t.groupLikes(count)}</span>
        </span>
      )}
    </figure>
  );
}

/** The heart: someone's own pick. On the group page it also carries how many hearts the photo has. */
function HeartButton({ on, by, count = 0, onToggle, t, inline }: { on: boolean; by?: string[]; count?: number; onToggle?: () => void; t: T; inline?: boolean }) {
  const cls = cx("g-heart", inline && "inline", on && "on", count > 0 && "counted");
  const n = count > 0 ? <span className="g-heart-n">{count}</span> : null;
  if (!onToggle) {
    if (!on && !n) return null;
    return (
      <span className={cls} title={by?.length ? t.favoriteOf(by.join(", ")) : n ? t.favoriteWithCount(count) : t.favorite}>
        <Heart fill={on ? "currentColor" : "none"} />{n}
      </span>
    );
  }
  return (
    <button type="button" className={cls} aria-pressed={on} aria-label={n ? t.favoriteWithCount(count) : t.favorite} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      <Heart fill={on ? "currentColor" : "none"} />{n}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({ list, start, total, numberOf, favs, favNames, counts, countAs, onToggle, onDownload, onShare, protect, onClose, t }: {
  list: GalleryImage[]; start: number; total: number; numberOf: Map<string, number>; favs: Set<string>; favNames?: Record<string, string[]>;
  counts?: Record<string, number>; countAs: CountAs;
  onToggle?: (g: GalleryImage) => void; onDownload?: (g: GalleryImage) => void; onShare?: (g: GalleryImage) => void;
  protect: boolean; onClose: () => void; t: T;
}) {
  const [index, setIndex] = useState(start);
  const img = list[index];
  const go = useCallback((d: number) => setIndex((i) => (i + d + list.length) % list.length), [list.length]);
  const box = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  // Focus moves in, stays in, Escape closes, and focus returns to the photo.
  useModalFocus(box, onClose, closeButton);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (onToggle && e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) onToggle(img);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, img, onToggle]);

  // The neighbours load while this one is looked at.
  useEffect(() => {
    for (const d of [1, -1]) {
      const n = list[(index + d + list.length) % list.length];
      if (n && !isVideo(n.fileName || n.url)) new Image().src = n.url;
    }
  }, [index, list]);

  if (!img) return null;
  const n = numberOf.get(img.id) || index + 1;
  const fav = favs.has(img.id);
  const by = favNames?.[img.id];
  const hearts = counts?.[img.id] || 0;
  return (
    <div ref={box} className="g-lightbox" role="dialog" aria-modal="true" aria-label={t.photoOf(n, total)}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}>
      <div className="g-lb-bar">
        <div className="g-lb-where">
          <span className="g-lb-count">{pad(n)}<i> / {pad(total)}</i></span>
          <span className="g-lb-name">{img.fileName}</span>
        </div>
        <div className="g-lb-actions">
          {onToggle ? (
            <button type="button" className={cx("g-btn", fav && "on")} aria-pressed={fav} onClick={() => onToggle(img)}>
              <Heart fill={fav ? "currentColor" : "none"} /><span className="g-btn-label">{fav ? t.favorite : t.makeFavorite}</span>
              {countAs === "heart" && hearts > 0 && <span className="g-btn-n">{hearts}</span>}
            </button>
          ) : fav ? <span className="g-lb-fav"><Heart fill="currentColor" />{by?.length ? t.favoriteOf(by.join(", ")) : t.favorite}</span>
            : countAs === "heart" && hearts > 0 && <span className="g-lb-fav"><Heart />{t.favoriteWithCount(hearts)}</span>}
          {onShare && (
            <button type="button" className="g-btn" onClick={() => onShare(img)} aria-label={t.sharePhoto}><Share2 /><span className="g-btn-label">{t.share}</span></button>
          )}
          {onDownload && img.download !== false && (
            <button type="button" className="g-btn" onClick={() => onDownload(img)} aria-label={t.download}><Download /><span className="g-btn-label">{t.download}</span></button>
          )}
          <button ref={closeButton} type="button" className="g-btn icon" onClick={onClose} aria-label={t.close}><X /></button>
        </div>
      </div>
      <div className="g-lb-stage" onContextMenu={protect ? (e) => e.preventDefault() : undefined}>
        {isVideo(img.fileName || img.url)
          ? <video key={img.id} src={img.url} controls autoPlay playsInline />
          : <img key={img.id} src={img.url} alt={t.photoOf(n, total)} draggable={!protect} />}
        {list.length > 1 && (
          <>
            <button type="button" className="g-lb-nav prev" onClick={() => go(-1)} aria-label={t.previous}><ChevronLeft /></button>
            <button type="button" className="g-lb-nav next" onClick={() => go(1)} aria-label={t.next}><ChevronRight /></button>
          </>
        )}
      </div>
      <p className="g-lb-foot">
        {countAs === "badge" && hearts > 0 && <span className="g-lb-group"><Users aria-hidden="true" />{t.groupLikes(hearts)}</span>}
        <span>{onToggle ? t.lightboxHint : `${index + 1} / ${list.length}`}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Shapes measured in the browser, for photos the server has no size for yet. Kept for the visit. */
const measured = new Map<string, number>();

function useRatios() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const queued = useRef(false);
  const ratioOf = useCallback((g: GalleryImage) => {
    const m = measured.get(g.id);
    if (m) return m;
    if (g.w && g.h) return g.w / g.h;
    return isVideo(g.fileName || g.url) ? 16 / 9 : DEFAULT_RATIO;
  }, []);
  const report = useCallback((g: GalleryImage, w: number, h: number) => {
    if (!w || !h) return;
    const r = w / h;
    const known = measured.get(g.id) ?? (g.w && g.h ? g.w / g.h : 0);
    if (Math.abs(known - r) < 0.01) return;
    measured.set(g.id, r);
    // Many photos load at once; lay out again once per frame, not per photo.
    if (queued.current) return;
    queued.current = true;
    requestAnimationFrame(() => {
      queued.current = false;
      rerender();
    });
  }, []);
  return { ratioOf, report };
}

function useWidth<E extends HTMLElement>() {
  const ref = useRef<E>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The portal header stays on top; the gallery's bar sticks right under it. */
function useStickyTop() {
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const head = document.querySelector<HTMLElement>(".p-top");
    if (!head) return;
    const update = () => setTop(Math.round(head.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
  return top;
}
