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
import { dayLabel, DELIVERY_STEP, euro, fmtDate, HOLD_LABEL, isDelivered, mainPart, PART_KINDS, PART_LABEL, STEPS, stepLabel } from "../format";
import { keys, useProjects } from "../queries";
import type { PartKind, Project, ProjectPart } from "../types";
import { Button, Card, cx, Empty, ErrorState, PageHead, Photo, Pill, Segmented, Skeleton } from "../ui";
import { useUrlState } from "../urlState";
import { DeliverDialog } from "./project/DeliverDialog";
import { PartDot } from "./project/parts";

// Every part of every project, on the board of its kind: Foto, Video and
// Website each have their own steps. Dragging moves a step and never mails;
// dragging onto the delivery opens the delivery screen first.

type View = "board" | "list";
type Entry = { project: Project; part: ProjectPart };

export function PipelinePage() {
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useUrlState<PartKind>("soort", "photo", PART_KINDS);
  const [view, setView] = useState<View>(() => {
    try { return (localStorage.getItem("pdc-pipeline-view") as View) || "board"; } catch { return "board"; }
  });
  const [showArchive, setShowArchive] = useState(false);
  const [showStopped, setShowStopped] = useState(false);
  const [q, setQ] = useState("");
  const projects = useProjects();
  const creating = params.get("new") === "1";

  function changeView(v: View) {
    setView(v);
    try { localStorage.setItem("pdc-pipeline-view", v); } catch { /* private mode */ }
  }

  const cards = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out: Entry[] = [];
    for (const project of projects.data || []) {
      if (!showArchive && project.archivedAt) continue;
      if (term && !project.title.toLowerCase().includes(term) && !(project.clientNames || []).some((n) => n.toLowerCase().includes(term))) continue;
      for (const part of project.parts || []) {
        if (!showStopped && part.hold === "stopped") continue;
        out.push({ project, part });
      }
    }
    return out;
  }, [projects.data, q, showArchive, showStopped]);

  const count = (k: PartKind) => cards.filter((c) => c.part.kind === k && c.part.hold !== "stopped").length;
  const ofKind = cards.filter((c) => c.part.kind === kind);

  return (
    <div className="s-view" style={{ maxWidth: "none" }}>
      <PageHead
        title="Pijplijn"
        sub="Elk onderdeel van aanvraag tot levering. Sleep een kaart naar de volgende stap."
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
      {view === "board" && (
        <div className="s-kindtabs" role="tablist" aria-label="Soort">
          {PART_KINDS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={k === kind} className="s-kindtab" onClick={() => setKind(k)}>
              <PartDot kind={k} />{PART_LABEL[k]}<span className="s-mono">{projects.data ? count(k) : "…"}</span>
            </button>
          ))}
        </div>
      )}
      {projects.isError && <ErrorState error={projects.error} retry={() => projects.refetch()} />}
      {projects.isLoading ? (
        <div className="s-board">{STEPS[kind].map((s) => <Skeleton key={s} h={420} r={12} />)}</div>
      ) : view === "board" ? (
        <Board kind={kind} cards={ofKind} />
      ) : (
        <PartTable cards={cards} />
      )}
      <div className="s-row" style={{ gap: 20 }}>
        <label className="s-check s-small s-muted"><input type="checkbox" checked={showArchive} onChange={(e) => setShowArchive(e.target.checked)} /> Toon gearchiveerd</label>
        <label className="s-check s-small s-muted"><input type="checkbox" checked={showStopped} onChange={(e) => setShowStopped(e.target.checked)} /> Toon gestopt</label>
      </div>
      <NewProjectDialog open={creating} onOpenChange={(o) => !o && setParams({})} />
    </div>
  );
}

