import type { MouseEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { HIGH_PRIORITY } from "../lib/images";
import { scrollBehavior } from "../lib/scroll";

// The top of every service page (photography and its categories, video,
// website, social media): a photo over the whole first screen, with the way
// back, the title, one line and the buttons at the bottom left. The look lives
// in src/styles/site.css (.pdc-svc-hero*), so the prerendered HTML is right
// on every screen before any script runs.

export interface HeroImage {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  alt: string;
  /** object-position, which keeps the subject in view at every width. */
  position: string;
}

/** A button to a part of the same page, by its id. */
export interface HeroAction {
  target: string;
  label: string;
}

export function ServiceHero({
  back,
  title,
  titleDim,
  subtitle,
  image,
  actions,
}: {
  back: { to: string; label: string };
  title: string;
  titleDim: string;
  subtitle: string;
  /** null while the page still waits to know which photo leads. */
  image: HeroImage | null;
  /** The first one is the solid button. */
  actions: HeroAction[];
}) {
  // Scroll to the part and hand it the focus, so the keyboard carries on there.
  const go = (target: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(target);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };

  return (
    <section className="pdc-svc-hero" aria-labelledby="svc-hero-title">
      <div className="pdc-svc-hero-media">
        {image && (
          <img
            key={image.src}
            src={image.src}
            srcSet={image.srcSet}
            sizes={image.srcSet ? "100vw" : undefined}
            width={image.width}
            height={image.height}
            {...HIGH_PRIORITY}
            alt={image.alt}
            style={{ objectPosition: image.position }}
          />
        )}
      </div>
      <div className="pdc-svc-hero-inner">
        <div className="pdc-svc-hero-copy">
          <Link to={back.to} className="pdc-back-link pdc-svc-hero-back">
            <ArrowLeft size={14} aria-hidden="true" />
            {back.label}
          </Link>
          <h1 id="svc-hero-title" className="pdc-svc-hero-title">
            {title} <em>{titleDim}</em>
          </h1>
          <p className="pdc-svc-hero-sub">{subtitle}</p>
          <div className="pdc-svc-hero-actions">
            {actions.map((action, i) => (
              <a
                key={action.target}
                href={`#${action.target}`}
                onClick={go(action.target)}
                className={`pdc-btn ${i === 0 ? "pdc-btn-solid" : "pdc-btn-outline"} pdc-svc-hero-cta`}
              >
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
