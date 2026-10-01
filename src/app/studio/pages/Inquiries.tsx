import { ArrowRightCircle, Check, Inbox, Mail, Phone, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { del, post, put } from "../api";
import { ago, fmtDateTime, TYPE_LABEL } from "../format";
import { keys, useAction, useInquiries } from "../queries";
import type { Client, Inquiry, ProjectType } from "../types";
import { Button, Card, Empty, ErrorState, Modal, PageHead, Pill, Segmented, SelectField, SkeletonList, TextField, useConfirm } from "../ui";
import { useSearchPatch, useUrlState } from "../urlState";

type Filter = "new" | "handled" | "all";

export function InquiriesPage() {
  const { params, patch } = useSearchPatch();
  const inquiries = useInquiries();
  const [filter, setFilter] = useUrlState<Filter>("filter", "new");
  const list = inquiries.data || [];
  const rows = useMemo(() => list.filter((i) => (filter === "all" ? true : filter === "new" ? !i.handled : i.handled)), [list, filter]);
  const openId = params.get("open");
  const selected = list.find((i) => i.id === openId) || rows[0] || null;

  return (
    <div className="s-view">
      <PageHead title="Aanvragen" sub="Berichten via het contactformulier. Zet een aanvraag in één stap om naar klant, project en offerte." />
      <Segmented<Filter> label="Filter" value={filter} onChange={setFilter} options={[
        { value: "new", label: `Nieuw${list.filter((i) => !i.handled).length ? ` (${list.filter((i) => !i.handled).length})` : ""}` },
        { value: "handled", label: "Afgehandeld" },
        { value: "all", label: "Alles" },
      ]} />
      {inquiries.isError && <ErrorState error={inquiries.error} retry={() => inquiries.refetch()} />}
      <div className="s-grid-2 list-detail">
        <Card bodyClass="none">
          {inquiries.isLoading ? <SkeletonList rows={5} /> : rows.length === 0 ? (
            <Empty icon={<Inbox />} title={filter === "new" ? "Geen nieuwe aanvragen" : "Niets hier"}>{filter === "new" ? "Alles is afgehandeld." : undefined}</Empty>
          ) : (
            <ul className="s-list">
              {rows.map((i) => (
                <li key={i.id}>
                  <button type="button" className="s-item" onClick={() => patch({ open: i.id }, { replace: true })}
                    style={{ gridTemplateColumns: "minmax(0,1fr) auto", ...(selected?.id === i.id ? { background: "var(--accent-soft)", boxShadow: "inset 3px 0 0 var(--accent)" } : {}) }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="t s-truncate">{i.name}{i.brand ? ` · ${i.brand}` : ""}</div>
                      <div className="s s-clamp2">{i.message}</div>
                    </div>
                    <span className="s-small s-faint" style={{ alignSelf: "start" }}>{ago(i.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {selected ? <InquiryDetail key={selected.id} inquiry={selected} /> : <Card><Empty title="Kies een aanvraag" /></Card>}
      </div>
    </div>
  );
}

function InquiryDetail({ inquiry: i }: { inquiry: Inquiry }) {
  const confirm = useConfirm();
  const [converting, setConverting] = useState(false);
  const toggle = useAction({
    fn: () => put(`/admin/inquiry/${i.id}`, { handled: !i.handled }),
    invalidate: () => [keys.inquiries, keys.overview],
    success: i.handled ? "Teruggezet naar nieuw" : "Gemarkeerd als afgehandeld",
  });
  const remove = useAction({ fn: () => del(`/admin/inquiry/${i.id}`), invalidate: () => [keys.inquiries, keys.overview], success: "Aanvraag verwijderd" });
  const replySubject = encodeURIComponent(`Re: je aanvraag bij PhotoDeCaffeine`);

  return (
    <Card
      title={<div className="s-stack sm"><h2 style={{ fontSize: 17 }}>{i.name}</h2><span className="s-small s-muted">{fmtDateTime(i.createdAt)}</span></div>}
      action={i.handled ? <Pill tone="ok">Afgehandeld</Pill> : <Pill tone="acc">Nieuw</Pill>}
    >
      <div className="s-stack lg">
        <div className="s-stack sm">
          <div className="s-kv"><span>E-mail</span><a href={`mailto:${i.email}`}>{i.email}</a></div>
          {i.phone && <div className="s-kv"><span>Telefoon</span><a href={`tel:${i.phone}`}>{i.phone}</a></div>}
          {i.brand && <div className="s-kv"><span>Merk / bedrijf</span><span>{i.brand}</span></div>}
          {i.package && <div className="s-kv"><span>Pakket</span><span>{i.package}</span></div>}
        </div>
        <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.65, background: "var(--sunken)", padding: 14, borderRadius: 8 }}>{i.message}</p>
        {(i.clientId || i.projectId) && (
          <div className="s-row">
            {i.clientId && <Link className="s-btn sm" to={`/admin/client/${i.clientId}`}>Naar klant</Link>}
            {i.projectId && <Link className="s-btn sm" to={`/admin/project/${i.projectId}`}>Naar project</Link>}
          </div>
        )}
        <div className="s-row">
          {!i.clientId && <Button variant="primary" icon={<ArrowRightCircle />} onClick={() => setConverting(true)}>Omzetten</Button>}
          <a className="s-btn" href={`mailto:${i.email}?subject=${replySubject}`}><Mail size={15} />Beantwoorden</a>
          {i.phone && <a className="s-btn ghost" href={`tel:${i.phone}`}><Phone size={15} />Bellen</a>}
          <Button variant="ghost" icon={i.handled ? <Undo2 /> : <Check />} loading={toggle.isPending} onClick={() => toggle.mutate()}>{i.handled ? "Terug naar nieuw" : "Afgehandeld"}</Button>
          <Button variant="ghost" iconOnly aria-label="Verwijderen" icon={<Trash2 />} style={{ marginLeft: "auto" }}
            onClick={async () => { if (await confirm({ title: "Aanvraag verwijderen?", danger: true, confirm: "Verwijderen" })) remove.mutate(); }} />
        </div>
      </div>
      <ConvertDialog inquiry={i} open={converting} onClose={() => setConverting(false)} />
    </Card>
  );
}

function ConvertDialog({ inquiry: i, open, onClose }: { inquiry: Inquiry; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(i.name);
  const [company, setCompany] = useState(i.brand);
  const [withProject, setWithProject] = useState(true);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectType>("photo");
  const [quote, setQuote] = useState(true);
  useEffect(() => {
    if (open) { setName(i.name); setCompany(i.brand); setTitle(i.brand ? `${i.brand}` : `Shoot ${i.name}`); }
  }, [open, i.name, i.brand]);

  const convert = useAction({
    fn: () => post<{ client: Client; projectId: string | null; quoteId: string | null }>(`/admin/inquiry/${i.id}/convert`, {
      name, company, project: withProject ? { title, type } : null, quote: withProject && quote,
    }),
    invalidate: () => [keys.inquiries, keys.clients, keys.projects, keys.quotes, keys.overview],
    success: "Omgezet",
    onSuccess: (r) => {
      onClose();
      if (r.quoteId) navigate(`/admin/quotes?open=${r.quoteId}`);
      else if (r.projectId) navigate(`/admin/project/${r.projectId}`);
      else navigate(`/admin/client/${r.client.id}`);
    },
  });

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Aanvraag omzetten" description="Een bestaande klant met hetzelfde e-mailadres wordt hergebruikt."
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={convert.isPending} onClick={() => convert.mutate()} disabled={!name.trim() || (withProject && !title.trim())}>Omzetten</Button></>}>
      <div className="s-form-grid">
        <TextField label="Naam" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Bedrijf" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <label className="s-check"><input type="checkbox" checked={withProject} onChange={(e) => setWithProject(e.target.checked)} /> Maak een project in de pijplijn</label>
      {withProject && (
        <>
          <div className="s-form-grid">
            <TextField label="Projecttitel" value={title} onChange={(e) => setTitle(e.target.value)} />
            <SelectField label="Soort" value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
              {(Object.keys(TYPE_LABEL) as ProjectType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </SelectField>
          </div>
          <label className="s-check"><input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} /> Begin meteen een conceptofferte</label>
        </>
      )}
    </Modal>
  );
}
