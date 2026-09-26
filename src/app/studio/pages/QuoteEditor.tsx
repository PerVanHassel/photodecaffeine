import { Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { del, post, put } from "../api";
import { euro } from "../format";
import { keys, useAction, useClients, useProjects } from "../queries";
import type { Quote } from "../types";
import { Button, Field, Input, Modal, Segmented, SelectField, Sheet, TextAreaField, TextField, useConfirm } from "../ui";

type DraftLine = { label: string; amount: string; note: string };
type Draft = {
  type: "photo" | "web";
  title: string;
  subtitle: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  projectId: string;
  intro: string;
  oneTime: DraftLine[];
  monthly: DraftLine[];
  included: string[];
  terms: { label: string; text: string }[];
  notes: string;
  validUntil: string;
  vatBasis: "incl" | "excl";
  vatRate: string;
};

const TEMPLATES: Record<"photo" | "web", Pick<Draft, "title" | "subtitle" | "oneTime" | "monthly" | "included" | "terms">> = {
  photo: {
    title: "Prijsindicatie fotoshoot",
    subtitle: "Shoot + nabewerking",
    monthly: [],
    oneTime: [
      { label: "Shoot (halve dag)", amount: "350", note: "tot 4 uur op locatie" },
      { label: "Nabewerking", amount: "150", note: "geselecteerde foto's, kleur en retouche" },
      { label: "Reiskosten", amount: "0", note: "binnen 30 km inbegrepen" },
    ],
    included: [
      "Voorgesprek over wat je nodig hebt",
      "Bewerkte foto's in hoge resolutie",
      "Eigen online galerij om te bekijken en downloaden",
      "Gebruiksrechten voor eigen website en social media",
    ],
    terms: [
      { label: "Aanbetaling", text: "50% bij het vastleggen van de datum." },
      { label: "Levering", text: "binnen 10 werkdagen na de shoot." },
      { label: "Verzetten", text: "kosteloos tot 48 uur van tevoren." },
    ],
  },
  web: {
    title: "Prijsindicatie website",
    subtitle: "Website + admin-paneel",
    monthly: [
      { label: "Hosting", amount: "25", note: "server, database, fotoopslag, SSL" },
      { label: "Onderhoud", amount: "20", note: "updates, monitoring, storingen oplossen" },
    ],
    oneTime: [
      { label: "Bouwen & launchen", amount: "200", note: "" },
      { label: "Deposit", amount: "75", note: "" },
    ],
    included: [
      "Responsive website ontwerp (op maat gebouwd)",
      "Admin-paneel voor foto's en artikelen",
      "Tot 200 GB fotoopslag",
      "Automatische HTTPS/SSL",
      "Dagelijkse back-ups",
      "Telefonische support",
    ],
    terms: [
      { label: "Deposit", text: "dit bedrag wordt verrekend in de eerste drie maanden hosting." },
      { label: "Contract", text: "maandelijks opzegbaar, geen bindingsduur." },
      { label: "Start", text: "website live in ~2 weken na betaling." },
    ],
  },
};

function inWeeks(n: number) {
  const d = new Date(Date.now() + n * 7 * 86400000);
  return d.toISOString().slice(0, 10);
}

function fromQuote(q: Quote): Draft {
  const line = (l: { label: string; amount: number; note: string }) => ({ label: l.label, amount: String(l.amount).replace(".", ","), note: l.note });
  return {
    type: q.type, title: q.title, subtitle: q.subtitle, clientId: q.clientId, clientName: q.clientName, clientEmail: q.clientEmail,
    projectId: q.projectId, intro: q.intro, oneTime: q.oneTime.map(line), monthly: q.monthly.map(line), included: [...q.included],
    terms: q.terms.map((t) => ({ ...t })), notes: q.notes, validUntil: q.validUntil, vatBasis: q.vatBasis, vatRate: String(q.vatRate),
  };
}

function blank(type: "photo" | "web", defaults: { projectId?: string; clientId?: string }): Draft {
  const t = TEMPLATES[type];
  return {
    type, ...t, oneTime: t.oneTime.map((l) => ({ ...l })), monthly: t.monthly.map((l) => ({ ...l })), included: [...t.included], terms: t.terms.map((x) => ({ ...x })),
    clientId: defaults.clientId || "", clientName: "", clientEmail: "", projectId: defaults.projectId || "", intro: "", notes: "",
    validUntil: inWeeks(4), vatBasis: "excl", vatRate: "21",
  };
}

const num = (s: string) => Number(String(s).replace(",", "."));
const lines = (ls: DraftLine[]) => ls.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), amount: num(l.amount) || 0, note: l.note.trim() }));

