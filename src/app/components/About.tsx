import { useLanguage } from "../context/LanguageContext";
import image_IMG_0114_TIF from "@/assets/web/per-1600.webp";
import IMG_9694 from "@/assets/web/majd-800.webp";
import image_IMG_0115_TIF from "@/assets/web/ryan-1000.webp";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Link } from "react-router";

const RYAN_PORTRAIT =
  "https://images.unsplash.com/photo-1532170579297-281918c8ae72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw4fHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoZXIlMjBwb3J0cmFpdCUyMHN0dWRpbyUyMGRhcmslMjBkcmFtYXRpYyUyMGNpbmVtYXRpY3xlbnwxfHx8fDE3ODA1MjAyNTh8MA&ixlib=rb-4.1.0&q=80&w=1080";

export function About() {
  const { t } = useLanguage();

  return (
    <section
      id="about"
      className="pdc-section"
      style={{
        backgroundColor: "#0d0703",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "inset 0 1px 0 rgba(255,251,224,0.06)",
      }}
    >
      <div
        className="pdc-wrap"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Section label */}
        <div className="text-[16px]"
          style={{ marginBottom: "48px", textAlign: "center" }}
        >
          <span
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            {t.about.label}
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
            margin: 0,
            marginBottom: "72px",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {t.about.titleLine1}
          <br />
          <span style={{ color: "rgba(255,251,224,0.4)" }}>
            {t.about.titleLine2}
          </span>
          <br />
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 300,
              color: "#c8905a",
              fontSize: "0.85em",
            }}
          >
            {t.about.titleLine3}
          </em>
        </h2>

        {/* Three owner portraits */}
        <div
          className="pdc-owners"
          style={{
            display: "grid",
            gap: "2px",
            marginBottom: "72px",
          }}
        >
          {/* Per van Hassel */}
          <div
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ImageWithFallback
              className="m-[0px]"
              src={image_IMG_0114_TIF}
              alt="Per van Hassel, medeoprichter van PDC"
              style={{
                width: "100%",
                height: "var(--pdc-owner-h)",
                objectFit: "cover",
                objectPosition: "right top",
                filter:
                  "contrast(1.08) saturate(0.6) brightness(0.85)",
                display: "block",
              }}
            />
            {/* Warm gradient overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(to top, rgba(13,7,3,0.9) 0%, transparent 100%)",
              }}
            />
            {/* Name tag */}
            <div
              style={{
                position: "absolute",
                bottom: "28px",
                left: "28px",
                right: "28px",
              }}
            >
              <div
                style={{
                  color: "#fffbe0",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                {t.about.owners[0].name}
              </div>
              <div
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  lineHeight: 1.4,
                }}
              >
                {t.about.owners[0].role}
              </div>
            </div>
          </div>

          {/* Ryan Chantre */}
          <div
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ImageWithFallback
              src={image_IMG_0115_TIF}
              alt="Ryan Chantre, medeoprichter van PDC"
              style={{
                width: "100%",
                height: "var(--pdc-owner-h)",
                objectFit: "cover",
                objectPosition: "center center",
                filter:
                  "contrast(1.08) saturate(0.6) brightness(0.85)",
                display: "block",
              }}
            />
            {/* Warm gradient overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(to top, rgba(13,7,3,0.9) 0%, transparent 100%)",
              }}
            />
            {/* Name tag */}
            <div
              style={{
                position: "absolute",
                bottom: "28px",
                left: "28px",
                right: "28px",
              }}
            >
              <div
                style={{
                  color: "#fffbe0",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                {t.about.owners[1].name}
              </div>
              <div
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  lineHeight: 1.4,
                }}
              >
                {t.about.owners[1].role}
              </div>
            </div>
          </div>

          {/* Majd Tawashe */}
          <div
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ImageWithFallback
              src={IMG_9694}
              alt="Majd Tawashe, medeoprichter van PDC"
              style={{
                width: "100%",
                height: "var(--pdc-owner-h)",
                objectFit: "cover",
                objectPosition: "center center",
                filter:
                  "contrast(1.08) saturate(0.6) brightness(0.85)",
                display: "block",
              }}
            />
            {/* Warm gradient overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(to top, rgba(13,7,3,0.9) 0%, transparent 100%)",
              }}
            />
            {/* Name tag */}
            <div
              style={{
                position: "absolute",
                bottom: "28px",
                left: "28px",
                right: "28px",
              }}
            >
              <div
                style={{
                  color: "#fffbe0",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                {t.about.owners[2].name}
              </div>
              <div
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  lineHeight: 1.4,
                }}
              >
                {t.about.owners[2].role}
              </div>
            </div>
          </div>
        </div>

        {/* Story content */}
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "1px",
              backgroundColor: "rgba(255,251,224,0.15)",
              marginBottom: "36px",
              margin: "0 auto 36px",
            }}
          />

          <p
            style={{
              color: "rgba(255,251,224,0.55)",
              fontSize: "15px",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            {t.about.body1}
          </p>

          

          {/* Pull quote */}
          <div
            style={{
              borderLeft: "2px solid #c8905a",
              paddingLeft: "32px",
              marginBottom: "56px",
              maxWidth: "700px",
              margin: "0 auto 56px",
            }}
          >
            <blockquote
              style={{
                color: "#fffbe0",
                fontSize: "24px",
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1.5,
                letterSpacing: "0.02em",
                margin: 0,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {t.about.pullQuote}
            </blockquote>
            <cite
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                fontStyle: "normal",
                display: "block",
                marginTop: "16px",
              }}
            >
              {t.about.pullQuoteCite}
            </cite>
          </div>

          {/* Credentials */}
          <div
            className="pdc-credentials"
            style={{
              borderTop: "1px solid rgba(255,251,224,0.08)",
              paddingTop: "40px",
              display: "grid",
              gap: "32px",
              marginBottom: "48px",
            }}
          >
            {t.about.credentials.map((item) => (
              <div
                key={item.label}
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    color: "rgba(255,251,224,0.5)",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    color: "rgba(255,251,224,0.7)",
                    fontSize: "13px",
                    fontWeight: 300,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center" }}>
            <Link to="/about" className="pdc-text-link">
              {t.about.learnMore}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}