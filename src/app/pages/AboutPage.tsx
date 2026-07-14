import { Helmet } from "react-helmet-async";
import { useState, useRef } from "react";
import image_IMG_0114_TIF from "@/imports/IMG_0114_TIF.jpg";
import image_IMG_9694 from "@/imports/IMG_9694.jpg";
import image_IMG_0115_TIF from "@/imports/IMG_0115_TIF.jpg";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import DARKROOM from "@/imports/webContent/shared124.jpeg";

const STUDIO_IMG =
  "https://images.unsplash.com/photo-1761701390293-27a1d3fa9df5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxtJTIwY2FtZXJhJTIwcGhvdG9ncmFwaHklMjBzdHVkaW8lMjBkYXJrJTIwZHJhbWF0aWN8ZW58MXx8fHwxNzc2NTk2NjU3fDA&ixlib=rb-4.1.0&q=80&w=1080";

const BEHIND_CAMERA =
  "https://images.unsplash.com/photo-1604272986062-67ef7145f0ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoZXIlMjBiZWhpbmQlMjBjYW1lcmElMjBjaW5lbWF0aWMlMjBzdHVkaW8lMjBkYXJrfGVufDF8fHx8MTc3NzU4MjEyM3ww&ixlib=rb-4.1.0&q=80&w=1080";

const TEAM = [
  {
    id: "majd",
    name: "Majd Tawashe",
    role: "Co-Founder & Head Of Office Portugal",
    img: "https://images.unsplash.com/photo-1649355422617-df9957b853a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0JTIwZGFyayUyMGJhY2tncm91bmQlMjBlZGl0b3JpYWx8ZW58MXx8fHwxNzc3NTgyNjU1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    intro:
      "Storytelling has always been at the heart of what I do. With over six years of experience in photography and filmmaking, my focus is creating visual content that feels authentic, cinematic, and impactful. \n\n At PDC Productions, I lead the creative vision behind our projects, from concept development to final delivery. Together with my co-founders, I help build meaningful content and experiences that connect brands with their audience. \n\n For me, great content isn’t just about beautiful visuals—it’s about telling stories people remember.",
    tag: "Creative Director & International Relations",
  },
  {
    id: "per",
    name: "Per van Hassel",
    role: "Co-Founder & Creative Director / Strategy",
    img: "https://images.unsplash.com/photo-1637397338715-adcfa9c1ee0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwcGhvdG9ncmFwaGVyJTIwcG9ydHJhaXQlMjBjaW5lbWF0aWMlMjBkYXJrJTIwbW9vZHklMjBzdHVkaW98ZW58MXx8fHwxNzc3NTgyNjU0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    intro:
      "A creative from the Netherlands with a background in hospitality and a strong focus on video production and storytelling, I’m also deeply inspired by music, which plays a key role in how I create and think. I tend to move fast between ideas and projects, which keeps my work dynamic and constantly evolving. Currently, I’m building my skills in videography while working toward living and creating abroad, where I can fully develop my craft and push my creative work further.",
    tag: "Strategy & Brand Identity",
  },
  {
    id: "ryan",
    name: "Ryan Chantre",
    role: "Co-Founder & Creative Lead",
    img: "https://images.unsplash.com/photo-1762807627815-caff3a9f81cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHBvcnRyYWl0JTIwZGFyayUyMGJhY2tncm91bmQlMjBlZGl0b3JpYWx8ZW58MXx8fHwxNzc3NTgyNjU1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    intro:
      "My passion for photography started in early 2026 from the freedom of capturing special moments and giving people something they can always look back on. With a focus on automotive, sports, and concert photography, I create images that don’t just show a moment, but also bring across the feeling behind it.\n\nTogether with Majd and Per, we started building PhotoDeCaffeine: a creative collective of photographers who share their passion and work together to capture strong, lasting memories.",
    tag: "Graphic Design & Post",
  },
];

