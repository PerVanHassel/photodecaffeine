import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, ImagePlus, Link2, Loader2, PiggyBank, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { webCopies } from "../../lib/webPhoto";
import { api, del, get, post, put } from "../api";
import { euro, fmtDate } from "../format";
import { useAction } from "../queries";
import { Button, Card, cx, Empty, ErrorState, Modal, PageHead, Photo, Pill, Segmented, SelectField, SkeletonList, TextAreaField, TextField, undoToast, useConfirm } from "../ui";
import { useUrlState } from "../urlState";

const CATEGORIES = ["Camera", "Lenzen", "Licht", "Audio", "Drone", "Computer & opslag", "Software", "Studio", "Vervoer", "Overig"];

type Status = "wish" | "planned" | "bought";
type Priority = "high" | "medium" | "low";
const STATUS_LABEL: Record<Status, string> = { wish: "Wens", planned: "Gepland", bought: "Gekocht" };
const STATUS_TONE: Record<Status, "info" | "ok" | undefined> = { wish: undefined, planned: "info", bought: "ok" };
const PRIORITY_LABEL: Record<Priority, string> = { high: "Hoog", medium: "Middel", low: "Laag" };
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

type Investment = {
  id: string; title: string; url: string; shop: string; price: number | null; status: Status; priority: Priority;
  category: string; notes: string; photo: string; photoUrl: string; addedBy: { id: string; name: string };
  boughtAt: string | null; createdAt: string;
};
type Listing = { investments: Investment[]; totals: Record<Status, number> };
type LinkRead = { url: string; title: string; price: number | null; shop: string; photoRef: string; photoUrl: string; notice?: string };
type PhotoStored = { photoRef: string; photoUrl: string };
/** The dialog: an existing item, or a new one starting from a link or a photo. */
type Editing = { item?: Investment; url?: string; file?: File };
type View = "open" | "bought" | "all";

const key = ["investments"];
const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

/** "1.299,95", "1299.95", "€ 1.299,-" → 1299.95; empty → null. */
function parsePrice(v: string): number | null | undefined {
  let s = v.replace(/[,.]\s*[-–]\s*$/, "").replace(/[^\d.,]/g, "");
  if (!s) return v.trim() ? undefined : null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}
const priceText = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ",").replace(/,00$/, ""));

