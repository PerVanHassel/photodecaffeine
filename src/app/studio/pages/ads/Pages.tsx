import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { get } from "../../api";
import { Card, Empty, ErrorState, Segmented, SkeletonList } from "../../ui";
import { useUrlState } from "../../urlState";
import { type Device, duration, pageName, type PageStats, share, type Summary } from "./shared";

// Pagina's: per page how far people scroll and where they click, drawn over
// the page itself. The page loads in an iframe (same site, so the admin can
// draw inside it); the site's statistics leave iframes alone.

const n = (v: number) => v.toLocaleString("nl-NL");

export function PagesTab({ summary, query, device }: { summary?: Summary; query: string; device: Device }) {
  const pages = summary?.pages || [];
  const [picked, setPicked] = useUrlState<string>("pagina", "");
  const path = picked || pages[0]?.path || "";

  if (!summary) return <Card><SkeletonList rows={4} /></Card>;
  if (!pages.length) {
    return <Card><Empty icon={<FileText />} title="Nog geen pagina's bekeken in deze periode" /></Card>;
  }
  return (
    <div className="s-grid-2 list-detail a-pages">
      <Card title="Pagina's" bodyClass="none">
        <ul className="s-list" aria-label="Pagina's">
          {pages.map((p) => (
            <li key={p.path}>
              <button type="button" className="a-page-row" aria-current={p.path === path} onClick={() => setPicked(p.path)}>
                <span className="s-stack sm" style={{ minWidth: 0 }}>
                  <b className="s-truncate">{pageName(p.path)}</b>
                  <span className="s-faint s-small s-mono s-truncate">{p.path}</span>
                </span>
                <span className="a-page-nums s-small">
                  <span><b className="s-mono">{n(p.views)}</b> keer</span>
                  <span className="s-faint">{duration(p.seconds)} · {p.scroll ?? 0}% · {share(p.exits, p.views)} weg</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {path && <PageDetail key={path} path={path} query={query} device={device} />}
    </div>
  );
}

function PageDetail({ path, query, device }: { path: string; query: string; device: Device }) {
  const q = `${query}&path=${encodeURIComponent(path)}`;
  const data = useQuery({
    queryKey: ["analytics-page", q],
    queryFn: ({ signal }) => get<PageStats>(`/admin/analytics/page?${q}`, signal),
    placeholderData: keepPreviousData,
  });
  // The map needs one screen size; the device filter above decides it when set.
  const [view, setView] = useState<"mobile" | "desktop">(device === "desktop" || device === "tablet" ? "desktop" : "mobile");
  const [layer, setLayer] = useState<"clicks" | "scroll">("clicks");
  useEffect(() => {
    if (device === "mobile") setView("mobile");
    else if (device === "desktop" || device === "tablet") setView("desktop");
  }, [device]);

  const col = view === "mobile" ? 2 : 3;
  const points = useMemo(() => (data.data?.points || []).filter((p) => (view === "mobile" ? p[2] === "mobile" : p[2] !== "mobile")), [data.data, view]);
  const total = data.data?.reach[0]?.[col] || 0;
  const reach = useMemo(() => (data.data?.reach || []).map((r) => ({ depth: r[0], share: total ? r[col] / total : 0 })), [data.data, col, total]);

  if (data.isError) return <ErrorState error={data.error} retry={() => data.refetch()} />;
  if (!data.data) return <Card><SkeletonList rows={5} /></Card>;
  const d = data.data;

  return (
    <div className="s-stack lg" style={{ minWidth: 0 }}>
      <Card bodyClass="none">
        <div className="s-stats a-kpis three">
          <div><b>{n(d.views)}</b><span>Keer bekeken</span></div>
          <div><b>{duration(d.seconds)}</b><span>Gem. tijd</span></div>
          <div><b>{d.scroll}%</b><span>Gem. gescrold</span></div>
          <div><b>{share(d.entries, d.views)}</b><span>Kwam hier binnen</span></div>
          <div><b>{share(d.exits, d.views)}</b><span>Ging hier weg</span></div>
          <div><b>{n(d.clicks)}</b><span>Kliks{d.rage ? ` · ${d.rage} boos` : ""}</span></div>
        </div>
      </Card>

      <Card
        title={<div className="s-stack sm"><h2>Op de pagina zelf</h2><span className="s-small s-muted">{layer === "clicks" ? `${n(points.length)} kliks, warmer is vaker` : `Hoe witter, hoe minder mensen zo ver kwamen (${n(total)} keer bekeken)`}</span></div>}
        action={
          <div className="s-row">
            <Segmented<"clicks" | "scroll"> label="Laag" value={layer} onChange={setLayer} options={[{ value: "clicks", label: "Kliks" }, { value: "scroll", label: "Scrolldiepte" }]} />
            <Segmented<"mobile" | "desktop"> label="Scherm" value={view} onChange={setView} options={[{ value: "mobile", label: "Telefoon" }, { value: "desktop", label: "Computer" }]} />
            <a className="s-btn ghost sm icon" href={path} target="_blank" rel="noreferrer" title="Open de pagina" aria-label="Open de pagina"><ExternalLink size={15} /></a>
          </div>
        }
      >
        <PageMap path={path} width={view === "mobile" ? 390 : 1280} layer={layer} points={points} reach={reach} />
      </Card>

      <div className="s-grid-2 even">
        <Card title="Waar op geklikt wordt" bodyClass="none">
          {d.targets.length === 0 ? <p className="s-muted s-small" style={{ padding: 18 }}>Nog geen kliks.</p> : (
            <ul className="s-list">
              {d.targets.map((t) => (
                <li key={`${t.label}|${t.target}|${t.kind}`} className="a-line">
                  <span className="s-stack sm" style={{ minWidth: 0 }}>
                    <span className="s-truncate">{t.label || <span className="s-faint">({KIND[t.kind] || t.target})</span>}</span>
                    {t.kind === "link" && <span className="s-faint s-small s-mono s-truncate">→ {t.target}</span>}
                    {t.kind === "other" && <span className="s-faint s-small">Geen knop of link</span>}
                    {t.kind === "field" && <span className="s-faint s-small">Invulveld</span>}
                  </span>
                  <span className="s-mono">{n(t.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="s-stack lg">
          <Card title="Kwamen van" bodyClass="none"><Flow rows={d.from} empty="Binnengekomen op deze pagina" total={d.views} /></Card>
          <Card title="Gingen daarna naar" bodyClass="none"><Flow rows={d.next} empty="Weg van de site" total={d.views} /></Card>
        </div>
      </div>
    </div>
  );
}

const KIND: Record<string, string> = { link: "link", button: "knop", field: "invulveld", other: "ergens op de pagina" };

function Flow({ rows, empty, total }: { rows: { path: string; count: number }[]; empty: string; total: number }) {
  return (
    <ul className="s-list">
      {rows.map((r) => (
        <li key={r.path} className="a-line">
          <span className="s-truncate">{r.path ? pageName(r.path) : <i className="s-muted">{empty}</i>}</span>
          <span className="s-mono">{share(r.count, total)}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The page with its map drawn over it
// ---------------------------------------------------------------------------

const SCREEN_HEIGHT = 760;

function PageMap({ path, width, layer, points, reach }: {
  path: string;
  width: number;
  layer: "clicks" | "scroll";
  points: [number, number, string][];
  reach: { depth: number; share: number }[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  // Draw, and draw again whenever the page grows (photos loading in).
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!loaded || !doc?.body) return;
    let height = 0;
    const draw = () => {
      const h = doc.documentElement.scrollHeight;
      if (h === height) return;
      height = h;
      paint(doc, layer, points, reach);
    };
    draw();
    const timer = window.setInterval(draw, 700);
    return () => window.clearInterval(timer);
  }, [loaded, layer, points, reach]);

  return (
    <div ref={box}>
      <div className="a-map" style={{ width: width * scale, height: SCREEN_HEIGHT * scale }}>
        <iframe
          ref={frame}
          key={`${path}-${width}`}
          src={path}
          title={`Voorbeeld van ${pageName(path)}`}
          onLoad={() => {
            blockNavigation(frame.current?.contentDocument);
            setLoaded((x) => x + 1);
          }}
          style={{ width, height: SCREEN_HEIGHT, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}

/** Clicks in the preview do nothing: the map is for looking, not for using the site. */
function blockNavigation(doc: Document | null | undefined) {
  doc?.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); }, true);
}

/** Warm sequential ramp: few clicks pale amber, many deep red. */
const HEAT_STOPS: [number, string][] = [[0.15, "#fde68a"], [0.45, "#f59e0b"], [0.75, "#dc2626"], [1, "#7f1d1d"]];

function paint(doc: Document, layer: "clicks" | "scroll", points: [number, number, string][], reach: { depth: number; share: number }[]) {
  const width = doc.documentElement.scrollWidth;
  const height = doc.documentElement.scrollHeight;
  let root = doc.getElementById("pdc-map") as HTMLDivElement | null;
  if (!root) {
    root = doc.createElement("div");
    root.id = "pdc-map";
    root.setAttribute("aria-hidden", "true");
    root.style.cssText = "position:absolute;left:0;top:0;width:100%;pointer-events:none;z-index:2147483647;";
    doc.body.appendChild(root);
  }
  root.style.height = `${height}px`;
  root.replaceChildren();

  if (layer === "scroll") {
    for (let i = 0; i < reach.length; i++) {
      const r = reach[i];
      const top = (i ? reach[i - 1].depth : 0) / 100;
      const band = doc.createElement("div");
      band.style.cssText = `position:absolute;left:0;right:0;top:${top * height}px;height:${((r.depth / 100) - top) * height}px;background:rgba(246,245,242,${(1 - r.share) * 0.85});`;
      root.appendChild(band);
      if (r.depth > 0 && r.depth < 100 && r.depth % 25 === 0) {
        const mark = doc.createElement("div");
        mark.style.cssText = `position:absolute;left:0;right:0;top:${(r.depth / 100) * height}px;border-top:2px dashed #b06a2c;`;
        const label = doc.createElement("span");
        label.textContent = `${Math.round(r.share * 100)}% kwam tot hier`;
        label.style.cssText = "position:absolute;left:12px;top:-14px;background:#fff;color:#17130f;font:600 13px/1.2 system-ui,sans-serif;padding:6px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.3);";
        mark.appendChild(label);
        root.appendChild(mark);
      }
    }
    return;
  }

  // Heat: soft stamps add up in an alpha-only canvas, then each pixel's
  // strength picks a colour from the ramp. Half resolution on wide pages.
  const k = width > 800 ? 0.5 : 1;
  const w = Math.max(1, Math.round(width * k));
  const h = Math.max(1, Math.min(16000, Math.round(height * k)));
  const canvas = doc.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${height}px;`;
  const dim = doc.createElement("div");
  dim.style.cssText = "position:absolute;inset:0;background:rgba(8,4,1,.45);";
  root.append(dim, canvas);
  if (!points.length) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const radius = Math.max(10, Math.round(w * 0.035));
  const stamp = doc.createElement("canvas");
  stamp.width = stamp.height = radius * 2;
  const s = stamp.getContext("2d")!;
  const g = s.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  s.fillStyle = g;
  s.fillRect(0, 0, radius * 2, radius * 2);
  ctx.globalAlpha = Math.min(0.6, Math.max(0.08, 6 / Math.sqrt(points.length)));
  for (const [x, y] of points) ctx.drawImage(stamp, x * w - radius, y * h - radius);

  const ramp = doc.createElement("canvas");
  ramp.width = 256;
  ramp.height = 1;
  const rc = ramp.getContext("2d")!;
  const lg = rc.createLinearGradient(0, 0, 256, 0);
  for (const [at, color] of HEAT_STOPS) lg.addColorStop(at, color);
  rc.fillStyle = lg;
  rc.fillRect(0, 0, 256, 1);
  const palette = rc.getImageData(0, 0, 256, 1).data;
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i];
    if (!a) continue;
    const j = a * 4;
    px[i - 3] = palette[j];
    px[i - 2] = palette[j + 1];
    px[i - 1] = palette[j + 2];
    px[i] = Math.min(255, 70 + a);
  }
  ctx.putImageData(img, 0, 0);
}
