import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";
import image_IMG_0114_TIF from "@/imports/IMG_0114_TIF.jpg";
import IMG_9694 from "@/imports/IMG_9694.jpg";
import image_IMG_0115_TIF from "@/imports/IMG_0115_TIF.jpg";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useNavigate } from "react-router";

const STUDIO =
  "https://images.unsplash.com/photo-1761701390293-27a1d3fa9df5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxtJTIwY2FtZXJhJTIwcGhvdG9ncmFwaHklMjBzdHVkaW8lMjBkYXJrJTIwZHJhbWF0aWN8ZW58MXx8fHwxNzc2NTk2NjU3fDA&ixlib=rb-4.1.0&q=80&w=1080";

const MAJD_PORTRAIT =
  "https://images.unsplash.com/photo-1621024994278-e409544f4085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoZXIlMjBwb3J0cmFpdCUyMHN0dWRpbyUyMGRhcmslMjBkcmFtYXRpYyUyMGNpbmVtYXRpY3xlbnwxfHx8fDE3ODA1MjAyNTh8MA&ixlib=rb-4.1.0&q=80&w=1080";

const RYAN_PORTRAIT =
  "https://images.unsplash.com/photo-1532170579297-281918c8ae72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw4fHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoZXIlMjBwb3J0cmFpdCUyMHN0dWRpbyUyMGRhcmslMjBkcmFtYXRpYyUyMGNpbmVtYXRpY3xlbnwxfHx8fDE3ODA1MjAyNTh8MA&ixlib=rb-4.1.0&q=80&w=1080";

export function About() {
  const { t } = useLanguage();
  const isMobile = useMobile();
  const navigate = useNavigate();

  return (
    <section
      id="about"
      style={{
        backgroundColor: "#0d0703",
        padding: isMobile ? "80px 0" : "120px 0",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "inset 0 1px 0 rgba(255,251,224,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "0 20px" : "0 40px",
        }}
      >
        {/* Section label */}
        <div className="text-[16px]"
          style={{ marginBottom: "48px", textAlign: "center" }}
        >
          <span
            style={{
              color: "rgba(255,251,224,0.3)",
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
          <span style={{ color: "rgba(255,251,224,0.3)" }}>
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
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3, 1fr)",
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
              alt="Per van Hassel — Co-Founder of PDC"
              style={{
                width: "100%",
                height: isMobile ? "500px" : "580px",
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
                  color: "rgba(255,251,224,0.4)",
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

          {/* Majd Tawashe */}
          <div
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ImageWithFallback
              src={IMG_9694}
              alt="Majd Tawashe — Co-Founder of PDC"
              style={{
                width: "100%",
                height: isMobile ? "500px" : "580px",
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
                  color: "rgba(255,251,224,0.4)",
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

          {/* Ryan Chantre */}
          <div
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ImageWithFallback
              src={image_IMG_0115_TIF}
              alt="Ryan Chantre — Co-Founder of PDC"
              style={{
                width: "100%",
                height: isMobile ? "500px" : "580px",
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
                  color: "rgba(255,251,224,0.4)",
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
                color: "rgba(255,251,224,0.3)",
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
            style={{
              borderTop: "1px solid rgba(255,251,224,0.08)",
              paddingTop: "40px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(4, 1fr)",
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
                    color: "rgba(255,251,224,0.25)",
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
            <button
              onClick={() => {
                navigate("/about");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,251,224,0.35)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: 0,
                fontFamily: "'Inter', sans-serif",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color =
                  "rgba(255,251,224,0.7)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color =
                  "rgba(255,251,224,0.35)")
              }
            >
              {t.about.learnMore}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}