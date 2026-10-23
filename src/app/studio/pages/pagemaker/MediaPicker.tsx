import { Check, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { isVideoUrl } from "../../../lib/articlePage";
import { uploadMany } from "../../components/MediaGrid";
import { Button, Modal, Photo } from "../../ui";

export interface PickRequest {
  title: string;
  multiple: boolean;
  /** "image": photos only; "any": photos and videos. */
  accept: "image" | "any";
  selected?: string[];
  onPick: (urls: string[]) => void;
}

/**
 * Chooses photos from the article's own, or uploads new ones; uploads join
 * the article's photos. With `multiple`, the click order is the order on
 * the page.
 */
export function MediaPicker({ request, gallery, used, cover, onClose, onUploaded }: {
  request: PickRequest;
  gallery: string[];
  /** Photos already placed somewhere on the page. */
  used: Set<string>;
  /** The header's photo, if the page shows one. */
  cover?: string;
  onClose: () => void;
  onUploaded: (urls: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>(request.selected ?? []);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const shown = gallery.filter((u) => request.accept === "any" || !isVideoUrl(u));

  function pick(urls: string[]) {
    request.onPick(urls);
    onClose();
  }

  function toggle(url: string) {
    if (!request.multiple) return pick([url]);
    setSelected((s) => (s.includes(url) ? s.filter((u) => u !== url) : [...s, url]));
  }

  async function upload(files: File[]) {
    const media = files.filter((f) => (request.accept === "any" ? /^(image|video)\//.test(f.type) : f.type.startsWith("image/")));
    if (!media.length) return;
    setProgress({ done: 0, total: media.length });
    const urls = await uploadMany(media, (done) => setProgress({ done, total: media.length }));
    setProgress(null);
    if (!urls.length) return;
    onUploaded(urls);
    if (!request.multiple) return pick([urls[0]]);
    setSelected((s) => [...s, ...urls.filter((u) => !s.includes(u))]);
  }

  return (
    <Modal
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={request.title}
      description={request.multiple ? "Klik de foto's in de volgorde waarin ze op de pagina komen." : "Klik een foto om hem te kiezen."}
      footer={
        <>
          <Button onClick={onClose}>Annuleren</Button>
          {request.multiple && (
            <Button variant="primary" disabled={!selected.length} onClick={() => pick(selected)}>
              {selected.length ? `Gebruik ${selected.length} ${selected.length === 1 ? "foto" : "foto's"}` : "Kies foto's"}
            </Button>
          )}
        </>
      }
    >
      <div
        className="s-dropzone"
        style={{ padding: 14 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void upload(Array.from(e.dataTransfer.files)); }}
      >
        {progress ? (
          <div className="s-stack sm" style={{ maxWidth: 320, margin: "0 auto" }}>
            <span className="s-small">Uploaden… {progress.done} van {progress.total}</span>
            <div className="s-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}><i style={{ transform: `scaleX(${progress.done / progress.total})` }} /></div>
          </div>
        ) : (
          <div className="s-row" style={{ justifyContent: "center" }}>
            <span className="s-small s-muted">Nieuwe foto's? Sleep ze hierheen of</span>
            <Button size="sm" icon={<Upload />} onClick={() => input.current?.click()}>Uploaden</Button>
          </div>
        )}
        <input ref={input} type="file" multiple={request.multiple} hidden
          accept={request.accept === "any" ? "image/*,video/mp4,video/quicktime" : "image/*"}
          onChange={(e) => { void upload(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </div>
      {shown.length === 0 ? (
        <p className="s-small s-faint">Dit stuk heeft nog geen foto's. Upload ze hierboven.</p>
      ) : (
        <div className="pm-pick-grid">
          {shown.map((url) => {
            const n = selected.indexOf(url);
            return (
              <button key={url} type="button" className={`pm-pick${n >= 0 ? " on" : ""}`} aria-pressed={n >= 0} onClick={() => toggle(url)}>
                <Photo src={url} video={isVideoUrl(url)} />
                {n >= 0 && <span className="pm-pick-n">{request.multiple ? n + 1 : <Check size={14} />}</span>}
                {n < 0 && (url === cover || used.has(url)) && <span className="pm-pick-used">{url === cover ? "Omslag" : "Staat al op de pagina"}</span>}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
