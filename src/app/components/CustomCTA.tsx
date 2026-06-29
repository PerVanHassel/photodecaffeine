import { useState } from "react";

export function CustomCTA() {
  const [hoveredButton, setHoveredButton] = useState(false);

  return (
    <section
      style={{
        backgroundColor: "#0a0502",
        padding: "100px 40px",
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
          <style>{`
            @media (min-width: 1024px) {
              .custom-cta-grid {
                grid-template-columns: 1.2fr 1fr !important;
                gap: 64px !important;
              }
            }
          `}</style>

          {/* Left side: headline and text */}
          <div>
            <div
              style={{
                color: "rgba(200,144,90,0.5)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom: "24px",
              }}
            >
              CUSTOM PROJECTS
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
              Have a vision that doesn't fit inside a package?
            </h2>

            <p
              style={{
                color: "rgba(255,251,224,0.45)",
                fontSize: "15px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                marginBottom: "20px",
                maxWidth: "580px",
              }}
            >
              Some projects need more than a standard package. Whether it's a personal shoot,
              brand campaign, automotive concept, real estate story, event, or creative idea — we'll
              help shape the vision first, then build a clear price estimate around it.
            </p>

            <p
              style={{
                color: "rgba(255,251,224,0.25)",
                fontSize: "11px",
                fontWeight: 400,
                letterSpacing: "0.03em",
                lineHeight: 1.6,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              Built for personal projects, custom campaigns and ideas that need their own direction.
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
            <button
              onClick={() => {
                const el = document.getElementById("contact");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              onMouseEnter={() => setHoveredButton(true)}
              onMouseLeave={() => setHoveredButton(false)}
              style={{
                display: "block",
                width: "100%",
                backgroundColor: hoveredButton ? "#c8905a" : "#fffbe0",
                color: hoveredButton ? "#fffbe0" : "#1a0c04",
                border: "none",
                padding: "18px 32px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.3s ease",
                marginBottom: "20px",
              }}
            >
              CREATE MY VISION & PRICE ESTIMATE
            </button>

            <p
              style={{
                color: "rgba(255,251,224,0.35)",
                fontSize: "11px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                textAlign: "center",
              }}
            >
              Tell us the idea, the goal, the location and the feeling you want to create. We'll
              turn it into a clear concept and custom quote.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