function Board({ kind, cards }: { kind: PartKind; cards: Entry[] }) {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState<Entry | null>(null);
  const [delivering, setDelivering] = useState<Entry | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const steps = STEPS[kind];
  const deliveryAt = steps.indexOf(DELIVERY_STEP[kind]);

  async function move(card: Entry, stage: string) {
    const { project, part } = card;
    if (part.stage === stage) return;
    // Onto or past the delivery: the delivery screen, so nobody is mailed by a drag.
    if (!isDelivered(part) && steps.indexOf(stage) >= deliveryAt) return setDelivering(card);
    const previous = qc.getQueryData<Project[]>(keys.projects);
    qc.setQueryData<Project[]>(keys.projects, (list) => list?.map((p) => (p.id === project.id ? { ...p, parts: p.parts.map((x) => (x.id === part.id ? { ...x, stage } : x)) } : p)));
    try {
      await put(`/admin/project/${project.id}/parts/${part.id}`, { stage });
      qc.invalidateQueries({ queryKey: keys.overview });
      qc.invalidateQueries({ queryKey: keys.project(project.id) });
      qc.invalidateQueries({ queryKey: keys.projects });
    } catch (err) {
      qc.setQueryData(keys.projects, previous);
      toast.error(errorMessage(err));
    }
  }

  const keyOf = (c: Entry) => `${c.project.id}:${c.part.id}`;
  return (
    <DndContext sensors={sensors}
      onDragStart={(e: DragStartEvent) => setDragging(cards.find((c) => keyOf(c) === e.active.id) || null)}
      onDragEnd={(e: DragEndEvent) => {
        setDragging(null);
        const c = cards.find((x) => keyOf(x) === e.active.id);
        if (c && e.over) move(c, String(e.over.id));
      }}
      onDragCancel={() => setDragging(null)}>
      <div className="s-board">
        {steps.map((stage, i) => (
          <Column key={stage} kind={kind} stage={stage} delivery={i === deliveryAt} cards={cards.filter((c) => c.part.stage === stage)} keyOf={keyOf} />
        ))}
      </div>
      <DragOverlay>{dragging ? <DealCard card={dragging} overlay /> : null}</DragOverlay>
      {delivering && (
        <DeliverDialog project={delivering.project} part={delivering.part} onClose={() => { setDelivering(null); qc.invalidateQueries({ queryKey: keys.projects }); }} />
      )}
    </DndContext>
  );
}

function Column({ kind, stage, delivery, cards, keyOf }: { kind: PartKind; stage: string; delivery: boolean; cards: Entry[]; keyOf: (c: Entry) => string }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  // A project's value counts once: on the part its older fields follow.
  const value = cards.reduce((s, c) => s + (mainPart(c.project)?.id === c.part.id ? c.project.valueCents || 0 : 0), 0) / 100;
  return (
    <section ref={setNodeRef} className={cx("s-col", isOver && "over", delivery && "delivery")} aria-label={stepLabel(kind, stage)}>
      <div className="s-col-head">
        <b>{stepLabel(kind, stage)}</b>
        <span className="s-mono">{cards.length}{value ? ` · ${euro(value)}` : ""}</span>
      </div>
      {delivery && <p className="s-col-note">Slepen opent eerst het leverscherm.</p>}
      {cards.map((c) => <Draggable key={keyOf(c)} id={keyOf(c)} card={c} />)}
      {cards.length === 0 && <div className="s-faint s-small" style={{ textAlign: "center", padding: "18px 6px" }}>Sleep een kaart hierheen</div>}
    </section>
  );
}

function Draggable({ id, card }: { id: string; card: Entry }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <DealCard card={card} dragging={isDragging} />
    </div>
  );
}

