import { useCallback, useState, type ChangeEvent, type FocusEvent, type ReactNode } from "react";

export const IMG = "/demos/aqua-spa-service";
export const TEL = "tel:+32486842105";
export const TEL_LABEL = "0486 84 21 05";
export const MAIL = "info@aquaspaservice.be";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface Rule {
  required?: boolean;
  email?: boolean;
}

type Input = HTMLInputElement | HTMLTextAreaElement;

/**
 * Validatie per formulier: een veld wordt pas rood na het verlaten ervan of
 * na verzenden, en wordt weer groen zodra het klopt terwijl je typt.
 */
export function useValidation(rules: Record<string, Rule>) {
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const test = useCallback(
    (name: string, value: string) => {
      const rule = rules[name];
      if (!rule) return true;
      const v = value.trim();
      if (rule.required && v === "") return false;
      if (rule.email && v !== "" && !EMAIL.test(v)) return false;
      return true;
    },
    [rules]
  );

  const onBlur = (e: FocusEvent<Input>) => {
    const { name, value } = e.target;
    setInvalid((s) => ({ ...s, [name]: !test(name, value) }));
  };

  const onChange = (e: ChangeEvent<Input>) => {
    const { name, value } = e.target;
    if (invalid[name]) setInvalid((s) => ({ ...s, [name]: !test(name, value) }));
  };

  /** Controleert alles, zet de focus op het eerste foute veld. */
  const validate = (form: HTMLFormElement) => {
    const next: Record<string, boolean> = {};
    let first: Input | null = null;
    Object.keys(rules).forEach((name) => {
      const el = form.elements.namedItem(name) as Input | null;
      const ok = test(name, el?.value ?? "");
      next[name] = !ok;
      if (!ok && !first && el) first = el;
    });
    setInvalid(next);
    if (first) (first as Input).focus();
    return !first;
  };

  const reset = () => setInvalid({});

  return { invalid, onBlur, onChange, validate, reset };
}

interface FieldProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  hint?: string;
  error?: string;
  textarea?: boolean;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
  accept?: string;
  minHeight?: number;
  v: ReturnType<typeof useValidation>;
}

export function Field(p: FieldProps) {
  const isBad = !!p.v.invalid[p.name];
  const describedBy =
    [p.hint ? `${p.id}-hint` : "", p.error ? `${p.id}-err` : ""].filter(Boolean).join(" ") || undefined;
  const common = {
    id: p.id,
    name: p.name,
    required: p.required,
    "aria-describedby": describedBy,
    "aria-invalid": isBad,
    onBlur: p.v.onBlur,
    onChange: p.v.onChange,
  };
  return (
    <div className="field" data-invalid={isBad ? "true" : "false"}>
      <label htmlFor={p.id}>
        {p.label} {p.required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {p.hint && (
        <span className="hint" id={`${p.id}-hint`}>
          {p.hint}
        </span>
      )}
      {p.textarea ? (
        <textarea {...common} style={p.minHeight ? { minHeight: p.minHeight } : undefined} />
      ) : (
        <input
          {...common}
          type={p.type ?? "text"}
          autoComplete={p.autoComplete}
          inputMode={p.inputMode}
          accept={p.accept}
        />
      )}
      {p.error && (
        <span className="error" id={`${p.id}-err`}>
          <i className="ph ph-warning-circle" aria-hidden="true" />
          {p.error}
        </span>
      )}
    </div>
  );
}

export function SubmitButton({ busy, icon, children, full }: { busy: boolean; icon: string; children: ReactNode; full?: boolean }) {
  return (
    <button
      className="btn btn--primary"
      type="submit"
      disabled={busy}
      data-loading={busy ? "true" : undefined}
      style={full ? { width: "100%" } : undefined}
    >
      <i className="ph ph-spinner-gap spin" aria-hidden="true" />
      <span className="lbl-idle">
        <i className={`ph ${icon}`} aria-hidden="true" />
      </span>
      {children}
    </button>
  );
}

export function Stars({ half, label }: { half?: boolean; label: string }) {
  return (
    <span className="stars" role="img" aria-label={label}>
      <i className="ph-fill ph-star" aria-hidden="true" />
      <i className="ph-fill ph-star" aria-hidden="true" />
      <i className="ph-fill ph-star" aria-hidden="true" />
      <i className="ph-fill ph-star" aria-hidden="true" />
      <i className={`ph-fill ${half ? "ph-star-half" : "ph-star"}`} aria-hidden="true" />
    </span>
  );
}

export function mailto(subject: string, lines: string[]) {
  return `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

/** Een korte vertraging, zodat de laadstatus zichtbaar is voor de bevestiging. */
export const settle = (ms = 550) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Keuze uit een handvol opties, als chips. Leest sneller dan een uitklapmenu. */
export function ChoiceChips({
  label,
  name,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <fieldset className="field choice">
      <legend>{label}</legend>
      {hint && <span className="hint">{hint}</span>}
      <div className="choice__row">
        {options.map((o) => (
          <label key={o} className="choice__chip" data-on={value === o ? "true" : "false"}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** De bevestiging na een verzonden formulier. Zegt eerlijk dat dit een demo is. */
export function DonePanel({
  title,
  body,
  href,
  titleRef,
}: {
  title: string;
  body: string;
  href: string;
  titleRef: React.RefObject<HTMLHeadingElement>;
}) {
  return (
    <div className="done" data-show="true" role="status" aria-live="polite">
      <i className="ph ph-check-circle mark-ok" aria-hidden="true" />
      <h3 ref={titleRef} tabIndex={-1}>
        {title}
      </h3>
      <p>{body}</p>
      <div className="actions">
        <a className="btn btn--primary" href={href}>
          <i className="ph ph-envelope-simple" aria-hidden="true" />
          Open in e-mailprogramma
        </a>
        <a className="btn btn--ghost" href={TEL}>
          <i className="ph ph-phone" aria-hidden="true" />
          Bel {TEL_LABEL}
        </a>
      </div>
    </div>
  );
}

/** Het woordmerk. Zonder label is het decoratief, omdat de link eromheen de naam al draagt. */
export function Logo({ label }: { label?: string }) {
  return label ? (
    <span className="mark" role="img" aria-label={label} />
  ) : (
    <span className="mark" aria-hidden="true" />
  );
}
