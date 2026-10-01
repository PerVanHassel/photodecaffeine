import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Kanban, List, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { errorMessage, put } from "../api";
import { NewProjectDialog } from "../components/NewProjectDialog";
import { dayLabel, euro, fmtDate, PIPELINE, STAGE_LABEL, TYPE_LABEL } from "../format";
import { keys, useProjects } from "../queries";
import type { Project, Stage } from "../types";
import { Button, Card, Empty, ErrorState, PageHead, Photo, Pill, Segmented, Skeleton, useConfirm } from "../ui";

type View = "board" | "list";

export function PipelinePage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>(() => {
    try { return (localStorage.getItem("pdc-pipeline-view") as View) || "board"; } catch { return "board"; }
  });
  const [showArchive, setShowArchive] = useState(false);
  const [q, setQ] = useState("");
  const projects = useProjects();
  const creating = params.get("new") === "1";

  function changeView(v: View) {
    setView(v);
    try { localStorage.setItem("pdc-pipeline-view", v); } catch { /* private mode */ }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (projects.data || []).filter((p) =>
      (showArchive || p.stage !== "archived") &&
      (!term || p.title.toLowerCase().includes(term) || (p.clientNames || []).some((n) => n.toLowerCase().includes(term)))
    );
  }, [projects.data, q, showArchive]);

  return (
    <div className="s-view" style={{ maxWidth: "none" }}>
      <PageHead
        title="Pijplijn"
        sub="Elke opdracht van aanvraag tot review. Sleep een kaart naar de volgende stap."
        actions={
          <>
            <div className="s-searchbox" style={{ width: 220 }}>
              <input aria-label="Zoek in pijplijn" placeholder="Zoek project of klant" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Segmented label="Weergave" value={view} onChange={changeView} options={[{ value: "board", label: <><Kanban size={13} style={{ verticalAlign: -2 }} /> Bord</> }, { value: "list", label: <><List size={13} style={{ verticalAlign: -2 }} /> Lijst</> }]} />
            <Button variant="primary" icon={<Plus />} onClick={() => setParams({ new: "1" })}>Nieuw</Button>
          </>
        }
      />
      {projects.isError && <ErrorState error={projects.error} retry={() => projects.refetch()} />}
      {projects.isLoading ? (
        <div className="s-board">{PIPELINE.map((s) => <Skeleton key={s} h={420} r={12} />)}</div>
      ) : view === "board" ? (
        <Board projects={filtered} />
      ) : (
        <ProjectTable projects={filtered} />
      )}
      <label className="s-check s-small s-muted">
        <input type="checkbox" checked={showArchive} onChange={(e) => setShowArchive(e.target.checked)} /> Toon gearchiveerde projecten
      </label>
      <NewProjectDialog open={creating} onOpenChange={(o) => !o && setParams({})} />
    </div>
  );
}

