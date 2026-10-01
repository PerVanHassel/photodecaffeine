import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "../api";
import { Button, isVideo, Photo, useConfirm } from "../ui";

// Public site media (portfolio, automotive, hero images) lives in the public
// bucket; client galleries and scouting photos do not.
export const PUBLIC_BUCKET = "portfolio-images-0951c59e";

export async function uploadPublic(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("bucketName", PUBLIC_BUCKET);
  const r = await api<{ url: string }>("/admin/storage/upload", { method: "POST", form });
  return r.url;
}

/** Uploads a batch one by one, so one bad file does not lose the others. */
export async function uploadMany(files: File[], onProgress?: (done: number) => void): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    try {
      urls.push(await uploadPublic(f));
    } catch (err) {
      toast.error(`${f.name}: ${errorMessage(err)}`);
    }
    onProgress?.(urls.length);
  }
  return urls;
}

/**
 * A sortable grid of public image/video URLs with upload and remove.
 * `cover` marks one URL with a star; `onCover` makes a URL the cover.
 */
export function MediaGrid({ urls, onChange, cover, onCover, accept = "image/*,video/mp4,video/quicktime", emptyText = "Nog geen foto's" }: {
  urls: string[];
  onChange: (urls: string[]) => void;
  cover?: string;
  onCover?: (url: string) => void;
  accept?: string;
  emptyText?: string;
}) {
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function add(files: File[]) {
    const media = files.filter((f) => /^(image|video)\//.test(f.type));
    if (!media.length) return;
    setProgress({ done: 0, total: media.length });
    const added = await uploadMany(media, (done) => setProgress({ done, total: media.length }));
    setProgress(null);
    if (added.length) onChange([...urls, ...added]);
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(arrayMove(urls, urls.indexOf(String(e.active.id)), urls.indexOf(String(e.over.id))));
  }

  return (
    <div className="s-stack">
      <div
        className={`s-dropzone ${over ? "over" : ""}`}
        style={{ padding: 18 }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)); }}
      >
        {progress ? (
          <div className="s-stack sm" style={{ maxWidth: 320, margin: "0 auto" }}>
            <span className="s-small">Uploaden… {progress.done} van {progress.total}</span>
            <div className="s-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}><i style={{ transform: `scaleX(${progress.done / progress.total})` }} /></div>
          </div>
        ) : (
          <div className="s-row" style={{ justifyContent: "center" }}>
            <Upload size={16} className="s-faint" />
            <span className="s-small s-muted">Sleep bestanden hierheen of</span>
            <Button size="sm" icon={<ImagePlus />} onClick={() => input.current?.click()}>Kies bestanden</Button>
          </div>
        )}
        <input ref={input} type="file" accept={accept} multiple hidden onChange={(e) => { add(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </div>
      {urls.length === 0 ? <p className="s-small s-faint">{emptyText}</p> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={urls} strategy={rectSortingStrategy}>
            <div className="s-contact-sheet" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
              {urls.map((u, i) => (
                <SortableMedia key={u} url={u} index={i} isCover={u === cover} onCover={onCover ? () => onCover(u) : undefined}
                  onRemove={async () => { if (await confirm({ title: "Verwijderen?", body: "Het bestand verdwijnt van de site zodra je opslaat.", confirm: "Verwijderen", danger: true })) onChange(urls.filter((x) => x !== u)); }} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableMedia({ url, index, isCover, onCover, onRemove }: { url: string; index: number; isCover: boolean; onCover?: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} {...attributes} {...listeners}>
      <Photo src={url} video={isVideo(url)} caption={String(index + 1).padStart(2, "0")}>
        <div className="corner">
          {onCover && (
            <button type="button" className={`s-fav ${isCover ? "on" : ""}`} title={isCover ? "Omslag" : "Maak omslag"} aria-label="Maak omslag" onPointerDown={(e) => e.stopPropagation()} onClick={onCover}><Star /></button>
          )}
          <button type="button" className="s-fav" aria-label="Verwijderen" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><Trash2 /></button>
        </div>
      </Photo>
    </div>
  );
}
