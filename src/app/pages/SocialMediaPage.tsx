import { Helmet } from "react-helmet-async";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { portalFetch } from "../../lib/supabase";
import { useAdTracking, getStoredAdRef } from "../hooks/useAdTracking";
import { useLanguage } from "../context/LanguageContext";
import { EMAIL_INPUT, PHONE_INPUT, PublicInput, PublicTextarea } from "../components/form/PublicField";
import heroSmall from "@/assets/web/majd-800.webp";
import heroImage from "@/assets/web/majd-1365.webp";
import { HIGH_PRIORITY } from "../lib/images";

export function SocialMediaPage() {
  useAdTracking("/services/social-media");
  const { t } = useLanguage();
  const ts = t.socialMediaPage;

  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    // A fixed field stops being flagged as soon as it is fixed.
    if (field === "name") setErrors((x) => ({ ...x, name: undefined }));
    if (field === "email" || field === "phone") setErrors((x) => ({ ...x, contact: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = {
      name: form.name.trim() ? undefined : ts.errorName,
      contact: form.email.trim() || form.phone.trim() ? undefined : ts.errorContact,
    };
    setErrors(found);
    if (found.name || found.contact) {
      (found.name ? nameInput : emailInput).current?.focus();
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
      setError(ts.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

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
        <title>Social media beheer voor automotive | PhotoDeCaffeine</title>
        <meta name="description" content="Content en social media beheer voor autobedrijven, dealers en particuliere eigenaren. Fotografie, video en een consistente social media aanwezigheid — door heel Nederland." />
        <link rel="canonical" href="https://www.photodecaffeine.com/services/social-media" />
        <meta property="og:title" content="Social media beheer voor automotive | PhotoDeCaffeine" />
        <meta property="og:description" content="Content en social media beheer voor autobedrijven, dealers en particuliere eigenaren — door heel Nederland." />
        <meta property="og:url" content="https://www.photodecaffeine.com/services/social-media" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Social media beheer voor automotive | PhotoDeCaffeine" />
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
        className="pdc-svc-head"
        style={{
          backgroundColor: "#0d0703",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <Link to="/" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {ts.backLabel}
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
                {ts.sectionLabel}
              </span>
              <h1
                className="pdc-svc-title pdc-svc-title--social"
                style={{
                  color: "#fffbe0",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {ts.titleLine1}
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
                  {ts.titleLine2}
                </em>
              </h1>
            </div>
            <p
              className="pdc-desktop-only"
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                maxWidth: "320px",
                textAlign: "right",
              }}
            >
              {ts.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div className="pdc-svc-hero" style={{ position: "relative", minHeight: "320px", overflow: "hidden" }}>
        <img
          src={heroImage}
          srcSet={`${heroSmall} 800w, ${heroImage} 1365w`}
          sizes="100vw"
          width={1365}
          height={2048}
          {...HIGH_PRIORITY}
          alt={ts.heroAlt}
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
        className="pdc-svc-intro"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "rgba(255,251,224,0.55)",
            fontSize: "14px",
            fontWeight: 400,
            lineHeight: 1.85,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          {ts.introStart}{" "}
          <strong style={{ color: "rgba(255,251,224,0.8)" }}>{ts.introStrong}</strong>{" "}
          {ts.introEnd}
        </p>
      </div>

      {/* ── What's included + form ── */}
      <div
        className="pdc-svc-body"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          alignItems: "start",
        }}
      >
        {/* Left — what's included */}
        <div>
          <h2
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              display: "block",
              margin: "0 0 24px",
            }}
          >
            {ts.includedLabel}
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {ts.included.map((item) => (
              <li
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
                  aria-hidden="true"
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
              </li>
            ))}
          </ul>

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
                color: "rgba(255,251,224,0.5)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "12px",
              }}
            >
              {ts.packagesLabel}
            </span>
            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "13px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {ts.packagesBody}
            </p>
          </div>
        </div>

        {/* Right — request form */}
        <div id="boeken" style={{ scrollMarginTop: "96px" }}>
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
            {ts.requestLabel}
          </span>
          <h2
            className="pdc-svc-form-title"
            style={{
              color: "#fffbe0",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            {ts.formTitle}
          </h2>
          <p
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "13px",
              fontWeight: 300,
              lineHeight: 1.7,
              margin: "0 0 40px",
            }}
          >
            {ts.formSubtitle}
          </p>

          {submitted ? (
            <div
              role="status"
              style={{
                border: "1px solid rgba(200,144,90,0.3)",
                padding: "48px 36px",
                textAlign: "center",
              }}
            >
              <div aria-hidden="true" style={{ color: "#c8905a", fontSize: "28px", marginBottom: "20px" }}>✓</div>
              <h3
                ref={successHeading}
                tabIndex={-1}
                style={{
                  color: "#fffbe0",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  margin: "0 0 12px",
                  outline: "none",
                }}
              >
                {ts.successTitle}
              </h3>
              <p
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "13px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {ts.successBody}
              </p>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              <PublicInput
                ref={nameInput}
                label={ts.nameLabel}
                name="name"
                autoComplete="name"
                aria-required="true"
                value={form.name}
                onChange={set("name")}
                placeholder={ts.namePlaceholder}
                error={errors.name}
              />
              <PublicInput
                ref={emailInput}
                label={ts.emailLabel}
                name="email"
                {...EMAIL_INPUT}
                value={form.email}
                onChange={set("email")}
                placeholder={t.contact.emailPlaceholder}
                aria-invalid={errors.contact ? true : undefined}
              />
              <PublicInput
                label={ts.phoneLabel}
                name="phone"
                {...PHONE_INPUT}
                value={form.phone}
                onChange={set("phone")}
                placeholder={ts.phonePlaceholder}
                hint={ts.phoneHint}
                error={errors.contact}
              />
              <PublicInput
                label={ts.companyLabel}
                name="organization"
                autoComplete="organization"
                value={form.company}
                onChange={set("company")}
                placeholder={ts.companyPlaceholder}
              />
              <PublicTextarea
                label={ts.messageLabel}
                name="message"
                autoComplete="off"
                rows={3}
                value={form.message}
                onChange={set("message")}
                placeholder={ts.messagePlaceholder}
              />

              {error && (
                <p className="pdc-form-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="pdc-btn pdc-btn-solid pdc-svc-submit pdc-submit"
                disabled={loading}
                aria-busy={loading || undefined}
                style={{
                  padding: "18px 40px",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  alignSelf: "flex-start",
                }}
              >
                {loading ? ts.submitting : ts.submitButton}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Custom CTA ── */}
      <div
        className="pdc-svc-cta"
        style={{
          borderTop: "1px solid rgba(255,251,224,0.06)",
          backgroundColor: "#0d0703",
          textAlign: "center",
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
            marginBottom: "20px",
          }}
        >
          {ts.ctaLabel}
        </span>
        <h2
          className="pdc-svc-cta-title"
          style={{
            color: "#fffbe0",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            textTransform: "uppercase",
            margin: "0 0 16px",
          }}
        >
          {ts.ctaTitle} <span style={{ color: "rgba(255,251,224,0.4)" }}>{ts.ctaTitleDim}</span>
        </h2>
        <p
          style={{
            color: "rgba(255,251,224,0.5)",
            fontSize: "14px",
            fontWeight: 300,
            lineHeight: 1.7,
            maxWidth: "420px",
            margin: "0 auto 40px",
          }}
        >
          {ts.ctaBody}
        </p>
        <Link
          to="/services/automotive"
          className="pdc-btn pdc-btn-invert"
          style={{ padding: "13px 32px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", borderColor: "rgba(255,251,224,0.3)" }}
        >
          {ts.ctaButton}
        </Link>
      </div>
    </div>
  );
}
