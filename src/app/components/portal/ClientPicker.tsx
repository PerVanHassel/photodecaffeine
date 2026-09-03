import { useState, useMemo } from "react";
import { Check, X, Search, Users } from "lucide-react";

export interface PickableClient {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface ClientPickerProps {
  /** Ids currently attached, in order. The first is the primary client. */
  selected: string[];
  onChange: (ids: string[]) => void;
  clients: PickableClient[];
  /** Cannot be removed — the client whose page you are on, for instance. */
  lockedId?: string;
}

/**
 * Attaches one or more clients to a project.
 *
 * Selected clients show as removable chips; the search box below filters the
 * rest by name, company or email. `lockedId` pins a client in place so a page
 * scoped to one client can't accidentally detach them.
 */
export function ClientPicker({ selected, onChange, clients, lockedId }: ClientPickerProps) {
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => !selected.includes(c.id))
      .filter((c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [clients, selected, query]);

  function add(id: string) {
    onChange([...selected, id]);
    setQuery("");
  }

  function remove(id: string) {
    if (id === lockedId) return;
    onChange(selected.filter((x) => x !== id));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(var(--admin-fg-rgb),calc(0.03 * var(--admin-fg-boost)))",
    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))",
    color: "var(--admin-fg-solid)",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 300,
    padding: "10px 14px 10px 34px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
          {selected.map((id, i) => {
            const c = byId.get(id);
            const locked = id === lockedId;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  backgroundColor: "rgba(200,144,90,0.1)",
                  border: "1px solid rgba(200,144,90,0.25)",
                  color: "#c8905a",
                  fontSize: "12px",
                  padding: "6px 10px",
                }}
              >
                {i === 0 && (
                  <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.75 }}>
                    Hoofd
                  </span>
                )}
                {c ? c.name : "Onbekende klant"}
                {!locked && (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={`${c ? c.name : "klant"} loskoppelen`}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, display: "flex", opacity: 0.7 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <Search
          size={13}
          color="rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))"
          style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Klant zoeken om toe te voegen…"
          style={inputStyle}
        />
      </div>

      {available.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "6px", border: "1px solid rgba(var(--admin-fg-rgb),calc(0.08 * var(--admin-fg-boost)))" }}>
          {available.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => add(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                background: "none",
                border: "none",
                borderBottom: "1px solid rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))",
                color: "var(--admin-fg-solid)",
                padding: "9px 12px",
                fontSize: "13px",
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Check size={12} color="#c8905a" />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
                {c.company && (
                  <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))" }}> · {c.company}</span>
                )}
              </span>
              <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "11px", flexShrink: 0 }}>
                {c.email}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "9px", color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "11px" }}>
          <Users size={11} />
          Alle {selected.length} klanten zien dit project en krijgen de mails erover.
        </div>
      )}
    </div>
  );
}
