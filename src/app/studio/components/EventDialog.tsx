import { Sun, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { del, post, put } from "../api";
import { fmtTime, fromLocalInput, KIND_LABEL, toLocalInput } from "../format";
import { beaufort, compass, lightFor, useWeather } from "../light";
import { keys, useAction, useLocations, useProjects } from "../queries";
import type { EventKind, StudioEvent } from "../types";
import { Button, Field, Input, Modal, Segmented, SelectField, TextAreaField, TextField, useConfirm } from "../ui";

export type EventDraft = Partial<StudioEvent> & { projectId?: string | null };

const KINDS: EventKind[] = ["shoot", "meeting", "deadline", "edit", "other"];
const DEFAULT_HOURS: Record<EventKind, number> = { shoot: 2, meeting: 1, deadline: 0, edit: 3, other: 1 };

/**
 * Create or edit an event. With a location picked, it shows the light and
 * the forecast for that moment, so a shoot can be timed on golden hour.
 */
export function EventDialog({ open, onOpenChange, initial, lockProject }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: EventDraft | null;
  lockProject?: boolean;
}) {
  const confirm = useConfirm();
  const locations = useLocations();
  const projects = useProjects();
  const editing = !!initial?.id && !initial.derived;

  const [kind, setKind] = useState<EventKind>("shoot");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !initial) return;
    const k = initial.kind || "shoot";
    const s = initial.startsAt ? new Date(initial.startsAt) : nextRoundHour();
    setKind(k);
    setTitle(initial.title || "");
    setStart(toLocalInput(s));
    setEnd(initial.endsAt ? toLocalInput(initial.endsAt) : DEFAULT_HOURS[k] ? toLocalInput(new Date(s.getTime() + DEFAULT_HOURS[k] * 3600000)) : "");
    setAllDay(!!initial.allDay);
    setProjectId(initial.projectId || "");
    setLocationId(initial.locationId || initial.location?.id || "");
    setLocationText(initial.locationText || "");
    setNotes(initial.notes || "");
    setLink(initial.link || "");
    setClientVisible(initial.clientVisible ?? true);
    setError(null);
  }, [open, initial]);

  const location = useMemo(() => (locations.data || []).find((l) => l.id === locationId) || null, [locations.data, locationId]);
  const startDate = start ? new Date(start) : null;
  const light = location && startDate ? lightFor(startDate, location.lat, location.lng) : null;
  const weather = useWeather(location?.lat, location?.lng, startDate);

  const body = () => ({
    kind,
    title: title.trim(),
    startsAt: allDay ? fromLocalInput(`${start.slice(0, 10)}T00:00`) : fromLocalInput(start),
    endsAt: allDay ? null : fromLocalInput(end),
    allDay,
    projectId: projectId || null,
    locationId: locationId || null,
    locationText: locationId ? "" : locationText.trim(),
    notes: notes.trim(),
    link: link.trim(),
    clientVisible,
  });

  const invalidate = () => [["events"], keys.overview, keys.projects, ...(projectId ? [keys.project(projectId)] : [])];
  const save = useAction({
    fn: () => (editing ? put(`/admin/events/${initial!.id}`, body()) : post("/admin/events", body())),
    invalidate,
    success: editing ? "Afspraak bijgewerkt" : "Afspraak ingepland",
    onSuccess: () => onOpenChange(false),
  });
  const remove = useAction({
    fn: () => del(`/admin/events/${initial!.id}`),
    invalidate,
    success: "Afspraak verwijderd",
    onSuccess: () => onOpenChange(false),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start) return setError("Kies een datum en tijd.");
    if (!allDay && end && new Date(end) < new Date(start)) return setError("Het einde ligt voor het begin.");
    setError(null);
    save.mutate();
  }

  function planAroundGoldenHour() {
    if (!light) return;
    // Start 45 minutes before golden hour, end after the blue hour.
    const s = new Date(light.goldenEvening.getTime() - 45 * 60000);
    setStart(toLocalInput(s));
    setEnd(toLocalInput(light.blueHourEnd));
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Afspraak bewerken" : "Afspraak inplannen"}
      wide
      footer={
        <>
          {editing && (
            <Button
              variant="danger"
              icon={<Trash2 />}
              loading={remove.isPending}
              onClick={async () => { if (await confirm({ title: "Afspraak verwijderen?", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}
              style={{ marginRight: "auto" }}
            >
              Verwijderen
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button variant="primary" type="submit" form="event-form" loading={save.isPending}>{editing ? "Opslaan" : "Inplannen"}</Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="s-stack">
        <Segmented label="Soort afspraak" value={kind} onChange={(k) => setKind(k)} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        <TextField label="Titel (optioneel)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leeg laten gebruikt de projectnaam" />
        <div className="s-form-grid">
          <Field label={allDay ? "Datum" : "Begin"} htmlFor="ev-start">
            <Input id="ev-start" type={allDay ? "date" : "datetime-local"} value={allDay ? start.slice(0, 10) : start} onChange={(e) => setStart(allDay ? `${e.target.value}T00:00` : e.target.value)} required />
          </Field>
          {!allDay && (
            <Field label="Einde" htmlFor="ev-end">
              <Input id="ev-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          )}
          <label className="s-check full"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> Hele dag</label>
          <SelectField label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={lockProject}>
            <option value="">Geen project</option>
            {(projects.data || []).filter((p) => p.stage !== "archived").map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </SelectField>
          <SelectField label="Locatie" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Andere plek (vrije tekst)</option>
            {(locations.data || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </SelectField>
          {!locationId && <TextField className="full" label="Adres of plek" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Bijv. Studio, of een adres" />}
        </div>

        {light && startDate && (
          <div className="s-card" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
            <div className="s-card-body s-row between">
              <div className="s-stack sm">
                <b className="s-row" style={{ gap: 6 }}><Sun size={15} /> Licht op {location!.name}</b>
                <span className="s-small">
                  Golden hour <b className="s-mono">{fmtTime(light.goldenEvening)}</b> · zon onder <b className="s-mono">{fmtTime(light.sunset)}</b> uit het {compass(light.sunsetAzimuth)}
                  {weather.data ? ` · ${weather.data.temperature}°, ${weather.data.summary.toLowerCase()}, ${beaufort(weather.data.wind)} Bft, ${weather.data.precipitationChance}% kans op neerslag` : ""}
                </span>
              </div>
              {kind === "shoot" && !allDay && <Button size="sm" onClick={planAroundGoldenHour}>Plan rond golden hour</Button>}
            </div>
          </div>
        )}

        <div className="s-form-grid">
          <TextAreaField className="full" label="Notities" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <TextField label="Link (optioneel)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Videocall of routebeschrijving" />
          <label className="s-check" style={{ alignSelf: "end", paddingBottom: 8 }}>
            <input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} /> Zichtbaar voor de klant
          </label>
        </div>
        {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

function nextRoundHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
