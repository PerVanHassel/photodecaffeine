import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import type { PortfolioArticle } from "../lib/siteData";

// One portfolio article as a link: the photo, with its category and title on
// top. The caption shows on hover and keyboard focus, and stays visible on
// touch screens, which have no hover (src/styles/site.css, .pdc-tile-*).

export function PortfolioTile({ item, layout }: { item: PortfolioArticle; layout: "fill" | "masonry" }) {
  return (
    <Link to={`/portfolio/${item.id}`} className={`pdc-tile pdc-tile--${layout}`}>
      {item.coverType === "video" ? (
        <CoverVideo src={item.coverUrl} />
      ) : (
        // The link's text names the article, so the photo itself is decorative here.
        <ImageWithFallback src={item.coverUrl} alt="" loading="lazy" decoding="async" />
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
