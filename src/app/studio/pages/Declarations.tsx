import { useQuery } from "@tanstack/react-query";
import { Download, Paperclip, Plus, Receipt, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, del, get, post, put } from "../api";
import { euro, fmtDate } from "../format";
import { useAction, useMe } from "../queries";
import { Button, Card, Empty, ErrorState, Field, Input, Modal, PageHead, Pill, Select, SelectField, SkeletonList, TextField, useConfirm } from "../ui";

const CATEGORIES = [
  "Reiskosten", "Apparatuur", "Software & Abonnementen", "Kantoorbenodigdheden", "Marketing & Advertenties",
  "Verzekeringen", "Horeca & Representatie", "Opleiding", "Overig",
];

// A first guess from the description; the category stays editable.
const KEYWORDS: [string, string[]][] = [
  ["Reiskosten", ["benzine", "tank", "ns.nl", "trein", "taxi", "uber", "parkeren", "kilometer"]],
  ["Apparatuur", ["camera", "lens", "statief", "licht", "drone", "gopro", "sd-kaart", "accu", "batterij"]],
  ["Software & Abonnementen", ["adobe", "notion", "canva", "hosting", "domein", "software", "abonnement", "licentie", "dropbox", "icloud", "resend", "vercel", "supabase"]],
  ["Kantoorbenodigdheden", ["printer", "papier", "kantoor", "toner", "postzegel"]],
  ["Marketing & Advertenties", ["advertentie", "ads", "marketing", "flyer", "sponsor"]],
  ["Verzekeringen", ["verzekering", "premie"]],
  ["Horeca & Representatie", ["lunch", "diner", "koffie", "restaurant", "borrel", "cadeau"]],
  ["Opleiding", ["cursus", "training", "workshop", "opleiding", "masterclass"]],
];
const suggest = (text: string) => KEYWORDS.find(([, ks]) => ks.some((k) => text.toLowerCase().includes(k)))?.[0] || "";

type Declaration = {
  id: string; adminId: string; adminName: string; amount: number; vatRate: number; vatAmount: number; date: string;
  category: string; description: string; receiptUrl: string; receiptRef: string; createdAt: string;
};
type Listing = { declarations: Declaration[]; canViewAll: boolean; totals: { amount: number; vatAmount: number; count: number; byCategory: Record<string, number> } };

