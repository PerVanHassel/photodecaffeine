import { Link } from "react-router";
import { Star, ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useReviews } from "../lib/siteData";

export function SocialProof() {
  const { t } = useLanguage();
  // Only reviews an admin has published come back from the public endpoint.
  const reviews = useReviews().data ?? [];

  // Until a review is published there is nothing honest to show, so the
  // section stays out of the page entirely rather than rendering an empty shell.
  if (reviews.length === 0) return null;

  // Cards stretch to equal height and bottom-align their footer, so a footer
  // without the "view the work" row starts lower and its divider line breaks
  // the row. Reserve the row on every card as soon as any review is linked.
  const anyLinked = reviews.some((r) => r.portfolioArticleId);

  return (
    <section
      id="reviews"
      className="pdc-section"
      style={{
        backgroundColor: "#0d0703",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "inset 0 1px 0 rgba(255,251,224,0.06)",
      }}
    >
      <div className="pdc-wrap" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Section label */}
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <span
            style={{
              color: "rgba(255,251,224,0.5)",
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

        <div className="pdc-reviews">
          {reviews.map((review) => {
            const linked = !!review.portfolioArticleId;
            return (
              <article
                key={review.id}
                className="pdc-review"
                style={{
                  // The "view the work" link stretches over the whole card.
                  position: "relative",
                  border: "1px solid rgba(255,251,224,0.08)",
                  display: "flex",
                  flexDirection: "column",
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
                  role="img"
                  aria-label={t.socialProof.rating(review.rating)}
                  style={{ display: "flex", gap: "3px", marginBottom: "22px" }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={15}
                      color="#c8905a"
                      fill={n <= review.rating ? "#c8905a" : "none"}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                <blockquote
                  className="pdc-review-text"
                  style={{
                    color: "rgba(255,251,224,0.72)",
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
                      color: "rgba(255,251,224,0.5)",
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
                        <Link to={`/portfolio/${review.portfolioArticleId}`} className="pdc-stretched-link">
                          {t.socialProof.viewWork} <ArrowRight size={12} aria-hidden="true" />
                        </Link>
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
