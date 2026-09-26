import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Check, FileText, GripVertical, MapPin, Navigation, Plus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { del, errorMessage, post, put } from "../../api";
import { EventDialog, type EventDraft } from "../../components/EventDialog";
import { dayLabel, fmtTime, KIND_LABEL, mapsLink, mapsSearchLink } from "../../format";
import { compass, lightFor } from "../../light";
import { MiniMap } from "../../map";
import { keys, useAction, useLocations, useShots } from "../../queries";
import type { Project, Shot, StudioEvent } from "../../types";
import { Button, Card, Empty, Input, SelectField, SkeletonList } from "../../ui";

export function PlanningTab({ project: p }: { project: Project }) {
  const [editing, setEditing] = useState<EventDraft | null>(null);
  return (
    <div className="s-grid-2">
      <div className="s-stack lg">
        <Card
          title="Afspraken"
          action={
            <div className="s-row">
              <Link className="s-btn ghost sm" to={`/admin/project/${p.id}/callsheet`} target="_blank"><FileText size={14} />Callsheet</Link>
              <Button size="sm" icon={<CalendarPlus />} onClick={() => setEditing({ projectId: p.id, kind: "shoot", locationId: p.locationId })}>Inplannen</Button>
            </div>
          }
        >
          {p.events.length === 0 ? (
            <Empty title="Nog niets ingepland">Plan de shoot, een intake of een deadline. De klant ziet ze in het portaal.</Empty>
          ) : (
            <ol className="s-timeline">
              {p.events.map((e) => <EventRow key={e.id} event={e} onEdit={() => setEditing({ ...e, projectId: p.id })} />)}
            </ol>
          )}
        </Card>
        <ShotList projectId={p.id} />
      </div>
      <div className="s-stack lg">
        <LocationCard project={p} />
      </div>
      <EventDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} initial={editing} lockProject />
    </div>
  );
}

function EventRow({ event: e, onEdit }: { event: StudioEvent; onEdit: () => void }) {
  const locations = useLocations();
  const loc = (locations.data || []).find((l) => l.id === e.locationId);
  const light = loc && e.kind === "shoot" ? lightFor(new Date(e.startsAt), loc.lat, loc.lng) : null;
  const past = new Date(e.endsAt || e.startsAt).getTime() < Date.now();
  return (
    <li style={{ opacity: past ? 0.6 : 1 }}>
      <span className="when">{e.allDay ? dayLabel(e.startsAt) : fmtTime(e.startsAt)}</span>
      <span className={`node ${e.kind === "shoot" ? "gold" : ""}`} />
      <button type="button" onClick={onEdit} style={{ textAlign: "left", border: 0, background: "none", padding: 0 }}>
        <b>{e.title || KIND_LABEL[e.kind]}</b>
        <span className="s-muted s-small" style={{ display: "block" }}>
          {[KIND_LABEL[e.kind], e.allDay ? "hele dag" : dayLabel(e.startsAt), loc?.name || e.locationText, !e.clientVisible && "niet zichtbaar voor klant"].filter(Boolean).join(" · ")}
        </span>
        {light && (
          <span className="s-small" style={{ display: "block", color: "var(--accent)" }}>
            Golden hour {fmtTime(light.goldenEvening)}, zon uit het {compass(light.goldenAzimuth)}
          </span>
        )}
      </button>
    </li>
  );
}

