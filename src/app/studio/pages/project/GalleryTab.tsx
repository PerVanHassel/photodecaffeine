import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, ImagePlus, Mail, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, del, errorMessage, post, put } from "../../api";
import { keys, useAction } from "../../queries";
import type { EarlyDownloads, GalleryImage, Project } from "../../types";
import { Button, Card, Empty, Field, isVideo, Photo, Pill, Segmented, TextField, useConfirm } from "../../ui";
import { useUnsavedChanges } from "../../unsaved";
import { StylePicker } from "../../gallery/StylePicker";
import { prepareUpload, watermark } from "../../watermark";

const BATCH = 8;

export function GalleryTab({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [addedThisVisit, setAddedThisVisit] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const favorites = p.favorites || {};
  const favoriteCount = Object.keys(favorites).length;
  const coverId = p.gallerySettings.coverImageId;
  const reportSize = useSizeBackfill(p);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function uploadFiles(files: File[]) {
    const media = files.filter((f) => /^(image|video)\//.test(f.type));
    if (media.length === 0) return toast.error("Kies foto's of video's.");
    setProgress({ done: 0, total: media.length });
    let added = 0;
    try {
      // Small batches keep each request well inside the function's limits and
      // show progress as it goes.
      for (let i = 0; i < media.length; i += BATCH) {
        const chunk = media.slice(i, i + BATCH);
        const form = new FormData();
        for (const [j, file] of chunk.entries()) {
          form.append("files", file);
          const { preview, w, h } = await prepareUpload(file, file.name);
          if (preview) form.append(`preview-${j}`, preview);
          if (w && h) form.append(`size-${j}`, `${w}x${h}`);
        }
        const r = await api<{ project: Project; added: number }>(`/admin/project/${p.id}/gallery`, { method: "POST", form });
        added += r.added;
        qc.setQueryData(keys.project(p.id), (old: Project | undefined) => (old ? { ...old, ...r.project, favorites: old.favorites, unreadMessages: old.unreadMessages } : r.project));
        setProgress({ done: Math.min(i + BATCH, media.length), total: media.length });
      }
      toast.success(`${added} ${added === 1 ? "bestand" : "bestanden"} toegevoegd`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAddedThisVisit((n) => n + added);
      setProgress(null);
      qc.invalidateQueries({ queryKey: keys.project(p.id) });
      qc.invalidateQueries({ queryKey: keys.projects });
    }
  }

  async function reorder(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(p.gallery, p.gallery.findIndex((g) => g.id === e.active.id), p.gallery.findIndex((g) => g.id === e.over!.id));
    qc.setQueryData(keys.project(p.id), { ...p, gallery: next });
    try {
      await put(`/admin/project/${p.id}/gallery/order`, { ids: next.map((g) => g.id) });
    } catch (err) {
      toast.error(errorMessage(err));
      qc.invalidateQueries({ queryKey: keys.project(p.id) });
    }
  }

  const remove = useAction({
    fn: (img: GalleryImage) => del(`/admin/project/${p.id}/gallery/${img.id}`),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: "Verwijderd",
  });
  const setCover = useAction({
    fn: (img: GalleryImage) => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, coverImageId: img.id, coverUrl: undefined } }),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: "Omslagfoto ingesteld",
  });
  const notify = useAction({
    fn: (added: number) => post<{ sentTo: string[] }>(`/admin/project/${p.id}/gallery/notify`, { added }),
    success: (r) => `Mail verstuurd naar ${r.sentTo.join(", ")}`,
    onSuccess: () => setAddedThisVisit(0),
  });

  const shown = onlyFavorites ? p.gallery.filter((g) => favorites[g.id]) : p.gallery;
  const publicCount = p.gallery.filter((g) => g.url.includes("/object/public/")).length;
  const privatize = useAction({
    fn: () => post<{ moved: number; failed: string[] }>(`/admin/project/${p.id}/gallery/privatize`),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: (r) => (r.failed.length ? `${r.moved} verplaatst, ${r.failed.length} mislukt` : `${r.moved} foto's staan nu privé`),
  });

  return (
    <div className="s-stack lg">
      {publicCount > 0 && (
        <div className="s-card" style={{ background: "var(--warn-soft)", borderColor: "transparent" }}>
          <div className="s-card-body s-row between">
            <span className="s-small">{publicCount} {publicCount === 1 ? "foto staat" : "foto's staan"} nog in de openbare opslag, van vóór de privé-galerijen. Iedereen met de link kan ze zien.</span>
            <Button size="sm" loading={privatize.isPending} onClick={() => privatize.mutate()}>Privé maken</Button>
          </div>
        </div>
      )}
      <div
        className={`s-dropzone ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); uploadFiles(Array.from(e.dataTransfer.files)); }}
      >
        {progress ? (
          <div className="s-stack" style={{ maxWidth: 360, margin: "0 auto" }}>
            <b>Uploaden… {progress.done} van {progress.total}</b>
            <div className="s-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}><i style={{ transform: `scaleX(${progress.done / progress.total})` }} /></div>
            <span className="s-small s-faint">Laat dit venster open tot het klaar is.</span>
          </div>
        ) : (
          <div className="s-stack" style={{ alignItems: "center" }}>
            <Upload size={22} />
            <span>Sleep foto's of video's hierheen, of</span>
            <Button icon={<ImagePlus />} onClick={() => input.current?.click()}>Kies bestanden</Button>
            <span className="s-small s-faint">Wordt privé opgeslagen; alleen de klanten van dit project zien het.</span>
          </div>
        )}
        <input ref={input} type="file" accept="image/*,video/mp4,video/quicktime" multiple hidden onChange={(e) => { uploadFiles(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </div>

      <div className="s-row between">
        <div className="s-row">
          <b>{p.gallery.length} {p.gallery.length === 1 ? "bestand" : "bestanden"}</b>
          {favoriteCount > 0 && <Pill tone="acc"><Heart size={11} /> {favoriteCount} favorieten van de klant</Pill>}
          <span className="s-small s-faint">Sleep om de volgorde te wijzigen</span>
        </div>
        <div className="s-row">
          {favoriteCount > 0 && (
            <Button size="sm" aria-pressed={onlyFavorites} variant={onlyFavorites ? "primary" : "default"} onClick={() => setOnlyFavorites((v) => !v)}>Alleen favorieten</Button>
          )}
          <Button
            size="sm"
            icon={<Mail />}
            disabled={p.gallery.length === 0}
            loading={notify.isPending}
            onClick={async () => {
              const n = addedThisVisit || p.gallery.length;
              if (await confirm({ title: "Klant laten weten?", body: `De klant krijgt een mail dat er ${n} ${n === 1 ? "nieuwe foto staat" : "nieuwe foto's staan"}.`, confirm: "Mail versturen" })) notify.mutate(n);
            }}
          >
            Klant laten weten{addedThisVisit ? ` (${addedThisVisit} nieuw)` : ""}
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <Card><Empty title={onlyFavorites ? "Geen favorieten" : "Nog geen foto's"}>{onlyFavorites ? "De klant heeft nog niets gekozen." : "Upload de eerste foto's hierboven."}</Empty></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
          <SortableContext items={shown.map((g) => g.id)} strategy={rectSortingStrategy}>
            <div className="s-contact-sheet">
              {shown.map((g, i) => (
                <SortablePhoto
                  key={g.id}
                  image={g}
                  index={i}
                  isCover={g.id === coverId}
                  onSize={(w, h) => reportSize(g, w, h)}
                  favoritedBy={favorites[g.id]}
                  onCover={() => setCover.mutate(g)}
                  onRemove={async () => {
                    if (await confirm({ title: "Foto verwijderen?", body: `${g.fileName || "Deze foto"} verdwijnt uit de galerij van de klant.`, confirm: "Verwijderen", danger: true })) remove.mutate(g);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <StylePicker project={p} />
      <GallerySettings project={p} />
    </div>
  );
}

function SortablePhoto({ image, index, isCover, favoritedBy, onCover, onRemove, onSize }: {
  image: GalleryImage; index: number; isCover: boolean; favoritedBy?: string[]; onCover: () => void; onRemove: () => void;
  onSize: (w: number, h: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} {...attributes} {...listeners}>
      <Photo src={image.url} video={isVideo(image.fileName || image.url)} caption={String(index + 1).padStart(3, "0")} onSize={image.w ? undefined : onSize}>
        <div className="corner">
          {favoritedBy && <span className="s-fav on" title={`Favoriet van ${favoritedBy.join(", ")}`}><Heart /></span>}
          <button type="button" className={`s-fav ${isCover ? "on" : ""}`} title={isCover ? "Omslagfoto" : "Maak omslagfoto"} aria-label="Maak omslagfoto" onPointerDown={(e) => e.stopPropagation()} onClick={onCover}><Star /></button>
          <button type="button" className="s-fav" title="Verwijderen" aria-label="Verwijderen" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><Trash2 /></button>
        </div>
      </Photo>
    </div>
  );
}

/**
 * Photos from before sizes were stored get theirs here: the contact sheet
 * loads them anyway, so their size is sent along once they have loaded.
 */
function useSizeBackfill(p: Project) {
  const qc = useQueryClient();
  const pending = useRef(new Map<string, { id: string; w: number; h: number }>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (img: GalleryImage, w: number, h: number) => {
    if (img.w || !w || !h) return;
    pending.current.set(img.id, { id: img.id, w, h });
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const sizes = [...pending.current.values()];
      pending.current.clear();
      try {
        await put(`/admin/project/${p.id}/gallery/sizes`, { sizes });
        const byId = new Map(sizes.map((s) => [s.id, s]));
        qc.setQueryData(keys.project(p.id), (old: Project | undefined) => old && {
          ...old,
          gallery: old.gallery.map((g) => (byId.has(g.id) ? { ...g, w: byId.get(g.id)!.w, h: byId.get(g.id)!.h } : g)),
        });
      } catch {
        // Not worth bothering anyone: the client's browser measures them too.
      }
    }, 1500);
  };
}

function GallerySettings({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(p.gallerySettings.title || "");
  const [subtitle, setSubtitle] = useState(p.gallerySettings.subtitle || "");
  const dirty = title !== (p.gallerySettings.title || "") || subtitle !== (p.gallerySettings.subtitle || "");
  useUnsavedChanges(dirty);
  const save = useAction({
    fn: () => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, title, subtitle } }),
    invalidate: () => [keys.project(p.id)],
    success: "Galerij bijgewerkt",
  });

  const early = p.gallerySettings.earlyDownloads || "original";
  const missing = p.gallery.filter((g) => !g.watermark && !isVideo(g.fileName || g.url));
  const [marking, setMarking] = useState<{ done: number; total: number } | null>(null);
  const saveEarly = useAction({
    fn: (earlyDownloads: EarlyDownloads) => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, earlyDownloads } }),
    invalidate: () => [keys.project(p.id)],
    success: "Opgeslagen",
  });

  // Photos from before watermarks existed get theirs here, from the original.
  async function makeWatermarks(list: GalleryImage[]) {
    setMarking({ done: 0, total: list.length });
    let failed = 0;
    for (const [i, g] of list.entries()) {
      try {
        const res = await fetch(g.url);
        if (!res.ok) throw new Error(String(res.status));
        const file = await watermark(await res.blob(), g.fileName);
        if (!file) throw new Error("onleesbaar");
        const form = new FormData();
        form.append("file", file);
        await api(`/admin/project/${p.id}/gallery/${g.id}/preview`, { method: "PUT", form });
      } catch {
        failed++;
      }
      setMarking({ done: i + 1, total: list.length });
    }
    setMarking(null);
    qc.invalidateQueries({ queryKey: keys.project(p.id) });
    if (failed) toast.error(`${failed} ${failed === 1 ? "foto kon" : "foto's konden"} geen watermerk krijgen.`);
  }

  async function chooseEarly(v: EarlyDownloads) {
    if (v === "watermark" && missing.length) await makeWatermarks(missing);
    saveEarly.mutate(v);
  }

  return (
    <Card title="Zoals de klant het ziet" action={dirty && <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Opslaan</Button>}>
      <div className="s-form-grid">
        <TextField label="Titel van de galerij" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={p.title} />
        <TextField label="Ondertitel" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Bijv. Teamfoto's, september 2026" />
        <Field label="Downloaden vóór levering" hint={marking ? `Watermerk maken… ${marking.done} van ${marking.total}` : "Na levering kan de klant altijd de originelen downloaden."}>
          <Segmented<EarlyDownloads> label="Downloaden vóór levering" value={early} onChange={(v) => !marking && v !== early && chooseEarly(v)} options={[
            { value: "original", label: "Origineel" },
            { value: "watermark", label: "Met watermerk" },
            { value: "none", label: "Niet" },
          ]} />
        </Field>
        {early === "watermark" && missing.length > 0 && !marking && (
          <div className="s-row" style={{ alignSelf: "end" }}>
            <span className="s-small s-muted">{missing.length} {missing.length === 1 ? "foto heeft" : "foto's hebben"} nog geen watermerk</span>
            <Button size="sm" onClick={() => makeWatermarks(missing)}>Watermerk maken</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
