import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Images, X } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

const DEFAULT_ACCENT = "#c8905a";

export interface GalleryViewProps {
  /** Gallery headline. Falls back to the project title when no custom gallery title is set. */
  title: string;
  /** Optional short tagline shown under the title in the hero. */
  subtitle?: string;
  /** Hero background image. Falls back to the first photo when unset. */
  coverUrl?: string;
  /** Per-client accent color (hex). Defaults to the studio's brand gold. */
  accentColor?: string;
  /** Ordered list of photo URLs that make up the gallery. */
  photoUrls: string[];
  /** Where the back button navigates to. */
  backHref: string;
  /** Label shown next to the back button. */
  backLabel: string;
  /** Optional small badge in the hero corner, e.g. "Preview Mode" for the admin view. */
  badge?: string;
}

/**
 * Full-bleed, immersive client gallery: a hero with the cover photo and gallery
 * identity, a masonry grid of photos, and a full-screen lightbox for viewing
 * each photo individually. Purely presentational — callers fetch the data.
 */
export function GalleryView({
  title,
  subtitle,
  coverUrl,
  accentColor,
  photoUrls,
  backHref,
  backLabel,
  badge,
}: GalleryViewProps) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const accent = accentColor || DEFAULT_ACCENT;
  const hero = coverUrl || photoUrls[0];

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const goPrev = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i - 1 + photoUrls.length) % photoUrls.length)),
    [photoUrls.length]
  );
  const goNext = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i + 1) % photoUrls.length)),
    [photoUrls.length]
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIdx, closeLightbox, goPrev, goNext]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#080401" }}>
      {/* Hero */}
      <div
        style={{
          position: "relative",
          minHeight: isMobile ? "48vh" : "62vh",
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
          backgroundColor: "#0d0703",
        }}
      >
        {hero && (
          <img
            src={hero}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,4,1,0.35) 0%, rgba(8,4,1,0.55) 55%, rgba(8,4,1,0.96) 100%)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(backHref)}
          style={{
            position: "absolute",
            top: isMobile ? "16px" : "28px",
            left: isMobile ? "16px" : "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(8,4,1,0.5)",
            border: "1px solid rgba(255,251,224,0.15)",
            color: "rgba(255,251,224,0.75)",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif",
            padding: "9px 14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fffbe0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.75)")}
        >
          <ArrowLeft size={12} />
          {backLabel}
        </button>

        {badge && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? "16px" : "28px",
              right: isMobile ? "16px" : "40px",
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              color: accent,
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              padding: "8px 14px",
            }}
          >
            {badge}
          </div>
        )}

        {/* Title block */}
        <div
          style={{
            position: "relative",
            padding: isMobile ? "0 20px 32px" : "0 40px 56px",
            maxWidth: "1100px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: accent,
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            <Images size={12} />
            Photo Gallery
          </div>
          <h1
            style={{
              color: "#fffbe0",
              fontSize: isMobile ? "clamp(28px, 9vw, 44px)" : "clamp(36px, 5vw, 68px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 0.98,
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: "rgba(255,251,224,0.55)",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: isMobile ? "13px" : "16px",
                lineHeight: 1.6,
                margin: "0 0 14px",
                maxWidth: "560px",
              }}
            >
              {subtitle}
            </p>
          )}
          <span
            style={{
              color: "rgba(255,251,224,0.3)",
              fontSize: "11px",
              letterSpacing: "0.1em",
            }}
          >
            {photoUrls.length} {photoUrls.length === 1 ? "photo" : "photos"}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: isMobile ? "28px 16px 60px" : "48px 40px 90px", maxWidth: "1600px", margin: "0 auto" }}>
        {photoUrls.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "rgba(255,251,224,0.2)",
              fontSize: "13px",
            }}
          >
            No photos have been added to this gallery yet.
          </div>
        ) : (
          <div
            style={{
              columnCount: isMobile ? 2 : photoUrls.length < 3 ? photoUrls.length : 3,
              columnGap: isMobile ? "8px" : "14px",
            }}
          >
            {photoUrls.map((url, i) => (
              <div
                key={url + i}
                onClick={() => setLightboxIdx(i)}
                style={{
                  breakInside: "avoid",
                  marginBottom: isMobile ? "8px" : "14px",
                  cursor: "pointer",
                  overflow: "hidden",
                  border: "1px solid rgba(255,251,224,0.05)",
                  position: "relative",
                }}
              >
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    display: "block",
                    transition: "transform 0.4s ease, filter 0.4s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = "scale(1.035)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photoUrls.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5,2,0,0.98)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "20px" : "40px",
          }}
          onClick={closeLightbox}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) (dx < 0 ? goNext() : goPrev());
            touchStartX.current = null;
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "rgba(255,251,224,0.1)",
              border: "1px solid rgba(255,251,224,0.2)",
              color: "#fffbe0",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
          {!isMobile && photoUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                style={{
                  position: "absolute",
                  left: "20px",
                  background: "rgba(255,251,224,0.1)",
                  border: `1px solid ${accent}55`,
                  color: "#fffbe0",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${accent}33`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,251,224,0.1)")}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                style={{
                  position: "absolute",
                  right: "20px",
                  background: "rgba(255,251,224,0.1)",
                  border: `1px solid ${accent}55`,
                  color: "#fffbe0",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${accent}33`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,251,224,0.1)")}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <img
            src={photoUrls[lightboxIdx]}
            alt={`Photo ${lightboxIdx + 1}`}
            style={{ maxWidth: "90%", maxHeight: "84%", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >
            <span style={{ color: "rgba(255,251,224,0.4)", fontSize: "11px", letterSpacing: "0.2em" }}>
              {lightboxIdx + 1} / {photoUrls.length}
            </span>
            <a
              href={photoUrls[lightboxIdx]}
              download={`photo-${lightboxIdx + 1}.jpg`}
              onClick={(e) => e.stopPropagation()}
              style={{
                color: accent,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textDecoration: "none",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Download size={11} /> Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
