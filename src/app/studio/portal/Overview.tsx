import { CalendarPlus, Euro, FileText, Heart, Images, MessageSquare, Navigation } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { dayLabel, euro, fmt, fmtTime, KIND_LABEL, mapsLink, mapsSearchLink, toDate } from "../format";
import { beaufort, lightFor, useWeather } from "../light";
import { MiniMap } from "../map";
import type { PortalLocation, Project, StudioEvent } from "../types";
import { Card, Empty, ErrorState, Photo, Pill, Skeleton } from "../ui";
import { icsFor, JOURNEY, journeyIndex, saveFile, usePortalEvents, usePortalInvoices, usePortalProjects, usePortalQuotes } from "./data";

export function PortalOverview() {
  const { user } = useAuth();
  const projects = usePortalProjects();
  const events = usePortalEvents();
  const quotes = usePortalQuotes();
  const invoices = usePortalInvoices();
  const first = String(user?.user_metadata?.name || "").split(" ")[0];

  const list = projects.data?.projects || [];
  const active = list.filter((p) => !["archived"].includes(p.stage));
  const current = [...active].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  const next = (events.data?.events || []).find((e) => new Date(e.endsAt || e.startsAt).getTime() > Date.now());
  const openQuotes = (quotes.data || []).filter((q) => q.status === "sent");
  const openInvoices = (invoices.data || []).filter((i) => i.status === "sent");

  const headline = !current ? "Welkom bij PhotoDeCaffeine"
    : current.stage === "editing" && current.gallery.length ? "Je foto's zijn klaar om te kiezen"
    : current.stage === "delivered" ? "Je galerij staat klaar"
    : next ? `Tot ${dayLabel(next.startsAt)}` : `Welkom terug${first ? `, ${first}` : ""}`;

  return (
    <main className="p-main">
      <div className="p-hello">
        {current && <p className="s-eyebrow">{current.title}</p>}
        <h1>{first && headline.startsWith("Je") ? `Hoi ${first}, ${headline.charAt(0).toLowerCase()}${headline.slice(1)}` : headline}</h1>
        <p>Hier volg je je project, kies je foto's en vind je offertes, facturen en berichten.</p>
      </div>
      {projects.isError && <ErrorState error={projects.error} retry={() => projects.refetch()} />}
      {projects.isLoading ? <Skeleton h={90} r={12} /> : current && <Journey project={current} />}

      <div className="s-grid-2 portal">
        <div className="s-stack lg">
          <Card bodyClass="none">
            {projects.isLoading ? <div className="s-card-body"><Skeleton h={60} /></div> : (
              <ToDo projects={active} openQuotes={openQuotes.length} openInvoices={openInvoices.reduce((s, i) => s + i.totals.total, 0)} firstQuote={openQuotes[0]} />
            )}
          </Card>
          {list.length > 0 && (
            <Card title="Projecten" bodyClass="none">
              <ul className="s-list">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link to={`/portal/project/${p.id}`} className="s-item">
                      <Photo src={p.gallerySettings.coverUrl || p.gallery[0]?.url} style={{ width: 64, aspectRatio: "4/3" }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="t s-truncate">{p.title}</div>
                        <div className="s">{JOURNEY[journeyIndex(p.stage)].label}{p.gallery.length ? ` · ${p.gallery.length} foto's` : ""}</div>
                      </div>
                      {!!p.unreadMessages && <Pill tone="acc">{p.unreadMessages} nieuw</Pill>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!projects.isLoading && list.length === 0 && (
            <Card><Empty title="Nog geen projecten">Zodra we samen iets plannen, verschijnt het hier.</Empty></Card>
          )}
        </div>
        <div className="s-stack lg">
          {events.isLoading ? <Skeleton h={320} r={12} /> : next ? (
            <AppointmentCard event={next} location={next.locationId ? events.data?.locations[next.locationId] : null} />
          ) : (
            <Card title="Afspraken"><p className="s-small s-muted">Er staat nog niets gepland.</p></Card>
          )}
        </div>
      </div>
    </main>
  );
}

function Journey({ project }: { project: Project }) {
  const at = journeyIndex(project.stage);
  const hint: Record<number, string> = { 0: "Wacht op akkoord", 1: "Datum staat", 2: "Op locatie", 3: project.gallery.length ? "Jij kiest favorieten" : "Wij zijn bezig", 4: "Klaar om te downloaden", 5: "Bedankt!" };
  return (
    <Card bodyClass="none">
      <div className="p-journey" aria-label={`Voortgang: ${JOURNEY[at].label}`}>
        {JOURNEY.map((j, i) => (
          <div key={j.label} className={`st ${i < at ? "done" : i === at ? "now" : ""}`}>
            <div className="bar" />
            <b>{j.label}</b>
            <span>{i === at ? hint[i] : i < at ? "Klaar" : ""}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ToDo({ projects, openQuotes, openInvoices, firstQuote }: {
  projects: Project[]; openQuotes: number; openInvoices: number; firstQuote?: { id: string; token: string; title: string };
}) {
  const items: { key: string; icon: React.ReactNode; tone?: string; title: string; sub: string; to: string; cta: string; external?: boolean }[] = [];
  for (const p of projects) {
    if (p.gallery.length && ["editing", "shoot", "booked"].includes(p.stage)) {
      const chosen = p.favoriteIds?.length || 0;
      items.push({ key: `fav-${p.id}`, icon: <Heart />, title: "Kies je favorieten", sub: `${chosen} gekozen uit ${p.gallery.length} foto's · ${p.title}`, to: `/portal/project/${p.id}/gallery`, cta: chosen ? "Verder kiezen" : "Begin met kiezen" });
    }
    if (p.gallery.length && ["delivered", "review"].includes(p.stage)) {
      items.push({ key: `dl-${p.id}`, icon: <Images />, tone: "ok", title: "Je foto's staan klaar", sub: `${p.gallery.length} foto's · ${p.title}`, to: `/portal/project/${p.id}/gallery`, cta: "Bekijk en download" });
    }
    if (p.unreadMessages) {
      items.push({ key: `msg-${p.id}`, icon: <MessageSquare />, tone: "info", title: `${p.unreadMessages} nieuw bericht${p.unreadMessages === 1 ? "" : "en"}`, sub: p.title, to: `/portal/project/${p.id}#berichten`, cta: "Lees" });
    }
  }
  if (openQuotes && firstQuote) {
    items.push({ key: "quote", icon: <FileText />, tone: "warn", title: openQuotes === 1 ? "Een offerte wacht op je akkoord" : `${openQuotes} offertes wachten op je akkoord`, sub: firstQuote.title, to: `/offerte/${firstQuote.id}?t=${firstQuote.token}`, cta: "Bekijk", external: true });
  }
  if (openInvoices > 0) items.push({ key: "inv", icon: <Euro />, title: "Openstaande factuur", sub: euro(openInvoices), to: "/portal/documents", cta: "Bekijk" });

  if (!items.length) return <Empty title="Niets te doen">We laten het weten zodra er iets voor je klaarstaat.</Empty>;
  return (
    <>
      {items.map((it) => (
        <div key={it.key} className="p-action">
          <span className={`s-ico ${it.tone || "acc"}`}>{it.icon}</span>
          <div style={{ minWidth: 0 }}><b>{it.title}</b><span className="s-truncate" style={{ display: "block" }}>{it.sub}</span></div>
          <Link className={`s-btn ${it.key.startsWith("fav") || it.key.startsWith("dl") ? "primary" : ""}`} to={it.to}>{it.cta}</Link>
        </div>
      ))}
    </>
  );
}

export function AppointmentCard({ event: e, location, projectTitle }: { event: StudioEvent; location?: PortalLocation | null; projectTitle?: string }) {
  const start = toDate(e.startsAt)!;
  const light = location && e.kind === "shoot" ? lightFor(start, location.lat, location.lng) : null;
  const weather = useWeather(location?.lat, location?.lng, start);
  const title = e.title || `${KIND_LABEL[e.kind]}${projectTitle || e.projectTitle ? `: ${projectTitle || e.projectTitle}` : ""}`;
  const where = location ? [location.name, location.address].filter(Boolean).join(", ") : e.locationText;
  const route = location ? mapsLink(location.lat, location.lng) : e.locationText ? mapsSearchLink(e.locationText) : null;

  return (
    <Card bodyClass="none" className="s-card">
      {location && <MiniMap lat={location.lat} lng={location.lng} bearing={light?.goldenAzimuth} />}
      <div className="s-card-body s-stack">
        <span className="s-eyebrow">Volgende afspraak</span>
        <b style={{ fontSize: 16 }}>{title}</b>
        <div className="s-kv"><span>Wanneer</span><span className="s-mono">{fmt(start, "EEE d MMM")}{e.allDay ? "" : ` · ${fmtTime(start)}${e.endsAt ? `–${fmtTime(e.endsAt)}` : ""}`}</span></div>
        {where && <div className="s-kv"><span>Waar</span><span>{where}</span></div>}
        {location?.parking && <div className="s-kv"><span>Parkeren</span><span>{location.parking}</span></div>}
        {weather.data && <div className="s-kv"><span>Weer</span><span>{weather.data.temperature}°, {weather.data.summary.toLowerCase()}, {beaufort(weather.data.wind)} Bft</span></div>}
        {light && <div className="s-kv"><span>Mooiste licht</span><span className="s-mono">{fmtTime(light.goldenEvening)} – {fmtTime(light.sunset)}</span></div>}
        {e.link && <div className="s-kv"><span>Link</span><a href={e.link} target="_blank" rel="noreferrer">Openen</a></div>}
        {e.notes && <p className="s-small s-muted" style={{ whiteSpace: "pre-wrap" }}>{e.notes}</p>}
        <div className="s-row">
          <button type="button" className="s-btn" onClick={() => saveFile(`${title.replace(/[^\w-]+/g, "-").toLowerCase()}.ics`, icsFor(e, title, location), "text/calendar")}>
            <CalendarPlus size={15} />In mijn agenda
          </button>
          {route && <a className="s-btn ghost" href={route} target="_blank" rel="noreferrer"><Navigation size={15} />Route</a>}
        </div>
      </div>
    </Card>
  );
}
