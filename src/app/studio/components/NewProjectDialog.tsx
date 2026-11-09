import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { post, put } from "../api";
import { CATEGORIES, DELIVERY_STEP, fromLocalInput, PART_KINDS, PART_LABEL, STEPS, stepLabel } from "../format";
import { suggestStyle } from "../gallery/styles";
import { keys, useAction, useClients, useLocations } from "../queries";
import type { Client, PartKind, Project, Stage } from "../types";
import { Button, cx, Field, Input, Modal, Select, SelectField, TextField } from "../ui";
import { PartDot } from "../pages/project/parts";

const NEW_CLIENT = "__new__";
// As in the event dialog: a shoot with a start time blocks two hours.
const SHOOT_HOURS = 2;
// The start-up sale: photos online within a week, at €5 a photo.
const SALE_DAYS = 7;
const SALE_PRICE = 5;

type PartDraft = { on: boolean; category: string; stage: string };

const startStep = (stage: Stage | undefined, kind: PartKind) => {
  const map: Record<string, string> = { lead: "lead", quote: "quote", booked: "booked" };
  return map[stage || "booked"] || (STEPS[kind].includes(stage || "") ? String(stage) : "booked");
};

/**
 * A new project: the client, a title, and what we are going to make. Foto,
 * Video and Website each become a part with its own steps; ticking more than
 * one makes one project for the same client.
 */
