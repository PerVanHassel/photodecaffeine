import { Link } from "react-router";
import { useLanguage } from "../context/LanguageContext";

// The three service categories on the homepage, each leading to its own page
// where the visitor puts together what they want.
export function WhatWeDo() {
  const { t } = useLanguage();
  const tw = t.whatWeDo;

  return (
    <section
      id="diensten"
      className="pdc-section"
      style={{
        backgroundColor: "#080401",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="pdc-wrap" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "56px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <span
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "16px",
              }}
            >
              {tw.label}
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
              {tw.titleLine1}
              <br />
              <span style={{ color: "rgba(255,251,224,0.4)" }}>{tw.titleLine2}</span>
            </h2>
          </div>
          <p
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "14px",
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: "320px",
              margin: 0,
            }}
          >
            {tw.subtitle}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2px",
          }}
        >
          {t.servicePages.pages.map((page, i) => (
            <div key={page.id} className="pdc-service-card">
              <div
                style={{
                  color: "rgba(200,144,90,0.8)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.25em",
                  fontFamily: "'Courier New', monospace",
                  marginBottom: "24px",
                }}
              >
                0{i + 1}
              </div>
              <h3
                style={{
                  color: "#fffbe0",
                  fontSize: "26px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  margin: 0,
                  marginBottom: "16px",
                }}
              >
                {page.name}
              </h3>
              <p
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "14px",
                  fontWeight: 300,
                  lineHeight: 1.75,
                  margin: 0,
                  marginBottom: "28px",
                }}
              >
                {page.summary}
              </p>
              <ul className="pdc-service-card-options">
                {page.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
              <Link to={page.path} className="pdc-stretched-link pdc-service-card-link">
                <span className="sr-only">{page.name}: </span>
                {tw.cardCta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
