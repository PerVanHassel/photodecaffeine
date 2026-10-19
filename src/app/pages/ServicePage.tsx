import { Helmet } from "react-helmet-async";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { FormPrivacyNote } from "../components/form/FormPrivacyNote";
import { ChoiceChips } from "../components/form/ChoiceChips";
import { EMAIL_INPUT, PHONE_INPUT, PublicInput, PublicTextarea } from "../components/form/PublicField";
import { track } from "../lib/analytics";
import { HIGH_PRIORITY } from "../lib/images";
import type { InquiryForm } from "./ThankYouPage";
import { portalFetch } from "../../lib/supabase";
import { useAdTracking, getStoredAdRef } from "../hooks/useAdTracking";
import { useLanguage } from "../context/LanguageContext";
import darkroom from "@/assets/web/darkroom-1200.webp";
import majdSmall from "@/assets/web/majd-800.webp";
import majd from "@/assets/web/majd-1365.webp";
import team from "@/assets/web/per-1600.webp";

// One page per service category: fotografie, videografie and website. The
// visitor ticks what they want within the category and sends it with the
// request, so it lands in the admin as e.g. "Fotografie: Portret, Sport".

type ServiceId = "fotografie" | "videografie" | "website";

const HERO: Record<ServiceId, { src: string; srcSet?: string; width: number; height: number; position: string }> = {
  fotografie: { src: darkroom, width: 1200, height: 802, position: "center 35%" },
  videografie: { src: majd, srcSet: `${majdSmall} 800w, ${majd} 1365w`, width: 1365, height: 2048, position: "center 30%" },
  website: { src: team, width: 1600, height: 1063, position: "center 55%" },
};

const label = {
  color: "rgba(255,251,224,0.5)",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  display: "block",
} as const;

function ServicePage({ id }: { id: ServiceId }) {
  const { t } = useLanguage();
  const ts = t.servicePages;
  const page = ts.pages.find((p) => p.id === id)!;
  const others = ts.pages.filter((p) => p.id !== id);
  const hero = HERO[id];
  useAdTracking(page.path);

  const [choices, setChoices] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    // A fixed field stops being flagged as soon as it is fixed.
    if (field === "name" || field === "email") setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = {
      name: form.name.trim() ? undefined : ts.errorName,
      email: form.email.trim() ? undefined : ts.errorEmail,
    };
    setErrors(found);
    if (found.name || found.email) {
      (found.name ? nameInput : emailInput).current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    const chosen = choices.length ? `${page.name}: ${choices.join(", ")}` : page.name;
    const ref = getStoredAdRef();
    try {
      await portalFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          package: chosen,
          brand: form.company,
          message: `Aanvraag ${chosen}.${form.message.trim() ? `\n\n${form.message.trim()}` : ""}${ref ? `\n\n[ref:${ref}]` : ""}`,
        }),
      });
      const sent: InquiryForm = "contact";
      track("Aanvraag", { formulier: page.id });
      navigate("/bedankt", { state: { from: sent } });
    } catch {
      setError(ts.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const url = `https://www.photodecaffeine.com${page.path}`;

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
        <title>{page.metaTitle}</title>
        <meta name="description" content={page.metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={page.metaTitle} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.metaTitle} />
        <meta name="twitter:description" content={page.metaDescription} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": page.name, "item": url },
          ],
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
              <span style={{ ...label, marginBottom: "16px" }}>{ts.sectionLabel}</span>
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
                {page.name}
                <br />
                <em
                  style={{
                    fontStyle: "italic",
                    fontWeight: 300,
                    color: "#c8905a",
                    fontSize: "0.6em",
                    textTransform: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {page.titleDim}
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
              {page.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div className="pdc-svc-hero" style={{ position: "relative", minHeight: "320px", overflow: "hidden" }}>
        <img
          src={hero.src}
          srcSet={hero.srcSet}
          sizes={hero.srcSet ? "100vw" : undefined}
          width={hero.width}
          height={hero.height}
          {...HIGH_PRIORITY}
          alt={page.heroAlt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: hero.position,
            filter: "brightness(0.5) contrast(1.08) saturate(0.7)",
          }}
        />
      </div>

      {/* ── Keyword intro ── */}
      <div className="pdc-svc-intro" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
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
          {page.introStart} <strong style={{ color: "rgba(255,251,224,0.8)" }}>{page.introStrong}</strong> {page.introEnd}
        </p>
      </div>

      {/* ── What to expect + the request form ── */}
      <div
        className="pdc-svc-body"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          alignItems: "start",
        }}
      >
        <div>
          <h2 style={{ ...label, margin: "0 0 24px" }}>{ts.includedLabel}</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {page.included.map((item) => (
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
                  •
                </span>
                <span style={{ fontSize: "13px", fontWeight: 400, color: "rgba(255,251,224,0.65)", letterSpacing: "0.02em" }}>
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
            <span style={{ ...label, fontSize: "9px", fontWeight: 600, marginBottom: "12px" }}>{ts.priceLabel}</span>
            <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "13px", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
              {ts.priceBody}
            </p>
          </div>

          {page.note && (
            <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "13px", fontWeight: 300, lineHeight: 1.7, margin: "32px 0 0" }}>
              {page.note.text}{" "}
              <Link to={page.note.to} className="pdc-text-link" style={{ whiteSpace: "nowrap" }}>
                {page.note.link}
              </Link>
            </p>
          )}
        </div>

        <div id="boeken" style={{ scrollMarginTop: "96px" }}>
          <span style={{ ...label, marginBottom: "16px" }}>{ts.requestLabel}</span>
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
          <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "13px", fontWeight: 300, lineHeight: 1.7, margin: "0 0 40px" }}>
            {ts.formSubtitle}
          </p>

          <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <ChoiceChips legend={ts.chooseLabel} hint={ts.chooseHint} options={page.options} value={choices} onChange={setChoices} />
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
              aria-required="true"
              value={form.email}
              onChange={set("email")}
              placeholder={t.contact.emailPlaceholder}
              error={errors.email}
            />
            <PublicInput
              label={ts.phoneLabel}
              name="phone"
              {...PHONE_INPUT}
              value={form.phone}
              onChange={set("phone")}
              placeholder={ts.phonePlaceholder}
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
            <FormPrivacyNote />
          </form>
        </div>
      </div>

      {/* ── The other two categories ── */}
      <div
        className="pdc-svc-cta"
        style={{
          borderTop: "1px solid rgba(255,251,224,0.06)",
          backgroundColor: "#0d0703",
          textAlign: "center",
        }}
      >
        <span style={{ ...label, marginBottom: "20px" }}>{ts.otherLabel}</span>
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
          {ts.otherTitle} <span style={{ color: "rgba(255,251,224,0.4)" }}>{ts.otherTitleDim}</span>
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
          {ts.otherBody}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {others.map((p) => (
            <Link
              key={p.id}
              to={p.path}
              className="pdc-btn pdc-btn-invert"
              style={{ padding: "13px 32px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", borderColor: "rgba(255,251,224,0.3)" }}
            >
              {p.name} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export const PhotographyPage = () => <ServicePage id="fotografie" />;
export const VideographyPage = () => <ServicePage id="videografie" />;
export const WebsitePage = () => <ServicePage id="website" />;
