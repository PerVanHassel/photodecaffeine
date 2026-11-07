import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, ExternalLink, Link2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { del, get, post, put } from "../../api";
import { ago, euro, fmt, fmtDateTime } from "../../format";
import { copyText } from "../../gallery/share";
import { saveFile } from "../../portal/data";
import { keys, useAction } from "../../queries";
import type { Project, ShareGuest, ShareState } from "../../types";
import { Button, Card, Empty, ErrorState, Field, Input, Photo, Pill, Segmented, Skeleton, TextField, useConfirm } from "../../ui";

/** The project's group link and who came in with it; shared by the card and the gallery toolbar. */
export const useGroupLink = (projectId: string) =>
  useQuery({
    queryKey: keys.groupLink(projectId),
    queryFn: ({ signal }) => get<ShareState>(`/admin/project/${projectId}/share`, signal),
  });

const FIRST = 8;

/**
 * One link for a whole group: a team, a class, the guests at a wedding. Whoever
 * opens it leaves a name and e-mail first, so this card can show who looked,
 * how often, and which photos they liked.
 */
export function GroupLink({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const state = useGroupLink(p.id);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const store = (s: ShareState) => qc.setQueryData(keys.groupLink(p.id), s);
  const base = `/admin/project/${p.id}/share`;

  const create = useAction({ fn: () => post<ShareState>(base), onSuccess: store, success: "Groepslink gemaakt" });
  const update = useAction({
    fn: (b: {
      active?: boolean; downloads?: boolean; consentRequired?: boolean; priority?: boolean; priorityPrice?: number; priorityDays?: number;
      sales?: boolean; photoPrice?: number; photoPriceNormal?: number;
    }) => put<ShareState>(base, b),
    invalidate: () => [keys.consent(p.id)],
    onSuccess: store,
    success: (_s, b) => (b.active === false ? "Link staat uit" : b.active ? "Link staat weer aan" : "Opgeslagen"),
  });
  const renew = useAction({ fn: () => post<ShareState>(`${base}/renew`), onSuccess: store, success: "Nieuwe link gemaakt" });
  const forget = useAction({ fn: (g: ShareGuest) => del<ShareState>(`${base}/guests/${g.id}`), onSuccess: store, success: "Bezoeker verwijderd" });

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
          Hier zie je wie er keek en welke foto's ze mooi vonden. De klant kan de link zelf kopiëren in de galerij.
        </p>
        <Button variant="primary" icon={<Link2 />} loading={create.isPending} onClick={() => create.mutate()}>Groepslink maken</Button>
      </div>
    );
  } else {
    const loved = p.gallery.filter((g) => s.hearts[g.id]).sort((a, b) => s.hearts[b.id] - s.hearts[a.id]).slice(0, 8);
    const guests = showAll ? s.guests : s.guests.slice(0, FIRST);
    const waiting = s.guests.filter((g) => g.notifyPhotos).length;
    body = (
      <div className="s-stack lg">
        <div className="s-row">
          <Input readOnly value={share.url} aria-label="Groepslink" onFocus={(e) => e.currentTarget.select()}
            style={{ flex: "1 1 280px", minWidth: 0, opacity: share.active ? 1 : 0.55 }} />
          <Button icon={copied ? <Check /> : <Copy />} disabled={!share.active} onClick={async () => setCopied(await copyText(share.url))}>
            {copied ? "Gekopieerd" : "Kopiëren"}
          </Button>
          {/* Opened on this site, so the studio's own login can look without being counted. */}
          <a className="s-btn" href={new URL(share.url).pathname} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" />Bekijken</a>
        </div>

        <div className="s-stats" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
          <div><b>{s.totals.guests}</b><span>Bezoekers</span></div>
          <div><b>{s.totals.visits}</b><span>Bezoeken</span></div>
          <div><b>{s.totals.hearts}</b><span>Hartjes</span></div>
          <div><b>{s.totals.downloads}</b><span>Downloads</span></div>
        </div>

        <Field label="Gasten mogen downloaden" hint="Ze krijgen wat de klant krijgt: vóór levering volgens 'Downloaden vóór levering', daarna de originelen.">
          <div>
            <Segmented<"no" | "yes"> label="Gasten mogen downloaden" value={share.downloads ? "yes" : "no"}
              onChange={(v) => !busy && update.mutate({ downloads: v === "yes" })}
              options={[{ value: "no", label: "Nee" }, { value: "yes", label: "Ja" }]} />
          </div>
        </Field>

        <Field label="Eerst toestemming vragen" hint="Bezoekers van wie nog geen toestemming binnen is, krijgen na hun naam en e-mail eerst het toestemmingsformulier. Daarna pas de foto's. Wie geen kind in de groep heeft, komt er dan niet op.">
          <div>
            <Segmented<"no" | "yes"> label="Eerst toestemming vragen" value={share.consentRequired ? "yes" : "no"}
              onChange={(v) => !busy && update.mutate({ consentRequired: v === "yes" })}
              options={[{ value: "no", label: "Uit" }, { value: "yes", label: "Aan" }]} />
          </div>
        </Field>

        <Field label="Voorrang verkopen" hint="Gasten vragen in de galerij om hun foto's eerst. Jij kijkt of er genoeg zijn. Dan stuur je een betaallink, of bij te weinig foto's een aanbod voor een eigen shoot.">
          <div>
            <Segmented<"no" | "yes"> label="Voorrang verkopen" value={share.priority ? "yes" : "no"}
              onChange={(v) => !busy && update.mutate({ priority: v === "yes" })}
              options={[{ value: "no", label: "Uit" }, { value: "yes", label: "Aan" }]} />
          </div>
        </Field>
        {share.priority && (
          <PrioritySettings price={share.priorityPrice} days={share.priorityDays} onSave={(b) => update.mutate(b)} />
        )}

        <Field label="Foto's verkopen" hint="Staat de galerij op 'Met watermerk', dan kopen gasten losse foto's. Na betaling downloaden ze het origineel, zonder watermerk.">
          <div>
            <Segmented<"no" | "yes"> label="Foto's verkopen" value={share.sales ? "yes" : "no"}
              onChange={(v) => !busy && update.mutate({ sales: v === "yes" })}
              options={[{ value: "no", label: "Uit" }, { value: "yes", label: "Aan" }]} />
          </div>
        </Field>
        {share.sales && (
          <div className="s-stack sm">
            <PhotoPriceSettings price={share.photoPrice} normal={share.photoPriceNormal} onSave={(b) => update.mutate(b)} />
            {(p.gallerySettings.earlyDownloads !== "watermark" || ["delivered", "review", "archived"].includes(p.stage)) && (
              <span className="s-small s-muted">Gasten zien dit pas als 'Downloaden vóór levering' op 'Met watermerk' staat, tot de levering.</span>
            )}
            {!share.paymentsLive && (
              <span className="s-small" style={{ color: "var(--warn)" }}>Online betalen staat nog niet live (Mollie). Gasten zien de knop zodra dat zo is. Testen kan met ?test=1 achter de link.</span>
            )}
            {s.totals.sold > 0 && <span className="s-small"><b>Verkocht:</b> {s.totals.sold} {s.totals.sold === 1 ? "foto" : "foto's"} · {euro(s.totals.revenue)}</span>}
          </div>
        )}

        {loved.length > 0 && (
          <div className="s-stack sm">
            <span className="s-label">Meest geliefd</span>
            <div className="s-row" style={{ gap: 8 }}>
              {loved.map((g) => (
                <Photo key={g.id} src={g.url} caption={`♥ ${s.hearts[g.id]}`} style={{ width: 84, aspectRatio: "1" }} />
              ))}
            </div>
          </div>
        )}

        {s.guests.length === 0 ? (
          <Empty title="Nog geen bezoekers">Stuur de link rond, of laat de klant dat doen vanuit de galerij.</Empty>
        ) : (
          <div className="s-stack sm">
            {waiting > 0 && <p className="s-small s-muted">{waiting === 1 ? "1 bezoeker wil" : `${waiting} bezoekers willen`} een mail bij nieuwe foto's. Die gaat mee als je bij de galerij op "Klant laten weten" drukt.</p>}
            <div className="s-table-wrap">
              <table className="s-table">
                <thead>
                  <tr><th>Bezoeker</th><th className="right">Bezoeken</th><th className="right">Hartjes</th><th className="right">Downloads</th><th>Laatst</th><th /></tr>
                </thead>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{g.name}</div>
                        <a className="s-small s-muted" href={`mailto:${g.email}`}>{g.email}</a>
                      </td>
                      <td className="right s-num">{g.visits}</td>
                      <td className="right s-num">{g.hearts}</td>
                      <td className="right s-num">{g.downloads}</td>
                      <td className="s-small s-muted" title={`Eerste bezoek ${fmtDateTime(g.firstSeenAt)}`} style={{ whiteSpace: "nowrap" }}>{ago(g.lastSeenAt)}</td>
                      <td className="right">
                        <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={`${g.name} verwijderen`} title="Verwijderen"
                          onClick={async () => {
                            if (await confirm({ title: `${g.name} verwijderen?`, body: "Naam, e-mail en hartjes van deze bezoeker gaan weg. Met de link kan diegene opnieuw binnenkomen.", confirm: "Verwijderen", danger: true })) forget.mutate(g);
                          }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {s.guests.length > FIRST && !showAll && (
              <Button size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} onClick={() => setShowAll(true)}>Toon alle {s.guests.length}</Button>
            )}
          </div>
        )}

        <div className="s-row between">
          <div className="s-row">
            <Button size="sm" disabled={busy} onClick={async () => {
              if (share.active && !(await confirm({ title: "Link uitzetten?", body: "Wie hem opent, ziet dan dat hij niet meer werkt. Bezoekers en hartjes blijven bewaard, en je kunt hem later weer aanzetten.", confirm: "Uitzetten" }))) return;
              update.mutate({ active: !share.active });
            }}>
              {share.active ? "Link uitzetten" : "Link weer aanzetten"}
            </Button>
            <Button size="sm" icon={<RefreshCw />} disabled={busy} onClick={async () => {
              if (await confirm({ title: "Nieuwe link maken?", body: "De huidige link werkt daarna niet meer. Bezoekers en hartjes blijven bewaard.", confirm: "Nieuwe link" })) renew.mutate();
            }}>
              Nieuwe link
            </Button>
          </div>
          {s.guests.length > 0 && <Button size="sm" icon={<Download />} onClick={() => saveGuests(p, s.guests)}>Bezoekers als CSV</Button>}
        </div>
      </div>
    );
  }

  return (
    <Card title={<h2 id="groepslink">Groepslink</h2>} action={share && <Pill tone={share.active ? "ok" : undefined} plain={!share.active}>{share.active ? "Aan" : "Uit"}</Pill>}>
      {body}
    </Card>
  );
}

