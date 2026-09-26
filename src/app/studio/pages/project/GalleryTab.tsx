import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, ImagePlus, Mail, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { del, errorMessage, post, put, upload } from "../../api";
import { keys, useAction } from "../../queries";
import type { GalleryImage, Project } from "../../types";
import { Button, Card, Empty, isVideo, Photo, Pill, TextField, useConfirm } from "../../ui";

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
  const coverId = (p.gallerySettings as any).coverImageId as string | undefined;

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
        const r = await upload<{ project: Project; added: number }>(`/admin/project/${p.id}/gallery`, chunk);
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

  return (
    <div className="s-stack lg">
      <div
        className={`s-dropzone ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); uploadFiles(Array.from(e.dataTransfer.files)); }}
      >
        {progress ? (
          <div className="s-stack" style={{ maxWidth: 360, margin: "0 auto" }}>
            <b>Uploaden… {progress.done} van {progress.total}</b>
            <div className="s-progress"><i style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
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

      <GallerySettings project={p} />
    </div>
  );
}

function SortablePhoto({ image, index, isCover, favoritedBy, onCover, onRemove }: {
  image: GalleryImage; index: number; isCover: boolean; favoritedBy?: string[]; onCover: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} {...attributes} {...listeners}>
      <Photo src={image.url} video={isVideo(image.fileName || image.url)} caption={String(index + 1).padStart(3, "0")}>
        <div className="corner">
          {favoritedBy && <span className="s-fav on" title={`Favoriet van ${favoritedBy.join(", ")}`}><Heart /></span>}
          <button type="button" className={`s-fav ${isCover ? "on" : ""}`} title={isCover ? "Omslagfoto" : "Maak omslagfoto"} aria-label="Maak omslagfoto" onPointerDown={(e) => e.stopPropagation()} onClick={onCover}><Star /></button>
          <button type="button" className="s-fav" title="Verwijderen" aria-label="Verwijderen" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><Trash2 /></button>
        </div>
      </Photo>
    </div>
  );
}

function GallerySettings({ project: p }: { project: Project }) {
  const [title, setTitle] = useState(p.gallerySettings.title || "");
  const [subtitle, setSubtitle] = useState(p.gallerySettings.subtitle || "");
  const dirty = title !== (p.gallerySettings.title || "") || subtitle !== (p.gallerySettings.subtitle || "");
  const save = useAction({
    fn: () => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, title, subtitle } }),
    invalidate: () => [keys.project(p.id)],
    success: "Galerij bijgewerkt",
  });
  return (
    <Card title="Zoals de klant het ziet" action={dirty && <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Opslaan</Button>}>
      <div className="s-form-grid">
        <TextField label="Titel van de galerij" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={p.title} />
        <TextField label="Ondertitel" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Bijv. Teamfoto's, september 2026" />
      </div>
    </Card>
  );
}
