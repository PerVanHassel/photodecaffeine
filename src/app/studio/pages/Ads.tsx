import { useQuery } from "@tanstack/react-query";
import { Copy, EyeOff, Link2, Megaphone, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { get, put } from "../api";
import { ago, fmt } from "../format";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, Input, Modal, PageHead, Pill, Segmented, SelectField, SkeletonList, TextField } from "../ui";
import { copyText } from "./Money";

type AdsData = {
  visits: { ref: string; page: string; createdAt: string }[];
  leads: { id: string; name: string; ref: string; createdAt: string }[];
  campaigns: { ref: string; label: string; active: boolean; hidden: boolean }[];
};
type Period = "7" | "30" | "90" | "365";
const PAGES = [
  { path: "/", label: "Home" },
  { path: "/services/automotive", label: "Automotive" },
  { path: "/services/social-media", label: "Social media" },
  { path: "/portfolio", label: "Portfolio" },
];

const key = ["ads"] as const;

export function AdsPage() {
  const data = useQuery({ queryKey: key, queryFn: () => get<AdsData>("/admin/ads") });
  const [period, setPeriod] = useState<Period>("30");
  const [showHidden, setShowHidden] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const cutoff = Date.now() - Number(period) * 86400000;
  const meta = new Map((data.data?.campaigns || []).map((c) => [c.ref, c]));

  const campaigns = useMemo(() => {
    const map = new Map<string, { ref: string; page: string; visits: number; leads: number; last: string }>();
    const get1 = (ref: string, page = "") => {
      if (!map.has(ref)) map.set(ref, { ref, page, visits: 0, leads: 0, last: "" });
      return map.get(ref)!;
    };
    for (const v of data.data?.visits || []) {
      if (+new Date(v.createdAt) < cutoff) continue;
      const c = get1(v.ref || "(zonder ref)", v.page);
      c.visits++;
      c.page ||= v.page;
      if (v.createdAt > c.last) c.last = v.createdAt;
    }
    for (const l of data.data?.leads || []) {
      if (+new Date(l.createdAt) < cutoff) continue;
      const c = get1(l.ref);
      c.leads++;
      if (l.createdAt > c.last) c.last = l.createdAt;
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads || b.visits - a.visits);
  }, [data.data, cutoff]);

  const visible = campaigns.filter((c) => showHidden || !meta.get(c.ref)?.hidden);
  const totalVisits = visible.reduce((s, c) => s + c.visits, 0);
  const totalLeads = visible.reduce((s, c) => s + c.leads, 0);

  const series = useMemo(() => {
    const days = Math.min(Number(period), 90);
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) buckets.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 0);
    for (const v of data.data?.visits || []) {
      const d = v.createdAt.slice(0, 10);
      if (buckets.has(d) && !meta.get(v.ref)?.hidden) buckets.set(d, (buckets.get(d) || 0) + 1);
    }
    return [...buckets.entries()].map(([date, visits]) => ({ date, visits }));
  }, [data.data, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useAction({
    fn: (v: { ref: string; patch: { label?: string; active?: boolean; hidden?: boolean } }) => put(`/admin/ads/${encodeURIComponent(v.ref)}`, v.patch),
    invalidate: () => [key],
  });

  return (
    <div className="s-view">
      <PageHead
        title="Advertenties"
        sub="Bezoekers die via een advertentielink binnenkomen, en hoeveel daarvan een aanvraag sturen."
        actions={<Button variant="primary" icon={<Link2 />} onClick={() => setLinkOpen(true)}>Campagnelink maken</Button>}
      />
      <div className="s-row between">
        <Segmented<Period> label="Periode" value={period} onChange={setPeriod} options={[{ value: "7", label: "7 dagen" }, { value: "30", label: "30 dagen" }, { value: "90", label: "90 dagen" }, { value: "365", label: "Jaar" }]} />
        <label className="s-check s-small"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Toon verborgen campagnes</label>
      </div>
      {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
      <Card bodyClass="none">
        <div className="s-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div><b>{totalVisits}</b><span>Bezoeken</span></div>
          <div><b>{totalLeads}</b><span>Aanvragen</span></div>
          <div><b>{totalVisits ? `${((totalLeads / totalVisits) * 100).toFixed(1).replace(".", ",")}%` : "–"}</b><span>Conversie</span></div>
        </div>
        <div style={{ height: 180, padding: "8px 12px 12px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="ads-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b06a2c" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#b06a2c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ecebe7" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => fmt(d, "d MMM")} tick={{ fontSize: 11, fill: "#948c83" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#948c83" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip labelFormatter={(d) => fmt(String(d), "EEE d MMM")} formatter={(v) => [v, "Bezoeken"]} contentStyle={{ borderRadius: 8, border: "1px solid #ecebe7", fontSize: 12 }} />
              <Area type="monotone" dataKey="visits" stroke="#b06a2c" strokeWidth={2} fill="url(#ads-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Campagnes" bodyClass="none">
        {data.isLoading ? <SkeletonList rows={3} /> : visible.length === 0 ? (
          <Empty icon={<Megaphone />} title="Nog geen bezoekers via advertenties" action={<Button onClick={() => setLinkOpen(true)}>Maak een campagnelink</Button>}>
            Zet een link met ?ref=naam in je advertentie; bezoeken komen dan hier binnen.
          </Empty>
        ) : (
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Campagne</th><th>Pagina</th><th className="right">Bezoeken</th><th className="right">Aanvragen</th><th className="right">Conversie</th><th>Laatst</th><th>Actief</th><th /></tr></thead>
              <tbody>
                {visible.map((c) => {
                  const m = meta.get(c.ref);
                  return (
                    <tr key={c.ref} style={m?.hidden ? { opacity: 0.55 } : undefined}>
                      <td>
                        <Input aria-label="Naam van de campagne" defaultValue={m?.label || ""} placeholder={c.ref} style={{ padding: "4px 8px", fontSize: 13, width: 190 }}
                          onBlur={(e) => { if (e.target.value !== (m?.label || "")) update.mutate({ ref: c.ref, patch: { label: e.target.value } }); }} />
                        <div className="s-mono s-faint" style={{ fontSize: 11, marginTop: 2 }}>ref={c.ref}</div>
                      </td>
                      <td className="s-muted">{c.page || "–"}</td>
                      <td className="right s-mono">{c.visits}</td>
                      <td className="right s-mono">{c.leads}</td>
                      <td className="right s-mono">{c.visits ? `${((c.leads / c.visits) * 100).toFixed(1).replace(".", ",")}%` : "–"}</td>
                      <td className="s-muted s-small">{c.last ? ago(c.last) : "–"}</td>
                      <td>
                        <button type="button" className="s-pill" style={{ border: 0, cursor: "pointer", ...(m?.active === false ? {} : { background: "var(--ok-soft)", color: "var(--ok)" }) }}
                          aria-pressed={m?.active !== false} onClick={() => update.mutate({ ref: c.ref, patch: { active: m?.active === false } })}>
                          {m?.active === false ? "Gestopt" : "Loopt"}
                        </button>
                      </td>
                      <td className="right">
                        <div className="s-row nowrap" style={{ justifyContent: "flex-end" }}>
                          <Button size="sm" variant="ghost" iconOnly title="Link kopiëren" aria-label="Link kopiëren" icon={<Copy />} onClick={() => copyText(`https://www.photodecaffeine.com${c.page || "/"}?ref=${c.ref}`)} />
                          <Button size="sm" variant="ghost" iconOnly title={m?.hidden ? "Weer tonen" : "Verbergen"} aria-label={m?.hidden ? "Weer tonen" : "Verbergen"}
                            icon={m?.hidden ? <Undo2 /> : <EyeOff />} onClick={() => update.mutate({ ref: c.ref, patch: { hidden: !m?.hidden } })} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}

function LinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [page, setPage] = useState("/services/automotive");
  const ref = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = `https://www.photodecaffeine.com${page}?ref=${ref || "campagne"}`;
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Campagnelink maken" description="Gebruik deze link in je advertentie. Bezoeken en aanvragen via deze link tellen dan voor deze campagne."
      footer={<><Button onClick={onClose}>Sluiten</Button><Button variant="primary" icon={<Copy />} disabled={!ref} onClick={() => copyText(url)}>Kopieer link</Button></>}>
      <TextField label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. insta automotive najaar" />
      <SelectField label="Landingspagina" value={page} onChange={(e) => setPage(e.target.value)}>
        {PAGES.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
      </SelectField>
      <div className="s-mono s-small" style={{ padding: 10, background: "var(--sunken)", borderRadius: 8, overflowWrap: "anywhere" }}>{url}</div>
      <Pill plain>ref={ref || "…"}</Pill>
    </Modal>
  );
}