/** "5", "7,50": an amount as someone would type it. */
const moneyText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));

/** What voorrang costs and how fast it comes. Saved when a field is left. */
function PrioritySettings({ price, days, onSave }: { price: number; days: number; onSave: (b: { priorityPrice?: number; priorityDays?: number }) => void }) {
  const [priceText, setPriceText] = useState(moneyText(price));
  const [daysText, setDaysText] = useState(String(days));
  useEffect(() => setPriceText(moneyText(price)), [price]);
  useEffect(() => setDaysText(String(days)), [days]);
  const newPrice = Number(priceText.replace(",", "."));
  const newDays = Number(daysText);
  const priceError = Number.isFinite(newPrice) && newPrice >= 1 && newPrice <= 500 ? "" : "Tussen €1 en €500.";
  const daysError = Number.isInteger(newDays) && newDays >= 1 && newDays <= 30 ? "" : "Tussen 1 en 30 werkdagen.";
  function save() {
    const b: { priorityPrice?: number; priorityDays?: number } = {};
    if (!priceError && Math.round(newPrice * 100) !== Math.round(price * 100)) b.priorityPrice = Math.round(newPrice * 100) / 100;
    if (!daysError && newDays !== days) b.priorityDays = newDays;
    if (b.priorityPrice !== undefined || b.priorityDays !== undefined) onSave(b);
  }
  return (
    <div className="s-form-grid">
      <TextField label="Prijs voor voorrang, incl. btw (€)" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} onBlur={save}
        error={priceError || undefined} hint={priceError ? undefined : "Dit betaalt de gast als er genoeg foto's zijn. Houd het laag, het is een extraatje."} />
      <TextField label="Levertijd na betaling (werkdagen)" inputMode="numeric" value={daysText} onChange={(e) => setDaysText(e.target.value)} onBlur={save}
        error={daysError || undefined} hint={daysError ? undefined : "Zo snel krijgt de gast de foto's. Staat in de mails."} />
    </div>
  );
}

