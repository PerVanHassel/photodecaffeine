import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useModalFocus } from "../lib/dialog";

// Full-screen photo viewer for the public portfolio. Arrow keys and swipes
// move between photos, Escape or the close button leaves, and keyboard focus
// stays inside while it is open (src/styles/site.css, .pdc-lightbox*).

export interface LightboxLabels {
  dialog: string;
  close: string;
  previous: string;
  next: string;
  alt: (n: number) => string;
  position: (n: number, total: number) => string;
}

export function Lightbox({ photos, index, onIndex, onClose, labels }: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  labels: LightboxLabels;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const total = photos.length;
  const go = (step: number) => onIndex((index + step + total) % total);

  useModalFocus(box, onClose, closeButton);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={labels.dialog}
      className="pdc-lightbox"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      <button
        ref={closeButton}
        type="button"
        aria-label={labels.close}
        className="pdc-lightbox-btn pdc-lightbox-close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <X size={24} aria-hidden="true" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label={labels.previous}
            className="pdc-lightbox-btn pdc-lightbox-prev"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            className="pdc-lightbox-btn pdc-lightbox-next"
            onClick={(e) => { e.stopPropagation(); go(1); }}
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        </>
      )}

      <img
        src={photos[index]}
        alt={labels.alt(index + 1)}
        className="pdc-lightbox-photo"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="pdc-lightbox-count" aria-hidden="true">
        {index + 1} / {total}
      </div>
      {/* Announces the new photo when the visitor moves through them. */}
      <div className="pdc-visually-hidden" aria-live="polite">
        {labels.position(index + 1, total)}
      </div>
    </div>
  );
}
