import { useQueryClient } from "@tanstack/react-query";
import { downloadZip } from "client-zip";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Heart, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { errorMessage, get, post } from "../api";
import { useAction } from "../queries";
import type { GalleryImage, Project } from "../types";
import { Button, Empty, ErrorState, isVideo, Modal, Photo, Segmented, Skeleton, TextAreaField } from "../ui";
import { pkeys, saveFile, usePortalProject } from "./data";

export function PortalGallery() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const data = usePortalProject(id);
  const [filter, setFilter] = useState<"all" | "fav">("all");
  const [open, setOpen] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);

  const p = data.data?.project;
  const favs = new Set(p?.favoriteIds || []);
  const delivered = !!p && ["delivered", "review", "archived"].includes(p.stage);
  const shown = (p?.gallery || []).filter((g) => filter === "all" || favs.has(g.id));

  const toggle = useCallback(async (img: GalleryImage) => {
    if (!p) return;
    const on = !favs.has(img.id);
    const key = pkeys.project(id);
    const before = qc.getQueryData(key);
    qc.setQueryData(key, (d: any) => d && { ...d, project: { ...d.project, favoriteIds: on ? [...(d.project.favoriteIds || []), img.id] : (d.project.favoriteIds || []).filter((x: string) => x !== img.id) } });
    try {
      await post(`/portal/project/${id}/favorites`, { imageId: img.id, favorite: on });
    } catch (err) {
      qc.setQueryData(key, before);
      toast.error(errorMessage(err));
    }
  }, [p, favs, id, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadOne(img: GalleryImage) {
    try {
      const r = await get<{ url: string; fileName: string }>(`/portal/project/${id}/download/${img.id}`);
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function downloadAll(list: GalleryImage[]) {
    if (!p || !list.length) return;
    setZip({ done: 0, total: list.length });
    try {
      let done = 0;
      // Files are fetched one after another and streamed into the zip, so a
      // large gallery never has to sit in memory twice.
      async function* files() {
        const used = new Set<string>();
        for (const img of list) {
          const res = await fetch(img.url);
          if (!res.ok) throw new Error(`${img.fileName || "Een foto"} kon niet worden opgehaald.`);
          let name = img.fileName || `foto-${done + 1}.jpg`;
          while (used.has(name)) name = name.replace(/(\.\w+)?$/, (ext) => `-${done}${ext}`);
          used.add(name);
          yield { name, input: res };
          done += 1;
          setZip({ done, total: list.length });
        }
      }
      const blob = await downloadZip(files()).blob();
      saveFile(`${(p.gallerySettings.title || p.title).replace(/[^\w-]+/g, "-").toLowerCase()}.zip`, blob, "application/zip");
      toast.success("Download gestart");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setZip(null);
    }
  }

  if (data.isError) return <main className="p-main"><ErrorState error={data.error} /></main>;
  if (!p) return <main className="p-main"><Skeleton h={40} w={300} /><div className="p-proof">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={160} r={8} />)}</div></main>;

  return (
    <main className="p-main">
      <Link to={`/portal/project/${p.id}`} className="s-back"><ArrowLeft size={14} /> {p.title}</Link>
      <div className="p-hello">
        <p className="s-eyebrow">{p.gallerySettings.subtitle || `${p.gallery.length} foto's`}</p>
        <h1>{delivered ? p.gallerySettings.title || "Je foto's" : "Kies je favorieten"}</h1>
        <p>{delivered ? "Download ze los of allemaal tegelijk." : "Tik op het hartje bij de foto's die je het mooist vindt. Klaar? Geef je keuze door, dan gaan we ze bewerken."}</p>
      </div>
      {p.gallery.length === 0 ? <Empty title="Nog geen foto's">Zodra de foto's klaarstaan, krijg je een mail.</Empty> : (
        <>
          <div className="p-proof-bar">
            <div className="s-row" style={{ gap: 14 }}>
              <Segmented<"all" | "fav"> label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: `Alles (${p.gallery.length})` }, { value: "fav", label: `Favorieten (${favs.size})` }]} />
            </div>
            <div className="s-row">
              <Button icon={<Download />} loading={!!zip} onClick={() => downloadAll(filter === "fav" ? shown : p.gallery)}>
                {zip ? `${zip.done} van ${zip.total}…` : filter === "fav" ? "Favorieten downloaden" : "Alles downloaden"}
              </Button>
              {!delivered && <Button variant="primary" icon={<Send />} disabled={!favs.size} onClick={() => setSubmitting(true)}>Keuze doorgeven</Button>}
            </div>
          </div>
          {shown.length === 0 ? <Empty icon={<Heart />} title="Nog geen favorieten">Tik op het hartje bij een foto.</Empty> : (
            <div className="p-proof">
              {shown.map((g) => (
                <Photo key={g.id} src={g.url} video={isVideo(g.fileName || g.url)} alt={g.fileName} onClick={() => setOpen(p.gallery.indexOf(g))}>
                  <div className="corner">
                    <button type="button" className={`s-fav ${favs.has(g.id) ? "on" : ""}`} aria-pressed={favs.has(g.id)} aria-label={favs.has(g.id) ? "Uit favorieten" : "Favoriet"}
                      onClick={(e) => { e.stopPropagation(); toggle(g); }}>
                      <Heart fill={favs.has(g.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </Photo>
              ))}
            </div>
          )}
        </>
      )}
      {open !== null && <Lightbox project={p} index={open} setIndex={setOpen} favs={favs} onToggle={toggle} onDownload={downloadOne} />}
      <SubmitDialog project={p} open={submitting} onClose={() => setSubmitting(false)} count={favs.size} />
    </main>
  );
}

