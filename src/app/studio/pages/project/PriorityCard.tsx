import { useQueryClient } from "@tanstack/react-query";
import { Check, Images, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import { post } from "../../api";
import { ago, euro, fmt } from "../../format";
import { keys, useAction, usePriority } from "../../queries";
import type { PriorityRequest, Project } from "../../types";
import { Button, Card, Modal, Pill, TextAreaField, TextField, useConfirm } from "../../ui";

// Voorrang: guests who asked for the photos of one person first (lib/priority.ts
// in the edge function). The studio looks whether there are enough photos and
// answers: a payment link, or too few and an offer for a shoot of their own.
// Paid, the photos are picked in the gallery below and delivered from here.

const firstName = (name: string) => name.trim().split(/\s+/)[0];
export const priorityLabel = (r: PriorityRequest) => `${r.person}${r.number ? ` #${r.number}` : ""}`;

/** Still running: photos can be picked for it. */
export const pickable = (r: PriorityRequest) => r.status === "new" || r.status === "offered" || r.status === "delivered";

const ORDER: Record<PriorityRequest["status"], number> = { new: 0, offered: 1, delivered: 2, booking: 3, closed: 4 };

type Answer = "offer" | "booking" | "deliver";
type Reply = { request: PriorityRequest; requests: PriorityRequest[]; mailed?: boolean; skipped?: number };

export function PriorityCard({ project: p, shownId, onShow }: {
  project: Project;
  /** The request whose photos the gallery shows alone. */
  shownId: string;
  onShow: (id: string) => void;
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const list = usePriority(p.id).data || [];
  const [answering, setAnswering] = useState<{ kind: Answer; r: PriorityRequest } | null>(null);
  const store = (r: Reply) => qc.setQueryData(keys.priority(p.id), r.requests);

  const close = useAction({
    fn: (r: PriorityRequest) => post<Reply>(`/admin/priority/${r.id}/close`),
    invalidate: () => [keys.invoices],
    onSuccess: store,
    success: "Aanvraag gesloten",
  });

  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt));
  const waiting = list.filter((r) => r.status === "new").length;
  const toDo = list.filter((r) => r.status === "offered" && r.paid).length;

  return (
    <Card title={<h2 id="voorrang">Voorrang</h2>} action={(waiting > 0 || toDo > 0) && (
      <Pill tone="warn">{[waiting && `${waiting} te bekijken`, toDo && `${toDo} te leveren`].filter(Boolean).join(" · ")}</Pill>
    )}>
      <div className="s-stack">
        <p className="s-small s-muted" style={{ maxWidth: "70ch" }}>
          Gasten die hun foto's eerst willen. Vink hun foto's aan in de galerij hieronder en kies "Voor …". Zo zie je of er genoeg zijn. Na betaling lever je ze hier.
        </p>
        <ul className="s-prio-list">
          {sorted.map((r) => (
            <Row key={r.id} r={r} shown={shownId === r.id} onShow={onShow} onAnswer={(kind) => setAnswering({ kind, r })}
              onClose={async () => {
                if (await confirm({
                  title: `Aanvraag van ${firstName(r.person)} sluiten?`,
                  body: r.status === "offered" ? "De gast krijgt geen mail. De betaallink vervalt, de factuur gaat op vervallen." : "De gast krijgt geen mail.",
                  confirm: "Sluiten",
                })) close.mutate(r);
              }} />
          ))}
        </ul>
      </div>
      {answering && <AnswerDialog kind={answering.kind} r={answering.r} onDone={(reply) => { if (reply) store(reply); setAnswering(null); }} />}
    </Card>
  );
}

function statusOf(r: PriorityRequest): { label: string; tone?: "ok" | "warn" | "bad" | "info" | "acc"; plain?: boolean } {
  if (r.status === "new") return { label: "Nieuw", tone: "warn" };
  if (r.status === "offered" && !r.paid) return { label: "Wacht op betaling", tone: "info" };
  if (r.status === "offered") return { label: r.dueBy ? `Betaald · leveren vóór ${fmt(r.dueBy, "d MMM")}` : "Betaald", tone: "ok" };
  if (r.status === "delivered") return { label: "Geleverd", tone: "ok", plain: true };
  if (r.status === "booking") return { label: "Eigen shoot aangeboden", plain: true };
  return { label: "Gesloten", plain: true };
}

