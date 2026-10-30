import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, CircleHelp, ExternalLink, ImagePlus, Link2, Loader2, Minus, PiggyBank, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { webCopies } from "../../lib/webPhoto";
import { api, del, get, post, put } from "../api";
import { euro, fmtDate } from "../format";
import { useAction } from "../queries";
import {
  Button, Card, cx, Empty, ErrorState, Field, Modal, PageHead, Photo, Pill, Segmented, SelectField, SkeletonList, TextAreaField, TextField, undoToast, useConfirm,
} from "../ui";
import { useSearchPatch, useUrlState } from "../urlState";

const CATEGORIES = [
  "Camera", "Lenzen", "Licht", "Audio", "Drone", "Statieven & grips", "Accu's & laders", "Geheugen & opslag",
  "Computer", "Software", "Studio", "Tassen", "Vervoer", "Overig",
];
const NO_CATEGORY = "Zonder categorie";

// A first guess from the product name; the category stays editable.
const KEYWORDS: [string, string[]][] = [
  ["Drone", ["drone", "dji mini", "dji air", "dji mavic", "avata"]],
  ["Lenzen", ["lens", "objectief", "mm f/", "mm f1", "mm f2", "mm f4", "teleconverter", "adapter ring"]],
  ["Licht", ["flitser", "flash", "godox", "profoto", "led", "softbox", "lamp", "lichtpaneel", "aputure", "nanlite"]],
  ["Audio", ["microfoon", "microphone", "rode", "zoom h", "lavalier", "dji mic"]],
  ["Statieven & grips", ["statief", "tripod", "gimbal", "ronin", "monopod", "balhoofd", "grip", "slider"]],
  ["Accu's & laders", ["accu", "batterij", "battery", "lader", "charger", "np-f", "lp-e", "v-mount", "powerbank"]],
  ["Geheugen & opslag", ["sd-kaart", "sd kaart", "sdxc", "cfexpress", "ssd", "harde schijf", "nas", "kaartlezer"]],
  ["Computer", ["macbook", "laptop", "monitor", "imac", "mac mini", "ipad", "beeldscherm"]],
  ["Software", ["adobe", "lightroom", "capture one", "licentie", "abonnement", "davinci"]],
  ["Tassen", ["tas", "rugzak", "backpack", "koffer", "case", "peak design"]],
  ["Camera", ["camera", "body", "alpha", "eos r", "lumix", "fujifilm x-", "nikon z", "gopro", "pocket"]],
];
const guessCategory = (title: string) => KEYWORDS.find(([, ks]) => ks.some((k) => title.toLowerCase().includes(k)))?.[0] || "";

type Status = "wish" | "planned" | "bought";
type Priority = "high" | "medium" | "low";
type Compat = "" | "fits" | "adapter" | "no";
const STATUS_LABEL: Record<Status, string> = { wish: "Wens", planned: "Gepland", bought: "In bezit" };
const STATUS_TONE: Record<Status, "info" | "ok" | undefined> = { wish: undefined, planned: "info", bought: "ok" };
const PRIORITY_LABEL: Record<Priority, string> = { high: "Hoog", medium: "Middel", low: "Laag" };
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const COMPAT_LABEL: Record<Compat, string> = { "": "Nog niet bekeken", fits: "Past", adapter: "Met adapter", no: "Past niet" };

type Investment = {
  id: string; title: string; url: string; shop: string; price: number | null; quantity: number; status: Status; priority: Priority;
  category: string; system: string; compatibility: Compat; worksWith: string[]; compatNote: string;
  notes: string; photo: string; photoUrl: string; addedBy: { id: string; name: string }; boughtAt: string | null; createdAt: string;
};
type Listing = { investments: Investment[] };
type LinkRead = { url: string; title: string; price: number | null; shop: string; photoRef: string; photoUrl: string; closed: boolean; notice?: string };
type PhotoStored = { photoRef: string; photoUrl: string };
/** The dialog: an existing item, or a new one starting from a link or a photo. */
type Editing = { item?: Investment; url?: string; file?: File; status?: Status };
type View = "wishes" | "gear" | "all";

