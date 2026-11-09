import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Pause, Plus, Send, Square, Timer } from "lucide-react";
import { useState } from "react";
import { del, post, put } from "../../api";
import { CATEGORIES, DELIVERY_STEP, fmtDate, HOLD_LABEL, isDelivered, PART_KINDS, PART_LABEL, STEPS, stepLabel } from "../../format";
import { keys, useAction } from "../../queries";
import type { Hold, PartKind, Project, ProjectPart } from "../../types";
import { Button, cx, Modal, SelectField, TextAreaField, useConfirm } from "../../ui";
import { DeliverDialog } from "./DeliverDialog";

// Projecten 2.0: the parts of a project (Foto, Video, Website) at the top of
// its page. Each has its own steps and can wait, pause or stop on its own.
// Moving a step never mails anyone; Leveren is its own button.

/** A small coloured square per kind, the same everywhere: Foto copper, Video blue, Website green. */
export function PartDot({ kind, className }: { kind: PartKind; className?: string }) {
  return <span className={cx("s-partdot", kind, className)} aria-hidden="true" />;
}

const invalidate = (p: Project) => [keys.project(p.id), keys.projects, keys.overview];

/** The strip of parts: one card per part with its step, and adding a part. */
export function PartsBar({ project: p, selected, onSelect }: { project: Project; selected: ProjectPart | undefined; onSelect: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const missing = PART_KINDS.filter((k) => !p.parts.some((x) => x.kind === k));
  return (
    <div className="s-parts" role="tablist" aria-label="Onderdelen van het project">
      {p.parts.map((part) => (
        <button key={part.id} type="button" role="tab" aria-selected={part.id === selected?.id}
          className={cx("s-part", part.hold && `hold-${part.hold}`)} onClick={() => onSelect(part.id)}>
          <span className="s-part-name"><PartDot kind={part.kind} />{PART_LABEL[part.kind]}{part.category && <span className="s-part-cat">{part.category}</span>}</span>
          <span className="s-part-step">
            {stepLabel(part.kind, part.stage)}
            {part.hold && <span className={cx("s-part-hold", part.hold)}>{HOLD_LABEL[part.hold]}</span>}
          </span>
        </button>
      ))}
      {missing.length > 0 && (
        <button type="button" className="s-part add" onClick={() => setAdding(true)}>
          <span className="s-part-name"><Plus size={14} aria-hidden="true" />Onderdeel</span>
          <span className="s-part-step">{missing.map((k) => PART_LABEL[k]).join(", ")}</span>
        </button>
      )}
      <AddPartDialog project={p} kinds={missing} open={adding} onClose={() => setAdding(false)} onAdded={onSelect} />
    </div>
  );
}

/** The selected part: its steps, how it runs, and delivering. */
export function PartControls({ project: p, part }: { project: Project; part: ProjectPart }) {
  const confirm = useConfirm();
  const [delivering, setDelivering] = useState(false);
  const [holding, setHolding] = useState<Hold | null>(null);
  const steps = STEPS[part.kind];
  const at = steps.indexOf(part.stage);
  const deliveryAt = steps.indexOf(DELIVERY_STEP[part.kind]);
  const delivered = isDelivered(part);
  const move = useAction({
    fn: (stage: string) => put(`/admin/project/${p.id}/parts/${part.id}`, { stage }),
    invalidate: () => invalidate(p),
    success: (_d, stage) => `${PART_LABEL[part.kind]}: ${stepLabel(part.kind, stage)}`,
  });
  const hold = useAction({
    fn: (b: { hold: Hold; holdNote?: string }) => put(`/admin/project/${p.id}/parts/${part.id}`, b),
    invalidate: () => invalidate(p),
    success: (_d, b) => (b.hold ? `${PART_LABEL[part.kind]}: ${HOLD_LABEL[b.hold].toLowerCase()}` : `${PART_LABEL[part.kind]} loopt weer`),
  });

  function go(i: number) {
    const stage = steps[i];
    if (stage === part.stage || move.isPending) return;
    // Past the delivery: only through Leveren, so the client never gets a mail by accident.
    if (!delivered && i >= deliveryAt) return setDelivering(true);
    move.mutate(stage);
  }

  return (
    <div className="s-partbar">
      <div className="s-row" style={{ gap: 10, minWidth: 0 }}>
        <div className="s-stepper" role="group" aria-label={`Stap van ${PART_LABEL[part.kind]}`}>
          {steps.map((s, i) => (
            <button key={s} type="button" className={cx(i === at ? "now" : i < at && "done", i === deliveryAt && "deliver")}
              aria-current={i === at ? "step" : undefined} disabled={move.isPending} onClick={() => go(i)}
              title={!delivered && i >= deliveryAt ? "Leveren gaat met de knop Leveren" : undefined}>
              {i < at && <Check size={12} aria-hidden="true" />}{stepLabel(part.kind, s)}
            </button>
          ))}
        </div>
      </div>
      <div className="s-row" style={{ gap: 8 }}>
        <HoldMenu part={part} onPick={async (h) => {
          if (h === "waiting") return setHolding("waiting");
          if (h === "stopped" && !(await confirm({
            title: `${PART_LABEL[part.kind]} stoppen?`,
            body: p.parts.length > 1
              ? "Dit onderdeel gaat niet door. De andere onderdelen lopen gewoon verder. Er gaat geen mail uit."
              : "Dit project gaat niet door. Er gaat geen mail uit en er wordt niets geleverd. Je vindt het terug met Toon gestopt.",
            confirm: "Stoppen",
          }))) return;
          hold.mutate({ hold: h });
        }} />
        {part.hold !== "stopped" && (
          <Button variant={!delivered && at >= deliveryAt - 1 ? "primary" : "default"} icon={<Send />} onClick={() => setDelivering(true)}>
            {part.kind === "web" ? (delivered ? "Opnieuw live melden" : "Live zetten") : delivered ? "Opnieuw leveren" : "Leveren"}
          </Button>
        )}
      </div>
      {part.hold === "waiting" && (
        <div className="s-holdnote">
          <Timer size={15} aria-hidden="true" />
          <div style={{ minWidth: 0 }}>
            <b>Wacht op klant{part.holdSince ? ` sinds ${fmtDate(part.holdSince)}` : ""}</b>
            <span>{part.holdNote || "Nog niet gezegd waarop. De klant ziet dit in het portaal."}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setHolding("waiting")}>Aanpassen</Button>
        </div>
      )}
      <HoldDialog open={holding === "waiting"} part={part} onClose={() => setHolding(null)}
        onSave={(note) => hold.mutate({ hold: "waiting", holdNote: note }, { onSuccess: () => setHolding(null) })} saving={hold.isPending} />
      {delivering && <DeliverDialog project={p} part={part} onClose={() => setDelivering(false)} />}
    </div>
  );
}

