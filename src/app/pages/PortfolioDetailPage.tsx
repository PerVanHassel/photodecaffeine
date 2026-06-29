import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [article, setArticle] = useState<PortfolioArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (id) fetchArticle(id);
  }, [id]);

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

  function nextImage() {
    if (article && lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % article.galleryUrls.length);
    }
  }

  function prevImage() {
    if (article && lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + article.galleryUrls.length) % article.galleryUrls.length);
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: "3px",
          }}
        >
          {article.galleryUrls.map((url, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                aspectRatio: "4/3",
              }}
              onClick={() => setLightboxIndex(idx)}
            >
              <ImageWithFallback
                src={url}
                alt={`${article.title} ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
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

        <div
          style={{
            marginTop: "80px",
            textAlign: "center",
          }}
        >
          <button
            onClick={() => {
              navigate("/");
              setTimeout(() => {
                const el = document.getElementById("contact");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 300);
            }}
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
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.1)";
            }}
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.1)";
            }}
          >
            <ChevronRight size={24} />
          </button>

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
