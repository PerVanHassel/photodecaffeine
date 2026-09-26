import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { post } from "../api";
import { PIPELINE, STAGE_LABEL, TYPE_LABEL } from "../format";
import { keys, useAction, useClients, useLocations } from "../queries";
import type { Client, Project, ProjectType, Stage } from "../types";
import { Button, Field, Input, Modal, Select, SelectField, TextField } from "../ui";

const NEW_CLIENT = "__new__";

/** Create a project: pick or add the client, name it, choose where it starts in the pipeline. */
export function NewProjectDialog({ open, onOpenChange, defaults }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaults?: { clientId?: string; stage?: Stage; title?: string };
}) {
  const navigate = useNavigate();
  const clients = useClients();
  const locations = useLocations();
  const [clientId, setClientId] = useState(defaults?.clientId || "");
  const [newClient, setNewClient] = useState({ name: "", email: "", company: "" });
  const [title, setTitle] = useState(defaults?.title || "");
  const [type, setType] = useState<ProjectType>("photo");
  const [stage, setStage] = useState<Stage>(defaults?.stage || "booked");
  const [dueDate, setDueDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setClientId(defaults?.clientId || "");
      setStage(defaults?.stage || "booked");
      setTitle(defaults?.title || "");
      setError(null);
    }
  }, [open, defaults?.clientId, defaults?.stage, defaults?.title]);

  const create = useAction({
    fn: async () => {
      let id = clientId;
      if (clientId === NEW_CLIENT) {
        const r = await post<{ client: Client }>("/admin/client", newClient);
        id = r.client.id;
      }
      return post<{ project: Project }>("/admin/project", {
        title, type, stage, clientIds: [id], dueDate: dueDate || "", locationId: locationId || null,
      });
    },
    invalidate: () => [keys.projects, keys.clients, keys.overview],
    success: "Project aangemaakt",
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
    setError(null);
    create.mutate();
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nieuwe shoot of project"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button variant="primary" type="submit" form="new-project" loading={create.isPending}>Aanmaken</Button>
        </>
      }
    >
      <form id="new-project" onSubmit={submit} className="s-stack">
        <Field label="Klant" htmlFor="np-client">
          <Select id="np-client" value={clientId} onChange={(e) => setClientId(e.target.value)} autoFocus>
            <option value="">Kies een klant…</option>
            <option value={NEW_CLIENT}>+ Nieuwe klant</option>
            {(clients.data || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>
            ))}
          </Select>
        </Field>
        {clientId === NEW_CLIENT && (
          <div className="s-form-grid">
            <TextField label="Naam" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            <TextField label="E-mail" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} hint="Nodig voor het portaal en offertes" />
            <TextField className="full" label="Bedrijf" value={newClient.company} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} />
          </div>
        )}
        <TextField label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. Porsche 911, Garage De Wit" />
        <div className="s-form-grid">
          <SelectField label="Soort" value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
            {(Object.keys(TYPE_LABEL) as ProjectType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </SelectField>
          <SelectField label="Stap in de pijplijn" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {PIPELINE.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </SelectField>
          <Field label="Deadline (optioneel)" htmlFor="np-due">
            <Input id="np-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <SelectField label="Locatie (optioneel)" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Nog geen locatie</option>
            {(locations.data || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </SelectField>
        </div>
        {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
