import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, FileText, Flame, MousePointerClick, Send, Star, Trash2, Users } from "lucide-react";
import { Link } from "react-router";
import { del, get } from "../../api";
import { ago, fmt, fmtDateTime } from "../../format";
import { useAction } from "../../queries";
import { Button, Card, Empty, ErrorState, Pill, Sheet, SkeletonList, useConfirm } from "../../ui";
import { useUrlState } from "../../urlState";
import { DeviceIcon, deviceName, duration, mediumName, pageName, type Visit, type VisitDetail, type VisitEvent } from "./shared";

// Bezoeken: every visit, newest first, and one visit from start to end.

export function VisitsTab({ query }: { query: string }) {
  const [onlyLeads, setOnlyLeads] = useUrlState<"0" | "1">("aanvragen", "0", ["0", "1"]);
  const [open, setOpen] = useUrlState<string>("bezoek", "");
  const list = useInfiniteQuery({
    queryKey: ["analytics-visits", query, onlyLeads],
    queryFn: ({ pageParam, signal }) =>
      get<{ visits: Visit[]; more: boolean }>(`/admin/analytics/visits?${query}&converted=${onlyLeads}&offset=${pageParam}`, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.more ? all.length * 50 : undefined),
  });
  const visits = list.data?.pages.flatMap((p) => p.visits) || [];

  return (
    <>
      <Card
        title="Bezoeken"
        action={<label className="s-check s-small"><input type="checkbox" checked={onlyLeads === "1"} onChange={(e) => setOnlyLeads(e.target.checked ? "1" : "0")} /> Alleen met een aanvraag</label>}
        bodyClass="none"
      >
        {list.isError ? <ErrorState error={list.error} retry={() => list.refetch()} />
          : list.isLoading ? <SkeletonList rows={6} />
          : visits.length === 0 ? <Empty icon={<Users />} title={onlyLeads === "1" ? "Geen bezoeken met een aanvraag in deze periode" : "Nog geen bezoeken in deze periode"} />
          : (
            <div className="s-table-wrap">
              <table className="s-table a-visits">
                <thead>
                  <tr>
                    <th>Wanneer</th><th>Kwam via</th><th>Apparaat</th><th>Eerste pagina</th>
                    <th className="right">Pagina's</th><th className="right">Tijd</th><th className="right">Kliks</th><th className="right">Gescrold</th><th>Aanvraag</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} className="a-click-row" onClick={() => setOpen(v.id)}>
                      <td>
                        <button type="button" className="a-link" onClick={(e) => { e.stopPropagation(); setOpen(v.id); }}>{fmt(v.started_at, "EEE d MMM, HH:mm")}</button>
                        <div className="s-faint s-small">{ago(v.started_at)}{v.returning && " · kwam eerder"}</div>
                      </td>
                      <td><Source v={v} /></td>
                      <td><span className="s-row nowrap"><DeviceIcon device={v.device} /><span className="s-small">{v.browser}</span></span></td>
                      <td className="s-truncate" style={{ maxWidth: 180 }}>{pageName(v.landing_page)}</td>
                      <td className="right s-mono">{v.pageviews}</td>
                      <td className="right s-mono">{duration(v.active_seconds)}</td>
                      <td className="right s-mono">{v.clicks ?? 0}</td>
                      <td className="right s-mono">{v.scroll == null ? "–" : `${v.scroll}%`}</td>
                      <td>{v.converted_at ? <Pill tone="ok">{v.inquiry || "Ja"}</Pill> : <span className="s-faint">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {list.hasNextPage && (
          <div style={{ padding: 14, textAlign: "center" }}>
            <Button loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>Meer bezoeken</Button>
          </div>
        )}
      </Card>
      <VisitSheet id={open} onOpen={setOpen} onClose={() => setOpen("")} />
    </>
  );
}

function Source({ v }: { v: Visit }) {
  return (
    <div className="s-stack sm">
      <span><b>{v.source}</b> {mediumName(v.medium) !== v.source && <span className="s-faint s-small">{mediumName(v.medium)}</span>}</span>
      {v.campaign && <span><Pill tone="acc">{v.campaign}{v.content ? ` · ${v.content}` : ""}</Pill></span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One visit
// ---------------------------------------------------------------------------

function VisitSheet({ id, onOpen, onClose }: { id: string; onOpen: (id: string) => void; onClose: () => void }) {
  const confirm = useConfirm();
  const data = useQuery({
    queryKey: ["analytics-visit", id],
    queryFn: ({ signal }) => get<VisitDetail>(`/admin/analytics/visit/${id}`, signal),
    enabled: Boolean(id),
  });
  const remove = useAction({
    fn: () => del(`/admin/analytics/visit/${id}`),
    invalidate: () => [["analytics"], ["analytics-visits"], ["analytics-page"]],
    success: "Bezoek telt niet meer mee",
    onSuccess: onClose,
  });
  const v = data.data?.visit;

  return (
    <Sheet
      open={Boolean(id)}
      onOpenChange={(o) => !o && onClose()}
      title={v ? `Bezoek van ${fmtDateTime(v.started_at)}` : "Bezoek"}
      footer={v && (
        <Button variant="ghost" icon={<Trash2 />} onClick={async () => {
          if (await confirm({ title: "Bezoek uit de statistieken halen?", body: "Handig voor een test van je eigen advertentie. Dit kan niet terug.", danger: true, confirm: "Weghalen" })) remove.mutate();
        }}>Telt niet mee</Button>
      )}
    >
      {data.isError ? <ErrorState error={data.error} retry={() => data.refetch()} />
        : !data.data || !v ? <SkeletonList rows={6} />
        : <VisitBody d={data.data} onOpen={onOpen} />}
    </Sheet>
  );
}

function VisitBody({ d, onOpen }: { d: VisitDetail; onOpen: (id: string) => void }) {
  const v = d.visit;
  const start = new Date(v.started_at).getTime();
  const groups = groupByPage(d.events);

  return (
    <div className="s-stack lg">
      <div className="s-stack sm">
        <div className="s-kv"><span>Kwam via</span><span><Source v={v} /></span></div>
        {v.referrer && <div className="s-kv"><span>Vorige site</span><span className="s-mono">{v.referrer}</span></div>}
        {v.term && <div className="s-kv"><span>Zoekwoord</span><span>{v.term}</span></div>}
        <div className="s-kv"><span>Apparaat</span><span className="s-row nowrap" style={{ justifyContent: "flex-end" }}><DeviceIcon device={v.device} />{deviceName(v.device)} · {v.os} · {v.browser}</span></div>
        {v.screen && <div className="s-kv"><span>Scherm</span><span className="s-mono">{v.screen}</span></div>}
        {(v.language || v.timezone) && <div className="s-kv"><span>Taal en tijdzone</span><span>{[v.language, v.timezone].filter(Boolean).join(" · ")}</span></div>}
        <div className="s-kv"><span>Op de site</span><span>{v.pageviews} pagina{v.pageviews === 1 ? "" : "'s"} · {duration(v.active_seconds)}</span></div>
        <div className="s-kv"><span>Eerder geweest</span><span>{d.others.length ? `${d.others.length} keer` : v.returning ? "Ja" : "Nee, eerste keer"}</span></div>
      </div>

      {d.inquiries.length > 0 && (
        <div className="a-lead">
          <CheckCircle2 size={18} />
          <div className="s-stack sm">
            <b>Stuurde een aanvraag</b>
            {d.inquiries.map((i) => <Link key={i.id} to={`/admin/inquiries?open=${i.id}`}>{i.name} · {fmtDateTime(i.created_at)}</Link>)}
          </div>
        </div>
      )}

      <section className="s-stack">
        <h3 className="a-subhead" style={{ padding: 0 }}>Wat er gebeurde</h3>
        {groups.length === 0 ? <p className="s-muted s-small">Van dit bezoek zijn geen details binnengekomen.</p> : (
          <ol className="a-timeline">
            {groups.map((g, i) => (
              <li key={g.page.view_id || i}>
                <div className="a-tl-page">
                  <span className="a-tl-time s-mono">+{duration((new Date(g.page.at).getTime() - start) / 1000)}</span>
                  <FileText size={15} aria-hidden="true" />
                  <div className="s-stack sm" style={{ minWidth: 0 }}>
                    <b>{pageName(g.page.path)}</b>
                    <span className="s-faint s-small">
                      {g.page.duration_ms != null ? `${duration(g.page.duration_ms / 1000)} bekeken` : "geen tijd gemeten"}
                      {g.page.scroll != null && ` · tot ${g.page.scroll}% gescrold`}
                    </span>
                  </div>
                </div>
                {g.items.length > 0 && (
                  <ul className="a-tl-items">
                    {g.items.map((e, j) => (
                      <li key={j}>
                        <span className="a-tl-time s-mono">+{duration((new Date(e.at).getTime() - start) / 1000)}</span>
                        <EventLine e={e} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {d.others.length > 0 && (
        <section className="s-stack sm">
          <h3 className="a-subhead" style={{ padding: 0 }}>Andere bezoeken van deze persoon</h3>
          <ul className="s-list">
            {d.others.map((o) => (
              <li key={o.id}>
                <button type="button" className="a-page-row" onClick={() => onOpen(o.id)}>
                  <span className="s-stack sm" style={{ minWidth: 0 }}>
                    <b>{fmtDateTime(o.started_at)}</b>
                    <span className="s-faint s-small">{o.source} · {mediumName(o.medium)}{o.campaign ? ` · ${o.campaign}` : ""}</span>
                  </span>
                  <span className="s-small s-muted">{o.pageviews} pag. · {duration(o.active_seconds)}{o.converted_at ? " · aanvraag" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function groupByPage(events: VisitEvent[]) {
  const groups: { page: VisitEvent; items: VisitEvent[] }[] = [];
  const byView = new Map<string, { page: VisitEvent; items: VisitEvent[] }>();
  for (const e of events) {
    if (e.type === "pageview") {
      const g = { page: e, items: [] as VisitEvent[] };
      groups.push(g);
      byView.set(e.view_id, g);
    } else {
      (byView.get(e.view_id) || groups[groups.length - 1])?.items.push(e);
    }
  }
  return groups;
}

const q = (s: string) => `“${s}”`;

/** One thing a visitor did, as a sentence. */
function EventLine({ e }: { e: VisitEvent }) {
  const p = e.props || {};
  if (e.type === "click") {
    const what = e.label ? q(e.label) : p.kind === "other" ? `de pagina (${e.target})` : `een ${p.kind === "link" ? "link" : "knop"}`;
    return (
      <span className="a-tl-line">
        <MousePointerClick size={14} aria-hidden="true" />
        <span>
          {p.kind === "field" ? `Klikte in veld ${what}` : `Klikte op ${what}`}
          {p.kind === "link" && <span className="s-faint s-mono"> → {e.target}</span>}
          {p.rage && <span className="a-rage"><Flame size={12} aria-hidden="true" /> snel achter elkaar</span>}
        </span>
      </span>
    );
  }
  if (e.type === "form") {
    const text = p.step === "start" ? `Begon aan ${e.label}${p.field ? ` (bij ${q(p.field)})` : ""}`
      : p.step === "submit" ? `Drukte op versturen (${e.label})`
      : `Stopte met ${e.label}${p.field ? `, laatst bij ${q(p.field)}` : ""}`;
    return <span className={`a-tl-line${p.step === "abandon" ? " warn" : ""}`}><ClipboardList size={14} aria-hidden="true" /><span>{text}</span></span>;
  }
  if (e.label === "Aanvraag") return <span className="a-tl-line ok"><Send size={14} aria-hidden="true" /><b>Stuurde een aanvraag</b>{p.pakket && <span className="s-faint"> · {p.pakket}</span>}</span>;
  const extra = Object.values(p).filter(Boolean).join(" · ");
  const text = e.label === "Pakket gekozen" ? `Koos een pakket${extra ? `: ${extra}` : ""}`
    : e.label === "Telefoon" ? "Tikte op het telefoonnummer"
    : e.label === "E-mail" ? "Tikte op het e-mailadres"
    : e.label === "WhatsApp" ? "Opende WhatsApp"
    : `${e.label}${extra ? `: ${extra}` : ""}`;
  return <span className="a-tl-line ok"><Star size={14} aria-hidden="true" /><span>{text}</span></span>;
}
