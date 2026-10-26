import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BarChart3, Link2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { get } from "../api";
import { fmt } from "../format";
import { Button, Card, Empty, ErrorState, PageHead, Segmented, Select, SkeletonList } from "../ui";
import { useUrlState } from "../urlState";
import { CampaignsTab, LinkDialog } from "./ads/Campaigns";
import { PagesTab } from "./ads/Pages";
import { VisitsTab } from "./ads/Visits";
import {
  type AdsMeta, Delta, type Device, DeviceIcon, deviceName, duration, mediumName, pageName, type Period, PERIODS, share, type Summary,
} from "./ads/shared";
import "./ads/ads.css";

// Advertenties: the site's own visitor statistics (src/app/lib/analytics.ts)
// with the ad campaigns on top. Every filter is in the address, so a view can
// be reloaded or sent to someone else.

const TABS = [
  { id: "overzicht", label: "Overzicht" },
  { id: "campagnes", label: "Campagnes" },
  { id: "paginas", label: "Pagina's" },
  { id: "bezoeken", label: "Bezoeken" },
] as const;
type Tab = (typeof TABS)[number]["id"];

// Two series, checked for colour blindness against the white card.
const AD_COLOR = "#b06a2c";
const OTHER_COLOR = "#2f64a0";

const n = (v: number) => v.toLocaleString("nl-NL");