function TeamCard({
  member,
  index,
}: {
  member: (typeof TEAM)[0];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

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
          src={
            member.id === "majd"
              ? image_IMG_9694
              : member.id === "ryan"
                ? image_IMG_0115_TIF
                : member.id === "per"
                  ? image_IMG_0114_TIF
                  : member.img
          }
          alt={member.name}
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
          <div
            style={{
              color: "#fffbe0",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            {member.name}
          </div>
          <div
            style={{
              color: "rgba(255,251,224,0.35)",
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
          <div
            style={{
              color: "#fffbe0",
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              marginBottom: "3px",
            }}
          >
            {member.name}
          </div>
          <div
            style={{
              color: "rgba(255,251,224,0.3)",
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
            color: "rgba(200,144,90,0.7)",
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
            color: "rgba(255,251,224,0.45)",
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
          {member.intro}
        </p>

        {/* Amber rule */}
        <div
          style={{
            marginTop: "20px",
            width: hovered ? "48px" : "24px",
            height: "1px",
            backgroundColor: "#c8905a",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

export function AboutPage() {
  const navigate = useNavigate();
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
        <title>Over Ons — Het Team achter de Lens | PhotoDeCaffeine</title>
        <meta name="description" content="Maak kennis met het team van PhotoDeCaffeine. Gepassioneerde fotografen en videomakers gevestigd in Rotterdam, met een oog voor detail en een liefde voor het vak." />
        <link rel="canonical" href="https://www.photodecaffeine.com/about" />
        <meta property="og:title" content="Over Ons | PhotoDeCaffeine" />
        <meta property="og:description" content="Maak kennis met het team van PhotoDeCaffeine — gepassioneerde fotografen in Rotterdam." />
        <meta property="og:url" content="https://www.photodecaffeine.com/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Over Ons | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Maak kennis met het team van PhotoDeCaffeine — gepassioneerde fotografen in Rotterdam." />
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
        style={{
          backgroundColor: "#0d0703",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          padding: "80px 40px 64px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.35)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
              marginBottom: "40px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
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
            {ta.backToHome}
          </button>

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
                  color: "rgba(255,251,224,0.3)",
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
                style={{
                  color: "#fffbe0",
                  fontSize: "clamp(48px, 7vw, 88px)",
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
                  style={{ color: "rgba(255,251,224,0.3)" }}
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
                color: "rgba(255,251,224,0.35)",
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
        style={{
          borderTop: "1px solid rgba(255,251,224,0.06)",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          padding: "100px 40px",
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
                  color: "rgba(255,251,224,0.3)",
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
                  style={{ color: "rgba(255,251,224,0.3)" }}
                >
                  {ta.teamTitle2}
                </span>
              </h2>
            </div>
            <p
              style={{
                color: "rgba(255,251,224,0.25)",
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
        style={{
          backgroundColor: "#0d0703",
          padding: "100px 40px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <style>{`
            .pdc-values-track {
              display: flex;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              -webkit-overflow-scrolling: touch;
              gap: 2px;
              scrollbar-width: none;
              -ms-overflow-style: none;
              padding-bottom: 2px;
            }
            .pdc-values-track::-webkit-scrollbar { display: none; }
            .pdc-values-card {
              flex: 0 0 80vw;
              scroll-snap-align: start;
            }
            .pdc-slider-arrow {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 48px;
              height: 48px;
              background-color: rgba(255,251,224,0.05);
              border: 1px solid rgba(255,251,224,0.1);
              color: #fffbe0;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            .pdc-slider-arrow:hover {
              background-color: rgba(255,251,224,0.1);
              border-color: rgba(255,251,224,0.2);
            }
            .pdc-slider-arrow:active {
              background-color: rgba(255,251,224,0.15);
            }
            @media (min-width: 768px) {
              .pdc-values-track {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                overflow-x: visible;
                scroll-snap-type: none;
              }
              .pdc-values-card {
                flex: unset;
              }
              .pdc-slider-arrow {
                display: none;
              }
            }
          `}</style>

          <div style={{ marginBottom: "64px" }}>
            <span
              style={{
                color: "rgba(255,251,224,0.3)",
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
              <span style={{ color: "rgba(255,251,224,0.3)" }}>
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
                      color: "rgba(200,144,90,0.4)",
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
                      color: "rgba(255,251,224,0.4)",
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

            {/* Dots indicator */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                marginTop: "20px",
                marginBottom: "4px",
              }}
            >
              {ta.values.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const track = trackRef.current;
                    if (track) {
                      const cardWidth = track.scrollWidth / ta.values.length;
                      track.scrollTo({ left: cardWidth * i, behavior: "smooth" });
                    }
                  }}
                  style={{
                    width: i === activeIdx ? "20px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    backgroundColor: i === activeIdx ? "#c8905a" : "rgba(255,251,224,0.2)",
                    transition: "all 0.25s ease",
                  }}
                  aria-label={`Kaart ${i + 1}`}
                />
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
                className="pdc-slider-arrow"
                onClick={() => {
                  const track = trackRef.current;
                  if (track) {
                    const scrollAmount =
                      track.offsetWidth * 0.8;
                    track.scrollBy({
                      left: -scrollAmount,
                      behavior: "smooth",
                    });
                  }
                }}
                aria-label="Previous"
              >
                <svg
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
                className="pdc-slider-arrow"
                onClick={() => {
                  const track = trackRef.current;
                  if (track) {
                    const scrollAmount =
                      track.offsetWidth * 0.8;
                    track.scrollBy({
                      left: scrollAmount,
                      behavior: "smooth",
                    });
                  }
                }}
                aria-label="Next"
              >
                <svg
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
          alt="Film photography process"
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
              color: "rgba(255,251,224,0.3)",
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
        style={{
          backgroundColor: "#0d0703",
          borderTop: "1px solid rgba(255,251,224,0.06)",
          padding: "100px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <span
            style={{
              color: "rgba(255,251,224,0.3)",
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
            <button
              onClick={() => {
                navigate("/", { state: { scrollTo: "contact" } });
              }}
              style={{
                backgroundColor: "#fffbe0",
                color: "#1a0c04",
                border: "none",
                padding: "16px 44px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "#c8905a";
                e.currentTarget.style.color = "#fffbe0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "#fffbe0";
                e.currentTarget.style.color = "#1a0c04";
              }}
            >
              {ta.ctaButton}
            </button>
            <button
              onClick={() => navigate("/portfolio")}
              style={{
                backgroundColor: "transparent",
                color: "rgba(255,251,224,0.6)",
                border: "1px solid rgba(255,251,224,0.2)",
                padding: "16px 44px",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "rgba(255,251,224,0.5)";
                e.currentTarget.style.color = "#fffbe0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "rgba(255,251,224,0.2)";
                e.currentTarget.style.color =
                  "rgba(255,251,224,0.6)";
              }}
            >
              {ta.ctaPortfolio}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}