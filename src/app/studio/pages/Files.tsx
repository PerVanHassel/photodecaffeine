import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, File as FileIcon, FileArchive, FileText, Film, FolderUp, Image as ImageIcon, Loader2, Music, Plus, Send, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { del, errorMessage, get, post, putFile } from "../api";
import { ago, fileSize } from "../format";
import { useAction, useMe } from "../queries";
import { Button, Card, cx, Empty, ErrorState, PageHead, Pill, Modal, Segmented, SelectField, SkeletonList, TextAreaField, useConfirm } from "../ui";
import { useUnsavedChanges } from "../unsaved";
import { useUrlState } from "../urlState";

// The team's file pool: drop files here, say who they are for, and they get a
// mail with a link back to this page. Only the team ever sees this.

type Person = { id: string; name: string };
type TeamFile = {
  id: string; name: string; size: number; type: string; note: string; createdAt: string;
  from: Person; to: Person | null; viewUrl: string; canDelete: boolean;
};
type Listing = { files: TeamFile[]; people: Person[]; free: number; maxFile: number };

const FILTERS = ["alles", "voor-mij", "van-mij"] as const;
type Filter = (typeof FILTERS)[number];

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

function iconFor(f: { type: string; name: string }) {
  if (f.type.startsWith("image/")) return <ImageIcon />;
  if (f.type.startsWith("video/")) return <Film />;
  if (f.type.startsWith("audio/")) return <Music />;
  if (f.type === "application/pdf" || f.type.startsWith("text/")) return <FileText />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(f.name)) return <FileArchive />;
  return <FileIcon />;
}

/** The files that can go, with a word about the ones that cannot. A dropped folder arrives as an empty file. */
function usable(list: File[], maxFile: number): File[] {
  return list.filter((f) => {
    if (f.size === 0) toast.error(`${f.name} is leeg of een map. Pak een map eerst in als zip.`);
    else if (f.size > maxFile) toast.error(`${f.name} is ${fileSize(f.size)}. Het maximum is ${fileSize(maxFile)} per bestand.`);
    else return true;
    return false;
  });
}

