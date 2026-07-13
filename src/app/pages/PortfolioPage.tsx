import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
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
  createdAt: string;
  updatedAt: string;
};

function PortfolioCard({ item, onClick }: { item: PortfolioArticle; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        breakInside: "avoid",
        marginBottom: "3px",
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
            height: "auto",
            display: "block",
            transition: "transform 0.6s ease",
            transform: hovered ? "scale(1.04)" : "scale(1)",
          }}
        />
      ) : (
        <ImageWithFallback
          src={item.coverUrl}
          alt={item.title}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
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
          padding: "28px",
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

function SkeletonGrid() {
  const heights = [320, 480, 260, 400, 340, 560, 300, 420, 380];
  return (
    <div className="portfolio-masonry" style={{ columnCount: 3, columnGap: "3px" }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: "100%",
            height: `${h}px`,
            backgroundColor: "rgba(255,251,224,0.04)",
            marginBottom: "3px",
            breakInside: "avoid",
            animation: "pulse 1.6s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [articles, setArticles] = useState<PortfolioArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetchPortfolio();
  }, []);

  async function fetchPortfolio() {
    setError(false);
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/portfolio`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticles((data.articles || []).filter((a: PortfolioArticle) => a.title !== "__automotive_gallery__"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    "All",
    ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort(),
  ];

  const filtered =
    activeCategory === "All"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

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
            onClick={() => navigate("/")}
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
            {t.portfolioPage.backToHome}
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
                  color: "rgba(255,251,224,0.3)",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "16px",
                }}
              >
                {t.portfolioPage.label}
              </span>
              <h1
                style={{
                  color: "#fffbe0",
                  fontSize: "clamp(48px, 7vw, 88px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {t.portfolioPage.titleLine1}
                <br />
                <span style={{ color: "rgba(255,251,224,0.3)" }}>{t.portfolioPage.titleLine2}</span>
              </h1>
            </div>

            <p
              style={{
                color: "rgba(255,251,224,0.35)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                maxWidth: "340px",
                textAlign: "right",
              }}
            >
              {t.portfolioPage.subtitle.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: "72px",
          zIndex: 50,
          backgroundColor: "rgba(8, 4, 1, 0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          padding: "0 40px",
        }}
      >
        <div
          className="hide-scrollbar"
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            gap: "0",
            overflowX: "auto",
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? "2px solid #c8905a" : "2px solid transparent",
                  color: isActive ? "#fffbe0" : "rgba(255,251,224,0.35)",
                  fontSize: "10px",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  padding: "20px 24px",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "rgba(255,251,224,0.7)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "rgba(255,251,224,0.35)";
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "40px 40px 120px",
        }}
      >
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "120px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <span style={{ color: "rgba(255,251,224,0.3)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {t.portfolioPage.loadError}
            </span>
            <button
              onClick={fetchPortfolio}
              style={{
                background: "none",
                border: "1px solid rgba(255,251,224,0.15)",
                color: "rgba(255,251,224,0.55)",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: "12px 28px",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)"; e.currentTarget.style.color = "#fffbe0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)"; e.currentTarget.style.color = "rgba(255,251,224,0.55)"; }}
            >
              {t.portfolioPage.retry}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "120px 0",
              color: "rgba(255,251,224,0.2)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {t.portfolioPage.noWork}
          </div>
        ) : (
          <div
            className="portfolio-masonry"
            style={{
              columnCount: 3,
              columnGap: "3px",
            }}
          >
            <style>{`
              .portfolio-masonry {
                column-count: 3;
                column-gap: 3px;
              }
              @media (max-width: 768px) {
                .portfolio-masonry {
                  column-count: 1 !important;
                }
              }
              @media (min-width: 769px) and (max-width: 1024px) {
                .portfolio-masonry {
                  column-count: 2 !important;
                }
              }
            `}</style>

            {filtered.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/portfolio/${item.id}`)}
              />
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "64px",
            borderTop: "1px solid rgba(255,251,224,0.06)",
            paddingTop: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {activeCategory !== "All" && (
            <span
              style={{
                color: "rgba(255,251,224,0.2)",
                fontSize: "10px",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {t.portfolioPage.showingOf(filtered.length, articles.length)}
            </span>
          )}
          <button
            onClick={() => navigate("/", { state: { scrollTo: "contact" } })}
            style={{
              backgroundColor: "transparent",
              color: "#fffbe0",
              border: "1px solid rgba(255,251,224,0.2)",
              padding: "14px 36px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fffbe0";
              e.currentTarget.style.color = "#1a0c04";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#fffbe0";
            }}
          >
            {t.portfolioPage.bookShoot}
          </button>
        </div>
      </div>
    </div>
  );
}
