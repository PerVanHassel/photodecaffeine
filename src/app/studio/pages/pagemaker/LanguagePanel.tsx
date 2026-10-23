import { Check, Eye, RefreshCw, SpellCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ArticlePage } from "../../../lib/articlePage";
import { Button, Pill } from "../../ui";
import { addKnownWord, afterFix, applyFix, checkTexts, type CheckField, type Issue, type IssueKind } from "./langcheck";
import { blockName } from "./Panels";
import { updateBlock, withPage, type Commit, type Draft } from "./state";

type Field = CheckField & { block?: string; set: (d: Draft, value: string) => Draft };

/** Every text on the page that visitors read, with a way to write a fix back. */
export function checkFields(d: Draft, page: ArticlePage): Field[] {
  const fields: Field[] = [{ key: "title", label: "Titel", text: d.title, set: (x, v) => ({ ...x, title: v }) }];
  if (!d.page) {
    fields.push({ key: "description", label: "Tekst van het stuk", text: d.description, set: (x, v) => ({ ...x, description: v }) });
    return fields;
  }
  fields.push({ key: "subtitle", label: "Ondertitel", block: "hero", text: page.subtitle, set: (x, v) => withPage((p) => ({ ...p, subtitle: v }))(x) });
  page.blocks.forEach((b, i) => {
    const label = `${i + 1}. ${blockName(b)}`;
    const field = (part: string, text: string, write: (v: string) => (blk: typeof b) => typeof b, sub = "") =>
      fields.push({ key: `${b.id}:${part}`, label: sub ? `${label} · ${sub}` : label, block: b.id, text, set: (x, v) => updateBlock(b.id, write(v))(x) });
    if (b.type === "text" || b.type === "heading") field("text", b.text, (v) => (blk) => ({ ...blk, text: v }) as typeof b);
    if (b.type === "split") {
      field("heading", b.heading, (v) => (blk) => ({ ...blk, heading: v }) as typeof b, "kopje");
      field("text", b.text, (v) => (blk) => ({ ...blk, text: v }) as typeof b);
    }
    if (b.type === "quote") {
      field("text", b.text, (v) => (blk) => ({ ...blk, text: v }) as typeof b);
      field("role", b.role, (v) => (blk) => ({ ...blk, role: v }) as typeof b, "wie");
    }
    if (b.type === "media" || b.type === "embed") field("caption", b.caption, (v) => (blk) => ({ ...blk, caption: v }) as typeof b, "onderschrift");
    if (b.type === "facts") b.items.forEach((f, j) => field(`fact${j}`, f.value, (v) => (blk) => ({ ...blk, items: (blk as typeof b).items.map((x, k) => (k === j ? { ...x, value: v } : x)) }) as typeof b, f.label || "feit"));
  });
  return fields;
}

const KIND: Record<IssueKind, { label: string; tone: "bad" | "warn" | "info" | "acc" }> = {
  spelling: { label: "Spelling", tone: "bad" },
  grammar: { label: "Grammatica", tone: "warn" },
  style: { label: "Stijl", tone: "info" },
  house: { label: "Huisstijl", tone: "acc" },
};

export function LanguagePanel({ draft, page, commit, onReveal }: { draft: Draft; page: ArticlePage; commit: Commit; onReveal: (block: string) => void }) {
  const fields = useMemo(() => checkFields(draft, page), [draft, page]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [state, setState] = useState<"busy" | "done" | "error">("busy");
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  // The fields as they were checked; a fix needs the current text, a new check the latest fields.
  const latest = useRef(fields);
  latest.current = fields;

  async function run() {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setState("busy");
    try {
      setIssues(await checkTexts(latest.current, ctrl.signal));
      setState("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || "De taalcheck werkt nu niet.");
      setState("error");
    }
  }

  useEffect(() => {
    void run();
    return () => abort.current?.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function fix(issue: Issue, replacement: string) {
    const field = fields.find((f) => f.key === issue.field);
    const next = field && applyFix(field.text, issue, replacement);
    if (!field || next == null) {
      toast("Die tekst is intussen veranderd. Controleer opnieuw.");
      return;
    }
    commit((d) => field.set(d, next));
    setIssues((list) => afterFix(list, issue, replacement));
  }

  const dismiss = (issue: Issue) => setIssues((list) => list.filter((i) => i.id !== issue.id));
  const byField = fields.map((f) => ({ field: f, items: issues.filter((i) => i.field === f.key) })).filter((g) => g.items.length);

  return (
    <div className="s-stack lg">
      <div className="s-row between">
        <span className="s-small s-muted">
          {state === "busy" ? "Bezig met controleren…" : state === "error" ? "" : issues.length ? `${issues.length} ${issues.length === 1 ? "suggestie" : "suggesties"}` : "Geen fouten gevonden."}
        </span>
        <Button size="sm" icon={<RefreshCw />} loading={state === "busy"} onClick={() => void run()}>Opnieuw</Button>
      </div>
      {state === "error" && <div className="s-error" role="alert">{error}</div>}
      {state === "done" && !issues.length && (
        <div className="pm-banner ok"><Check size={16} /> <span>Spelling, grammatica en huisstijl zijn in orde.</span></div>
      )}
      {byField.map(({ field, items }) => (
        <section key={field.key} className="pm-check">
          <div className="s-row between nowrap">
            <h3>{field.label}</h3>
            {field.block && <Button size="sm" variant="ghost" icon={<Eye />} onClick={() => onReveal(field.block!)}>Toon</Button>}
          </div>
          {items.map((issue) => (
            <article key={issue.id} className="pm-issue">
              <div className="s-row nowrap" style={{ alignItems: "flex-start" }}>
                <Pill tone={KIND[issue.kind].tone}>{KIND[issue.kind].label}</Pill>
                <span className="s-small">{issue.message}</span>
              </div>
              <Context text={field.text} issue={issue} />
              <div className="s-row">
                {issue.replacements.map((r) => (
                  <button key={r} type="button" className="pm-fix" onClick={() => fix(issue, r)}>{r.trim() ? r : "spatie"}</button>
                ))}
                <span className="s-spacer" />
                {issue.kind === "spelling" && (
                  <Button size="sm" variant="ghost" onClick={() => { addKnownWord(issue.original); setIssues((l) => l.filter((i) => !(i.kind === "spelling" && i.original.toLowerCase() === issue.original.toLowerCase()))); }}>
                    Altijd goed
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => dismiss(issue)}>Negeren</Button>
              </div>
            </article>
          ))}
        </section>
      ))}
      <p className="s-small s-faint" style={{ display: "flex", gap: 8 }}>
        <SpellCheck size={14} style={{ flex: "none", marginTop: 2 }} />
        <span>Spelling en grammatica komen van LanguageTool; de tekst gaat daarvoor naar hun server. De huisstijl let op je in plaats van u, geen gedachtestreepjes en geen reclametaal. Namen die goed zijn, markeer je met Altijd goed.</span>
      </p>
    </div>
  );
}

/** The words round an issue, with the issue marked. */
function Context({ text, issue }: { text: string; issue: Issue }) {
  const from = Math.max(0, issue.offset - 42);
  const to = Math.min(text.length, issue.offset + issue.length + 42);
  const shown = text.slice(issue.offset, issue.offset + issue.length);
  return (
    <p className="pm-context">
      {from > 0 && "…"}
      {text.slice(from, issue.offset)}
      <mark>{shown.trim() ? shown : " "}</mark>
      {text.slice(issue.offset + issue.length, to)}
      {to < text.length && "…"}
    </p>
  );
}
