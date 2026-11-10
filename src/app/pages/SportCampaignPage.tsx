import { Helmet } from "react-helmet-async";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Faq } from "../components/Faq";
import { PhotoReel } from "../components/PhotoReel";
import { Select } from "../components/portal/Select";
import { FormPrivacyNote } from "../components/form/FormPrivacyNote";
import { EMAIL_INPUT, PHONE_INPUT, PublicInput, PublicTextarea } from "../components/form/PublicField";
import { useLanguage } from "../context/LanguageContext";
import { track, visitCampaign, visitId } from "../lib/analytics";
import { altByUrl, altFromFile } from "../lib/articlePage";
import { HIGH_PRIORITY, webSrcSet } from "../lib/images";
import { focusPhotos, type FocusPhoto } from "../lib/photoFocus";
import { usePortfolio } from "../lib/siteData";
import { portalFetch } from "../../lib/supabase";
import type { InquiryForm } from "./ThankYouPage";
import fallbackPhoto from "@/assets/web/per-1600.webp";

/** What lands in the admin as the package of a campaign request. */
const CAMPAIGN = "Sportactie: gratis fotograaf, €5 per foto";

const EMPTY = { name: "", email: "", phone: "", club: "", sport: "", date: "", time: "", location: "", message: "" };
type Field = keyof typeof EMPTY;
type Errors = Partial<Record<"name" | "email" | "club" | "date" | "location", string>>;

