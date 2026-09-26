import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ImageOff, Loader2, X } from "lucide-react";
import {
  createContext, forwardRef, useCallback, useContext, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { errorMessage } from "./api";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
export { cx };

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "accent" | "ghost" | "danger" | "danger-solid";
  size?: "md" | "sm";
  icon?: ReactNode;
  loading?: boolean;
  iconOnly?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon, loading, iconOnly, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "s-btn",
        variant === "danger-solid" ? "danger solid" : variant !== "default" && variant,
        size === "sm" && "sm",
        iconOnly && "icon",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="spin" /> : icon}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ children, className, title, action, bodyClass }: {
  children?: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; bodyClass?: string;
}) {
  return (
    <section className={cx("s-card", className)}>
      {(title || action) && (
        <div className="s-card-head">
          {typeof title === "string" ? <h2>{title}</h2> : title}
          {action}
        </div>
      )}
      {bodyClass === "none" ? children : <div className={bodyClass ?? "s-card-body"}>{children}</div>}
    </section>
  );
}

export function PageHead({ eyebrow, title, sub, actions, back }: {
  eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode;
}) {
  return (
    <div className="s-page-head">
      <div className="s-stack sm" style={{ minWidth: 0 }}>
        {back}
        {eyebrow && <p className="s-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="s-row">{actions}</div>}
    </div>
  );
}

export function Pill({ tone, children, plain }: { tone?: "ok" | "warn" | "bad" | "info" | "acc"; children: ReactNode; plain?: boolean }) {
  return <span className={cx("s-pill", tone, plain && "plain")}>{children}</span>;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="s-empty">
      {icon}
      <b>{title}</b>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", r }: { h?: number | string; w?: number | string; r?: number }) {
  return <div className="s-skel" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="s-stack" style={{ padding: 18 }} aria-busy="true" aria-label="Laden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="s-row nowrap" style={{ gap: 12 }}>
          <Skeleton h={34} w={34} r={8} />
          <div className="s-stack sm" style={{ flex: 1 }}>
            <Skeleton h={12} w="45%" />
            <Skeleton h={10} w="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="s-error" role="alert">
      <AlertTriangle size={16} style={{ flex: "none", marginTop: 2 }} />
      <div className="s-stack sm">
        <span>{errorMessage(error)}</span>
        {retry && <Button size="sm" onClick={retry}>Opnieuw proberen</Button>}
      </div>
    </div>
  );
}

/** A photo, or a neutral tile when there is none (or it fails to load). */
export function Photo({ src, alt = "", caption, className, style, children, onClick, video }: {
  src?: string | null; alt?: string; caption?: string; className?: string; style?: React.CSSProperties; children?: ReactNode;
  onClick?: () => void; video?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx("s-ph", (!src || failed) && "s-ph-empty", className)} style={style} onClick={onClick}>
      {src && !failed ? (
        video ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <ImageOff aria-hidden="true" />
      )}
      {caption && <span className="cap">{caption}</span>}
      {children}
    </div>
  );
}

export const isVideo = (name: string) => /\.(mp4|mov|m4v|webm)$/i.test(name.split("?")[0]);

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export function Field({ label, hint, error, children, className, htmlFor }: {
  label?: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string;
}) {
  return (
    <div className={cx("s-field", className)}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx("s-input", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cx("s-textarea", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cx("s-select", className)} {...p} />;
});

/** Label + input with a generated id, for the common case. */
export function TextField({ label, hint, error, className, ...input }: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode; hint?: ReactNode; error?: string | null;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id}>
      <Input id={id} aria-invalid={error ? true : undefined} {...input} />
    </Field>
  );
}

export function TextAreaField({ label, hint, error, className, ...input }: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode; hint?: ReactNode; error?: string | null;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id}>
      <Textarea id={id} aria-invalid={error ? true : undefined} {...input} />
    </Field>
  );
}

export function SelectField({ label, hint, className, children, ...select }: SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <Select id={id} {...select}>{children}</Select>
    </Field>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: NoInfer<T>; label: ReactNode }[]; label: string;
}) {
  return (
    <div className="s-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

export function Modal({ open, onOpenChange, title, description, children, footer, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className="studio" style={{ minHeight: 0 }}>
          <Dialog.Overlay className="s-overlay" />
          <Dialog.Content className={cx("s-dialog", wide && "wide")} aria-describedby={description ? undefined : undefined}>
            <div className="s-dialog-head">
              <div className="s-row between nowrap">
                <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
                <Dialog.Close asChild><Button variant="ghost" iconOnly size="sm" aria-label="Sluiten" icon={<X />} /></Dialog.Close>
              </div>
              {description ? <Dialog.Description asChild><p>{description}</p></Dialog.Description> : <Dialog.Description className="s-sr">{String(title)}</Dialog.Description>}
            </div>
            {children && <div className="s-dialog-body">{children}</div>}
            {footer && <div className="s-dialog-foot">{footer}</div>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Sheet({ open, onOpenChange, title, children, footer }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className="studio" style={{ minHeight: 0 }}>
          <Dialog.Overlay className="s-overlay" />
          <Dialog.Content className="s-sheet">
            <div className="s-dialog-head s-row between nowrap" style={{ paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
              <Dialog.Close asChild><Button variant="ghost" iconOnly size="sm" aria-label="Sluiten" icon={<X />} /></Dialog.Close>
            </div>
            <Dialog.Description className="s-sr">{String(title)}</Dialog.Description>
            <div className="s-sheet-body">{children}</div>
            {footer && <div className="s-dialog-foot" style={{ borderTop: "1px solid var(--line)" }}>{footer}</div>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// A confirm() replacement: `const confirm = useConfirm(); if (await confirm({...}))`.
type ConfirmOpts = { title: string; body?: ReactNode; confirm?: string; danger?: boolean };
const ConfirmContext = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const ask = useCallback((o: ConfirmOpts) => {
    setState(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);
  const close = (v: boolean) => {
    resolver.current?.(v);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Modal
        open={!!state}
        onOpenChange={(o) => !o && close(false)}
        title={state?.title || ""}
        description={state?.body}
        footer={
          <>
            <Button onClick={() => close(false)}>Annuleren</Button>
            <Button variant={state?.danger ? "danger-solid" : "primary"} onClick={() => close(true)} autoFocus>
              {state?.confirm || "Doorgaan"}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