function nextEvent(p: Project) {
  const now = Date.now();
  return p.events.filter((e) => new Date(e.startsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

function DealCard({ card: { project: p, part }, dragging, overlay }: { card: Entry; dragging?: boolean; overlay?: boolean }) {
  const navigate = useNavigate();
  const next = part.kind !== "web" ? nextEvent(p) : undefined;
  const cover = part.kind !== "web" ? p.gallerySettings?.coverUrl || p.gallery[0]?.url : undefined;
  const delivered = isDelivered(part);
  const late = p.dueDate && new Date(p.dueDate).getTime() < Date.now() - 86400000 && !delivered;
  const others = p.parts.filter((x) => x.id !== part.id && x.hold !== "stopped");
  const link = `/admin/project/${p.id}${p.parts.length > 1 ? `?deel=${part.id}` : ""}`;
  return (
    <article className={cx("s-deal", dragging && "dragging", overlay && "overlay", part.hold && `hold-${part.hold}`)} onClick={() => !overlay && navigate(link)}>
      {cover && <Photo src={cover} />}
      {/* The card itself is the drag handle; the title opens the project. */}
      <div className="t">{overlay ? p.title : <Link to={link} className="s-deal-link" onClick={(e) => e.stopPropagation()}>{p.title}</Link>}</div>
      <div className="meta">
        <span className="s-truncate">{(p.clientNames || []).join(", ") || "Geen klant"}</span>
        <span className="s-mono">{p.valueCents && mainPart(p)?.id === part.id ? euro(p.valueCents / 100) : part.category || ""}</span>
      </div>
      <div className="s-row" style={{ gap: 6 }}>
        {part.hold && <Pill tone={part.hold === "waiting" ? "info" : part.hold === "stopped" ? "bad" : "warn"}>{HOLD_LABEL[part.hold]}</Pill>}
        {next && <Pill tone="acc">{next.kind === "shoot" ? "Shoot" : "Afspraak"} {dayLabel(next.startsAt)}</Pill>}
        {late && <Pill tone="bad">Deadline voorbij</Pill>}
        {!late && p.dueDate && !delivered && <Pill plain>Deadline {dayLabel(p.dueDate)}</Pill>}
        {part.kind !== "web" && p.gallery.length > 0 && <Pill plain>{p.gallery.length} foto's</Pill>}
        {others.map((o) => <span key={o.id} className="s-deal-other" title={`Ook ${PART_LABEL[o.kind]}: ${stepLabel(o.kind, o.stage)}`}><PartDot kind={o.kind} />{PART_LABEL[o.kind]}</span>)}
      </div>
    </article>
  );
}

type SortKey = "title" | "kind" | "stage" | "due" | "created";

function PartTable({ cards }: { cards: Entry[] }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created", dir: -1 });
  const rows = useMemo(() => {
    const val = (c: Entry) =>
      sort.key === "title" ? c.project.title.toLowerCase()
        : sort.key === "kind" ? c.part.kind
        : sort.key === "stage" ? `${c.part.kind}${String(STEPS[c.part.kind].indexOf(c.part.stage)).padStart(2, "0")}`
        : sort.key === "due" ? c.project.dueDate || "9999"
        : c.project.createdAt;
    return [...cards].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [cards, sort]);

  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  if (cards.length === 0) return <Card><Empty title="Geen projecten">Maak een nieuw project aan of zet een aanvraag om.</Empty></Card>;
  return (
    <Card bodyClass="none">
      <div className="s-table-wrap">
        <table className="s-table">
          <thead>
            <tr>{th("title", "Project")}<th>Klant</th>{th("kind", "Onderdeel")}{th("stage", "Stap")}{th("due", "Deadline")}<th className="right">Waarde</th>{th("created", "Aangemaakt")}</tr>
          </thead>
          <tbody>
            {rows.map(({ project: p, part }) => (
              <tr key={part.id} className="clickable" onClick={() => navigate(`/admin/project/${p.id}?deel=${part.id}`)}>
                <td><Link to={`/admin/project/${p.id}?deel=${part.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{p.title}</Link>{p.archivedAt && <span className="s-small s-faint"> · archief</span>}</td>
                <td className="s-muted">{(p.clientNames || []).join(", ")}</td>
                <td><span className="s-row" style={{ gap: 6 }}><PartDot kind={part.kind} />{PART_LABEL[part.kind]}{part.category && <span className="s-faint s-small">{part.category}</span>}</span></td>
                <td>
                  <Pill tone={isDelivered(part) ? "ok" : part.stage === "lead" ? "warn" : "acc"}>{stepLabel(part.kind, part.stage)}</Pill>
                  {part.hold && <span className="s-small s-muted"> · {HOLD_LABEL[part.hold]}</span>}
                </td>
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
