import { motion } from "motion/react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  useId,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { c, radius, spring } from "../theme";
import { haptic } from "../haptics";
import { Press } from "./base";

// ── Button ────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    // Copper gradient rather than a flat fill: on a dark warm page a solid
    // block of accent goes muddy, while the gradient keeps a lit edge.
    backgroundImage: `linear-gradient(160deg, ${c.copperHi}, ${c.copper} 58%, ${c.copperLo})`,
    color: "#1a0c04",
    border: "1px solid transparent",
  },
  secondary: {
    backgroundColor: c.surface2,
    color: c.fg,
    border: `1px solid ${c.line2}`,
  },
  ghost: {
    backgroundColor: "transparent",
    color: c.fg2,
    border: `1px solid ${c.line}`,
  },
  danger: {
    backgroundColor: c.danger,
    color: "#fff",
    border: "1px solid transparent",
  },
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  full = false,
  busy = false,
  disabled = false,
  style,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  full?: boolean;
  busy?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  type?: "button" | "submit";
}) {
  const h = size === "sm" ? 38 : size === "lg" ? 54 : 46;
  return (
    <Press
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      feedback={variant === "danger" ? "warning" : "tap"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: full ? "100%" : undefined,
        minHeight: h,
        padding: `0 ${size === "sm" ? 14 : 20}px`,
        borderRadius: radius.md,
        fontSize: size === "sm" ? 13 : 15,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        ...VARIANTS[variant],
        ...style,
      }}
    >
      {busy ? <Spinner size={16} tone={variant === "primary" ? "#1a0c04" : c.fg2} /> : icon}
      {children}
    </Press>
  );
}