const key = ["investments"];
const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
const total = (items: Investment[]) => items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
const sameSystem = (a: string, b: string) => !!a.trim() && a.trim().toLowerCase() === b.trim().toLowerCase();

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

// Lines on a product page that carry a price that is not the one to pay.
const NOT_THE_PRICE = /(advies|adviesprijs|\bvan\b|\bwas\b|bespaar|korting|per maand|p\/m|\/\s*mnd|maand|verzend|bezorg|retour|cashback|inruil|vanaf)/i;

/** The price on a screenshot of a product page: the first amount shown as money. */
function priceFromText(text: string): number | null {
  for (const line of text.split("\n")) {
    if (NOT_THE_PRICE.test(line)) continue;
    const m = line.match(/€\s?(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d{2}|[-–]))?/) || line.match(/\b(\d{1,3}(?:\.\d{3})+|\d+),([-–]|\d{2})(?!\d)/);
    if (!m) continue;
    const n = parsePrice(`${m[1].replace(/\s/g, ".")},${m[2] && /\d/.test(m[2]) ? m[2] : "00"}`);
    if (n && n >= 1) return n;
  }
  return null;
}

/** Reads the picture here in the browser (as for receipts); nothing is sent anywhere. */
async function readPrice(file: File): Promise<number | null> {
  try {
    const { readReceiptText } = await import("../receipt/read");
    return priceFromText((await readReceiptText(file, () => {})).text);
  } catch (err) {
    console.error("reading the screenshot failed:", err);
    return null;
  }
}

