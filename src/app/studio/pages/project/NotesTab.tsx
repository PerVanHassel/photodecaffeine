import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorMessage, put } from "../../api";
import { ago } from "../../format";
import { keys } from "../../queries";
import type { Project } from "../../types";
import { Card, Textarea } from "../../ui";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** The internal briefing. Saves by itself a moment after typing stops. */
export function NotesTab({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const [text, setText] = useState(p.briefing || "");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(text);
  latest.current = text;

  useEffect(() => {
    // A save from elsewhere (another tab, the phone) replaces the text only
    // when nothing is being typed here.
    if (state === "idle" || state === "saved") setText(p.briefing || "");
  }, [p.briefing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setState("saving");
    try {
      await put(`/admin/project/${p.id}`, { briefing: latest.current });
      qc.invalidateQueries({ queryKey: keys.project(p.id) });
      setState("saved");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  function change(v: string) {
    setText(v);
    setState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 900);
  }

  useEffect(() => () => {
    window.clearTimeout(timer.current);
  }, []);

  const status = state === "saving" ? "Opslaan…"
    : state === "dirty" ? "Niet opgeslagen"
    : state === "error" ? error
    : state === "saved" ? "Opgeslagen"
    : p.briefingUpdatedAt ? `Bijgewerkt ${ago(p.briefingUpdatedAt)}` : "";

  return (
    <Card
      title={<h2 className="s-row" style={{ gap: 6 }}><Lock size={14} /> Interne briefing</h2>}
      action={<span className="s-small" style={{ color: state === "error" ? "var(--bad)" : "var(--faint)" }} aria-live="polite">{status}</span>}
    >
      <div className="s-stack">
        <p className="s-small s-muted">Aantekeningen uit de intake, wensen en afspraken. De klant ziet dit nooit.</p>
        <Textarea
          aria-label="Interne briefing"
          value={text}
          onChange={(e) => change(e.target.value)}
          onBlur={() => { if (state === "dirty") { window.clearTimeout(timer.current); save(); } }}
          rows={18}
          style={{ fontFamily: "var(--ui)", minHeight: 360 }}
          placeholder="Plak hier de notities van het intakegesprek…"
        />
      </div>
    </Card>
  );
}
