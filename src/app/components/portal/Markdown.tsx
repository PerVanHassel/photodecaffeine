import { Fragment, type ReactNode } from "react";

/**
 * Een kleine markdown-weergave voor het adminpaneel.
 *
 * Genoeg voor de briefings die uit een intakegesprek komen: koppen, tabellen,
 * lijstjes, aanvinkregels, citaten, streepjes en de gebruikelijke opmaak in een
 * regel. Bewust geen bibliotheek en bewust geen `dangerouslySetInnerHTML` — wat
 * hier binnenkomt is geplakte tekst, en die wordt dus als tekst opgebouwd.
 *
 * Wat het niet doet: geplaatste afbeeldingen, geneste lijsten, html. Komt dat
 * in een volgende versie van het formulier voor, dan blijft het als platte
 * tekst staan in plaats van te verdwijnen.
 */

export interface MarkdownProps {
  source: string;
  /**
   * Zodra dit meegegeven is, worden `- [ ]`-regels aanklikbaar. Het krijgt het
   * regelnummer in de bron terug, zodat de aanroeper die ene regel kan omzetten.
   */
  onToggleTask?: (lineIndex: number) => void;
  /** Uit tijdens het opslaan, zodat er niet twee keer geklikt wordt. */
  busy?: boolean;
}

const fg = (a: number) => `rgba(var(--admin-fg-rgb),calc(${a} * var(--admin-fg-boost)))`;
const ACCENT = "#c8905a";

const TASK_RE = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;
const BULLET_RE = /^\s*[-*]\s+(.*)$/;
const NUMBER_RE = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const RULE_RE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_DIVIDER_RE = /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/;

/** Splitst een tabelregel op de pipes, zonder de lege cellen aan de randen. */
function tableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|") && line.includes("|");
}

