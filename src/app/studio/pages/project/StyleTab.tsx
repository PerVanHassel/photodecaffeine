import { useQueryClient } from "@tanstack/react-query";
import { Eye, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { toast } from "sonner";
import { errorMessage, put } from "../../api";
import { ClientGallery } from "../../gallery/ClientGallery";
import "../../gallery/gallery.css";
import { Thumb } from "../../gallery/StylePicker";
import { ACCENTS, accentOf, FONTS, fontHref, LAYOUTS, PICKER_FONTS, STYLES, styleOf, suggestStyle } from "../../gallery/styles";
import { keys } from "../../queries";
import type { GalleryLayoutChoice, Project } from "../../types";
import { Button, Card, cx, isVideo, Photo, TextAreaField, TextField } from "../../ui";
import { useUnsavedChanges } from "../../unsaved";

// How the gallery looks, for the client and for the group: a style as the
// start, and on top of it the layout, light or dark, the title font, the size
// of the photos, the cover and the words. Every click shows at once in the
// preview and is saved; the words are saved with their own button.

type Settings = Project["gallerySettings"];
const OVERRIDES = ["layout", "theme", "font"] as const;

export function StyleTab({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const gs = p.gallerySettings;
  const current = styleOf(p);
  const base = STYLES.find((s) => s.id === gs.style) || STYLES[0];
  const suggested = suggestStyle(p);
  const photos = p.gallery.filter((g) => !isVideo(g.fileName || g.url) && g.restriction !== "no_photo");
  const cover = photos.find((g) => g.id === gs.coverImageId) || photos[0];
  const urls = [cover, ...photos.filter((g) => g !== cover)].filter(Boolean).slice(0, 8).map((g) => g!.url);
  const custom = OVERRIDES.some((k) => gs[k]);

  // Saved straight away, the preview first: it reads the project from the cache.
  const saving = useRef(0);
  async function save(patch: Partial<Settings>) {
    const before = qc.getQueryData<Project>(keys.project(p.id));
    const next = { ...(before?.gallerySettings || gs), ...patch };
    for (const k of Object.keys(patch) as (keyof Settings)[]) if (patch[k] === undefined) delete next[k];
    qc.setQueryData(keys.project(p.id), (old: Project | undefined) => old && { ...old, gallerySettings: next });
    const n = ++saving.current;
    try {
      await put(`/admin/project/${p.id}`, { gallerySettings: { ...next, coverUrl: undefined } });
      if (n === saving.current) qc.invalidateQueries({ queryKey: keys.project(p.id) });
    } catch (err) {
      qc.setQueryData(keys.project(p.id), before);
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="s-style">
      <Helmet>
        {PICKER_FONTS.map((f) => <link key={f} rel="stylesheet" href={fontHref(f)} />)}
      </Helmet>
      <div className="s-style-controls s-stack lg">
        <Card title="Stijl" action={custom && <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => save({ layout: undefined, theme: undefined, font: undefined })}>Terug naar {base.name}</Button>}>
          <div className="gp-wrap"><div className="gp-grid s-style-presets" role="radiogroup" aria-label="Stijl">
            {STYLES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={base.id === s.id} className="gp-option"
                onClick={() => base.id !== s.id && save({ style: s.id, layout: undefined, theme: undefined, font: undefined })}>
                <Thumb style={s} title={gs.title || p.title} urls={urls} accent={gs.accentColor || s.accent} />
                <span className="gp-name">
                  {s.name}
                  {s.id === suggested && <span className="gp-tip">Past hierbij</span>}
                </span>
                <span className="gp-fits">{s.fits}</span>
              </button>
            ))}
          </div></div>
        </Card>

        <Card title="Indeling en kleur">
          <div className="s-stack">
            <Choice label="Indeling van de foto's" hint={LAYOUTS.find((l) => l.id === current.layout)?.fits}>
              <Opt on={!gs.layout} onClick={() => save({ layout: undefined })}>Van {base.name}</Opt>
              {LAYOUTS.map((l) => <Opt key={l.id} on={gs.layout === l.id} onClick={() => save({ layout: l.id as GalleryLayoutChoice })}><LayoutIcon id={l.id} />{l.name}</Opt>)}
            </Choice>
            <Choice label="Achtergrond">
              <Opt on={!gs.theme} onClick={() => save({ theme: undefined })}>Van {base.name} ({base.dark ? "donker" : "licht"})</Opt>
              <Opt on={gs.theme === "light"} onClick={() => save({ theme: "light" })}><span className="s-swatchdot light" aria-hidden="true" />Licht</Opt>
              <Opt on={gs.theme === "dark"} onClick={() => save({ theme: "dark" })}><span className="s-swatchdot dark" aria-hidden="true" />Donker</Opt>
            </Choice>
            <AccentChoice project={p} onSave={(accentColor) => save({ accentColor })} />
          </div>
        </Card>

        <Card title="Letter voor de titels">
          <div className="s-fonts" role="radiogroup" aria-label="Letter voor de titels">
            <button type="button" role="radio" aria-checked={!gs.font} className="s-font" onClick={() => save({ font: undefined })}>
              <span className="s-font-sample" style={fontStyle(FONTS.find((f) => f.file === (base.font || ""))?.vars || FONTS[0].vars)}>Aa</span>
              <span><b>Van {base.name}</b><small>De letter die bij de stijl hoort</small></span>
            </button>
            {FONTS.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={gs.font === f.id} className="s-font" onClick={() => save({ font: f.id })}>
                <span className="s-font-sample" style={fontStyle(f.vars)}>Aa</span>
                <span><b>{f.name}</b><small>{f.feel}</small></span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Foto's">
          <div className="s-stack">
            <Choice label="Grootte">
              {([["s", "Klein"], ["m", "Middel"], ["l", "Groot"]] as const).map(([v, label]) => (
                <Opt key={v} on={(gs.density || "m") === v} onClick={() => save({ density: v === "m" ? undefined : v })}>{label}</Opt>
              ))}
            </Choice>
            <Choice label="Ruimte ertussen">
              {([["tight", "Strak"], ["normal", "Normaal"], ["airy", "Ruim"]] as const).map(([v, label]) => (
                <Opt key={v} on={(gs.gap || "normal") === v} onClick={() => save({ gap: v === "normal" ? undefined : v })}>{label}</Opt>
              ))}
            </Choice>
            <label className="s-check-row">
              <input type="checkbox" checked={!!gs.showNumbers} onChange={(e) => save({ showNumbers: e.target.checked || undefined })} />
              <span><b>Nummers op de foto's</b><small>Handig als mensen een foto willen doorgeven: "nummer 042".</small></span>
            </label>
          </div>
        </Card>

        <CoverChoice project={p} onSave={(coverImageId) => save({ coverImageId })} />
        <Words project={p} />
      </div>

      <div className="s-style-preview">
        <div className="s-row between" style={{ marginBottom: 10 }}>
          <span className="s-eyebrow">Voorbeeld</span>
          <div className="s-row" style={{ gap: 6 }}>
            <div className="s-seg" role="group" aria-label="Scherm">
              <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} aria-label="Computer"><Monitor size={13} /></button>
              <button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")} aria-label="Telefoon"><Smartphone size={13} /></button>
            </div>
            <Link className="s-btn sm" to={`/admin/project/${p.id}/gallery`}><Eye size={14} />Groot bekijken</Link>
          </div>
        </div>
        <Preview project={p} device={device} />
      </div>
    </div>
  );
}

