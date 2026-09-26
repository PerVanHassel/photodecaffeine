import { addDays, startOfWeek } from "date-fns";
import { AlertTriangle, CalendarDays, CheckSquare, Cloud, FileText, Inbox, MessageSquare, Navigation, Plus, Search, Timer } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { ago, dayLabel, euro, fmt, fmtTime, KIND_LABEL, mapsLink, mapsSearchLink, STAGE_LABEL, toDate } from "../format";
import { beaufort, compass, lightFor, useWeather } from "../light";
import { MiniMap } from "../map";
import { useEvents, useOverview } from "../queries";
import type { Overview, StudioEvent } from "../types";
import { Button, Card, Empty, ErrorState, PageHead, Pill, Skeleton, SkeletonList } from "../ui";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

export function TodayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const overview = useOverview();
  const o = overview.data;
  const first = String(user?.user_metadata?.name || "").split(" ")[0];

  const waiting = useWaiting(o);
  const nextShoot = o?.events.find((e) => e.kind === "shoot" && new Date(e.endsAt || e.startsAt).getTime() > Date.now())
    ?? o?.events.find((e) => new Date(e.startsAt).getTime() > Date.now());

  const shootsSoon = o?.events.filter((e) => e.kind === "shoot").length ?? 0;
  const summary = o
    ? [
      shootsSoon === 0 ? "Geen shoots deze week" : shootsSoon === 1 ? "Eén shoot deze week" : `${shootsSoon} shoots deze week`,
      waiting.length === 0 ? "niets wacht op je" : waiting.length === 1 ? "één ding wacht op je" : `${waiting.length} dingen wachten op je`,
    ].join(", ") + "."
    : " ";

  return (
    <div className="s-view">
      <PageHead
        eyebrow={fmt(new Date(), "EEEE d MMMM")}
        title={`${greeting()}${first ? `, ${first}` : ""}`}
        sub={summary}
        actions={
          <>
            <Button icon={<Search />} onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}>Zoeken</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => navigate("/admin/pipeline?new=1")}>Nieuwe shoot</Button>
          </>
        }
      />
      {overview.isError && <ErrorState error={overview.error} retry={() => overview.refetch()} />}

      <div className="s-grid-2">
        <div className="s-stack lg">
          {overview.isLoading ? <Skeleton h={280} r={12} /> : nextShoot ? <NextShoot event={nextShoot} /> : (
            <Card>
              <Empty icon={<CalendarDays />} title="Geen shoots gepland" action={<Button onClick={() => navigate("/admin/planning?new=1")}>Afspraak inplannen</Button>}>
                Plan een shoot of meeting, dan verschijnt hij hier met licht, weer en route.
              </Empty>
            </Card>
          )}
          <WeekStrip />
        </div>

        <div className="s-stack lg">
          <Card title={<h2>Wacht op jou</h2>} action={<span className="s-mono s-faint s-small">{waiting.length || ""}</span>} bodyClass="none">
            {overview.isLoading ? <SkeletonList rows={4} /> : waiting.length === 0 ? (
              <Empty title="Alles bijgewerkt">Geen open berichten, aanvragen of te late facturen.</Empty>
            ) : (
              <ul className="s-list">
                {waiting.map((w) => (
                  <li key={w.key}>
                    <Link to={w.to} className="s-item">
                      <span className={`s-ico ${w.tone}`}>{w.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="t s-truncate">{w.title}</div>
                        <div className="s s-truncate">{w.sub}</div>
                      </div>
                      <span className="s-faint s-small">{w.when}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Pijplijn" action={<Button variant="ghost" size="sm" onClick={() => navigate("/admin/pipeline")}>Alles</Button>} bodyClass="none">
            <div className="s-stats">
              <Link className="s-stat" to="/admin/pipeline"><b>{o?.stageCounts.lead ?? "–"}</b><span>Aanvragen</span></Link>
              <Link className="s-stat" to="/admin/quotes"><b>{o?.openQuotes.length ?? "–"}</b><span>Offertes open</span></Link>
              <Link className="s-stat" to="/admin/pipeline"><b>{o?.stageCounts.editing ?? "–"}</b><span>In bewerking</span></Link>
              <Link className="s-stat" to="/admin/invoices"><b className="s-mono" style={{ fontSize: 19 }}>{o ? euro(o.openInvoiceTotal) : "–"}</b><span>Openstaand</span></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

type Waiting = { key: string; title: string; sub: string; to: string; icon: React.ReactNode; tone: string; when: string; at: number };

function useWaiting(o?: Overview): Waiting[] {
  return useMemo(() => {
    if (!o) return [];
    const items: Waiting[] = [];
    for (const m of o.unreadMessages) {
      items.push({ key: `m${m.id}`, title: `${m.senderName} stuurde een bericht`, sub: m.content, to: `/admin/project/${m.projectId}?tab=messages`, icon: <MessageSquare />, tone: "info", when: ago(m.createdAt), at: +new Date(m.createdAt) });
    }
    for (const i of o.newInquiries) {
      items.push({ key: `i${i.id}`, title: `Nieuwe aanvraag van ${i.name}`, sub: i.message, to: `/admin/inquiries?open=${i.id}`, icon: <Inbox />, tone: "acc", when: ago(i.createdAt), at: +new Date(i.createdAt) });
    }
    for (const inv of o.overdueInvoices) {
      const days = Math.max(1, Math.round((Date.now() - +new Date(inv.dueOn)) / 86400000));
      items.push({ key: `f${inv.id}`, title: `Factuur ${inv.number} is ${days} ${days === 1 ? "dag" : "dagen"} te laat`, sub: `${inv.clientName} · ${euro(inv.total)}`, to: `/admin/invoice/${inv.id}`, icon: <AlertTriangle />, tone: "bad", when: "", at: 0 });
    }
    for (const q of o.openQuotes) {
      const sent = +new Date(q.sentAt);
      if (Date.now() - sent < 5 * 86400000) continue;
      items.push({
        key: `q${q.id}`,
        title: q.viewedAt ? `Offerte ${q.number} bekeken, nog geen antwoord` : `Offerte ${q.number} nog niet geopend`,
        sub: `${q.clientName} · ${q.title}`,
        to: `/admin/quotes?open=${q.id}`, icon: <FileText />, tone: "warn", when: ago(q.sentAt), at: sent,
      });
    }
    for (const p of o.dueSoon) {
      items.push({ key: `d${p.id}`, title: p.overdue ? `Deadline voorbij: ${p.title}` : `Deadline ${dayLabel(p.dueDate)}: ${p.title}`, sub: "Project", to: `/admin/project/${p.id}`, icon: <Timer />, tone: p.overdue ? "bad" : "warn", when: "", at: 0 });
    }
    for (const t of o.tasks) {
      if (!t.dueAt || new Date(t.dueAt).getTime() > Date.now() + 86400000) continue;
      items.push({ key: `t${t.id}`, title: t.title, sub: t.projectTitle || "Taak", to: t.projectId ? `/admin/project/${t.projectId}` : "/admin/tasks", icon: <CheckSquare />, tone: "", when: dayLabel(t.dueAt), at: 0 });
    }
    return items;
  }, [o]);
}

function NextShoot({ event }: { event: StudioEvent }) {
  const start = toDate(event.startsAt)!;
  const loc = event.location;
  const light = loc ? lightFor(start, loc.lat, loc.lng) : null;
  const weather = useWeather(loc?.lat, loc?.lng, start);
  const w = weather.data;
  const where = loc ? loc.name : event.locationText;
  const route = loc ? mapsLink(loc.lat, loc.lng) : event.locationText ? mapsSearchLink(event.locationText) : null;

  return (
    <article className="s-card s-next-shoot">
      <div className="visual">
        {loc ? <MiniMap lat={loc.lat} lng={loc.lng} bearing={light?.goldenAzimuth} zoom={14.5} /> : (
          <div className="s-ph-empty" style={{ display: "grid", placeItems: "center", color: "var(--faint)" }}>
            <Navigation size={22} />
          </div>
        )}
      </div>
      <div className="info">
        <div className="s-row between">
          <span className="s-eyebrow">Volgende {KIND_LABEL[event.kind].toLowerCase()} · {dayLabel(start)}</span>
          {event.projectId && <Pill tone="acc">{STAGE_LABEL[(event.projectStage || "booked") as keyof typeof STAGE_LABEL] ?? "Gepland"}</Pill>}
        </div>
        <h2 style={{ fontSize: 21 }}>{event.title || event.projectTitle || KIND_LABEL[event.kind]}</h2>
        <dl className="s-facts">
          <dt>Tijd</dt>
          <dd className="s-mono">{event.allDay ? "Hele dag" : `${fmtTime(start)}${event.endsAt ? ` – ${fmtTime(event.endsAt)}` : ""}`}</dd>
          {where && (<><dt>Locatie</dt><dd className="s-truncate">{where}</dd></>)}
          {event.projectTitle && (<><dt>Project</dt><dd className="s-truncate">{event.projectTitle}</dd></>)}
        </dl>
        {light && (
          <div className="s-light-strip" aria-label="Licht op de shootdag">
            <div><b>{fmtTime(light.sunset)}</b><span>Zon onder</span></div>
            <div className="gold"><b>{fmtTime(light.goldenEvening)}</b><span>Golden hour</span></div>
            <div><b>{fmtTime(light.blueHourEnd)}</b><span>Blauw uur tot</span></div>
            <div>
              {w ? <><b>{w.temperature}°</b><span>{w.summary}, {beaufort(w.wind)} Bft</span></> : <><b><Cloud size={13} /></b><span>{weather.isLoading ? "Weer laden" : "Nog geen weer"}</span></>}
            </div>
          </div>
        )}
        {light && <p className="s-small s-muted">Zon op golden hour uit het {compass(light.goldenAzimuth)} ({light.goldenAzimuth}°).</p>}
        <div className="s-row">
          {event.projectId && <Link className="s-btn" to={`/admin/project/${event.projectId}?tab=planning`}>Open project</Link>}
          {route && <a className="s-btn ghost" href={route} target="_blank" rel="noreferrer"><Navigation size={15} />Route</a>}
        </div>
      </div>
    </article>
  );
}

function WeekStrip() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = addDays(start, 7);
  const events = useEvents(start.toISOString(), end.toISOString());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date().toDateString();

  return (
    <Card title="Deze week" action={<Link className="s-btn ghost sm" to="/admin/planning">Naar planning</Link>} bodyClass="none">
      <div className="s-week">
        {days.map((d) => {
          const list = (events.data || []).filter((e) => new Date(e.startsAt).toDateString() === d.toDateString());
          return (
            <div key={d.toISOString()} className={`day ${d.toDateString() === today ? "today" : ""}`}>
              <div className="d"><span className="s-eyebrow">{fmt(d, "EEEEEE")}</span><b>{fmt(d, "d")}</b></div>
              {events.isLoading && <Skeleton h={30} />}
              {list.map((e) => (
                <Link key={e.id} to={e.projectId ? `/admin/project/${e.projectId}` : "/admin/planning"} className={`s-ev ${e.kind}`}>
                  <span className="s-mono">{e.allDay ? KIND_LABEL[e.kind] : fmtTime(e.startsAt)}</span>
                  {e.title || e.projectTitle || KIND_LABEL[e.kind]}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