export function InvestmentsPage() {
  const [view] = useUrlState<View>("toon", "wishes", ["wishes", "gear", "all"]);
  const [category, setCategory] = useUrlState<string>("categorie", "");
  const { patch } = useSearchPatch();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [link, setLink] = useState("");
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const data = useQuery({ queryKey: key, queryFn: () => get<Listing>("/admin/investments") });
  const change = useAction({
    fn: ({ id, patch }: { id: string; patch: Partial<Pick<Investment, "status" | "quantity">> }) => put(`/admin/investments/${id}`, patch),
    invalidate: () => [key],
  });
  function markBought(i: Investment) {
    change.mutate(
      { id: i.id, patch: { status: "bought" } },
      { onSuccess: () => undoToast(`${i.title} staat nu bij je gear`, () => change.mutate({ id: i.id, patch: { status: i.status } })) },
    );
  }

  const all = data.data?.investments || [];
  const gear = all.filter((i) => i.status === "bought");
  const inView = all.filter((i) => view === "all" || (view === "gear" ? i.status === "bought" : i.status !== "bought"));
  const shown = inView.filter((i) => !category || (i.category || NO_CATEGORY) === category);
  // Products of one category sit together, in the order of the list above.
  const order = (c: string) => (c === NO_CATEGORY ? 999 : CATEGORIES.includes(c) ? CATEGORIES.indexOf(c) : 998);
  const categoryOf = (i: Investment) => i.category || NO_CATEGORY;
  const list = [...shown].sort((a, b) => order(categoryOf(a)) - order(categoryOf(b)) || categoryOf(a).localeCompare(categoryOf(b))
    || (a.status === "bought" && b.status === "bought"
      ? a.title.localeCompare(b.title)
      : PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt.localeCompare(a.createdAt)));
  const counts = new Map<string, number>();
  for (const i of inView) counts.set(categoryOf(i), (counts.get(categoryOf(i)) || 0) + i.quantity);
  const categoriesHere = [...counts.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const pieces = gear.reduce((s, i) => s + i.quantity, 0);
  const newStatus: Status = view === "gear" ? "bought" : "wish";

  // A link or a picture pasted anywhere on the page, outside a text field, starts a new item.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (editing || t?.closest("input, textarea, [contenteditable=true]")) return;
      const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith("image/"));
      const text = e.clipboardData?.getData("text") || "";
      if (file) setEditing({ file, status: newStatus });
      else if (looksLikeUrl(text)) setEditing({ url: text.trim(), status: newStatus });
      else return;
      e.preventDefault();
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [editing, newStatus]);

  function addLink(e: FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setEditing({ url: link.trim(), status: newStatus });
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
          if (file) setEditing({ file, status: newStatus });
        }}
      >
        <PageHead
          title="Investeringen"
          sub="Je huidige gear en wat de studio wil aanschaffen. Plak een link naar een product of upload een foto."
          actions={<>{photoButton}<Button variant="primary" icon={<Plus />} onClick={() => setEditing({ status: newStatus })}>{view === "gear" ? "Gear toevoegen" : "Toevoegen"}</Button></>}
        />
        <input ref={picker} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) setEditing({ file, status: newStatus }); }} />
        <form className="s-row nowrap" onSubmit={addLink}>
          <label className="s-searchbox" style={{ flex: 1, maxWidth: 560 }}>
            <Link2 />
            <input aria-label="Link naar een product" type="url" inputMode="url" placeholder="Plak een link naar een product" value={link} onChange={(e) => setLink(e.target.value)} />
          </label>
          <Button type="submit" disabled={!link.trim()}>Ophalen</Button>
        </form>
        {data.data && (
          <Card bodyClass="none">
            <div className="s-stats three">
              <div><b className="s-mono">{euro(total(all.filter((i) => i.status === "wish")))}</b><span>Wensen</span></div>
              <div><b className="s-mono">{euro(total(all.filter((i) => i.status === "planned")))}</b><span>Gepland</span></div>
              <div><b className="s-mono">{euro(total(gear))}</b><span>Gear, {pieces} {pieces === 1 ? "stuk" : "stuks"}</span></div>
            </div>
          </Card>
        )}
        <div className="s-row">
          <Segmented<View> label="Toon" value={view} onChange={(v) => patch({ toon: v === "wishes" ? null : v, categorie: null }, { replace: true, preventScrollReset: true })} options={[
            { value: "wishes", label: "Wensen" }, { value: "gear", label: "Huidige gear" }, { value: "all", label: "Alles" },
          ]} />
        </div>
        {categoriesHere.length > 1 && (
          <div className="s-chips" role="group" aria-label="Categorie">
            <button type="button" className="s-chip" aria-pressed={!category} onClick={() => setCategory("")}>Alle categorieën</button>
            {categoriesHere.map((c) => (
              <button key={c} type="button" className="s-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c} <span className="s-faint">{counts.get(c)}</span></button>
            ))}
          </div>
        )}
        {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
        {data.isLoading ? <Card bodyClass="none"><SkeletonList rows={3} /></Card> : list.length === 0 ? (
          <Card>
            <Empty
              icon={<PiggyBank />}
              title={view === "gear" ? "Nog geen gear" : all.length ? "Geen wensen" : "Nog geen investeringen"}
              action={photoButton}
            >
              {view === "gear"
                ? "Zet hier wat de studio al heeft, met aantallen. Dan zie je bij elke wens of hij erbij past."
                : "Plak een link naar een product hierboven, of upload een foto. Naam, prijs en foto vullen zich zoveel mogelijk vanzelf in."}
            </Empty>
          </Card>
        ) : (
          <div className="s-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {list.map((i) => (
              <ItemCard
                key={i.id}
                i={i}
                gear={gear}
                onOpen={() => setEditing({ item: i })}
                onBought={() => markBought(i)}
                onQuantity={(quantity) => change.mutate({ id: i.id, patch: { quantity } })}
              />
            ))}
          </div>
        )}
        {dragging && <div className="s-dropveil" aria-hidden="true"><span><Upload size={18} /> Laat los om de foto toe te voegen</span></div>}
      </div>
      <InvestmentDialog editing={editing} gear={gear} onClose={() => setEditing(null)} />
    </>
  );
}

