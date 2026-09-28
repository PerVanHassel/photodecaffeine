import { CalendarPlus, Euro, FileText, Heart, Images, MessageSquare, Navigation } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { dayLabel, euro, fmt, fmtTime, mapsLink, mapsSearchLink, toDate } from "../format";
import { beaufort, lightFor, useWeather } from "../light";
import { MiniMap } from "../map";
import type { PortalLocation, Project, StudioEvent } from "../types";
import { Card, Empty, ErrorState, Photo, Pill, Skeleton } from "../ui";
import { icsFor, journeyIndex, saveFile, usePortalEvents, usePortalInvoices, usePortalProjects, usePortalQuotes } from "./data";
import { useT, type PortalText } from "./i18n";

export function PortalOverview() {
  const { user } = useAuth();
  const t = useT();
  const projects = usePortalProjects();
  const events = usePortalEvents();
  const quotes = usePortalQuotes();
  const invoices = usePortalInvoices();
  const first = String(user?.user_metadata?.name || "").split(" ")[0];

  const list = projects.data?.projects || [];
  const active = list.filter((p) => p.stage !== "archived");
  const current = [...active].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  const next = (events.data?.events || []).find((e) => new Date(e.endsAt || e.startsAt).getTime() > Date.now());
  const openQuotes = (quotes.data || []).filter((q) => q.status === "sent");
  const openInvoices = (invoices.data || []).filter((i) => i.status === "sent");

  const headline = !current ? t.welcome
    : current.stage === "editing" && current.gallery.length ? t.readyToChoose(first)
    : current.stage === "delivered" ? t.galleryReady(first)
    : next ? t.seeYou(dayLabel(next.startsAt)) : t.welcomeBack(first);

  return (
    <main className="p-main">
      <div className="p-hello">
        {current && <p className="s-eyebrow">{current.title}</p>}
        <h1>{headline}</h1>
        <p>{t.intro}</p>
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
            <Card title={t.projects} bodyClass="none">
              <ul className="s-list">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link to={`/portal/project/${p.id}`} className="s-item">
                      <Photo src={p.gallerySettings.coverUrl || p.gallery[0]?.url} style={{ width: 64, aspectRatio: "4/3" }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="t s-truncate">{p.title}</div>
                        <div className="s">{t.journey[journeyIndex(p.stage)]}{p.gallery.length ? ` · ${t.photosCount(p.gallery.length)}` : ""}</div>
                      </div>
                      {!!p.unreadMessages && <Pill tone="acc">{t.newBadge(p.unreadMessages)}</Pill>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!projects.isLoading && list.length === 0 && <Card><Empty title={t.noProjects}>{t.noProjectsHint}</Empty></Card>}
        </div>
        <div className="s-stack lg">
          {events.isLoading ? <Skeleton h={320} r={12} /> : next ? (
            <AppointmentCard event={next} location={next.locationId ? events.data?.locations[next.locationId] : null} />
          ) : (
            <Card title={t.appointments}><p className="s-small s-muted">{t.nothingPlanned}</p></Card>
          )}
        </div>
      </div>
    </main>
  );
}

export function Journey({ project, compact }: { project: Project; compact?: boolean }) {
  const t = useT();
  const at = journeyIndex(project.stage);
  const hint = (i: number) => (i === 3 && project.gallery.length ? t.journeyChoosing : t.journeyHint[i]);
  return (
    <Card bodyClass="none">
      <div className="p-journey" aria-label={t.journey[at]}>
        {t.journey.map((label, i) => (
          <div key={label} className={`st ${i < at ? "done" : i === at ? "now" : ""}`}>
            <div className="bar" />
            <b>{label}</b>
            {!compact && <span>{i === at ? hint(i) : i < at ? t.journeyDone : ""}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ToDo({ projects, openQuotes, openInvoices, firstQuote }: {
  projects: Project[]; openQuotes: number; openInvoices: number; firstQuote?: { id: string; token: string; title: string };
}) {
  const t = useT();
  const items: { key: string; icon: React.ReactNode; tone?: string; title: string; sub: string; to: string; cta: string; primary?: boolean }[] = [];
  for (const p of projects) {
    if (p.gallery.length && ["editing", "shoot", "booked"].includes(p.stage)) {
      const chosen = p.favoriteIds?.length || 0;
      items.push({ key: `fav-${p.id}`, icon: <Heart />, title: t.chooseFavorites, sub: `${t.chosenOf(chosen, p.gallery.length)} · ${p.title}`, to: `/portal/project/${p.id}/gallery`, cta: chosen ? t.continueChoosing : t.startChoosing, primary: true });
    }
    if (p.gallery.length && ["delivered", "review"].includes(p.stage)) {
      items.push({ key: `dl-${p.id}`, icon: <Images />, tone: "ok", title: t.photosReady, sub: `${t.photosCount(p.gallery.length)} · ${p.title}`, to: `/portal/project/${p.id}/gallery`, cta: t.viewAndDownload, primary: true });
    }
    if (p.unreadMessages) {
      items.push({ key: `msg-${p.id}`, icon: <MessageSquare />, tone: "info", title: t.newMessages(p.unreadMessages), sub: p.title, to: `/portal/project/${p.id}#berichten`, cta: t.read });
    }
  }
  if (openQuotes && firstQuote) {
    items.push({ key: "quote", icon: <FileText />, tone: "warn", title: t.quoteWaiting(openQuotes), sub: firstQuote.title, to: `/offerte/${firstQuote.id}?t=${firstQuote.token}`, cta: t.view });
  }
  if (openInvoices > 0) items.push({ key: "inv", icon: <Euro />, title: t.openInvoice, sub: euro(openInvoices), to: "/portal/documents", cta: t.view });

  if (!items.length) return <Empty title={t.nothingToDo}>{t.nothingToDoHint}</Empty>;
  return (
    <>
      {items.map((it) => (
        <div key={it.key} className="p-action">
          <span className={`s-ico ${it.tone || "acc"}`}>{it.icon}</span>
          <div style={{ minWidth: 0 }}><b>{it.title}</b><span className="s-truncate" style={{ display: "block" }}>{it.sub}</span></div>
          <Link className={`s-btn ${it.primary ? "primary" : ""}`} to={it.to}>{it.cta}</Link>
        </div>
      ))}
    </>
  );
}

export function appointmentTitle(e: StudioEvent, t: PortalText, projectTitle?: string) {
  return e.title || `${t.kind[e.kind] || t.kind.other}${projectTitle || e.projectTitle ? `: ${projectTitle || e.projectTitle}` : ""}`;
}

export function AppointmentCard({ event: e, location, projectTitle }: { event: StudioEvent; location?: PortalLocation | null; projectTitle?: string }) {
  const t = useT();
  const start = toDate(e.startsAt)!;
  const light = location && e.kind === "shoot" ? lightFor(start, location.lat, location.lng) : null;
  const weather = useWeather(location?.lat, location?.lng, start);
  const title = appointmentTitle(e, t, projectTitle);
  const where = location ? [location.name, location.address].filter(Boolean).join(", ") : e.locationText;
  const route = location ? mapsLink(location.lat, location.lng) : e.locationText ? mapsSearchLink(e.locationText) : null;

  return (
    <Card bodyClass="none">
      {location && <MiniMap lat={location.lat} lng={location.lng} bearing={light?.goldenAzimuth} />}
      <div className="s-card-body s-stack">
        <span className="s-eyebrow">{t.nextAppointment}</span>
        <b style={{ fontSize: 16 }}>{title}</b>
        <div className="s-kv"><span>{t.when}</span><span className="s-mono">{fmt(start, "EEE d MMM")}{e.allDay ? "" : ` · ${fmtTime(start)}${e.endsAt ? `–${fmtTime(e.endsAt)}` : ""}`}</span></div>
        {where && <div className="s-kv"><span>{t.where}</span><span>{where}</span></div>}
        {location?.parking && <div className="s-kv"><span>{t.parking}</span><span>{location.parking}</span></div>}
        {weather.data && <div className="s-kv"><span>{t.weather}</span><span>{weather.data.temperature}°, {beaufort(weather.data.wind)} Bft, {weather.data.precipitationChance}%</span></div>}
        {light && <div className="s-kv"><span>{t.bestLight}</span><span className="s-mono">{fmtTime(light.goldenEvening)} – {fmtTime(light.sunset)}</span></div>}
        {e.link && <div className="s-kv"><span>{t.link}</span><a href={e.link} target="_blank" rel="noreferrer">{t.open}</a></div>}
        {e.notes && <p className="s-small s-muted" style={{ whiteSpace: "pre-wrap" }}>{e.notes}</p>}
        <div className="s-row">
          <button type="button" className="s-btn" onClick={() => saveFile(`${title.replace(/[^\w-]+/g, "-").toLowerCase()}.ics`, icsFor(e, title, location), "text/calendar")}>
            <CalendarPlus size={15} />{t.addToCalendar}
          </button>
          {route && <a className="s-btn ghost" href={route} target="_blank" rel="noreferrer"><Navigation size={15} />{t.route}</a>}
        </div>
      </div>
    </Card>
  );
}