function Row({ r, shown, onShow, onAnswer, onClose }: {
  r: PriorityRequest; shown: boolean; onShow: (id: string) => void; onAnswer: (kind: Answer) => void; onClose: () => void;
}) {
  const s = statusOf(r);
  const first = firstName(r.person);
  const picked = r.images.length;
  return (
    <li className="s-prio-row" data-status={r.status}>
      <div className="s-prio-main">
        <div className="s-row" style={{ gap: 8 }}>
          <b>{priorityLabel(r)}</b>
          <Pill tone={s.tone} plain={s.plain}>{s.label}</Pill>
        </div>
        {r.note && <span className="s-small">Herkenbaar aan: {r.note}</span>}
        <span className="s-small s-muted">
          {r.guest.name} · <a href={`mailto:${r.guest.email}`}>{r.guest.email}</a> · {ago(r.createdAt)} · {euro(r.price)}, {r.days} {r.days === 1 ? "werkdag" : "werkdagen"}
          {r.invoice && <> · <Link to={`/admin/invoice/${r.invoice.id}`}>{r.invoice.number}</Link></>}
        </span>
      </div>
      <div className="s-prio-actions">
        {pickable(r) && (
          picked > 0
            ? <Button size="sm" icon={<Images />} aria-pressed={shown} variant={shown ? "primary" : "default"} onClick={() => onShow(shown ? "" : r.id)}>{picked} {picked === 1 ? "foto" : "foto's"}</Button>
            : r.status !== "new" && <span className="s-small s-faint">Nog geen foto's gekozen</span>
        )}
        {r.status === "new" && (
          <>
            <Button size="sm" variant="primary" icon={<Check />} onClick={() => onAnswer("offer")}>Genoeg foto's</Button>
            <Button size="sm" onClick={() => onAnswer("booking")}>Te weinig</Button>
          </>
        )}
        {r.status === "booking" && <Button size="sm" onClick={() => onAnswer("offer")}>Toch genoeg</Button>}
        {(r.status === "offered" || r.status === "delivered") && (
          <Button size="sm" variant={r.paid && r.status === "offered" ? "primary" : "default"} icon={<Send />} disabled={picked === 0}
            title={picked === 0 ? `Vink eerst de foto's van ${first} aan in de galerij` : undefined} onClick={() => onAnswer("deliver")}>
            {r.status === "delivered" ? "Opnieuw sturen" : "Leveren"}
          </Button>
        )}
        {(r.status === "new" || (r.status === "offered" && !r.paid)) && (
          <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={`Aanvraag van ${first} sluiten`} title="Sluiten zonder mail" onClick={onClose} />
        )}
      </div>
    </li>
  );
}

/** Enough photos, too few, or the photos are there: what the guest gets, with room for a word of your own. */
function AnswerDialog({ kind, r, onDone }: { kind: Answer; r: PriorityRequest; onDone: (reply: Reply | null) => void }) {
  const first = firstName(r.person);
  // The photos already ticked for this request are a count to start from.
  const [photos, setPhotos] = useState(r.images.length ? String(r.images.length) : "");
  const [message, setMessage] = useState("");
  const count = Number(photos);
  const photosError = photos.trim() && !(Number.isInteger(count) && count >= 1 && count <= 10000) ? "Vul een heel getal in, of laat het leeg." : "";
  const send = useAction({
    fn: () => post<Reply>(`/admin/priority/${r.id}/${kind}`, kind === "offer" ? { photos: photos.trim() ? count : null, message } : { message }),
    invalidate: () => (kind === "deliver" ? [] : [keys.invoices]),
    success: (reply) => (reply.mailed === false ? null : kind === "offer" ? `Betaallink gestuurd aan ${r.guest.name}` : kind === "booking" ? `Aanbod gestuurd aan ${r.guest.name}` : `Foto's van ${first} geleverd`),
    onSuccess: (reply) => {
      if (reply.mailed === false) toast.error(`Opgeslagen, maar de mail aan ${r.guest.email} kon niet weg. Laat het ${r.guest.name} zelf even weten.`);
      onDone(reply);
    },
  });

  const unpaid = kind === "deliver" && !r.paid && r.status === "offered";
  const text = {
    offer: {
      title: `Genoeg foto's van ${first}?`,
      body: `${r.guest.name} krijgt een mail met een betaallink van ${euro(r.price)}. Er komt een factuur bij. Na de betaling lever je binnen ${r.days} ${r.days === 1 ? "werkdag" : "werkdagen"}.`,
      button: "Betaallink sturen",
    },
    booking: {
      title: `Te weinig foto's van ${first}?`,
      body: `${r.guest.name} betaalt niets. De mail zegt dat er te weinig foto's zijn en linkt naar de pakketten voor sporters, voor een eigen shoot waarbij je op ${first} let.`,
      button: "Aanbod sturen",
    },
    deliver: {
      title: unpaid ? `Nog niet betaald. Toch leveren?` : `Foto's van ${first} leveren?`,
      body: `${r.guest.name} krijgt een mail met een link naar de galerij. Daar staan de ${r.images.length} ${r.images.length === 1 ? "foto" : "foto's"} van ${first} klaar om te downloaden, in het origineel.${unpaid ? " De factuur blijft openstaan." : ""}`,
      button: r.status === "delivered" ? "Opnieuw sturen" : "Leveren",
    },
  }[kind];

  return (
    <Modal open onOpenChange={(o) => !o && onDone(null)} title={text.title} description={text.body}
      footer={
        <>
          <Button onClick={() => onDone(null)}>Annuleren</Button>
          <Button variant="primary" icon={<Send />} loading={send.isPending} disabled={!!photosError} onClick={() => send.mutate()}>{text.button}</Button>
        </>
      }>
      <div className="s-stack">
        {kind === "offer" && (
          <TextField label="Hoeveel foto's ongeveer?" inputMode="numeric" value={photos} onChange={(e) => setPhotos(e.target.value)}
            error={photosError || undefined} hint={photosError ? undefined : `Komt in de mail: "We hebben 14 foto's van ${first} gevonden." Mag leeg.`} />
        )}
        <TextAreaField label="Bericht erbij" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
          hint="Komt in de mail, onder de vaste tekst. Mag leeg." />
      </div>
    </Modal>
  );
}
