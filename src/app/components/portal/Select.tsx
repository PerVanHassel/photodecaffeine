import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional second line, for when the label alone is not enough. */
  hint?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when nothing is selected. */
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Needed when no <label> points at this control. */
  ariaLabel?: string;
  /** Set to false to size to the content rather than fill its column. */
  block?: boolean;
  /** "underline" matches the public contact form; the admin look is default. */
  variant?: keyof typeof THEMES;
  style?: React.CSSProperties;
}

const fg = (a: number) => `rgba(var(--admin-fg-rgb),calc(${a} * var(--admin-fg-boost)))`;

/** The two places this control appears: the admin panel and the public form. */
const THEMES = {
  admin: {
    field: fg(0.03), border: fg(0.1), borderOpen: "rgba(200,144,90,0.5)",
    text: "var(--admin-fg-solid)", muted: fg(0.4), hint: fg(0.38),
    panel: "rgb(var(--admin-bg-card-rgb))", panelBorder: fg(0.16),
    hover: fg(0.07), off: fg(0.25),
    fontSize: "13px", padding: "10px 12px", underline: false,
  },
  underline: {
    field: "transparent", border: "rgba(255,251,224,0.12)", borderOpen: "rgba(255,251,224,0.5)",
    text: "#fffbe0", muted: "rgba(255,251,224,0.4)", hint: "rgba(255,251,224,0.35)",
    panel: "#1a0c04", panelBorder: "rgba(255,251,224,0.16)",
    hover: "rgba(255,251,224,0.07)", off: "rgba(255,251,224,0.25)",
    fontSize: "15px", padding: "16px 0", underline: true,
  },
} as const;

/**
 * A dropdown that is actually readable on this admin.
 *
 * A native <select> paints its option list with the browser's own popup, and
 * the panel here sets a light text colour on a nearly transparent background —
 * which the popup composites over white. Light text on white: unreadable, on
 * Chrome in particular. This draws the list itself, so both colours are ours.
 *
 * It keeps the keyboard behaviour people expect from a select: arrows and
 * Home/End move, Enter or Space picks, Escape closes, typing jumps to a match,
 * and focus returns to the button afterwards.
 */
export function Select({
  value, onChange, options, placeholder = "Kies…", id, disabled,
  ariaLabel, block = true, variant = "admin", style,
}: SelectProps) {
  const t = THEMES[variant];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const selectable = useCallback(
    (i: number) => !options[i]?.disabled,
    [options]
  );

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  function openList() {
    if (disabled) return;
    const at = options.findIndex((o) => o.value === value);
    setActive(at >= 0 ? at : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }

  // Opening downwards into the fold is worse than opening upwards.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const box = buttonRef.current.getBoundingClientRect();
    setDropUp(window.innerHeight - box.bottom < 240 && box.top > 240);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    // Capture, so a click that also opens another control still closes this.
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  function move(by: number) {
    setActive((current) => {
      let next = current;
      for (let i = 0; i < options.length; i++) {
        next = (next + by + options.length) % options.length;
        if (selectable(next)) return next;
      }
      return current;
    });
  }

  function edge(to: "first" | "last") {
    const order = to === "first" ? options.map((_, i) => i) : options.map((_, i) => i).reverse();
    const found = order.find(selectable);
    if (found !== undefined) setActive(found);
  }

  function jumpTo(char: string) {
    const now = Date.now();
    typed.current.text = now - typed.current.at > 800 ? char : typed.current.text + char;
    typed.current.at = now;
    const needle = typed.current.text.toLowerCase();
    const found = options.findIndex(
      (o) => !o.disabled && o.label.toLowerCase().startsWith(needle)
    );
    if (found >= 0) {
      setActive(found);
      if (!open) onChange(options[found].value);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      } else if (e.key.length === 1) {
        jumpTo(e.key);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); move(1); break;
      case "ArrowUp": e.preventDefault(); move(-1); break;
      case "Home": e.preventDefault(); edge("first"); break;
      case "End": e.preventDefault(); edge("last"); break;
      case "Escape": e.preventDefault(); close(); break;
      case "Tab": setOpen(false); break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[active] && !options[active].disabled) {
          onChange(options[active].value);
          close();
        }
        break;
      default:
        if (e.key.length === 1) jumpTo(e.key);
    }
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: block ? "100%" : "auto", ...style }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
          backgroundColor: t.field,
          border: t.underline ? "none" : `1px solid ${open ? t.borderOpen : t.border}`,
          borderBottom: `1px solid ${open ? t.borderOpen : t.border}`,
          color: selected ? t.text : t.muted,
          fontSize: t.fontSize,
          fontFamily: "'Inter', sans-serif",
          textAlign: "left",
          padding: t.padding,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          boxSizing: "border-box",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s ease",
            color: t.muted,
          }}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          style={{
            position: "absolute", zIndex: 50,
            left: 0, right: 0,
            [dropUp ? "bottom" : "top"]: "calc(100% + 4px)",
            maxHeight: "260px", overflowY: "auto",
            // Solid, not translucent: the whole point is that the list never
            // borrows a colour from whatever sits behind it.
            backgroundColor: t.panel,
            border: `1px solid ${t.panelBorder}`,
            boxShadow: "0 18px 40px -20px rgba(0,0,0,0.75)",
          }}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-active={i === active}
                onPointerEnter={() => !option.disabled && setActive(i)}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  close();
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  lineHeight: 1.45,
                  color: option.disabled ? t.off : t.text,
                  backgroundColor: i === active && !option.disabled ? t.hover : "transparent",
                  cursor: option.disabled ? "not-allowed" : "pointer",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  {option.label}
                  {option.hint && (
                    <span style={{ display: "block", color: fg(0.38), fontSize: "11.5px", marginTop: "2px" }}>
                      {option.hint}
                    </span>
                  )}
                </span>
                {isSelected && <Check size={13} color="#c8905a" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
          {options.length === 0 && (
            <div style={{ padding: "12px", fontSize: "12.5px", color: t.muted }}>
              Niets om te kiezen.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
