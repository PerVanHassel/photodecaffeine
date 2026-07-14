import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { portalFetch } from "../../lib/supabase";
import { useMobile } from "../hooks/useMobile";
import { useLanguage } from "../context/LanguageContext";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { useAdTracking, getStoredAdRef } from "../hooks/useAdTracking";
import { ArrowLeft } from "lucide-react";
import heroImage from "@/imports/_DSC0893.jpg";

const GALLERY_TITLE = "__automotive_gallery__";

export function AutomotivePage() {
  useAdTracking("/services/automotive");

  const navigate = useNavigate();
  const isMobile = useMobile();
  const { t } = useLanguage();
  const ta = t.automotivePage;

  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/portfolio`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const article = (data.articles || []).find(
          (a: { title: string; galleryUrls: string[] }) => a.title === GALLERY_TITLE
        );
        if (article?.galleryUrls?.length) {
          setGalleryImages(article.galleryUrls);
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({ name: "", email: "", phone: "", carBrand: "", date: "", location: "" });
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(ta.errorName);
      return;
    }
    if (!form.email && !form.phone) {
      setError(ta.errorContact);
      return;
    }
    setLoading(true);
    setError(null);
    const details = [
      form.carBrand && `Vehicle: ${form.carBrand}`,
      form.date && `Date: ${form.date}`,
      form.location && `Location: ${form.location}`,
    ].filter(Boolean).join("\n");
    try {
      await portalFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          package: "automotive",
          brand: "",
          message: `Automotive package booking — €50 per vehicle, 1 hour on location.${details ? `\n\n${details}` : ""}${getStoredAdRef() ? `\n\n[ref:${getStoredAdRef()}]` : ""}`,
        }),
      });
      setSubmitted(true);
    } catch {
      setError(ta.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: `1px solid ${focused === field ? "rgba(255,251,224,0.5)" : "rgba(255,251,224,0.12)"}`,
    color: "#fffbe0",
    fontSize: "15px",
    fontWeight: 300,
    fontFamily: "'Inter', sans-serif",
    padding: "16px 0",
    outline: "none",
    letterSpacing: "0.02em",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box" as const,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080401",
        color: "#fffbe0",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "72px",
      }}
    >
      <Helmet>
        <title>Automotive Fotografie Rotterdam | PhotoDeCaffeine</title>
        <meta name="description" content="Professionele automotive fotografie in Rotterdam en omgeving. Scherpe beelden voor showrooms, dealers en particulieren. Meerdere voertuigen mogelijk. Vanaf €50." />
        <link rel="canonical" href="https://www.photodecaffeine.com/services/automotive" />
        <meta property="og:title" content="Automotive Fotografie Rotterdam | PhotoDeCaffeine" />
        <meta property="og:description" content="Professionele automotive fotografie in Rotterdam. Voor showrooms, dealers en particulieren. Vanaf €50." />
        <meta property="og:url" content="https://www.photodecaffeine.com/services/automotive" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Automotive Fotografie Rotterdam | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Professionele automotive fotografie in Rotterdam. Voor showrooms, dealers en particulieren. Vanaf €50." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Automotive Fotografie", "item": "https://www.photodecaffeine.com/services/automotive" }
          ]
        })}</script>
      </Helmet>
      {/* ── Header ── */}
      <div
        style={{
          backgroundColor: "#0d0703",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          padding: isMobile ? "60px 20px 48px" : "80px 40px 64px",
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
              padding: 0,
              marginBottom: "40px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <ArrowLeft size={14} />
            {ta.backLabel}
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
                {ta.sectionLabel}
              </span>
              <h1
                style={{
                  color: "#fffbe0",
                  fontSize: isMobile ? "clamp(40px, 12vw, 72px)" : "clamp(48px, 7vw, 88px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Automotive
                <br />
                <em
                  style={{
                    fontStyle: "italic",
                    fontWeight: 300,
                    color: "#c8905a",
                    fontSize: "0.78em",
                    textTransform: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Photography & Film
                </em>
              </h1>
            </div>
            {!isMobile && (
              <p
                style={{
                  color: "rgba(255,251,224,0.35)",
                  fontSize: "14px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  margin: 0,
                  maxWidth: "320px",
                  textAlign: "right",
                }}
              >
                {ta.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div style={{ position: "relative", height: isMobile ? "60vw" : "65vh", minHeight: "320px", overflow: "hidden" }}>
        <img
          src={heroImage}
          alt="Automotive fotograaf Rotterdam — buitenshoot sportwagen"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 40%",
            filter: "brightness(0.5) contrast(1.08) saturate(0.7)",
          }}
        />
      </div>

      {/* ── Keyword intro ── */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: isMobile ? "48px 20px 0" : "72px 40px 0",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "rgba(255,251,224,0.55)",
            fontSize: "14px",
            fontWeight: 400,
            lineHeight: 1.85,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          Als{" "}
          <strong style={{ color: "rgba(255,251,224,0.8)" }}>automotive fotograaf in Rotterdam</strong>{" "}
          fotografeer ik personenauto's, sportauto's, oldtimers en bedrijfswagens voor dealerships,
          showrooms en particuliere eigenaren. Een shoot duurt circa één uur op locatie — in Rotterdam
          of in heel Nederland — en levert scherpe, klaargestoomde beelden op die direct inzetbaar zijn
          voor social media, advertenties of jouw website.
        </h2>
      </div>

      {/* ── Package + booking ── */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "60px 20px" : "100px 40px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "56px" : "100px",
          alignItems: "start",
        }}
      >
        {/* Left — package details */}
        <div>
          {/* Price */}
          <div style={{ marginBottom: "48px" }}>
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
              {ta.packageLabel}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  color: "#fffbe0",
                  fontSize: isMobile ? "64px" : "80px",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                €50
              </span>
              <span
                style={{
                  color: "rgba(255,251,224,0.3)",
                  fontSize: "13px",
                  fontWeight: 300,
                  letterSpacing: "0.05em",
                  paddingBottom: "12px",
                }}
              >
                {ta.perVehicle}
              </span>
            </div>
            <div style={{ width: "32px", height: "1px", backgroundColor: "#c8905a" }} />
          </div>

          {/* What's included */}
          <div>
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
              {ta.includedLabel}
            </span>
            {ta.included.map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "15px 0",
                  borderBottom: "1px solid rgba(255,251,224,0.06)",
                }}
              >
                <span
                  style={{
                    color: "#c8905a",
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: "'Courier New', monospace",
                    flexShrink: 0,
                  }}
                >
                  —
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 400,
                    color: "rgba(255,251,224,0.65)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Second package — custom/multi-vehicle */}
          <div
            style={{
              marginTop: "48px",
              border: "1px solid rgba(255,251,224,0.08)",
              padding: "32px",
              backgroundColor: "rgba(255,251,224,0.02)",
            }}
          >
            <span
              style={{
                color: "rgba(255,251,224,0.3)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "12px",
              }}
            >
              {ta.package2Label}
            </span>
            <div
              style={{
                color: "#fffbe0",
                fontSize: "22px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              {ta.package2Title}
            </div>
            <p
              style={{
                color: "rgba(255,251,224,0.45)",
                fontSize: "13px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: "0 0 20px",
              }}
            >
              {ta.package2Body}
            </p>
            <button
              onClick={() => navigate("/", { state: { scrollTo: "contact" } })}
              style={{
                background: "none",
                border: "1px solid rgba(255,251,224,0.2)",
                color: "rgba(255,251,224,0.6)",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: "10px 20px",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)"; e.currentTarget.style.color = "#fffbe0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)"; e.currentTarget.style.color = "rgba(255,251,224,0.6)"; }}
            >
              {ta.package2Button}
            </button>
          </div>
        </div>

        {/* Right — booking form */}
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
            {ta.bookLabel}
          </span>
          <h2
            style={{
              color: "#fffbe0",
              fontSize: isMobile ? "28px" : "clamp(28px, 3vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            {ta.bookTitle}
          </h2>
          <p
            style={{
              color: "rgba(255,251,224,0.35)",
              fontSize: "13px",
              fontWeight: 300,
              lineHeight: 1.7,
              margin: "0 0 40px",
            }}
          >
            {ta.bookSubtitle}
          </p>

          {submitted ? (
            <div
              style={{
                border: "1px solid rgba(200,144,90,0.3)",
                padding: "48px 36px",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#c8905a", fontSize: "28px", marginBottom: "20px" }}>✓</div>
              <h4
                style={{
                  color: "#fffbe0",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  margin: "0 0 12px",
                }}
              >
                {ta.successTitle}
              </h4>
              <p
                style={{
                  color: "rgba(255,251,224,0.4)",
                  fontSize: "13px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {ta.successBody}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Name */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {ta.namePlaceholder}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  placeholder={ta.namePlaceholder}
                  style={inputStyle("name")}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {ta.emailLabel}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="your@email.com"
                  style={inputStyle("email")}
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {ta.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onFocus={() => setFocused("phone")}
                  onBlur={() => setFocused(null)}
                  placeholder={ta.phonePlaceholder}
                  style={inputStyle("phone")}
                />
                <p
                  style={{
                    color: "rgba(255,251,224,0.2)",
                    fontSize: "10px",
                    fontWeight: 300,
                    margin: "8px 0 0",
                    letterSpacing: "0.02em",
                  }}
                >
                  {ta.phoneHint}
                </p>
              </div>

              {/* Car brand/model */}
              <div>
                <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  {ta.carBrandLabel}
                </label>
                <input
                  type="text"
                  value={form.carBrand}
                  onChange={(e) => setForm({ ...form, carBrand: e.target.value })}
                  onFocus={() => setFocused("carBrand")}
                  onBlur={() => setFocused(null)}
                  placeholder={ta.carBrandPlaceholder}
                  style={inputStyle("carBrand")}
                />
              </div>

              {/* Preferred date */}
              <div>
                <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  {ta.dateLabel}
                </label>
                <input
                  type="text"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  onFocus={() => setFocused("date")}
                  onBlur={() => setFocused(null)}
                  placeholder={ta.datePlaceholder}
                  style={inputStyle("date")}
                />
              </div>

              {/* Location */}
              <div>
                <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  {ta.locationLabel}
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  onFocus={() => setFocused("location")}
                  onBlur={() => setFocused(null)}
                  placeholder={ta.locationPlaceholder}
                  style={inputStyle("location")}
                />
              </div>

              {error && (
                <p style={{ color: "#e87c6a", fontSize: "12px", fontWeight: 400, margin: 0, lineHeight: 1.6 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#6b5a3e" : "#fffbe0",
                  color: loading ? "rgba(255,251,224,0.5)" : "#1a0c04",
                  border: "none",
                  padding: "18px 40px",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.25s ease",
                  alignSelf: "flex-start",
                  width: isMobile ? "100%" : "auto",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#c8905a";
                    e.currentTarget.style.color = "#fffbe0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#fffbe0";
                    e.currentTarget.style.color = "#1a0c04";
                  }
                }}
              >
                {loading ? ta.submitting : ta.submitButton}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Gallery strip — only when images are available ── */}
      {galleryImages.length > 0 && (
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: isMobile ? "0 20px 60px" : "0 40px 80px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "3px",
          }}
        >
          {galleryImages.map((src, i) => (
            <div key={i} style={{ aspectRatio: "4/3", overflow: "hidden" }}>
              <img
                src={src}
                alt={`Automotive fotografie Rotterdam — foto ${i + 1}`}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.05) saturate(0.6) brightness(0.8)",
                  transition: "transform 0.6s ease",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Custom packages CTA ── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,251,224,0.06)",
          backgroundColor: "#0d0703",
          padding: isMobile ? "60px 20px" : "80px 40px",
          textAlign: "center",
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
            marginBottom: "20px",
          }}
        >
          {ta.customLabel}
        </span>
        <h2
          style={{
            color: "#fffbe0",
            fontSize: isMobile ? "clamp(28px, 8vw, 48px)" : "clamp(28px, 4vw, 52px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            textTransform: "uppercase",
            margin: "0 0 16px",
          }}
        >
          {ta.customTitle}{" "}
          <span style={{ color: "rgba(255,251,224,0.3)" }}>{ta.customTitleDim}</span>
        </h2>
        <p
          style={{
            color: "rgba(255,251,224,0.35)",
            fontSize: "14px",
            fontWeight: 300,
            lineHeight: 1.7,
            maxWidth: "420px",
            margin: "0 auto 40px",
          }}
        >
          {ta.customBody}
        </p>
        <button
          onClick={() => navigate("/", { state: { scrollTo: "contact" } })}
          style={{
            background: "none",
            border: "1px solid rgba(255,251,224,0.3)",
            color: "#fffbe0",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "13px 32px",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#fffbe0";
            e.currentTarget.style.color = "#1a0c04";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#fffbe0";
          }}
        >
          {ta.customButton}
        </button>
      </div>
    </div>
  );
}
