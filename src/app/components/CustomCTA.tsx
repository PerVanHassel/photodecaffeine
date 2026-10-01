import { Link } from "react-router";
import { useLanguage } from "../context/LanguageContext";

export function CustomCTA() {
  const { t } = useLanguage();
  const tc = t.customCta;

  return (
    <section
      className="pdc-band"
      style={{
        backgroundColor: "#0a0502",
        fontFamily: "'Inter', sans-serif",
        borderTop: "1px solid rgba(200,144,90,0.08)",
        borderBottom: "1px solid rgba(200,144,90,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          className="custom-cta-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "48px",
            alignItems: "center",
          }}
        >

          {/* Left side: headline and text */}
          <div>
            <div
              style={{
                color: "rgba(200,144,90,0.8)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom: "24px",
              }}
            >
              {tc.label}
            </div>

            <h2
              style={{
                color: "#fffbe0",
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
                marginBottom: "24px",
              }}
            >
              {tc.title}
            </h2>

            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "15px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                marginBottom: "20px",
                maxWidth: "580px",
              }}
            >
              {tc.body}
            </p>

            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "11px",
                fontWeight: 400,
                letterSpacing: "0.03em",
                lineHeight: 1.6,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {tc.note}
            </p>
          </div>

          {/* Right side: CTA card */}
          <div
            style={{
              backgroundColor: "rgba(13,7,3,0.6)",
              border: "1px solid rgba(200,144,90,0.15)",
              padding: "48px 40px",
            }}
          >
            <Link
              to="/#contact"
              className="pdc-btn pdc-btn-solid"
              style={{
                display: "block",
                width: "100%",
                padding: "18px 32px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                marginBottom: "20px",
              }}
            >
              {tc.button}
            </Link>

            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "11px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                textAlign: "center",
              }}
            >
              {tc.cardNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