function HoldMenu({ part, onPick }: { part: ProjectPart; onPick: (h: Hold) => void }) {
  const [open, setOpen] = useState(false);
  const options: { value: Hold; label: string; sub: string; icon: React.ReactNode }[] = [
    { value: "", label: "Loopt", sub: "Gewoon bezig", icon: <Check size={15} /> },
    { value: "waiting", label: "Wacht op klant", sub: "De klant ziet in het portaal wat er nodig is", icon: <Timer size={15} /> },
    { value: "paused", label: "Gepauzeerd", sub: "Even stil, zonder reden voor de klant", icon: <Pause size={15} /> },
    { value: "stopped", label: "Gestopt", sub: "Gaat niet door. Geen mail, niets geleverd", icon: <Square size={15} /> },
  ];
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={cx("s-btn", part.hold && `s-holdbtn ${part.hold}`)} aria-label={`Status: ${HOLD_LABEL[part.hold]}`}>
          <span className={cx("s-holddot", part.hold || "run")} aria-hidden="true" />{HOLD_LABEL[part.hold]}<ChevronDown size={14} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <div className="studio" style={{ minHeight: 0 }}>
          <Popover.Content align="end" sideOffset={6} className="s-card s-menu" style={{ zIndex: 50 }}>
            {options.map((o) => (
              <button key={o.value || "run"} type="button" className="s-menu-item" aria-pressed={part.hold === o.value}
                onClick={() => { setOpen(false); if (o.value !== part.hold || o.value === "waiting") onPick(o.value); }}>
                <span className="s-menu-ico" aria-hidden="true">{o.icon}</span>
                <span><b>{o.label}</b><small>{o.sub}</small></span>
              </button>
            ))}
          </Popover.Content>
        </div>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HoldDialog({ open, part, onClose, onSave, saving }: { open: boolean; part: ProjectPart; onClose: () => void; onSave: (note: string) => void; saving: boolean }) {
  const [note, setNote] = useState(part.holdNote || "");
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Wacht op klant"
      description="Zolang dit aanstaat, ziet de klant bovenaan in het portaal wat er van hem nodig is."
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={saving} onClick={() => onSave(note.trim())}>Opslaan</Button></>}>
      <TextAreaField label="Wat moet de klant doen?" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Bijv. Stuur je logo en kleuren, dan gaan we verder met het ontwerp." hint="Gewone woorden, in je-vorm. De klant leest dit letterlijk." />
    </Modal>
  );
}

