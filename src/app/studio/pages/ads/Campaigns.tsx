import { Copy, Eye, EyeOff, Megaphone, Undo2 } from "lucide-react";
import { useState } from "react";
import { put } from "../../api";
import { ago } from "../../format";
import { useAction } from "../../queries";
import { Button, Card, Empty, Input, Modal, Pill, SelectField, SkeletonList, TextField } from "../../ui";
import { copyText } from "../Money";
import { type AdsMeta, campaignUrl, duration, LANDING_PAGES, pageName, share, type Summary } from "./shared";

/** The first day of the site's own statistics. Ad visits before it were only counted. */
const STATS_START = "2026-10-26";

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google" },
  { value: "", label: "Anders" },
];

type Patch = { label?: string; active?: boolean; hidden?: boolean };

export function CampaignsTab({ summary, meta, loading, onOpen, onLink }: {
  summary?: Summary;
  meta?: AdsMeta;
  loading: boolean;
  period: string;
  onOpen: (ref: string) => void;
  onLink: () => void;
}) {
  const [showHidden, setShowHidden] = useState(false);
  const update = useAction({
    fn: (v: { ref: string; patch: Patch }) => put(`/admin/ads/${encodeURIComponent(v.ref)}`, v.patch),
    invalidate: () => [["ads"]],
  });
  if (loading) return <Card><SkeletonList rows={3} /></Card>;

  const settings = new Map((meta?.campaigns || []).map((c) => [c.ref, c]));
  const stats = new Map((summary?.campaigns || []).map((c) => [c.campaign, c]));
  const older = new Map<string, number>();
  for (const v of meta?.visits || []) if (v.ref && v.createdAt < STATS_START) older.set(v.ref, (older.get(v.ref) || 0) + 1);

  const rows = [...new Set([...stats.keys(), ...settings.keys(), ...older.keys()])]
    .map((ref) => ({ ref, s: stats.get(ref), m: settings.get(ref), old: older.get(ref) || 0 }))
    .filter((r) => showHidden || !r.m?.hidden)
    .sort((a, b) => (b.s?.conversions || 0) - (a.s?.conversions || 0) || (b.s?.sessions || 0) - (a.s?.sessions || 0) || b.old - a.old);
  const hiddenCount = [...settings.values()].filter((c) => c.hidden).length;
  const variants = summary?.variants || [];

  return (
    <div className="s-stack lg">
      <Card
        title="Campagnes"
        action={hiddenCount > 0 ? (
          <label className="s-check s-small"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Toon verborgen ({hiddenCount})</label>
        ) : undefined}
        bodyClass="none"
      >
        {rows.length === 0 ? (
          <Empty icon={<Megaphone />} title="Nog geen campagnes" action={<Button onClick={onLink}>Maak een campagnelink</Button>}>
            Zet een campagnelink in je advertentie. Elk bezoek via die link komt hier, met wat die bezoeker daarna deed.
          </Empty>
        ) : (
          <div className="s-table-wrap">
            <table className="s-table a-campaigns">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th className="right">Bezoeken</th>
                  <th className="right" title="Eén pagina, korter dan 10 seconden">Weggeklikt</th>
                  <th className="right">Tijd</th>
                  <th className="right" title="Hoe ver ze gemiddeld scrolden op de eerste pagina">Gescrold</th>
                  <th className="right" title="Klikten op een knop, link of invulveld">Klikten</th>
                  <th className="right" title="Begonnen aan een formulier">Formulier</th>
                  <th className="right">Aanvragen</th>
                  <th className="right">Conversie</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ref, s, m, old }) => (
                  <tr key={ref} style={m?.hidden ? { opacity: 0.55 } : undefined}>
                    <td>
                      <Input aria-label={`Naam van campagne ${ref}`} defaultValue={m?.label || ""} placeholder={ref} className="a-name"
                        onBlur={(e) => { if (e.target.value !== (m?.label || "")) update.mutate({ ref, patch: { label: e.target.value } }); }} />
                      <div className="s-faint s-small">
                        <span className="s-mono">ref={ref}</span>
                        {s?.page && <> · {pageName(s.page)}</>}
                        {s?.last && <> · laatst {ago(s.last)}</>}
                      </div>
                      {old > 0 && <div className="s-faint s-small">{old} bezoeken vóór 26 okt (alleen geteld)</div>}
                      <div className="s-row nowrap" style={{ marginTop: 6, gap: 2 }}>
                        <button type="button" className="s-pill" style={{ border: 0, cursor: "pointer", ...(m?.active === false ? {} : { background: "var(--ok-soft)", color: "var(--ok)" }) }}
                          aria-pressed={m?.active !== false} title="Zet op gestopt als de advertentie niet meer loopt"
                          onClick={() => update.mutate({ ref, patch: { active: m?.active === false } })}>
                          {m?.active === false ? "Gestopt" : "Loopt"}
                        </button>
                        <Button size="sm" variant="ghost" iconOnly title="Bekijk alles van deze campagne" aria-label="Bekijk alles van deze campagne" icon={<Eye />} onClick={() => onOpen(ref)} />
                        <Button size="sm" variant="ghost" iconOnly title="Link kopiëren" aria-label="Link kopiëren" icon={<Copy />}
                          onClick={() => copyText(campaignUrl(s?.page || "/", ref))} />
                        <Button size="sm" variant="ghost" iconOnly title={m?.hidden ? "Weer tonen" : "Verbergen"} aria-label={m?.hidden ? "Weer tonen" : "Verbergen"}
                          icon={m?.hidden ? <Undo2 /> : <EyeOff />} onClick={() => update.mutate({ ref, patch: { hidden: !m?.hidden } })} />
                      </div>
                    </td>
                    <td className="right s-mono">{s?.sessions ?? 0}</td>
                    <td className="right s-mono">{s ? share(s.bounces, s.sessions) : "–"}</td>
                    <td className="right s-mono">{s ? duration(s.seconds) : "–"}</td>
                    <td className="right s-mono">{s?.scroll == null ? "–" : `${s.scroll}%`}</td>
                    <td className="right s-mono">{s ? share(s.clicked, s.sessions) : "–"}</td>
                    <td className="right s-mono">{s?.forms ?? "–"}</td>
                    <td className="right s-mono"><b>{s?.conversions ?? 0}</b></td>
                    <td className="right s-mono">{s ? share(s.conversions, s.sessions) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {variants.length > 0 && (
        <Card title="Per advertentie" bodyClass="none">
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Campagne</th><th>Advertentie</th><th className="right">Bezoeken</th><th className="right">Weggeklikt</th><th className="right">Tijd</th><th className="right">Gescrold</th><th className="right">Aanvragen</th></tr></thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={`${v.campaign}|${v.content}`}>
                    <td className="s-muted">{settings.get(v.campaign)?.label || v.campaign}</td>
                    <td><b>{v.content}</b></td>
                    <td className="right s-mono">{v.sessions}</td>
                    <td className="right s-mono">{share(v.bounces, v.sessions)}</td>
                    <td className="right s-mono">{duration(v.seconds)}</td>
                    <td className="right s-mono">{v.scroll == null ? "–" : `${v.scroll}%`}</td>
                    <td className="right s-mono">{v.conversions || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Zo zie je per advertentie wat die doet">
        <div className="s-stack sm s-small">
          <p>Zet in Meta Ads Manager, bij de advertentie onder <b>URL-parameters</b>:</p>
          <code className="a-code">utm_content={"{{ad.name}}"}</code>
          <p className="s-muted">Meta vult dan zelf de naam van de advertentie in. Hierboven komt een tabel met per advertentie de bezoeken en aanvragen.</p>
        </div>
      </Card>
    </div>
  );
}

export function LinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [page, setPage] = useState(LANDING_PAGES[0].path);
  const [platform, setPlatform] = useState("instagram");
  const [variant, setVariant] = useState("");
  const ref = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = campaignUrl(page, ref || "campagne", platform, variant.trim());
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Campagnelink maken"
      description="Gebruik deze link in je advertentie. Alles wat bezoekers via deze link doen, komt onder deze campagne."
      footer={<><Button onClick={onClose}>Sluiten</Button><Button variant="primary" icon={<Copy />} disabled={!ref} onClick={() => copyText(url)}>Kopieer link</Button></>}>
      <TextField label="Naam van de campagne" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. insta automotive najaar" />
      <SelectField label="Landingspagina" value={page} onChange={(e) => setPage(e.target.value)}>
        {LANDING_PAGES.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
      </SelectField>
      <SelectField label="Waar loopt de advertentie" value={platform} onChange={(e) => setPlatform(e.target.value)}>
        {PLATFORMS.map((p) => <option key={p.label} value={p.value}>{p.label}</option>)}
      </SelectField>
      <TextField label="Advertentie (mag leeg)" hint="Een naam voor deze ene advertentie, als je er meer in de campagne hebt. Bijv. video-1." value={variant} onChange={(e) => setVariant(e.target.value)} />
      <div className="s-mono s-small" style={{ padding: 10, background: "var(--sunken)", borderRadius: 8, overflowWrap: "anywhere" }}>{url}</div>
      <Pill plain>ref={ref || "…"}</Pill>
    </Modal>
  );
}
