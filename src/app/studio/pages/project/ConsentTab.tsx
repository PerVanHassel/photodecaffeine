import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, ExternalLink, Link2, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { del, post, put } from "../../api";
import { ago, fmt, fmtDateTime } from "../../format";
import { copyText } from "../../gallery/share";
import { saveFile } from "../../portal/data";
import { keys, useAction, useConsent } from "../../queries";
import type { ConsentAnswer, ConsentRow, ConsentState, Project } from "../../types";
import { Button, Card, Empty, ErrorState, Input, Photo, Pill, Skeleton, TextField, useConfirm } from "../../ui";
import { useUnsavedChanges } from "../../unsaved";
import { csvCell } from "./GroupLink";

export const ANSWER_LABEL: Record<ConsentAnswer, string> = { full: "Mag alles", no_social: "Niet posten", no_photo: "Niet in beeld" };

/**
 * What goes round with the link. Parents read it in a team's group chat, so it
 * says who is asking and why in two lines.
 */
function parentMessage(p: Project, url: string) {
  const shoot = p.events.find((e) => e.kind === "shoot" && new Date(e.startsAt).getTime() > Date.now() - 86400000) || p.events.find((e) => e.kind === "shoot");
  const when = shoot ? `op ${fmt(shoot.startsAt, "EEEE d MMMM")} ` : "";
  return `Hoi allemaal, ${when}maak ik foto's bij ${p.gallerySettings.title || p.title}. Wil je per kind invullen wat er wel en niet mag? Het duurt een minuut.\n\n${url}\n\nDank je wel!\nPhotoDeCaffeine`;
}

/** The children who need care, with a photo to recognise them by. Also on the callsheet and above the gallery. */
export function RestrictedChildren({ consents, compact, onRemove }: { consents: ConsentRow[]; compact?: boolean; onRemove?: (c: ConsentRow) => void }) {
  return (
    <div className={compact ? "s-kids compact" : "s-kids"}>
      {consents.map((c) => (
        <article key={c.id} className="s-kid">
          {c.photoUrl
            ? <a href={c.photoUrl} target="_blank" rel="noreferrer" aria-label={`Foto van ${c.childName} groot openen`}><Photo src={c.photoUrl} alt={`Foto van ${c.childName}`} /></a>
            : <Photo />}
          <div className="s-stack sm">
            <b>{c.childName}</b>
            <div><Pill tone={c.answer === "no_photo" ? "bad" : "warn"}>{ANSWER_LABEL[c.answer]}</Pill></div>
            {c.note && <span className="s-small">{c.note}</span>}
            {!compact && (
              <span className="s-small s-muted">
                {c.parentName}<br />
                <a href={`mailto:${c.parentEmail}`}>{c.parentEmail}</a><br />
                <span title={fmtDateTime(c.updatedAt)}>{ago(c.updatedAt)}</span>
              </span>
            )}
            {onRemove && <Button size="sm" variant="ghost" icon={<Trash2 />} style={{ alignSelf: "flex-start" }} onClick={() => onRemove(c)}>Verwijderen</Button>}
          </div>
        </article>
      ))}
    </div>
  );
}

/** Above the gallery while photos are being picked out. */
export function ConsentReminder({ project: p }: { project: Project }) {
  const consent = useConsent(p.id);
  const kids = (consent.data?.consents || []).filter((c) => c.answer !== "full");
  if (kids.length === 0) return null;
  return (
    <Card
      title={`Let op bij het uitzoeken: ${kids.length} ${kids.length === 1 ? "kind" : "kinderen"}`}
      action={<Link className="s-btn sm" to={`/admin/project/${p.id}?tab=consent`}>Alle toestemmingen</Link>}
    >
      <RestrictedChildren consents={kids} compact />
    </Card>
  );
}

