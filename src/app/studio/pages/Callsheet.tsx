import { ArrowLeft, Printer } from "lucide-react";
import { Link, useParams } from "react-router";
import { dayLabel, fmt, fmtTime, KIND_LABEL, mapsLink } from "../format";
import { beaufort, compass, lightFor, useWeather } from "../light";
import { MiniMap } from "../map";
import { useLocations, useProject, useShots } from "../queries";
import { Button, ErrorState, Skeleton } from "../ui";

/** One page with everything needed on the day, meant to be printed or opened on a phone. */
export function CallsheetPage() {
  const { id = "" } = useParams();
  const project = useProject(id);
  const shots = useShots(id);
  const locations = useLocations();
  const p = project.data;
  const shoot = p?.events.find((e) => e.kind === "shoot" && new Date(e.startsAt).getTime() > Date.now() - 86400000) || p?.events.find((e) => e.kind === "shoot");
  const loc = (locations.data || []).find((l) => l.id === (shoot?.locationId || p?.locationId));
  const day = shoot ? new Date(shoot.startsAt) : new Date();
  const light = loc ? lightFor(day, loc.lat, loc.lng) : null;
  const weather = useWeather(loc?.lat, loc?.lng, shoot ? new Date(shoot.startsAt) : null);

  if (project.isError) return <ErrorState error={project.error} />;
  if (!p) return <div className="s-view"><Skeleton h={500} r={12} /></div>;

  return (
    <div className="s-view narrow">
      <div className="s-row between no-print">
        <Link to={`/admin/project/${p.id}?tab=planning`} className="s-back"><ArrowLeft size={14} /> Terug naar project</Link>
        <Button icon={<Printer />} onClick={() => window.print()}>Printen of PDF</Button>
      </div>
      <article className="s-doc">
        <div className="s-row between" style={{ alignItems: "flex-end" }}>
          <div className="s-stack sm">
            <span className="s-eyebrow">Callsheet</span>
            <h1 style={{ fontSize: 28 }}>{p.title}</h1>
            <span className="s-muted">{(p.clients || []).map((c) => c.company || c.name).join(", ")}</span>
          </div>
          {shoot && <div className="s-stack sm" style={{ textAlign: "right" }}><b style={{ fontSize: 18 }}>{fmt(shoot.startsAt, "EEEE d MMMM")}</b><span className="s-mono">{shoot.allDay ? "hele dag" : `${fmtTime(shoot.startsAt)}${shoot.endsAt ? ` – ${fmtTime(shoot.endsAt)}` : ""}`}</span></div>}
        </div>

        {loc && (
          <div className="s-grid-2 even">
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}><MiniMap lat={loc.lat} lng={loc.lng} bearing={light?.goldenAzimuth} zoom={15} /></div>
            <div className="s-stack sm">
              <b>{loc.name}</b>
              {loc.address && <span className="s-small">{loc.address}</span>}
              {loc.parking && <span className="s-small">Parkeren: {loc.parking}</span>}
              <span className="s-small">{loc.permitRequired ? "Vergunning nodig" : "Geen vergunning nodig"}</span>
              <a className="s-small s-mono" href={mapsLink(loc.lat, loc.lng)}>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</a>
            </div>
          </div>
        )}

        {light && (
          <div className="s-light-strip">
            <div><b>{fmtTime(light.goldenEvening)}</b><span>Golden hour</span></div>
            <div><b>{fmtTime(light.sunset)}</b><span>Zon onder, {compass(light.sunsetAzimuth)}</span></div>
            <div><b>{fmtTime(light.blueHourEnd)}</b><span>Blauw uur tot</span></div>
            <div>{weather.data ? <><b>{weather.data.temperature}°</b><span>{weather.data.summary}, {beaufort(weather.data.wind)} Bft, {weather.data.precipitationChance}%</span></> : <><b>–</b><span>Weer volgt</span></>}</div>
          </div>
        )}

        <section className="s-stack">
          <h3>Programma</h3>
          {p.events.length === 0 ? <p className="s-muted s-small">Nog niets ingepland.</p> : (
            <ol className="s-timeline">
              {p.events.map((e) => (
                <li key={e.id}>
                  <span className="when">{e.allDay ? dayLabel(e.startsAt) : fmtTime(e.startsAt)}</span>
                  <span className={`node ${e.kind === "shoot" ? "gold" : ""}`} />
                  <div><b>{e.title || KIND_LABEL[e.kind]}</b>{e.notes && <p className="s-small s-muted" style={{ whiteSpace: "pre-wrap" }}>{e.notes}</p>}</div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="s-stack">
          <h3>Shotlist</h3>
          {(shots.data || []).length === 0 ? <p className="s-muted s-small">Geen shotlist.</p> : (
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {(shots.data || []).map((s) => <li key={s.id}>{s.label}{s.required && <b style={{ color: "var(--accent)" }}> · verplicht</b>}</li>)}
            </ol>
          )}
        </section>

        <section className="s-stack">
          <h3>Contact</h3>
          {(p.clients || []).map((c) => <span key={c.id} className="s-small">{c.name}{c.company ? ` (${c.company})` : ""} · {c.email}</span>)}
        </section>
      </article>
    </div>
  );
}
