import { ArrowLeft, Check, Plus, Send, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { post } from "../api";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, Field, Input, Photo, Select, Skeleton, Textarea } from "../ui";
import { usePortalProject } from "./data";
import { useT } from "./i18n";

type Note = { key: string; photoIds: string[]; category: string; text: string };

/** Notes on single photos, on several at once, or on the work in general. */
export function PortalFeedbackPage() {
  const { id = "" } = useParams();
  const t = useT();
  const data = usePortalProject(id);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [photoText, setPhotoText] = useState("");
  const [category, setCategory] = useState(t.feedbackCategories[0]);
  const [custom, setCustom] = useState("");
  const [generalText, setGeneralText] = useState("");
  const [sent, setSent] = useState(false);

  const send = useAction({
    fn: () => post(`/portal/project/${id}/feedback`, { items: notes.map((n) => ({ photoIds: n.photoIds, category: n.category, text: n.text })) }),
    success: t.feedbackThanks,
    onSuccess: () => { setSent(true); setNotes([]); },
  });

  if (data.isError) return <main className="p-main"><ErrorState error={data.error} /></main>;
  if (!data.data) return <main className="p-main"><Skeleton h={40} w={300} /><Skeleton h={400} r={12} /></main>;
  const p = data.data.project;
  const byId = new Map(p.gallery.map((g) => [g.id, g]));
  const isOther = category === t.feedbackCategories[t.feedbackCategories.length - 1];

  return (
    <main className="p-main" style={{ maxWidth: 1000 }}>
      <Link to={`/portal/project/${p.id}`} className="s-back"><ArrowLeft size={14} /> {p.title}</Link>
      <div className="p-hello"><h1>{t.feedbackTitle}</h1><p>{t.feedbackIntro}</p></div>
      {sent && <Card><Empty icon={<Check />} title={t.feedbackThanks}>{t.feedbackMore}</Empty></Card>}

      {p.gallery.length > 0 && (
        <Card title={t.feedbackPhotos}>
          <div className="s-stack">
            <p className="s-small s-muted">{t.feedbackPickPhotos}</p>
            <div className="s-contact-sheet" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
              {p.gallery.map((g) => {
                const on = selected.includes(g.id);
                return (
                  <button key={g.id} type="button" aria-pressed={on} onClick={() => setSelected((s) => (on ? s.filter((x) => x !== g.id) : [...s, g.id]))}
                    style={{ border: 0, padding: 0, background: "none", borderRadius: 8, outline: on ? "3px solid var(--accent)" : "none", outlineOffset: 2 }}>
                    <Photo src={g.url}>{on && <div className="corner"><span className="s-fav on"><Check /></span></div>}</Photo>
                  </button>
                );
              })}
            </div>
            <Textarea aria-label={t.feedbackNote} placeholder={selected.length ? t.feedbackNoteFor(selected.length) : t.feedbackPickFirst} rows={2} value={photoText} onChange={(e) => setPhotoText(e.target.value)} disabled={!selected.length} />
            <Button icon={<Plus />} style={{ alignSelf: "flex-start" }} disabled={!selected.length || !photoText.trim()}
              onClick={() => { setNotes((n) => [...n, { key: crypto.randomUUID(), photoIds: selected, category: "", text: photoText.trim() }]); setSelected([]); setPhotoText(""); setSent(false); }}>
              {t.feedbackAdd}
            </Button>
          </div>
        </Card>
      )}

      <Card title={t.feedbackGeneral}>
        <div className="s-stack">
          <div className="s-form-grid">
            <Field label={t.feedbackAbout} htmlFor="fb-cat">
              <Select id="fb-cat" value={category} onChange={(e) => setCategory(e.target.value)}>{t.feedbackCategories.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            {isOther && <Field label={t.feedbackOwnTopic} htmlFor="fb-own"><Input id="fb-own" value={custom} onChange={(e) => setCustom(e.target.value)} /></Field>}
          </div>
          <Textarea aria-label={t.feedbackNote} rows={3} value={generalText} onChange={(e) => setGeneralText(e.target.value)} />
          <Button icon={<Plus />} style={{ alignSelf: "flex-start" }} disabled={!generalText.trim()}
            onClick={() => { setNotes((n) => [...n, { key: crypto.randomUUID(), photoIds: [], category: isOther ? custom.trim() || category : category, text: generalText.trim() }]); setGeneralText(""); setCustom(""); setSent(false); }}>
            {t.feedbackAdd}
          </Button>
        </div>
      </Card>

      {notes.length > 0 && (
        <Card title={t.feedbackReady(notes.length)} action={<Button variant="primary" icon={<Send />} loading={send.isPending} onClick={() => send.mutate()}>{t.feedbackSend}</Button>}>
          <ul className="s-list">
            {notes.map((n) => (
              <li key={n.key} className="s-row nowrap" style={{ padding: "10px 0", alignItems: "flex-start" }}>
                <div className="s-stack sm" style={{ flex: 1, minWidth: 0 }}>
                  <span className="s-eyebrow">{n.photoIds.length ? t.feedbackPhotoCount(n.photoIds.length) : n.category}</span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{n.text}</span>
                  {n.photoIds.length > 0 && <div className="s-row">{n.photoIds.slice(0, 6).map((pid) => <Photo key={pid} src={byId.get(pid)?.url} style={{ width: 52, aspectRatio: "1" }} />)}</div>}
                </div>
                <Button size="sm" variant="ghost" iconOnly aria-label={t.remove} icon={<X />} onClick={() => setNotes((all) => all.filter((x) => x.key !== n.key))} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
