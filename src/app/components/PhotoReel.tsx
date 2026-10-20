import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { webSrcSet, type FocusPhoto } from "../lib/photoFocus";
import { useReveal } from "../hooks/useReveal";
import { scrollBehavior } from "../lib/scroll";

// Photos as a strip of prints on a light wall, running off the right edge:
// black and white until the pointer finds one, a small caption under each, and
// each leading to its portfolio article. The look is in site.css (.pdc-reel*).
export function PhotoReel({
  id,
  kicker,
  title,
  body,
  link,
  photos,
  labels,
}: {
  id: string;
  kicker: string;
  title: string;
  body: string;
  link: string;
  photos: FocusPhoto[];
  labels: { previous: string; next: string };
}) {
  const root = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  // Which ends of the strip are in view; both means there is nothing to scroll.
  const [edges, setEdges] = useState({ start: true, end: false });
  useReveal(root, null, photos.length);

  const measure = () => {
    const el = strip.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
  };

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame.current);
    };
  }, [photos.length]);

  const step = (direction: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>(".pdc-reel-item");
    el.scrollBy({ left: direction * (item?.offsetWidth ?? el.clientWidth * 0.8), behavior: scrollBehavior() });
  };

  return (
    <section ref={root} className="pdc-paper pdc-reel" aria-labelledby={id}>
      <div className="pdc-reel-head">
        <div>
          <span className="pdc-kicker">{kicker}</span>
          <h2 id={id} className="pdc-reel-title">
            {title}
          </h2>
        </div>
        <div className="pdc-reel-aside">
          <p>{body}</p>
          <div className="pdc-reel-tools">
            {!(edges.start && edges.end) && (
              <div className="pdc-reel-arrows">
                <button
                  type="button"
                  className="pdc-reel-arrow"
                  aria-label={labels.previous}
                  aria-controls={`${id}-strip`}
                  disabled={edges.start}
                  onClick={() => step(-1)}
                >
                  <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="pdc-reel-arrow"
                  aria-label={labels.next}
                  aria-controls={`${id}-strip`}
                  disabled={edges.end}
                  onClick={() => step(1)}
                >
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            )}
            <Link to="/portfolio" className="pdc-text-link">
              {link}
            </Link>
          </div>
        </div>
      </div>

      <div
        id={`${id}-strip`}
        ref={strip}
        className="pdc-reel-strip"
        onScroll={() => {
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(measure);
        }}
      >
        {photos.map((photo, i) => (
          <Link
            key={photo.url}
            to={`/portfolio/${photo.article.id}`}
            className="pdc-reel-item"
            style={{ "--i": i } as CSSProperties}
          >
            <span className="pdc-reel-frame">
              <img
                src={photo.url}
                srcSet={webSrcSet(photo.url)}
                sizes="(max-width: 767px) 76vw, 22vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="pdc-reel-caption">
              <span className="pdc-reel-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="pdc-reel-name">{photo.article.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
