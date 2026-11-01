import { useQuery } from "@tanstack/react-query";
import { Copy, Mail, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { del, get, post, put } from "../api";
import { ago, fmtDate } from "../format";
import { copyText } from "../gallery/share";
import { useAction } from "../queries";
import { Button, Input, Modal, Pill, Segmented, Skeleton, TextAreaField, useConfirm } from "../ui";

// Who has to agree before a portfolio piece may be shown (Portfolio in the admin).
// A no comes in by itself: the edge function takes the piece off the site.

type Summary = Record<string, { needed: boolean | null; people: number; given: number; refused: number }>;
type Person = { name: string; email: string; sentAt: string };
type Answer = {
  id: string; answer: "given" | "refused"; places: string[]; nameUse: string; limits: string; name: string; email: string;
  guardianOf: string; statement: string; updatedAt: string;
};
type Detail = { needed: boolean | null; people: Person[]; note: string; url: string; answers: Answer[] };

const SUMMARY_KEY = ["article-consents"];
const detailKey = (id: string) => ["article-consent", id];
const PLACE: Record<string, string> = { website: "website", social: "social media", print: "drukwerk", ads: "advertenties" };
const NAME_USE: Record<string, string> = { none: "geen naam", first: "voornaam", full: "volledige naam" };

export const useConsentSummary = () =>
  useQuery({ queryKey: SUMMARY_KEY, queryFn: ({ signal }) => get<{ summary: Summary }>("/admin/article-consents", signal).then((r) => r.summary) });

/** Still waiting for someone, or someone said no. */
export function consentOpen(s: Summary[string] | undefined): boolean {
  if (!s) return false;
  return s.needed === null || (s.needed === true && (s.refused > 0 || s.given < Math.max(s.people, 1)));
}

export function ConsentPill({ s }: { s: Summary[string] | undefined }) {
  if (!s || s.needed === null) return <Pill>Toestemming?</Pill>;
  if (s.needed === false) return <Pill>Geen toestemming nodig</Pill>;
  if (s.refused > 0) return <Pill tone="bad">Nee gekregen</Pill>;
  if (s.given >= Math.max(s.people, 1)) return <Pill tone="ok">Toestemming binnen</Pill>;
  return <Pill tone="warn">Wacht op toestemming{s.people ? ` (${s.given}/${s.people})` : ""}</Pill>;
}

export function ArticleConsentDialog({ article, onClose }: { article: { id: string; title: string }; onClose: () => void }) {
  const query = useQuery({ queryKey: detailKey(article.id), queryFn: ({ signal }) => get<Detail>(`/admin/article-consents/${article.id}`, signal) });
  const data = query.data;
  const [needed, setNeeded] = useState<boolean | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [note, setNote] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    if (!data) return;
    setNeeded(data.needed);
    setPeople(data.people);
    setNote(data.note);
  }, [data]);

  const body = () => ({ needed, people, note });
  const invalidate = () => [SUMMARY_KEY, detailKey(article.id)];
  const save = useAction({ fn: () => put(`/admin/article-consents/${article.id}`, body()), invalidate, success: "Opgeslagen" });
  const send = useAction({
    // First the list as it stands, so a person added just now is there to be marked as asked.
    fn: async (p: Person) => {
      await put(`/admin/article-consents/${article.id}`, body());
      return post(`/admin/article-consents/${article.id}/send`, { name: p.name, email: p.email });
    },
    invalidate,
    success: "Mail verstuurd",
  });
  const remove = useAction({ fn: (id: string) => del(`/admin/article-consents/${article.id}/answers/${id}`), invalidate, success: "Antwoord verwijderd" });

  const statusOf = (p: Person) => {
    const a = data?.answers.find((x) => (p.email && x.email === p.email.toLowerCase()) || (p.name && x.name.toLowerCase() === p.name.toLowerCase()));
    if (a) return <Pill tone={a.answer === "given" ? "ok" : "bad"}>{a.answer === "given" ? "Ja" : "Nee"}</Pill>;
    return p.sentAt ? <span className="s-small s-muted">Gevraagd {ago(p.sentAt)}</span> : <span className="s-small s-faint">Nog niet gevraagd</span>;
  };
  const setPerson = (i: number, patch: Partial<Person>) => setPeople((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Toestemming: ${article.title}`}
      description="Staan er herkenbare mensen, namen of kentekens op? Dan vragen we eerst of het mag. Zegt iemand nee, dan gaat het stuk vanzelf van de site."
      footer={
        <>
          <Button onClick={onClose}>Sluiten</Button>
          <Button variant="primary" icon={<Save />} loading={save.isPending} disabled={!data} onClick={() => save.mutate()}>Opslaan</Button>
        </>
      }
    >
      {!data ? <Skeleton h={160} /> : (
        <div className="s-stack">
          <Segmented<"yes" | "no" | "unknown">
            label="Is toestemming nodig?"
            value={needed === null ? "unknown" : needed ? "yes" : "no"}
            onChange={(v) => setNeeded(v === "unknown" ? null : v === "yes")}
            options={[{ value: "unknown", label: "Nog bekijken" }, { value: "yes", label: "Nodig" }, { value: "no", label: "Niet nodig" }]}
          />
          {needed !== false && (
            <>
              <div className="s-stack sm">
                <b className="s-small">Wie vragen we?</b>
                {people.map((p, i) => (
                  <div key={i} className="s-row nowrap">
                    <Input aria-label="Naam" placeholder="Naam" value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} />
                    <Input aria-label="E-mail" placeholder="E-mail (mag leeg)" type="email" value={p.email} onChange={(e) => setPerson(i, { email: e.target.value })} />
                    <span style={{ minWidth: 110 }}>{statusOf(p)}</span>
                    <Button size="sm" icon={<Mail />} disabled={!p.email} loading={send.isPending && send.variables?.email === p.email} onClick={() => send.mutate(p)}>Mail</Button>
                    <Button size="sm" variant="ghost" iconOnly aria-label="Weghalen" icon={<X />} onClick={() => setPeople((list) => list.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <div className="s-row">
                  <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setPeople((list) => [...list, { name: "", email: "", sentAt: "" }])}>Persoon toevoegen</Button>
                  <Button size="sm" variant="ghost" icon={<Copy />} onClick={() => copyText(data.url)}>Link kopiëren, voor WhatsApp</Button>
                </div>
              </div>
              {data.answers.length > 0 && (
                <div className="s-stack sm">
                  <b className="s-small">Antwoorden</b>
                  {data.answers.map((a) => (
                    <div key={a.id} className="s-row between nowrap">
                      <div className="s-stack xs" style={{ minWidth: 0 }}>
                        <span className="s-row">
                          <Pill tone={a.answer === "given" ? "ok" : "bad"}>{a.answer === "given" ? "Ja" : "Nee"}</Pill>
                          <b className="s-truncate">{a.name}</b>
                          <span className="s-small s-muted">{a.email} · {fmtDate(a.updatedAt)}</span>
                        </span>
                        {a.answer === "given" && <span className="s-small s-muted">{a.places.map((p) => PLACE[p] || p).join(", ")} · {NAME_USE[a.nameUse] || a.nameUse}</span>}
                        {a.guardianOf && <span className="s-small s-muted">Ouder of voogd van {a.guardianOf}</span>}
                        {a.limits && <span className="s-small">{a.limits}</span>}
                      </div>
                      <Button size="sm" variant="ghost" iconOnly aria-label="Antwoord verwijderen" icon={<Trash2 />} onClick={async () => {
                        if (await confirm({ title: "Antwoord verwijderen?", body: "Dan is het bewijs van deze keuze weg. Doe dit alleen bij een test of een vergissing.", confirm: "Verwijderen", danger: true })) remove.mutate(a.id);
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <TextAreaField label="Notitie (alleen voor de studio)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
