import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useNavigate } from "react-router";
import { portalFetch } from "../../lib/supabase";
import { useMobile } from "../hooks/useMobile";
import { useAdTracking, getStoredAdRef } from "../hooks/useAdTracking";
import { ArrowLeft } from "lucide-react";
import heroImage from "@/imports/IMG_9694.jpg";

const INCLUDED = [
  "Contentplanning afgestemd op jouw merk",
  "Fotografie & video op locatie",
  "Posting & community beheer",
  "Vast aanspreekpunt, geen wisselend team",
];

export function SocialMediaPage() {
  useAdTracking("/services/social-media");

  const navigate = useNavigate();
  const isMobile = useMobile();

  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vul je naam in.");
      return;
    }
    if (!form.email && !form.phone) {
      setError("Vul minimaal een e-mailadres of telefoonnummer in.");
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
          package: "social-media",
          brand: form.company,
          message: `Social media beheer aanvraag.${form.message ? `\n\n${form.message}` : ""}${getStoredAdRef() ? `\n\n[ref:${getStoredAdRef()}]` : ""}`,
        }),
      });
      setSubmitted(true);
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw of neem direct contact op.");
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
        <title>Social Media Beheer voor Automotive | PhotoDeCaffeine</title>
        <meta name="description" content="Content en social media beheer voor autobedrijven, dealers en particuliere eigenaren. Fotografie, video en een consistente social media aanwezigheid — door heel Nederland." />
        <link rel="canonical" href="https://www.photodecaffeine.com/services/social-media" />
        <meta property="og:title" content="Social Media Beheer voor Automotive | PhotoDeCaffeine" />
        <meta property="og:description" content="Content en social media beheer voor autobedrijven, dealers en particuliere eigenaren — door heel Nederland." />
        <meta property="og:url" content="https://www.photodecaffeine.com/services/social-media" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Social Media Beheer voor Automotive | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Content en social media beheer voor autobedrijven, dealers en particuliere eigenaren — door heel Nederland." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Social Media Beheer", "item": "https://www.photodecaffeine.com/services/social-media" }
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
            Diensten
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
                Diensten
              </span>
              <h1
                style={{
                  color: "#fffbe0",
                  fontSize: isMobile ? "clamp(36px, 10vw, 64px)" : "clamp(44px, 6vw, 76px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Social Media
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
                  Beheer & Content
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
                Consistente, professionele content voor je automotive merk — van shoot tot geplaatste post.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div style={{ position: "relative", height: isMobile ? "60vw" : "65vh", minHeight: "320px", overflow: "hidden" }}>
        <img
          src={heroImage}
          alt="Social media contentproductie op locatie — PhotoDeCaffeine"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
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
          Naast losse shoots verzorgen we ook{" "}
          <strong style={{ color: "rgba(255,251,224,0.8)" }}>social media beheer voor automotive</strong>{" "}
          bedrijven: dealers, showrooms, autobedrijven en particuliere eigenaren die willen opvallen op
          Instagram en TikTok. Wij regelen de content — van auto's en motoren tot de mensen erachter — en
          zorgen dat je kanalen actief en professioneel blijven, door heel Nederland.
        </h2>
      </div>

      {/* ── What's included + form ── */}
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
        {/* Left — what's included */}
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
            Wat je kunt verwachten
          </span>
          {INCLUDED.map((item) => (
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
              Pakketten
            </span>
            <p
              style={{
                color: "rgba(255,251,224,0.45)",
                fontSize: "13px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Ieder merk heeft een andere aanpak nodig, dus we stellen een voorstel op maat samen —
              vraag het hiernaast aan en we nemen binnen 24 uur contact op.
            </p>
          </div>
        </div>

        {/* Right — request form */}
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
            Vraag een voorstel aan
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
            Laat je gegevens achter
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
            Vertel kort over je bedrijf en huidige kanalen — we nemen binnen 24 uur contact op.
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
                We hebben je gegevens ontvangen
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
                We nemen binnen 24 uur contact met je op om je voorstel te bespreken. Tot snel.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
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
                  Jouw naam
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  placeholder="Jouw naam"
                  style={inputStyle("name")}
                />
              </div>

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
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="jouw@email.com"
                  style={inputStyle("email")}
                />
              </div>

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
                  Telefoonnummer
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onFocus={() => setFocused("phone")}
                  onBlur={() => setFocused(null)}
                  placeholder="+31 6 ..."
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
                  E-mail of telefoon — minimaal één verplicht
                </p>
              </div>

              <div>
                <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Bedrijfsnaam (optioneel)
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  onFocus={() => setFocused("company")}
                  onBlur={() => setFocused(null)}
                  placeholder="bijv. Autobedrijf Jansen"
                  style={inputStyle("company")}
                />
              </div>

              <div>
                <label style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Vertel over je kanalen (optioneel)
                </label>
                <input
                  type="text"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  onFocus={() => setFocused("message")}
                  onBlur={() => setFocused(null)}
                  placeholder="bijv. Instagram @autobedrijfjansen, willen vaker posten"
                  style={inputStyle("message")}
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
                {loading ? "Bezig…" : "Vraag een voorstel aan"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Custom CTA ── */}
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
          Ook losse shoot nodig?
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
          Bekijk onze <span style={{ color: "rgba(255,251,224,0.3)" }}>automotive fotografie</span>
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
          Losse shoots voor auto's en motoren, vanaf €50 per voertuig.
        </p>
        <button
          onClick={() => navigate("/services/automotive")}
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
          Naar Automotive Fotografie →
        </button>
      </div>
    </div>
  );
}
