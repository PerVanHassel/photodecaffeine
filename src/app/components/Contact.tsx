import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";
import { portalFetch } from "../../lib/supabase";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    brand: "",
    message: "",
    package: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const { t } = useLanguage();
  const isMobile = useMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await portalFetch("/contact", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: `1px solid ${
      focused === field
        ? "rgba(255,251,224,0.5)"
        : "rgba(255,251,224,0.12)"
    }`,
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
    <section
      id="contact"
      style={{
        backgroundColor: "#0d0703",
        padding: "0",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "inset 0 1px 0 rgba(255,251,224,0.06)",
      }}
    >
      {/* Top CTA band */}
      <div
        style={{
          backgroundColor: "#1a0c04",
          padding: isMobile ? "64px 20px" : "100px 40px",
          textAlign: "center",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
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
            marginBottom: "28px",
          }}
        >
          {t.contact.readyLabel}
        </span>
        <h2
          style={{
            color: "#fffbe0",
            fontSize: isMobile
              ? "clamp(36px, 10vw, 60px)"
              : "clamp(40px, 6vw, 80px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.9,
            margin: 0,
            marginBottom: "32px",
            textTransform: "uppercase",
          }}
        >
          {t.contact.readyTitle1}
          <br />
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 300,
              color: "#c8905a",
            }}
          >
            {t.contact.readyTitle2}
          </em>
          <br />
          {t.contact.readyTitle3}
        </h2>
        <p
          style={{
            color: "rgba(255,251,224,0.35)",
            fontSize: "15px",
            fontWeight: 300,
            lineHeight: 1.7,
            maxWidth: "480px",
            margin: "0 auto 52px",
          }}
        >
          {t.contact.formSubtitle}
        </p>
        <a
          href="#contact-form"
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById("contact-form")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            display: "inline-block",
            backgroundColor: "#fffbe0",
            color: "#1a0c04",
            padding: isMobile ? "16px 36px" : "18px 56px",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "all 0.25s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (
              e.currentTarget as HTMLElement
            ).style.backgroundColor = "#c8905a";
            (e.currentTarget as HTMLElement).style.color =
              "#fffbe0";
          }}
          onMouseLeave={(e) => {
            (
              e.currentTarget as HTMLElement
            ).style.backgroundColor = "#fffbe0";
            (e.currentTarget as HTMLElement).style.color =
              "#1a0c04";
          }}
        >
          {t.contact.formTitle}
        </a>
      </div>

      {/* Form section */}
      <div
        id="contact-form"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "60px 20px" : "100px 40px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.6fr",
          gap: isMobile ? "48px" : "80px",
          alignItems: "start",
        }}
      >
        {/* Left — Info */}
        <div>
          <h3
            style={{
              color: "#fffbe0",
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              margin: 0,
              marginBottom: "32px",
              lineHeight: 1.1,
            }}
          >
            {t.contact.infoTitle}
          </h3>

          <div
            style={{
              width: "32px",
              height: "1px",
              backgroundColor: "#c8905a",
              marginBottom: "36px",
            }}
          />

          <p
            style={{
              color: "rgba(255,251,224,0.45)",
              fontSize: "14px",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "48px",
            }}
          >
            {t.contact.formSubtitle}
          </p>

          <div
            className="contact-info-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            <style>{`
              @media (max-width: 767px) {
                .contact-info-list {
                  gap: 20px !important;
                }
                .contact-info-item {
                  padding-bottom: 16px !important;
                }
                .contact-info-label {
                  margin-bottom: 6px !important;
                }
              }
            `}</style>
            {[
              {
                label: "Email",
                value: "contact@photodecaffeine.com",
                href: "mailto:contact@photodecaffeine.com",
                icon: "✉",
              },
              {
                label: "Phone",
                value: "+31 6 36112514",
                href: "tel:+31636112514",
                icon: "◌",
              },
              {
                label: "Location",
                value: "Roosendaal, The Netherlands & Lisbon, Portugal",
                icon: "⌖",
              },
              {
                label: "Instagram",
                value: "@photodecaffeine",
                icon: "◉",
              },
              {
                label: "Response time",
                value: t.contact.responseTime,
                icon: "◷",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="contact-info-item"
                style={{
                  borderBottom:
                    "1px solid rgba(255,251,224,0.06)",
                  paddingBottom: "24px",
                }}
              >
                <div
                  className="contact-info-label"
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {item.label}
                </div>
                {"href" in item ? (
                  <a
                    href={item.href}
                    style={{
                      color: "rgba(255,251,224,0.65)",
                      fontSize: "13px",
                      fontWeight: 300,
                      letterSpacing: "0.02em",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.9)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,251,224,0.65)"; }}
                  >
                    {item.value}
                  </a>
                ) : (
                  <div
                    style={{
                      color: "rgba(255,251,224,0.65)",
                      fontSize: "13px",
                      fontWeight: 300,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {item.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div>
          {submitted ? (
            <div
              style={{
                border: "1px solid rgba(200,144,90,0.3)",
                padding: "64px 48px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#c8905a",
                  fontSize: "32px",
                  marginBottom: "24px",
                }}
              >
                ✓
              </div>
              <h4
                style={{
                  color: "#fffbe0",
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  margin: 0,
                  marginBottom: "16px",
                }}
              >
                {t.contact.successTitle}
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
                {t.contact.successBody}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "32px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "1fr 1fr",
                  gap: "32px",
                }}
              >
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
                    {t.contact.namePlaceholder}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    placeholder={t.contact.namePlaceholder}
                    style={{ ...inputStyle("name") }}
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
                    {t.contact.emailPlaceholder}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    placeholder="your@email.com"
                    style={inputStyle("email")}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "1fr 1fr",
                  gap: "32px",
                }}
              >
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
                    {t.contact.phonePlaceholder}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                    onFocus={() => setFocused("phone")}
                    onBlur={() => setFocused(null)}
                    placeholder={t.contact.phonePlaceholder}
                    style={inputStyle("phone")}
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
                    {t.contact.brandPlaceholder}
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand: e.target.value,
                      })
                    }
                    onFocus={() => setFocused("brand")}
                    onBlur={() => setFocused(null)}
                    placeholder={t.contact.brandPlaceholder}
                    style={inputStyle("brand")}
                  />
                </div>
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
                  {t.contact.packageLabel}
                </label>
                <select
                  value={formData.package}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      package: e.target.value,
                    })
                  }
                  onFocus={() => setFocused("package")}
                  onBlur={() => setFocused(null)}
                  style={{
                    ...inputStyle("package"),
                    cursor: "pointer",
                    appearance: "none" as const,
                  }}
                >
                  <option
                    value=""
                    style={{ backgroundColor: "#1a0c04" }}
                  >
                    {t.contact.packageDefault}
                  </option>
                  <option
                    value="espresso"
                    style={{ backgroundColor: "#1a0c04" }}
                  >
                    Espresso — €890
                  </option>
                  <option
                    value="reserve"
                    style={{ backgroundColor: "#1a0c04" }}
                  >
                    Reserve — €2,400
                  </option>
                  <option
                    value="blend"
                    style={{ backgroundColor: "#1a0c04" }}
                  >
                    Blend Retainer — €1,200/mo
                  </option>
                  <option
                    value="custom"
                    style={{ backgroundColor: "#1a0c04" }}
                  >
                    Custom / Not Sure Yet
                  </option>
                </select>
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
                  {t.contact.messagePlaceholder}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      message: e.target.value,
                    })
                  }
                  onFocus={() => setFocused("message")}
                  onBlur={() => setFocused(null)}
                  placeholder={t.contact.messagePlaceholder}
                  style={{
                    ...inputStyle("message"),
                    resize: "none",
                    paddingTop: "16px",
                  }}
                />
              </div>

              {error && (
                <p
                  style={{
                    color: "#e87c6a",
                    fontSize: "12px",
                    fontWeight: 400,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
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
                  alignSelf: isMobile ? "stretch" : "flex-start",
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
                {loading ? "Sending..." : t.contact.sendButton}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      
    </section>
  );
}