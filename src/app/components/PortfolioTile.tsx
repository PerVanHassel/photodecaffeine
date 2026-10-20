import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { webSrcSet } from "../lib/images";
import type { PortfolioArticle } from "../lib/siteData";

// One portfolio article as a link: the photo, with its category and title on
// top. The caption shows on hover and keyboard focus, and stays visible on
// touch screens, which have no hover (src/styles/site.css, .pdc-tile-*).
//
// `sizes` is how wide the tile shows, so the browser can take the 1280 px copy
// where that is enough. Most tiles are a third of the page on a computer.

export function PortfolioTile({ item, layout, sizes = "(max-width: 767px) 100vw, 34vw" }: {
  item: PortfolioArticle;
  layout: "fill" | "masonry";
  sizes?: string;
}) {
  return (
    <Link to={`/portfolio/${item.id}`} className={`pdc-tile pdc-tile--${layout}`}>
      {item.coverType === "video" ? (
        <CoverVideo src={item.coverUrl} />
      ) : (
        // The link's text names the article, so the photo itself is decorative here.
        <ImageWithFallback src={item.coverUrl} srcSet={webSrcSet(item.coverUrl)} sizes={sizes} alt="" loading="lazy" decoding="async" />
      )}
      <span className="pdc-tile-caption">
        <span className="pdc-tile-category">{item.category}</span>
        <span className="pdc-tile-title">{item.title}</span>
        <span className="pdc-tile-rule" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** A looping cover clip that stays still for visitors who ask for less motion. */
export function CoverVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.pause();
    video.removeAttribute("autoplay");
  }, []);
  return <video ref={ref} src={src} autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />;
}
