import image__MAJ2869_1_ from "@/assets/web/hero-frame-800.webp";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Link } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { useSiteSettings } from "../lib/siteData";
import { HIGH_PRIORITY } from "../lib/images";

const DEFAULT_HERO_BG =
  "https://images.unsplash.com/photo-1613158556069-e7d8eae76214?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2luZW1hdGljJTIwZXNwcmVzc28lMjBjb2ZmZWUlMjBzdHVkaW8lMjBtb29keXxlbnwxfHx8fDE3NzY1OTY2NTB8MA&ixlib=rb-4.1.0&q=80&w=1080";

// Phone and desktop layouts live in src/styles/site.css (.pdc-hero-*), so the
// prerendered HTML is already right for either screen before any script runs.

export function Hero() {
  const { t } = useLanguage();
  const { data: settings } = useSiteSettings();

  const heroImageUrl = settings?.heroImageUrl || DEFAULT_HERO_BG;
  const heroImageMobileUrl = settings?.heroImageMobileUrl || heroImageUrl;
  const frameImageUrl = settings?.frameImageUrl || image__MAJ2869_1_;

  return (
    <section
      id="hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        backgroundColor: "#0d0703",
      }}
    >
      {/* Background Image */}
      <div className="pdc-hero-bg" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <picture>
          <source media="(max-width: 767px)" srcSet={heroImageMobileUrl} />
          <img
            src={heroImageUrl}
            alt=""
            {...HIGH_PRIORITY}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        </picture>
        <div className="pdc-hero-shade" style={{ position: "absolute", inset: 0 }} />
      </div>

      {/* Grain texture overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.4, pointerEvents: "none",
      }} />

      {/* Phone: the frame photo fills the top of the hero */}
      <div className="pdc-hero-phone-photo" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55vh", zIndex: 1, overflow: "hidden" }}>
        <ImageWithFallback
          src={frameImageUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(8,4,1,0.15) 0%, rgba(8,4,1,0) 30%, rgba(8,4,1,0.85) 80%, rgba(8,4,1,1) 100%)"
        }} />
      </div>

      {/* Content */}
      <div className="pdc-hero-content" style={{
        position: "relative", zIndex: 2,
        maxWidth: "1400px", margin: "0 auto",
        height: "100vh",
        display: "flex", flexDirection: "column",
      }}>

        {/* Desktop: text and film frame side by side */}
        <div className="pdc-hero-grid">
          {/* Left — Text */}
          <div style={{ maxWidth: "680px" }}>
            {/* Label */}
            <div className="pdc-hero-label" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "32px", height: "1px", backgroundColor: "rgba(255,251,224,0.35)" }} />
              <span style={{
                color: "rgba(255,251,224,0.4)", fontSize: "10px", fontWeight: 500,
                letterSpacing: "0.3em", textTransform: "uppercase",
              }}>{t.hero.label}</span>
            </div>

            {/* Headline */}
            <h1 className="pdc-hero-title" style={{
              color: "#fffbe0",
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
            }}>
              {t.hero.headline1}
              <br />
              <span style={{ color: "rgba(255,251,224,0.55)" }}>{t.hero.headline2}</span>
              <br />
              {t.hero.headline3}
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 300, color: "#c8905a", letterSpacing: "-0.01em" }}>
                {t.hero.headline4}
              </em>
            </h1>

            {/* Tagline */}
            <p className="pdc-hero-tagline" style={{
              fontSize: "clamp(13px, 1.5vw, 18px)",
              fontWeight: 300, lineHeight: 1.75, letterSpacing: "0.02em",
              maxWidth: "440px",
            }}>
              {t.hero.tagline}
              <br />
              {t.hero.subtagline}
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link
                to="/portfolio"
                className="pdc-btn pdc-btn-solid pdc-hero-cta"
                style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em" }}
              >
                {t.hero.viewPortfolio}
              </Link>
              <Link
                to="/#contact"
                className="pdc-btn pdc-btn-outline pdc-hero-cta"
                style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em" }}
              >
                {t.hero.bookShoot}
              </Link>
            </div>
          </div>

          {/* Right — Film Frame — desktop only (phones show the photo above) */}
          <div className="pdc-hero-frame" style={{
            position: "relative",
            flexShrink: 0,
            justifyContent: "center",
          }}>
            <div style={{
              position: "relative", border: "1px solid rgba(255,251,224,0.15)",
              padding: "8px", boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px", paddingLeft: "4px", paddingRight: "4px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: "6px", backgroundColor: "rgba(255,251,224,0.12)", border: "1px solid rgba(255,251,224,0.06)" }} />
                ))}
              </div>
              <ImageWithFallback
                src={frameImageUrl}
                alt={t.hero.frameAlt}
                loading="lazy"
                style={{
                  width: "360px",
                  height: "480px",
                  objectFit: "cover",
                  display: "block",
                  filter: "contrast(1.05) saturate(0.85)",
                }}
              />
              <div style={{ display: "flex", gap: "4px", marginTop: "6px", paddingLeft: "4px", paddingRight: "4px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: "6px", backgroundColor: "rgba(255,251,224,0.12)", border: "1px solid rgba(255,251,224,0.06)" }} />
                ))}
              </div>
              <div aria-hidden="true" style={{ position: "absolute", bottom: "22px", left: "16px", right: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "8px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>PDC — 2026</span>
                <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "8px", fontFamily: "'Courier New', monospace", letterSpacing: "0.15em" }}>35mm / ƒ1.4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
