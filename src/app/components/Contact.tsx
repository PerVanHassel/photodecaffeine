import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { track } from "../lib/analytics";
import type { InquiryForm } from "../pages/ThankYouPage";
import { Select } from "./portal/Select";
import { EMAIL_INPUT, PHONE_INPUT, PublicInput, PublicTextarea } from "./form/PublicField";
import { useLanguage } from "../context/LanguageContext";
import { portalFetch } from "../../lib/supabase";
import { getStoredAdRef } from "../hooks/useAdTracking";

const EMPTY = { name: "", email: "", phone: "", brand: "", message: "", package: "" };

export function Contact() {
  const [formData, setFormData] = useState(EMPTY);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const packageId = useId();
  const { t } = useLanguage();

  const set = (field: keyof typeof EMPTY) => (value: string) => setFormData((f) => ({ ...f, [field]: value }));

  // Screen readers hear the confirmation, and keyboard focus is not left on
  // a form that no longer exists.

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const ref = getStoredAdRef();
      await portalFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          message: ref ? `${formData.message}\n\n[ref:${ref}]` : formData.message,
        }),
      });
      const sent: InquiryForm = "contact";
      track("Aanvraag", { formulier: "contact" });
      navigate("/bedankt", { state: { from: sent } });
    } catch {
      setError(t.contact.sendError);
    } finally {
      setLoading(false);
    }
  };

  // The same packages, names and prices as the packages section.
  const packages = [
    ...t.services.packages.map((p) => ({ value: p.id, label: `${p.name} — ${p.price} ${p.per}` })),
    { value: "custom", label: t.contact.packageCustom },
  ];

  const details: { label: string; value: string; href?: string; external?: boolean }[] = [
    { label: t.contact.infoEmail, value: "contact@photodecaffeine.com", href: "mailto:contact@photodecaffeine.com" },
    { label: t.contact.infoPhone, value: "+31 6 36112514", href: "tel:+31636112514" },
    { label: t.contact.infoLocation, value: t.contact.infoLocationValue },
    { label: "Instagram", value: "@photodecaffeine", href: "https://www.instagram.com/photodecaffeine", external: true },
    { label: t.contact.infoResponse, value: t.contact.responseTime },
  ];

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
        className="pdc-contact-band"
        style={{
          backgroundColor: "#1a0c04",
          textAlign: "center",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
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
            marginBottom: "28px",
          }}
        >
          {t.contact.readyLabel}
        </span>
        <h2
          className="pdc-contact-title"
          style={{
            color: "#fffbe0",
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
            color: "rgba(255,251,224,0.5)",
            fontSize: "15px",
            fontWeight: 300,
            lineHeight: 1.7,
            maxWidth: "480px",
            margin: "0 auto 52px",
          }}
        >
          {t.contact.formSubtitle}
        </p>
        <Link
          to="#contact-form"
          className="pdc-btn pdc-btn-solid pdc-contact-cta"
          style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.22em" }}
        >
          {t.contact.formTitle}
        </Link>
      </div>

      {/* Form section */}
      <div
        id="contact-form"
        className="pdc-contact-body"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          alignItems: "start",
        }}
      >
        {/* Left — Info (shown after the form on mobile, since the CTA above scrolls straight to this section) */}
        <div className="pdc-contact-info">
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
            aria-hidden="true"
            style={{
              width: "32px",
              height: "1px",
              backgroundColor: "#c8905a",
              marginBottom: "36px",
            }}
          />

          <p
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "14px",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "48px",
            }}
          >
            {t.contact.formSubtitle}
          </p>

          <dl
            className="contact-info-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "32px",
              margin: 0,
            }}
          >
            {details.map((item) => (
              <div
                key={item.label}
                className="contact-info-item"
                style={{
                  borderBottom: "1px solid rgba(255,251,224,0.06)",
                  paddingBottom: "24px",
                }}
              >
                <dt
                  className="contact-info-label"
                  style={{
                    color: "rgba(255,251,224,0.5)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {item.label}
                </dt>
                <dd className="pdc-contact-detail" style={{ margin: 0 }}>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="pdc-contact-link"
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right — Form */}
        <div className="pdc-contact-form">
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            <div className="pdc-form-row">
              <PublicInput
                label={t.contact.nameLabel}
                name="name"
                autoComplete="name"
                required
                value={formData.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder={t.contact.namePlaceholder}
              />
              <PublicInput
                label={t.contact.emailLabel}
                name="email"
                {...EMAIL_INPUT}
                required
                value={formData.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder={t.contact.emailPlaceholder}
              />
            </div>

            <div className="pdc-form-row">
              <PublicInput
                label={t.contact.phoneLabel}
                name="phone"
                {...PHONE_INPUT}
                value={formData.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder={t.contact.phonePlaceholder}
              />
              <PublicInput
                label={t.contact.brandLabel}
                name="organization"
                autoComplete="organization"
                value={formData.brand}
                onChange={(e) => set("brand")(e.target.value)}
                placeholder={t.contact.brandPlaceholder}
              />
            </div>

            <div className="pdc-field">
              <label htmlFor={packageId} className="pdc-field-label">
                {t.contact.packageLabel}
              </label>
              <Select
                id={packageId}
                value={formData.package}
                onChange={set("package")}
                placeholder={t.contact.packageDefault}
                options={packages}
              />
            </div>

            <PublicTextarea
              label={t.contact.messageLabel}
              name="message"
              autoComplete="off"
              required
              rows={4}
              value={formData.message}
              onChange={(e) => set("message")(e.target.value)}
              placeholder={t.contact.messagePlaceholder}
            />

            {error && (
              <p className="pdc-form-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="pdc-btn pdc-btn-solid pdc-contact-submit pdc-submit"
              disabled={loading}
              aria-busy={loading || undefined}
              style={{
                padding: "18px 40px",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.22em",
              }}
            >
              {loading ? t.contact.sending : t.contact.sendButton}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
