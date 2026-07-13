import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useMobile } from "../hooks/useMobile";

type PortfolioArticle = {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export function PortfolioDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isMobile = useMobile();
  const [article, setArticle] = useState<PortfolioArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (id) fetchArticle(id);
  }, [id]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    if (article && lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % article.galleryUrls.length);
    }
  }, [article, lightboxIndex]);

  const goPrev = useCallback(() => {
    if (article && lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + article.galleryUrls.length) % article.galleryUrls.length);
    }
  }, [article, lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  async function fetchArticle(articleId: string) {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/portfolio/${articleId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await res.json();
      setArticle(data.article);
    } catch (err) {
      console.error("Failed to fetch article:", err);
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#080401",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "72px",
        }}
      >
        <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "12px", letterSpacing: "0.2em" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div
        style={{
          backgroundColor: "#080401",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "72px",
          gap: "24px",
        }}
      >
        <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "14px", letterSpacing: "0.2em" }}>
          Article not found
        </div>
        <button
          onClick={() => navigate("/portfolio")}
          style={{
            backgroundColor: "transparent",
            color: "rgba(255,251,224,0.6)",
            border: "1px solid rgba(255,251,224,0.15)",
            padding: "12px 32px",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)";
            e.currentTarget.style.color = "#fffbe0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)";
            e.currentTarget.style.color = "rgba(255,251,224,0.6)";
          }}
        >
          Back to Portfolio
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#080401",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "72px",
      }}
    >
      <div
        style={{
          backgroundColor: "#0d0703",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          padding: "80px 40px 64px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <button
            onClick={() => navigate("/portfolio")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.35)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
              marginBottom: "40px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.35)")}
          >
            <ArrowLeft size={14} />
            Back to Portfolio
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "32px",
            }}
          >
            <div>
              <span
                style={{
                  color: "rgba(200,144,90,0.5)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "16px",
                }}
              >
                {article.category}
              </span>
              <h1
                style={{
                  color: "#fffbe0",
                  fontSize: "clamp(40px, 6vw, 72px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {article.title}
              </h1>
            </div>
          </div>

          {article.description && (
            <p
              style={{
                color: "rgba(255,251,224,0.45)",
                fontSize: "15px",
                fontWeight: 300,
                lineHeight: 1.8,
                marginTop: "32px",
                maxWidth: "700px",
              }}
            >
              {article.description}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "80px 40px 120px",
        }}
      >
        {article.galleryUrls.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "rgba(255,251,224,0.2)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            No images in this gallery yet.
          </div>
        ) : (
          <div
            style={{
              columns: isMobile ? 1 : 3,
              columnGap: "3px",
            }}
          >
            {article.galleryUrls.map((url, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  breakInside: "avoid",
                  marginBottom: "3px",
                }}
                onClick={() => setLightboxIndex(idx)}
              >
                <ImageWithFallback
                  src={url}
                  alt={`${article.title} ${idx + 1}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    filter: "contrast(1.05) saturate(0.75)",
                    transition: "transform 0.4s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLImageElement).style.transform = "scale(1.03)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLImageElement).style.transform = "scale(1)";
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "80px",
            textAlign: "center",
          }}
        >
          <button
            onClick={() => navigate("/", { state: { scrollTo: "contact" } })}
            style={{
              backgroundColor: "#fffbe0",
              color: "#1a0c04",
              border: "none",
              padding: "16px 48px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#c8905a";
              e.currentTarget.style.color = "#fffbe0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fffbe0";
              e.currentTarget.style.color = "#1a0c04";
            }}
          >
            WORK WITH US
          </button>
        </div>
      </div>

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${lightboxIndex + 1} of ${article.galleryUrls.length}`}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(8, 4, 1, 0.98)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
          }}
          onClick={closeLightbox}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) dx < 0 ? goNext() : goPrev();
            touchStartX.current = null;
          }}
        >
          <button
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              background: "rgba(255,251,224,0.1)",
              border: "1px solid rgba(255,251,224,0.2)",
              color: "#fffbe0",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.1)";
            }}
          >
            <X size={24} />
          </button>

          {isMobile ? (
            <div
              style={{
                position: "absolute",
                bottom: "64px",
                display: "flex",
                gap: "16px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label="Previous image"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                style={{
                  background: "rgba(255,251,224,0.1)",
                  border: "1px solid rgba(255,251,224,0.2)",
                  color: "#fffbe0",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                aria-label="Next image"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                style={{
                  background: "rgba(255,251,224,0.1)",
                  border: "1px solid rgba(255,251,224,0.2)",
                  color: "#fffbe0",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          ) : (
            <>
              <button
                aria-label="Previous image"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                style={{
                  position: "absolute",
                  left: "24px",
                  background: "rgba(255,251,224,0.1)",
                  border: "1px solid rgba(255,251,224,0.2)",
                  color: "#fffbe0",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.1)"; }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                aria-label="Next image"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                style={{
                  position: "absolute",
                  right: "24px",
                  background: "rgba(255,251,224,0.1)",
                  border: "1px solid rgba(255,251,224,0.2)",
                  color: "#fffbe0",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.1)"; }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <img
            src={article.galleryUrls[lightboxIndex]}
            alt={`${article.title} ${lightboxIndex + 1}`}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              position: "absolute",
              bottom: "24px",
              color: "rgba(255,251,224,0.4)",
              fontSize: "11px",
              letterSpacing: "0.2em",
            }}
          >
            {lightboxIndex + 1} / {article.galleryUrls.length}
          </div>
        </div>
      )}
    </div>
  );
}