/** Today as yyyy-mm-dd in the visitor's own time zone, what a date input holds. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "zaterdag 15 november 2026" for the admin, from a date input's value. */
function longDate(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * The campaign for sports matches: a free photographer, and the players,
 * parents and fans buy the photos they want in the group gallery for €5 each.
 * Linked from the band under the home page hero and the footer.
 */
export function SportCampaignPage() {
  const { t } = useLanguage();
  const tc = t.sportCampaign;
  const ts = t.servicePages;

  // Real work from earlier matches: three in the header, the rest in the strip.
  const work = focusPhotos(usePortfolio().data, "Sport", 11);
  const photos = work.focused ? work.photos : [];
  const heroPhotos = photos.slice(0, 3);
  const reelPhotos = photos.slice(3);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const sportId = useId();
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    club: useRef<HTMLInputElement>(null),
    date: useRef<HTMLInputElement>(null),
    location: useRef<HTMLInputElement>(null),
  };

  // Set after the first render, so the prerendered page does not carry the
  // day it was built on.
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  useEffect(() => setMinDate(today()), []);

  const set = (field: Field) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    // A fixed field stops being flagged as soon as it is fixed.
    setErrors((x) => (field in x ? { ...x, [field]: undefined } : x));
  };
  const input = (field: Field) => (e: { target: { value: string } }) => set(field)(e.target.value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {
      name: form.name.trim() ? undefined : tc.errorName,
      email: form.email.trim() ? undefined : tc.errorEmail,
      club: form.club.trim() ? undefined : tc.errorClub,
      date: !form.date ? tc.errorDate : form.date < today() ? tc.errorPast : undefined,
      location: form.location.trim() ? undefined : tc.errorLocation,
    };
    setErrors(found);
    const first = (["name", "email", "club", "date", "location"] as const).find((k) => found[k]);
    if (first) {
      refs[first].current?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    const ref = visitCampaign();
    const lines = [
      `Aanvraag ${CAMPAIGN}.`,
      "",
      `Club en team: ${form.club.trim()}`,
      form.sport ? `Sport: ${form.sport}` : "",
      `Datum: ${longDate(form.date)}${form.time ? `, ${form.time}` : ""}`,
      `Waar: ${form.location.trim()}`,
    ].filter((l, i) => l || i === 1);
    try {
      await portalFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          package: CAMPAIGN,
          brand: form.club,
          message: `${lines.join("\n")}${form.message.trim() ? `\n\n${form.message.trim()}` : ""}${ref ? `\n\n[ref:${ref}]` : ""}`,
          visit: visitId(),
        }),
      });
      const sent: InquiryForm = "sport";
      track("Aanvraag", { formulier: "sportactie", ...(form.sport ? { sport: form.sport } : {}) });
      navigate("/bedankt", { state: { from: sent } });
    } catch {
      setError(tc.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const alt = (photo: FocusPhoto) =>
    altFromFile(photo.url, ts.photoAlts)
    || (photo.article.page && Array.isArray(photo.article.page.blocks) ? altByUrl(photo.article.page).get(photo.url) : "")
    || tc.photoAlt(photo.article.title);

  const url = `https://www.photodecaffeine.com${tc.path}`;

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
        <title>{tc.metaTitle}</title>
        <meta name="description" content={tc.metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={tc.metaTitle} />
        <meta property="og:description" content={tc.metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={tc.metaTitle} />
        <meta name="twitter:description" content={tc.metaDescription} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Sportactie", "item": url },
          ],
        })}</script>
      </Helmet>

      {/* ── Header ── */}
      <div className="pdc-svc-head" style={{ backgroundColor: "#0d0703", borderBottom: "1px solid rgba(255,251,224,0.06)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <Link to="/" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {tc.backLabel}
          </Link>

          <div className="pdc-camp-head">
            <div>
              <span className="pdc-camp-label">
                <span className="pdc-camp-dot" aria-hidden="true" />
                {tc.sectionLabel}
              </span>
              <h1 className="pdc-svc-title pdc-camp-title">
                {tc.titleLine1}
                <br />
                <em>{tc.titleLine2}</em>
              </h1>
            </div>
            <div className="pdc-camp-lead">
              <p>{tc.subtitle}</p>
              <a href="#aanvragen" className="pdc-btn pdc-btn-solid pdc-camp-lead-cta">
                {tc.bookButton}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photos from earlier matches ── */}
      <div className="pdc-camp-hero" data-count={heroPhotos.length || 1}>
        {heroPhotos.length ? (
          heroPhotos.map((photo, i) => (
            <div key={photo.url} className="pdc-camp-hero-item">
              <img
                src={photo.url}
                srcSet={webSrcSet(photo.url)}
                sizes={i === 0 ? "(max-width: 767px) 100vw, 50vw" : "(max-width: 767px) 50vw, 25vw"}
                {...(i === 0 ? HIGH_PRIORITY : { loading: "lazy" as const })}
                alt={alt(photo)}
              />
            </div>
          ))
        ) : (
          <div className="pdc-camp-hero-item">
            <img src={fallbackPhoto} width={1600} height={1063} {...HIGH_PRIORITY} alt={tc.heroAlt} />
          </div>
        )}
      </div>

      {/* ── The offer in three numbers ── */}
      <dl className="pdc-camp-facts">
        {tc.facts.map((fact) => (
          <div key={fact.value} className="pdc-camp-fact">
            <dt>{fact.value}</dt>
            <dd>{fact.label}</dd>
          </div>
        ))}
      </dl>

      {/* ── How it works ── */}
      <section className="pdc-camp-steps" aria-labelledby="camp-steps-title">
        <h2 id="camp-steps-title" className="pdc-camp-section-label">{tc.stepsLabel}</h2>
        <ol>
          {tc.steps.map((step, i) => (
            <li key={step.title}>
              <span className="pdc-camp-step-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── What you get + the request form ── */}
      <div className="pdc-svc-body" style={{ maxWidth: "1400px", margin: "0 auto", display: "grid", alignItems: "start" }}>
        <div>
          <h2 className="pdc-camp-section-label">{tc.includedLabel}</h2>
          <ul className="pdc-camp-included">
            {tc.included.map((item) => (
              <li key={item}>
                <span aria-hidden="true">•</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="pdc-camp-note">
            <span className="pdc-camp-section-label">{tc.noteLabel}</span>
            <p>{tc.noteBody}</p>
          </div>
        </div>

        <div id="aanvragen" style={{ scrollMarginTop: "96px" }}>
          <span className="pdc-camp-section-label">{tc.requestLabel}</span>
          <h2
            className="pdc-svc-form-title"
            style={{ color: "#fffbe0", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.05, textTransform: "uppercase", margin: "0 0 8px" }}
          >
            {tc.formTitle}
          </h2>
          <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "13px", fontWeight: 300, lineHeight: 1.7, margin: "0 0 40px" }}>
            {tc.formSubtitle}
          </p>

          <form data-track="Sportactie" noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <PublicInput
              ref={refs.name}
              label={tc.nameLabel}
              name="name"
              autoComplete="name"
              aria-required="true"
              value={form.name}
              onChange={input("name")}
              placeholder={tc.namePlaceholder}
              error={errors.name}
            />
            <div className="pdc-form-row">
              <PublicInput
                ref={refs.email}
                label={tc.emailLabel}
                name="email"
                {...EMAIL_INPUT}
                aria-required="true"
                value={form.email}
                onChange={input("email")}
                placeholder={t.contact.emailPlaceholder}
                hint={tc.emailHint}
                error={errors.email}
              />
              <PublicInput
                label={tc.phoneLabel}
                name="phone"
                {...PHONE_INPUT}
                value={form.phone}
                onChange={input("phone")}
                placeholder={tc.phonePlaceholder}
              />
            </div>
            <div className="pdc-form-row">
              <PublicInput
                ref={refs.club}
                label={tc.clubLabel}
                name="organization"
                autoComplete="organization"
                aria-required="true"
                value={form.club}
                onChange={input("club")}
                placeholder={tc.clubPlaceholder}
                error={errors.club}
              />
              <div className="pdc-field">
                <label htmlFor={sportId} className="pdc-field-label">{tc.sportLabel}</label>
                <Select
                  id={sportId}
                  value={form.sport}
                  onChange={set("sport")}
                  placeholder={tc.sportDefault}
                  options={tc.sports.map((s) => ({ value: s, label: s }))}
                />
              </div>
            </div>
            <div className="pdc-form-row">
              <PublicInput
                ref={refs.date}
                label={tc.dateLabel}
                name="date"
                type="date"
                min={minDate}
                aria-required="true"
                value={form.date}
                onChange={input("date")}
                error={errors.date}
              />
              <PublicInput
                label={tc.timeLabel}
                name="time"
                type="time"
                step={300}
                value={form.time}
                onChange={input("time")}
              />
            </div>
            <PublicInput
              ref={refs.location}
              label={tc.locationLabel}
              name="location"
              autoComplete="off"
              aria-required="true"
              value={form.location}
              onChange={input("location")}
              placeholder={tc.locationPlaceholder}
              error={errors.location}
            />
            <PublicTextarea
              label={tc.messageLabel}
              name="message"
              autoComplete="off"
              rows={3}
              value={form.message}
              onChange={input("message")}
              placeholder={tc.messagePlaceholder}
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
              style={{ padding: "18px 40px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.22em", alignSelf: "flex-start" }}
            >
              {loading ? tc.submitting : tc.submitButton}
            </button>
            <FormPrivacyNote />
          </form>
        </div>
      </div>

      {reelPhotos.length > 0 && (
        <PhotoReel
          id="sport-work"
          label={tc.reelLabel}
          titleLine1={tc.reelTitle1}
          titleLine2={tc.reelTitle2}
          body={tc.reelBody}
          link={ts.workLink}
          photos={reelPhotos}
          labels={{ previous: ts.workPrevious, next: ts.workNext }}
        />
      )}

      <Faq items={tc.faq} />

      {/* ── A shoot of your own instead ── */}
      <div className="pdc-svc-cta" style={{ borderTop: "1px solid rgba(255,251,224,0.06)", backgroundColor: "#0d0703", textAlign: "center" }}>
        <span className="pdc-camp-section-label" style={{ marginBottom: "20px" }}>{tc.ctaLabel}</span>
        <h2
          className="pdc-svc-cta-title"
          style={{ color: "#fffbe0", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.95, textTransform: "uppercase", margin: "0 0 16px" }}
        >
          {tc.ctaTitle} <span style={{ color: "rgba(255,251,224,0.4)" }}>{tc.ctaTitleDim}</span>
        </h2>
        <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "14px", fontWeight: 300, lineHeight: 1.7, maxWidth: "420px", margin: "0 auto 40px" }}>
          {tc.ctaBody}
        </p>
        <Link
          to="/services/fotografie/sport"
          className="pdc-btn pdc-btn-invert"
          style={{ padding: "13px 32px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", borderColor: "rgba(255,251,224,0.3)" }}
        >
          {tc.ctaButton}
        </Link>
      </div>
    </div>
  );
}
