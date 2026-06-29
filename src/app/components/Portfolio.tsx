import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import { projectId, publicAnonKey } from "/utils/supabase/info";

type PortfolioArticle = {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

function PortfolioItem({ item, onClick }: { item: PortfolioArticle; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        height: "100%",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {item.coverType === "video" ? (
        <video
          src={item.coverUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.05) saturate(0.75)",
            transition: "transform 0.6s ease, filter 0.4s ease",
            transform: hovered ? "scale(1.04)" : "scale(1)",
          }}
        />
      ) : (
        <ImageWithFallback
          src={item.coverUrl}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.6s ease",
            transform: hovered ? "scale(1.04)" : "scale(1)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(10, 5, 1, 0.78)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "28px 28px",
          transition: "opacity 0.35s ease",
          opacity: hovered ? 1 : 0,
        }}
      >
        <span
          style={{
            color: "rgba(255,251,224,0.4)",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontFamily: "'Courier New', monospace",
            marginBottom: "8px",
            display: "block",
          }}
        >
          {item.category}
        </span>
        <span
          style={{
            color: "#fffbe0",
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily: "'Courier New', monospace",
            display: "block",
          }}
        >
          {item.title}
        </span>
        <div
          style={{
            marginTop: "16px",
            width: "32px",
            height: "1px",
            backgroundColor: "#c8905a",
          }}
        />
      </div>
    </div>
  );
}

export function Portfolio() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [articles, setArticles] = useState<PortfolioArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  async function fetchPortfolio() {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/portfolio`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
    }
  }

  const featuredArticles = articles.filter(a => a.featured);
  const displayItems = featuredArticles.slice(0, 6);

  if (loading) {
    return (
      <section
        id="portfolio"
        style={{
          backgroundColor: "#080401",
          padding: "120px 0",
          fontFamily: "'Inter', sans-serif",
          minHeight: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "12px", letterSpacing: "0.2em" }}>
          Loading portfolio...
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section
        id="portfolio"
        style={{
          backgroundColor: "#080401",
          padding: "120px 0",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 40px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: "rgba(255,251,224,0.2)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            No portfolio work available yet
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      id="portfolio"
      style={{
        backgroundColor: "#080401",
        padding: "120px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "56px",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div>
            <span
              style={{
                color: "rgba(255,251,224,0.3)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "16px",
              }}
            >
              {t.portfolio.label}
            </span>
            <h2
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
              PDC <br />
              <span style={{ color: "rgba(255,251,224,0.35)" }}>{t.portfolio.titleLine2}</span>
            </h2>
          </div>
          <p
            style={{
              color: "rgba(255,251,224,0.35)",
              fontSize: "12px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: 0,
              textAlign: "right",
            }}
          >
            {t.portfolio.hoverReveal}
          </p>
        </div>

        <div
          className="portfolio-grid-main"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "380px 380px",
            gap: "2px",
          }}
        >
          <style>{`
            @media (max-width: 768px) {
              .portfolio-grid-main {
                grid-template-columns: 1fr !important;
                grid-template-rows: auto !important;
                gap: 3px !important;
              }
              .portfolio-grid-main > div {
                grid-column: 1 !important;
                grid-row: auto !important;
                height: 340px !important;
              }
            }
          `}</style>

          <div
            style={{
              gridColumn: "1",
              gridRow: "1 / span 2",
              overflow: "hidden",
            }}
          >
            {displayItems[0] && (
              <PortfolioItem
                item={displayItems[0]}
                onClick={() => navigate(`/portfolio/${displayItems[0].id}`)}
              />
            )}
          </div>

          <div style={{ gridColumn: "2", gridRow: "1", overflow: "hidden" }}>
            {displayItems[1] && (
              <PortfolioItem
                item={displayItems[1]}
                onClick={() => navigate(`/portfolio/${displayItems[1].id}`)}
              />
            )}
          </div>

          <div style={{ gridColumn: "2", gridRow: "2", overflow: "hidden" }}>
            {displayItems[2] && (
              <PortfolioItem
                item={displayItems[2]}
                onClick={() => navigate(`/portfolio/${displayItems[2].id}`)}
              />
            )}
          </div>

          <div
            style={{
              gridColumn: "3",
              gridRow: "1 / span 2",
              overflow: "hidden",
            }}
          >
            {displayItems[3] && (
              <PortfolioItem
                item={displayItems[3]}
                onClick={() => navigate(`/portfolio/${displayItems[3].id}`)}
              />
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2px",
            marginTop: "2px",
          }}
        >
          <div style={{ overflow: "hidden", height: "280px" }}>
            {displayItems[4] && (
              <PortfolioItem
                item={displayItems[4]}
                onClick={() => navigate(`/portfolio/${displayItems[4].id}`)}
              />
            )}
          </div>
          <div style={{ overflow: "hidden", height: "280px" }}>
            {displayItems[5] && (
              <PortfolioItem
                item={displayItems[5]}
                onClick={() => navigate(`/portfolio/${displayItems[5].id}`)}
              />
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "64px" }}>
          <button
            onClick={() => {
              navigate("/portfolio");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              backgroundColor: "transparent",
              color: "rgba(255,251,224,0.6)",
              border: "1px solid rgba(255,251,224,0.15)",
              padding: "16px 48px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.25em",
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
            {t.portfolio.viewFull}
          </button>
        </div>
      </div>
    </section>
  );
}