function AddPartDialog({ project: p, kinds, open, onClose, onAdded }: { project: Project; kinds: PartKind[]; open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const [kind, setKind] = useState<PartKind>(kinds[0] || "photo");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("lead");
  const kindNow = kinds.includes(kind) ? kind : kinds[0];
  const add = useAction({
    fn: () => post<{ project: Project }>(`/admin/project/${p.id}/parts`, { kind: kindNow, category, stage }),
    invalidate: () => invalidate(p),
    success: `${PART_LABEL[kindNow] || "Onderdeel"} toegevoegd`,
    onSuccess: (r) => {
      const made = r.project.parts.find((x) => x.kind === kindNow);
      onClose();
      if (made) onAdded(made.id);
    },
  });
  if (!kindNow) return null;
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Onderdeel toevoegen"
      description="Een eigen onderdeel met eigen stappen, bij hetzelfde project en dezelfde klant. Een offerte maak je er apart voor."
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={add.isPending} onClick={() => add.mutate()}>Toevoegen</Button></>}>
      <div className="s-stack">
        <div className="s-kindpick" role="radiogroup" aria-label="Soort">
          {kinds.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={k === kindNow} className="s-kindopt" onClick={() => { setKind(k); setCategory(""); }}>
              <PartDot kind={k} />{PART_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="s-form-grid">
          <SelectField label="Categorie" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Kies…</option>
            {CATEGORIES[kindNow].map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
          <SelectField label="Begint bij" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STEPS[kindNow].slice(0, STEPS[kindNow].indexOf(DELIVERY_STEP[kindNow])).map((s) => <option key={s} value={s}>{stepLabel(kindNow, s)}</option>)}
          </SelectField>
        </div>
      </div>
    </Modal>
  );
}

/** Overzicht: every part on one line, with what is next. */
export function PartsSummary({ project: p, onSelect }: { project: Project; onSelect: (id: string) => void }) {
  const confirm = useConfirm();
  const remove = useAction({
    fn: (part: ProjectPart) => del(`/admin/project/${p.id}/parts/${part.id}`),
    invalidate: () => invalidate(p),
    success: "Onderdeel verwijderd",
  });
  return (
    <section className="s-card" aria-labelledby="parts-title">
      <div className="s-card-head"><h2 id="parts-title">Alle onderdelen</h2><span className="s-small s-faint">wat er per onderdeel nog moet</span></div>
      <ul className="s-list">
        {p.parts.map((part) => {
          const steps = STEPS[part.kind];
          const at = steps.indexOf(part.stage);
          const next = steps[at + 1];
          return (
            <li key={part.id} className="s-item" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
              <PartDot kind={part.kind} />
              <button type="button" className="s-linkbtn" onClick={() => onSelect(part.id)} style={{ textAlign: "left", minWidth: 0 }}>
                <span className="t">{PART_LABEL[part.kind]}{part.category ? ` · ${part.category}` : ""}</span>
                <span className="s" style={{ display: "block" }}>
                  {part.hold === "stopped" ? "Gestopt" : part.hold === "waiting" ? `Wacht op klant${part.holdNote ? `: ${part.holdNote}` : ""}`
                    : isDelivered(part) ? `${stepLabel(part.kind, part.stage)}${part.deliveredAt ? ` op ${fmtDate(part.deliveredAt)}` : ""}`
                    : `${stepLabel(part.kind, part.stage)}${next ? `, hierna ${stepLabel(part.kind, next).toLowerCase()}` : ""}`}
                </span>
              </button>
              {p.parts.length > 1 && (
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (await confirm({ title: `${PART_LABEL[part.kind]} weghalen?`, body: "Het onderdeel en zijn stappen gaan weg. Foto's, berichten en facturen blijven bij het project.", confirm: "Weghalen", danger: true })) remove.mutate(part);
                }}>Weghalen</Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
