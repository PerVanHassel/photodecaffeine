import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

// The labelled field the public forms share (contact, automotive, social
// media). The label points at its control, a hint or error is tied to it with
// aria-describedby, and the focus ring and error state live in
// src/styles/site.css (.pdc-field*, .pdc-input).

interface FieldProps {
  label: ReactNode;
  /** Shown under the field; replaces the hint while present. */
  error?: string | null;
  hint?: ReactNode;
}

function useFieldIds(id: string | undefined, error: string | null | undefined, hint: ReactNode) {
  const generated = useId();
  const fieldId = id ?? generated;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return { fieldId, errorId, hintId, describedBy };
}

function Below({ error, hint, errorId, hintId }: { error?: string | null; hint?: ReactNode; errorId: string; hintId: string }) {
  if (error) return <span id={errorId} className="pdc-field-error" role="alert">{error}</span>;
  if (hint) return <span id={hintId} className="pdc-field-hint">{hint}</span>;
  return null;
}

export const PublicInput = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function PublicInput({ label, error, hint, id, className, ...input }, ref) {
    const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, error, hint);
    return (
      <div className="pdc-field">
        <label htmlFor={fieldId} className="pdc-field-label">{label}</label>
        <input
          ref={ref}
          id={fieldId}
          className={className ? `pdc-input ${className}` : "pdc-input"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
        <Below error={error} hint={hint} errorId={errorId} hintId={hintId} />
      </div>
    );
  }
);

export const PublicTextarea = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function PublicTextarea({ label, error, hint, id, className, ...textarea }, ref) {
    const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, error, hint);
    return (
      <div className="pdc-field">
        <label htmlFor={fieldId} className="pdc-field-label">{label}</label>
        <textarea
          ref={ref}
          id={fieldId}
          className={className ? `pdc-input ${className}` : "pdc-input"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...textarea}
        />
        <Below error={error} hint={hint} errorId={errorId} hintId={hintId} />
      </div>
    );
  }
);

/** Props for an e-mail field: right keyboard, no autocorrect on addresses. */
export const EMAIL_INPUT = {
  type: "email",
  inputMode: "email",
  autoComplete: "email",
  autoCapitalize: "none",
  spellCheck: false,
} as const;

/** Props for a phone field. */
export const PHONE_INPUT = {
  type: "tel",
  inputMode: "tel",
  autoComplete: "tel",
} as const;