export function AdsPage() {
  const [tab, setTab] = useUrlState<Tab>("tab", "overzicht", TABS.map((t) => t.id));
  const [period, setPeriod] = useUrlState<Period>("periode", "30", PERIODS.map((p) => p.value));
  const [segment, setSegment] = useUrlState<string>("segment", "all");
  const [device, setDevice] = useUrlState<Device>("apparaat", "all", ["all", "mobile", "desktop", "tablet"]);
  const [linkOpen, setLinkOpen] = useState(false);

  const query = new URLSearchParams({ days: period, segment: segment === "all" ? "" : segment, device: device === "all" ? "" : device }).toString();
  const summary = useQuery({
    queryKey: ["analytics", query],
    queryFn: ({ signal }) => get<Summary>(`/admin/analytics?${query}`, signal),
    placeholderData: keepPreviousData,
  });
  const meta = useQuery({ queryKey: ["ads"], queryFn: ({ signal }) => get<AdsMeta>("/admin/ads", signal) });

  const labels = new Map((meta.data?.campaigns || []).map((c) => [c.ref, c.label]));
  const campaignRefs = [...new Set([...(meta.data?.campaigns || []).filter((c) => !c.hidden).map((c) => c.ref), ...(meta.data?.visits || []).map((v) => v.ref)])].filter(Boolean);
  const sources = [...new Set([...(summary.data?.sources || []).map((s) => s.source), ...(segment.startsWith("s:") ? [segment.slice(2)] : [])])];

  return (
    <div className="s-view">
      <PageHead
        title="Advertenties"
        sub="Waar bezoekers vandaan komen, wat ze op de site doen en wat je advertenties opleveren."
        actions={<Button variant="primary" icon={<Link2 />} onClick={() => setLinkOpen(true)}>Campagnelink maken</Button>}
      />

      <div className="a-filters" role="group" aria-label="Filters">
        <Segmented<Period> label="Periode" value={period} onChange={setPeriod} options={PERIODS} />
        <Select aria-label="Welke bezoekers" value={segment} onChange={(e) => setSegment(e.target.value)} style={{ width: "auto", minWidth: 220 }}>
          <option value="all">Alle bezoekers</option>
          <option value="ads">Alleen via advertenties</option>
          <option value="organic">Alles behalve advertenties</option>
          {campaignRefs.length > 0 && (
            <optgroup label="Campagne">
              {campaignRefs.map((ref) => <option key={ref} value={`c:${ref}`}>{labels.get(ref) || ref}</option>)}
            </optgroup>
          )}
          {sources.length > 0 && (
            <optgroup label="Bron">
              {sources.map((s) => <option key={s} value={`s:${s}`}>{s}</option>)}
            </optgroup>
          )}
        </Select>
        <Segmented<Device> label="Apparaat" value={device} onChange={setDevice} options={[
          { value: "all", label: "Alle apparaten" },
          { value: "mobile", label: "Telefoon" },
          { value: "desktop", label: "Computer" },
          { value: "tablet", label: "Tablet" },
        ]} />
      </div>

      <div className="s-tabs" role="tablist" aria-label="Onderdelen">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={t.id === tab} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div role="tabpanel">
        {summary.isError ? <ErrorState error={summary.error} retry={() => summary.refetch()} />
          : tab === "overzicht" ? <Overview data={summary.data} loading={summary.isLoading} onLink={() => setLinkOpen(true)} />
          : tab === "campagnes" ? <CampaignsTab summary={summary.data} meta={meta.data} loading={summary.isLoading || meta.isLoading} period={period}
              onOpen={(ref) => { setSegment(`c:${ref}`); setTab("overzicht"); }} onLink={() => setLinkOpen(true)} />
          : tab === "paginas" ? <PagesTab summary={summary.data} query={query} device={device} />
          : <VisitsTab query={query} />}
      </div>

      <p className="s-small s-faint">
        Alles staat in onze eigen database; er gaat niets naar Google, Meta of een ander bedrijf. Wie in de admin of de app inlogt, telt op dat apparaat niet meer mee.
      </p>
      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overzicht
// ---------------------------------------------------------------------------

function Overview({ data, loading, onLink }: { data?: Summary; loading: boolean; onLink: () => void }) {
  if (loading || !data) return <Card><SkeletonList rows={4} /></Card>;
  const t = data.totals;
  const p = data.previous;
  if (!t.sessions) {
    return (
      <Card>
        <Empty icon={<BarChart3 />} title="Nog geen bezoeken in deze periode" action={<Button onClick={onLink}>Maak een campagnelink</Button>}>
          Zodra iemand de site bezoekt, verschijnt het hier: waar ze vandaan kwamen, hoe ver ze scrollden en waar ze op klikten.
        </Empty>
      </Card>
    );
  }
  const bounce = t.sessions ? t.bounces / t.sessions : 0;
  const bouncePrev = p.sessions ? p.bounces / p.sessions : 0;
  const conv = t.sessions ? t.conversions / t.sessions : 0;
  const convPrev = p.sessions ? p.conversions / p.sessions : 0;

  return (
    <div className="s-stack lg">
      <Card bodyClass="none">
        <div className="s-stats a-kpis">
          <Kpi label="Bezoekers" value={n(t.visitors)} hint={t.returning ? `${n(t.returning)} kwam eerder al eens` : undefined}><Delta now={t.visitors} before={p.visitors} /></Kpi>
          <Kpi label="Bezoeken" value={n(t.sessions)} hint={`${n(t.pageviews)} pagina's bekeken`}><Delta now={t.sessions} before={p.sessions} /></Kpi>
          <Kpi label="Gem. tijd op de site" value={duration(t.seconds)}><Delta now={t.seconds} before={p.seconds} /></Kpi>
          <Kpi label="Direct weggeklikt" value={share(t.bounces, t.sessions)} hint="1 pagina, korter dan 10 sec"><Delta now={bounce} before={bouncePrev} lowerIsBetter /></Kpi>
          <Kpi label="Aanvragen" value={n(t.conversions)}><Delta now={t.conversions} before={p.conversions} /></Kpi>
          <Kpi label="Conversie" value={share(t.conversions, t.sessions)} hint="Bezoeken met een aanvraag"><Delta now={conv} before={convPrev} /></Kpi>
        </div>
      </Card>

      <Card
        title="Bezoeken per dag"
        action={<div className="a-legend"><span><i style={{ background: AD_COLOR }} />Via advertentie</span><span><i style={{ background: OTHER_COLOR }} />Overig</span></div>}
      >
        <DailyChart data={data.daily} />
      </Card>

      <div className="s-grid-2 even">
        <Card title="Van bezoek naar aanvraag"><Funnel f={data.funnel} /></Card>
        <Card title="Apparaten">
          <Devices data={data} />
        </Card>
      </div>

      <div className="s-grid-2 even">
        <Card title="Waar komen ze vandaan" bodyClass="none">
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Bron</th><th className="right">Bezoeken</th><th className="right">Weggeklikt</th><th className="right">Tijd</th><th className="right">Aanvragen</th></tr></thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={`${s.source}|${s.medium}`}>
                    <td><b>{s.source}</b>{mediumName(s.medium) !== s.source && <div className="s-faint s-small">{mediumName(s.medium)}</div>}</td>
                    <td className="right s-mono">{n(s.sessions)}</td>
                    <td className="right s-mono">{share(s.bounces, s.sessions)}</td>
                    <td className="right s-mono">{duration(s.seconds)}</td>
                    <td className="right s-mono">{s.conversions || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Waar komen ze binnen" bodyClass="none">
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Eerste pagina</th><th className="right">Bezoeken</th><th className="right">Weggeklikt</th><th className="right">Gescrold</th><th className="right">Aanvragen</th></tr></thead>
              <tbody>
                {data.landing.map((l) => (
                  <tr key={l.path}>
                    <td style={{ maxWidth: 200 }}><b className="s-truncate" style={{ display: "block" }}>{pageName(l.path)}</b><div className="s-faint s-small s-mono s-truncate">{l.path}</div></td>
                    <td className="right s-mono">{n(l.sessions)}</td>
                    <td className="right s-mono">{share(l.bounces, l.sessions)}</td>
                    <td className="right s-mono">{l.scroll === null ? "–" : `${l.scroll}%`}</td>
                    <td className="right s-mono">{l.conversions || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="s-grid-2 even">
        <Card title="Wanneer komen ze"><Hours hours={data.hours} /></Card>
        <Card title="Wat ze doen" bodyClass="none">
          {data.events.length === 0 ? <p className="s-muted s-small" style={{ padding: 18 }}>Nog geen pakketkeuzes, telefoontjes of aanvragen in deze periode.</p> : (
            <ul className="s-list">
              {data.events.map((e) => (
                <li key={e.label} className="a-line">
                  <span>{e.label}</span>
                  <span className="s-mono">{n(e.count)}<span className="s-faint"> · {n(e.sessions)} bezoek{e.sessions === 1 ? "" : "en"}</span></span>
                </li>
              ))}
            </ul>
          )}
          {data.referrers.length > 0 && (
            <>
              <h3 className="a-subhead">Van welke sites ze kwamen</h3>
              <ul className="s-list">
                {data.referrers.map((r) => (
                  <li key={r.referrer} className="a-line">
                    <span className="s-truncate">{r.referrer}</span>
                    <span className="s-mono">{n(r.sessions)}{r.conversions ? <span className="s-faint"> · {r.conversions} aanvr.</span> : null}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: ReactNode }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
      <div className="a-kpi-foot">{children}{hint && <span className="s-faint">{hint}</span>}</div>
    </div>
  );
}

function DayTip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Summary["daily"][number];
  return (
    <div className="a-tip">
      <b>{fmt(d.day, "EEEE d MMMM")}</b>
      <div><i style={{ background: AD_COLOR }} />Via advertentie <span className="s-mono">{d.paid}</span></div>
      <div><i style={{ background: OTHER_COLOR }} />Overig <span className="s-mono">{d.sessions - d.paid}</span></div>
      <div className="s-faint">Aanvragen <span className="s-mono">{d.conversions}</span></div>
    </div>
  );
}

function DailyChart({ data }: { data: Summary["daily"] }) {
  const rows = data.map((d) => ({ ...d, other: d.sessions - d.paid }));
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="20%">
          <CartesianGrid stroke="#ecebe7" vertical={false} />
          <XAxis dataKey="day" tickFormatter={(d) => fmt(String(d), "d MMM")} tick={{ fontSize: 11, fill: "#948c83" }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#948c83" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<DayTip />} cursor={{ fill: "#f3f1ec" }} />
          <Bar dataKey="paid" stackId="v" fill={AD_COLOR} maxBarSize={24} stroke="#fff" strokeWidth={1} isAnimationActive={false} />
          <Bar dataKey="other" stackId="v" fill={OTHER_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} stroke="#fff" strokeWidth={1} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Each step as a share of all visits, with how many dropped off since the step before. */
function Funnel({ f }: { f: Summary["funnel"] }) {
  const steps = [
    { label: "Bezochten de site", value: f.sessions },
    { label: "Bleven langer dan 10 sec of keken verder", value: f.engaged },
    { label: "Klikten op een knop, link of veld", value: f.clicked },
    { label: "Begonnen aan een formulier", value: f.form },
    { label: "Stuurden een aanvraag", value: f.converted },
  ];
  return (
    <ol className="a-funnel">
      {steps.map((s, i) => {
        const before = i ? steps[i - 1].value : 0;
        const lost = i && before ? (before - s.value) / before : 0;
        return (
          <li key={s.label}>
            <div className="a-funnel-text">
              <span>{s.label}</span>
              <span className="s-mono"><b>{n(s.value)}</b> <span className="s-faint">{share(s.value, f.sessions)}</span></span>
            </div>
            <div className="a-bar"><i style={{ width: `${f.sessions ? (s.value / f.sessions) * 100 : 0}%` }} /></div>
            {i > 0 && lost > 0 && <span className="a-drop">{Math.round(lost * 100)}% haakt hier af</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Devices({ data }: { data: Summary }) {
  const total = data.totals.sessions;
  return (
    <div className="s-stack">
      {data.devices.map((d) => (
        <div key={d.device} className="s-stack sm">
          <div className="a-funnel-text">
            <span className="s-row nowrap"><DeviceIcon device={d.device} />{deviceName(d.device)}</span>
            <span className="s-mono"><b>{n(d.sessions)}</b> <span className="s-faint">{share(d.sessions, total)}</span></span>
          </div>
          <div className="a-bar"><i style={{ width: `${total ? (d.sessions / total) * 100 : 0}%` }} /></div>
          <span className="s-faint s-small">{share(d.bounces, d.sessions)} weggeklikt · {d.conversions} aanvra{d.conversions === 1 ? "ag" : "gen"}</span>
        </div>
      ))}
    </div>
  );
}

const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/** Visits by weekday and hour, Dutch time: one hue, darker is more. */
function Hours({ hours }: { hours: Summary["hours"] }) {
  const grid = new Map(hours.map(([d, h, c]) => [`${d}-${h}`, c]));
  const max = Math.max(1, ...hours.map((x) => x[2]));
  const busiest = hours.length ? [...hours].sort((a, b) => b[2] - a[2])[0] : null;
  return (
    <div className="s-stack">
      <div className="a-hours" role="table" aria-label="Bezoeken per dag van de week en uur">
        <div role="row" className="a-hours-row">
          <span />
          {Array.from({ length: 24 }, (_, h) => <span key={h} className="a-hours-h" role="columnheader">{h % 3 === 0 ? h : ""}</span>)}
        </div>
        {DAYS.map((day, i) => (
          <div role="row" key={day} className="a-hours-row">
            <span role="rowheader" className="a-hours-d">{day}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const c = grid.get(`${i + 1}-${h}`) || 0;
              return (
                <span key={h} role="cell" className="a-cell" title={`${day} ${h}:00 – ${c} bezoek${c === 1 ? "" : "en"}`}
                  style={{ background: c ? `rgba(176, 106, 44, ${0.12 + (c / max) * 0.88})` : undefined }} />
              );
            })}
          </div>
        ))}
      </div>
      {busiest && <p className="s-small s-muted">Drukst: <b>{DAYS[busiest[0] - 1]} rond {busiest[1]}:00</b>.</p>}
    </div>
  );
}