function LocationCard({ project: p }: { project: Project }) {
  const locations = useLocations();
  const loc = (locations.data || []).find((l) => l.id === p.locationId) || null;
  const shoot = p.events.find((e) => e.kind === "shoot" && new Date(e.startsAt).getTime() > Date.now()) || p.events.find((e) => e.kind === "shoot");
  const light = loc ? lightFor(shoot ? new Date(shoot.startsAt) : new Date(), loc.lat, loc.lng) : null;
  const setLocation = useAction({
    fn: (locationId: string | null) => put(`/admin/project/${p.id}`, { locationId }),
    invalidate: () => [keys.project(p.id), keys.locations],
    success: "Locatie gekoppeld",
  });

  return (
    <Card title="Locatie" bodyClass="none">
      {loc && <MiniMap lat={loc.lat} lng={loc.lng} bearing={light?.goldenAzimuth} />}
      <div className="s-card-body s-stack">
        <SelectField label="Hoofdlocatie van dit project" value={p.locationId || ""} onChange={(e) => setLocation.mutate(e.target.value || null)}>
          <option value="">Geen locatie</option>
          {(locations.data || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </SelectField>
        {loc ? (
          <>
            {loc.address && <div className="s-kv"><span>Adres</span><span>{loc.address}</span></div>}
            {loc.parking && <div className="s-kv"><span>Parkeren</span><span>{loc.parking}</span></div>}
            <div className="s-kv"><span>Vergunning</span><span>{loc.permitRequired ? "Nodig" : "Niet nodig"}</span></div>
            {light && <div className="s-kv"><span>Golden hour{shoot ? ` ${dayLabel(shoot.startsAt)}` : " vandaag"}</span><span className="s-mono">{fmtTime(light.goldenEvening)} · zon onder {fmtTime(light.sunset)}</span></div>}
            <div className="s-row">
              <a className="s-btn sm" href={mapsLink(loc.lat, loc.lng)} target="_blank" rel="noreferrer"><Navigation size={14} />Route</a>
              <Link className="s-btn ghost sm" to={`/admin/locations?open=${loc.id}`}><MapPin size={14} />Op de kaart</Link>
            </div>
          </>
        ) : (
          <p className="s-small s-muted">
            Kies een gescoute plek, of <Link to="/admin/locations?new=1">voeg een nieuwe locatie toe</Link>.
            {p.meeting?.location && <> Meeting-adres: <a href={mapsSearchLink(p.meeting.location)} target="_blank" rel="noreferrer">{p.meeting.location}</a></>}
          </p>
        )}
      </div>
    </Card>
  );
}

function ShotList({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const shots = useShots(projectId);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const list = shots.data || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const setList = (next: Shot[]) => qc.setQueryData(keys.shots(projectId), next);

  const add = useAction({
    fn: () => post<{ shot: Shot }>(`/admin/project/${projectId}/shots`, { label: label.trim(), required }),
    invalidate: () => [keys.shots(projectId)],
    onSuccess: () => { setLabel(""); setRequired(false); },
  });

  async function update(shot: Shot, patch: Partial<Shot>) {
    const before = list;
    setList(list.map((s) => (s.id === shot.id ? { ...s, ...patch } : s)));
    try { await put(`/admin/shots/${shot.id}`, patch); } catch (err) { setList(before); toast.error(errorMessage(err)); }
  }
  async function remove(shot: Shot) {
    const before = list;
    setList(list.filter((s) => s.id !== shot.id));
    try { await del(`/admin/shots/${shot.id}`); } catch (err) { setList(before); toast.error(errorMessage(err)); }
  }
  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const before = list;
    const next = arrayMove(list, list.findIndex((s) => s.id === e.active.id), list.findIndex((s) => s.id === e.over!.id));
    setList(next);
    try { await put(`/admin/project/${projectId}/shots/order`, { ids: next.map((s) => s.id) }); } catch (err) { setList(before); toast.error(errorMessage(err)); }
  }

  const done = list.filter((s) => s.done).length;
  const ids = useMemo(() => list.map((s) => s.id), [list]);

  return (
    <Card title="Shotlist" action={list.length > 0 && <span className="s-mono s-faint s-small">{done} / {list.length}</span>}>
      <div className="s-stack">
        {shots.isLoading ? <SkeletonList rows={3} /> : list.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="s-shots">
                {list.map((s) => <ShotRow key={s.id} shot={s} onUpdate={(patch) => update(s, patch)} onRemove={() => remove(s)} />)}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <form className="s-row nowrap" onSubmit={(e) => { e.preventDefault(); if (label.trim()) add.mutate(); }}>
          <Input aria-label="Nieuw shot" placeholder="Bijv. rolling shot op de brug" value={label} onChange={(e) => setLabel(e.target.value)} />
          <label className="s-check s-small" title="Verplicht shot"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /><Star size={14} /></label>
          <Button type="submit" icon={<Plus />} loading={add.isPending} disabled={!label.trim()}>Toevoegen</Button>
        </form>
      </div>
    </Card>
  );
}

function ShotRow({ shot: s, onUpdate, onRemove }: { shot: Shot; onUpdate: (p: Partial<Shot>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <li ref={setNodeRef} className={s.done ? "done" : undefined} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, background: "var(--surface)" }}>
      <button type="button" className="s-handle" aria-label="Versleep om de volgorde te wijzigen" {...attributes} {...listeners}><GripVertical /></button>
      <button type="button" className={`s-tick ${s.done ? "on" : ""}`} aria-label={s.done ? "Markeer als open" : "Markeer als gemaakt"} onClick={() => onUpdate({ done: !s.done })}>
        {s.done && <Check />}
      </button>
      <span className="label">{s.label}</span>
      <button type="button" className="s-pill plain" onClick={() => onUpdate({ required: !s.required })} style={{ border: 0, cursor: "pointer", ...(s.required ? { background: "var(--accent-soft)", color: "var(--accent)" } : {}) }} aria-pressed={s.required}>
        {s.required ? "Verplicht" : "Optioneel"}
      </button>
      <Button size="sm" variant="ghost" iconOnly aria-label={`${s.label} verwijderen`} icon={<Trash2 />} onClick={onRemove} />
    </li>
  );
}
