import { useQuery } from "@tanstack/react-query";
import { Check, Globe, Mail, MessageSquareHeart, Plus, Star, Trash2, UserCheck, UserMinus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { get, post, put } from "../../api";
import { ago, euro, TYPE_LABEL } from "../../format";
import { keys, useAction, useClients } from "../../queries";
import type { Deliverable, Project, ProjectType } from "../../types";
import { Button, Card, Field, Input, Pill, Select, SelectField, TextAreaField, TextField, undoToast, useConfirm } from "../../ui";
import { useUnsavedChanges } from "../../unsaved";

export function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="s-grid-2">
      <div className="s-stack lg">
        <DetailsCard project={project} />
        <DeliverablesCard project={project} />
        {project.type === "web" && <DemosCard project={project} />}
      </div>
      <div className="s-stack lg">
        <ClientsCard project={project} />
        <EngagementCard project={project} />
      </div>
    </div>
  );
}

function DetailsCard({ project: p }: { project: Project }) {
  const [form, setForm] = useState(() => fromProject(p));
  useEffect(() => setForm(fromProject(p)), [p.id, p.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(form) !== JSON.stringify(fromProject(p));
  useUnsavedChanges(dirty);
  const save = useAction({
    fn: () => put(`/admin/project/${p.id}`, {
      title: form.title.trim(),
      type: form.type,
      description: form.description,
      dueDate: form.dueDate || "",
      valueCents: form.value === "" ? null : Math.round(Number(form.value.replace(",", ".")) * 100),
    }),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: "Opgeslagen",
  });
  const valueInvalid = form.value !== "" && !Number.isFinite(Number(form.value.replace(",", ".")));

  return (
    <Card
      title="Gegevens"
      action={dirty && (
        <div className="s-row">
          <Button size="sm" variant="ghost" onClick={() => setForm(fromProject(p))}>Herstel</Button>
          <Button size="sm" variant="primary" loading={save.isPending} disabled={!form.title.trim() || valueInvalid} onClick={() => save.mutate()}>Opslaan</Button>
        </div>
      )}
    >
      <div className="s-form-grid">
        <TextField className="full" label="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <SelectField label="Soort" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ProjectType })}>
          {(Object.keys(TYPE_LABEL) as ProjectType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </SelectField>
        <Field label="Deadline" htmlFor="pd-due">
          <Input id="pd-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </Field>
        <TextField
          label="Waarde (€)"
          inputMode="decimal"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          error={valueInvalid ? "Vul een bedrag in, bijv. 895 of 895,50" : null}
          hint="Voor de pijplijn; de factuur komt uit de offerte"
        />
        <div />
        <TextAreaField className="full" label="Omschrijving (zichtbaar voor de klant)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
      </div>
    </Card>
  );
}

function fromProject(p: Project) {
  return {
    title: p.title,
    type: p.type,
    description: p.description,
    dueDate: p.dueDate || "",
    value: p.valueCents != null ? String(p.valueCents / 100).replace(".", ",") : "",
  };
}

function DeliverablesCard({ project: p }: { project: Project }) {
  const [label, setLabel] = useState("");
  const save = useAction({
    fn: (deliverables: Deliverable[]) => put(`/admin/project/${p.id}`, { deliverables }),
    invalidate: () => [keys.project(p.id)],
  });
  const list = p.deliverables || [];
  const done = list.filter((d) => d.done).length;

  return (
    <Card title="Op te leveren" action={list.length > 0 && <span className="s-mono s-faint s-small">{done} / {list.length}</span>}>
      <div className="s-stack">
        {list.length > 0 && (
          <ul className="s-shots">
            {list.map((d, i) => (
              <li key={i} className={d.done ? "done" : undefined} style={{ gridTemplateColumns: "22px minmax(0,1fr) auto auto" }}>
                <button type="button" className={`s-tick ${d.done ? "on" : ""}`} aria-label={d.done ? "Markeer als open" : "Markeer als klaar"}
                  onClick={() => save.mutate(list.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}>
                  {d.done && <Check />}
                </button>
                <span className="label">{d.name}</span>
                <span className="s-faint s-mono s-small">{d.count ? `${d.count}×` : ""}</span>
                <Button size="sm" variant="ghost" iconOnly aria-label={`${d.name} verwijderen`} icon={<X />} onClick={() => { const before = list; save.mutate(list.filter((_, j) => j !== i)); undoToast(`${d.name} verwijderd`, () => save.mutate(before)); }} />
              </li>
            ))}
          </ul>
        )}
        <form className="s-row nowrap" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; save.mutate([...list, parseDeliverable(label)]); setLabel(""); }}>
          <Input aria-label="Nieuw onderdeel" placeholder="Bijv. 25 bewerkte foto's, of 1 reel van 30 s" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button type="submit" icon={<Plus />} disabled={!label.trim()}>Toevoegen</Button>
        </form>
      </div>
    </Card>
  );
}

/** "25 bewerkte foto's" becomes {name: "bewerkte foto's", count: 25}. */
function parseDeliverable(text: string): Deliverable {
  const m = /^\s*(\d+)\s*[x×]?\s+(.+)$/i.exec(text);
  return m ? { name: m[2].trim(), count: Number(m[1]), done: false } : { name: text.trim(), done: false };
}

function DemosCard({ project: p }: { project: Project }) {
  const [slug, setSlug] = useState("");
  const save = useAction({
    fn: (demos: { slug: string; live: boolean }[]) => put(`/admin/project/${p.id}`, { demos }),
    invalidate: () => [keys.project(p.id)],
    success: "Demo's bijgewerkt",
  });
  return (
    <Card title="Webdemo's">
      <div className="s-stack">
        {p.demos.map((d) => (
          <div key={d.slug} className="s-row between">
            <a href={`/demo/${d.slug}`} target="_blank" rel="noreferrer" className="s-row" style={{ gap: 6, textDecoration: "none" }}>
              <Globe size={15} /><span className="s-mono">/demo/{d.slug}</span>
            </a>
            <div className="s-row">
              <label className="s-check s-small">
                <input type="checkbox" checked={d.live} onChange={() => save.mutate(p.demos.map((x) => (x.slug === d.slug ? { ...x, live: !x.live } : x)))} />
                Zichtbaar voor klant
              </label>
              <Button size="sm" variant="ghost" iconOnly aria-label="Demo loskoppelen" icon={<Trash2 />} onClick={() => { const before = p.demos; save.mutate(p.demos.filter((x) => x.slug !== d.slug)); undoToast("Demo losgekoppeld", () => save.mutate(before)); }} />
            </div>
          </div>
        ))}
        <form className="s-row nowrap" onSubmit={(e) => { e.preventDefault(); if (!slug.trim()) return; save.mutate([...p.demos, { slug: slug.trim(), live: false }]); setSlug(""); }}>
          <Input aria-label="Demo-slug" placeholder="bijv. aqua-spa-service" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Button type="submit" icon={<Plus />} disabled={!slug.trim()}>Koppelen</Button>
        </form>
      </div>
    </Card>
  );
}

function ClientsCard({ project: p }: { project: Project }) {
  const clients = useClients();
  const confirm = useConfirm();
  const [adding, setAdding] = useState("");
  const all = clients.data || [];
  const attached = p.clients || [];
  const setClients = useAction({
    fn: (clientIds: string[]) => put(`/admin/project/${p.id}`, { clientIds }),
    invalidate: () => [keys.project(p.id), keys.projects, keys.clients],
    success: "Klanten bijgewerkt",
  });
  const invite = useAction({
    fn: (c: { email: string; name: string }) => post("/admin/clients/invite", c),
    invalidate: () => [keys.clients],
    success: (_d, c) => `Uitnodiging verstuurd naar ${c.email}`,
  });

  return (
    <Card title="Klant" bodyClass="none">
      <ul className="s-list">
        {attached.map((c) => {
          const full = all.find((x) => x.id === c.id);
          return (
            <li key={c.id} className="s-item" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
              <div style={{ minWidth: 0 }}>
                <Link to={`/admin/client/${c.id}`} className="t" style={{ textDecoration: "none", display: "block" }}>{c.name}</Link>
                <div className="s s-truncate">{[c.company, c.email].filter(Boolean).join(" · ")}</div>
                <div style={{ marginTop: 6 }}>
                  {c.userId ? (
                    <Pill tone="ok"><UserCheck size={11} /> Heeft portaal{full?.lastSignIn ? `, laatst ${ago(full.lastSignIn)}` : ""}</Pill>
                  ) : c.email ? (
                    <Button size="sm" icon={<Mail />} loading={invite.isPending} onClick={() => invite.mutate({ email: c.email, name: c.name })}>Uitnodigen voor portaal</Button>
                  ) : (
                    <Pill tone="warn" plain>Geen e-mailadres</Pill>
                  )}
                </div>
              </div>
              {attached.length > 1 && (
                <Button size="sm" variant="ghost" iconOnly aria-label={`${c.name} loskoppelen`} icon={<UserMinus />}
                  onClick={async () => {
                    if (await confirm({ title: `${c.name} loskoppelen?`, body: "Deze klant ziet het project daarna niet meer in het portaal.", confirm: "Loskoppelen" })) {
                      setClients.mutate(p.clientIds.filter((id) => id !== c.id));
                    }
                  }} />
              )}
            </li>
          );
        })}
      </ul>
      <div className="s-card-body" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="s-row nowrap">
          <Select aria-label="Klant toevoegen" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Nog een klant toevoegen…</option>
            {all.filter((c) => !p.clientIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
          </Select>
          <Button disabled={!adding} onClick={() => { setClients.mutate([...p.clientIds, adding]); setAdding(""); }}>Toevoegen</Button>
        </div>
      </div>
    </Card>
  );
}

type Engagement = {
  reviewRequest: { status: string; requestedAt: string } | null;
  feedbackRequest: { status: string; requestedAt: string } | null;
  review: { rating: number; text: string; published: boolean } | null;
  feedback: { id: string; items: { text: string }[]; createdAt: string }[];
};

function EngagementCard({ project: p }: { project: Project }) {
  const data = useQuery({ queryKey: ["engagement", p.id], queryFn: () => get<Engagement>(`/admin/project/${p.id}/engagement`) });
  const request = useAction({
    fn: (kind: "review" | "feedback") => post<{ sentTo: string }>(`/admin/project/${p.id}/request-${kind}`),
    invalidate: () => [["engagement", p.id]],
    success: (r) => `Verzoek verstuurd naar ${r.sentTo}`,
  });
  const e = data.data;
  const delivered = ["delivered", "review", "archived"].includes(p.stage);

  return (
    <Card title="Na de levering">
      <div className="s-stack">
        {!delivered && <p className="s-small s-muted">Vraag om een review of feedback zodra het werk geleverd is.</p>}
        <div className="s-kv">
          <span className="s-row" style={{ gap: 6 }}><Star size={14} /> Review</span>
          <span>
            {e?.review ? (
              <Link to="/admin/reviews" className="s-pill ok plain" style={{ textDecoration: "none" }}>{"★".repeat(e.review.rating)} {e.review.published ? "gepubliceerd" : "nog niet gepubliceerd"}</Link>
            ) : e?.reviewRequest ? <Pill tone="warn">Gevraagd {ago(e.reviewRequest.requestedAt)}</Pill> : (
              <Button size="sm" loading={request.isPending && request.variables === "review"} onClick={() => request.mutate("review")}>Vraag om review</Button>
            )}
          </span>
        </div>
        <div className="s-kv">
          <span className="s-row" style={{ gap: 6 }}><MessageSquareHeart size={14} /> Feedback</span>
          <span>
            {e?.feedback.length ? <Pill tone="ok">{e.feedback.length} ontvangen</Pill>
              : e?.feedbackRequest ? <Pill tone="warn">Gevraagd {ago(e.feedbackRequest.requestedAt)}</Pill>
              : <Button size="sm" loading={request.isPending && request.variables === "feedback"} onClick={() => request.mutate("feedback")}>Vraag om feedback</Button>}
          </span>
        </div>
        {!!e?.feedback.length && (
          <ul className="s-list" style={{ fontSize: 13 }}>
            {e.feedback.flatMap((f) => f.items.map((it, i) => <li key={`${f.id}-${i}`} style={{ padding: "8px 0" }}>{it.text}</li>))}
          </ul>
        )}
        {p.valueCents ? <div className="s-kv"><span>Waarde</span><span className="s-mono">{euro(p.valueCents / 100)}</span></div> : null}
      </div>
    </Card>
  );
}