/** The price per photo for guests: what they pay now, and the normal price it is reduced from. Saved when a field is left. */
function PhotoPriceSettings({ price, normal, onSave }: { price: number; normal: number; onSave: (b: { photoPrice?: number; photoPriceNormal?: number }) => void }) {
  const text = moneyText;
  const [priceText, setPriceText] = useState(text(price));
  const [normalText, setNormalText] = useState(text(normal));
  useEffect(() => setPriceText(text(price)), [price]);
  useEffect(() => setNormalText(text(normal)), [normal]);
  const newPrice = Number(priceText.replace(",", "."));
  const newNormal = Number(normalText.replace(",", "."));
  const priceError = Number.isFinite(newPrice) && newPrice >= 0.5 && newPrice <= 500 ? "" : "Tussen €0,50 en €500.";
  const normalError = Number.isFinite(newNormal) && newNormal >= 0 && newNormal <= 1000 ? "" : "Tussen €0 en €1000.";
  const off = !priceError && !normalError && newNormal > newPrice ? Math.round((1 - newPrice / newNormal) * 100) : 0;
  function save() {
    const b: { photoPrice?: number; photoPriceNormal?: number } = {};
    if (!priceError && Math.round(newPrice * 100) !== Math.round(price * 100)) b.photoPrice = Math.round(newPrice * 100) / 100;
    if (!normalError && Math.round(newNormal * 100) !== Math.round(normal * 100)) b.photoPriceNormal = Math.round(newNormal * 100) / 100;
    if (b.photoPrice !== undefined || b.photoPriceNormal !== undefined) onSave(b);
  }
  return (
    <div className="s-form-grid">
      <TextField label="Normale prijs per foto, incl. btw (€)" inputMode="decimal" value={normalText} onChange={(e) => setNormalText(e.target.value)} onBlur={save}
        error={normalError || undefined} hint={normalError ? undefined : "Doorgestreept te zien. Laat hem gelijk aan de prijs als er geen korting is."} />
      <TextField label="Prijs met start-up korting (€)" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} onBlur={save}
        error={priceError || undefined} hint={priceError ? undefined : off > 0 ? `Dit betaalt de gast: ${off}% korting.` : "Dit betaalt de gast."} />
    </div>
  );
}

/** One cell of a spreadsheet. A name typed in a form must not run as a formula when the file is opened. */
export function csvCell(v: string | number) {
  let text = String(v);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A spreadsheet of the visitors (semicolons, for Excel in Dutch). */
function saveGuests(p: Project, guests: ShareGuest[]) {
  const cell = csvCell;
  const when = (iso: string) => fmt(iso, "yyyy-MM-dd HH:mm");
  const rows = [
    ["Naam", "E-mail", "Bezoeken", "Hartjes", "Downloads", "Mail bij nieuwe foto's", "Eerste bezoek", "Laatste bezoek"],
    ...guests.map((g) => [g.name, g.email, g.visits, g.hearts, g.downloads, g.notifyPhotos ? "Ja" : "Nee", when(g.firstSeenAt), when(g.lastSeenAt)]),
  ];
  const name = (p.gallerySettings.title || p.title).replace(/[^\w-]+/g, "-").toLowerCase();
  saveFile(`bezoekers-${name}.csv`, `﻿${rows.map((r) => r.map(cell).join(";")).join("\r\n")}`, "text/csv;charset=utf-8");
}
