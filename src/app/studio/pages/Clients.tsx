import { ArrowLeft, Download, Mail, Plus, Search, Trash2, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { del, post, put } from "../api";
import { NewProjectDialog } from "../components/NewProjectDialog";
import { ago, fmtDate, initials, STAGE_LABEL } from "../format";
import { keys, useAction, useClient, useClients } from "../queries";
import type { Client } from "../types";
import { Button, Card, Empty, ErrorState, Modal, PageHead, Photo, Pill, Skeleton, SkeletonList, TextAreaField, TextField, useConfirm } from "../ui";
import { INVOICE_STATUS, QUOTE_STATUS } from "./Money";

export function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const clients = useClients();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (clients.data || []).filter((c) => !term || `${c.name} ${c.email} ${c.company} ${c.phone}`.toLowerCase().includes(term));
  }, [clients.data, q]);

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Naam", "Bedrijf", "E-mail", "Telefoon", "Projecten", "Portaal", "Klant sinds"];
    const body = rows.map((c) => [c.name, c.company, c.email, c.phone, c.projectCount ?? 0, c.hasAccount ? "ja" : "nee", fmtDate(c.createdAt)].map(esc).join(";"));
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `klanten-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="s-view">
      <PageHead
        title="Klanten"
        sub={clients.data ? `${clients.data.length} klanten, ${clients.data.filter((c) => c.hasAccount).length} met een portaal.` : " "}
        actions={
          <>
            <Button icon={<Download />} onClick={exportCsv} disabled={!rows.length}>CSV</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setParams({ new: "1" })}>Nieuwe klant</Button>
          </>
        }
      />
      <label className="s-searchbox" style={{ maxWidth: 360 }}><Search /><input aria-label="Zoek klanten" placeholder="Zoek op naam, bedrijf, e-mail of telefoon" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {clients.isError && <ErrorState error={clients.error} retry={() => clients.refetch()} />}
      <Card bodyClass="none">
        {clients.isLoading ? <SkeletonList rows={5} /> : rows.length === 0 ? (
          <Empty icon={<Users />} title={q ? "Niemand gevonden" : "Nog geen klanten"} action={!q && <Button onClick={() => setParams({ new: "1" })}>Klant toevoegen</Button>} />
        ) : (
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Naam</th><th>Contact</th><th>Projecten</th><th>Portaal</th><th>Klant sinds</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/admin/client/${c.id}`)}>
                    <td>
                      <div className="s-row nowrap">
                        <span className="s-avatar">{initials(c.name)}</span>
                        <div style={{ minWidth: 0 }}>
                          <Link to={`/admin/client/${c.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{c.name}</Link>
                          {c.company && <div className="s-small s-muted">{c.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="s-small"><div>{c.email || <span className="s-faint">geen e-mail</span>}</div><div className="s-muted">{c.phone}</div></td>
                    <td className="s-mono">{c.projectCount ?? 0}</td>
                    <td>{c.hasAccount ? <Pill tone="ok">{c.lastSignIn ? `Actief ${ago(c.lastSignIn)}` : "Account"}</Pill> : <Pill plain>Geen</Pill>}</td>
                    <td className="s-muted">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ClientDialog open={params.get("new") === "1"} onClose={() => setParams({})} />
    </div>
  );
}

/** Add or edit a client; adding can send the portal invitation straight away. */
function ClientDialog({ open, onClose, client }: { open: boolean; onClose: () => void; client?: Client }) {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", company: "", phone: "", notes: "" });
  const [invite, setInvite] = useState(true);
  useEffect(() => {
    if (open) setF(client ? { name: client.name, email: client.email, company: client.company, phone: client.phone, notes: client.notes } : { name: "", email: "", company: "", phone: "", notes: "" });
  }, [open, client]);

  const save = useAction({
    fn: async () => {
      const r = client ? await put<{ client: Client }>(`/admin/client/${client.id}`, f) : await post<{ client: Client }>("/admin/client", f);
      if (!client && invite && f.email) await post("/admin/clients/invite", { email: f.email, name: f.name });
      return r;
    },
    invalidate: (_v, r) => [keys.clients, keys.client(r.client.id)],
    success: () => (client ? "Klant bijgewerkt" : invite && f.email ? `Klant toegevoegd en uitgenodigd` : "Klant toegevoegd"),
    onSuccess: (r) => { onClose(); if (!client) navigate(`/admin/client/${r.client.id}`); },
  });

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={client ? "Klant bewerken" : "Nieuwe klant"}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" type="submit" form="client-form" loading={save.isPending} disabled={!f.name.trim()}>{client ? "Opslaan" : "Toevoegen"}</Button></>}>
      <form id="client-form" className="s-form-grid" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <TextField label="Naam" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        <TextField label="Bedrijf" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
        <TextField label="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <TextField label="Telefoon" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <TextAreaField className="full" label="Notities (intern)" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        {!client && (
          <label className="s-check full">
            <input type="checkbox" checked={invite && !!f.email} disabled={!f.email} onChange={(e) => setInvite(e.target.checked)} />
            Stuur meteen een uitnodiging voor het klantportaal
          </label>
        )}
      </form>
    </Modal>
  );
}

export function ClientPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const data = useClient(id);
  const [editing, setEditing] = useState(false);
  const [newProject, setNewProject] = useState(false);

  const invite = useAction({
    fn: (c: Client) => post("/admin/clients/invite", { email: c.email, name: c.name }),
    invalidate: () => [keys.client(id)],
    success: (_d, c) => `Uitnodiging verstuurd naar ${c.email}`,
  });
  const remove = useAction({
    fn: () => del(`/admin/client/${id}`),
    invalidate: () => [keys.clients, keys.projects],
    success: "Klant verwijderd",
    onSuccess: () => navigate("/admin/clients"),
  });

  if (data.isError) return <div className="s-view"><Link to="/admin/clients" className="s-back"><ArrowLeft size={14} /> Klanten</Link><ErrorState error={data.error} /></div>;
  if (!data.data) return <div className="s-view"><Skeleton h={34} w={280} /><Skeleton h={300} r={12} /></div>;
  const { client: c, projects, quotes, invoices } = data.data;

  return (
    <div className="s-view">
      <PageHead
        back={<Link to="/admin/clients" className="s-back"><ArrowLeft size={14} /> Klanten</Link>}
        eyebrow={c.company || "Klant"}
        title={c.name}
        sub={[c.email, c.phone].filter(Boolean).join(" · ") || "Geen contactgegevens"}
        actions={
          <>
            <Button onClick={() => setEditing(true)}>Bewerken</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setNewProject(true)}>Nieuw project</Button>
          </>
        }
      />
      <div className="s-grid-2">
        <div className="s-stack lg">
          <Card title="Projecten" bodyClass="none">
            {projects.length === 0 ? <Empty title="Nog geen projecten" action={<Button onClick={() => setNewProject(true)}>Project aanmaken</Button>} /> : (
              <ul className="s-list">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link to={`/admin/project/${p.id}`} className="s-item">
                      <Photo src={p.gallerySettings.coverUrl || p.gallery[0]?.url} style={{ width: 56, aspectRatio: "1" }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="t s-truncate">{p.title}</div>
                        <div className="s">{p.gallery.length} foto's · aangemaakt {fmtDate(p.createdAt)}</div>
                      </div>
                      <Pill tone={p.stage === "delivered" || p.stage === "review" ? "ok" : "acc"}>{STAGE_LABEL[p.stage]}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Offertes en facturen" bodyClass="none">
            {quotes.length + invoices.length === 0 ? <Empty title="Nog niets" /> : (
              <ul className="s-list">
                {quotes.map((q) => (
                  <li key={q.id}><Link to={`/admin/quotes?open=${q.id}`} className="s-item" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <div><div className="t">{q.number} · {q.title}</div><div className="s">Offerte · {fmtDate(q.created_at)}</div></div>
                    <Pill tone={QUOTE_STATUS[q.status as keyof typeof QUOTE_STATUS]?.tone}>{QUOTE_STATUS[q.status as keyof typeof QUOTE_STATUS]?.label}</Pill>
                  </Link></li>
                ))}
                {invoices.map((i) => (
                  <li key={i.id}><Link to={`/admin/invoice/${i.id}`} className="s-item" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <div><div className="t">{i.number}</div><div className="s">Factuur · vervalt {fmtDate(i.due_on)}</div></div>
                    <Pill tone={INVOICE_STATUS[i.status as keyof typeof INVOICE_STATUS]?.tone}>{INVOICE_STATUS[i.status as keyof typeof INVOICE_STATUS]?.label}</Pill>
                  </Link></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="s-stack lg">
          <Card title="Klantportaal">
            {c.hasAccount ? (
              <div className="s-stack sm">
                <Pill tone="ok"><UserCheck size={11} /> Heeft een account</Pill>
                <span className="s-small s-muted">{c.lastSignIn ? `Laatst ingelogd ${ago(c.lastSignIn)}` : "Nog niet ingelogd"}</span>
              </div>
            ) : c.email ? (
              <div className="s-stack sm">
                <span className="s-small s-muted">Nog geen account. Met een uitnodiging kiest de klant zelf een wachtwoord.</span>
                <Button icon={<Mail />} loading={invite.isPending} onClick={() => invite.mutate(c)} style={{ alignSelf: "flex-start" }}>Uitnodigen</Button>
              </div>
            ) : (
              <span className="s-small s-muted">Voeg een e-mailadres toe om uit te nodigen.</span>
            )}
          </Card>
          <Card title="Notities">
            {c.notes ? <p style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{c.notes}</p> : <span className="s-small s-faint">Geen notities.</span>}
          </Card>
          <Card title="Gegevens">
            <div className="s-kv"><span>Klant sinds</span><span>{fmtDate(c.createdAt)}</span></div>
            <div className="s-kv"><span>Projecten</span><span>{projects.length}</span></div>
            <div className="s-kv"><span>Facturen</span><span>{invoices.length}</span></div>
          </Card>
          <Button
            variant="danger"
            icon={<Trash2 />}
            loading={remove.isPending}
            style={{ alignSelf: "flex-start" }}
            onClick={async () => {
              const ok = await confirm({
                title: `${c.name} verwijderen?`,
                body: "Hun login, en projecten die alleen bij deze klant horen (met galerij en berichten), gaan definitief weg. Offertes en facturen blijven bewaard.",
                confirm: "Definitief verwijderen",
                danger: true,
              });
              if (ok) remove.mutate();
            }}
          >
            Klant verwijderen
          </Button>
        </div>
      </div>
      <ClientDialog open={editing} onClose={() => setEditing(false)} client={c} />
      <NewProjectDialog open={newProject} onOpenChange={setNewProject} defaults={{ clientId: c.id }} />
    </div>
  );
}
