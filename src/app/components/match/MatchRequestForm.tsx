import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type MouseEvent, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Link, useNavigate } from "react-router";
import { Check } from "lucide-react";
import { FormPrivacyNote } from "../form/FormPrivacyNote";
import { EMAIL_INPUT, PHONE_INPUT } from "../form/PublicField";
import { matchPage } from "../../i18n/matchPage";
import { track, visitCampaign, visitId } from "../../lib/analytics";
import {
  EMPTY_REQUEST,
  longDate,
  needsContactPerson,
  sendMatchRequest,
  today,
  validateRequest,
  type BookingType,
  type MatchRequest,
  type RequestField,
  type Role,
} from "../../lib/matchBooking";

/** What the page after sending shows back. */
export type SentState = { type: BookingType; name: string; club: string; date: string };

const f = matchPage.form;
const id = (field: RequestField) => `wf-${field}`;

// Fields whose problem shows up before the first send, as soon as someone
// leaves them with something wrong in them (not merely empty).
const FORMAT_FIELDS: RequestField[] = ["email", "date", "players"];

/**
 * The request form of /wedstrijdfotografie, in the look of the site's other
 * forms (.pdc-field, .pdc-input, .pdc-choice in site.css). It splits after the
 * kind of booking: what does not belong to that choice stays hidden and is
 * neither checked nor sent. `preset` comes from the choice cards above it.
 */
