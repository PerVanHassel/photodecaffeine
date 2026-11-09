import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, ExternalLink, Link2, QrCode, RefreshCw, Rocket, Trash2, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { del, errorMessage, post, put } from "../../api";
import { ago, euro, fmt, fmtDate, fmtDateTime } from "../../format";
import { copyText } from "../../gallery/share";
import { saveFile } from "../../portal/data";
import { keys, useAction, useInsights } from "../../queries";
import type { GalleryInsights, Project, ShareGuest, ShareState } from "../../types";
import { Button, Card, cx, Empty, ErrorState, Input, isVideo, Modal, Photo, Pill, Skeleton, Switch, TextField, useConfirm } from "../../ui";
import { csvCell, useGroupLink } from "./GroupLink";

// Who sees the gallery and how: the Watermerk switch, the group link that goes
// round a team or a family, selling photos with an account, voorrang, and
// everything that happened: visitors, sales and every download.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** "5", "7,50": an amount as someone would type it. */
const moneyText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
const toNumber = (s: string) => Number(s.replace(",", "."));

type ShareBody = Partial<{
  active: boolean; downloads: boolean; consentRequired: boolean; priority: boolean; priorityPrice: number; priorityDays: number;
  sales: boolean; photoPrice: number; photoPriceNormal: number; bundleSize: number; bundlePrice: number; discountUntil: string;
}>;

/** The access switches as they are now, also for galleries from before the switch. */
function accessOf(p: Project) {
  const gs = p.gallerySettings;
  const legacy = typeof gs.watermark !== "boolean";
  return {
    legacy,
    watermark: legacy ? gs.earlyDownloads === "watermark" && !p.galleryDelivered : !!gs.watermark,
    clientOriginals: !!gs.clientOriginals,
    clientDownloads: legacy ? gs.earlyDownloads !== "none" : gs.clientDownloads !== false,
  };
}

