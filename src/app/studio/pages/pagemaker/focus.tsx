import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { FocusPoint } from "../../../lib/articlePage";
import { smallImage } from "../../../lib/images";

// Choosing what stays in view when a photo is cropped: click or drag on the
// photo. With the frame's shape known, the part that stays is shown light and
// the rest dimmed, so you see the crop before it is on the page.

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function FocusPicker({ src, video, point, frame, onChange }: {
  src: string;
  video?: boolean;
  point: FocusPoint;
  /** The frame's width / height. Unknown (the accordion): only the point shows. */
  frame?: number;
  onChange: (p: FocusPoint) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [own, setOwn] = useState<number>();

  function at(e: PointerEvent) {
    const r = box.current?.getBoundingClientRect();
    if (!r?.width || !r.height) return;
    onChange({ x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) });
  }
  function onKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 15 : 5;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    onChange({ x: clamp(point.x + move[0]), y: clamp(point.y + move[1]) });
  }

  // The part of the photo the frame shows, as object-position does it.
  let view: { left: number; top: number; width: number; height: number } | null = null;
  if (frame && own) {
    if (frame < own) {
      const width = frame / own;
      view = { left: (1 - width) * (point.x / 100), top: 0, width, height: 1 };
    } else {
      const height = own / frame;
      view = { left: 0, top: (1 - height) * (point.y / 100), width: 1, height };
    }
  }
  const pct = (n: number) => `${n * 100}%`;

  return (
    <div
      ref={box}
      className="pm-focus"
      role="group"
      tabIndex={0}
      aria-label={`Wat in beeld blijft: ${point.x}% van links, ${point.y}% van boven. Klik op de foto of gebruik de pijltjes.`}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); at(e); }}
      onPointerMove={(e) => { if (dragging.current) at(e); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={onKey}
    >
      {video
        ? <video src={src} muted playsInline preload="metadata" onLoadedMetadata={(e) => setOwn(e.currentTarget.videoWidth / e.currentTarget.videoHeight || undefined)} />
        : <img src={smallImage(src)} alt="" draggable={false} onLoad={(e) => setOwn(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || undefined)} />}
      {view && <span className="pm-focus-view" style={{ left: pct(view.left), top: pct(view.top), width: pct(view.width), height: pct(view.height) }} />}
      <span className="pm-focus-dot" style={{ left: `${point.x}%`, top: `${point.y}%` }} />
    </div>
  );
}
