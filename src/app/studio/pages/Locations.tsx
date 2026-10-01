import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import {
  Camera, Car, Crosshair, ImagePlus, Layers, MapPin, Navigation, Pencil, Plus, Search, Sun, Trash2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map as MapGL, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import { Link } from "react-router";
import { toast } from "sonner";
import { del, errorMessage, post, put, upload } from "../api";
import { ago, fmtTime, LIGHT_LABEL, LOCATION_KIND_LABEL, mapsLink, STAGE_LABEL } from "../format";
import { HOME, reverseGeocode, searchPlaces, type GeoResult } from "../geo";
import { beaufort, compass, lightFor, useWeather } from "../light";
import { MAP_STYLE_LABEL, MAP_STYLES, Pin, SunRay, type MapStyleName } from "../map";
import { keys, queryClient, useAction, useLocations } from "../queries";
import type { BestLight, LocationKind, StudioLocation } from "../types";
import { Button, Field, Input, PageHead, Photo, Pill, SelectField, Skeleton, TextAreaField, TextField, useConfirm } from "../ui";
import { useSearchPatch, useUrlState } from "../urlState";

// The detail panel covers the right of the map; centre points in what is left.
const PANEL_PADDING = { right: 410, left: 0, top: 0, bottom: 0 };

type Draft = {
  id?: string;
  name: string;
  kind: LocationKind;
  lat: number;
  lng: number;
  address: string;
  notes: string;
  parking: string;
  permitRequired: boolean;
  bestLight: BestLight;
  tags: string;
};

const KINDS = Object.keys(LOCATION_KIND_LABEL) as LocationKind[];

function toDraft(l: StudioLocation): Draft {
  return { id: l.id, name: l.name, kind: l.kind, lat: l.lat, lng: l.lng, address: l.address, notes: l.notes, parking: l.parking, permitRequired: l.permitRequired, bestLight: l.bestLight, tags: l.tags.join(", ") };
}

export function LocationsPage() {
  const { params, patch } = useSearchPatch();
  const locations = useLocations();
  const map = useRef<MapRef>(null);
  const [style, setStyle] = useState<MapStyleName>(() => {
    try { return (localStorage.getItem("pdc-map-style") as MapStyleName) || "kaart"; } catch { return "kaart"; }
  });
  const [kind, setKind] = useUrlState<LocationKind | "all">("soort", "all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lightDate, setLightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const selectedId = params.get("open");
  const all = locations.data || [];
  const selected = all.find((l) => l.id === selectedId) || null;

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((l) => (kind === "all" || l.kind === kind) && (!term || `${l.name} ${l.address} ${l.tags.join(" ")} ${l.notes}`.toLowerCase().includes(term)));
  }, [all, kind, q]);

  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: visible.filter((l) => l.id !== selectedId).map((l) => ({
      type: "Feature" as const,
      properties: { id: l.id, name: l.name },
      geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
    })),
  }), [visible, selectedId]);

  function select(id: string | null, fly = true) {
    setDraft(null);
    patch({ open: id, new: null }, { replace: true });
    const l = all.find((x) => x.id === id);
    if (l && fly) map.current?.flyTo({ center: [l.lng, l.lat], zoom: Math.max(map.current.getZoom(), 14), duration: 700, padding: PANEL_PADDING });
  }

  // Deep links (?open=...) fly to the location once the data is there; ?new=1 starts a draft.
  const flown = useRef(false);
  useEffect(() => {
    if (flown.current || !locations.data) return;
    flown.current = true;
    if (selected) setTimeout(() => map.current?.flyTo({ center: [selected.lng, selected.lat], zoom: 14, duration: 0, padding: PANEL_PADDING }), 50);
    else if (all.length) {
      const lats = all.map((l) => l.lat), lngs = all.map((l) => l.lng);
      setTimeout(() => map.current?.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 13, duration: 0 }), 50);
    }
  }, [locations.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (params.get("new") === "1") {
      const c = map.current?.getCenter();
      startDraft(c ? c.lat : HOME.lat, c ? c.lng : HOME.lng);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startDraft(lat: number, lng: number, label = "") {
    patch({ open: null, new: null }, { replace: true });
    setDraft({ name: label.split(",")[0] || "", kind: "urban", lat, lng, address: label, notes: "", parking: "", permitRequired: false, bestLight: "", tags: "" });
    if (!label) {
      const address = await reverseGeocode(lat, lng);
      setDraft((d) => (d && d.lat === lat && d.lng === lng ? { ...d, address, name: d.name || address.split(",")[0] } : d));
    }
  }

  function onMapClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (feature?.layer.id === "clusters") {
      const source = map.current?.getSource("locations") as GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(feature.properties.cluster_id).then((zoom) => {
        const [lng, lat] = (feature.geometry as any).coordinates;
        map.current?.easeTo({ center: [lng, lat], zoom, duration: 500 });
      });
      return;
    }
    if (feature?.layer.id === "points") return select(feature.properties.id, false);
    if (draft) return setDraft({ ...draft, lat: e.lngLat.lat, lng: e.lngLat.lng });
    if (selected) return select(null);
    startDraft(e.lngLat.lat, e.lngLat.lng);
  }

  function changeStyle(s: MapStyleName) {
    setStyle(s);
    try { localStorage.setItem("pdc-map-style", s); } catch { /* ignore */ }
  }

  const lightDay = new Date(`${lightDate}T12:00`);
  const light = selected ? lightFor(lightDay, selected.lat, selected.lng) : draft ? lightFor(lightDay, draft.lat, draft.lng) : null;
  const focus = selected || draft;

  return (
    <div className="s-view" style={{ maxWidth: "none" }}>
      <PageHead
        title="Locaties"
        sub="Gescoute plekken met licht, parkeren en foto's. Klik op de kaart om een nieuwe pin te zetten."
        actions={<Button variant="primary" icon={<Plus />} onClick={() => { const c = map.current?.getCenter(); startDraft(c?.lat ?? HOME.lat, c?.lng ?? HOME.lng); }}>Locatie toevoegen</Button>}
      />
      <div className="s-map-layout">
        <div className="s-map-list">
          <div className="tools">
            <PlaceSearch value={q} onChange={setQ} onPick={(r) => { map.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 800, padding: PANEL_PADDING }); startDraft(r.lat, r.lng, r.label); }} />
            <div className="s-chips" role="group" aria-label="Soort">
              <button type="button" className="s-chip" aria-pressed={kind === "all"} onClick={() => setKind("all")}>Alles</button>
              {KINDS.filter((k) => all.some((l) => l.kind === k)).map((k) => (
                <button key={k} type="button" className="s-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{LOCATION_KIND_LABEL[k]}</button>
              ))}
            </div>
          </div>
          <div className="items" role="listbox" aria-label="Locaties">
            {locations.isLoading && <div style={{ padding: 12 }} className="s-stack"><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /></div>}
            {!locations.isLoading && visible.length === 0 && (
              <div className="s-empty"><MapPin /><b>{all.length ? "Niets gevonden" : "Nog geen locaties"}</b><p>{all.length ? "Probeer een ander filter." : "Klik op de kaart of zoek een adres om je eerste plek te bewaren."}</p></div>
            )}
            {visible.map((l) => (
              <button key={l.id} type="button" className="s-loc" role="option" aria-selected={l.id === selectedId} onClick={() => select(l.id)}>
                <Photo src={l.photos[0]?.url} />
                <div style={{ minWidth: 0 }}>
                  <b className="s-truncate">{l.name}</b>
                  <span>{LOCATION_KIND_LABEL[l.kind]}{l.bestLight ? ` · ${LIGHT_LABEL[l.bestLight].toLowerCase()}` : ""}</span><br />
                  <span className="s-faint s-mono" style={{ fontSize: 11 }}>{l.usedCount ? `${l.usedCount}× gebruikt` : "nog niet gebruikt"}{l.lastUsed ? `, laatst ${ago(l.lastUsed)}` : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="s-map">
          <MapGL
            ref={map}
            initialViewState={{ latitude: HOME.lat, longitude: HOME.lng, zoom: HOME.zoom }}
            mapStyle={MAP_STYLES[style] as any}
            interactiveLayerIds={["clusters", "points"]}
            onClick={onMapClick}
            cursor={draft ? "crosshair" : undefined}
            style={{ position: "absolute", inset: 0 }}
          >
            <NavigationControl position="bottom-left" showCompass />
            <Source id="locations" type="geojson" data={geojson} cluster clusterRadius={46} clusterMaxZoom={13}>
              <Layer id="clusters" type="circle" filter={["has", "point_count"]} paint={{ "circle-color": "#ffffff", "circle-stroke-color": "#17130f", "circle-stroke-width": 2, "circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 30, 26] }} />
              <Layer id="cluster-count" type="symbol" filter={["has", "point_count"]} layout={{ "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 }} paint={{ "text-color": "#17130f" }} />
              <Layer id="points" type="circle" filter={["!", ["has", "point_count"]]} paint={{ "circle-color": "#17130f", "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 }} />
            </Source>
            {focus && light && <SunRay lat={focus.lat} lng={focus.lng} bearing={light.goldenAzimuth} />}
            {selected && (
              <Marker latitude={selected.lat} longitude={selected.lng} anchor="bottom">
                <Pin active label={selected.name} />
              </Marker>
            )}
            {draft && (
              <Marker
                latitude={draft.lat}
                longitude={draft.lng}
                anchor="bottom"
                draggable
                onDragEnd={async (e) => {
                  const { lat, lng } = e.lngLat;
                  setDraft((d) => (d ? { ...d, lat, lng } : d));
                  const address = await reverseGeocode(lat, lng);
                  if (address) setDraft((d) => (d && d.lat === lat ? { ...d, address } : d));
                }}
              >
                <Pin draft label="Nieuwe locatie, sleep om te verplaatsen" />
              </Marker>
            )}
          </MapGL>
          <div className="s-map-hint">
            <div className="s-row nowrap" style={{ gap: 6 }}>
              <Layers size={13} />
              {(Object.keys(MAP_STYLE_LABEL) as MapStyleName[]).map((s) => (
                <button key={s} type="button" className="s-chip" aria-pressed={style === s} onClick={() => changeStyle(s)} style={{ padding: "1px 8px" }}>{MAP_STYLE_LABEL[s]}</button>
              ))}
              <button
                type="button"
                className="s-chip"
                style={{ padding: "1px 8px" }}
                title="Naar mijn plek"
                onClick={() => navigator.geolocation?.getCurrentPosition(
                  (pos) => map.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 }),
                  () => toast.error("Je locatie is niet beschikbaar."),
                )}
              >
                <Crosshair size={12} />
              </button>
            </div>
          </div>
          {selected && !draft && (
            <LocationDetail
              location={selected}
              lightDate={lightDate}
              setLightDate={setLightDate}
              onClose={() => select(null)}
              onEdit={() => setDraft(toDraft(selected))}
            />
          )}
          {draft && (
            <LocationForm
              draft={draft}
              setDraft={setDraft}
              onCancel={() => setDraft(null)}
              onSaved={(id) => { setDraft(null); patch({ open: id }, { replace: true }); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceSearch({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (r: GeoResult) => void }) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (value.trim().length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(value, ctrl.signal).then((r) => { setResults(r); setOpen(true); }).catch(() => { /* aborted */ });
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      <label className="s-searchbox">
        <Search />
        <input aria-label="Zoek locatie of adres" placeholder="Zoek eigen plek of adres" value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {value && <button type="button" aria-label="Wissen" onClick={() => onChange("")} style={{ border: 0, background: "none", padding: 0, color: "var(--faint)" }}><X size={14} /></button>}
      </label>
      {open && results.length > 0 && (
        <div className="s-card" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10, boxShadow: "var(--shadow)", padding: 4 }}>
          <div className="s-eyebrow" style={{ padding: "6px 8px" }}>Adressen</div>
          {results.map((r) => (
            <button key={r.id} type="button" className="s-item" style={{ gridTemplateColumns: "auto 1fr", padding: "7px 8px" }} onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onPick(r); }}>
              <MapPin size={14} /><span className="s-small s-truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SunDial({ bearing }: { bearing: number }) {
  const a = ((bearing - 90) * Math.PI) / 180;
  const x = 48 + 38 * Math.cos(a), y = 48 + 38 * Math.sin(a);
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label={`Zon uit ${bearing} graden`}>
      <circle cx="48" cy="48" r="38" fill="none" stroke="var(--line-strong)" />
      <circle cx="48" cy="48" r="24" fill="none" stroke="var(--line)" />
      {(["N", "O", "Z", "W"] as const).map((l, i) => {
        const p = [[48, 9], [89, 51], [48, 94], [4, 51]][i];
        return <text key={l} x={p[0]} y={p[1]} textAnchor={i === 1 ? "end" : i === 3 ? "start" : "middle"} fontSize="8" fill="var(--faint)" fontFamily="var(--mono)">{l}</text>;
      })}
      <line x1="48" y1="48" x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="6" fill="var(--accent)" />
      <circle cx="48" cy="48" r="3" fill="var(--text)" />
    </svg>
  );
}

function LocationDetail({ location: l, lightDate, setLightDate, onClose, onEdit }: {
  location: StudioLocation; lightDate: string; setLightDate: (d: string) => void; onClose: () => void; onEdit: () => void;
}) {
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const day = new Date(`${lightDate}T12:00`);
  const light = lightFor(day, l.lat, l.lng);
  const golden = light?.goldenEvening ?? null;
  const weather = useWeather(l.lat, l.lng, golden);

  const remove = useAction({
    fn: () => del(`/admin/locations/${l.id}`),
    invalidate: () => [keys.locations],
    success: "Locatie verwijderd",
    onSuccess: onClose,
  });
  const removePhoto = useAction({
    fn: (photoId: string) => del(`/admin/locations/${l.id}/photos/${photoId}`),
    invalidate: () => [keys.locations],
  });

  async function addPhotos(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    try {
      await upload(`/admin/locations/${l.id}/photos`, files.slice(0, 20));
      await queryClientInvalidate();
      toast.success(`${files.length} foto${files.length === 1 ? "" : "'s"} toegevoegd`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside className="s-loc-detail" aria-label={l.name}>
      <div className="strip">
        {[0, 1, 2].map((i) => (
          <Photo key={i} src={l.photos[i]?.url} caption={l.photos[i] ? `SCOUT ${String(i + 1).padStart(2, "0")}` : undefined}>
            {l.photos[i] && <div className="corner"><button type="button" className="s-fav" aria-label="Foto verwijderen" onClick={async () => { if (await confirm({ title: "Scoutingfoto verwijderen?", danger: true, confirm: "Verwijderen" })) removePhoto.mutate(l.photos[i].id); }}><Trash2 /></button></div>}
          </Photo>
        ))}
      </div>
      <div className="body">
        <div className="s-row between nowrap">
          <b style={{ fontSize: 16 }} className="s-truncate">{l.name}</b>
          <div className="s-row nowrap">
            <Button size="sm" variant="ghost" iconOnly aria-label="Bewerken" icon={<Pencil />} onClick={onEdit} />
            <Button size="sm" variant="ghost" iconOnly aria-label="Sluiten" icon={<X />} onClick={onClose} />
          </div>
        </div>
        <div className="s-row" style={{ gap: 6 }}>
          <Pill plain>{LOCATION_KIND_LABEL[l.kind]}</Pill>
          <Pill tone={l.permitRequired ? "warn" : "ok"}>{l.permitRequired ? "Vergunning nodig" : "Geen vergunning"}</Pill>
          {l.tags.map((t) => <Pill key={t} plain>{t}</Pill>)}
        </div>
        {light && (
          <div className="s-sun">
            <SunDial bearing={light.goldenAzimuth} />
            <div className="s-stack sm s-small">
              <label className="s-row nowrap" style={{ gap: 6 }}>
                <Sun size={13} />
                <span className="s-eyebrow">Licht op</span>
                <Input type="date" value={lightDate} onChange={(e) => e.target.value && setLightDate(e.target.value)} style={{ padding: "2px 6px", fontSize: 12, width: 140 }} aria-label="Datum voor lichtberekening" />
              </label>
              <span>Golden hour <b className="s-mono" style={{ color: "var(--accent)" }}>{fmtTime(light.goldenEvening)}</b>, zon onder <b className="s-mono">{fmtTime(light.sunset)}</b></span>
              <span className="s-muted">Zon uit het {compass(light.goldenAzimuth)} ({light.goldenAzimuth}°), blauw uur tot {fmtTime(light.blueHourEnd)}</span>
              <span className="s-muted">Ochtendlicht tot {fmtTime(light.goldenMorningEnd)}</span>
              {weather.data && <span>{weather.data.temperature}°, {weather.data.summary.toLowerCase()}, {beaufort(weather.data.wind)} Bft, {weather.data.precipitationChance}% neerslag</span>}
            </div>
          </div>
        )}
        {l.address && <div className="s-kv"><span>Adres</span><span>{l.address}</span></div>}
        {l.parking && <div className="s-kv"><span><Car size={13} style={{ verticalAlign: -2 }} /> Parkeren</span><span>{l.parking}</span></div>}
        {l.bestLight && <div className="s-kv"><span>Beste licht</span><span>{LIGHT_LABEL[l.bestLight]}</span></div>}
        {l.notes && <p className="s-small" style={{ whiteSpace: "pre-wrap" }}>{l.notes}</p>}
        {l.projects.length > 0 && (
          <div className="s-stack sm">
            <span className="s-eyebrow">Gebruikt bij</span>
            {l.projects.map((p) => (
              <Link key={p.id} to={`/admin/project/${p.id}`} className="s-row between s-small" style={{ textDecoration: "none" }}>
                <span className="s-truncate">{p.title}</span><Pill plain>{STAGE_LABEL[p.stage]}</Pill>
              </Link>
            ))}
          </div>
        )}
        <div className="s-row">
          <a className="s-btn sm" href={mapsLink(l.lat, l.lng)} target="_blank" rel="noreferrer"><Navigation size={14} />Route</a>
          <Button size="sm" icon={<ImagePlus />} loading={uploading} onClick={() => fileInput.current?.click()}>Foto's</Button>
          <Button size="sm" variant="ghost" icon={<Trash2 />} loading={remove.isPending} style={{ marginLeft: "auto" }}
            onClick={async () => { if (await confirm({ title: `${l.name} verwijderen?`, body: "Projecten die hier gepland staan houden hun afspraken, zonder locatie.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>
            Verwijderen
          </Button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple capture="environment" hidden onChange={(e) => { addPhotos(Array.from(e.target.files || [])); e.target.value = ""; }} />
        <span className="s-faint s-mono" style={{ fontSize: 11 }}>{l.lat.toFixed(5)}, {l.lng.toFixed(5)}</span>
      </div>
    </aside>
  );
}

// upload() bypasses useAction, so the list is refreshed by hand.
const queryClientInvalidate = () => queryClient.invalidateQueries({ queryKey: keys.locations });

function LocationForm({ draft, setDraft, onCancel, onSaved }: {
  draft: Draft; setDraft: (d: Draft | null) => void; onCancel: () => void; onSaved: (id: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const save = useAction({
    fn: () => {
      const body = {
        name: draft.name.trim(), kind: draft.kind, lat: draft.lat, lng: draft.lng, address: draft.address.trim(), notes: draft.notes,
        parking: draft.parking.trim(), permitRequired: draft.permitRequired, bestLight: draft.bestLight,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      return draft.id ? put<{ location: StudioLocation }>(`/admin/locations/${draft.id}`, body) : post<{ location: StudioLocation }>("/admin/locations", body);
    },
    invalidate: () => [keys.locations],
    success: draft.id ? "Locatie bijgewerkt" : "Locatie bewaard",
    onSuccess: (r) => onSaved(r.location.id),
  });

  return (
    <aside className="s-loc-detail" aria-label={draft.id ? "Locatie bewerken" : "Nieuwe locatie"}>
      <form className="body" onSubmit={(e) => { e.preventDefault(); if (!draft.name.trim()) return setError("Geef de plek een naam."); setError(null); save.mutate(); }}>
        <div className="s-row between nowrap">
          <b style={{ fontSize: 16 }}>{draft.id ? "Locatie bewerken" : "Nieuwe locatie"}</b>
          <Button size="sm" variant="ghost" iconOnly aria-label="Annuleren" icon={<X />} onClick={onCancel} />
        </div>
        <p className="s-small s-muted"><Camera size={13} style={{ verticalAlign: -2 }} /> Klik op de kaart of sleep de blauwe pin om de plek te verplaatsen.</p>
        <TextField label="Naam" value={draft.name} onChange={(e) => set("name", e.target.value)} autoFocus placeholder="Bijv. Maasboulevard, kade" />
        <SelectField label="Soort" value={draft.kind} onChange={(e) => set("kind", e.target.value as LocationKind)}>
          {KINDS.map((k) => <option key={k} value={k}>{LOCATION_KIND_LABEL[k]}</option>)}
        </SelectField>
        <TextField label="Adres" value={draft.address} onChange={(e) => set("address", e.target.value)} />
        <TextField label="Parkeren" value={draft.parking} onChange={(e) => set("parking", e.target.value)} placeholder="Waar, betaald of gratis" />
        <SelectField label="Beste licht" value={draft.bestLight} onChange={(e) => set("bestLight", e.target.value as BestLight)}>
          {Object.entries(LIGHT_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </SelectField>
        <label className="s-check"><input type="checkbox" checked={draft.permitRequired} onChange={(e) => set("permitRequired", e.target.checked)} /> Vergunning of toestemming nodig</label>
        <TextField label="Tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} placeholder="auto, skyline, water" hint="Gescheiden door komma's" />
        <TextAreaField label="Notities" value={draft.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Drukte, beste standpunt, contactpersoon…" />
        <Field label="Coördinaten"><span className="s-mono s-small s-muted">{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</span></Field>
        {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
        <div className="s-row" style={{ justifyContent: "flex-end" }}>
          <Button onClick={onCancel}>Annuleren</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>{draft.id ? "Opslaan" : "Bewaren"}</Button>
        </div>
      </form>
    </aside>
  );
}
