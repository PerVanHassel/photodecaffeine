import { Helmet } from "react-helmet-async";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { FormPrivacyNote } from "../components/form/FormPrivacyNote";
import { track } from "../lib/analytics";
import type { InquiryForm } from "./ThankYouPage";
import { portalFetch } from "../../lib/supabase";
import { useLanguage } from "../context/LanguageContext";
import { AUTOMOTIVE_GALLERY_TITLE, usePortfolio, visibleArticles } from "../lib/siteData";
import { PortfolioTile } from "../components/PortfolioTile";
import { useAdTracking, getStoredAdRef } from "../hooks/useAdTracking";
import { ArrowLeft } from "lucide-react";
import heroSmall from "@/assets/web/automotive-hero-1000.webp";
import heroImage from "@/assets/web/automotive-hero-1920.webp";
import { HIGH_PRIORITY } from "../lib/images";
import { EMAIL_INPUT, PHONE_INPUT, PublicInput } from "../components/form/PublicField";

export function AutomotivePage() {
  useAdTracking("/services/automotive");

  const { t } = useLanguage();
  const ta = t.automotivePage;

  const articles = usePortfolio().data;
  const galleryImages = articles?.find((a) => a.title === AUTOMOTIVE_GALLERY_TITLE)?.galleryUrls ?? [];
  // The latest automotive shoots from the portfolio, so the page links to real work.
  const recentShoots = (visibleArticles(articles) ?? []).filter((a) => /automotive/i.test(a.category)).slice(0, 3);

  const [form, setForm] = useState({ name: "", email: "", phone: "", carBrand: "", date: "", location: "" });
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);


  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    // A fixed field stops being flagged as soon as it is fixed.
    if (field === "name") setErrors((x) => ({ ...x, name: undefined }));
    if (field === "email" || field === "phone") setErrors((x) => ({ ...x, contact: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = {
      name: form.name.trim() ? undefined : ta.errorName,
      contact: form.email.trim() || form.phone.trim() ? undefined : ta.errorContact,
    };
    setErrors(found);
    if (found.name || found.contact) {
      (found.name ? nameInput : emailInput).current?.focus();
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
      const sent: InquiryForm = "automotive";
      track("Aanvraag", { formulier: "automotive" });
      navigate("/bedankt", { state: { from: sent } });
    } catch {
      setError(ta.errorGeneric);
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
        <title>Automotive fotografie — auto's & motoren | PhotoDeCaffeine</title>
        <meta name="description" content="Professionele automotive fotografie door heel Nederland. Auto's, motoren en de mensen erachter — voor showrooms, dealers en particuliere eigenaren. Vanaf €50." />
        <link rel="canonical" href="https://www.photodecaffeine.com/services/automotive" />
        <meta property="og:title" content="Automotive fotografie — auto's & motoren | PhotoDeCaffeine" />
        <meta property="og:description" content="Professionele automotive fotografie door heel Nederland. Voor showrooms, dealers en particuliere eigenaren. Vanaf €50." />
        <meta property="og:url" content="https://www.photodecaffeine.com/services/automotive" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Automotive fotografie — auto's & motoren | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Professionele automotive fotografie door heel Nederland. Voor showrooms, dealers en particuliere eigenaren. Vanaf €50." />
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
        className="pdc-svc-head"
        style={{
          backgroundColor: "#0d0703",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <Link to="/" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {ta.backLabel}
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
                {ta.sectionLabel}
              </span>
              <h1
                className="pdc-svc-title"
                style={{
                  color: "#fffbe0",
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
                  Fotografie & film
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
              {ta.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div className="pdc-svc-hero" style={{ position: "relative", minHeight: "320px", overflow: "hidden" }}>
        <img
          src={heroImage}
          srcSet={`${heroSmall} 1000w, ${heroImage} 1920w`}
          sizes="100vw"
          width={1920}
          height={2891}
          {...HIGH_PRIORITY}
          alt="Automotive fotograaf — buitenshoot sportwagen"
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
          {ta.introStart}{" "}
          <strong style={{ color: "rgba(255,251,224,0.8)" }}>{ta.introStrong}</strong>{" "}
          {ta.introEnd}
        </p>
      </div>

      {/* ── Package + booking ── */}
      <div
        className="pdc-svc-body"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          alignItems: "start",
        }}
      >
        {/* Left — package details */}
        <div>
          {/* Price */}
          <div style={{ marginBottom: "48px" }}>
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
                className="pdc-svc-price"
                style={{
                  color: "#fffbe0",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                €50
              </span>
              <span
                style={{
                  color: "rgba(255,251,224,0.5)",
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
                color: "rgba(255,251,224,0.5)",
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
                color: "rgba(255,251,224,0.5)",
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
                color: "rgba(255,251,224,0.5)",
                fontSize: "13px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: "0 0 20px",
              }}
            >
              {ta.package2Body}
            </p>
            <Link
              to="/#contact"
              className="pdc-btn pdc-btn-quiet"
              style={{ padding: "10px 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em" }}
            >
              {ta.package2Button}
            </Link>
          </div>
        </div>

        {/* Right — booking form */}
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
            {ta.bookLabel}
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
            {ta.bookTitle}
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
            {ta.bookSubtitle}
          </p>

          <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <PublicInput
              ref={nameInput}
              label={ta.nameLabel}
              name="name"
              autoComplete="name"
              aria-required="true"
              value={form.name}
              onChange={set("name")}
              placeholder={ta.namePlaceholder}
              error={errors.name}
            />
            <PublicInput
              ref={emailInput}
              label={ta.emailLabel}
              name="email"
              {...EMAIL_INPUT}
              value={form.email}
              onChange={set("email")}
              placeholder={t.contact.emailPlaceholder}
              aria-invalid={errors.contact ? true : undefined}
            />
            <PublicInput
              label={ta.phoneLabel}
              name="phone"
              {...PHONE_INPUT}
              value={form.phone}
              onChange={set("phone")}
              placeholder={ta.phonePlaceholder}
              hint={ta.phoneHint}
              error={errors.contact}
            />
            <PublicInput
              label={ta.carBrandLabel}
              name="vehicle"
              autoComplete="off"
              value={form.carBrand}
              onChange={set("carBrand")}
              placeholder={ta.carBrandPlaceholder}
            />
            <PublicInput
              label={ta.dateLabel}
              name="preferred-date"
              autoComplete="off"
              value={form.date}
              onChange={set("date")}
              placeholder={ta.datePlaceholder}
            />
            <PublicInput
              label={ta.locationLabel}
              name="preferred-location"
              autoComplete="off"
              value={form.location}
              onChange={set("location")}
              placeholder={ta.locationPlaceholder}
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
              {loading ? ta.submitting : ta.submitButton}
            </button>
            <FormPrivacyNote />
          </form>
        </div>
      </div>

      {/* ── Gallery strip — only when images are available ── */}
      {galleryImages.length > 0 && (
        <div
          className="pdc-svc-gallery"
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "grid",
            gap: "3px",
          }}
        >
          {galleryImages.map((src, i) => (
            <div key={i} style={{ aspectRatio: "4/3", overflow: "hidden" }}>
              <img
                src={src}
                alt={ta.galleryAlt(i + 1)}
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

      {recentShoots.length > 0 && (
        <section className="pdc-svc-recent" aria-labelledby="recent-shoots">
          <h2 id="recent-shoots" className="pdc-svc-recent-label">{ta.recentLabel}</h2>
          <div className="pdc-svc-recent-grid">
            {recentShoots.map((item) => (
              <div key={item.id}>
                <PortfolioTile item={item} layout="fill" />
              </div>
            ))}
          </div>
          <Link to="/portfolio" className="pdc-text-link">
            {ta.recentLink}
          </Link>
        </section>
      )}

      {/* ── Custom packages CTA ── */}
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
          {ta.customLabel}
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
          {ta.customTitle}{" "}
          <span style={{ color: "rgba(255,251,224,0.4)" }}>{ta.customTitleDim}</span>
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
          {ta.customBody}
        </p>
        <Link
          to="/#contact"
          className="pdc-btn pdc-btn-invert"
          style={{ padding: "13px 32px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", borderColor: "rgba(255,251,224,0.3)" }}
        >
          {ta.customButton}
        </Link>
      </div>
    </div>
  );
}
