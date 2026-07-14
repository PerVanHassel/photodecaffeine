import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export function Services() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { t } = useLanguage();
  const ts = t.services;

  return (
    <section
      id="services"
      style={{
        backgroundColor: "#080401",
        padding: "120px 40px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          className="pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2px",
          }}
        >
          <style>{`
            @media (max-width: 1024px) and (min-width: 768px) {
              .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
              .pricing-grid > div:last-child { grid-column: 1 / -1; }
            }
            @media (max-width: 767px) {
              .pricing-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {ts.packages.map((pkg) => (
            <div
              key={pkg.id}
              onMouseEnter={() => setHoveredCard(pkg.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                backgroundColor:
                  pkg.id === "reserve"
                    ? "rgba(62,37,10,0.4)"
                    : hoveredCard === pkg.id
                    ? "rgba(13,7,3,0.8)"
                    : "#0d0703",
                border: `1px solid ${
                  pkg.id === "reserve"
                    ? "rgba(200,144,90,0.25)"
                    : "rgba(255,251,224,0.06)"
                }`,
                padding: "48px 40px",
                transition: "all 0.3s ease",
                position: "relative",
              }}
            >
              <div
                style={{
                  color: pkg.id === "reserve" ? "#c8905a" : "rgba(255,251,224,0.3)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                {pkg.label}
              </div>

              <h3
                style={{
                  color: "#fffbe0",
                  fontSize: "40px",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                  margin: 0,
                  marginBottom: "16px",
                  lineHeight: 1,
                }}
              >
                {pkg.name}
              </h3>

              <p
                style={{
                  color: "rgba(255,251,224,0.45)",
                  fontSize: "13px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  margin: 0,
                  marginBottom: "32px",
                }}
              >
                {pkg.description}
              </p>

              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      color: "#fffbe0",
                      fontSize: "48px",
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {pkg.price}
                  </span>
                </div>
                <div
                  style={{
                    color: "rgba(255,251,224,0.3)",
                    fontSize: "11px",
                    fontWeight: 400,
                    letterSpacing: "0.05em",
                  }}
                >
                  {pkg.per}
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "rgba(200,144,90,0.15)",
                  marginBottom: "32px",
                }}
              />

              <div
                style={{
                  color: "rgba(255,251,224,0.25)",
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  marginBottom: "20px",
                }}
              >
                {ts.whatsIncluded}
              </div>

              <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: "32px" }}>
                {pkg.includes.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        color: pkg.id === "reserve" ? "#c8905a" : "rgba(200,144,90,0.5)",
                        fontSize: "14px",
                        lineHeight: 1.5,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        color: "rgba(255,251,224,0.6)",
                        fontSize: "13px",
                        fontWeight: 300,
                        lineHeight: 1.6,
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "rgba(200,144,90,0.15)",
                  marginBottom: "24px",
                }}
              />

              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {ts.idealFor}:
                </div>
                <div
                  style={{
                    color: "rgba(255,251,224,0.4)",
                    fontSize: "12px",
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {pkg.ideal}
                </div>
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById("contact");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "block",
                  width: "100%",
                  backgroundColor: pkg.id === "reserve" ? "#fffbe0" : "transparent",
                  color: pkg.id === "reserve" ? "#1a0c04" : "rgba(255,251,224,0.6)",
                  border:
                    pkg.id === "reserve"
                      ? "none"
                      : "1px solid rgba(255,251,224,0.15)",
                  padding: "16px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (pkg.id === "reserve") {
                    e.currentTarget.style.backgroundColor = "#c8905a";
                    e.currentTarget.style.color = "#fffbe0";
                  } else {
                    e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)";
                    e.currentTarget.style.color = "#fffbe0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pkg.id === "reserve") {
                    e.currentTarget.style.backgroundColor = "#fffbe0";
                    e.currentTarget.style.color = "#1a0c04";
                  } else {
                    e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)";
                    e.currentTarget.style.color = "rgba(255,251,224,0.6)";
                  }
                }}
              >
                {ts.bookPackage}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "56px", textAlign: "center" }}>
          <p
            style={{
              color: "rgba(255,251,224,0.25)",
              fontSize: "11px",
              fontWeight: 300,
              letterSpacing: "0.05em",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {ts.bottomNote}
          </p>
        </div>
      </div>
    </section>
  );
}