function Lightbox({ project: p, index, setIndex, favs, onToggle, onDownload }: {
  project: Project; index: number; setIndex: (i: number | null) => void; favs: Set<string>; onToggle: (g: GalleryImage) => void; onDownload: (g: GalleryImage) => void;
}) {
  const img = p.gallery[index];
  const go = useCallback((d: number) => setIndex((index + d + p.gallery.length) % p.gallery.length), [index, p.gallery.length, setIndex]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key.toLowerCase() === "f") onToggle(img);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [go, img, onToggle, setIndex]);

  // Swipe on phones.
  const [touchX, setTouchX] = useState<number | null>(null);

  return (
    <div className="p-lightbox" role="dialog" aria-modal="true" aria-label={`Foto ${index + 1} van ${p.gallery.length}`}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); setTouchX(null); }}>
      <div className="bar">
        <span className="s-mono s-small">{index + 1} / {p.gallery.length}</span>
        <div className="s-row">
          <button type="button" className={`s-btn ${favs.has(img.id) ? "on" : ""}`} onClick={() => onToggle(img)} aria-pressed={favs.has(img.id)}>
            <Heart size={15} fill={favs.has(img.id) ? "currentColor" : "none"} />{favs.has(img.id) ? "Favoriet" : "Favoriet maken"}
          </button>
          <button type="button" className="s-btn" onClick={() => onDownload(img)}><Download size={15} />Download</button>
          <button type="button" className="s-btn icon" onClick={() => setIndex(null)} aria-label="Sluiten"><X size={16} /></button>
        </div>
      </div>
      <div className="stage">
        {isVideo(img.fileName || img.url) ? <video src={img.url} controls autoPlay playsInline /> : <img src={img.url} alt={img.fileName} />}
        <button type="button" className="nav prev" onClick={() => go(-1)} aria-label="Vorige"><ChevronLeft /></button>
        <button type="button" className="nav next" onClick={() => go(1)} aria-label="Volgende"><ChevronRight /></button>
      </div>
      <div style={{ padding: 10, textAlign: "center" }} className="s-small s-faint">Pijltjestoetsen om te bladeren · F voor favoriet</div>
    </div>
  );
}

function SubmitDialog({ project: p, open, onClose, count }: { project: Project; open: boolean; onClose: () => void; count: number }) {
  const [note, setNote] = useState("");
  const submit = useAction({
    fn: () => post(`/portal/project/${p.id}/favorites/submit`, { note }),
    success: "Je keuze is doorgegeven. We gaan aan de slag!",
    onSuccess: onClose,
  });
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={`${count} favorieten doorgeven?`} description="Je kunt daarna nog steeds hartjes aanpassen; laat het ons dan even weten."
      footer={<><Button onClick={onClose}>Nog even kijken</Button><Button variant="primary" icon={<Send />} loading={submit.isPending} onClick={() => submit.mutate()}>Doorgeven</Button></>}>
      <TextAreaField label="Opmerking (optioneel)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. graag iets warmer bewerken" />
    </Modal>
  );
}
