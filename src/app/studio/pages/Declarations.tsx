import { useQuery } from "@tanstack/react-query";
import { Check, Download, FileText, Loader2, Paperclip, Plus, Receipt, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { api, del, get, post, put } from "../api";
import { euro, fmtDate } from "../format";
import { useAction, useMe } from "../queries";
import { parseReceipt, type Parsed } from "../receipt/parse";
import { Button, Card, cx, Empty, ErrorState, Field, Input, Modal, PageHead, Pill, Select, SelectField, SkeletonList, TextField, useConfirm } from "../ui";
import { useUrlState } from "../urlState";

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

// No capture attribute: on a phone that would open the camera and leave no
// way to pick the PDF a supplier mailed.
const ACCEPT = "image/*,application/pdf";

type Declaration = {
  id: string; adminId: string; adminName: string; amount: number; vatRate: number; vatAmount: number; date: string;
  category: string; description: string; receiptUrl: string; receiptRef: string; createdAt: string;
};
type Listing = { declarations: Declaration[]; canViewAll: boolean; totals: { amount: number; vatAmount: number; count: number; byCategory: Record<string, number> } };
/** The dialog: an existing declaration, or a new one, perhaps starting from a file. */
type Editing = { item?: Declaration; file?: File };

function quarterOf(d = new Date()) { return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`; }
function recentQuarters(n = 8) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) { out.push(quarterOf(d)); d.setMonth(d.getMonth() - 3); }
  return out;
}
/** The quarter a YYYY-MM-DD date falls in, read as written (as the server does). */
function quarterOfDate(date: string) {
  const [y, m] = date.split("-").map(Number);
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
}
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

export function DeclarationsPage() {
  const confirm = useConfirm();
  const me = useMe();
  const [quarter, setQuarter] = useUrlState<string>("kwartaal", quarterOf());
  const [person, setPerson] = useUrlState<string>("persoon", "");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
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

  // A declaration dated in another quarter would otherwise vanish from view
  // the moment it is saved, as if it had not been.
  function saved(date: string) {
    setEditing(null);
    const q = quarterOfDate(date);
    if (quarter && q !== quarter) setQuarter(recentQuarters().includes(q) ? q : "");
  }

  const upload = <Button variant="primary" icon={<Upload />} onClick={() => picker.current?.click()}>Factuur uploaden</Button>;

  return (
    <>
      {/* A file dropped anywhere on the page starts a declaration from it. */}
      <div
        className="s-view"
        onDragEnter={(e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setDragging(true); }}
        onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
        onDragLeave={() => { if (--depth.current <= 0) { depth.current = 0; setDragging(false); } }}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) setEditing({ file });
        }}
      >
        <PageHead
          title="Declaraties"
          sub={data.data?.canViewAll ? "Bonnetjes van het hele team, per kwartaal. Bedragen zijn inclusief btw." : "Je eigen bonnetjes. Bedragen zijn inclusief btw."}
          actions={<><Button icon={<Plus />} onClick={() => setEditing({})}>Zonder factuur</Button>{upload}</>}
        />
        <input ref={picker} type="file" accept={ACCEPT} hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) setEditing({ file }); }} />
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
          <Button icon={<Download />} disabled={!list.length} onClick={exportCsv} style={{ marginLeft: "auto" }}>CSV voor de boekhouding</Button>
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
          {data.isLoading ? <SkeletonList rows={4} /> : list.length === 0 ? (
            <Empty icon={<Receipt />} title="Geen declaraties in deze periode" action={upload}>
              Upload een factuur of bonnetje. De gegevens vullen zich vanzelf in.
            </Empty>
          ) : (
            <div className="s-table-wrap">
              <table className="s-table">
                <thead><tr><th>Datum</th>{data.data?.canViewAll && <th>Wie</th>}<th>Omschrijving</th><th>Categorie</th><th className="right">Bedrag</th><th className="right">Btw</th><th /></tr></thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id} className="clickable" onClick={() => setEditing({ item: d })}>
                      <td className="s-muted">{fmtDate(d.date)}</td>
                      {data.data?.canViewAll && <td>{d.adminName}</td>}
                      <td>
                        <button type="button" className="s-cell-link" onClick={(e) => { e.stopPropagation(); setEditing({ item: d }); }}>
                          {d.description || <span className="s-faint">–</span>}
                        </button>
                      </td>
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
        {dragging && <div className="s-dropveil" aria-hidden="true"><span><Upload size={18} /> Laat los om de factuur te lezen</span></div>}
      </div>
      {/* Outside the drop area, so a file dropped on the dialog is handled there only. */}
      <DeclarationDialog editing={editing} onClose={() => setEditing(null)} onSaved={saved} canViewAll={!!data.data?.canViewAll} people={people.data?.workers || []} meId={me.data?.id || ""} />
    </>
  );
}

function DeclarationDialog({ editing, onClose, onSaved, canViewAll, people, meId }: {
  editing: Editing | null; onClose: () => void; onSaved: (date: string) => void; canViewAll: boolean; people: { id: string; name: string }[]; meId: string;
}) {
  const item = editing?.item;
  const fileInput = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ amount: "", vatRate: "21", date: "", category: "", description: "", receiptRef: "", adminId: "" });
  const [receipt, setReceipt] = useState<{ name: string; url: string } | null>(null);
  const [reading, setReading] = useState<{ name: string; done: number } | null>(null);
  const [outcome, setOutcome] = useState<{ filled: boolean; photo: boolean; notice?: string } | null>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Counts uploads, so the answer for a file that has since been replaced, or
  // for a dialog that has since been closed, is dropped.
  const latest = useRef(0);

  useEffect(() => {
    latest.current++;
    setError(null);
    setOutcome(null);
    setReading(null);
    if (!editing) return;
    if (item) {
      setF({ amount: Number(item.amount).toFixed(2).replace(".", ","), vatRate: String(item.vatRate), date: item.date.slice(0, 10), category: item.category, description: item.description, receiptRef: item.receiptRef, adminId: item.adminId });
      setReceipt(item.receiptUrl ? { name: receiptName(item.receiptRef), url: item.receiptUrl } : null);
    } else {
      setF({ amount: "", vatRate: "21", date: new Date().toISOString().slice(0, 10), category: "", description: "", receiptRef: "", adminId: "" });
      setReceipt(null);
      if (editing.file) attach(editing.file);
    }
  }, [editing]);

  // Local previews of a picked file are let go once replaced or closed.
  useEffect(() => () => { if (receipt?.url.startsWith("blob:")) URL.revokeObjectURL(receipt.url); }, [receipt]);

  const amount = Number(f.amount.replace(",", "."));
  const vat = Number(f.vatRate) ? Math.round(((amount * Number(f.vatRate)) / (100 + Number(f.vatRate))) * 100) / 100 : 0;
  const guess = useMemo(() => suggest(f.description), [f.description]);
  const busy = reading !== null;

  const save = useAction({
    fn: () => {
      const body = { amount, vatRate: Number(f.vatRate), date: f.date, category: f.category || guess || "Overig", description: f.description.trim(), receiptUrl: f.receiptRef, adminId: f.adminId || meId || undefined };
      return item ? put(`/admin/declarations/${item.id}`, body) : post("/admin/declarations", body);
    },
    invalidate: () => [["declarations"]],
    success: item ? "Opgeslagen" : "Declaratie ingediend",
    onSuccess: () => onSaved(f.date),
  });

  // Stores the file and, meanwhile, reads it here in the browser to fill the form in.
  async function attach(picked: File) {
    const mine = ++latest.current;
    setError(null);
    setOutcome(null);
    setReading({ name: picked.name, done: 0 });
    try {
      const file = await shrinkPhoto(picked);
      const form = new FormData();
      form.append("file", file);
      const [stored, read] = await Promise.all([
        api<{ receiptRef: string }>("/admin/declarations/receipt", { method: "POST", form }),
        readInvoice(file, (done) => { if (mine === latest.current) setReading({ name: picked.name, done }); }),
      ]);
      if (mine !== latest.current) return;
      const found = read?.fields;
      setF((x) => ({
        ...x,
        receiptRef: stored.receiptRef,
        ...(found && {
          amount: found.amount !== null ? found.amount.toFixed(2).replace(".", ",") : x.amount,
          vatRate: found.vatRate !== null ? String(found.vatRate) : x.vatRate,
          date: found.date || x.date,
          category: found.category || x.category,
          description: found.description || x.description,
        }),
      }));
      setReceipt({ name: picked.name, url: URL.createObjectURL(picked) });
      setOutcome({
        filled: !!found && (found.amount !== null || !!found.date || !!found.description),
        photo: !!read?.ocr,
        notice: read ? read.notice : "De factuur kon niet worden gelezen. Vul de gegevens zelf in.",
      });
    } catch (err) {
      if (mine === latest.current) setError((err as Error).message);
    } finally {
      if (mine === latest.current) setReading(null);
    }
  }

  function dropped(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file && !busy) attach(file);
  }

  return (
    <Modal open={!!editing} onOpenChange={(o) => !o && onClose()} title={item ? "Declaratie" : "Nieuwe declaratie"}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" disabled={busy} loading={save.isPending} onClick={() => {
        if (!Number.isFinite(amount) || amount <= 0) return setError("Vul het bedrag van het bonnetje in.");
        if (!f.date) return setError("Vul de datum in.");
        setError(null);
        save.mutate();
      }}>{item ? "Opslaan" : "Indienen"}</Button></>}>
      <div
        className={cx("s-dropzone s-receipt", over && "over", receipt && !busy && "has")}
        onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={dropped}
      >
        {busy ? (
          <div className="s-receipt-row" role="status">
            <span className="s-ico acc"><Loader2 className="spin" /></span>
            <div className="s-stack sm">
              <b>Factuur lezen…{reading.done > 0.05 && ` ${Math.round(reading.done * 100)}%`}</b>
              <span className="s-small s-muted s-ellipsis">{reading.name}</span>
            </div>
          </div>
        ) : receipt ? (
          <div className="s-receipt-row">
            <span className="s-ico ok"><FileText /></span>
            <a className="s-small s-ellipsis" href={receipt.url} target="_blank" rel="noreferrer">{receipt.name}</a>
            <Button size="sm" icon={<Upload />} onClick={() => fileInput.current?.click()}>Ander bestand</Button>
          </div>
        ) : (
          <button type="button" className="s-receipt-pick" onClick={() => fileInput.current?.click()}>
            <span className="s-ico acc"><Upload /></span>
            <b>Factuur of bonnetje uploaden</b>
            <span className="s-small s-muted">PDF of foto. De gegevens vullen zich vanzelf in.</span>
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) attach(x); }} />
      {outcome?.filled && (
        <p className="s-small" style={{ color: "var(--ok)" }}>
          <Check size={14} aria-hidden="true" /> {outcome.photo ? "Ingevuld vanaf de foto. Kijk alles goed na." : "Ingevuld vanaf de factuur. Kijk het even na."}
        </p>
      )}
      {outcome?.notice && <p className="s-small" style={{ color: "var(--warn)" }}>{outcome.notice}</p>}
      <div className="s-form-grid">
        <TextField label="Bedrag incl. btw (€)" inputMode="decimal" value={f.amount} disabled={busy} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <SelectField label="Btw-tarief" value={f.vatRate} disabled={busy} onChange={(e) => setF({ ...f, vatRate: e.target.value })}>
          <option value="21">21%</option><option value="9">9%</option><option value="0">0% / vrijgesteld</option>
        </SelectField>
        <Field label="Datum" htmlFor="decl-date"><Input id="decl-date" type="date" value={f.date} disabled={busy} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <SelectField label="Categorie" value={f.category} disabled={busy} onChange={(e) => setF({ ...f, category: e.target.value })} hint={!f.category && guess ? `Voorstel: ${guess}` : undefined}>
          <option value="">{guess ? `Automatisch: ${guess}` : "Kies…"}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <TextField className="full" label="Omschrijving" value={f.description} disabled={busy} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Bijv. SD-kaarten 128 GB" />
        {canViewAll && (
          <SelectField className="full" label="Voor wie" value={f.adminId || meId} disabled={busy} onChange={(e) => setF({ ...f, adminId: e.target.value })}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
        )}
      </div>
      {amount > 0 && <span className="s-small s-muted">Btw in dit bedrag: <b className="s-mono">{euro(vat)}</b></span>}
      {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
    </Modal>
  );
}

/** The text of the file, read into form fields; null when it could not be read at all. */
async function readInvoice(file: File, progress: (done: number) => void): Promise<(Parsed & { ocr: boolean }) | null> {
  try {
    const { readReceiptText } = await import("../receipt/read");
    const { text, ocr } = await readReceiptText(file, progress);
    return { ...parseReceipt(text), ocr };
  } catch (err) {
    console.error("reading the invoice failed:", err);
    return null;
  }
}

/** The file name a receipt was uploaded with, from its stored path. */
function receiptName(ref: string) {
  const file = decodeURIComponent(ref.replace(/^private:/, "").split("?")[0].split("/").pop() || "");
  return file.replace(/^\d+-([0-9a-f]{8}-)?/, "") || "Bonnetje";
}

// Phone photos are scaled to a sharp, small JPEG before they are read and
// stored: quicker to OCR and to send over mobile data.
const PHOTO_EDGE = 2400;

async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // HEIC outside Safari, for instance: stored as it came
  }
  const scale = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size < 3_000_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // a transparent screenshot would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
  return blob ? new File([blob], `${file.name.replace(/\.\w+$/, "") || "bonnetje"}.jpg`, { type: "image/jpeg" }) : file;
}