export function SharingTab({ project: p }: { project: Project }) {
  const state = useGroupLink(p.id);
  const insights = useInsights(p.id).data;
  const s = state.data;
  return (
    <div className="s-sharing">
      <div className="s-stack lg">
        <AccessCard project={p} share={s?.share || null} />
        <LinkCard project={p} state={state} />
        {s?.share && <SalesCard project={p} state={s} />}
        {s?.share && <PriorityCardSettings project={p} state={s} />}
      </div>
      <div className="s-stack lg">
        <Figures state={s} insights={insights} />
        {s?.share && <Visitors project={p} state={s} />}
        <Orders project={p} insights={insights} />
        <Downloads project={p} insights={insights} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Watermark and downloads
// ---------------------------------------------------------------------------

function AccessCard({ project: p, share }: { project: Project; share: ShareState["share"] }) {
  const qc = useQueryClient();
  const a = accessOf(p);
  const [busy, setBusy] = useState(false);
  const gs = p.gallerySettings;
  const missing = p.gallery.filter((g) => !g.watermark && !isVideo(g.fileName || g.url) && g.restriction !== "no_photo").length;

  async function save(patch: { watermark?: boolean; clientOriginals?: boolean; clientDownloads?: boolean; downloadsUntil?: string }) {
    setBusy(true);
    // The first change moves an older gallery onto the switch, with what it showed until now.
    const next: Record<string, unknown> = {
      ...gs,
      watermark: a.watermark,
      clientOriginals: a.clientOriginals,
      clientDownloads: a.clientDownloads,
      ...patch,
      earlyDownloads: undefined,
      coverUrl: undefined,
    };
    if (patch.downloadsUntil === "") next.downloadsUntil = undefined;
    try {
      await put(`/admin/project/${p.id}`, { gallerySettings: next });
      await qc.invalidateQueries({ queryKey: keys.project(p.id) });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const clientSees = a.watermark && !a.clientOriginals ? "met watermerk" : "zonder watermerk";
  const guestsSee = a.watermark || share?.sales ? "met watermerk" : "zonder watermerk";
  const until = gs.downloadsUntil || p.downloadsUntil || "";
  return (
    <Card title="Watermerk en downloaden">
      <div className="s-stack">
        <Switch checked={a.watermark} busy={busy} onChange={(on) => save({ watermark: on })}
          label="Watermerk"
          hint={a.watermark ? "Iedereen ziet de foto's met het watermerk van PhotoDeCaffeine. Gekochte foto's en voorrang komen zonder." : "Iedereen ziet de foto's zoals ze zijn. Zet aan om ze te beschermen, of om ze te verkopen."} />
        {a.watermark && (
          <label className="s-check-row indent">
            <input type="checkbox" checked={a.clientOriginals} disabled={busy} onChange={(e) => save({ clientOriginals: e.target.checked })} />
            <span><b>De klant ziet de originelen</b><small>Alleen de klant in het portaal. Wie de groepslink heeft, houdt het watermerk.</small></span>
          </label>
        )}
        <Switch checked={a.clientDownloads} busy={busy} onChange={(on) => save({ clientDownloads: on })}
          label="De klant mag downloaden"
          hint={a.clientDownloads ? `De klant downloadt wat hij ziet, ${clientSees}.` : "De klant kan kijken en kiezen, maar niet downloaden."} />
        <div className="s-form-grid">
          <TextField label="Downloaden kan tot" type="date" value={until} disabled={busy} onChange={(e) => save({ downloadsUntil: e.target.value })}
            hint={p.galleryDelivered ? "Vanzelf een kwartaal na levering. Zet een andere datum als dat is afgesproken." : "Begint bij de levering: dan tellen de drie maanden."} />
        </div>
        {(a.watermark || share?.sales) && missing > 0 && (
          <p className="s-small" style={{ color: "var(--warn)" }}>
            {plural(missing, "foto heeft", "foto's hebben")} nog geen watermerk en {missing === 1 ? "is" : "zijn"} daarom verborgen voor wie het watermerk ziet. Maak ze bij Galerij met Klaarmaken.
          </p>
        )}
        <dl className="s-whosees">
          <div><dt>Klant in het portaal</dt><dd>ziet de foto's {clientSees}, {a.clientDownloads ? "mag downloaden" : "downloadt niet"}</dd></div>
          <div><dt>Groepslink</dt><dd>{share ? <>ziet de foto's {guestsSee}, {share.downloads ? "mag downloaden" : "downloadt niet"}{share.sales ? ", kan kopen" : ""}</> : "nog geen link"}</dd></div>
        </dl>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The group link
// ---------------------------------------------------------------------------

function useShareUpdate(p: Project) {
  const qc = useQueryClient();
  const store = (s: ShareState) => qc.setQueryData(keys.groupLink(p.id), s);
  const base = `/admin/project/${p.id}/share`;
  return {
    create: useAction({ fn: () => post<ShareState>(base), onSuccess: store, success: "Groepslink gemaakt" }),
    update: useAction({
      fn: (b: ShareBody) => put<ShareState>(base, b),
      invalidate: () => [keys.consent(p.id)],
      onSuccess: store,
      success: (_s, b) => (b.active === false ? "Link staat uit" : b.active ? "Link staat weer aan" : "Opgeslagen"),
    }),
    renew: useAction({ fn: () => post<ShareState>(`${base}/renew`), onSuccess: store, success: "Nieuwe link gemaakt" }),
    forget: useAction({ fn: (g: ShareGuest) => del<ShareState>(`${base}/guests/${g.id}`), onSuccess: store, success: "Bezoeker verwijderd" }),
  };
}

function LinkCard({ project: p, state }: { project: Project; state: ReturnType<typeof useGroupLink> }) {
  const confirm = useConfirm();
  const { create, update, renew } = useShareUpdate(p);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const s = state.data;
  const share = s?.share;
  const busy = create.isPending || update.isPending || renew.isPending;

  let body;
  if (state.isError) body = <ErrorState error={state.error} retry={() => state.refetch()} />;
  else if (!s) body = <Skeleton h={88} />;
  else if (!share) {
    body = (
      <div className="s-stack" style={{ alignItems: "flex-start" }}>
        <p className="s-small s-muted" style={{ maxWidth: "62ch" }}>
          Eén link voor een hele groep, zoals een team, een klas of de gasten van een bruiloft. Wie hem opent, vult eerst naam en e-mail in.
          Zo zie je wie er keek, wat ze mooi vonden en wat ze downloadden. De klant kan de link zelf doorsturen vanuit de galerij.
        </p>
        <Button variant="primary" icon={<Link2 />} loading={create.isPending} onClick={() => create.mutate()}>Groepslink maken</Button>
      </div>
    );
  } else {
    body = (
      <div className="s-stack">
        <div className="s-row">
          <Input readOnly value={share.url} aria-label="Groepslink" onFocus={(e) => e.currentTarget.select()}
            style={{ flex: "1 1 260px", minWidth: 0, opacity: share.active ? 1 : 0.55 }} />
          <Button icon={copied ? <Check /> : <Copy />} disabled={!share.active} onClick={async () => setCopied(await copyText(share.url))}>{copied ? "Gekopieerd" : "Kopiëren"}</Button>
          <Button icon={<QrCode />} disabled={!share.active} onClick={() => setQr(true)}>QR-code</Button>
          {/* Opened on this site, so the studio's own login can look without being counted. */}
          <a className="s-btn" href={new URL(share.url).pathname} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" />Bekijken</a>
        </div>
        <Switch checked={share.downloads} busy={busy} onChange={(on) => update.mutate({ downloads: on })}
          label="Gasten mogen gratis downloaden"
          hint={share.downloads ? "Ze downloaden wat ze zien. Met het watermerk aan is dat de versie met watermerk." : "Gasten kijken, geven hartjes en kopen, maar downloaden niet gratis."} />
        <Switch checked={share.consentRequired} busy={busy} onChange={(on) => update.mutate({ consentRequired: on })}
          label="Eerst toestemming vragen"
          hint="Bij foto's met kinderen. Bezoekers van wie nog geen toestemming binnen is, krijgen na hun naam en e-mail eerst het formulier." />
        <div className="s-row between">
          <div className="s-row">
            <Button size="sm" disabled={busy} onClick={async () => {
              if (share.active && !(await confirm({ title: "Link uitzetten?", body: "Wie hem opent, ziet dan dat hij niet meer werkt. Bezoekers, hartjes en aankopen blijven bewaard, en je kunt hem later weer aanzetten.", confirm: "Uitzetten" }))) return;
              update.mutate({ active: !share.active });
            }}>
              {share.active ? "Link uitzetten" : "Link weer aanzetten"}
            </Button>
            <Button size="sm" icon={<RefreshCw />} disabled={busy} onClick={async () => {
              if (await confirm({ title: "Nieuwe link maken?", body: "De huidige link werkt daarna niet meer. Bezoekers, hartjes en aankopen blijven bewaard.", confirm: "Nieuwe link" })) renew.mutate();
            }}>Nieuwe link</Button>
          </div>
          <span className="s-small s-faint">Sinds {fmtDate(share.createdAt)}</span>
        </div>
        {qr && <QrDialog url={share.url} title={p.gallerySettings.title || p.title} onClose={() => setQr(false)} />}
      </div>
    );
  }
  return (
    <Card title={<h2 id="groepslink">Groepslink</h2>} action={share && <Pill tone={share.active ? "ok" : undefined} plain={!share.active}>{share.active ? "Aan" : "Uit"}</Pill>}>
      {body}
    </Card>
  );
}

/** A QR code for the link: on a flyer at the club, in the team app, on the screen after the match. */
function QrDialog({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const svg = useMemo(() => renderSVG(url, { border: 2 }), [url]);
  const name = `qr-${title.replace(/[^\w-]+/g, "-").toLowerCase()}.svg`;
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="QR-code van de groepslink"
      description="Scannen opent de galerij. Als SVG blijft hij scherp, ook op een poster."
      footer={<><Button onClick={onClose}>Sluiten</Button><Button variant="primary" icon={<Download />} onClick={() => saveFile(name, svg, "image/svg+xml")}>Downloaden</Button></>}>
      <div className="s-qr" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`QR-code voor ${url}`} />
      <p className="s-small s-muted s-mono" style={{ textAlign: "center", overflowWrap: "anywhere" }}>{url}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Selling
// ---------------------------------------------------------------------------

function SalesCard({ project: p, state }: { project: Project; state: ShareState }) {
  const qc = useQueryClient();
  const { update } = useShareUpdate(p);
  const share = state.share!;
  const [price, setPrice] = useState(moneyText(share.photoPrice));
  const [normal, setNormal] = useState(moneyText(share.photoPriceNormal));
  const [bundleSize, setBundleSize] = useState(String(share.bundleSize || 5));
  const [bundlePrice, setBundlePrice] = useState(moneyText(share.bundlePrice || 20));
  const [starting, setStarting] = useState(false);
  useEffect(() => setPrice(moneyText(share.photoPrice)), [share.photoPrice]);
  useEffect(() => setNormal(moneyText(share.photoPriceNormal)), [share.photoPriceNormal]);
  useEffect(() => { if (share.bundleSize) setBundleSize(String(share.bundleSize)); }, [share.bundleSize]);
  useEffect(() => { if (share.bundlePrice) setBundlePrice(moneyText(share.bundlePrice)); }, [share.bundlePrice]);

  const nPrice = toNumber(price);
  const nNormal = toNumber(normal);
  const nSize = Number(bundleSize);
  const nBundle = toNumber(bundlePrice);
  const priceError = Number.isFinite(nPrice) && nPrice >= 0.5 && nPrice <= 500 ? "" : "Tussen €0,50 en €500.";
  const normalError = Number.isFinite(nNormal) && nNormal >= 0 && nNormal <= 1000 ? "" : "Tussen €0 en €1000.";
  const sizeError = Number.isInteger(nSize) && nSize >= 2 && nSize <= 50 ? "" : "Tussen 2 en 50 foto's.";
  const bundleError = !Number.isFinite(nBundle) || nBundle <= 0 ? "Vul een prijs in." : nBundle >= nPrice * nSize ? `Goedkoper dan ${nSize} losse foto's (${euro(nPrice * nSize)}).` : "";
  const off = !priceError && !normalError && nNormal > nPrice ? Math.round((1 - nPrice / nNormal) * 100) : 0;
  const bundled = share.bundleSize > 0;
  const ended = !!share.discountUntil && share.discountUntil < new Date().toLocaleDateString("sv-SE");
  const unmarked = p.gallery.filter((g) => !g.watermark && g.restriction !== "no_photo" && !isVideo(g.fileName || g.url)).length;

  function savePrices() {
    const b: ShareBody = {};
    if (!priceError && Math.round(nPrice * 100) !== Math.round(share.photoPrice * 100)) b.photoPrice = Math.round(nPrice * 100) / 100;
    if (!normalError && Math.round(nNormal * 100) !== Math.round(share.photoPriceNormal * 100)) b.photoPriceNormal = Math.round(nNormal * 100) / 100;
    if (Object.keys(b).length) update.mutate(b);
  }
  function saveBundle() {
    if (!bundled || sizeError || bundleError) return;
    if (nSize !== share.bundleSize || Math.round(nBundle * 100) !== Math.round(share.bundlePrice * 100)) update.mutate({ bundleSize: nSize, bundlePrice: Math.round(nBundle * 100) / 100 });
  }

  /** The start-up sale in one go: watermark for everyone, photos for sale, guests may not download for free. */
  async function startupSale() {
    setStarting(true);
    try {
      await put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, watermark: true, clientOriginals: false, clientDownloads: false, earlyDownloads: undefined, coverUrl: undefined } });
      const s = await put<ShareState>(`/admin/project/${p.id}/share`, { sales: true, downloads: false, photoPrice: 5, photoPriceNormal: 5, active: true });
      qc.setQueryData(keys.groupLink(p.id), s);
      await qc.invalidateQueries({ queryKey: keys.project(p.id) });
      toast.success("Start-up sale staat klaar: watermerk aan, €5 per foto");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card title="Foto's verkopen" action={share.sales && <Pill tone="ok">{euro(share.priceNow)} per foto</Pill>}>
      <div className="s-stack">
        <Switch checked={share.sales} busy={update.isPending} onChange={(on) => update.mutate({ sales: on })}
          label="Losse foto's verkopen via de groepslink"
          hint="Gasten zien de foto's met watermerk, maken een gratis account en betalen met iDEAL. Daarna downloaden ze het origineel, ook later via Mijn foto's." />
        {!share.sales && (
          <div className="s-banner" style={{ alignItems: "center" }}>
            <Rocket size={16} aria-hidden="true" />
            <span><b>Start-up sale</b>: gratis shoot, alle foto's met watermerk online, €5 per foto. Alles in één keer goed gezet.</span>
            <Button size="sm" variant="primary" loading={starting} onClick={startupSale}>Klaarzetten</Button>
          </div>
        )}
        {share.sales && (
          <>
            <div className="s-form-grid">
              <TextField label="Prijs per foto, incl. btw (€)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={savePrices}
                error={priceError || undefined} hint={priceError ? undefined : off > 0 ? `Dit betalen gasten: ${off}% korting op de normale prijs.` : "Dit betalen gasten."} />
              <TextField label="Normale prijs, doorgestreept (€)" inputMode="decimal" value={normal} onChange={(e) => setNormal(e.target.value)} onBlur={savePrices}
                error={normalError || undefined} hint={normalError ? undefined : "Gelijk aan de prijs: geen korting te zien."} />
              <TextField label="Korting loopt tot (optioneel)" type="date" value={share.discountUntil} onChange={(e) => update.mutate({ discountUntil: e.target.value })}
                hint={ended ? `Afgelopen: gasten betalen nu ${euro(share.priceNow)}.` : share.discountUntil ? "Daarna betalen gasten de normale prijs." : "Zonder datum loopt de korting door."} />
            </div>
            <Switch checked={bundled} busy={update.isPending} label="Bundelprijs"
              onChange={(on) => update.mutate(on ? { bundleSize: sizeError ? 5 : nSize, bundlePrice: bundleError ? 20 : Math.round(nBundle * 100) / 100 } : { bundleSize: 0 })}
              hint={bundled ? `Per ${share.bundleSize} foto's betalen gasten ${euro(share.bundlePrice)}. De rest telt als losse foto's.` : "Bijvoorbeeld 5 foto's voor €20. Zo kopen mensen er makkelijker een paar meer."} />
            {bundled && (
              <div className="s-form-grid">
                <TextField label="Aantal foto's in een bundel" inputMode="numeric" value={bundleSize} onChange={(e) => setBundleSize(e.target.value)} onBlur={saveBundle} error={sizeError || undefined} />
                <TextField label="Prijs van een bundel (€)" inputMode="decimal" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} onBlur={saveBundle} error={bundleError || undefined} />
              </div>
            )}
            {!share.paymentsLive && (
              <div className="s-banner warn">
                <span>Mollie staat nog op testen. Gasten zien de prijzen pas als online betalen live staat.</span>
                <a className="s-btn sm" href={`${new URL(share.url).pathname}?test=1`} target="_blank" rel="noreferrer">Zelf proberen</a>
              </div>
            )}
            {unmarked > 0 && <p className="s-small" style={{ color: "var(--warn)" }}>{plural(unmarked, "foto heeft", "foto's hebben")} nog geen watermerk. Die zijn niet te koop. Maak ze bij Galerij met Klaarmaken.</p>}
          </>
        )}
      </div>
    </Card>
  );
}

function PriorityCardSettings({ project: p, state }: { project: Project; state: ShareState }) {
  const { update } = useShareUpdate(p);
  const share = state.share!;
  const [price, setPrice] = useState(moneyText(share.priorityPrice));
  const [days, setDays] = useState(String(share.priorityDays));
  useEffect(() => setPrice(moneyText(share.priorityPrice)), [share.priorityPrice]);
  useEffect(() => setDays(String(share.priorityDays)), [share.priorityDays]);
  const nPrice = toNumber(price);
  const nDays = Number(days);
  const priceError = Number.isFinite(nPrice) && nPrice >= 1 && nPrice <= 500 ? "" : "Tussen €1 en €500.";
  const daysError = Number.isInteger(nDays) && nDays >= 1 && nDays <= 30 ? "" : "Tussen 1 en 30 werkdagen.";
  function save() {
    const b: ShareBody = {};
    if (!priceError && Math.round(nPrice * 100) !== Math.round(share.priorityPrice * 100)) b.priorityPrice = Math.round(nPrice * 100) / 100;
    if (!daysError && nDays !== share.priorityDays) b.priorityDays = nDays;
    if (Object.keys(b).length) update.mutate(b);
  }
  return (
    <Card title="Voorrang">
      <div className="s-stack">
        <Switch checked={share.priority} busy={update.isPending} onChange={(on) => update.mutate({ priority: on })}
          label="Voorrang verkopen"
          hint="Gasten vragen om hun foto's eerst, vóór de levering. Jij kijkt of er genoeg zijn en stuurt een betaallink. De aanvragen staan bij Galerij." />
        {share.priority && (
          <div className="s-form-grid">
            <TextField label="Prijs voor voorrang, incl. btw (€)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={save}
              error={priceError || undefined} hint={priceError ? undefined : "Houd het laag, het is een extraatje."} />
            <TextField label="Levertijd na betaling (werkdagen)" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} onBlur={save}
              error={daysError || undefined} hint={daysError ? undefined : "Staat in de mails aan de gast."} />
          </div>
        )}
        {share.priority && <Link className="s-small" to={`/admin/project/${p.id}?tab=gallery#voorrang`}>Naar de aanvragen bij Galerij</Link>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// What happened
// ---------------------------------------------------------------------------

function Figures({ state, insights }: { state?: ShareState; insights?: GalleryInsights }) {
  const t = state?.totals;
  const items: [string, string][] = [
    ["Bezoekers", t ? String(t.guests) : "…"],
    ["Bezoeken", t ? String(t.visits) : "…"],
    ["Hartjes", t ? String(t.hearts) : "…"],
    ["Downloads", insights ? String(insights.totals.downloads) : "…"],
    ["Verkocht", insights ? String(insights.totals.sold) : "…"],
    ["Omzet", insights ? euro(insights.totals.revenue) : "…"],
  ];
  return (
    <section className="s-card s-figures" aria-label="Cijfers van de galerij">
      {items.map(([label, value]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
    </section>
  );
}

const FIRST = 8;

function Visitors({ project: p, state: s }: { project: Project; state: ShareState }) {
  const confirm = useConfirm();
  const { forget } = useShareUpdate(p);
  const [showAll, setShowAll] = useState(false);
  const guests = showAll ? s.guests : s.guests.slice(0, FIRST);
  const waiting = s.guests.filter((g) => g.notifyPhotos).length;
  return (
    <Card title="Bezoekers" action={s.guests.length > 0 && <Button size="sm" variant="ghost" icon={<Download />} onClick={() => saveGuests(p, s.guests)}>CSV</Button>} bodyClass="none">
      {s.guests.length === 0 ? (
        <div className="s-card-body"><Empty title="Nog geen bezoekers">Stuur de link rond, of laat de klant dat doen vanuit de galerij.</Empty></div>
      ) : (
        <>
          {waiting > 0 && <p className="s-small s-muted s-card-body tight">{waiting === 1 ? "1 bezoeker wil" : `${waiting} bezoekers willen`} een mail bij nieuwe foto's. Die gaat mee met Klant laten weten bij Galerij.</p>}
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Bezoeker</th><th className="right">Gekocht</th><th>Laatst</th><th /></tr></thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}{g.account && <UserCheck size={13} aria-label="Heeft een account" style={{ marginLeft: 6, color: "var(--ok)" }} />}</div>
                      <a className="s-small s-muted" href={`mailto:${g.email}`}>{g.email}</a>
                      <div className="s-small s-faint">{plural(g.visits, "bezoek", "bezoeken")} · {plural(g.hearts, "hartje", "hartjes")} · {plural(g.downloads, "download", "downloads")}</div>
                    </td>
                    <td className="right s-num" style={{ whiteSpace: "nowrap" }}>{g.bought ? <>{g.bought} · {euro(g.spent || 0)}</> : "–"}</td>
                    <td className="s-small s-muted" title={`Eerste bezoek ${fmtDateTime(g.firstSeenAt)}`} style={{ whiteSpace: "nowrap" }}>{ago(g.lastSeenAt)}</td>
                    <td className="right">
                      <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={`${g.name} verwijderen`} title="Verwijderen"
                        onClick={async () => {
                          const lost = g.bought ? ` Ook de ${plural(g.bought, "gekochte foto", "gekochte foto's")} verdwijnen uit ${g.bought === 1 ? "hun" : "hun"} account. De factuur blijft.` : "";
                          if (await confirm({ title: `${g.name} verwijderen?`, body: `Naam, e-mail, hartjes en downloads van deze bezoeker gaan weg. Met de link kan diegene opnieuw binnenkomen.${lost}`, confirm: "Verwijderen", danger: true })) forget.mutate(g);
                        }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.guests.length > FIRST && !showAll && <div className="s-card-body tight"><Button size="sm" variant="ghost" onClick={() => setShowAll(true)}>Toon alle {s.guests.length}</Button></div>}
        </>
      )}
    </Card>
  );
}

function Orders({ project: p, insights }: { project: Project; insights?: GalleryInsights }) {
  const [open, setOpen] = useState(false);
  if (!insights) return <Card title="Verkopen"><Skeleton h={60} /></Card>;
  const paid = insights.orders.filter((o) => o.paid);
  const unpaid = insights.orders.filter((o) => !o.paid);
  const list = open ? insights.orders : paid;
  const thumbs = new Map(p.gallery.map((g) => [g.id, g]));
  return (
    <Card title="Verkopen" bodyClass="none" action={paid.length > 0 && <span className="s-small s-muted">{plural(insights.totals.buyers, "koper", "kopers")} · {euro(insights.totals.revenue)}</span>}>
      {insights.orders.length === 0 ? (
        <div className="s-card-body"><Empty title="Nog niets verkocht">Zet Foto's verkopen aan en deel de groepslink.</Empty></div>
      ) : (
        <>
          <ul className="s-list">
            {list.map((o) => (
              <li key={o.id} className={cx("s-item s-order", !o.paid && "unpaid")} style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
                <div className="s-order-thumbs" aria-hidden="true">
                  {o.images.slice(0, 3).map((id) => <Photo key={id} src={thumbs.get(id)?.url} />)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="t s-truncate">{o.guest.name || o.guest.email}</div>
                  <div className="s s-truncate">{plural(o.images.length, "foto", "foto's")} · {fmt(o.paidAt || o.createdAt, "d MMM, HH:mm")}{o.guest.email ? ` · ${o.guest.email}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="s-num" style={{ fontWeight: 600 }}>{euro(o.amount)}</div>
                  {o.paid && o.invoice ? <Link className="s-small" to={`/admin/invoice/${o.invoice.id}`}>{o.invoice.number}</Link> : <span className="s-small s-faint">Niet afgerond</span>}
                </div>
              </li>
            ))}
          </ul>
          {unpaid.length > 0 && (
            <div className="s-card-body tight">
              <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Alleen betaalde" : `Ook ${plural(unpaid.length, "niet afgerond mandje", "niet afgeronde mandjes")}`}</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

const SOURCE: Record<string, string> = { portal: "Portaal", link: "Groepslink", account: "Mijn foto's" };

function Downloads({ project: p, insights }: { project: Project; insights?: GalleryInsights }) {
  const [all, setAll] = useState(false);
  if (!insights) return <Card title="Downloads"><Skeleton h={60} /></Card>;
  const list = all ? insights.downloads : insights.downloads.slice(0, 10);
  const thumbs = new Map(p.gallery.map((g) => [g.id, g]));
  return (
    <Card title="Downloads" bodyClass="none" action={insights.totals.downloads > 0 && <span className="s-small s-muted">{insights.totals.downloads} · {plural(insights.totals.downloaders, "persoon", "mensen")}</span>}>
      {insights.downloads.length === 0 ? (
        <div className="s-card-body"><Empty title="Nog niets gedownload">Elke download komt hier te staan, met wie, wat en wanneer.</Empty></div>
      ) : (
        <>
          <ul className="s-list">
            {list.map((d) => (
              <li key={d.id} className="s-item s-order" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
                <div className="s-order-thumbs" aria-hidden="true">
                  {d.images.slice(0, 3).map((id) => <Photo key={id} src={thumbs.get(id)?.url} />)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="t s-truncate">{d.who || "Iemand"}</div>
                  <div className="s s-truncate">{d.count > 1 ? `${d.count} foto's in een zip` : thumbs.get(d.images[0])?.fileName || "1 foto"}{d.version === "watermark" ? " · met watermerk" : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Pill plain tone={d.source === "account" ? "ok" : d.source === "portal" ? "acc" : undefined}>{SOURCE[d.source]}</Pill>
                  <div className="s-small s-faint" title={fmtDateTime(d.at)}>{ago(d.at)}</div>
                </div>
              </li>
            ))}
          </ul>
          {insights.downloads.length > 10 && <div className="s-card-body tight"><Button size="sm" variant="ghost" onClick={() => setAll((v) => !v)}>{all ? "Minder" : `Alle ${insights.downloads.length}`}</Button></div>}
        </>
      )}
    </Card>
  );
}

/** A spreadsheet of the visitors (semicolons, for Excel in Dutch). */
function saveGuests(p: Project, guests: ShareGuest[]) {
  const when = (iso: string) => fmt(iso, "yyyy-MM-dd HH:mm");
  const rows = [
    ["Naam", "E-mail", "Account", "Bezoeken", "Hartjes", "Downloads", "Gekocht", "Besteed", "Mail bij nieuwe foto's", "Eerste bezoek", "Laatste bezoek"],
    ...guests.map((g) => [g.name, g.email, g.account ? "Ja" : "Nee", g.visits, g.hearts, g.downloads, g.bought || 0, (g.spent || 0).toFixed(2).replace(".", ","), g.notifyPhotos ? "Ja" : "Nee", when(g.firstSeenAt), when(g.lastSeenAt)]),
  ];
  const name = (p.gallerySettings.title || p.title).replace(/[^\w-]+/g, "-").toLowerCase();
  saveFile(`bezoekers-${name}.csv`, `﻿${rows.map((r) => r.map(csvCell).join(";")).join("\r\n")}`, "text/csv;charset=utf-8");
}