export function MatchRequestForm({ preset }: { preset: { type: BookingType; n: number } | null }) {
  const [form, setForm] = useState<MatchRequest>(EMPTY_REQUEST);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<RequestField>>(() => new Set());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  // Set after the first render, so the prerendered page does not carry the day it was built on.
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const summary = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();

  useEffect(() => setMinDate(today()), []);

  // A choice card was used: pick that kind of booking and bring the form into focus.
  useEffect(() => {
    if (!preset) return;
    setForm((r) => ({ ...r, type: preset.type }));
    heading.current?.focus({ preventScroll: true });
  }, [preset]);

  const errors = validateRequest(form, minDate);
  const shown = (field: RequestField) => {
    if (!errors[field]) return undefined;
    if (submitted) return errors[field];
    const value = form[field];
    return FORMAT_FIELDS.includes(field) && touched.has(field) && typeof value === "string" && value.trim() ? errors[field] : undefined;
  };
  const errorList = (Object.keys(errors) as RequestField[]).filter((k) => errors[k]);

  const set = <K extends RequestField>(field: K, value: MatchRequest[K]) => setForm((r) => ({ ...r, [field]: value }));
  const text = (field: RequestField) => ({
    id: id(field),
    value: form[field] as string,
    onChange: (e: { target: { value: string } }) => set(field, e.target.value as never),
    onBlur: () => setTouched((s) => (s.has(field) ? s : new Set(s).add(field))),
    error: shown(field),
  });

  const isTeam = form.type === "team";
  const isIndividual = form.type === "individual";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSendError(false);
    if (errorList.length) {
      // The summary says what is missing; move there so it is read out.
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setSending(true);
    try {
      await sendMatchRequest(form, { campaign: visitCampaign(), visit: visitId() });
      track("Aanvraag", { formulier: "wedstrijdfotografie", soort: isTeam ? "team" : "voor zichzelf" });
      const state: SentState = {
        type: form.type as BookingType,
        name: form.name.trim().split(/\s+/)[0] ?? "",
        club: form.club.trim(),
        date: longDate(form.date),
      };
      navigate(matchPage.sentPath, { state });
    } catch {
      setSendError(true);
      setSending(false);
    }
  };

  const jumpTo = (field: RequestField) => (e: MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id(field));
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
  };

  return (
    <>
      <span className="wf-label">{f.label}</span>
      <h2 id="wf-form-title" ref={heading} tabIndex={-1} className="pdc-svc-form-title wf-form-title">
        {f.title}
      </h2>
      <p className="wf-form-intro">{f.intro}</p>

      {submitted && errorList.length > 0 && (
        <div ref={summary} tabIndex={-1} role="alert" className="wf-summary" aria-labelledby="wf-summary-title">
          <span className="wf-summary-label">{f.summaryLabel}</span>
          <h3 id="wf-summary-title">{f.summaryTitle(errorList.length)}</h3>
          <ul>
            {errorList.map((field) => (
              <li key={field}>
                <a href={`#${id(field)}`} onClick={jumpTo(field)}>
                  {errors[field]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} aria-labelledby="wf-form-title" data-track="Wedstrijdfotografie" className="wf-form">
        {/* ── Kind of booking ── */}
        <fieldset className="pdc-choices wf-types-set" aria-describedby={shown("type") ? `${id("type")}-error` : undefined}>
          <legend className="wf-group-label">{f.typeLegend}</legend>
          <div className="wf-types">
            {(["team", "individual"] as const).map((type, i) => (
              <label key={type} className="wf-type">
                <input
                  type="radio"
                  name="wf-type"
                  id={i === 0 ? id("type") : undefined}
                  value={type}
                  checked={form.type === type}
                  onChange={() => set("type", type)}
                  aria-invalid={shown("type") ? true : undefined}
                />
                <span>
                  <strong>{type === "team" ? f.typeTeam : f.typeIndividual}</strong>
                  <small>{type === "team" ? f.typeTeamNote : f.typeIndividualNote}</small>
                </span>
              </label>
            ))}
          </div>
          <FieldError id={`${id("type")}-error`} error={shown("type")} />
        </fieldset>

        {/* ── About you ── */}
        <Group label={f.aboutLegend}>
          <RadioChips
            field="role"
            label={f.roleLabel}
            value={form.role}
            onChange={(v) => set("role", v as Role)}
            options={(Object.keys(f.roles) as Role[]).map((r) => ({ value: r, label: f.roles[r] }))}
            error={shown("role")}
          />
          <Input label={f.nameLabel} autoComplete="name" maxLength={120} placeholder={f.namePlaceholder} {...text("name")} />
          <div className="pdc-form-row">
            <Input label={f.emailLabel} {...EMAIL_INPUT} maxLength={160} placeholder={f.emailPlaceholder} hint={f.emailHint} {...text("email")} />
            <Input label={f.phoneLabel} {...PHONE_INPUT} maxLength={40} placeholder={f.phonePlaceholder} {...text("phone")} />
          </div>
        </Group>

        {/* ── The match ── */}
        <Group label={f.matchLegend}>
          <div className="pdc-form-row">
            <Input label={f.clubLabel} autoComplete="organization" maxLength={120} {...text("club")} />
            <Input
              label={isTeam ? f.teamLabel : f.teamLabelOptional}
              autoComplete="off"
              maxLength={80}
              placeholder={f.teamPlaceholder}
              {...text("team")}
            />
          </div>
          <RadioChips
            field="sport"
            label={f.sportLabel}
            value={form.sport}
            onChange={(v) => set("sport", v)}
            options={f.sports.map((s) => ({ value: s, label: s }))}
            error={shown("sport")}
          />
          {form.sport === f.sportOther && (
            <div className="wf-reveal">
              <Input label={f.sportOtherLabel} autoComplete="off" maxLength={60} {...text("sportOther")} />
            </div>
          )}
          <div className="pdc-form-row">
            <Input label={f.dateLabel} type="date" min={minDate} className="wf-input-when" {...text("date")} />
            <Input label={f.timeLabel} type="time" step={300} className="wf-input-when" {...text("time")} />
          </div>
          <Input label={f.locationLabel} autoComplete="off" maxLength={160} placeholder={f.locationPlaceholder} {...text("location")} />
          {isIndividual && (
            <Input label={f.forWhomLabel} autoComplete="off" maxLength={120} placeholder={f.forWhomPlaceholder} {...text("forWhom")} />
          )}
          {isTeam && (
            <div className="pdc-form-row">
              <Input label={f.playersLabel} type="number" inputMode="numeric" min={1} max={99} {...text("players")} />
              {needsContactPerson(form) && (
                <Input
                  label={f.contactPersonLabel}
                  autoComplete="off"
                  maxLength={160}
                  placeholder={f.contactPersonPlaceholder}
                  {...text("contactPerson")}
                />
              )}
            </div>
          )}
        </Group>

        {/* ── Children in the photos ── */}
        <div className="wf-group">
          <RadioChips
            field="minors"
            label={f.minorsLabel}
            value={form.minors}
            onChange={(v) => set("minors", v as MatchRequest["minors"])}
            options={[{ value: "yes", label: f.yes }, { value: "no", label: f.no }]}
            error={shown("minors")}
          />
          {form.minors === "yes" && (
            <div className="wf-box wf-box--accent wf-reveal">
              <p>{f.consentBody}</p>
              <CheckField id={id("consentAgreed")} checked={form.consentAgreed} onChange={(v) => set("consentAgreed", v)} error={shown("consentAgreed")}>
                {isIndividual ? f.consentCheckIndividual : f.consentCheckTeam}
              </CheckField>
            </div>
          )}
        </div>

        <TextArea label={f.messageLabel} maxLength={1500} placeholder={f.messagePlaceholder} {...text("message")} />

        {/* ── Agreements ── */}
        <div className="wf-agree">
          {isIndividual && (
            <CheckField id={id("feeAgreed")} checked={form.feeAgreed} onChange={(v) => set("feeAgreed", v)} error={shown("feeAgreed")}>
              {f.feeCheck}
            </CheckField>
          )}
          <CheckField id={id("termsAgreed")} checked={form.termsAgreed} onChange={(v) => set("termsAgreed", v)} error={shown("termsAgreed")}>
            {f.termsBefore}
            <Link to="/algemene-voorwaarden" target="_blank" rel="noopener">
              {f.termsLink}
              <span className="pdc-visually-hidden"> (opent in een nieuw tabblad)</span>
            </Link>
            {f.termsMiddle}
            <Link to="/privacybeleid" target="_blank" rel="noopener">
              {f.privacyLink}
              <span className="pdc-visually-hidden"> (opent in een nieuw tabblad)</span>
            </Link>
            {f.termsAfter}
          </CheckField>
        </div>

        {sendError && (
          <p className="pdc-form-error" role="alert">
            {f.sendError}
          </p>
        )}

        <button
          type="submit"
          className="pdc-btn pdc-btn-solid pdc-svc-submit pdc-submit wf-submit"
          disabled={sending}
          aria-busy={sending || undefined}
        >
          {sending ? f.submitting : f.submit}
        </button>
        <FormPrivacyNote />
      </form>
    </>
  );
}

/* ── Fields, in the site's form look ─────────────────────────────────────
   The same classes as components/form/PublicField, without role="alert" on
   every error: after a send the summary above the form says it once. */

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return <span id={id} className="pdc-field-error">{error}</span>;
}

function described(base: string, hint?: string, error?: string) {
  return error ? `${base}-error` : hint ? `${base}-hint` : undefined;
}

function Group({ label, reveal, children }: { label: string; reveal?: boolean; children: ReactNode }) {
  const labelId = `wf-group-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div role="group" aria-labelledby={labelId} className={reveal ? "wf-group wf-reveal" : "wf-group"}>
      <p id={labelId} className="wf-group-label">{label}</p>
      {children}
    </div>
  );
}

function Input({
  id,
  label,
  hint,
  error,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="pdc-field">
      <label htmlFor={id} className="pdc-field-label">{label}</label>
      <input
        id={id}
        className={className ? `pdc-input wf-input ${className}` : "pdc-input wf-input"}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        {...input}
      />
      {error ? <FieldError id={`${id}-error`} error={error} /> : hint && <span id={`${id}-hint`} className="pdc-field-hint">{hint}</span>}
    </div>
  );
}

function TextArea({
  id,
  label,
  error,
  ...area
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; error?: string }) {
  return (
    <div className="pdc-field">
      <label htmlFor={id} className="pdc-field-label">{label}</label>
      <textarea
        id={id}
        rows={3}
        className="pdc-input wf-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...area}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** One choice out of a few: the site's chips (.pdc-choice), with radio buttons underneath. */
function RadioChips({
  field,
  label,
  value,
  onChange,
  options,
  hint,
  error,
}: {
  field: RequestField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
}) {
  const base = id(field);
  return (
    <fieldset className="pdc-choices" aria-describedby={described(base, hint, error)}>
      <legend className="pdc-field-label">{label}</legend>
      {hint && <p id={`${base}-hint`} className="pdc-field-hint pdc-choices-hint">{hint}</p>}
      <div className="pdc-choices-list">
        {options.map((o, i) => (
          <label key={o.value} className="pdc-choice">
            <input
              type="radio"
              name={`wf-${field}`}
              id={i === 0 ? base : undefined}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              aria-invalid={error ? true : undefined}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={`${base}-error`} error={error} />
    </fieldset>
  );
}

function CheckField({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="pdc-field">
      <div className="wf-check">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <label htmlFor={id}>
          <span className="wf-check-box" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
          <span>{children}</span>
        </label>
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
