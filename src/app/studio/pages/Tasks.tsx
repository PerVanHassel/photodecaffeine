import { useQueryClient } from "@tanstack/react-query";
import { Check, CheckSquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { del, errorMessage, post, put } from "../api";
import { dayLabel, fromLocalInput, toLocalInput } from "../format";
import { keys, useAction, useProjects, useTasks } from "../queries";
import type { Task } from "../types";
import { Button, Card, Empty, ErrorState, Field, Input, Modal, PageHead, Pill, Select, SelectField, SkeletonList, TextAreaField, TextField, useConfirm } from "../ui";

function bucket(t: Task): "late" | "today" | "week" | "later" | "none" {
  if (!t.dueAt) return "none";
  const due = new Date(t.dueAt);
  const now = new Date();
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  if (due < new Date(now.toDateString())) return "late";
  if (due <= endToday) return "today";
  if (due.getTime() <= endToday.getTime() + 6 * 86400000) return "week";
  return "later";
}

const GROUPS: { id: ReturnType<typeof bucket>; label: string }[] = [
  { id: "late", label: "Te laat" },
  { id: "today", label: "Vandaag" },
  { id: "week", label: "Deze week" },
  { id: "later", label: "Later" },
  { id: "none", label: "Zonder datum" },
];

export function TasksPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tasks = useTasks();
  const projects = useProjects();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get("new") === "1") { inputRef.current?.focus(); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const open = useMemo(() => (tasks.data || []).filter((t) => !t.done), [tasks.data]);
  const done = useMemo(() => (tasks.data || []).filter((t) => t.done), [tasks.data]);

  const add = useAction({
    fn: () => post("/admin/tasks", { title: title.trim(), dueAt: due ? new Date(`${due}T09:00`).toISOString() : null, projectId: projectId || null }),
    invalidate: () => [keys.tasks, keys.overview],
    onSuccess: () => { setTitle(""); setDue(""); inputRef.current?.focus(); },
  });

  async function toggle(t: Task) {
    const before = tasks.data;
    qc.setQueryData<Task[]>(keys.tasks, (l) => l?.map((x) => (x.id === t.id ? { ...x, done: !x.done, doneAt: x.done ? null : new Date().toISOString() } : x)));
    try {
      await put(`/admin/tasks/${t.id}`, { done: !t.done });
      qc.invalidateQueries({ queryKey: keys.overview });
      if (!t.done) toast.success("Afgevinkt", { action: { label: "Ongedaan maken", onClick: () => toggle({ ...t, done: true }) } });
    } catch (err) {
      qc.setQueryData(keys.tasks, before);
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="s-view narrow">
      <PageHead title="Taken" sub="Wat nog moet gebeuren. Geaccepteerde offertes en gekozen favorieten zetten hier zelf taken neer." />
      <Card>
        <form className="s-row" onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(); }}>
          <Input ref={inputRef} aria-label="Nieuwe taak" placeholder="Nieuwe taak…" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: "1 1 240px" }} />
          <Input type="date" aria-label="Deadline" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 160 }} />
          <Select aria-label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ width: 200 }}>
            <option value="">Geen project</option>
            {(projects.data || []).filter((p) => p.stage !== "archived").map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Button type="submit" variant="primary" icon={<Plus />} loading={add.isPending} disabled={!title.trim()}>Toevoegen</Button>
        </form>
      </Card>
      {tasks.isError && <ErrorState error={tasks.error} retry={() => tasks.refetch()} />}
      {tasks.isLoading ? <Card bodyClass="none"><SkeletonList rows={5} /></Card> : open.length === 0 ? (
        <Card><Empty icon={<CheckSquare />} title="Niets te doen">Alles is afgevinkt.</Empty></Card>
      ) : (
        GROUPS.map((g) => {
          const list = open.filter((t) => bucket(t) === g.id);
          if (!list.length) return null;
          return (
            <Card key={g.id} title={<h2 style={g.id === "late" ? { color: "var(--bad)" } : undefined}>{g.label}</h2>} action={<span className="s-mono s-faint s-small">{list.length}</span>} bodyClass="none">
              <ul className="s-list">{list.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />)}</ul>
            </Card>
          );
        })
      )}
      {done.length > 0 && (
        <div className="s-stack">
          <Button variant="ghost" size="sm" onClick={() => setShowDone((v) => !v)} style={{ alignSelf: "flex-start" }}>{showDone ? "Verberg" : "Toon"} afgerond ({done.length})</Button>
          {showDone && <Card bodyClass="none"><ul className="s-list">{done.slice(0, 50).map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />)}</ul></Card>}
        </div>
      )}
      <TaskDialog task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function TaskRow({ task: t, onToggle, onOpen }: { task: Task; onToggle: () => void; onOpen: () => void }) {
  return (
    <li className="s-item" style={{ gridTemplateColumns: "22px minmax(0,1fr) auto" }}>
      <button type="button" className={`s-tick ${t.done ? "on" : ""}`} aria-label={t.done ? "Markeer als open" : "Afvinken"} onClick={onToggle}>{t.done && <Check />}</button>
      <button type="button" onClick={onOpen} style={{ border: 0, background: "none", padding: 0, textAlign: "left", minWidth: 0 }}>
        <div className="t" style={t.done ? { textDecoration: "line-through", color: "var(--faint)" } : undefined}>{t.title}</div>
        {(t.notes || t.projectTitle) && <div className="s s-truncate">{[t.projectTitle, t.notes].filter(Boolean).join(" · ")}</div>}
      </button>
      <div className="s-row nowrap">
        {t.projectId && <Link to={`/admin/project/${t.projectId}`} className="s-btn ghost sm">Project</Link>}
        {t.dueAt && <Pill tone={bucket(t) === "late" && !t.done ? "bad" : undefined} plain>{dayLabel(t.dueAt)}</Pill>}
      </div>
    </li>
  );
}

function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const confirm = useConfirm();
  const projects = useProjects();
  const [f, setF] = useState({ title: "", notes: "", due: "", projectId: "" });
  useEffect(() => { if (task) setF({ title: task.title, notes: task.notes, due: toLocalInput(task.dueAt), projectId: task.projectId || "" }); }, [task]);
  const save = useAction({
    fn: () => put(`/admin/tasks/${task!.id}`, { title: f.title.trim(), notes: f.notes, dueAt: fromLocalInput(f.due), projectId: f.projectId || null }),
    invalidate: () => [keys.tasks, keys.overview],
    success: "Taak bijgewerkt",
    onSuccess: onClose,
  });
  const remove = useAction({ fn: () => del(`/admin/tasks/${task!.id}`), invalidate: () => [keys.tasks, keys.overview], success: "Taak verwijderd", onSuccess: onClose });
  return (
    <Modal open={!!task} onOpenChange={(o) => !o && onClose()} title="Taak"
      footer={<>
        <Button variant="danger" icon={<Trash2 />} style={{ marginRight: "auto" }} loading={remove.isPending} onClick={async () => { if (await confirm({ title: "Taak verwijderen?", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>Verwijderen</Button>
        <Button onClick={onClose}>Annuleren</Button>
        <Button variant="primary" loading={save.isPending} disabled={!f.title.trim()} onClick={() => save.mutate()}>Opslaan</Button>
      </>}>
      <TextField label="Taak" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <TextAreaField label="Notities" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <div className="s-form-grid">
        <Field label="Deadline" htmlFor="task-due"><Input id="task-due" type="datetime-local" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
        <SelectField label="Project" value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
          <option value="">Geen project</option>
          {(projects.data || []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </SelectField>
      </div>
    </Modal>
  );
}
