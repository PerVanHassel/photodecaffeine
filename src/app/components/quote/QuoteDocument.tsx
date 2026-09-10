/**
 * A price quote, laid out the way the client sees it.
 *
 * The same component renders the preview in the admin panel and the public
 * page the emailed link opens, so there is one design to keep right. It always
 * draws itself dark — that is the client's view, whatever theme the admin
 * panel happens to be in.
 */

export interface QuoteLine {
  label: string;
  amount: number;
  note?: string;
}

export interface QuoteTerm {
  label: string;
  text: string;
}

export interface QuoteDoc {
  number?: string;
  type?: "photo" | "web";
  title: string;
  subtitle?: string;
  clientName?: string;
  intro?: string;
  monthly: QuoteLine[];
  oneTime: QuoteLine[];
  included: string[];
  terms: QuoteTerm[];
  notes?: string;
  validUntil?: string;
}

const ACCENT = "#c8905a";
const CREAM = "#fffbe0";
const GREEN = "rgba(120,190,140,0.95)";

export function euro(amount: number): string {
  const n = Number(amount) || 0;
  const decimals = Math.round(n * 100) % 100 === 0 ? 0 : 2;
  return `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function quoteSum(lines: QuoteLine[]): number {
  return Math.round((lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0) * 100) / 100;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function LineBlock({
  label,
  lines,
  totalLabel,
  perMonth,
}: {
  label: string;
  lines: QuoteLine[];
  totalLabel: string;
  perMonth?: boolean;
}) {
  if (!lines || lines.length === 0) return null;
  const total = quoteSum(lines);

  return (
    <section
      style={{
        border: "1px solid rgba(255,251,224,0.09)",
        backgroundColor: "rgba(255,251,224,0.025)",
        padding: "20px",
      }}
    >
      <div
        style={{
          color: "rgba(255,251,224,0.3)",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          marginBottom: "14px",
        }}
      >
        {label}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {lines.map((l, i) => (
          <div
            key={`${l.label}-${i}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "16px",
              padding: "10px 0",
              borderBottom: "1px solid rgba(255,251,224,0.05)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: CREAM, fontSize: "14px" }}>{l.label}</div>
              {l.note ? (
                <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "11.5px", marginTop: "3px", lineHeight: 1.5 }}>
                  {l.note}
                </div>
              ) : null}
            </div>
            <div
              style={{
                color: CREAM,
                fontSize: "14px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {euro(l.amount)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          backgroundColor: "rgba(200,144,90,0.08)",
          padding: "14px 16px",
          marginTop: "16px",
        }}
      >
        <span style={{ color: "rgba(255,251,224,0.55)", fontSize: "12px" }}>{totalLabel}</span>
        <span style={{ whiteSpace: "nowrap" }}>
          <span
            style={{
              color: ACCENT,
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {euro(total)}
          </span>
          {perMonth && (
            <span style={{ color: "rgba(255,251,224,0.3)", fontSize: "12px" }}> p/m</span>
          )}
        </span>
      </div>
    </section>
  );
}

export function QuoteDocument({ quote }: { quote: QuoteDoc }) {
  const monthly = quote.monthly || [];
  const oneTime = quote.oneTime || [];
  const included = quote.included || [];
  const terms = quote.terms || [];

  return (
    <article
      style={{
        fontFamily: "'Inter', sans-serif",
        color: CREAM,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <header>
        <div
          style={{
            color: ACCENT,
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Prijsopgave{quote.number ? ` · ${quote.number}` : ""}
        </div>
        <h1
          style={{
            color: CREAM,
            fontSize: "clamp(24px, 4vw, 34px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            margin: 0,
            textWrap: "balance",
          }}
        >
          {quote.title || "Prijsopgave"}
        </h1>
        {quote.subtitle ? (
          <p style={{ color: "rgba(255,251,224,0.45)", fontSize: "14px", fontWeight: 300, margin: "8px 0 0" }}>
            {quote.subtitle}
          </p>
        ) : null}
        {quote.intro ? (
          <p style={{ color: "rgba(255,251,224,0.55)", fontSize: "14px", fontWeight: 300, lineHeight: 1.75, margin: "16px 0 0", maxWidth: "62ch" }}>
            {quote.intro}
          </p>
        ) : null}
      </header>

      <LineBlock label="Maandelijks" lines={monthly} totalLabel="Totaal per maand" perMonth />
      <LineBlock label="Eenmalig" lines={oneTime} totalLabel="Totaal eenmalig" />

      {included.length > 0 && (
        <section
          style={{
            border: "1px solid rgba(120,190,140,0.2)",
            backgroundColor: "rgba(120,190,140,0.07)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "12px" }}>
            <span aria-hidden="true" style={{ color: GREEN, fontSize: "14px", lineHeight: 1 }}>✓</span>
            <span style={{ color: GREEN, fontSize: "13px", fontWeight: 700 }}>Wat is inbegrepen</span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {included.map((item, i) => (
              <li key={`${item}-${i}`} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ color: "rgba(120,190,140,0.6)", fontSize: "13px", lineHeight: 1.6 }}>•</span>
                <span style={{ color: GREEN, fontSize: "13.5px", lineHeight: 1.6 }}>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {terms.length > 0 && (
        <section style={{ borderTop: "1px solid rgba(255,251,224,0.07)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {terms.map((t, i) => (
            <p key={`${t.label}-${i}`} style={{ margin: 0, fontSize: "13px", lineHeight: 1.7 }}>
              {t.label ? <strong style={{ color: CREAM, fontWeight: 700 }}>{t.label}: </strong> : null}
              <span style={{ color: "rgba(255,251,224,0.55)" }}>{t.text}</span>
            </p>
          ))}
        </section>
      )}

      {quote.notes ? (
        <p style={{ color: "rgba(255,251,224,0.55)", fontSize: "13px", lineHeight: 1.75, margin: 0, maxWidth: "62ch", whiteSpace: "pre-wrap" }}>
          {quote.notes}
        </p>
      ) : null}

      {quote.validUntil ? (
        <p style={{ color: "rgba(255,251,224,0.28)", fontSize: "12px", margin: 0 }}>
          Deze prijsopgave is geldig tot {formatDate(quote.validUntil)}.
        </p>
      ) : null}
    </article>
  );
}
