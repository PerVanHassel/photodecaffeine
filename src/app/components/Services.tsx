import { useState } from "react";

const PACKAGES = [
  {
    id: "espresso",
    label: "SINGLE ORIGIN",
    name: "ESPRESSO",
    description: "Focused. Sharp. For businesses that want to look professional without going all-in yet.",
    price: "€399,-",
    per: "per month",
    includes: [
      "1 shoot day per month",
      "Up to 3 hours on location",
      "20 final edited images",
      "3 short-form reels / TikToks",
      "5 story clips",
      "Basic colour grade & retouch",
      "Vertical exports for Instagram, TikTok & Facebook",
      "Basic captions included",
      "Web + social delivery",
      "Online gallery delivery",
    ],
    ideal: "Small car dealers, independent real estate agents, Airbnb hosts, small businesses",
  },
  {
    id: "reserve",
    label: "STUDIO SIGNATURE",
    name: "RESERVE",
    description: "The full PDC experience — cinematic, strategic, sales-driven and built to create attention.",
    price: "€749,-",
    per: "per month",
    includes: [
      "2 shoot days per month",
      "Up to 4.5 hours per shoot",
      "40–50 final edited images",
      "6 short-form reels / TikToks",
      "10 story clips",
      "1 hero video per month",
      "Cinematic colour grade",
      "Thumbnail covers for reels",
      "Sales-focused captions",
      "Monthly content calendar",
      "Monthly strategy call",
      "Basic performance review",
      "Web, social & ad-ready delivery",
    ],
    ideal: "Growing car dealerships, active real estate agents, rental companies, property managers",
  },
  {
    id: "blend",
    label: "ONGOING RETAINER",
    name: "BLEND",
    description: "Consistent visual identity across every channel, every month. Built for brands that want to dominate their region.",
    price: "€1.399,-",
    per: "per month",
    includes: [
      "4 shoot days per month",
      "Weekly or bi-weekly production schedule",
      "80–100 final edited images",
      "12 short-form reels / TikToks",
      "20 story clips",
      "1 premium hero brand video",
      "1 monthly campaign video",
      "Full cinematic colour grade",
      "Advanced retouching",
      "Dedicated brand style guide",
      "Monthly content calendar",
      "Monthly strategy session",
      "Competitor content check",
      "Performance review",
      "Priority scheduling",
      "Ad-ready exports",
      "Website banners",
      "Same-week turnaround",
    ],
    ideal: "Premium dealerships, makelaarskantoren, projectontwikkelaars, vastgoedbeleggers",
  },
];

export function Services() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section
      id="services"
      style={{
        backgroundColor: "#080401",
        padding: "120px 40px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Pricing cards */}
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
              .pricing-grid {
                grid-template-columns: repeat(2, 1fr) !important;
              }
              .pricing-grid > div:last-child {
                grid-column: 1 / -1;
              }
            }
            @media (max-width: 767px) {
              .pricing-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              onMouseEnter={() => setHoveredCard(pkg.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                backgroundColor: pkg.id === "reserve"
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
              {/* Small top label */}
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

              {/* Package title */}
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

              {/* Description */}
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

              {/* Price */}
              <div
                style={{
                  marginBottom: "32px",
                }}
              >
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

              {/* Divider */}
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "rgba(200,144,90,0.15)",
                  marginBottom: "32px",
                }}
              />

              {/* Section title */}
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
                WHAT'S INCLUDED
              </div>

              {/* Checklist */}
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

              {/* Divider */}
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "rgba(200,144,90,0.15)",
                  marginBottom: "24px",
                }}
              />

              {/* Ideal for */}
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
                  Ideal for:
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

              {/* Button */}
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
                  border: pkg.id === "reserve"
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
                BOOK THIS PACKAGE
              </button>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div
          style={{
            marginTop: "56px",
            textAlign: "center",
          }}
        >
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
            All prices are excluding VAT. Minimum collaboration: 3 months. Custom campaigns available on request.
          </p>
        </div>
      </div>
    </section>
  );
}