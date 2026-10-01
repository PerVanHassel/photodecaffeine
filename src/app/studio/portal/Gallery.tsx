import { useQueryClient } from "@tanstack/react-query";
import { downloadZip } from "client-zip";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Heart, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { errorMessage, get, post } from "../api";
import { useAction } from "../queries";
import type { GalleryImage, Project } from "../types";
import { Button, Empty, ErrorState, isVideo, Modal, Photo, Segmented, Skeleton, TextAreaField } from "../ui";
import { pkeys, saveFile, usePortalProject } from "./data";
import { useT } from "./i18n";
import { useModalFocus } from "../../lib/dialog";
import { useUrlState } from "../urlState";

export function PortalGallery() {
  const { id = "" } = useParams();
  const t = useT();
  const qc = useQueryClient();
  const data = usePortalProject(id);
  const [filter, setFilter] = useUrlState<"all" | "fav">("filter", "all", ["all", "fav"]);
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
      toast.success(t.downloadStarted);
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
        <p className="s-eyebrow">{p.gallerySettings.subtitle || t.photosCount(p.gallery.length)}</p>
        <h1>{delivered ? p.gallerySettings.title || t.galleryPhotosTitle : t.galleryChooseTitle}</h1>
        <p>{delivered ? t.galleryDownloadIntro : t.galleryChooseIntro}</p>
      </div>
      {p.gallery.length === 0 ? <Empty title={t.noPhotos}>{t.noPhotosHint}</Empty> : (
        <>
          <div className="p-proof-bar">
            <div className="s-row" style={{ gap: 14 }}>
              <Segmented<"all" | "fav"> label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: t.all(p.gallery.length) }, { value: "fav", label: t.favorites(favs.size) }]} />
            </div>
            <div className="s-row">
              <Button icon={<Download />} loading={!!zip} onClick={() => downloadAll(filter === "fav" ? shown : p.gallery)}>
                {zip ? t.zipping(zip.done, zip.total) : filter === "fav" ? t.downloadFavorites : t.downloadAll}
              </Button>
              {!delivered && <Button variant="primary" icon={<Send />} disabled={!favs.size} onClick={() => setSubmitting(true)}>{t.submitChoice}</Button>}
            </div>
          </div>
          {shown.length === 0 ? <Empty icon={<Heart />} title={t.noFavorites}>{t.noFavoritesHint}</Empty> : (
            <div className="p-proof">
              {shown.map((g) => (
                <Photo key={g.id} src={g.url} video={isVideo(g.fileName || g.url)} alt={g.fileName} openLabel={t.viewPhoto(p.gallery.indexOf(g) + 1)} onClick={() => setOpen(p.gallery.indexOf(g))}>
                  <div className="corner">
                    <button type="button" className={`s-fav ${favs.has(g.id) ? "on" : ""}`} aria-pressed={favs.has(g.id)} aria-label={favs.has(g.id) ? t.unfavorite : t.favorite}
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
  const t = useT();
  const img = p.gallery[index];
  const go = useCallback((d: number) => setIndex((index + d + p.gallery.length) % p.gallery.length), [index, p.gallery.length, setIndex]);
  const box = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // Focus moves in, stays in, Escape closes, and focus returns to the photo.
  useModalFocus(box, () => setIndex(null), closeButton);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) onToggle(img);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, img, onToggle]);

  // Swipe on phones.
  const [touchX, setTouchX] = useState<number | null>(null);

  return (
    <div ref={box} className="p-lightbox" role="dialog" aria-modal="true" aria-label={t.photoOf(index + 1, p.gallery.length)}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); setTouchX(null); }}>
      <div className="bar">
        <span className="s-mono s-small">{index + 1} / {p.gallery.length}</span>
        <div className="s-row">
          <button type="button" className={`s-btn ${favs.has(img.id) ? "on" : ""}`} onClick={() => onToggle(img)} aria-pressed={favs.has(img.id)}>
            <Heart size={15} fill={favs.has(img.id) ? "currentColor" : "none"} />{favs.has(img.id) ? t.favorite : t.makeFavorite}
          </button>
          <button type="button" className="s-btn" onClick={() => onDownload(img)}><Download size={15} />{t.download}</button>
          <button ref={closeButton} type="button" className="s-btn icon" onClick={() => setIndex(null)} aria-label={t.close}><X size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="stage">
        {isVideo(img.fileName || img.url) ? <video src={img.url} controls autoPlay playsInline /> : <img src={img.url} alt={img.fileName} />}
        <button type="button" className="nav prev" onClick={() => go(-1)} aria-label={t.previous}><ChevronLeft /></button>
        <button type="button" className="nav next" onClick={() => go(1)} aria-label={t.next}><ChevronRight /></button>
      </div>
      <div style={{ padding: 10, textAlign: "center" }} className="s-small s-faint">{t.lightboxHint}</div>
    </div>
  );
}

function SubmitDialog({ project: p, open, onClose, count }: { project: Project; open: boolean; onClose: () => void; count: number }) {
  const t = useT();
  const [note, setNote] = useState("");
  const submit = useAction({
    fn: () => post(`/portal/project/${p.id}/favorites/submit`, { note }),
    success: t.submitted,
    onSuccess: onClose,
  });
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={t.submitTitle(count)} description={t.submitIntro}
      footer={<><Button onClick={onClose}>{t.keepLooking}</Button><Button variant="primary" icon={<Send />} loading={submit.isPending} onClick={() => submit.mutate()}>{t.submit}</Button></>}>
      <TextAreaField label={t.noteOptional} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} />
    </Modal>
  );
}
