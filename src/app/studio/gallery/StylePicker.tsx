import { Eye } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { put } from "../api";
import { keys, useAction } from "../queries";
import type { Project } from "../types";
import { Card, cx, Field, isVideo } from "../ui";
import { ACCENTS, ALL_FONTS, accentOf, STYLES, styleOf, suggestStyle, type StyleDef } from "./styles";
import "./gallery.css";

/** Admin: pick the look of a client's gallery and its accent colour. Saves on click. */
export function StylePicker({ project: p }: { project: Project }) {
  const current = styleOf(p);
  const suggested = suggestStyle(p);
  const accent = p.gallerySettings.accentColor || "";
  const [custom, setCustom] = useState(accentOf(p));
  const photos = p.gallery.filter((g) => !isVideo(g.fileName || g.url));
  const cover = photos.find((g) => g.id === p.gallerySettings.coverImageId) || photos[0];
  const urls = [cover, ...photos.filter((g) => g !== cover)].filter(Boolean).slice(0, 8).map((g) => g!.url);

  const save = useAction({
    fn: (patch: { style?: string; accentColor?: string }) => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, ...patch } }),
    invalidate: () => [keys.project(p.id)],
    success: "Opgeslagen",
  });

  // The colour picker fires on every move; save once it settles.
  useEffect(() => {
    if (custom === accentOf(p) || !/^#[0-9a-f]{6}$/i.test(custom)) return;
    const timer = setTimeout(() => save.mutate({ accentColor: custom }), 600);
    return () => clearTimeout(timer);
  }, [custom]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setCustom(accentOf(p)), [p.gallerySettings.accentColor, p.gallerySettings.style]); // eslint-disable-line react-hooks/exhaustive-deps

  const preset = ACCENTS.some((a) => a.hex === accent);
  return (
    <Card title="Stijl van de galerij" action={<Link className="s-btn sm" to={`/admin/project/${p.id}/gallery`}><Eye size={14} />Bekijk als klant</Link>}>
      <Helmet>
        {ALL_FONTS.map((f) => <link key={f} rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${f}&display=swap`} />)}
      </Helmet>
      <div className="s-stack lg">
        <div className="gp-wrap">
          <div className="gp-grid" role="radiogroup" aria-label="Stijl">
            {STYLES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={current.id === s.id} className="gp-option"
                disabled={save.isPending} onClick={() => current.id !== s.id && save.mutate({ style: s.id })}>
                <Thumb style={s} title={p.gallerySettings.title || p.title} urls={urls} accent={accent || s.accent} />
                <span className="gp-name">
                  {s.name}
                  {s.id === suggested && <span className="gp-tip">Past hierbij</span>}
                </span>
                <span className="gp-fits">{s.fits}</span>
              </button>
            ))}
          </div>
        </div>
        <Field label="Accentkleur" hint="Voor hartjes, knoppen en de mail aan de klant. Standaard kiest de stijl zelf.">
          <div className="gp-swatches" role="radiogroup" aria-label="Accentkleur">
            <button type="button" role="radio" aria-checked={!accent} className="gp-swatch auto" title={`Standaard van ${current.name}`}
              style={{ "--c": current.accent } as CSSProperties} onClick={() => accent && save.mutate({ accentColor: "" })}>
              <span>Auto</span>
            </button>
            {ACCENTS.map((a) => (
              <button key={a.hex} type="button" role="radio" aria-checked={accent === a.hex} aria-label={a.name} title={a.name} className="gp-swatch"
                style={{ "--c": a.hex } as CSSProperties} onClick={() => accent !== a.hex && save.mutate({ accentColor: a.hex })} />
            ))}
            <label className={cx("gp-swatch custom", accent && !preset && "on")} title="Eigen kleur" style={{ "--c": custom } as CSSProperties}>
              <input type="color" value={custom} aria-label="Eigen kleur" onChange={(e) => setCustom(e.target.value)} />
            </label>
          </div>
        </Field>
      </div>
    </Card>
  );
}

/** A small drawing of the style, made with the project's own photos. */
function Thumb({ style, title, urls, accent }: { style: StyleDef; title: string; urls: string[]; accent: string }) {
  const ph = (k: number, cls?: string) => <i className={cls} style={urls.length ? { backgroundImage: `url("${urls[k % urls.length]}")` } : undefined} />;
  return (
    <span className="gp-thumb" data-style={style.id} style={{ "--g-accent": accent } as CSSProperties} aria-hidden="true">
      {style.id === "atelier" && (
        <>
          <b className="t">{title}</b>
          {ph(0, "cover")}
          <span className="row">{ph(1)}{ph(2)}{ph(3)}</span>
        </>
      )}
      {style.id === "editorial" && (
        <>
          <span className="rule" />
          <b className="t">{title}</b>
          {ph(0, "cover")}
          <span className="row">{ph(1)}{ph(2)}</span>
        </>
      )}
      {style.id === "noir" && (
        <>
          {ph(0, "cover")}
          <b className="t">{title}</b>
          <span className="row">{ph(1)}{ph(2)}{ph(3)}{ph(4)}</span>
        </>
      )}
      {style.id === "zacht" && (
        <>
          {ph(0, "cover")}
          <b className="t">{title}</b>
          <span className="row">{ph(1)}{ph(2)}{ph(3)}</span>
        </>
      )}
      {style.id === "arena" && (
        <>
          <span className="tag" />
          <b className="t">{title}</b>
          <span className="burst">{ph(0)}{ph(1)}{ph(2)}{ph(3)}</span>
        </>
      )}
      {style.id === "catalogus" && (
        <>
          <span className="rule" />
          <b className="t">{title}</b>
          <span className="sheet">{[1, 2, 3, 4, 5, 6, 7, 0].map((k) => <span key={k}>{ph(k)}</span>)}</span>
        </>
      )}
      <span className="heart" />
    </span>
  );
}