function ItemCard({ i, gear, onOpen, onBought, onQuantity }: {
  i: Investment; gear: Investment[]; onOpen: () => void; onBought: () => void; onQuantity: (n: number) => void;
}) {
  const owned = i.status === "bought";
  return (
    <article className="s-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Photo src={i.photoUrl} alt={i.title} className="s-product" onClick={onOpen} openLabel={`${i.title} bewerken`}>
        {i.category && <span className="s-product-cat">{i.category}</span>}
      </Photo>
      <div className="s-card-body s-stack sm" style={{ flex: 1 }}>
        <div className="s-row between nowrap" style={{ alignItems: "baseline" }}>
          <b className="s-clamp2">{i.title}</b>
          <b className="s-mono" style={{ flex: "none" }}>{i.price === null ? <span className="s-faint">–</span> : euro(i.price)}</b>
        </div>
        <span className="s-small s-muted">
          {[i.system, i.shop, owned ? (i.boughtAt ? `sinds ${fmtDate(i.boughtAt)}` : "") : `door ${i.addedBy.name}`].filter(Boolean).join(" · ")}
        </span>
        {!owned && <CompatLine i={i} gear={gear} />}
        <div className="s-row nowrap" style={{ marginTop: "auto", paddingTop: 6, gap: 6 }}>
          <Pill tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Pill>
          {!owned && <Pill tone={i.priority === "high" ? "acc" : undefined} plain={i.priority === "low"}>{PRIORITY_LABEL[i.priority]}</Pill>}
          {!owned && i.quantity > 1 && <Pill plain>{i.quantity}×</Pill>}
          <span className="s-spacer" />
          {owned && (
            <div className="s-row nowrap" style={{ gap: 2 }} role="group" aria-label="Aantal">
              <Button size="sm" variant="ghost" iconOnly aria-label="Eén minder" icon={<Minus />} disabled={i.quantity <= 1} onClick={() => onQuantity(i.quantity - 1)} />
              <b className="s-mono" style={{ minWidth: 22, textAlign: "center" }} aria-live="polite">{i.quantity}×</b>
              <Button size="sm" variant="ghost" iconOnly aria-label="Eén meer" icon={<Plus />} onClick={() => onQuantity(i.quantity + 1)} />
            </div>
          )}
          {i.url && <a className="s-btn ghost sm icon" href={i.url} target="_blank" rel="noreferrer" aria-label="Naar de winkel" title="Naar de winkel"><ExternalLink size={15} /></a>}
          {!owned && <Button size="sm" variant="ghost" iconOnly aria-label="Gekocht" title="Gekocht, naar je gear" icon={<Check />} onClick={onBought} />}
        </div>
      </div>
    </article>
  );
}

/** Whether a wish fits what the studio has, in one line. */
function CompatLine({ i, gear }: { i: Investment; gear: Investment[] }) {
  const names = i.worksWith.map((id) => gear.find((g) => g.id === id)?.title).filter(Boolean).join(", ");
  const line = (icon: ReactNode, color: string, text: string) => (
    <span className="s-small s-compat" style={{ color }}>{icon}<span>{text}</span></span>
  );
  if (i.compatibility === "fits") return line(<Check />, "var(--ok)", names ? `Past bij ${names}` : "Past bij je gear");
  if (i.compatibility === "adapter") return line(<AlertTriangle />, "var(--warn)", `Met adapter${names ? ` op ${names}` : ""}${i.compatNote ? `: ${i.compatNote}` : ""}`);
  if (i.compatibility === "no") return line(<X />, "var(--bad)", `Past niet${i.compatNote ? `: ${i.compatNote}` : ""}`);
  return line(<CircleHelp />, "var(--faint)", "Compatibiliteit nog niet aangegeven");
}