function Spinner({ size = 16, tone = c.fg2 }: { size?: number; tone?: string }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid color-mix(in srgb, ${tone} 25%, transparent)`,
        borderTopColor: tone,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

// ── Fields ────────────────────────────────────────────────────────────────

const fieldBase: CSSProperties = {
  width: "100%",
  backgroundColor: c.surface,
  border: `1px solid ${c.line}`,
  borderRadius: radius.md,
  color: c.fg,
  padding: "13px 14px",
  boxSizing: "border-box",
  transition: "border-color 0.18s ease, background-color 0.18s ease",
};

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {label && (
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: c.fg3,
          }}
        >
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <div style={{ fontSize: 11.5, color: error ? c.danger : c.fg4, lineHeight: 1.4 }}>
          {error || hint}
        </div>
      )}
    </div>
  );
}

export function Input({
  style,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { style?: CSSProperties }) {
  return <input style={{ ...fieldBase, ...style }} {...rest} />;
}

export function Textarea({
  style,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { style?: CSSProperties }) {
  return <textarea rows={rows} style={{ ...fieldBase, resize: "none", ...style }} {...rest} />;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => {
          haptic("select");
          onChange(e.target.value);
        }}
        style={{ ...fieldBase, paddingRight: 38, backgroundColor: c.surface2 }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        style={{
          position: "absolute",
          right: 13,
          top: "50%",
          transform: "translateY(-50%)",
          color: c.fg3,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────

export function SearchField({
  value,
  onChange,
  placeholder = "Zoeken",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <Search
        size={16}
        style={{ position: "absolute", left: 13, color: c.fg4, pointerEvents: "none" }}
      />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // Search fields are the one place iOS autocorrect actively hurts:
        // it rewrites half-typed names into unrelated words mid-query.
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        style={{
          ...fieldBase,
          paddingLeft: 38,
          paddingRight: value ? 40 : 14,
          borderRadius: radius.pill,
          backgroundColor: c.surface2,
        }}
      />
      {value && (
        <Press
          onClick={() => onChange("")}
          aria-label="Wissen"
          style={{
            position: "absolute",
            right: 4,
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            color: c.fg3,
          }}
        >
          <X size={15} />
        </Press>
      )}
    </div>
  );
}

// ── Switch ────────────────────────────────────────────────────────────────

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}) {
  const id = useId();
  return (
    <Press
      onClick={() => onChange(!checked)}
      feedback="select"
      scale={false}
      aria-pressed={checked}
      aria-labelledby={label ? id : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        minHeight: 44,
      }}
    >
      {label && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id={id} style={{ fontSize: 14, fontWeight: 600, color: c.fg }}>
            {label}
          </div>
          {description && (
            <div style={{ fontSize: 11.5, color: c.fg3, marginTop: 2, lineHeight: 1.4 }}>
              {description}
            </div>
          )}
        </div>
      )}
      <motion.span
        animate={{ backgroundColor: checked ? c.copper : c.line2 }}
        transition={{ duration: 0.2 }}
        style={{
          width: 46,
          height: 28,
          borderRadius: radius.pill,
          padding: 3,
          display: "flex",
          flexShrink: 0,
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <motion.span
          layout
          transition={spring.snappy}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
          }}
        />
      </motion.span>
    </Press>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────

/**
 * Sliding pill selector. The indicator is a shared `layoutId` element, so it
 * physically travels between segments instead of cross-fading — the difference
 * between "an app" and "a set of radio buttons".
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; badge?: number }[];
  size?: "sm" | "md";
}) {
  const id = useId();
  const h = size === "sm" ? 32 : 38;
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        padding: 3,
        gap: 2,
        backgroundColor: c.surface,
        border: `1px solid ${c.line}`,
        borderRadius: radius.pill,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Press
            key={o.value}
            role="tab"
            aria-selected={active}
            feedback="select"
            scale={false}
            onClick={() => onChange(o.value)}
            style={{
              position: "relative",
              flex: 1,
              minHeight: h,
              display: "grid",
              placeItems: "center",
              borderRadius: radius.pill,
            }}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring.snappy}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: radius.pill,
                  backgroundColor: c.surface3,
                  border: `1px solid ${c.line2}`,
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: size === "sm" ? 11.5 : 12.5,
                fontWeight: active ? 700 : 500,
                color: active ? c.fg : c.fg3,
                letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
                transition: "color 0.2s ease",
              }}
            >
              {o.label}
              {!!o.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: active ? c.copper : c.fg4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {o.badge}
                </span>
              )}
            </span>
          </Press>
        );
      })}
    </div>
  );
}

// ── Checkbox row ──────────────────────────────────────────────────────────

export function CheckRow({
  checked,
  onChange,
  label,
  meta,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <Press
      onClick={() => onChange(!checked)}
      feedback={checked ? "tap" : "success"}
      scale={false}
      aria-pressed={checked}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 44 }}
    >
      <motion.span
        animate={{
          backgroundColor: checked ? c.copper : "transparent",
          borderColor: checked ? c.copper : c.line2,
        }}
        transition={{ duration: 0.16 }}
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: 7,
          border: "1.5px solid",
          display: "grid",
          placeItems: "center",
        }}
      >
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={spring.snappy}
          style={{ display: "grid" }}
        >
          <Check size={14} strokeWidth={3.2} color="#1a0c04" />
        </motion.span>
      </motion.span>
      <div style={{ flex: 1, minWidth: 0 }}>{label}</div>
      {meta}
    </Press>
  );
}

export { Spinner };

// ── File picker ───────────────────────────────────────────────────────────

/**
 * Wraps a hidden file input in a normal-looking tap target. `capture` is left
 * off deliberately: on iOS it forces the camera and removes the photo-library
 * option, which is where the shots being uploaded actually live.
 */
export function FilePicker({
  onFiles,
  accept = "image/*",
  multiple = false,
  children,
  busy = false,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  children: ReactNode;
  busy?: boolean;
}) {
  const [key, setKey] = useState(0);
  return (
    <label style={{ display: "block", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
      <input
        key={key}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={busy}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) {
            haptic("tap");
            onFiles(files);
          }
          // Remount the input so picking the same file twice still fires.
          setKey((k) => k + 1);
        }}
        style={{ display: "none" }}
      />
      {children}
    </label>
  );
}