export function FilesPage() {
  const me = useMe();
  const confirm = useConfirm();
  const [filter, setFilter] = useUrlState<Filter>("filter", "alles", FILTERS);
  const [picked, setPicked] = useState<File[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const data = useQuery({ queryKey: ["team-files"], queryFn: ({ signal }) => get<Listing>("/admin/files", signal) });
  const remove = useAction({ fn: (id: string) => del(`/admin/files/${id}`), invalidate: () => [["team-files"]], success: "Bestand verwijderd" });
  // The link makes the browser save the file, so this page stays where it is.
  const download = useAction({
    fn: (id: string) => post<{ url: string }>(`/admin/files/${id}/download`),
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const meId = me.data?.id || "";
  const maxFile = data.data?.maxFile ?? 50 * 1024 * 1024;
  const free = data.data?.free ?? 0;
  const list = (data.data?.files || []).filter((f) => (filter === "voor-mij" ? f.to?.id === meId : filter === "van-mij" ? f.from.id === meId : true));

  function pick(files: File[]) {
    const good = usable(files, maxFile);
    if (good.length) setPicked(good);
  }

  const send = <Button variant="primary" icon={<Upload />} onClick={() => picker.current?.click()}>Bestanden sturen</Button>;

  return (
    <>
      {/* Files dropped anywhere on the page start a send. */}
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
          pick(Array.from(e.dataTransfer.files));
        }}
      >
        <PageHead title="Bestanden" sub="Stuur elkaar bestanden. Sleep ze hierheen of kies ze." actions={send} />
        <input ref={picker} type="file" multiple hidden onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; pick(files); }} />
        <div className="s-row between">
          <Segmented
            label="Welke bestanden"
            value={filter}
            onChange={setFilter}
            options={[{ value: "alles", label: "Alles" }, { value: "voor-mij", label: "Voor mij" }, { value: "van-mij", label: "Van mij" }]}
          />
          {data.data && (
            free < maxFile
              ? <Pill tone="warn">Nog {fileSize(free)} ruimte. Verwijder wat je niet meer nodig hebt.</Pill>
              : <span className="s-small s-muted">Nog {fileSize(free)} ruimte · maximaal {fileSize(maxFile)} per bestand</span>
          )}
        </div>
        {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
        <Card bodyClass="none">
          {data.isLoading ? <SkeletonList rows={4} /> : list.length === 0 ? (
            <Empty
              icon={<FolderUp />}
              title={filter === "voor-mij" ? "Er staat niets voor jou klaar" : filter === "van-mij" ? "Je hebt nog niets gestuurd" : "De pool is leeg"}
              action={filter === "voor-mij" ? undefined : send}
            >
              {filter === "voor-mij" ? "Zodra iemand je iets stuurt, krijg je een mail en staat het hier." : "Sleep een bestand hierheen om het te sturen."}
            </Empty>
          ) : (
            <ul className="s-list">
              {list.map((f) => (
                <li key={f.id} className="s-item">
                  <span className={cx("s-ico", f.to?.id === meId && "acc")}>{iconFor(f)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="t s-truncate" title={f.name}>
                      {f.viewUrl ? <a href={f.viewUrl} target="_blank" rel="noreferrer">{f.name}</a> : f.name}
                    </div>
                    <div className="s">
                      {f.from.id === meId ? "Van jou" : `Van ${f.from.name}`} voor {f.to ? (f.to.id === meId ? "jou" : f.to.name) : "iedereen"} · {fileSize(f.size)} · {ago(f.createdAt)}
                    </div>
                    {f.note && <div className="s" style={{ marginTop: 4, overflowWrap: "anywhere" }}>{f.note}</div>}
                  </div>
                  <div className="s-row nowrap">
                    <Button
                      size="sm"
                      iconOnly
                      aria-label={`${f.name} downloaden`}
                      title="Downloaden"
                      icon={<Download />}
                      loading={download.isPending && download.variables === f.id}
                      onClick={() => download.mutate(f.id)}
                    />
                    {f.canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        iconOnly
                        aria-label={`${f.name} verwijderen`}
                        title="Verwijderen"
                        icon={<Trash2 />}
                        onClick={async () => {
                          if (await confirm({ title: "Bestand verwijderen?", body: `${f.name} is daarna voor iedereen weg.`, danger: true, confirm: "Verwijderen" })) remove.mutate(f.id);
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {dragging && <div className="s-dropveil" aria-hidden="true"><span><Upload size={18} /> Laat los om te sturen</span></div>}
      </div>
      {/* Outside the drop area, so a file dropped on the dialog is handled there only. */}
      <SendDialog files={picked} people={(data.data?.people || []).filter((p) => p.id !== meId)} free={free} maxFile={maxFile} onClose={() => setPicked(null)} />
    </>
  );
}

type Item = { key: string; file: File; state: "wait" | "busy" | "done" | "failed"; share: number; error?: string };

const itemsOf = (files: File[]): Item[] => files.map((file) => ({ key: crypto.randomUUID(), file, state: "wait", share: 0 }));

function SendDialog({ files, people, free, maxFile, onClose }: {
  files: File[] | null; people: Person[]; free: number; maxFile: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const stop = useRef<AbortController | null>(null);
  const more = useRef<HTMLInputElement>(null);
  useUnsavedChanges(busy);

  useEffect(() => {
    if (!files) return;
    setItems(itemsOf(files));
    setTo("");
    setNote("");
  }, [files]);

  const change = (key: string, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const add = (list: File[]) => {
    const good = usable(list, maxFile);
    if (good.length) setItems((now) => [...now, ...itemsOf(good)]);
  };

  const open = items.filter((it) => it.state !== "done");
  const total = open.reduce((sum, it) => sum + it.file.size, 0);
  const failed = open.some((it) => it.state === "failed");
  const person = people.find((p) => p.id === to);
  const someDone = items.some((it) => it.state === "done");

  async function send() {
    const ctrl = new AbortController();
    stop.current = ctrl;
    setBusy(true);
    const sent: string[] = [];
    let problems = 0;
    for (const it of open) {
      if (ctrl.signal.aborted) break;
      change(it.key, { state: "busy", share: 0, error: undefined });
      try {
        const { id, url } = await post<{ id: string; url: string }>("/admin/files/start", { name: it.file.name, size: it.file.size });
        await putFile(url, it.file, (share) => change(it.key, { share }), ctrl.signal);
        await post("/admin/files", { id, name: it.file.name, note: note.trim(), toId: to || null });
        sent.push(id);
        change(it.key, { state: "done", share: 1 });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          change(it.key, { state: "wait", share: 0 });
          break;
        }
        problems++;
        change(it.key, { state: "failed", error: errorMessage(err) });
      }
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["team-files"] });

    const count = sent.length === 1 ? "Bestand" : `${sent.length} bestanden`;
    let mailed = true;
    if (sent.length && person) mailed = await post<{ mailed: boolean }>("/admin/files/announce", { ids: sent }).then((r) => r.mailed, () => false);
    if (sent.length) {
      if (!mailed) toast.warning(`${count} staat in de pool, maar ${person?.name} kon niet worden gemaild. Laat het even zelf weten.`);
      else toast.success(person ? `${count} verstuurd naar ${person.name}` : `${count} in de pool gezet`);
    }
    if (!problems && !ctrl.signal.aborted && sent.length) onClose();
  }

  return (
    <Modal
      open={!!files}
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      title="Bestanden sturen"
      footer={busy
        ? <Button icon={<X />} onClick={() => stop.current?.abort()}>Stoppen</Button>
        : <>
            <Button onClick={onClose}>{someDone ? "Sluiten" : "Annuleren"}</Button>
            <Button variant="primary" icon={<Send />} disabled={!open.length} onClick={send}>{failed ? "Opnieuw proberen" : "Versturen"}</Button>
          </>}
    >
      <ul className="s-list" style={{ margin: "-4px 0 0" }}>
        {items.map((it) => (
          <li key={it.key} className="s-row nowrap" style={{ padding: "10px 0", gap: 12 }}>
            <span className={cx("s-ico", it.state === "done" && "ok", it.state === "failed" && "bad")}>
              {it.state === "busy" ? <Loader2 className="spin" /> : it.state === "done" ? <Check /> : iconFor({ type: it.file.type, name: it.file.name })}
            </span>
            <div className="s-stack sm" style={{ flex: 1, minWidth: 0 }}>
              <div className="s-row between nowrap">
                <b className="s-small s-truncate">{it.file.name}</b>
                <span className="s-small s-muted" style={{ flex: "none" }}>{fileSize(it.file.size)}</span>
              </div>
              {it.state === "busy" && (
                <div className="s-progress" role="progressbar" aria-label={`${it.file.name} uploaden`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(it.share * 100)}>
                  <i style={{ transform: `scaleX(${it.share})` }} />
                </div>
              )}
              {it.error && <span className="s-small" role="alert" style={{ color: "var(--bad)" }}>{it.error}</span>}
            </div>
            {!busy && it.state !== "done" && (
              <Button size="sm" variant="ghost" iconOnly aria-label={`${it.file.name} weghalen`} icon={<X />} onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))} />
            )}
          </li>
        ))}
      </ul>
      {!busy && <div><Button size="sm" icon={<Plus />} onClick={() => more.current?.click()}>Meer toevoegen</Button></div>}
      <input ref={more} type="file" multiple hidden onChange={(e) => { const list = Array.from(e.target.files || []); e.target.value = ""; add(list); }} />
      {total > free && <p className="s-small" role="alert" style={{ color: "var(--warn)" }}>Samen is dit {fileSize(total)} en er is nog {fileSize(free)} ruimte. Niet alles zal passen.</p>}
      <SelectField
        label="Voor wie"
        value={to}
        disabled={busy}
        onChange={(e) => setTo(e.target.value)}
        hint={person ? `${person.name} krijgt een mail.` : "Iedereen in het team kan het pakken. Er gaat geen mail uit."}
      >
        <option value="">Iedereen</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </SelectField>
      <TextAreaField label="Bericht (hoeft niet)" rows={2} maxLength={500} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. de logo's voor Martine" />
    </Modal>
  );
}