function Board({ projects }: { projects: Project[] }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [dragging, setDragging] = useState<Project | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const stages: Stage[] = [...PIPELINE, ...(projects.some((p) => p.stage === "archived") ? (["archived"] as Stage[]) : [])];

  async function move(project: Project, stage: Stage) {
    if (project.stage === stage) return;
    if (stage === "delivered" && !["delivered", "review", "archived"].includes(project.stage)) {
      const ok = await confirm({
        title: "Project leveren?",
        body: `De klant van ${project.title} krijgt een mail dat de galerij klaarstaat.`,
        confirm: "Leveren en mailen",
      });
      if (!ok) return;
    }
    // Optimistic: the card moves now, and moves back if the server refuses.
    const previous = qc.getQueryData<Project[]>(keys.projects);
    qc.setQueryData<Project[]>(keys.projects, (list) => list?.map((p) => (p.id === project.id ? { ...p, stage } : p)));
    try {
      await put(`/admin/project/${project.id}`, { stage });
      qc.invalidateQueries({ queryKey: keys.overview });
      qc.invalidateQueries({ queryKey: keys.project(project.id) });
      if (stage === "delivered") toast.success(`${project.title} is geleverd. De klant krijgt een mail.`);
    } catch (err) {
      qc.setQueryData(keys.projects, previous);
      toast.error(errorMessage(err));
    }
  }

  function onStart(e: DragStartEvent) {
    setDragging(projects.find((p) => p.id === e.active.id) || null);
  }
  function onEnd(e: DragEndEvent) {
    setDragging(null);
    const p = projects.find((x) => x.id === e.active.id);
    if (p && e.over) move(p, e.over.id as Stage);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
      <div className="s-board">
        {stages.map((stage) => (
          <Column key={stage} stage={stage} projects={projects.filter((p) => p.stage === stage)} />
        ))}
      </div>
      <DragOverlay>{dragging ? <DealCard project={dragging} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({ stage, projects }: { stage: Stage; projects: Project[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const value = projects.reduce((s, p) => s + (p.valueCents || 0), 0) / 100;
  return (
    <section ref={setNodeRef} className={`s-col ${isOver ? "over" : ""}`} aria-label={STAGE_LABEL[stage]}>
      <div className="s-col-head">
        <b>{STAGE_LABEL[stage]}</b>
        <span className="s-mono">{projects.length}{value ? ` · ${euro(value)}` : ""}</span>
      </div>
      {projects.map((p) => <Draggable key={p.id} project={p} />)}
      {projects.length === 0 && <div className="s-faint s-small" style={{ textAlign: "center", padding: "18px 6px" }}>Sleep een kaart hierheen</div>}
    </section>
  );
}

function Draggable({ project }: { project: Project }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: project.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <DealCard project={project} dragging={isDragging} />
    </div>
  );
}

function nextEvent(p: Project) {
  const now = Date.now();
  return p.events.filter((e) => new Date(e.startsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

function DealCard({ project: p, dragging, overlay }: { project: Project; dragging?: boolean; overlay?: boolean }) {
  const navigate = useNavigate();
  const next = nextEvent(p);
  const cover = p.gallerySettings?.coverUrl || p.gallery[0]?.url;
  const late = p.dueDate && new Date(p.dueDate).getTime() < Date.now() - 86400000 && !["delivered", "review", "archived"].includes(p.stage);
  return (
    <article
      className={`s-deal ${dragging ? "dragging" : ""} ${overlay ? "overlay" : ""}`}
      onClick={() => !overlay && navigate(`/admin/project/${p.id}`)}
    >
      {cover && <Photo src={cover} />}
      {/* The card itself is the drag handle; the title opens the project. */}
      <div className="t">{overlay ? p.title : <Link to={`/admin/project/${p.id}`} className="s-deal-link" onClick={(e) => e.stopPropagation()}>{p.title}</Link>}</div>
      <div className="meta">
        <span className="s-truncate">{(p.clientNames || []).join(", ") || "Geen klant"}</span>
        <span className="s-mono">{p.valueCents ? euro(p.valueCents / 100) : TYPE_LABEL[p.type]}</span>
      </div>
      <div className="s-row" style={{ gap: 6 }}>
        {next && <Pill tone="acc">{next.kind === "shoot" ? "Shoot" : "Afspraak"} {dayLabel(next.startsAt)}</Pill>}
        {late && <Pill tone="bad">Deadline voorbij</Pill>}
        {!late && p.dueDate && !["delivered", "review", "archived"].includes(p.stage) && <Pill plain>Deadline {dayLabel(p.dueDate)}</Pill>}
        {p.gallery.length > 0 && <Pill plain>{p.gallery.length} foto's</Pill>}
      </div>
    </article>
  );
}

type SortKey = "title" | "stage" | "due" | "created";

function ProjectTable({ projects }: { projects: Project[] }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created", dir: -1 });
  const rows = useMemo(() => {
    const val = (p: Project) =>
      sort.key === "title" ? p.title.toLowerCase()
        : sort.key === "stage" ? String(PIPELINE.indexOf(p.stage)).padStart(2, "0")
        : sort.key === "due" ? p.dueDate || "9999"
        : p.createdAt;
    return [...projects].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [projects, sort]);

  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  if (projects.length === 0) {
    return <Card><Empty title="Geen projecten">Maak een nieuw project aan of zet een aanvraag om.</Empty></Card>;
  }
  return (
    <Card bodyClass="none">
      <div className="s-table-wrap">
        <table className="s-table">
          <thead>
            <tr>{th("title", "Project")}<th>Klant</th>{th("stage", "Stap")}{th("due", "Deadline")}<th className="right">Waarde</th>{th("created", "Aangemaakt")}</tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => navigate(`/admin/project/${p.id}`)}>
                <td><Link to={`/admin/project/${p.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{p.title}</Link></td>
                <td className="s-muted">{(p.clientNames || []).join(", ")}</td>
                <td><Pill tone={p.stage === "delivered" || p.stage === "review" ? "ok" : p.stage === "lead" ? "warn" : "acc"}>{STAGE_LABEL[p.stage]}</Pill></td>
                <td className="s-mono">{p.dueDate ? fmtDate(p.dueDate) : "–"}</td>
                <td className="right s-mono">{p.valueCents ? euro(p.valueCents / 100) : "–"}</td>
                <td className="s-muted">{fmtDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
