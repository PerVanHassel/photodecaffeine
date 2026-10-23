// The language check: spelling and grammar from LanguageTool (its free
// public service, Dutch), plus the house style for site texts from
// CLAUDE.md: je instead of u, no dashes as a pause, no advertising talk.

export interface CheckField {
  key: string;
  label: string;
  text: string;
}

export type IssueKind = "spelling" | "grammar" | "style" | "house";

export interface Issue {
  id: string;
  field: string;
  offset: number;
  length: number;
  /** The text the issue is about, to check it is still there before changing it. */
  original: string;
  message: string;
  replacements: string[];
  kind: IssueKind;
}

const ENDPOINT = "https://api.languagetool.org/v2/check";
/** The free service takes up to 20 000 characters per request. */
const CHUNK = 15000;
const SEP = "\n\n";

const HOUSE: { re: RegExp; message: string; fix: (m: string) => string[]; kind?: IssueKind }[] = [
  {
    // A dash with spaces round it, or any long dash. "2024–2025" stays.
    re: /\s[—–]\s|—/g,
    message: "Geen gedachtestreepje. Gebruik een komma of een dubbele punt, of maak er twee zinnen van.",
    fix: () => [", ", ": "],
  },
  {
    re: /\b([Uu]w?)\b/g,
    message: "Schrijf je of jouw in plaats van u of uw.",
    fix: (m) => ({ u: ["je"], U: ["Je"], uw: ["je", "jouw"], Uw: ["Je", "Jouw"] } as Record<string, string[]>)[m] || ["je"],
  },
  { re: / {2,}/g, message: "Dubbele spatie.", fix: () => [" "] },
  {
    re: /\b(naadlo(?:os|ze)|ontketen\w*|baanbrekend\w*|revolutionair\w*|ultieme|next level|tot in de puntjes|duik in|in de wereld van|zorgeloze?|onvergetelijke?)\b/gi,
    message: "Klinkt als reclametaal. Zeg het gewoner.",
    fix: () => [],
    kind: "style",
  },
];

const WORDS_KEY = "pdc-taal-goed";

/** Words someone marked as right (names, places), kept in this browser. */
export function knownWords(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(WORDS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function addKnownWord(word: string) {
  const words = knownWords();
  words.add(word.toLowerCase());
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify([...words]));
  } catch {
    // Private mode: it is forgotten after this session.
  }
}

/** Link addresses and the bold/italic marks are not language. */
function skipRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) out.push([m.index!, m.index! + m[0].length]);
  for (const m of text.matchAll(/https?:\/\/\S+/g)) out.push([m.index!, m.index! + m[0].length]);
  return out;
}

const overlaps = (ranges: [number, number][], from: number, to: number) => ranges.some(([a, b]) => from < b && to > a);

function houseIssues(field: CheckField): Issue[] {
  const out: Issue[] = [];
  for (const rule of HOUSE) {
    for (const m of field.text.matchAll(rule.re)) {
      out.push({
        id: `${field.key}:${m.index}:house:${rule.message.length}`,
        field: field.key,
        offset: m.index!,
        length: m[0].length,
        original: m[0],
        message: rule.message,
        replacements: rule.fix(m[0].trim() || m[0]),
        kind: rule.kind || "house",
      });
    }
  }
  return out;
}

type LtMatch = {
  offset: number;
  length: number;
  message: string;
  replacements: { value: string }[];
  rule: { id: string; issueType?: string };
};

async function languageTool(text: string, signal?: AbortSignal): Promise<LtMatch[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text, language: "nl-NL" }),
    signal,
  });
  if (res.status === 429) throw new Error("De taalcheck is even te druk. Probeer het over een minuut opnieuw.");
  if (!res.ok) throw new Error(`De taalcheck gaf een fout (${res.status}). Probeer het later opnieuw.`);
  const json = await res.json();
  return json.matches || [];
}

const kindOf = (m: LtMatch): IssueKind =>
  m.rule.issueType === "misspelling" ? "spelling" : m.rule.issueType === "style" || m.rule.issueType === "locale-violation" ? "style" : "grammar";

/** Checks every field; the issues come back in the order of the fields. */
export async function checkTexts(fields: CheckField[], signal?: AbortSignal): Promise<Issue[]> {
  const todo = fields.filter((f) => f.text.trim());
  const known = knownWords();
  const issues: Issue[] = todo.flatMap(houseIssues);

  // Fields go in batches, joined by an empty line; offsets are mapped back.
  let batch: { field: CheckField; start: number }[] = [];
  let length = 0;
  const flush = async () => {
    if (!batch.length) return;
    const text = batch.map((b) => b.field.text).join(SEP);
    const matches = await languageTool(text, signal);
    for (const m of matches) {
      const at = batch.find((b) => m.offset >= b.start && m.offset + m.length <= b.start + b.field.text.length);
      if (!at) continue;
      const offset = m.offset - at.start;
      const original = at.field.text.slice(offset, offset + m.length);
      if (overlaps(skipRanges(at.field.text), offset, offset + m.length)) continue;
      if (kindOf(m) === "spelling" && known.has(original.toLowerCase())) continue;
      issues.push({
        id: `${at.field.key}:${offset}:${m.rule.id}`,
        field: at.field.key,
        offset,
        length: m.length,
        original,
        message: m.message,
        replacements: m.replacements.slice(0, 4).map((r) => r.value),
        kind: kindOf(m),
      });
    }
    batch = [];
    length = 0;
  };
  for (const field of todo) {
    if (length + field.text.length > CHUNK) await flush();
    batch.push({ field, start: length });
    length += field.text.length + SEP.length;
  }
  await flush();

  const order = new Map(fields.map((f, i) => [f.key, i]));
  // One spot can be flagged twice (house style and LanguageTool); keep the first.
  const seen = new Set<string>();
  return issues
    .sort((a, b) => order.get(a.field)! - order.get(b.field)! || a.offset - b.offset)
    .filter((i) => {
      const spot = `${i.field}:${i.offset}:${i.length}`;
      if (seen.has(spot)) return false;
      seen.add(spot);
      return true;
    });
}

/** The text with one fix applied, or null when the text there changed meanwhile. */
export function applyFix(text: string, issue: Issue, replacement: string): string | null {
  if (text.slice(issue.offset, issue.offset + issue.length) !== issue.original) return null;
  return text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
}

/** The other issues after a fix: later ones in the same field move along, overlapping ones go. */
export function afterFix(issues: Issue[], fixed: Issue, replacement: string): Issue[] {
  const delta = replacement.length - fixed.length;
  const end = fixed.offset + fixed.length;
  return issues
    .filter((i) => i.id !== fixed.id)
    .filter((i) => i.field !== fixed.field || i.offset >= end || i.offset + i.length <= fixed.offset)
    .map((i) => (i.field === fixed.field && i.offset >= end ? { ...i, offset: i.offset + delta } : i));
}
