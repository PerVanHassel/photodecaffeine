import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { Check, CornerDownLeft, Plus } from "lucide-react";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  /** Every category string in use, duplicates included — counts are derived from it. */
  existing: string[];
  placeholder?: string;
}

interface Option {
  name: string;
  count: number;
}

/**
 * A free-text category field that knows which categories already exist.
 *
 * Three ways in, so it stays fast whichever the user prefers:
 *   - Focus and pick from the list (most-used first), mouse or arrow keys.
 *   - Start typing: the rest of the best prefix match is filled in and
 *     selected, so continuing to type overwrites it and Tab or -> accepts it.
 *   - Ignore all of it and type something new — that still just works, which is
 *     why this is a combobox and not a <select>.
 *
 * Matching is accent- and case-insensitive, and the list matches anywhere in
 * the name while inline completion only fires on a prefix — completing from
 * the middle of a word would fight the typist.
 */
export function CategoryCombobox({ value, onChange, existing, placeholder }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Set when a keystroke triggered an inline completion; applied after render
  // so the selection lands on the text React has actually committed.
  const pendingSelection = useRef<[number, number] | null>(null);

  const options = useMemo<Option[]>(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const raw of existing) {
      const name = (raw || "").trim();
      // Internal entries (category starting with "_") aren't real categories.
      if (!name || name.startsWith("_")) continue;
      const key = norm(name);
      const hit = counts.get(key);
      if (hit) hit.count += 1;
      else counts.set(key, { name, count: 1 });
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [existing]);

  const query = value.trim();
  const filtered = useMemo(() => {
    if (!query) return options;
    const q = norm(query);
    return options
      .filter((o) => norm(o.name).includes(q))
      // A prefix match is what the user most likely means; float those up.
      .sort((a, b) => {
        const ap = norm(a.name).startsWith(q) ? 0 : 1;
        const bp = norm(b.name).startsWith(q) ? 0 : 1;
        return ap - bp || b.count - a.count;
      });
  }, [options, query]);

  const exactExists = options.some((o) => norm(o.name) === norm(query));
  const showCreateRow = query.length > 0 && !exactExists;

  useEffect(() => {
    if (highlight > filtered.length - 1) setHighlight(0);
  }, [filtered.length, highlight]);

  // Close when the click lands outside — blur would fire before an option's
  // click and swallow the selection.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useLayoutEffect(() => {
    if (pendingSelection.current && inputRef.current) {
      const [start, end] = pendingSelection.current;
      inputRef.current.setSelectionRange(start, end);
      pendingSelection.current = null;
    }
  });

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.children[highlight] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const typed = e.target.value;
    const inputType = (e.nativeEvent as InputEvent).inputType;
    setOpen(true);
    setHighlight(0);

    // Only complete while typing forward. Completing during a backspace would
    // re-add the characters the user is trying to remove.
    if (inputType === "insertText" && typed) {
      const match = options.find(
        (o) => norm(o.name).startsWith(norm(typed)) && o.name.length > typed.length
      );
      if (match) {
        onChange(match.name);
        pendingSelection.current = [typed.length, match.name.length];
        return;
      }
    }
    onChange(typed);
  }

  function commit(name: string) {
    onChange(name);
    setOpen(false);
    // Caret to the end, nothing selected — the value is settled.
    pendingSelection.current = [name.length, name.length];
    inputRef.current?.focus();
  }

  /** Drops the selected completion so the caret sits at the end of the value. */
  function acceptInline() {
    const el = inputRef.current;
    if (!el || el.selectionStart === el.selectionEnd) return false;
    el.setSelectionRange(value.length, value.length);
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => (filtered.length ? (h + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => (filtered.length ? (h - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        // Enter picks the highlighted category rather than submitting the form.
        e.preventDefault();
        commit(filtered[highlight].name);
      } else {
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      // Accept the inline completion, then let focus move on as normal.
      acceptInline();
      setOpen(false);
    } else if (e.key === "ArrowRight" || e.key === "End") {
      if (acceptInline()) e.preventDefault();
    } else if (e.key === "Escape") {
      if (open) {
        // Don't let the surrounding modal close too.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="both"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          backgroundColor: "rgba(var(--admin-bg-card-rgb),0.8)",
          border: `1px solid ${open ? "rgba(200,144,90,0.45)" : "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))"}`,
          color: "var(--admin-fg-solid)",
          padding: "12px",
          fontSize: "14px",
          fontFamily: "'Inter', sans-serif",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s ease",
        }}
      />

      {open && (filtered.length > 0 || showCreateRow) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: "var(--admin-bg-card)",
            border: "1px solid rgba(200,144,90,0.3)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          }}
        >
          <div ref={listRef} style={{ maxHeight: "216px", overflowY: "auto" }}>
            {filtered.map((opt, i) => {
              const active = i === highlight;
              const isCurrent = norm(opt.name) === norm(query);
              return (
                <button
                  key={opt.name}
                  type="button"
                  // Keeps focus in the input so the click doesn't blur-close first.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(opt.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    textAlign: "left",
                    background: active ? "rgba(200,144,90,0.14)" : "none",
                    border: "none",
                    borderLeft: `2px solid ${active ? "#c8905a" : "transparent"}`,
                    color: "var(--admin-fg-solid)",
                    padding: "10px 12px",
                    fontSize: "13.5px",
                    fontFamily: "'Inter', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: "13px", flexShrink: 0, display: "flex" }}>
                    {isCurrent && <Check size={13} color="#c8905a" />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt.name}
                  </span>
                  <span
                    style={{
                      color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))",
                      fontSize: "11px",
                      flexShrink: 0,
                    }}
                  >
                    {opt.count}×
                  </span>
                  {active && <CornerDownLeft size={12} color="rgba(200,144,90,0.7)" style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {showCreateRow && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 12px",
                borderTop: filtered.length > 0 ? "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))" : "none",
                color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
                fontSize: "11.5px",
              }}
            >
              <Plus size={11} color="#c8905a" />
              New category: <span style={{ color: "var(--admin-fg-solid)" }}>{query}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Case- and accent-insensitive, so "edele" still finds "Édele". */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
