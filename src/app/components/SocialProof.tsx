import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Star, ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";
import { portalFetch } from "../../lib/supabase";

interface PublicReview {
  id: string;
  clientName: string;
  rating: number;
  text: string;
  projectTitle: string;
  portfolioArticleId: string | null;
  createdAt: string;
}

export function SocialProof() {
  const { t, language } = useLanguage();
  const isMobile = useMobile();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    // Public endpoint — only reviews an admin has published come back.
    portalFetch("/reviews")
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setReviews([]));
  }, []);

  // Until a review is published there is nothing honest to show, so the
  // section stays out of the page entirely rather than rendering an empty shell.
  if (reviews.length === 0) return null;

  const viewWork = language === "nl" ? "Bekijk het werk" : "View the work";
  // Cards stretch to equal height and bottom-align their footer, so a footer
  // without the "view the work" row starts lower and its divider line breaks
  // the row. Reserve the row on every card as soon as any review is linked.
  const anyLinked = reviews.some((r) => r.portfolioArticleId);

  return (
    <section
      id="reviews"
      style={{
        backgroundColor: "#0d0703",
        padding: isMobile ? "80px 0" : "120px 0",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "inset 0 1px 0 rgba(255,251,224,0.06)",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: isMobile ? "0 20px" : "0 40px" }}>
        {/* Section label */}
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <span
            style={{
              color: "rgba(255,251,224,0.3)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            {t.socialProof.label}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            color: "#fffbe0",
            fontSize: "clamp(36px, 4vw, 56px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            margin: "0 0 72px",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {t.socialProof.testimonialsLabel}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
            gap: isMobile ? "20px" : "28px",
          }}
        >
          {reviews.map((review) => {
            const linked = !!review.portfolioArticleId;
            return (
              <article
                key={review.id}
                onClick={linked ? () => navigate(`/portfolio/${review.portfolioArticleId}`) : undefined}
                style={{
                  border: "1px solid rgba(255,251,224,0.08)",
                  padding: isMobile ? "26px 22px" : "34px 30px",
                  display: "flex",
                  flexDirection: "column",
                  cursor: linked ? "pointer" : "default",
                  transition: "border-color 0.25s ease, background-color 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  if (!linked) return;
                  e.currentTarget.style.borderColor = "rgba(200,144,90,0.35)";
                  e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!linked) return;
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  style={{ display: "flex", gap: "3px", marginBottom: "22px" }}
                  aria-label={`${review.rating}/5`}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={15}
                      color="#c8905a"
                      fill={n <= review.rating ? "#c8905a" : "none"}
                      strokeWidth={2}
                    />
                  ))}
                </div>

                <blockquote
                  style={{
                    color: "rgba(255,251,224,0.72)",
                    fontSize: isMobile ? "15px" : "16px",
                    fontWeight: 300,
                    lineHeight: 1.8,
                    margin: "0 0 26px",
                    flex: 1,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {review.text}
                </blockquote>

                <footer style={{ borderTop: "1px solid rgba(255,251,224,0.07)", paddingTop: "18px" }}>
                  <div style={{ color: "#fffbe0", fontSize: "13px", fontWeight: 600, letterSpacing: "0.02em" }}>
                    {review.clientName}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,251,224,0.3)",
                      fontSize: "11px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginTop: "5px",
                    }}
                  >
                    {review.projectTitle}
                  </div>
                  {anyLinked && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        color: "#c8905a",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        marginTop: "16px",
                        minHeight: "15px",
                      }}
                    >
                      {linked && (
                        <>
                          {viewWork} <ArrowRight size={12} />
                        </>
                      )}
                    </div>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
