import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { get, post } from "../../api";
import { fmtDate, PART_LABEL } from "../../format";
import { keys, useAction } from "../../queries";
import type { Project, ProjectPart } from "../../types";
import { Button, ErrorState, Modal, Skeleton } from "../../ui";

type Plan = {
  kind: ProjectPart["kind"];
  first: boolean;
  until: string;
  clientSees: "original" | "watermark";
  clientDownloads: "original" | "watermark" | "none";
  watermark: boolean;
  selling: boolean;
  childPhotos: number;
  recipients: { name: string; email: string }[];
  subject: string;
  html: string;
};

/**
 * Leveren: first what happens and which mail the client gets, then the button.
 * A second delivery mails only when the studio says so, and the download time
 * only starts again when asked.
 */
export function DeliverDialog({ project: p, part, onClose }: { project: Project; part: ProjectPart; onClose: () => void }) {
  const qc = useQueryClient();
  const gs = p.gallerySettings;
  const web = part.kind === "web";
  const first = !part.deliveredAt;
  // With the watermark on, delivering can give the client the originals; while
  // photos are for sale it does not, unless the studio ticks it.
  const canGiveOriginals = !web && gs.watermark === true && !gs.clientOriginals;
  const [originals, setOriginals] = useState<boolean | null>(null);
  const [mail, setMail] = useState(first);
  const [restart, setRestart] = useState(false);
  const plan = useQuery({
    queryKey: ["deliver", p.id, part.id, originals],
    queryFn: ({ signal }) => get<Plan>(`/admin/project/${p.id}/parts/${part.id}/deliver${originals === null ? "" : `?clientOriginals=${originals ? 1 : 0}`}`, signal),
    placeholderData: keepPreviousData,
  });
  const data = plan.data;
  // The default once the plan is in: originals, unless the photos are for sale.
  useEffect(() => {
    if (canGiveOriginals && data && originals === null) setOriginals(!data.selling);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const giveOriginals = originals ?? false;

  const deliver = useAction({
    fn: () => post<{ project: Project; sentTo: string[] }>(`/admin/project/${p.id}/parts/${part.id}/deliver`, {
      mail, restartDownloads: !first && restart, ...(canGiveOriginals ? { clientOriginals: giveOriginals } : {}),
    }),
    success: (r) => (r.sentTo.length ? `${PART_LABEL[part.kind]} geleverd. Mail naar ${r.sentTo.join(", ")}` : `${PART_LABEL[part.kind]} geleverd, zonder mail`),
    onSuccess: (r) => {
      qc.setQueryData(keys.project(p.id), (old: Project | undefined) => (old ? { ...old, ...r.project, favorites: old.favorites, unreadMessages: old.unreadMessages } : r.project));
      qc.invalidateQueries({ queryKey: keys.projects });
      qc.invalidateQueries({ queryKey: keys.overview });
      onClose();
    },
  });

  const count = p.gallery.length;
  const title = web ? (first ? "Website live zetten?" : "Opnieuw live melden?") : first ? `${part.kind === "video" ? "Video" : "Foto's"} leveren?` : "Opnieuw leveren?";
  const facts: { text: React.ReactNode; warn?: boolean }[] = [];
  if (data) {
    facts.push({ text: <>De stap wordt <b>{web ? "Live" : "Geleverd"}</b>.</> });
    if (!web) {
      facts.push({ text: data.clientSees === "watermark" ? <>De klant ziet de foto's <b>met watermerk</b>.</> : <>De klant ziet de foto's <b>zonder watermerk</b>.</> });
      facts.push({
        text: data.clientDownloads === "none" ? <>De klant kan <b>niet downloaden</b>.</>
          : <>De klant kan downloaden{data.clientDownloads === "watermark" ? " met watermerk" : ""}{data.until ? <> tot <b>{fmtDate(data.until)}</b></> : ""}{!first && restart ? ", opnieuw gerekend vanaf vandaag" : ""}.</>,
      });
      if (data.selling) facts.push({ text: <>Iedereen met de groepslink kan foto's <b>kopen</b>.</> });
      if (data.childPhotos > 0) facts.push({ text: <>De {data.childPhotos === 1 ? "foto van het kind" : `${data.childPhotos} foto's van de kinderen`} bij Toestemming {data.childPhotos === 1 ? "wordt" : "worden"} verwijderd.</>, warn: true });
    }
  }
  const nobody = data && data.recipients.length === 0;

  return (
    <Modal open onOpenChange={(o) => !o && !deliver.isPending && onClose()} wide title={title}
      description={`${p.title} · ${PART_LABEL[part.kind]}${!web && count ? ` · ${count} ${count === 1 ? "bestand" : "bestanden"}` : ""}`}
      footer={
        <>
          <Button onClick={onClose} disabled={deliver.isPending}>Annuleren</Button>
          <Button variant="primary" icon={mail && !nobody ? <Mail /> : <Check />} loading={deliver.isPending} disabled={!data} onClick={() => deliver.mutate()}>
            {web ? (mail && !nobody ? "Live zetten en mailen" : "Live zetten zonder mail") : mail && !nobody ? "Leveren en mailen" : "Leveren zonder mail"}
          </Button>
        </>
      }>
      {plan.isError ? <ErrorState error={plan.error} retry={() => plan.refetch()} /> : !data ? (
        <div className="s-stack"><Skeleton h={18} w="70%" /><Skeleton h={18} w="55%" /><Skeleton h={220} r={10} /></div>
      ) : (
        <div className="s-deliver">
          <div className="s-stack">
            <span className="s-eyebrow">Dit gebeurt</span>
            <ul className="s-deliver-facts">
              {facts.map((f, i) => (
                <li key={i} className={f.warn ? "warn" : undefined}>{f.warn ? <AlertTriangle size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}<span>{f.text}</span></li>
              ))}
            </ul>
            {canGiveOriginals && (
              <label className="s-check-row">
                <input type="checkbox" checked={giveOriginals} onChange={(e) => setOriginals(e.target.checked)} />
                <span><b>De klant krijgt de originelen</b><small>{data.selling ? "Staat uit omdat foto's te koop zijn. Gasten houden het watermerk." : "Zonder watermerk. Gasten met de groepslink houden het watermerk."}</small></span>
              </label>
            )}
            {!first && !web && (
              <label className="s-check-row">
                <input type="checkbox" checked={restart} onChange={(e) => setRestart(e.target.checked)} />
                <span><b>Downloadtijd opnieuw starten</b><small>Staat uit. De drie maanden tellen vanaf de eerste levering.</small></span>
              </label>
            )}
            <label className="s-check-row">
              <input type="checkbox" checked={mail && !nobody} disabled={!!nobody} onChange={(e) => setMail(e.target.checked)} />
              <span>
                <b>Mail de klant</b>
                <small>{nobody ? "Er staat geen klant met een e-mailadres bij dit project." : first ? data.recipients.map((r) => r.email).join(", ") : "Staat uit bij een tweede levering. Zet aan als er echt iets nieuws te zien is."}</small>
              </span>
            </label>
          </div>
          <div className="s-mailpreview" aria-label="Voorbeeld van de mail">
            <div className="s-mailpreview-head">
              <span><span className="s-faint">Aan</span> {data.recipients[0]?.name || "[naam klant]"}{data.recipients.length > 1 ? ` en ${data.recipients.length - 1} meer` : ""}</span>
              <span><span className="s-faint">Onderwerp</span> <b>{data.subject}</b></span>
            </div>
            <iframe title="Voorbeeld van de mail" srcDoc={data.html} sandbox="" className={mail && !nobody ? undefined : "off"} />
          </div>
        </div>
      )}
    </Modal>
  );
}