export function QuoteEditor({ quote, defaults, onClose, onSend }: {
  quote: Quote | null;
  defaults: { projectId?: string; clientId?: string };
  onClose: () => void;
  onSend: (q: Quote) => void;
}) {
  const confirm = useConfirm();
  const clients = useClients();
  const projects = useProjects();
  const [d, setD] = useState<Draft>(() => (quote ? fromQuote(quote) : blank("photo", defaults)));
  const [error, setError] = useState<string | null>(null);

  // Picking a client fills in the name and address the quote is sent to.
  useEffect(() => {
    if (!d.clientId || !clients.data) return;
    const c = clients.data.find((x) => x.id === d.clientId);
    if (c && (!d.clientName || !d.clientEmail)) setD((x) => ({ ...x, clientName: x.clientName || c.name, clientEmail: x.clientEmail || c.email }));
  }, [d.clientId, clients.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => ({
    oneTime: lines(d.oneTime).reduce((s, l) => s + l.amount, 0),
    monthly: lines(d.monthly).reduce((s, l) => s + l.amount, 0),
  }), [d.oneTime, d.monthly]);

  const body = () => ({
    ...d,
    oneTime: lines(d.oneTime),
    monthly: lines(d.monthly),
    included: d.included.map((s) => s.trim()).filter(Boolean),
    terms: d.terms.filter((t) => t.label.trim() || t.text.trim()),
    vatRate: num(d.vatRate),
    projectId: d.projectId || null,
    clientId: d.clientId || null,
  });

  const save = useAction({
    fn: (_send: boolean) => (quote ? put<{ quote: Quote }>(`/admin/quotes/${quote.id}`, body()) : post<{ quote: Quote }>("/admin/quotes", body())),
    invalidate: () => [keys.quotes, keys.overview, keys.projects],
    success: (_r, send) => (send ? null : "Offerte opgeslagen"),
    onSuccess: (r, send) => (send ? onSend(r.quote) : onClose()),
  });
  const remove = useAction({
    fn: () => del(`/admin/quotes/${quote!.id}`),
    invalidate: () => [keys.quotes],
    success: "Offerte verwijderd",
    onSuccess: onClose,
  });

  function submit(send: boolean) {
    if (!d.title.trim()) return setError("Geef de offerte een titel.");
    if (lines(d.oneTime).length + lines(d.monthly).length === 0) return setError("Zet er minstens één bedrag in.");
    if (!Number.isFinite(num(d.vatRate))) return setError("Het btw-percentage klopt niet.");
    setError(null);
    save.mutate(send);
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={quote ? `Offerte ${quote.number}` : "Nieuwe offerte"}
      footer={
        <>
          {quote && (
            <Button variant="danger" icon={<Trash2 />} style={{ marginRight: "auto" }} loading={remove.isPending}
              onClick={async () => { if (await confirm({ title: "Offerte verwijderen?", body: "De link naar deze offerte werkt daarna niet meer.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>
              Verwijderen
            </Button>
          )}
          <Button onClick={() => submit(false)} loading={save.isPending && save.variables === false}>Opslaan</Button>
          <Button variant="primary" icon={<Send />} onClick={() => submit(true)} loading={save.isPending && save.variables === true}>Opslaan en versturen</Button>
        </>
      }
    >
      {!quote && (
        <Segmented label="Sjabloon" value={d.type} onChange={(t) => setD((x) => ({ ...blank(t, defaults), clientId: x.clientId, clientName: x.clientName, clientEmail: x.clientEmail, projectId: x.projectId }))}
          options={[{ value: "photo", label: "Fotoshoot" }, { value: "web", label: "Website" }]} />
      )}
      <TextField label="Titel" value={d.title} onChange={(e) => set("title", e.target.value)} />
      <TextField label="Ondertitel" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
      <div className="s-form-grid">
        <SelectField label="Klant" value={d.clientId} onChange={(e) => set("clientId", e.target.value)}>
          <option value="">Geen klant in het systeem</option>
          {(clients.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Project" value={d.projectId} onChange={(e) => set("projectId", e.target.value)}>
          <option value="">Geen project</option>
          {(projects.data || []).filter((p) => p.stage !== "archived").map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </SelectField>
        <TextField label="Naam op de offerte" value={d.clientName} onChange={(e) => set("clientName", e.target.value)} />
        <TextField label="E-mail" type="email" value={d.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
      </div>
      <TextAreaField label="Inleiding" value={d.intro} onChange={(e) => set("intro", e.target.value)} rows={3} placeholder="Bijv. Zoals besproken tijdens het intakegesprek…" />

      <LineList label="Eenmalig" lines={d.oneTime} onChange={(v) => set("oneTime", v)} total={totals.oneTime} />
      <LineList label="Maandelijks" lines={d.monthly} onChange={(v) => set("monthly", v)} total={totals.monthly} perMonth />

      <div className="s-form-grid">
        <SelectField label="Bedragen zijn" value={d.vatBasis} onChange={(e) => set("vatBasis", e.target.value as "incl" | "excl")}>
          <option value="excl">Exclusief btw (zakelijk)</option>
          <option value="incl">Inclusief btw (particulier)</option>
        </SelectField>
        <TextField label="Btw %" inputMode="decimal" value={d.vatRate} onChange={(e) => set("vatRate", e.target.value)} />
        <Field label="Geldig tot" htmlFor="q-valid"><Input id="q-valid" type="date" value={d.validUntil} onChange={(e) => set("validUntil", e.target.value)} /></Field>
      </div>

      <StringList label="Wat is inbegrepen" items={d.included} onChange={(v) => set("included", v)} />
      <div className="s-stack sm">
        <span className="s-label">Voorwaarden</span>
        {d.terms.map((t, i) => (
          <div key={i} className="s-row nowrap" style={{ alignItems: "flex-start" }}>
            <Input aria-label="Kopje" style={{ width: 140, flex: "none" }} value={t.label} onChange={(e) => set("terms", d.terms.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <Input aria-label="Tekst" value={t.text} onChange={(e) => set("terms", d.terms.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <Button variant="ghost" iconOnly aria-label="Voorwaarde verwijderen" icon={<X />} onClick={() => set("terms", d.terms.filter((_, j) => j !== i))} />
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => set("terms", [...d.terms, { label: "", text: "" }])} style={{ alignSelf: "flex-start" }}>Voorwaarde</Button>
      </div>
      <TextAreaField label="Slotopmerking" value={d.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
    </Sheet>
  );
}

function LineList({ label, lines: ls, onChange, total, perMonth }: {
  label: string; lines: DraftLine[]; onChange: (v: DraftLine[]) => void; total: number; perMonth?: boolean;
}) {
  const update = (i: number, patch: Partial<DraftLine>) => onChange(ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="s-stack sm">
      <div className="s-row between"><span className="s-label">{label}</span><span className="s-mono s-small">{euro(total)}{perMonth ? " p/m" : ""}</span></div>
      {ls.map((l, i) => (
        <div key={i} className="s-stack sm" style={{ padding: 10, background: "var(--sunken)", borderRadius: 8 }}>
          <div className="s-row nowrap">
            <Input aria-label="Omschrijving" placeholder="Omschrijving" value={l.label} onChange={(e) => update(i, { label: e.target.value })} />
            <Input aria-label="Bedrag" inputMode="decimal" placeholder="0" style={{ width: 110, flex: "none", textAlign: "right" }} value={l.amount} onChange={(e) => update(i, { amount: e.target.value })} />
            <Button variant="ghost" iconOnly aria-label="Regel verwijderen" icon={<X />} onClick={() => onChange(ls.filter((_, j) => j !== i))} />
          </div>
          <Input aria-label="Toelichting" placeholder="Toelichting (optioneel)" value={l.note} onChange={(e) => update(i, { note: e.target.value })} style={{ fontSize: 13 }} />
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => onChange([...ls, { label: "", amount: "", note: "" }])} style={{ alignSelf: "flex-start" }}>Regel</Button>
    </div>
  );
}

function StringList({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="s-stack sm">
      <span className="s-label">{label}</span>
      {items.map((s, i) => (
        <div key={i} className="s-row nowrap">
          <Input aria-label={label} value={s} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button variant="ghost" iconOnly aria-label="Verwijderen" icon={<X />} onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => onChange([...items, ""])} style={{ alignSelf: "flex-start" }}>Toevoegen</Button>
    </div>
  );
}

export function SendQuoteDialog({ quote, onClose }: { quote: Quote | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (quote) { setEmail(quote.clientEmail); setMessage(""); } }, [quote]);
  const send = useAction({
    fn: () => post(`/admin/quotes/${quote!.id}/send`, { email, message }),
    invalidate: () => [keys.quotes, keys.overview],
    success: () => `Offerte verstuurd naar ${email}`,
    onSuccess: onClose,
  });
  return (
    <Modal
      open={!!quote}
      onOpenChange={(o) => !o && onClose()}
      title={quote?.sentAt ? "Opnieuw versturen" : "Offerte versturen"}
      description={quote ? `${quote.number} · ${quote.title}` : undefined}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" icon={<Send />} loading={send.isPending} onClick={() => send.mutate()} disabled={!email.includes("@")}>Versturen</Button></>}
    >
      <TextField label="Naar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextAreaField label="Persoonlijk bericht (optioneel)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} hint="Komt bovenaan de mail, na de begroeting." />
    </Modal>
  );
}
