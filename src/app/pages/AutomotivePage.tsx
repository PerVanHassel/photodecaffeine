import { useState } from "react";
import { useNavigate } from "react-router";
import { portalFetch } from "../../lib/supabase";
import { useMobile } from "../hooks/useMobile";
import { useLanguage } from "../context/LanguageContext";
import heroImage from "@/imports/_DSC0014.jpg";

export function AutomotivePage() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { t } = useLanguage();
  const ta = t.automotivePage;

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email && !form.phone) {
      setError(ta.errorContact);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await portalFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          package: "automotive",
          brand: "",
          message: "Automotive package booking — €50 per vehicle.",
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
            ← {ta.backLabel}
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
      <div style={{ position: "relative", height: isMobile ? "45vw" : "52vh", minHeight: "280px", overflow: "hidden" }}>
        <img
          src={heroImage}
          alt="Automotive photography shoot"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.45) contrast(1.05) saturate(0.65)",
          }}
        />
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
                  Name
                </label>
                <input
                  type="text"
                  required
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

      {/* ── Gallery strip ── */}
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
        {[
          "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=800&q=80",
        ].map((src, i) => (
          <div key={i} style={{ aspectRatio: "4/3", overflow: "hidden" }}>
            <img
              src={src}
              alt={`Automotive example ${i + 1}`}
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
          onClick={() => {
            navigate("/");
            setTimeout(() => {
              document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
            }, 300);
          }}
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