function InvestmentDialog({ editing, gear, onClose }: { editing: Editing | null; gear: Investment[]; onClose: () => void }) {
  const confirm = useConfirm();
  const item = editing?.item;
  const fileInput = useRef<HTMLInputElement>(null);
  const empty = {
    title: "", url: "", shop: "", price: "", quantity: "1", status: "wish" as Status, priority: "medium" as Priority, category: "", system: "",
    compatibility: "" as Compat, worksWith: [] as string[], compatNote: "", notes: "", photo: "",
  };
  const [f, setF] = useState(empty);
  // The price as typed right now, for the screenshot reader that finishes later.
  const priceRef = useRef("");
  priceRef.current = f.price;
  const [photoUrl, setPhotoUrl] = useState("");
  // The link the fields were last filled from; "Ophalen" shows once it differs.
  const [readUrl, setReadUrl] = useState("");
  const [busy, setBusy] = useState<"link" | "photo" | null>(null);
  const [scanning, setScanning] = useState(false);
  // The shop would not let its page be read: the photo box asks for a screenshot.
  const [closed, setClosed] = useState(false);
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
    setScanning(false);
    setClosed(false);
    if (!editing) return;
    if (item) {
      setF({
        title: item.title, url: item.url, shop: item.shop, price: priceText(item.price), quantity: String(item.quantity), status: item.status,
        priority: item.priority, category: item.category, system: item.system, compatibility: item.compatibility, worksWith: item.worksWith,
        compatNote: item.compatNote, notes: item.notes, photo: item.photo,
      });
      setPhotoUrl(item.photoUrl);
      setReadUrl(item.url);
      return;
    }
    setF({ ...empty, status: editing.status || "wish" });
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
        category: x.category || guessCategory(r.title),
        photo: r.photoRef || x.photo,
      }));
      if (r.photoUrl) setPhotoUrl(r.photoUrl);
      setNotice(r.notice || null);
      setClosed(r.closed);
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
      scanForPrice(file, mine);
    } catch (err) {
      if (mine === latest.current) setError((err as Error).message);
    } finally {
      if (mine === latest.current) setBusy(null);
    }
  }

  // A picture pasted while the dialog is open is the product photo or the screenshot.
  useEffect(() => {
    if (!editing) return;
    function onPaste(e: ClipboardEvent) {
      const file = Array.from(e.clipboardData?.files || []).find((x) => x.type.startsWith("image/"));
      if (!file || busy) return;
      e.preventDefault();
      attach(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [editing, busy]);

  // A screenshot of a shop that keeps its page closed still shows the price.
  async function scanForPrice(file: File, mine: number) {
    if (priceRef.current.trim()) return;
    setScanning(true);
    const found = await readPrice(file);
    if (mine !== latest.current) return;
    setScanning(false);
    if (found === null || priceRef.current.trim()) return;
    setF((x) => ({ ...x, price: priceText(found) }));
    setNotice("Prijs van de foto gelezen. Kijk hem even na.");
  }

  const owned = f.status === "bought";
  const price = parsePrice(f.price);
  const quantity = Number(f.quantity);
  const guess = guessCategory(f.title);
  // What the studio has, other than this item; same system first.
  const others = gear.filter((g) => g.id !== item?.id).sort((a, b) => Number(sameSystem(b.system, f.system)) - Number(sameSystem(a.system, f.system)));
  const matches = others.filter((g) => sameSystem(g.system, f.system));
  const systems = [...new Set(gear.map((g) => g.system.trim()).filter(Boolean))];

  const save = useAction({
    fn: () => {
      const body = {
        ...f, title: f.title.trim(), url: f.url.trim(), shop: f.shop.trim(), system: f.system.trim(), notes: f.notes.trim(), compatNote: f.compatNote.trim(),
        category: f.category || guess, price: price ?? null, quantity,
        worksWith: f.worksWith.filter((id) => others.some((g) => g.id === id)),
      };
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
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return setError("Vul een aantal in van 1 of meer.");
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

  const toggle = (id: string) => setF((x) => ({ ...x, worksWith: x.worksWith.includes(id) ? x.worksWith.filter((w) => w !== id) : [...x.worksWith, id] }));
  const linkChanged = looksLikeUrl(f.url) && f.url.trim() !== readUrl;

  return (
    <Modal open={!!editing} onOpenChange={(o) => !o && onClose()} title={item ? item.title : owned ? "Gear toevoegen" : "Nieuwe investering"}
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
            <b>{closed ? "Screenshot van de productpagina uploaden" : "Foto uploaden"}</b>
            <span className="s-small s-muted">
              {closed ? "De prijs wordt eruit gelezen. Plakken (Ctrl V) kan ook." : "Of plak hieronder een link, dan komt de foto van de winkel."}
            </span>
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) attach(x); }} />
      {scanning && <p className="s-small s-muted s-scan" role="status"><Loader2 size={13} className="spin" aria-hidden="true" /> Prijs zoeken op de foto…</p>}
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
        <SelectField label="Categorie" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">{guess ? `Automatisch: ${guess}` : "Kies…"}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <TextField label="Systeem of aansluiting" list="investment-systems" value={f.system} onChange={(e) => setF({ ...f, system: e.target.value })} placeholder="Bijv. Sony E, Godox 2.4G" />
        <datalist id="investment-systems">{systems.map((s) => <option key={s} value={s} />)}</datalist>
        <TextField label={owned ? "Prijs per stuk (€)" : "Prijs per stuk incl. btw (€)"} inputMode="decimal" value={f.price} disabled={busy === "link"} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <TextField label="Aantal" type="number" inputMode="numeric" min={1} max={999} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        <SelectField label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </SelectField>
        {owned ? (
          <TextField label="Winkel" value={f.shop} disabled={busy === "link"} onChange={(e) => setF({ ...f, shop: e.target.value })} />
        ) : (
          <SelectField label="Prioriteit" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </SelectField>
        )}
        {!owned && (
          <div className="full s-compat-box s-stack sm">
            <b className="s-small">Past het bij je huidige gear?</b>
            <div className="s-chips" role="group" aria-label="Compatibiliteit">
              {(Object.keys(COMPAT_LABEL) as Compat[]).map((c) => (
                <button key={c} type="button" className="s-chip" aria-pressed={f.compatibility === c} onClick={() => setF({ ...f, compatibility: c })}>{COMPAT_LABEL[c]}</button>
              ))}
            </div>
            {f.compatibility !== "" && f.compatibility !== "no" && (
              others.length ? (
                <Field label="Werkt met">
                  <div className="s-chips" role="group" aria-label="Werkt met">
                    {others.map((g) => (
                      <button key={g.id} type="button" className="s-chip" aria-pressed={f.worksWith.includes(g.id)} onClick={() => toggle(g.id)}>
                        {g.title}{sameSystem(g.system, f.system) ? " ★" : ""}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : (
                <span className="s-small s-muted">Zet eerst je huidige gear erin, dan kies je hier waar het bij past.</span>
              )
            )}
            {f.compatibility === "" && matches.length > 0 && (
              <span className="s-small s-muted">Zelfde systeem in je gear: {matches.map((g) => g.title).join(", ")}.</span>
            )}
            {matches.length > 0 && f.compatibility !== "" && f.compatibility !== "no" && <span className="s-small s-faint">★ zelfde systeem</span>}
            {f.compatibility !== "" && f.compatibility !== "fits" && (
              <TextField label={f.compatibility === "adapter" ? "Welke adapter" : "Waarom niet"} value={f.compatNote} onChange={(e) => setF({ ...f, compatNote: e.target.value })}
                placeholder={f.compatibility === "adapter" ? "Bijv. Sigma MC-11, EF naar E" : "Bijv. andere vatting, past niet op de gimbal"} />
            )}
          </div>
        )}
        {!owned && <TextField className="full" label="Winkel" value={f.shop} disabled={busy === "link"} onChange={(e) => setF({ ...f, shop: e.target.value })} />}
        <TextAreaField className="full" label={owned ? "Notities" : "Waarom"} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
          placeholder={owned ? "Serienummer, staat, waar het ligt" : "Waar het voor is, wat het oplevert, alternatieven"} />
      </div>
      {item && <span className="s-small s-faint">Toegevoegd door {item.addedBy.name} op {fmtDate(item.createdAt)}</span>}
      {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
    </Modal>
  );
}