/**
 * Opmaak binnen een regel: **vet**, *schuin*, `code` en [tekst](adres).
 * Alles wat er niet uitziet als opmaak blijft gewoon tekst.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-i${i++}`;
    if (m[2] !== undefined) {
      out.push(<strong key={key} style={{ color: "var(--admin-fg-solid)", fontWeight: 700 }}>{m[2]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={key}>{m[4]}</em>);
    } else if (m[6] !== undefined) {
      out.push(
        <code key={key} style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.92em", backgroundColor: fg(0.06), padding: "1px 5px",
          color: "var(--admin-fg-solid)",
        }}>
          {m[6]}
        </code>
      );
    } else if (m[8] !== undefined) {
      const href = m[9];
      const safe = /^(https?:|mailto:|tel:)/i.test(href);
      out.push(
        safe ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
            {m[8]}
          </a>
        ) : (
          // Een pad naar een bestand naast de briefing is geen link die wij
          // kunnen openen; laat zien wat er staat.
          <span key={key} style={{ color: fg(0.45) }}>{m[8]}</span>
        )
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

export function Markdown({ source, onToggleTask, busy }: MarkdownProps) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let i = 0;
  let key = 0;
  const next = () => `b${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Streep
    if (RULE_RE.test(line)) {
      blocks.push(<hr key={next()} style={{ border: "none", borderTop: `1px solid ${fg(0.1)}`, margin: "22px 0" }} />);
      i += 1;
      continue;
    }

    // Kop
    const heading = line.match(HEADING_RE);
    if (heading) {
      const level = heading[1].length;
      const sizes = [19, 16, 14, 13, 12.5, 12];
      const size = sizes[Math.min(level, sizes.length) - 1];
      blocks.push(
        <div
          key={next()}
          style={{
            color: "var(--admin-fg-solid)",
            fontSize: `${size}px`,
            fontWeight: level <= 2 ? 700 : 600,
            letterSpacing: "-0.01em",
            margin: level <= 2 ? "26px 0 10px" : "18px 0 8px",
            lineHeight: 1.35,
          }}
        >
          {inline(heading[2], next())}
        </div>
      );
      i += 1;
      continue;
    }

    // Tabel: koprij, streepjesrij, dan de rest
    if (isTableRow(line) && i + 1 < lines.length && TABLE_DIVIDER_RE.test(lines[i + 1])) {
      const head = tableCells(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(tableCells(lines[j]));
        j += 1;
      }
      // Een kop die helemaal leeg is, is alleen bedoeld om twee kolommen naast
      // elkaar te zetten. Die laten we weg.
      const showHead = head.some((h) => h !== "");
      blocks.push(
        <div key={next()} style={{ overflowX: "auto", margin: "10px 0 16px" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12.5px" }}>
            {showHead && (
              <thead>
                <tr>
                  {head.map((cell, n) => (
                    <th
                      key={n}
                      style={{
                        textAlign: "left", padding: "7px 12px 7px 0",
                        borderBottom: `1px solid ${fg(0.14)}`,
                        color: fg(0.4), fontSize: "9px", fontWeight: 600,
                        letterSpacing: "0.18em", textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inline(cell, next())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, n) => (
                <tr key={n}>
                  {row.map((cell, m2) => (
                    <td
                      key={m2}
                      style={{
                        padding: "8px 12px 8px 0",
                        borderBottom: `1px solid ${fg(0.06)}`,
                        color: "var(--admin-fg-solid)",
                        verticalAlign: "top", lineHeight: 1.6,
                      }}
                    >
                      {inline(cell, next())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j;
      continue;
    }

    // Citaat — een of meer regels achter elkaar
    if (QUOTE_RE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoted.push(lines[i].match(QUOTE_RE)![1]);
        i += 1;
      }
      blocks.push(
        <blockquote
          key={next()}
          style={{
            borderLeft: `2px solid ${ACCENT}`, paddingLeft: "14px",
            margin: "10px 0 14px", color: fg(0.55), fontSize: "13px",
            lineHeight: 1.75, fontStyle: "italic",
          }}
        >
          {quoted.map((q, n) => (
            <div key={n}>{inline(q, next())}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    // Lijst: opsomming, genummerd of aanvinkbaar — alles in één blok
    if (TASK_RE.test(line) || BULLET_RE.test(line) || NUMBER_RE.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && (TASK_RE.test(lines[i]) || BULLET_RE.test(lines[i]) || NUMBER_RE.test(lines[i]))) {
        const at = i;
        const task = lines[i].match(TASK_RE);
        const numbered = lines[i].match(NUMBER_RE);
        if (task) {
          const done = task[1].toLowerCase() === "x";
          const text = task[2];
          items.push(
            <li key={at} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "3px 0" }}>
              {onToggleTask ? (
                <button
                  type="button"
                  onClick={() => onToggleTask(at)}
                  disabled={busy}
                  aria-pressed={done}
                  aria-label={done ? `${text} — afvinken ongedaan maken` : `${text} — afvinken`}
                  style={{
                    flexShrink: 0, marginTop: "2px", width: "14px", height: "14px",
                    backgroundColor: done ? "rgba(120,190,140,0.18)" : fg(0.04),
                    border: `1px solid ${done ? "rgba(120,190,140,0.5)" : fg(0.18)}`,
                    color: "rgba(120,190,140,0.95)", cursor: busy ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, fontSize: "10px", lineHeight: 1,
                  }}
                >
                  {done ? "✓" : ""}
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0, marginTop: "2px", width: "14px", height: "14px",
                    border: `1px solid ${done ? "rgba(120,190,140,0.5)" : fg(0.18)}`,
                    color: "rgba(120,190,140,0.95)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "10px",
                  }}
                >
                  {done ? "✓" : ""}
                </span>
              )}
              <span style={{
                color: done ? fg(0.35) : "var(--admin-fg-solid)",
                fontSize: "13px", lineHeight: 1.7,
                textDecoration: done ? "line-through" : "none",
              }}>
                {inline(text, `t${at}`)}
              </span>
            </li>
          );
        } else if (numbered) {
          items.push(
            <li key={at} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "3px 0" }}>
              <span style={{ color: ACCENT, fontSize: "12px", lineHeight: 1.8, flexShrink: 0, minWidth: "14px" }}>
                {numbered[1]}.
              </span>
              <span style={{ color: "var(--admin-fg-solid)", fontSize: "13px", lineHeight: 1.7 }}>
                {inline(numbered[2], `n${at}`)}
              </span>
            </li>
          );
        } else {
          const bullet = lines[i].match(BULLET_RE)!;
          items.push(
            <li key={at} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "3px 0" }}>
              <span aria-hidden="true" style={{ color: ACCENT, fontSize: "13px", lineHeight: 1.7, flexShrink: 0 }}>·</span>
              <span style={{ color: "var(--admin-fg-solid)", fontSize: "13px", lineHeight: 1.7 }}>
                {inline(bullet[1], `l${at}`)}
              </span>
            </li>
          );
        }
        i += 1;
      }
      blocks.push(
        <ul key={next()} style={{ listStyle: "none", margin: "6px 0 14px", padding: 0 }}>
          {items}
        </ul>
      );
      continue;
    }

    // Alinea — losse regels lopen door tot de volgende lege regel
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !RULE_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !TASK_RE.test(lines[i]) &&
      !BULLET_RE.test(lines[i]) &&
      !NUMBER_RE.test(lines[i]) &&
      !isTableRow(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }

    // Niets opgepakt: dit is een regel die er als een tabel uitziet maar er
    // geen is (bijvoorbeeld een losse rij zonder streepjesregel erboven). Neem
    // hem als gewone tekst mee. Zonder dit stapje zou de teller hier blijven
    // staan en de weergave vastlopen — en het formulier verandert nog.
    if (para.length === 0) {
      para.push(lines[i]);
      i += 1;
    }

    if (para.length) {
      blocks.push(
        <p key={next()} style={{ color: fg(0.6), fontSize: "13px", lineHeight: 1.75, margin: "0 0 12px" }}>
          {para.map((l, n) => (
            <Fragment key={n}>
              {n > 0 && <br />}
              {inline(l, `p${n}`)}
            </Fragment>
          ))}
        </p>
      );
    }
  }

  return <div>{blocks}</div>;
}

/** Zet `- [ ]` om naar `- [x]` en terug, op die ene regel. */
export function toggleTaskLine(source: string, lineIndex: number): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return source;
  const m = line.match(TASK_RE);
  if (!m) return source;
  lines[lineIndex] = m[1].toLowerCase() === "x"
    ? line.replace(/\[[xX]\]/, "[ ]")
    : line.replace(/\[ \]/, "[x]");
  return lines.join("\n");
}

/** Hoeveel aanvinkregels er staan, en hoeveel daarvan af zijn. */
export function taskCount(source: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    const m = line.match(TASK_RE);
    if (!m) continue;
    total += 1;
    if (m[1].toLowerCase() === "x") done += 1;
  }
  return { done, total };
}