const fontStyle = (vars: Record<string, string>): CSSProperties => ({
  fontFamily: vars["--g-display"]?.replace("var(--ui)", "var(--ui)"),
  fontWeight: Number(vars["--g-display-weight"]) || 600,
  fontStyle: vars["--g-display-style"] as CSSProperties["fontStyle"],
  letterSpacing: vars["--g-display-track"],
  fontVariationSettings: vars["--g-display-vars"],
});

function Choice({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="s-field">
      <span className="s-label">{label}</span>
      <div className="s-opts" role="group" aria-label={label}>{children}</div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="s-opt" aria-pressed={on} onClick={() => !on && onClick()}>{children}</button>;
}

/** A tiny drawing of each layout. */
function LayoutIcon({ id }: { id: string }) {
  const r = (x: number, y: number, w: number, h: number, k: number) => <rect key={k} x={x} y={y} width={w} height={h} rx="0.8" />;
  const shapes: Record<string, React.ReactNode[]> = {
    rows: [r(1, 2, 7, 5, 1), r(9, 2, 6, 5, 2), r(1, 9, 4, 5, 3), r(6, 9, 9, 5, 4)],
    story: [r(1, 2, 14, 6, 1), r(1, 10, 6, 4, 2), r(9, 10, 6, 4, 3)],
    masonry: [r(1, 2, 4, 7, 1), r(6, 2, 4, 4, 2), r(11, 2, 4, 6, 3), r(1, 10, 4, 4, 4), r(6, 7, 4, 7, 5), r(11, 9, 4, 5, 6)],
    sheet: [r(1, 2, 4, 4, 1), r(6, 2, 4, 4, 2), r(11, 2, 4, 4, 3), r(1, 9, 4, 4, 4), r(6, 9, 4, 4, 5), r(11, 9, 4, 4, 6)],
    tempo: [r(1, 2, 9, 7, 1), r(11, 2, 4, 7, 2), r(1, 11, 3, 3, 3), r(5, 11, 3, 3, 4), r(9, 11, 3, 3, 5), r(13, 11, 2, 3, 6)],
  };
  return <svg className="s-layout-ico" viewBox="0 0 16 16" aria-hidden="true">{shapes[id]}</svg>;
}

function AccentChoice({ project: p, onSave }: { project: Project; onSave: (hex: string | undefined) => void }) {
  const style = styleOf(p);
  const accent = p.gallerySettings.accentColor || "";
  const [custom, setCustom] = useState(accentOf(p));
  useEffect(() => setCustom(accentOf(p)), [p.gallerySettings.accentColor, p.gallerySettings.style]); // eslint-disable-line react-hooks/exhaustive-deps
  // The colour picker fires on every move; save once it settles.
  useEffect(() => {
    if (custom === accentOf(p) || !/^#[0-9a-f]{6}$/i.test(custom)) return;
    const timer = setTimeout(() => onSave(custom), 500);
    return () => clearTimeout(timer);
  }, [custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const preset = ACCENTS.some((a) => a.hex === accent);
  return (
    <div className="s-field">
      <span className="s-label">Accentkleur</span>
      <div className="gp-swatches" role="radiogroup" aria-label="Accentkleur">
        <button type="button" role="radio" aria-checked={!accent} className="gp-swatch auto" title={`Standaard van ${style.name}`}
          style={{ "--c": style.accent } as CSSProperties} onClick={() => accent && onSave(undefined)}>
          <span>Auto</span>
        </button>
        {ACCENTS.map((a) => (
          <button key={a.hex} type="button" role="radio" aria-checked={accent === a.hex} aria-label={a.name} title={a.name} className="gp-swatch"
            style={{ "--c": a.hex } as CSSProperties} onClick={() => accent !== a.hex && onSave(a.hex)} />
        ))}
        <label className={cx("gp-swatch custom", accent && !preset && "on")} title="Eigen kleur, bijvoorbeeld die van de club" style={{ "--c": custom } as CSSProperties}>
          <input type="color" value={custom} aria-label="Eigen kleur" onChange={(e) => setCustom(e.target.value)} />
        </label>
      </div>
      <span className="hint">Voor hartjes, knoppen en de mail aan de klant. Kies gerust de kleur van de club of het merk.</span>
    </div>
  );
}

function CoverChoice({ project: p, onSave }: { project: Project; onSave: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const photos = p.gallery.filter((g) => !isVideo(g.fileName || g.url) && g.restriction !== "no_photo");
  const coverId = p.gallerySettings.coverImageId || photos[0]?.id;
  const list = all ? photos : photos.slice(0, 18);
  if (photos.length === 0) return null;
  return (
    <Card title="Omslagfoto" action={photos.length > 18 && <Button size="sm" variant="ghost" onClick={() => setAll((v) => !v)}>{all ? "Minder" : `Alle ${photos.length}`}</Button>}>
      <div className="s-coverpick" role="radiogroup" aria-label="Omslagfoto">
        {list.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={g.id === coverId} className="s-coverpick-opt" onClick={() => g.id !== coverId && onSave(g.id)} aria-label={`${g.fileName || "Foto"} als omslag`}>
            <Photo src={g.url} />
          </button>
        ))}
      </div>
    </Card>
  );
}

/** Title, subtitle and a word of welcome: saved with the button, so half a sentence never goes out. */
function Words({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const gs = p.gallerySettings;
  const [title, setTitle] = useState(gs.title || "");
  const [subtitle, setSubtitle] = useState(gs.subtitle || "");
  const [intro, setIntro] = useState(gs.intro || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setTitle(gs.title || "");
    setSubtitle(gs.subtitle || "");
    setIntro(gs.intro || "");
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = title !== (gs.title || "") || subtitle !== (gs.subtitle || "") || intro !== (gs.intro || "");
  useUnsavedChanges(dirty);
  async function save() {
    setBusy(true);
    try {
      const next = { ...gs, title: title.trim() || undefined, subtitle: subtitle.trim() || undefined, intro: intro.trim() || undefined, coverUrl: undefined };
      await put(`/admin/project/${p.id}`, { gallerySettings: next });
      await qc.invalidateQueries({ queryKey: keys.project(p.id) });
      toast.success("Teksten opgeslagen");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Teksten" action={dirty && <Button size="sm" variant="primary" loading={busy} onClick={save}>Opslaan</Button>}>
      <div className="s-form-grid">
        <TextField label="Titel van de galerij" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={p.title} />
        <TextField label="Ondertitel" value={subtitle} maxLength={160} onChange={(e) => setSubtitle(e.target.value)} placeholder="Bijv. 12 oktober, Sportpark De Kroon" />
        <TextAreaField className="full" label="Welkomstwoord (optioneel)" rows={3} maxLength={600} value={intro} onChange={(e) => setIntro(e.target.value)}
          placeholder="Bijv. Wat een wedstrijd! Hier staan alle foto's. Kies je favorieten en deel de link met het team."
          hint="Staat onder de titel. Je-vorm en gewone woorden lezen het prettigst." />
      </div>
    </Card>
  );
}

/** The gallery as it will look, at real size and scaled into the column. */
function Preview({ project: p, device }: { project: Project; device: "desktop" | "phone" }) {
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = box.current;
    const inner = stage.current;
    if (!el || !inner) return;
    // Only to look at: nothing inside can be reached with the keyboard or a screen reader.
    inner.setAttribute("inert", "");
    inner.setAttribute("aria-hidden", "true");
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setHeight(inner.offsetHeight);
    });
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);
  const real = device === "phone" ? 390 : 1240;
  const room = device === "phone" ? Math.min(width, 330) : width;
  const scale = room ? Math.min(1, room / real) : 0.4;
  // Enough photos to see the rhythm; the whole gallery would only slow the admin down.
  const shown = useMemo(() => {
    const gallery = p.gallery.filter((g) => g.restriction !== "no_photo").slice(0, 30);
    return { ...p, gallery, gallerySettings: { ...p.gallerySettings, coverUrl: undefined } };
  }, [p]);
  const favs = p.favorites || {};
  return (
    <div ref={box} className={cx("s-preview", device)}>
      <div className="s-preview-scroll" style={{ width: real * scale }}>
        {/* The page keeps its own size; only what is drawn is scaled, so the layout is the real one. */}
        <div style={{ height: height * scale }}>
          <div ref={stage} className="s-preview-stage" style={{ width: real, transform: `scale(${scale})` }}>
            <ClientGallery project={shown} favs={new Set(Object.keys(favs))} favNames={favs} actions={{}} back={null} preview />
          </div>
        </div>
      </div>
    </div>
  );
}
