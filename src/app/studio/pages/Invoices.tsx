import { ArrowLeft, Bell, Check, Copy, Eye, Plus, Receipt, Search, Send, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { del, post, put } from "../api";
import { ago, euro, fmtDate } from "../format";
import { keys, useAction, useClients, useInvoice, useInvoices, useProjects } from "../queries";
import type { Business, Invoice, InvoiceLine } from "../types";
import { Button, Card, Empty, ErrorState, Field, Input, Modal, PageHead, Pill, Segmented, SelectField, Skeleton, SkeletonList, TextAreaField, TextField, useConfirm } from "../ui";
import { InvoiceDocument } from "../components/InvoiceDocument";
import { copyText, INVOICE_STATUS } from "./Money";
import { useSearchPatch, useUrlState } from "../urlState";

type Filter = "open" | "overdue" | "paid" | "all";

export function InvoicesPage() {
  const { params, patch } = useSearchPatch();
  const navigate = useNavigate();
  const invoices = useInvoices();
  const [filter, setFilter] = useUrlState<Filter>("filter", "open");
  const [q, setQ] = useState("");
  const list = invoices.data || [];

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter((i) => {
      const f = filter === "all" ? true : filter === "open" ? i.status === "sent" || i.status === "draft" : filter === "overdue" ? i.overdue : i.status === "paid";
      return f && (!term || `${i.number} ${i.clientName} ${i.clientEmail}`.toLowerCase().includes(term));
    });
  }, [list, filter, q]);

  const open = list.filter((i) => i.status === "sent").reduce((s, i) => s + i.totals.total, 0);
  const overdue = list.filter((i) => i.overdue).reduce((s, i) => s + i.totals.total, 0);
  const year = String(new Date().getFullYear());
  const paidYear = list.filter((i) => i.status === "paid" && (i.paidAt || "").startsWith(year)).reduce((s, i) => s + i.totals.total, 0);

  return (
    <div className="s-view">
      <PageHead
        title="Facturen"
        sub="Maak een factuur uit een offerte of los. Nummering loopt vanzelf door."
        actions={<Button variant="primary" icon={<Plus />} onClick={() => patch({ new: "1" })}>Nieuwe factuur</Button>}
      />
      <Card bodyClass="none">
        <div className="s-stats">
          <div><b className="s-mono">{euro(open)}</b><span>Openstaand</span></div>
          <div><b className="s-mono" style={{ color: overdue ? "var(--bad)" : undefined }}>{euro(overdue)}</b><span>Te laat</span></div>
          <div><b className="s-mono">{euro(paidYear)}</b><span>Betaald in {year}</span></div>
          <div><b>{list.filter((i) => i.status === "draft").length}</b><span>Concepten</span></div>
        </div>
      </Card>
      <div className="s-row between">
        <Segmented<Filter> label="Filter" value={filter} onChange={setFilter} options={[
          { value: "open", label: "Open" }, { value: "overdue", label: "Te laat" }, { value: "paid", label: "Betaald" }, { value: "all", label: "Alles" },
        ]} />
        <label className="s-searchbox" style={{ width: 240 }}><Search /><input aria-label="Zoek facturen" placeholder="Zoek nummer of klant" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      {invoices.isError && <ErrorState error={invoices.error} retry={() => invoices.refetch()} />}
      <Card bodyClass="none">
        {invoices.isLoading ? <SkeletonList rows={4} /> : rows.length === 0 ? (
          <Empty icon={<Receipt />} title="Geen facturen" action={<Button onClick={() => patch({ new: "1" })}>Maak een factuur</Button>}>
            {filter === "overdue" ? "Niets te laat. Mooi zo." : "Niets gevonden met dit filter."}
          </Empty>
        ) : (
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Nummer</th><th>Klant</th><th>Datum</th><th>Vervalt</th><th className="right">Totaal</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="clickable" onClick={() => navigate(`/admin/invoice/${i.id}`)}>
                    <td className="s-mono"><Link to={`/admin/invoice/${i.id}`} style={{ textDecoration: "none" }}>{i.number}</Link></td>
                    <td>{i.clientName || i.clientEmail || "–"}</td>
                    <td className="s-muted">{fmtDate(i.issuedOn)}</td>
                    <td className={i.overdue ? "" : "s-muted"} style={i.overdue ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{fmtDate(i.dueOn)}</td>
                    <td className="right s-mono">{euro(i.totals.total)}</td>
                    <td><Pill tone={i.overdue ? "bad" : INVOICE_STATUS[i.status].tone}>{i.overdue ? "Te laat" : INVOICE_STATUS[i.status].label}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <NewInvoiceDialog open={params.get("new") === "1"} onClose={() => patch({ new: null, clientId: null, projectId: null })} defaults={{ clientId: params.get("clientId") || "", projectId: params.get("projectId") || "" }} />
    </div>
  );
}

function NewInvoiceDialog({ open, onClose, defaults }: { open: boolean; onClose: () => void; defaults: { clientId: string; projectId: string } }) {
  const navigate = useNavigate();
  const clients = useClients();
  const projects = useProjects();
  const [clientId, setClientId] = useState(defaults.clientId);
  const [projectId, setProjectId] = useState(defaults.projectId);
  useEffect(() => { if (open) { setClientId(defaults.clientId); setProjectId(defaults.projectId); } }, [open, defaults.clientId, defaults.projectId]);
  const client = (clients.data || []).find((c) => c.id === clientId);
  const project = (projects.data || []).find((p) => p.id === projectId);

  const create = useAction({
    fn: () => post<{ invoice: Invoice }>("/admin/invoices", {
      clientId: clientId || null,
      projectId: projectId || null,
      clientName: client?.company || client?.name || "",
      clientEmail: client?.email || "",
      lines: [{ label: project?.title || "Werkzaamheden", quantity: 1, amount: project?.valueCents ? project.valueCents / 100 : 0, note: "" }],
    }),
    invalidate: () => [keys.invoices],
    success: "Conceptfactuur gemaakt",
    onSuccess: (r) => { onClose(); navigate(`/admin/invoice/${r.invoice.id}`); },
  });

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Nieuwe factuur" description="Je vult de regels daarna in. Uit een offerte maken kan ook vanaf de offertes."
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={create.isPending} onClick={() => create.mutate()}>Concept maken</Button></>}>
      <SelectField label="Klant" value={clientId} onChange={(e) => setClientId(e.target.value)}>
        <option value="">Geen klant uit het systeem</option>
        {(clients.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
      </SelectField>
      <SelectField label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">Geen project</option>
        {(projects.data || []).filter((p) => !clientId || p.clientIds.includes(clientId)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </SelectField>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// One invoice
// ---------------------------------------------------------------------------

type DraftLine = { label: string; quantity: string; amount: string; note: string };
const num = (s: string) => Number(String(s).replace(",", "."));

export function InvoicePage() {
  const { id = "" } = useParams();
  const data = useInvoice(id);
  if (data.isError) return <div className="s-view"><Link to="/admin/invoices" className="s-back"><ArrowLeft size={14} /> Facturen</Link><ErrorState error={data.error} /></div>;
  if (!data.data) return <div className="s-view"><Skeleton h={34} w={260} /><Skeleton h={480} r={12} /></div>;
  return <InvoiceView invoice={data.data.invoice} business={data.data.business} />;
}

function InvoiceView({ invoice: inv, business }: { invoice: Invoice; business: Business }) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const draft = inv.status === "draft";
  const [sendOpen, setSendOpen] = useState(false);
  const invalidate = () => [keys.invoice(inv.id), keys.invoices, keys.overview];

  const status = useAction({
    fn: (s: Invoice["status"]) => post(`/admin/invoices/${inv.id}/status`, { status: s }),
    invalidate,
    success: (_d, s) => ({ paid: "Gemarkeerd als betaald", draft: "Teruggezet naar concept", void: "Factuur vervallen", sent: "Gemarkeerd als open" }[s]),
  });
  const remind = useAction({ fn: () => post(`/admin/invoices/${inv.id}/remind`, {}), invalidate, success: "Herinnering verstuurd" });
  const remove = useAction({ fn: () => del(`/admin/invoices/${inv.id}`), invalidate: () => [keys.invoices], success: "Concept verwijderd", onSuccess: () => navigate("/admin/invoices") });

  return (
    <div className="s-view narrow" style={{ maxWidth: 960 }}>
      <PageHead
        back={<Link to="/admin/invoices" className="s-back"><ArrowLeft size={14} /> Facturen</Link>}
        eyebrow={inv.clientName || "Factuur"}
        title={<span className="s-row">{inv.number} <Pill tone={inv.overdue ? "bad" : INVOICE_STATUS[inv.status].tone}>{inv.overdue ? "Te laat" : INVOICE_STATUS[inv.status].label}</Pill></span>}
        sub={inv.paidAt ? `Betaald ${fmtDate(inv.paidAt)}` : inv.sentAt ? `Verstuurd ${ago(inv.sentAt)}${inv.remindedAt ? `, herinnerd ${ago(inv.remindedAt)}` : ""}` : "Nog niet verstuurd"}
        actions={
          <>
            {draft && <Button variant="danger" icon={<Trash2 />} loading={remove.isPending} onClick={async () => { if (await confirm({ title: "Concept verwijderen?", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>Verwijderen</Button>}
            {!draft && <Button icon={<Copy />} onClick={() => copyText(inv.link)}>Link</Button>}
            {!draft && <a className="s-btn" href={`${new URL(inv.link).pathname}${new URL(inv.link).search}`} target="_blank" rel="noreferrer"><Eye size={15} />Bekijk</a>}
            {inv.status === "sent" && <Button icon={<Bell />} loading={remind.isPending} onClick={async () => { if (await confirm({ title: "Herinnering sturen?", body: `${inv.clientEmail} krijgt een vriendelijke herinnering.`, confirm: "Versturen" })) remind.mutate(); }}>Herinner</Button>}
            {inv.status === "sent" && <Button icon={<Check />} loading={status.isPending} onClick={() => status.mutate("paid")}>Betaald</Button>}
            {inv.status === "paid" && <Button icon={<Undo2 />} onClick={() => status.mutate("sent")}>Toch niet betaald</Button>}
            {inv.status === "sent" && <Button variant="ghost" onClick={async () => { if (await confirm({ title: "Terug naar concept?", body: "Dan kun je hem aanpassen en opnieuw versturen. De klant ziet de link tot die tijd niet.", confirm: "Terugzetten" })) status.mutate("draft"); }}>Aanpassen</Button>}
            {inv.status !== "void" && inv.status !== "paid" && <Button variant="primary" icon={<Send />} onClick={() => setSendOpen(true)}>{inv.sentAt ? "Opnieuw versturen" : "Versturen"}</Button>}
          </>
        }
      />
      {draft ? <InvoiceEditor invoice={inv} /> : <InvoiceDocument invoice={inv} business={business} />}
      {!draft && inv.status !== "void" && inv.status !== "paid" && (
        <p className="s-small s-faint">
          Iets fout? <button type="button" className="s-btn ghost sm" onClick={async () => { if (await confirm({ title: "Factuur laten vervallen?", body: "Het nummer blijft bestaan zodat de nummering klopt; de factuur telt niet meer mee.", danger: true, confirm: "Laten vervallen" })) status.mutate("void"); }}>Laat vervallen</button>
        </p>
      )}
      <SendInvoiceDialog invoice={inv} open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}

function InvoiceEditor({ invoice: inv }: { invoice: Invoice }) {
  const toDraft = (l: InvoiceLine): DraftLine => ({ label: l.label, quantity: String(l.quantity), amount: String(l.amount).replace(".", ","), note: l.note });
  const [lines, setLines] = useState<DraftLine[]>(inv.lines.map(toDraft));
  const [f, setF] = useState({ clientName: inv.clientName, clientEmail: inv.clientEmail, clientAddress: inv.clientAddress, issuedOn: inv.issuedOn, dueOn: inv.dueOn, notes: inv.notes, vatBasis: inv.vatBasis, vatRate: String(inv.vatRate) });
  const [error, setError] = useState<string | null>(null);

  const parsed = lines.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), quantity: num(l.quantity) || 1, amount: num(l.amount) || 0, note: l.note.trim() }));
  const rate = num(f.vatRate) || 0;
  const sum = parsed.reduce((s, l) => s + l.quantity * l.amount, 0);
  const totals = f.vatBasis === "incl"
    ? { net: sum - (sum * rate) / (100 + rate), vat: (sum * rate) / (100 + rate), total: sum }
    : { net: sum, vat: (sum * rate) / 100, total: sum + (sum * rate) / 100 };

  const save = useAction({
    fn: () => put<{ invoice: Invoice }>(`/admin/invoices/${inv.id}`, {
      clientId: inv.clientId, projectId: inv.projectId, ...f, vatRate: rate, lines: parsed,
    }),
    invalidate: () => [keys.invoice(inv.id), keys.invoices],
    success: "Opgeslagen",
  });

  function submit() {
    if (parsed.length === 0) return setError("Zet er minstens één regel op.");
    if (f.dueOn < f.issuedOn) return setError("De vervaldatum ligt voor de factuurdatum.");
    setError(null);
    save.mutate();
  }

  return (
    <Card title="Concept" action={<Button variant="primary" loading={save.isPending} onClick={submit}>Opslaan</Button>}>
      <div className="s-stack lg">
        <div className="s-form-grid">
          <TextField label="Naam of bedrijf" value={f.clientName} onChange={(e) => setF({ ...f, clientName: e.target.value })} />
          <TextField label="E-mail" type="email" value={f.clientEmail} onChange={(e) => setF({ ...f, clientEmail: e.target.value })} />
          <TextAreaField className="full" label="Adres (optioneel)" rows={2} value={f.clientAddress} onChange={(e) => setF({ ...f, clientAddress: e.target.value })} />
          <Field label="Factuurdatum" htmlFor="inv-issued"><Input id="inv-issued" type="date" value={f.issuedOn} onChange={(e) => setF({ ...f, issuedOn: e.target.value })} /></Field>
          <Field label="Te betalen voor" htmlFor="inv-due"><Input id="inv-due" type="date" value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} /></Field>
        </div>
        <div className="s-stack sm">
          <div className="s-line-editor s-label"><span>Omschrijving</span><span>Aantal</span><span>Prijs (€)</span><span /></div>
          {lines.map((l, i) => (
            <div key={i} className="s-stack sm">
              <div className="s-line-editor">
                <Input aria-label="Omschrijving" value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input aria-label="Aantal" inputMode="decimal" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} style={{ textAlign: "right" }} />
                <Input aria-label="Prijs" inputMode="decimal" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} style={{ textAlign: "right" }} />
                <Button variant="ghost" iconOnly aria-label="Regel verwijderen" icon={<X />} onClick={() => setLines(lines.filter((_, j) => j !== i))} />
              </div>
              <Input aria-label="Toelichting" placeholder="Toelichting (optioneel)" value={l.note} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} style={{ fontSize: 13 }} />
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setLines([...lines, { label: "", quantity: "1", amount: "", note: "" }])} style={{ alignSelf: "flex-start" }}>Regel</Button>
        </div>
        <div className="s-form-grid">
          <SelectField label="Bedragen zijn" value={f.vatBasis} onChange={(e) => setF({ ...f, vatBasis: e.target.value as "incl" | "excl" })}>
            <option value="excl">Exclusief btw</option>
            <option value="incl">Inclusief btw</option>
          </SelectField>
          <TextField label="Btw %" inputMode="decimal" value={f.vatRate} onChange={(e) => setF({ ...f, vatRate: e.target.value })} />
        </div>
        <div className="s-totals">
          <div className="s-kv"><span>Subtotaal</span><span className="s-mono">{euro(totals.net)}</span></div>
          <div className="s-kv"><span>Btw {rate}%</span><span className="s-mono">{euro(totals.vat)}</span></div>
          <div className="s-kv"><span>Totaal</span><span className="s-mono">{euro(totals.total)}</span></div>
        </div>
        <TextAreaField label="Opmerking op de factuur" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
        <p className="s-small s-faint">Bedrijfsgegevens, KvK en IBAN op de factuur stel je in bij <Link to="/admin/settings">Instellingen</Link>.</p>
      </div>
    </Card>
  );
}

function SendInvoiceDialog({ invoice: inv, open, onClose }: { invoice: Invoice; open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState(inv.clientEmail);
  const [message, setMessage] = useState("");
  useEffect(() => { if (open) { setEmail(inv.clientEmail); setMessage(""); } }, [open, inv.clientEmail]);
  const send = useAction({
    fn: () => post(`/admin/invoices/${inv.id}/send`, { email, message }),
    invalidate: () => [keys.invoice(inv.id), keys.invoices, keys.overview],
    success: () => `Factuur verstuurd naar ${email}`,
    onSuccess: onClose,
  });
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Factuur versturen" description={`${inv.number} · ${euro(inv.totals.total)}`}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" icon={<Send />} loading={send.isPending} disabled={!email.includes("@")} onClick={() => send.mutate()}>Versturen</Button></>}>
      <TextField label="Naar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextAreaField label="Persoonlijk bericht (optioneel)" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
    </Modal>
  );
}
