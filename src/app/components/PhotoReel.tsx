import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { webSrcSet } from "../lib/images";
import type { FocusPhoto } from "../lib/photoFocus";
import { useReveal } from "../hooks/useReveal";
import { scrollBehavior } from "../lib/scroll";

// Photos as a strip that starts at the content edge and runs off the right of
// the screen, each with a copper number and its series under it, leading to
// the portfolio article. The header follows the other homepage-style sections;
// the strip itself is in site.css (.pdc-reel*).
export function PhotoReel({
  id,
  label,
  titleLine1,
  titleLine2,
  body,
  link,
  photos,
  labels,
}: {
  id: string;
  label: string;
  titleLine1: string;
  titleLine2: string;
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
    el.scrollBy({ left: direction * ((item?.offsetWidth ?? el.clientWidth * 0.8) + 3), behavior: scrollBehavior() });
  };

  return (
    <section ref={root} className="pdc-section pdc-reel" aria-labelledby={id}>
      <div className="pdc-wrap" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "56px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <span
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "16px",
              }}
            >
              {label}
            </span>
            <h2
              id={id}
              style={{
                color: "#fffbe0",
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {titleLine1}
              <br />
              <span style={{ color: "rgba(255,251,224,0.4)" }}>{titleLine2}</span>
            </h2>
          </div>
          <div style={{ maxWidth: "320px" }}>
            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: "0 0 24px",
              }}
            >
              {body}
            </p>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px 24px" }}>
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
                    <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="pdc-reel-arrow"
                    aria-label={labels.next}
                    aria-controls={`${id}-strip`}
                    disabled={edges.end}
                    onClick={() => step(1)}
                  >
                    <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              )}
              <Link to="/portfolio" className="pdc-text-link">
                {link}
              </Link>
            </div>
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
