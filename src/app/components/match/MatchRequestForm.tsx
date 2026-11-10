import { forwardRef, useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type MouseEvent, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, Check } from "lucide-react";
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
 * The request form of /wedstrijdfotografie. It splits after the kind of
 * booking: what does not belong to that choice stays hidden and is neither
 * checked nor sent. `preset` comes from the choice cards above it.
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
    <div className="wf-request-form">
      <h2 id="wf-form-title" ref={heading} tabIndex={-1} className="wf-h2 wf-request-title">
        {f.title}
      </h2>
      <p className="wf-lead">{f.intro}</p>
      <p className="wf-note">{f.optionalNote}</p>

      {submitted && errorList.length > 0 && (
        <div ref={summary} tabIndex={-1} role="alert" className="wf-summary" aria-labelledby="wf-summary-title">
          <h3 id="wf-summary-title">
            <AlertCircle size={20} strokeWidth={2} aria-hidden="true" />
            {f.summaryTitle(errorList.length)}
          </h3>
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
        <fieldset className="wf-fieldset" aria-describedby={shown("type") ? `${id("type")}-error` : undefined}>
          <legend className="wf-legend">{f.typeLegend}</legend>
          <div className="wf-tiles">
            {(["team", "individual"] as const).map((type, i) => (
              <label key={type} className="wf-tile">
                <input
                  type="radio"
                  name="wf-type"
                  id={i === 0 ? id("type") : undefined}
                  value={type}
                  checked={form.type === type}
                  onChange={() => set("type", type)}
                  aria-invalid={shown("type") ? true : undefined}
                />
                <span className="wf-tile-body">
                  <span className="wf-tile-mark" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                  <span className="wf-tile-title">{type === "team" ? f.typeTeam : f.typeIndividual}</span>
                  <span className="wf-tile-note">{type === "team" ? f.typeTeamNote : f.typeIndividualNote}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id={`${id("type")}-error`} error={shown("type")} />
        </fieldset>

        {/* ── About you ── */}
        <fieldset className="wf-fieldset">
          <legend className="wf-legend">{f.aboutLegend}</legend>
          <Choices
            field="role"
            label={f.roleLabel}
            value={form.role}
            onChange={(v) => set("role", v as Role)}
            options={(Object.keys(f.roles) as Role[]).map((r) => ({ value: r, label: f.roles[r] }))}
            error={shown("role")}
          />
          <TextField label={f.nameLabel} autoComplete="name" maxLength={120} {...text("name")} />
          <div className="wf-row">
            <TextField
              label={f.emailLabel}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={160}
              hint={f.emailHint}
              {...text("email")}
            />
            <TextField label={f.phoneLabel} type="tel" inputMode="tel" autoComplete="tel" maxLength={40} {...text("phone")} />
          </div>
        </fieldset>

        {/* ── The match ── */}
        <fieldset className="wf-fieldset">
          <legend className="wf-legend">{f.matchLegend}</legend>
          <TextField label={f.clubLabel} autoComplete="organization" maxLength={120} {...text("club")} />
          <TextField
            label={isTeam ? f.teamLabel : f.teamLabelOptional}
            autoComplete="off"
            maxLength={80}
            hint={f.teamHint}
            {...text("team")}
          />
          <Choices
            field="sport"
            label={f.sportLabel}
            value={form.sport}
            onChange={(v) => set("sport", v)}
            options={f.sports.map((s) => ({ value: s, label: s }))}
            error={shown("sport")}
          />
          {form.sport === f.sportOther && (
            <div className="wf-reveal">
              <TextField label={f.sportOtherLabel} autoComplete="off" maxLength={60} {...text("sportOther")} />
            </div>
          )}
          <div className="wf-row wf-row--always">
            <TextField label={f.dateLabel} type="date" min={minDate} {...text("date")} />
            <TextField label={f.timeLabel} type="time" step={300} {...text("time")} />
          </div>
          <TextField label={f.locationLabel} autoComplete="off" maxLength={160} hint={f.locationHint} {...text("location")} />
          <Choices
            field="matches"
            label={f.matchesLabel}
            value={form.matches}
            onChange={(v) => set("matches", v as MatchRequest["matches"])}
            options={[{ value: "one", label: f.matchesOne }, { value: "more", label: f.matchesMore }]}
            hint={form.matches === "more" ? f.matchesMoreHint : undefined}
          />
        </fieldset>

        {/* ── Only for one player ── */}
        {isIndividual && (
          <fieldset className="wf-fieldset wf-reveal">
            <legend className="wf-legend">{f.playerLegend}</legend>
            <TextField label={f.forWhomLabel} autoComplete="off" maxLength={120} hint={f.forWhomHint} {...text("forWhom")} />
            <div className="wf-row">
              <TextField label={f.shirtLabel} inputMode="numeric" autoComplete="off" maxLength={10} {...text("shirt")} />
              <TextField label={f.tipLabel} autoComplete="off" maxLength={160} hint={f.tipHint} {...text("tip")} />
            </div>
          </fieldset>
        )}

        {/* ── Only for a team ── */}
        {isTeam && (
          <fieldset className="wf-fieldset wf-reveal">
            <legend className="wf-legend">{f.teamLegend}</legend>
            <TextField
              label={f.playersLabel}
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              className="wf-input--short"
              {...text("players")}
            />
            {needsContactPerson(form) && (
              <div className="wf-reveal">
                <TextField
                  label={f.contactPersonLabel}
                  autoComplete="off"
                  maxLength={160}
                  hint={f.contactPersonHint}
                  {...text("contactPerson")}
                />
              </div>
            )}
          </fieldset>
        )}

        {/* ── Children in the photos ── */}
        <fieldset className="wf-fieldset">
          <Choices
            field="minors"
            label={f.minorsLabel}
            value={form.minors}
            onChange={(v) => set("minors", v as MatchRequest["minors"])}
            options={[{ value: "yes", label: f.yes }, { value: "no", label: f.no }]}
            hint={f.minorsHint}
            error={shown("minors")}
          />
          {form.minors === "yes" && (
            <div className="wf-consent wf-reveal">
              <h3>{f.consentTitle}</h3>
              <p>{f.consentBody}</p>
              <CheckField
                id={id("consentAgreed")}
                checked={form.consentAgreed}
                onChange={(v) => set("consentAgreed", v)}
                error={shown("consentAgreed")}
              >
                {isIndividual ? f.consentCheckIndividual : f.consentCheckTeam}
              </CheckField>
            </div>
          )}
        </fieldset>

        <TextArea label={f.messageLabel} hint={f.messageHint} maxLength={1500} {...text("message")} />

        {/* ── What the chosen option costs ── */}
        <section className="wf-cost" aria-labelledby="wf-cost-title" aria-live="polite">
          <h3 id="wf-cost-title">{f.priceTitle}</h3>
          {!form.type ? (
            <p className="wf-cost-empty">{f.priceEmpty}</p>
          ) : (
            <>
              <ul>
                {(isTeam ? f.priceTeam : f.priceIndividual).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="wf-cost-example">{isTeam ? f.priceTeamExample : f.priceIndividualExample}</p>
              <p className="wf-cost-travel">
                <strong>{matchPage.travelLabel}.</strong> {matchPage.travel}
              </p>
            </>
          )}
        </section>

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
              <span className="sr-only"> (opent in een nieuw tabblad)</span>
            </Link>
            {f.termsMiddle}
            <Link to="/privacybeleid" target="_blank" rel="noopener">
              {f.privacyLink}
              <span className="sr-only"> (opent in een nieuw tabblad)</span>
            </Link>
            {f.termsAfter}
          </CheckField>
        </div>

        {sendError && (
          <p className="wf-send-error" role="alert">
            <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
            {f.sendError}
          </p>
        )}

        <button type="submit" className="wf-btn wf-btn--solid wf-submit" disabled={sending} aria-busy={sending || undefined}>
          {sending ? f.submitting : f.submit}
        </button>
      </form>
    </div>
  );
}

/* ── Fields ─────────────────────────────────────────────────────────────── */

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <span id={id} className="wf-error">
      <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
      {error}
    </span>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, hint, error, className, ...input },
  ref
) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="wf-field">
      <label htmlFor={id} className="wf-label">{label}</label>
      {hint && <span id={`${id}-hint`} className="wf-hint">{hint}</span>}
      <input
        ref={ref}
        id={id}
        className={className ? `wf-input ${className}` : "wf-input"}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
});

function TextArea({
  id,
  label,
  hint,
  error,
  ...area
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string; error?: string }) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="wf-field">
      <label htmlFor={id} className="wf-label">{label}</label>
      {hint && <span id={`${id}-hint`} className="wf-hint">{hint}</span>}
      <textarea id={id} rows={4} className="wf-input wf-textarea" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...area} />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** One choice out of a few, as large tappable chips (radio buttons underneath). */
function Choices({
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
  const describedBy = [hint ? `${base}-hint` : "", error ? `${base}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="wf-field wf-choices" aria-describedby={describedBy}>
      <legend className="wf-label">{label}</legend>
      {hint && <span id={`${base}-hint`} className="wf-hint">{hint}</span>}
      <div className="wf-chips">
        {options.map((o, i) => (
          <label key={o.value} className="wf-chip">
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
    <div className="wf-field">
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
          <span className="wf-check-box" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
          <span className="wf-check-text">{children}</span>
        </label>
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