export function InvestmentsPage() {
  const [view, setView] = useUrlState<View>("toon", "open", ["open", "bought", "all"]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [link, setLink] = useState("");
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const data = useQuery({ queryKey: key, queryFn: () => get<Listing>("/admin/investments") });
  const setStatus = useAction({
    fn: ({ id, status }: { id: string; status: Status }) => put(`/admin/investments/${id}`, { status }),
    invalidate: () => [key],
  });
  function markBought(i: Investment) {
    setStatus.mutate({ id: i.id, status: "bought" }, { onSuccess: () => undoToast(`${i.title} staat bij gekocht`, () => setStatus.mutate({ id: i.id, status: i.status })) });
  }

  const all = data.data?.investments || [];
  const list = all
    .filter((i) => view === "all" || (view === "bought" ? i.status === "bought" : i.status !== "bought"))
    .sort((a, b) => (a.status === "bought" && b.status === "bought"
      ? String(b.boughtAt).localeCompare(String(a.boughtAt))
      : PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt.localeCompare(a.createdAt)));
  const totals = data.data?.totals;

  // A link or a picture pasted anywhere on the page, outside a text field, starts a new item.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (editing || t?.closest("input, textarea, [contenteditable=true]")) return;
      const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith("image/"));
      const text = e.clipboardData?.getData("text") || "";
      if (file) setEditing({ file });
      else if (looksLikeUrl(text)) setEditing({ url: text.trim() });
      else return;
      e.preventDefault();
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [editing]);

  function addLink(e: FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setEditing({ url: link.trim() });
    setLink("");
  }

  const photoButton = <Button icon={<ImagePlus />} onClick={() => picker.current?.click()}>Foto uploaden</Button>;

  return (
    <>
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
          title="Investeringen"
          sub="Wat de studio wil aanschaffen. Plak een link naar een product of upload een foto."
          actions={<>{photoButton}<Button variant="primary" icon={<Plus />} onClick={() => setEditing({})}>Toevoegen</Button></>}
        />
        <input ref={picker} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) setEditing({ file }); }} />
        <form className="s-row nowrap" onSubmit={addLink}>
          <label className="s-searchbox" style={{ flex: 1, maxWidth: 560 }}>
            <Link2 />
            <input aria-label="Link naar een product" type="url" inputMode="url" placeholder="Plak een link naar een product" value={link} onChange={(e) => setLink(e.target.value)} />
          </label>
          <Button type="submit" disabled={!link.trim()}>Ophalen</Button>
        </form>
        {totals && (
          <Card bodyClass="none">
            <div className="s-stats three">
              <div><b className="s-mono">{euro(totals.wish)}</b><span>Wensen</span></div>
              <div><b className="s-mono">{euro(totals.planned)}</b><span>Gepland</span></div>
              <div><b className="s-mono">{euro(totals.bought)}</b><span>Gekocht</span></div>
            </div>
          </Card>
        )}
        <div className="s-row">
          <Segmented<View> label="Toon" value={view} onChange={setView} options={[
            { value: "open", label: "Nog te kopen" }, { value: "bought", label: "Gekocht" }, { value: "all", label: "Alles" },
          ]} />
        </div>
        {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
        {data.isLoading ? <Card bodyClass="none"><SkeletonList rows={3} /></Card> : list.length === 0 ? (
          <Card>
            <Empty icon={<PiggyBank />} title={all.length ? "Niets in deze lijst" : "Nog geen investeringen"} action={all.length ? undefined : photoButton}>
              {all.length ? "Kies hierboven een andere lijst." : "Plak een link naar een product hierboven, of upload een foto. Naam, prijs en foto vullen zich zoveel mogelijk vanzelf in."}
            </Empty>
          </Card>
        ) : (
          <div className="s-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {list.map((i) => (
              <article key={i.id} className="s-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <Photo
                  src={i.photoUrl}
                  alt={i.title}
                  className="s-product"
                  onClick={() => setEditing({ item: i })}
                  openLabel={`${i.title} bewerken`}
                />
                <div className="s-card-body s-stack sm" style={{ flex: 1 }}>
                  <div className="s-row between nowrap" style={{ alignItems: "baseline" }}>
                    <b className="s-clamp2">{i.title}</b>
                    <b className="s-mono" style={{ flex: "none" }}>{i.price === null ? <span className="s-faint">–</span> : euro(i.price)}</b>
                  </div>
                  <span className="s-small s-muted">
                    {[i.shop, i.category, i.status === "bought" && i.boughtAt ? `gekocht ${fmtDate(i.boughtAt)}` : `door ${i.addedBy.name}`].filter(Boolean).join(" · ")}
                  </span>
                  <div className="s-row nowrap" style={{ marginTop: "auto", paddingTop: 6, gap: 6 }}>
                    <Pill tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Pill>
                    {i.status !== "bought" && <Pill tone={i.priority === "high" ? "acc" : undefined} plain={i.priority === "low"}>{PRIORITY_LABEL[i.priority]}</Pill>}
                    <span className="s-spacer" />
                    {i.url && <a className="s-btn ghost sm icon" href={i.url} target="_blank" rel="noreferrer" aria-label="Naar de winkel" title="Naar de winkel"><ExternalLink size={15} /></a>}
                    {i.status !== "bought" && (
                      <Button size="sm" variant="ghost" iconOnly aria-label="Gekocht" title="Gekocht" icon={<Check />} onClick={() => markBought(i)} />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {dragging && <div className="s-dropveil" aria-hidden="true"><span><Upload size={18} /> Laat los om de foto toe te voegen</span></div>}
      </div>
      <InvestmentDialog editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function InvestmentDialog({ editing, onClose }: { editing: Editing | null; onClose: () => void }) {
  const confirm = useConfirm();
  const item = editing?.item;
  const fileInput = useRef<HTMLInputElement>(null);
  const empty = { title: "", url: "", shop: "", price: "", status: "wish" as Status, priority: "medium" as Priority, category: "", notes: "", photo: "" };
  const [f, setF] = useState(empty);
  const [photoUrl, setPhotoUrl] = useState("");
  // The link the fields were last filled from; "Ophalen" shows once it differs.
  const [readUrl, setReadUrl] = useState("");
  const [busy, setBusy] = useState<"link" | "photo" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  // Counts requests, so the answer for a link or photo that has since been
  // replaced, or for a dialog that has since been closed, is dropped.
  const latest = useRef(0);

  useEffect(() => {
    latest.current++;
    setError(null);
    setNotice(null);
    setBusy(null);
    if (!editing) return;
    if (item) {
      setF({ title: item.title, url: item.url, shop: item.shop, price: priceText(item.price), status: item.status, priority: item.priority, category: item.category, notes: item.notes, photo: item.photo });
      setPhotoUrl(item.photoUrl);
      setReadUrl(item.url);
      return;
    }
    setF(empty);
    setPhotoUrl("");
    setReadUrl("");
    if (editing.url) readLink(editing.url);
    if (editing.file) attach(editing.file);
  }, [editing]);

  async function readLink(url: string) {
    const mine = ++latest.current;
    setError(null);
    setNotice(null);
    setBusy("link");
    setF((x) => ({ ...x, url }));
    setReadUrl(url);
    try {
      const r = await post<LinkRead>("/admin/investments/link", { url });
      if (mine !== latest.current) return;
      setF((x) => ({
        ...x,
        title: r.title || x.title,
        shop: r.shop || x.shop,
        price: r.price !== null ? priceText(r.price) : x.price,
        photo: r.photoRef || x.photo,
      }));
      if (r.photoUrl) setPhotoUrl(r.photoUrl);
      setNotice(r.notice || null);
    } catch (err) {
      if (mine === latest.current) setError((err as Error).message);
    } finally {
      if (mine === latest.current) setBusy(null);
    }
  }

  async function attach(picked: File) {
    if (!picked.type.startsWith("image/")) return setError("Kies een foto.");
    const mine = ++latest.current;
    setError(null);
    setBusy("photo");
    try {
      const file = (await webCopies(picked))?.small || picked;
      const form = new FormData();
      form.append("file", file);
      const r = await api<PhotoStored>("/admin/investments/photo", { method: "POST", form });
      if (mine !== latest.current) return;
      setF((x) => ({ ...x, photo: r.photoRef }));
      setPhotoUrl(r.photoUrl);
    } catch (err) {
      if (mine === latest.current) setError((err as Error).message);
    } finally {
      if (mine === latest.current) setBusy(null);
    }
  }

  const price = parsePrice(f.price);
  const save = useAction({
    fn: () => {
      const body = { ...f, title: f.title.trim(), url: f.url.trim(), shop: f.shop.trim(), notes: f.notes.trim(), price: price ?? null };
      return item ? put(`/admin/investments/${item.id}`, body) : post("/admin/investments", body);
    },
    invalidate: () => [key],
    success: item ? "Opgeslagen" : "Toegevoegd",
    onSuccess: onClose,
  });
  const remove = useAction({ fn: () => del(`/admin/investments/${item!.id}`), invalidate: () => [key], success: "Verwijderd", onSuccess: onClose });

  function submit() {
    if (!f.title.trim()) return setError("Geef het product een naam.");
    if (price === undefined) return setError("Vul de prijs in als een bedrag, bijvoorbeeld 1299,95.");
    if (f.url.trim() && !looksLikeUrl(f.url)) return setError("De link moet beginnen met https://");
    setError(null);
    save.mutate();
  }

  function dropped(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file && !busy) attach(file);
  }

  const linkChanged = looksLikeUrl(f.url) && f.url.trim() !== readUrl;

  return (
    <Modal open={!!editing} onOpenChange={(o) => !o && onClose()} title={item ? "Investering" : "Nieuwe investering"}
      footer={<>
        {item && (
          <Button variant="ghost" icon={<Trash2 />} loading={remove.isPending} style={{ marginRight: "auto" }}
            onClick={async () => { if (await confirm({ title: `${item.title} verwijderen?`, danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>Verwijderen</Button>
        )}
        <Button onClick={onClose}>Annuleren</Button>
        <Button variant="primary" disabled={!!busy} loading={save.isPending} onClick={submit}>{item ? "Opslaan" : "Toevoegen"}</Button>
      </>}>
      <div
        className={cx("s-dropzone s-receipt", over && "over", photoUrl && !busy && "has")}
        onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={dropped}
      >
        {busy ? (
          <div className="s-receipt-row" role="status">
            <span className="s-ico acc"><Loader2 className="spin" /></span>
            <b>{busy === "link" ? "Productpagina lezen…" : "Foto opslaan…"}</b>
          </div>
        ) : photoUrl ? (
          <div className="s-receipt-row">
            <Photo src={photoUrl} alt={f.title} className="s-product" style={{ width: 72, flex: "none" }} />
            <span className="s-small s-muted" style={{ flex: 1 }}>Foto van het product</span>
            <Button size="sm" icon={<Upload />} onClick={() => fileInput.current?.click()}>Andere foto</Button>
          </div>
        ) : (
          <button type="button" className="s-receipt-pick" onClick={() => fileInput.current?.click()}>
            <span className="s-ico acc"><ImagePlus /></span>
            <b>Foto uploaden</b>
            <span className="s-small s-muted">Of plak hieronder een link, dan komt de foto van de winkel.</span>
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) attach(x); }} />
      {notice && <p className="s-small" style={{ color: "var(--warn)" }}>{notice}</p>}
      <div className="s-form-grid">
        <div className="full s-row nowrap" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField label="Link naar het product" type="url" inputMode="url" value={f.url} disabled={busy === "link"} placeholder="https://"
              onChange={(e) => setF({ ...f, url: e.target.value })}
              onPaste={(e) => { const t = e.clipboardData.getData("text"); if (looksLikeUrl(t)) { e.preventDefault(); readLink(t.trim()); } }} />
          </div>
          {linkChanged && <Button disabled={!!busy} onClick={() => readLink(f.url.trim())}>Ophalen</Button>}
        </div>
        <TextField className="full" label="Naam" value={f.title} disabled={busy === "link"} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Bijv. Sony FE 24-70mm f/2.8 GM II" />
        <TextField label="Prijs incl. btw (€)" inputMode="decimal" value={f.price} disabled={busy === "link"} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <TextField label="Winkel" value={f.shop} disabled={busy === "link"} onChange={(e) => setF({ ...f, shop: e.target.value })} />
        <SelectField label="Prioriteit" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>
          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </SelectField>
        <SelectField label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </SelectField>
        <SelectField className="full" label="Categorie" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">Kies…</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <TextAreaField className="full" label="Waarom" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Waar het voor is, wat het oplevert, alternatieven" />
      </div>
      {item && <span className="s-small s-faint">Toegevoegd door {item.addedBy.name} op {fmtDate(item.createdAt)}</span>}
      {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
    </Modal>
  );
}
