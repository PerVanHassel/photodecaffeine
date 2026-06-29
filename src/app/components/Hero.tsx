import image__MAJ2869_1_ from '@/imports/_MAJ2869_1_.jpeg'
import image__DSC0019 from '@/imports/_DSC0019.jpg'
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useNavigate } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";
import { useState, useEffect } from "react";
import { projectId } from "/utils/supabase/info";

const DEFAULT_HERO_BG =
  "https://images.unsplash.com/photo-1613158556069-e7d8eae76214?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2luZW1hdGljJTIwZXNwcmVzc28lMjBjb2ZmZWUlMjBzdHVkaW8lMjBtb29keXxlbnwxfHx8fDE3NzY1OTY2NTB8MA&ixlib=rb-4.1.0&q=80&w=1080";

type SiteSettings = {
  heroImageUrl: string;
  heroImageMobileUrl: string;
};

export function Hero() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isMobile = useMobile();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/settings`
      );
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }

  const scrollToPortfolio = () => {
    navigate("/portfolio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const heroImageUrl = isMobile
    ? (settings?.heroImageMobileUrl || settings?.heroImageUrl || DEFAULT_HERO_BG)
    : (settings?.heroImageUrl || DEFAULT_HERO_BG);

  return (
    <section
      id="hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        backgroundColor: "#0d0703",
      }}
    >
      {/* Background Image */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <ImageWithFallback
          src={heroImageUrl}
          alt="Hero background"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: isMobile ? 0.45 : 0.35
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: isMobile
            ? "linear-gradient(to bottom, rgba(10,5,1,0.7) 0%, rgba(10,5,1,0.85) 60%, rgba(10,5,1,0.95) 100%)"
            : "linear-gradient(135deg, rgba(10,5,1,0.92) 0%, rgba(30,15,5,0.78) 50%, rgba(10,5,1,0.85) 100%)",
        }} />
      </div>

      {/* Grain texture overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.4, pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        maxWidth: "1400px", margin: "0 auto",
        padding: isMobile ? "0 20px" : "0 40px",
        height: "100vh",
        display: "flex", flexDirection: "column", justifyContent: isMobile ? "flex-end" : "center",
        paddingBottom: isMobile ? "80px" : "0",
      }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "60px", alignItems: "center" }}
          className="flex flex-col lg:grid"
        >
          {/* Left — Text */}
          <div style={{ maxWidth: "680px" }}>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: isMobile ? "20px" : "28px" }}>
              <div style={{ width: "32px", height: "1px", backgroundColor: "rgba(255,251,224,0.35)" }} />
              <span style={{
                color: "rgba(255,251,224,0.4)", fontSize: "10px", fontWeight: 500,
                letterSpacing: "0.3em", textTransform: "uppercase",
              }}>{t.hero.label}</span>
            </div>

            {/* Headline */}
            <h1 style={{
              color: "#fffbe0",
              fontSize: isMobile ? "clamp(36px, 11vw, 64px)" : "clamp(48px, 7vw, 96px)",
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              margin: 0,
              marginBottom: isMobile ? "18px" : "24px",
              textTransform: "uppercase",
              textShadow: isMobile ? "0 2px 12px rgba(0,0,0,0.6)" : "none",
            }}>
              {t.hero.headline1}
              <br />
              <span style={{ color: "rgba(255,251,224,0.55)" }}>{t.hero.headline2}</span>
              <br />
              {t.hero.headline3}
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 300, color: "#c8905a", letterSpacing: "-0.01em" }}>
                {t.hero.headline4}
              </em>
            </h1>

            {/* Tagline */}
            <p style={{
              color: isMobile ? "rgba(255,251,224,0.75)" : "rgba(255,251,224,0.5)",
              fontSize: "clamp(13px, 1.5vw, 18px)",
              fontWeight: 300, lineHeight: 1.75, letterSpacing: "0.02em",
              margin: 0, marginBottom: isMobile ? "28px" : "52px",
              maxWidth: "440px",
              textShadow: isMobile ? "0 1px 8px rgba(0,0,0,0.5)" : "none",
            }}>
              {t.hero.tagline}
              <br />
              {t.hero.subtagline}
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={scrollToPortfolio}
                style={{
                  backgroundColor: "#fffbe0", color: "#1a0c04", border: "none",
                  padding: isMobile ? "14px 28px" : "16px 40px",
                  fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em",
                  textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.25s ease",
                  flex: isMobile ? 1 : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#c8905a"; e.currentTarget.style.color = "#fffbe0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fffbe0"; e.currentTarget.style.color = "#1a0c04"; }}
              >
                {t.hero.viewPortfolio}
              </button>
              <button
                onClick={() => { const el = document.getElementById("contact"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
                style={{
                  backgroundColor: "transparent", color: "rgba(255,251,224,0.7)",
                  border: "1px solid rgba(255,251,224,0.2)",
                  padding: isMobile ? "14px 28px" : "16px 40px",
                  fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em",
                  textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.25s ease",
                  flex: isMobile ? 1 : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.5)"; e.currentTarget.style.color = "#fffbe0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)"; e.currentTarget.style.color = "rgba(255,251,224,0.7)"; }}
              >
                {t.hero.bookShoot}
              </button>
            </div>
          </div>

          {/* Right — Film Frame — desktop only */}
          <div className="hidden lg:block" style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              position: "relative", border: "1px solid rgba(255,251,224,0.15)",
              padding: "8px", boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px", paddingLeft: "4px", paddingRight: "4px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: "6px", backgroundColor: "rgba(255,251,224,0.12)", border: "1px solid rgba(255,251,224,0.06)" }} />
                ))}
              </div>
              <ImageWithFallback src={image__MAJ2869_1_} alt="Recent shoot showcase" style={{ width: "360px", height: "480px", objectFit: "cover", display: "block", filter: "contrast(1.05) saturate(0.85)" }} />
              <div style={{ display: "flex", gap: "4px", marginTop: "6px", paddingLeft: "4px", paddingRight: "4px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: "6px", backgroundColor: "rgba(255,251,224,0.12)", border: "1px solid rgba(255,251,224,0.06)" }} />
                ))}
              </div>
              <div style={{ position: "absolute", bottom: "22px", left: "16px", right: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "8px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>PDC — 2026</span>
                <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "8px", fontFamily: "'Courier New', monospace", letterSpacing: "0.15em" }}>35mm / ƒ1.4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row — stats + scroll indicator */}
        <div style={{
          position: "absolute",
          bottom: isMobile ? "20px" : "40px",
          left: isMobile ? "20px" : "40px",
          right: isMobile ? "20px" : "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}>
          

          {/* Scroll indicator — hide on mobile */}
          {!isMobile && (
            null
          )}
        </div>
      </div>

      <style>{`
        @keyframes scrollDot {
          0% { top: -40%; }
          100% { top: 100%; }
        }
      `}</style>
    </section>
  );
}