import { Helmet } from "react-helmet-async";
import { useState, useRef } from "react";
import image_IMG_0114_TIF from "@/assets/web/per-1600.webp";
import image_IMG_9694 from "@/assets/web/majd-800.webp";
import image_IMG_0115_TIF from "@/assets/web/ryan-1000.webp";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import DARKROOM from "@/assets/web/darkroom-1200.webp";
import { scrollBehavior } from "../lib/scroll";

const TEAM = [
  { id: "per", name: "Per van Hassel", role: "Medeoprichter & creative director / strategie", tag: "Strategie & merkidentiteit" },
  { id: "ryan", name: "Ryan Chantre", role: "Medeoprichter & creative lead", tag: "Grafisch ontwerp & postproductie" },
  { id: "majd", name: "Majd Tawashe", role: "Fotografie & creative director", tag: "Medeoprichter" },
] as const;

const PORTRAITS = { majd: image_IMG_9694, per: image_IMG_0114_TIF, ryan: image_IMG_0115_TIF };

function TeamCard({
  member,
  index,
}: {
  member: (typeof TEAM)[number];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const { t } = useLanguage();

  return (
    <div
      className="flex flex-col md:flex-col"
      style={{
        position: "relative",
        backgroundColor: "rgba(255,251,224,0.02)",
        border: "1px solid rgba(255,251,224,0.05)",
        overflow: "hidden",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Portrait image */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          height: "320px",
        }}
        className="md:h-[420px]"
      >
        <ImageWithFallback
          src={PORTRAITS[member.id]}
          alt={member.name}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition:
              member.id === "per"
                ? "right center"
                : "center center",
            filter:
              "contrast(1.05) saturate(0.6) brightness(0.8)",
            transition: "transform 0.6s ease",
            transform: hovered
              ? member.id === "ryan"
                ? "scale(1.23)"
                : "scale(1.03)"
              : member.id === "ryan"
                ? "scale(1.18)"
                : "scale(1)",
            display: "block",
          }}
        />
        {/* Bottom gradient */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "55%",
            background:
              "linear-gradient(to top, rgba(8,4,1,0.95) 0%, transparent 100%)",
          }}
        />
        {/* Index number */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            color: "rgba(200,144,90,0.35)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.25em",
            fontFamily: "'Courier New', monospace",
          }}
        >
          0{index + 1}
        </div>
        {/* Name overlay on image — desktop only */}
        <div
          className="hidden md:block"
          style={{
            position: "absolute",
            bottom: "24px",
            left: "28px",
            right: "28px",
          }}
        >
          <h3
            style={{
              color: "#fffbe0",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              margin: "0 0 4px",
            }}
          >
            {member.name}
          </h3>
          <div
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "9px",
              fontWeight: 400,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {member.role}
          </div>
        </div>
      </div>

      {/* Text content */}
      <div
        style={{ padding: "20px 20px 24px" }}
        className="flex flex-col justify-center md:p-7"
      >
        {/* Name — mobile only */}
        <div
          className="block md:hidden"
          style={{ marginBottom: "10px" }}
        >
          <h3
            style={{
              color: "#fffbe0",
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              margin: "0 0 3px",
            }}
          >
            {member.name}
          </h3>
          <div
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "9px",
              fontWeight: 400,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {member.role}
          </div>
        </div>

        {/* Tag */}
        <div
          style={{
            display: "inline-block",
            border: "1px solid rgba(200,144,90,0.25)",
            color: "rgba(200,144,90,0.8)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "5px 12px",
            marginBottom: "16px",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {member.tag}
        </div>

        {/* Intro paragraph */}
        <p
          style={{
            color: "rgba(255,251,224,0.5)",
            fontSize: "13px",
            fontWeight: 300,
            lineHeight: 1.8,
            margin: 0,
            whiteSpace: "pre-line",
            transition: "color 0.3s ease",
            ...(hovered
              ? { color: "rgba(255,251,224,0.65)" }
              : {}),
          }}
        >
          {t.aboutPage.team[member.id]}
        </p>

        {/* Amber rule */}
        <div
          aria-hidden="true"
          style={{
            marginTop: "20px",
            width: "48px",
            height: "1px",
            backgroundColor: "#c8905a",
            transform: hovered ? "scaleX(1)" : "scaleX(0.5)",
            transformOrigin: "left center",
            transition: "transform 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

export function AboutPage() {
  const { t } = useLanguage();
  const ta = t.aboutPage;
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div
      style={{
        backgroundColor: "#080401",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "72px",
      }}>
      <Helmet>
        <title>Over ons: het team achter de lens | PhotoDeCaffeine</title>
        <meta name="description" content="Maak kennis met het team van PhotoDeCaffeine. Gepassioneerde automotive fotografen en videomakers, actief door heel Nederland, met een oog voor detail en een liefde voor het vak." />
        <link rel="canonical" href="https://www.photodecaffeine.com/about" />
        <meta property="og:title" content="Over ons | PhotoDeCaffeine" />
        <meta property="og:description" content="Maak kennis met het team van PhotoDeCaffeine: gepassioneerde automotive fotografen door heel Nederland." />
        <meta property="og:url" content="https://www.photodecaffeine.com/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Over ons | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Maak kennis met het team van PhotoDeCaffeine: gepassioneerde automotive fotografen door heel Nederland." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Over Ons", "item": "https://www.photodecaffeine.com/about" }
          ]
        })}</script>
      </Helmet>
      {/* ── PAGE HEADER ── */}
      <div
        className="pdc-svc-head"
        style={{
          backgroundColor: "#0d0703",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <Link to="/" className="pdc-back-link">
            {ta.backToHome}
          </Link>

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
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "16px",
                }}
              >
                {ta.label}
              </span>
              <h1
                className="pdc-page-title"
                style={{
                  color: "#fffbe0",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {ta.titleLine1}
                <br />
                <span
                  style={{ color: "rgba(255,251,224,0.4)" }}
                >
                  {ta.titleLine2}
                </span>
                <br />
                <em
                  style={{
                    fontStyle: "italic",
                    fontWeight: 300,
                    color: "#c8905a",
                    fontSize: "0.78em",
                  }}
                >
                  {ta.titleLine3}
                </em>
              </h1>
            </div>
            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                maxWidth: "340px",
                textAlign: "right",
              }}
            >
              {ta.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── TEAM ── */}
      <div
        className="pdc-band"
        style={{
          borderTop: "1px solid rgba(255,251,224,0.06)",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          backgroundColor: "#0a0502",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "24px",
              marginBottom: "72px",
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
                {ta.teamLabel}
              </span>
              <h2
                style={{
                  color: "#fffbe0",
                  fontSize: "clamp(28px, 3.5vw, 48px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {ta.teamTitle1}{" "}
                <span
                  style={{ color: "rgba(255,251,224,0.4)" }}
                >
                  {ta.teamTitle2}
                </span>
              </h2>
            </div>
            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "10px",
                fontWeight: 400,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                margin: 0,
                fontFamily: "'Courier New', monospace",
              }}
            >
              {ta.teamSubtitle}
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3"
            style={{ gap: "2px" }}
          >
            {TEAM.map((member, i) => (
              <TeamCard
                key={member.id}
                member={member}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── VALUES ── */}
      <div
        className="pdc-band"
        style={{
          backgroundColor: "#0d0703",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

          <div style={{ marginBottom: "64px" }}>
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
              {ta.valuesLabel}
            </span>
            <h2
              style={{
                color: "#fffbe0",
                fontSize: "clamp(28px, 3.5vw, 48px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {ta.valuesTitle1}{" "}
              <span style={{ color: "rgba(255,251,224,0.4)" }}>
                {ta.valuesTitle2}
              </span>
            </h2>
          </div>

          <div style={{ position: "relative" }}>
            <div
              className="pdc-values-track"
              ref={trackRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const cardWidth = el.scrollWidth / ta.values.length;
                setActiveIdx(Math.round(el.scrollLeft / cardWidth));
              }}
            >
              {ta.values.map((v) => (
                <div
                  key={v.num}
                  className="pdc-values-card"
                  style={{
                    backgroundColor: "rgba(255,251,224,0.02)",
                    border: "1px solid rgba(255,251,224,0.05)",
                    padding: "40px 32px",
                  }}
                >
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
                    {v.num}
                  </div>
                  <div
                    style={{
                      color: "#fffbe0",
                      fontSize: "15px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: "16px",
                    }}
                  >
                    {v.title}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,251,224,0.5)",
                      fontSize: "13px",
                      fontWeight: 300,
                      lineHeight: 1.75,
                    }}
                  >
                    {v.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Dots indicator (phones, where the cards scroll) */}
            <div className="pdc-values-dots">
              {ta.values.map((v, i) => (
                <button
                  key={v.num}
                  type="button"
                  className="pdc-dot"
                  aria-label={v.title}
                  aria-current={i === activeIdx || undefined}
                  onClick={() => {
                    const track = trackRef.current;
                    if (track) {
                      const cardWidth = track.scrollWidth / ta.values.length;
                      track.scrollTo({ left: cardWidth * i, behavior: scrollBehavior() });
                    }
                  }}
                >
                  <span className="pdc-dot-mark" />
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginTop: "12px",
              }}
            >
              <button
                type="button"
                className="pdc-slider-arrow"
                onClick={() => {
                  const track = trackRef.current;
                  if (track) {
                    const scrollAmount =
                      track.offsetWidth * 0.8;
                    track.scrollBy({
                      left: -scrollAmount,
                      behavior: scrollBehavior(),
                    });
                  }
                }}
                aria-label={ta.previous}
              >
                <svg
                  aria-hidden="true"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="pdc-slider-arrow"
                onClick={() => {
                  const track = trackRef.current;
                  if (track) {
                    const scrollAmount =
                      track.offsetWidth * 0.8;
                    track.scrollBy({
                      left: scrollAmount,
                      behavior: scrollBehavior(),
                    });
                  }
                }}
                aria-label={ta.next}
              >
                <svg
                  aria-hidden="true"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TIMELINE ── */}

      {/* ── DARKROOM FULL-BLEED ── */}
      <div
        style={{
          position: "relative",
          height: "480px",
          overflow: "hidden",
        }}
      >
        <ImageWithFallback
          src={DARKROOM}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter:
              "contrast(1.1) saturate(0.5) brightness(0.55)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(8,4,1,0.7) 0%, rgba(8,4,1,0.2) 50%, rgba(8,4,1,0.7) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center",
            padding: "40px",
          }}
        >
          <span
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "24px",
            }}
          >
            {ta.darkroomProcess}
          </span>
          <p
            style={{
              color: "#fffbe0",
              fontSize: "clamp(20px, 3vw, 32px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              margin: 0,
              textTransform: "uppercase",
              maxWidth: "640px",
              whiteSpace: "pre-line",
            }}
          >
            {ta.darkroomQuote}
          </p>
        </div>
      </div>

      {/* ── CTA ── */}
      <div
        className="pdc-band"
        style={{
          backgroundColor: "#0d0703",
          borderTop: "1px solid rgba(255,251,224,0.06)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <span
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "24px",
            }}
          >
            {ta.ctaLabel}
          </span>
          <h2
            style={{
              color: "#fffbe0",
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              margin: 0,
              marginBottom: "40px",
              textTransform: "uppercase",
            }}
          >
            {ta.ctaTitle1}{" "}
            <span style={{ color: "#c8905a" }}>
              {ta.ctaTitle2}
            </span>
            <br />
            {ta.ctaTitle3}
          </h2>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/#contact"
              className="pdc-btn pdc-btn-solid"
              style={{ padding: "16px 44px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em" }}
            >
              {ta.ctaButton}
            </Link>
            <Link
              to="/portfolio"
              className="pdc-btn pdc-btn-outline"
              style={{ padding: "16px 44px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em" }}
            >
              {ta.ctaPortfolio}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}