function quarterOf(d = new Date()) { return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`; }
function recentQuarters(n = 8) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) { out.push(quarterOf(d)); d.setMonth(d.getMonth() - 3); }
  return out;
}

export function DeclarationsPage() {
  const confirm = useConfirm();
  const me = useMe();
  const [quarter, setQuarter] = useState(quarterOf());
  const [person, setPerson] = useState("");
  const [editing, setEditing] = useState<Declaration | "new" | null>(null);
  const qs = new URLSearchParams({ ...(quarter ? { quarter } : {}), ...(person ? { adminId: person } : {}) });
  const data = useQuery({ queryKey: ["declarations", quarter, person], queryFn: () => get<Listing>(`/admin/declarations?${qs}`) });
  const people = useQuery({ queryKey: ["team"], queryFn: () => get<{ workers: { id: string; name: string }[] }>("/admin/workers"), enabled: !!data.data?.canViewAll });
  const remove = useAction({ fn: (id: string) => del(`/admin/declarations/${id}`), invalidate: () => [["declarations"]], success: "Declaratie verwijderd" });

  const list = data.data?.declarations || [];
  const totals = data.data?.totals;

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = list.map((d) => [d.date, d.adminName, d.category, d.description, d.amount.toFixed(2).replace(".", ","), d.vatRate, d.vatAmount.toFixed(2).replace(".", ",")].map(esc).join(";"));
    const csv = "﻿" + ["Datum;Wie;Categorie;Omschrijving;Bedrag incl. btw;Btw %;Btw-bedrag", ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `declaraties-${quarter || "alles"}.csv`;
    a.click();
  }

  return (
    <div className="s-view">
      <PageHead
        title="Declaraties"
        sub={data.data?.canViewAll ? "Bonnetjes van het hele team, per kwartaal. Bedragen zijn inclusief btw." : "Je eigen bonnetjes. Bedragen zijn inclusief btw."}
        actions={<><Button icon={<Download />} disabled={!list.length} onClick={exportCsv}>CSV voor de boekhouding</Button><Button variant="primary" icon={<Plus />} onClick={() => setEditing("new")}>Declaratie</Button></>}
      />
      <div className="s-row">
        <Select aria-label="Kwartaal" value={quarter} onChange={(e) => setQuarter(e.target.value)} style={{ width: 160 }}>
          {recentQuarters().map((q) => <option key={q} value={q}>{q.replace("-", " ")}</option>)}
          <option value="">Alle kwartalen</option>
        </Select>
        {data.data?.canViewAll && (
          <Select aria-label="Persoon" value={person} onChange={(e) => setPerson(e.target.value)} style={{ width: 200 }}>
            <option value="">Iedereen</option>
            {(people.data?.workers || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        )}
      </div>
      {totals && (
        <Card bodyClass="none">
          <div className="s-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div><b className="s-mono">{euro(totals.amount)}</b><span>Totaal incl. btw</span></div>
            <div><b className="s-mono">{euro(totals.vatAmount)}</b><span>Terug te vragen btw</span></div>
            <div><b>{totals.count}</b><span>Bonnetjes</span></div>
          </div>
        </Card>
      )}
      {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
      <Card bodyClass="none">
        {data.isLoading ? <SkeletonList rows={4} /> : list.length === 0 ? <Empty icon={<Receipt />} title="Geen declaraties in deze periode" /> : (
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Datum</th>{data.data?.canViewAll && <th>Wie</th>}<th>Omschrijving</th><th>Categorie</th><th className="right">Bedrag</th><th className="right">Btw</th><th /></tr></thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => setEditing(d)}>
                    <td className="s-muted">{fmtDate(d.date)}</td>
                    {data.data?.canViewAll && <td>{d.adminName}</td>}
                    <td>{d.description || <span className="s-faint">–</span>}</td>
                    <td><Pill plain>{d.category}</Pill></td>
                    <td className="right s-mono">{euro(d.amount)}</td>
                    <td className="right s-mono s-muted">{euro(d.vatAmount)} <span className="s-faint">({d.vatRate}%)</span></td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div className="s-row nowrap" style={{ justifyContent: "flex-end" }}>
                        {d.receiptUrl && <a className="s-btn ghost sm icon" href={d.receiptUrl} target="_blank" rel="noreferrer" aria-label="Bonnetje bekijken" title="Bonnetje"><Paperclip size={15} /></a>}
                        <Button size="sm" variant="ghost" iconOnly aria-label="Verwijderen" icon={<Trash2 />} onClick={async () => { if (await confirm({ title: "Declaratie verwijderen?", danger: true, confirm: "Verwijderen" })) remove.mutate(d.id); }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <DeclarationDialog item={editing} onClose={() => setEditing(null)} canViewAll={!!data.data?.canViewAll} people={people.data?.workers || []} meId={me.data?.id || ""} />
    </div>
  );
}

function DeclarationDialog({ item, onClose, canViewAll, people, meId }: {
  item: Declaration | "new" | null; onClose: () => void; canViewAll: boolean; people: { id: string; name: string }[]; meId: string;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ amount: "", vatRate: "21", date: "", category: "", description: "", receiptRef: "", adminId: "" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (item === "new") setF({ amount: "", vatRate: "21", date: new Date().toISOString().slice(0, 10), category: "", description: "", receiptRef: "", adminId: meId });
    else if (item) setF({ amount: String(item.amount).replace(".", ","), vatRate: String(item.vatRate), date: item.date.slice(0, 10), category: item.category, description: item.description, receiptRef: item.receiptRef, adminId: item.adminId });
    setError(null);
  }, [item, meId]);

  const amount = Number(f.amount.replace(",", "."));
  const vat = Number(f.vatRate) ? Math.round(((amount * Number(f.vatRate)) / (100 + Number(f.vatRate))) * 100) / 100 : 0;
  const guess = useMemo(() => suggest(f.description), [f.description]);

  const save = useAction({
    fn: () => {
      const body = { amount, vatRate: Number(f.vatRate), date: f.date, category: f.category || guess || "Overig", description: f.description.trim(), receiptUrl: f.receiptRef, adminId: f.adminId || undefined };
      return item === "new" ? post("/admin/declarations", body) : put(`/admin/declarations/${(item as Declaration).id}`, body);
    },
    invalidate: () => [["declarations"]],
    success: item === "new" ? "Declaratie ingediend" : "Opgeslagen",
    onSuccess: onClose,
  });

  async function attach(fileObj: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", fileObj);
      const r = await api<{ receiptRef: string }>("/admin/declarations/receipt", { method: "POST", form });
      setF((x) => ({ ...x, receiptRef: r.receiptRef }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={!!item} onOpenChange={(o) => !o && onClose()} title={item === "new" ? "Nieuwe declaratie" : "Declaratie"}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={save.isPending} onClick={() => {
        if (!Number.isFinite(amount) || amount <= 0) return setError("Vul het bedrag van het bonnetje in.");
        if (!f.date) return setError("Vul de datum in.");
        setError(null);
        save.mutate();
      }}>{item === "new" ? "Indienen" : "Opslaan"}</Button></>}>
      <div className="s-form-grid">
        <TextField label="Bedrag incl. btw (€)" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus />
        <SelectField label="Btw-tarief" value={f.vatRate} onChange={(e) => setF({ ...f, vatRate: e.target.value })}>
          <option value="21">21%</option><option value="9">9%</option><option value="0">0% / vrijgesteld</option>
        </SelectField>
        <Field label="Datum" htmlFor="decl-date"><Input id="decl-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <SelectField label="Categorie" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} hint={!f.category && guess ? `Voorstel: ${guess}` : undefined}>
          <option value="">{guess ? `Automatisch: ${guess}` : "Kies…"}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <TextField className="full" label="Omschrijving" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Bijv. SD-kaarten 128 GB" />
        {canViewAll && (
          <SelectField className="full" label="Voor wie" value={f.adminId} onChange={(e) => setF({ ...f, adminId: e.target.value })}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
        )}
      </div>
      <div className="s-row">
        <Button icon={<Paperclip />} loading={uploading} onClick={() => file.current?.click()}>{f.receiptRef ? "Ander bonnetje" : "Bonnetje toevoegen"}</Button>
        {f.receiptRef && <Pill tone="ok">Bonnetje bijgevoegd</Pill>}
        {amount > 0 && <span className="s-small s-muted">Btw in dit bedrag: <b className="s-mono">{euro(vat)}</b></span>}
      </div>
      <input ref={file} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) attach(x); e.target.value = ""; }} />
      {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
    </Modal>
  );
}