/** One link for all parents, and what each of them answered per child. */
export function ConsentTab({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const state = useConsent(p.id);
  const [copied, setCopied] = useState<"" | "link" | "message">("");
  const store = (s: ConsentState) => qc.setQueryData(keys.consent(p.id), s);
  const base = `/admin/project/${p.id}/consent`;

  const create = useAction({ fn: () => post<ConsentState>(base), onSuccess: store, success: "Toestemmingslink gemaakt" });
  const update = useAction({
    fn: (active: boolean) => put<ConsentState>(base, { active }),
    onSuccess: store,
    success: (_s, active) => (active ? "Link staat weer aan" : "Link staat uit"),
  });
  const remove = useAction({ fn: (c: ConsentRow) => del<ConsentState>(`${base}/${c.id}`), onSuccess: store, success: "Verwijderd" });
  const clearPhotos = useAction<void, ConsentState & { removed: number }>({
    fn: () => del(`${base}/photos`),
    onSuccess: store,
    success: (r) => `${r.removed} ${r.removed === 1 ? "foto" : "foto's"} verwijderd`,
  });

  const s = state.data;
  if (state.isError) return <ErrorState error={state.error} retry={() => state.refetch()} />;
  if (!s) return <Card><Skeleton h={88} /></Card>;

  const form = s.form;
  if (!form) {
    return (
      <Card title="Toestemming van ouders">
        <div className="s-stack" style={{ alignItems: "flex-start" }}>
          <p className="s-small s-muted" style={{ maxWidth: "62ch" }}>
            Eén link voor alle ouders. Per kind geven ze door wat er mag: op de foto en op social media, alleen op de foto, of niet op de foto.
            Mag er iets niet, dan vraagt het formulier om een foto van het kind, zodat je het herkent.
          </p>
          <Button variant="primary" icon={<Link2 />} loading={create.isPending} onClick={() => create.mutate()}>Link maken</Button>
        </div>
      </Card>
    );
  }

  const restricted = s.consents.filter((c) => c.answer !== "full");
  const allowed = s.consents.filter((c) => c.answer === "full");
  const photos = s.consents.filter((c) => c.photoUrl).length;
  const message = parentMessage(p, form.url);

  async function copy(what: "link" | "message", text: string) {
    if (await copyText(text)) setCopied(what);
  }
  async function askRemove(c: ConsentRow) {
    if (await confirm({ title: `${c.childName} verwijderen?`, body: `De keuze van ${c.parentName} en de foto gaan weg. Daarna weet je niet meer wat deze ouder koos.`, confirm: "Verwijderen", danger: true })) remove.mutate(c);
  }

  return (
    <div className="s-stack lg">
      <Card title="Toestemming van ouders" action={<Pill tone={form.active ? "ok" : undefined} plain={!form.active}>{form.active ? "Aan" : "Uit"}</Pill>}>
        <div className="s-stack lg">
          <div className="s-row">
            <Input readOnly value={form.url} aria-label="Toestemmingslink" onFocus={(e) => e.currentTarget.select()}
              style={{ flex: "1 1 280px", minWidth: 0, opacity: form.active ? 1 : 0.55 }} />
            <Button icon={copied === "link" ? <Check /> : <Copy />} disabled={!form.active} onClick={() => copy("link", form.url)}>{copied === "link" ? "Gekopieerd" : "Link kopiëren"}</Button>
            <Button icon={copied === "message" ? <Check /> : <Copy />} disabled={!form.active} onClick={() => copy("message", message)}>{copied === "message" ? "Gekopieerd" : "Bericht kopiëren"}</Button>
            <a className="s-btn" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>
            <a className="s-btn" href={new URL(form.url).pathname} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" />Bekijken</a>
          </div>

          <ClubName project={p} />

          <div className="s-stats" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
            <div><b>{s.consents.length}</b><span>Ingevuld</span></div>
            <div><b>{s.totals.full}</b><span>Mag alles</span></div>
            <div><b>{s.totals.no_social}</b><span>Niet posten</span></div>
            <div><b>{s.totals.no_photo}</b><span>Niet in beeld</span></div>
          </div>

          <div className="s-row between">
            <div className="s-row">
              <Button size="sm" disabled={update.isPending} onClick={async () => {
                if (form.active && !(await confirm({ title: "Link uitzetten?", body: "Nieuwe ouders kunnen dan niets meer invullen. Wie al heeft ingevuld, kan zijn keuze nog wijzigen via de link in de mail.", confirm: "Uitzetten" }))) return;
                update.mutate(!form.active);
              }}>
                {form.active ? "Link uitzetten" : "Link weer aanzetten"}
              </Button>
              {photos > 0 && (
                <Button size="sm" variant="ghost" icon={<Trash2 />} loading={clearPhotos.isPending} onClick={async () => {
                  if (await confirm({ title: "Foto's van de kinderen verwijderen?", body: "De keuzes blijven bewaard. Bij levering gebeurt dit vanzelf.", confirm: "Verwijderen", danger: true })) clearPhotos.mutate();
                }}>
                  Foto's van de kinderen verwijderen
                </Button>
              )}
            </div>
            {s.consents.length > 0 && <Button size="sm" icon={<Download />} onClick={() => saveConsents(p, s.consents)}>Als CSV</Button>}
          </div>
        </div>
      </Card>

      {s.consents.length === 0 && (
        <Card><Empty title="Nog niets ingevuld">Stuur de link naar de ouders. Je krijgt een mail zodra iemand aangeeft dat iets niet mag.</Empty></Card>
      )}

      {restricted.length > 0 && (
        <Card title={`Let op: ${restricted.length} ${restricted.length === 1 ? "kind" : "kinderen"}`}>
          <RestrictedChildren consents={restricted} onRemove={askRemove} />
        </Card>
      )}

      {allowed.length > 0 && (
        <Card title={`Mag op de foto en op social media: ${allowed.length}`} bodyClass="none">
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Kind</th><th>Ouder</th><th>Ingevuld</th><th /></tr></thead>
              <tbody>
                {allowed.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.childName}</td>
                    <td>
                      <div>{c.parentName}</div>
                      <a className="s-small s-muted" href={`mailto:${c.parentEmail}`}>{c.parentEmail}</a>
                    </td>
                    <td className="s-small s-muted" title={fmtDateTime(c.updatedAt)} style={{ whiteSpace: "nowrap" }}>{ago(c.updatedAt)}</td>
                    <td className="right">
                      <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={`${c.childName} verwijderen`} title="Verwijderen" onClick={() => askRemove(c)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Whose social media the photos go on. Parents read it in what they agree to; at a match that includes the other team's. */
function ClubName({ project: p }: { project: Project }) {
  const saved = p.gallerySettings.consentClub || "";
  const [club, setClub] = useState(saved);
  const name = club.trim();
  useUnsavedChanges(name !== saved);
  const save = useAction({
    fn: () => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, consentClub: name } }),
    invalidate: () => [keys.project(p.id)],
    success: "Opgeslagen",
  });
  return (
    <div className="s-row" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <TextField label="Op wiens social media komen de foto's?" placeholder="Bijv. DVO'60" maxLength={60} value={club} onChange={(e) => setClub(e.target.value)}
          hint={`Ouders lezen: "De foto's mogen op social media van ${name || "de club"} en van PhotoDeCaffeine."`} />
      </div>
      {name !== saved && <Button variant="primary" loading={save.isPending} style={{ marginTop: 24 }} onClick={() => save.mutate()}>Opslaan</Button>}
    </div>
  );
}

/** The answers as proof, in a spreadsheet (semicolons, for Excel in Dutch). */
function saveConsents(p: Project, consents: ConsentRow[]) {
  const when = (iso: string) => fmt(iso, "yyyy-MM-dd HH:mm");
  const rows = [
    ["Kind", "Keuze", "Verklaring", "Herkenbaar aan", "Ouder", "E-mail", "Ingevuld", "Laatst gewijzigd"],
    ...consents.map((c) => [c.childName, ANSWER_LABEL[c.answer], c.statement, c.note, c.parentName, c.parentEmail, when(c.createdAt), when(c.updatedAt)]),
  ];
  const name = (p.gallerySettings.title || p.title).replace(/[^\w-]+/g, "-").toLowerCase();
  saveFile(`toestemming-${name}.csv`, `﻿${rows.map((r) => r.map(csvCell).join(";")).join("\r\n")}`, "text/csv;charset=utf-8");
}