export function NewProjectDialog({ open, onOpenChange, defaults }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaults?: { clientId?: string; stage?: Stage; title?: string; kind?: PartKind };
}) {
  const navigate = useNavigate();
  const clients = useClients();
  const locations = useLocations();
  const [clientId, setClientId] = useState(defaults?.clientId || "");
  const [newClient, setNewClient] = useState({ name: "", email: "", company: "" });
  const [title, setTitle] = useState(defaults?.title || "");
  const fresh = (kind: PartKind): PartDraft => ({ on: kind === (defaults?.kind || "photo"), category: "", stage: startStep(defaults?.stage, kind) });
  const [parts, setParts] = useState<Record<PartKind, PartDraft>>(() => ({ photo: fresh("photo"), video: fresh("video"), web: fresh("web") }));
  const [sale, setSale] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [shootTime, setShootTime] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientId(defaults?.clientId || "");
    setTitle(defaults?.title || "");
    setParts({ photo: fresh("photo"), video: fresh("video"), web: fresh("web") });
    setSale(false);
    setShootDate("");
    setShootTime("");
    setDueDate("");
    setError(null);
  }, [open, defaults?.clientId, defaults?.stage, defaults?.title, defaults?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = PART_KINDS.filter((k) => parts[k].on);
  const media = chosen.some((k) => k !== "web");
  const set = (kind: PartKind, patch: Partial<PartDraft>) => setParts((old) => ({ ...old, [kind]: { ...old[kind], ...patch } }));
  // The start-up sale: the deadline is a week after the shoot.
  const saleDue = sale && shootDate ? new Date(new Date(shootDate).getTime() + SALE_DAYS * 86400000).toISOString().slice(0, 10) : "";

  const create = useAction({
    fn: async () => {
      let id = clientId;
      if (clientId === NEW_CLIENT) {
        const r = await post<{ client: Client }>("/admin/client", newClient);
        id = r.client.id;
      }
      const photoCategory = parts.photo.category;
      const style = suggestStyle({ title, description: "", parts: [{ id: "", kind: "photo", category: photoCategory, stage: "", hold: "", deliveredAt: null }] });
      const r = await post<{ project: Project }>("/admin/project", {
        title,
        clientIds: [id],
        parts: chosen.map((kind) => ({ kind, category: parts[kind].category, stage: parts[kind].stage })),
        dueDate: dueDate || saleDue || "",
        locationId: locationId || null,
        ...(sale ? {
          valueCents: 0,
          // Everyone sees the watermark; the club buys like everyone else.
          gallerySettings: { watermark: true, clientOriginals: false, clientDownloads: false, style },
        } : media && photoCategory ? { gallerySettings: { style } } : {}),
      });
      // The shoot goes on the calendar, so it shows in the week on Vandaag and in Planning.
      if (shootDate && media) {
        const start = fromLocalInput(`${shootDate}T${shootTime || "00:00"}`)!;
        await post("/admin/events", {
          kind: "shoot", projectId: r.project.id, locationId: locationId || null, startsAt: start, allDay: !shootTime,
          endsAt: shootTime ? new Date(new Date(start).getTime() + SHOOT_HOURS * 3600000).toISOString() : null,
        });
      }
      if (sale) {
        await post(`/admin/project/${r.project.id}/share`);
        await put(`/admin/project/${r.project.id}/share`, { sales: true, downloads: false, photoPrice: SALE_PRICE, photoPriceNormal: SALE_PRICE });
      }
      return r;
    },
    invalidate: () => [keys.projects, keys.clients, keys.overview, ["events"]],
    success: sale ? "Project aangemaakt, met de start-up sale klaar" : "Project aangemaakt",
    onSuccess: (r) => {
      onOpenChange(false);
      navigate(`/admin/project/${r.project.id}`);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setError("Kies een klant.");
    if (clientId === NEW_CLIENT && !newClient.name.trim()) return setError("Vul de naam van de nieuwe klant in.");
    if (!title.trim()) return setError("Geef het project een titel.");
    if (chosen.length === 0) return setError("Kies wat je gaat maken: foto, video of website.");
    setError(null);
    create.mutate();
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Nieuw project"
      description="Kies de klant en wat je gaat maken. Een onderdeel toevoegen kan later altijd."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button variant="primary" type="submit" form="new-project" loading={create.isPending}>Project maken</Button>
        </>
      }
    >
      <form id="new-project" onSubmit={submit} className="s-stack lg">
        <div className="s-form-grid">
          <Field label="Klant" htmlFor="np-client">
            <Select id="np-client" value={clientId} onChange={(e) => setClientId(e.target.value)} autoFocus>
              <option value="">Kies een klant…</option>
              <option value={NEW_CLIENT}>+ Nieuwe klant</option>
              {(clients.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>
              ))}
            </Select>
          </Field>
          <TextField label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. DVO'60 JO11 tegen Steenbergen" hint="De naam van de opdracht, niet van één onderdeel." />
          {clientId === NEW_CLIENT && (
            <>
              <TextField label="Naam" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              <TextField label="E-mail" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} hint="Nodig voor het portaal en offertes" />
              <TextField className="full" label="Bedrijf of club" value={newClient.company} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} />
            </>
          )}
        </div>

        <div className="s-stack sm">
          <b>Wat gaan we maken?</b>
          <div className="s-newparts">
            {PART_KINDS.map((kind) => {
              const d = parts[kind];
              const steps = STEPS[kind].slice(0, STEPS[kind].indexOf(DELIVERY_STEP[kind]));
              return (
                <div key={kind} className={cx("s-newpart", d.on && "on")}>
                  <label className="s-newpart-head">
                    <input type="checkbox" checked={d.on} onChange={(e) => set(kind, { on: e.target.checked })} />
                    <PartDot kind={kind} />{PART_LABEL[kind]}
                  </label>
                  {d.on ? (
                    <div className="s-stack">
                      <SelectField label="Categorie" value={d.category} onChange={(e) => set(kind, { category: e.target.value })}
                        hint={kind === "photo" ? "Bepaalt de stijl van de galerij." : undefined}>
                        <option value="">Kies…</option>
                        {CATEGORIES[kind].map((c) => <option key={c} value={c}>{c}</option>)}
                      </SelectField>
                      <SelectField label="Begint bij" value={d.stage} onChange={(e) => set(kind, { stage: e.target.value })}>
                        {steps.map((s) => <option key={s} value={s}>{stepLabel(kind, s)}</option>)}
                      </SelectField>
                      {kind === "photo" && (
                        <label className="s-check-row">
                          <input type="checkbox" checked={sale} onChange={(e) => setSale(e.target.checked)} />
                          <span><b>Start-up sale</b><small>Gratis shoot. Binnen een week alle foto's online met watermerk, €{SALE_PRICE} per foto via de groepslink.</small></span>
                        </label>
                      )}
                    </div>
                  ) : (
                    <p className="s-small s-muted">
                      {kind === "photo" ? "Een shoot met een galerij om te kiezen, delen en verkopen." : kind === "video" ? "Opname en montage. De video komt in dezelfde galerij." : "Een nieuwe of vernieuwde site, met demo's voor de klant."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="s-form-grid">
          {media && (
            <>
              <Field label="Datum shoot" htmlFor="np-shoot">
                <Input id="np-shoot" type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
              </Field>
              <Field label="Tijd (optioneel)" htmlFor="np-shoot-time" hint={shootDate && !shootTime ? "Zonder tijd: de hele dag" : "Een shoot plannen verzet de stap niet."}>
                <Input id="np-shoot-time" type="time" value={shootTime} onChange={(e) => setShootTime(e.target.value)} disabled={!shootDate} />
              </Field>
            </>
          )}
          <Field label="Deadline (optioneel)" htmlFor="np-due" hint={saleDue && !dueDate ? `Start-up sale: vanzelf ${SALE_DAYS} dagen na de shoot` : undefined}>
            <Input id="np-due" type="date" value={dueDate || saleDue} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <SelectField label="Locatie (optioneel)" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Nog geen locatie</option>
            {(locations.data || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </SelectField>
        </div>

        {chosen.length > 0 && (
          <p className="s-banner" style={{ margin: 0 }}>
            {chosen.length === 1
              ? `Dit maakt één project met het onderdeel ${PART_LABEL[chosen[0]]}.`
              : `Dit maakt één project met ${chosen.length} onderdelen: ${chosen.map((k) => PART_LABEL[k]).join(" en ")}. De klant ziet ze in het portaal onder één project.`}
          </p>
        )}
        {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
