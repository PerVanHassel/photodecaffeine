import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Info, Lock, MessageSquare, Pencil, RotateCcw, Sparkles, Square, Trash2, Volume2, X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { DOCUMENTS, minutes, sectionText } from "../documents";
import { useDocState, useNoteActions, useReadProgress } from "../documents/api";
import "../documents/reader.css";
import type { DocNote, DocState, ReaderBlock, ReaderDocument, ReaderPart, ReaderSection } from "../documents/types";
import { ago, initials } from "../format";
import { Button, cx, Empty, ErrorState, Textarea, useConfirm } from "../ui";
import { useSearchPatch } from "../urlState";

gsap.registerPlugin(useGSAP);

// A long document, one short piece at a time. Made for reading with ADHD and
// dyslexia: one thing on screen, large calm type, a clear way forward, notes
// right next to the text and the option to have it read aloud.

const EMPTY: DocState = { notes: [], read: { done: [], at: null } };
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function DocumentsPage() {
  const { docId } = useParams();
  const doc = DOCUMENTS.find((d) => d.id === (docId || DOCUMENTS[0].id));
  if (!doc) {
    return (
      <div className="s-view">
        <Empty icon={<BookOpen />} title="Dit document bestaat niet" action={<Link className="s-btn" to="/admin/documents">Naar Documenten</Link>} />
      </div>
    );
  }
  return <Reader key={doc.id} doc={doc} />;
}

function Reader({ doc }: { doc: ReaderDocument }) {
  const query = useDocState(doc.id);
  const state = query.data || EMPTY;
  const saveRead = useReadProgress(doc.id);
  const { params, patch } = useSearchPatch();
  const onlyChanged = params.get("modus") === "wijzigingen";
  const list = useMemo(() => (onlyChanged ? doc.sections.filter((s) => s.changed) : doc.sections), [doc, onlyChanged]);
  const index = list.findIndex((s) => s.id === params.get("stuk"));
  // Drafts survive paging back and forth, so a half-written thought is never lost.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const open = (id: string, mode: "wijzigingen" | null = null) => {
    patch({ stuk: id, modus: mode, klaar: null });
    saveRead((r) => ({ ...r, at: id }));
  };
  const move = (delta: 1 | -1) => {
    const here = list[index];
    const next = list[index + delta];
    if (!next) return;
    saveRead((r) => ({ done: delta > 0 && !r.done.includes(here.id) ? [...r.done, here.id] : r.done, at: next.id }));
    patch({ stuk: next.id }, { replace: true });
  };
  const finish = () => {
    const here = list[index];
    saveRead((r) => ({ done: r.done.includes(here.id) ? r.done : [...r.done, here.id], at: here.id }));
    patch({ stuk: null, modus: null, klaar: "1" });
  };
  const overview = () => patch({ stuk: null, modus: null, klaar: null });

  if (query.isError) return <div className="s-view"><ErrorState error={query.error} retry={() => query.refetch()} /></div>;

  if (index >= 0) {
    return (
      <ReadingView
        doc={doc}
        list={list}
        index={index}
        state={state}
        onlyChanged={onlyChanged}
        draft={drafts[list[index].id] || ""}
        setDraft={(text) => setDrafts((d) => ({ ...d, [list[index].id]: text }))}
        onMove={move}
        onFinish={finish}
        onExit={overview}
      />
    );
  }
  if (params.get("klaar") === "1") return <FinishView doc={doc} state={state} onOpen={open} onOverview={overview} />;
  return <StartView doc={doc} state={state} loading={query.isLoading} onOpen={open} />;
}

// ---------------------------------------------------------------------------
// Start: what this is, how far you are, and the parts to pick from
// ---------------------------------------------------------------------------

function StartView({ doc, state, loading, onOpen }: {
  doc: ReaderDocument; state: DocState; loading: boolean; onOpen: (id: string, mode?: "wijzigingen" | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const known = new Set(doc.sections.map((s) => s.id));
  const done = new Set(state.read.done.filter((id) => known.has(id)));
  const total = doc.sections.length;
  const share = done.size / total;
  const changed = doc.sections.filter((s) => s.changed);
  const firstOpen = doc.sections.find((s) => !done.has(s.id));
  const resume = (state.read.at && known.has(state.read.at) && !done.has(state.read.at) ? doc.sections.find((s) => s.id === state.read.at) : firstOpen) || doc.sections[0];
  const resumeAt = doc.sections.indexOf(resume) + 1;
  const left = doc.sections.filter((s) => !done.has(s.id)).reduce((sum, s) => sum + minutes(s), 0);
  const lastNote = [...state.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const cta = done.size === 0 ? "Begin met lezen" : done.size === total ? "Opnieuw lezen" : `Verder bij stuk ${resumeAt}`;

  useGSAP(() => {
    if (still()) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".rd-hero .rd-w", { opacity: 0.08, y: 18, duration: 0.9, stagger: 0.05 })
      .from(".rd-pill-fill", { scaleX: 0, duration: 1.4, ease: "power3.inOut" }, 0.3)
      .from(".rd-hero .rd-lead, .rd-hero .rd-ctas", { opacity: 0, y: 16, duration: 0.8, stagger: 0.08 }, 0.35)
      .from(".rd-tile", { opacity: 0, y: 40, scale: 0.96, duration: 1, stagger: 0.09 }, 0.5)
      .from(".rd-ring-value", { strokeDashoffset: 2 * Math.PI * 52, duration: 1.6, ease: "power3.inOut" }, 0.7)
      .from(".rd-slice", { opacity: 0, y: 30, duration: 0.8, stagger: 0.04 }, 0.7);
  }, { scope: root });

  return (
    <div className="rd rd-start" ref={root}>
      <Ambient />
      <section className="rd-hero">
        <p className="rd-by">Van {doc.author} · versie {doc.version}</p>
        <h1 className="rd-h1">
          <Words text={doc.subtitle + ","} />{" "}
          <span className="rd-pill" aria-hidden="true"><span className="rd-pill-fill" style={{ transform: `scaleX(${Math.max(share, 0.04)})` }} /></span>{" "}
          <Words text="stuk voor stuk." />
        </h1>
        <p className="rd-lead">
          {total} korte stukken. Je ziet er steeds maar één. Schrijf op wat je opvalt, dan ziet de rest van het team het ook.
        </p>
        <div className="rd-ctas">
          <button className="rd-cta dark" type="button" onClick={() => onOpen(resume.id)} disabled={loading}>
            {cta} <ArrowRight />
          </button>
          <button className="rd-cta light" type="button" onClick={() => onOpen(changed[0].id, "wijzigingen")} disabled={loading}>
            <Sparkles /> Alleen de {changed.length} wijzigingen
          </button>
        </div>
      </section>

      <section className="rd-bento" aria-label="Voortgang">
        <button type="button" className="rd-tile big" onClick={() => onOpen(resume.id)}>
          <Ring share={share} />
          <span className="rd-tile-text">
            <b className="rd-tile-num">{done.size} <span>van {total} gelezen</span></b>
            <span className="rd-tile-sub">{done.size === total ? "Alles gelezen. Goed gedaan." : <>Volgende: {resume.title}</>}</span>
            <span className="rd-tile-go">{done.size === total ? "Opnieuw beginnen" : "Ga verder"} <ArrowRight /></span>
          </span>
        </button>
        <a className="rd-tile" href="#rd-alle-notities">
          <MessageSquare className="rd-tile-icon" />
          <b className="rd-tile-num">{state.notes.length} <span>{state.notes.length === 1 ? "notitie" : "notities"}</span></b>
          <span className="rd-tile-sub">{lastNote ? <>{lastNote.authorName.split(" ")[0]}: “{lastNote.text.slice(0, 70)}{lastNote.text.length > 70 ? "…" : ""}”</> : "Nog niets opgeschreven."}</span>
        </a>
        <div className="rd-tile">
          <Info className="rd-tile-icon" />
          <b className="rd-tile-num">± {left} <span>min</span></b>
          <span className="rd-tile-sub">{left ? "Je hoeft het niet in één keer te doen. Je plek wordt bewaard." : "Niets meer te lezen."}</span>
        </div>
      </section>

      <section className="rd-parts">
        <h2 className="rd-h2">Kies een deel</h2>
        <Parts doc={doc} state={state} done={done} current={resume.part} onOpen={onOpen} />
      </section>

      <AllNotes doc={doc} notes={state.notes} onOpen={onOpen} />
    </div>
  );
}

function Ring({ share }: { share: number }) {
  const c = 2 * Math.PI * 52;
  return (
    <svg className="rd-ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" className="rd-ring-track" />
      <circle cx="60" cy="60" r="52" className="rd-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - share)} />
      <text x="60" y="66" textAnchor="middle">{Math.round(share * 100)}%</text>
    </svg>
  );
}

function partLabel(part: ReaderPart) {
  return part.number ? `Pagina ${part.number} · ${part.title}` : part.title;
}

/** The parts as slices side by side; the one you point at opens up. */
function Parts({ doc, state, done, current, onOpen }: {
  doc: ReaderDocument; state: DocState; done: Set<string>; current: string; onOpen: (id: string) => void;
}) {
  const [openPart, setOpenPart] = useState(current);
  useEffect(() => setOpenPart(current), [current]);
  return (
    <div className="rd-acc" onMouseLeave={() => setOpenPart(current)}>
      {doc.parts.map((part) => {
        const secs = doc.sections.filter((s) => s.part === part.id);
        const read = secs.filter((s) => done.has(s.id)).length;
        const notes = state.notes.filter((n) => secs.some((s) => s.id === n.sectionId)).length;
        const target = secs.find((s) => !done.has(s.id)) || secs[0];
        return (
          <button
            key={part.id}
            type="button"
            className={cx("rd-slice", openPart === part.id && "is-open", read === secs.length && "is-done")}
            onMouseEnter={() => setOpenPart(part.id)}
            onFocus={() => setOpenPart(part.id)}
            onClick={() => onOpen(target.id)}
            aria-label={`${partLabel(part)}: ${secs.length} stukken, ${read} gelezen${notes ? `, ${notes} notities` : ""}`}
          >
            <span className="rd-slice-mark" aria-hidden="true">
              {read === secs.length ? <Check /> : part.number ?? (part.internal ? <Lock /> : <BookOpen />)}
            </span>
            <span className="rd-slice-spine" aria-hidden="true">{part.title}</span>
            <span className="rd-slice-body" aria-hidden="true">
              <b>{partLabel(part)}</b>
              <span>{secs.length} {secs.length === 1 ? "stuk" : "stukken"} · {read} gelezen{notes ? ` · ${notes} ${notes === 1 ? "notitie" : "notities"}` : ""}</span>
              <span className="rd-slice-go">{read === secs.length ? "Nog eens lezen" : read ? "Verder lezen" : "Lees dit deel"} <ArrowRight /></span>
            </span>
            <span className="rd-slice-bar" aria-hidden="true"><span style={{ transform: `scaleX(${read / secs.length})` }} /></span>
          </button>
        );
      })}
    </div>
  );
}

function AllNotes({ doc, notes, onOpen }: { doc: ReaderDocument; notes: DocNote[]; onOpen: (id: string) => void }) {
  const bySection = doc.sections
    .map((s) => ({ section: s, notes: notes.filter((n) => n.sectionId === s.id) }))
    .filter((g) => g.notes.length);
  return (
    <section className="rd-allnotes" id="rd-alle-notities">
      <h2 className="rd-h2">Alle notities</h2>
      {bySection.length ? (
        <div className="rd-allnotes-list">
          {bySection.map(({ section, notes }) => (
            <div className="rd-allnotes-group" key={section.id}>
              <button type="button" className="rd-allnotes-head" onClick={() => onOpen(section.id)}>
                <span>{section.title}</span> <ArrowRight />
              </button>
              {notes.map((n) => (
                <p className="rd-allnotes-note" key={n.id}><b>{n.authorName.split(" ")[0]}</b> {n.text}</p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="rd-quiet">Nog geen notities. Die schrijf je tijdens het lezen, naast elk stuk.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Reading: one card, notes beside it, a clear way forward
// ---------------------------------------------------------------------------

function ReadingView({ doc, list, index, state, onlyChanged, draft, setDraft, onMove, onFinish, onExit }: {
  doc: ReaderDocument; list: ReaderSection[]; index: number; state: DocState; onlyChanged: boolean;
  draft: string; setDraft: (text: string) => void;
  onMove: (delta: 1 | -1) => void; onFinish: () => void; onExit: () => void;
}) {
  const section = list[index];
  const next = list[index + 1];
  const deck = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useStored("pdc-reader-size", "m");
  const speech = useSpeech();
  const notesHere = state.notes.filter((n) => n.sectionId === section.id).length;

  // The card that was just on screen stays for a moment, so it can step back
  // while the new one comes up over it.
  const [shown, setShown] = useState({ id: section.id, index });
  const [leaving, setLeaving] = useState<{ section: ReaderSection; dir: 1 | -1 } | null>(null);
  if (shown.id !== section.id) {
    const before = doc.sections.find((s) => s.id === shown.id);
    setShown({ id: section.id, index });
    setLeaving(before ? { section: before, dir: index > shown.index ? 1 : -1 } : null);
  }

  useGSAP(() => {
    const card = deck.current?.querySelector<HTMLElement>(".rd-card.is-current");
    if (!card) return;
    gsap.to(bar.current, { scaleX: (index + 1) / list.length, duration: still() ? 0 : 0.8, ease: "power3.out" });
    if (still()) { setLeaving(null); return; }
    const dir = leaving?.dir ?? 1;
    const old = deck.current?.querySelector<HTMLElement>(".rd-card.is-leaving");
    const tl = gsap.timeline();
    if (old) {
      const id = leaving?.section.id;
      tl.to(old, {
        y: dir > 0 ? -36 : 110, scale: dir > 0 ? 0.9 : 1.02, opacity: 0, filter: "blur(8px)", duration: 0.6, ease: "power3.inOut",
        onComplete: () => setLeaving((l) => (l?.section.id === id ? null : l)),
      }, 0);
    }
    tl.fromTo(card,
      { y: dir > 0 ? 140 : -60, scale: dir > 0 ? 1 : 0.93, opacity: 0, rotateX: dir > 0 ? 10 : -6 },
      { y: 0, scale: 1, opacity: 1, rotateX: 0, duration: 0.9, ease: "expo.out", clearProps: "transform,opacity" }, old ? 0.12 : 0)
      .fromTo(card.querySelectorAll(".rd-title .rd-w"), { opacity: 0.1, y: 10 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.04, ease: "power2.out" }, "<0.15")
      .fromTo(card.querySelectorAll(".rd-block"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power2.out" }, "<0.1")
      .fromTo(deck.current!.querySelectorAll(".rd-ghost"), { y: 14 }, { y: 0, duration: 0.8, stagger: 0.06, ease: "back.out(2)" }, 0.1);
  }, { dependencies: [section.id], scope: deck });

  useEffect(() => {
    speech.stop();
    const top = deck.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 90, behavior: still() ? "auto" : "smooth" });
  }, [section.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next ? onMove(1) : onFinish(); }
      if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); onMove(-1); }
      if (e.key === "Escape") onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const part = doc.parts.find((p) => p.id === section.part)!;

  return (
    <div className={cx("rd rd-reading", size === "l" && "is-large")}>
      <Ambient />
      <header className="rd-bar">
        <button type="button" className="rd-exit" onClick={onExit}><X /> <span>Overzicht</span></button>
        <span className="rd-where s-truncate">{onlyChanged ? "Alleen de wijzigingen" : partLabel(part)}</span>
        <div className="rd-tools">
          <button type="button" className="rd-tool" aria-pressed={size === "l"} onClick={() => setSize(size === "l" ? "m" : "l")} title="Grotere letters">
            <span className="rd-aa">Aa</span>
          </button>
          {speech.supported && (
            <button
              type="button"
              className="rd-tool"
              aria-pressed={speech.speaking}
              onClick={() => (speech.speaking ? speech.stop() : speech.speak(sectionText(section)))}
            >
              {speech.speaking ? <Square /> : <Volume2 />} <span className="rd-tool-label">{speech.speaking ? "Stop" : "Voorlezen"}</span>
            </button>
          )}
          <span className="rd-count s-num" aria-label={`Stuk ${index + 1} van ${list.length}`}>{index + 1}<span> / {list.length}</span></span>
        </div>
        <div className="rd-progress" aria-hidden="true"><span ref={bar} /></div>
      </header>

      <div className="rd-stage">
        <div className="rd-deck" ref={deck}>
          <span className="rd-ghost two" aria-hidden="true" />
          <span className="rd-ghost one" aria-hidden="true" />
          {leaving && (
            <SectionCard key={`was-${leaving.section.id}`} doc={doc} section={leaving.section} className="is-leaving" style={{ zIndex: leaving.dir > 0 ? 1 : 3 }} />
          )}
          <SectionCard key={section.id} doc={doc} section={section} className="is-current" style={{ zIndex: 2 }} />
        </div>
        <NotesPanel doc={doc} section={section} notes={state.notes} draft={draft} setDraft={setDraft} />
      </div>

      <nav className="rd-nav" aria-label="Bladeren">
        <Button variant="ghost" icon={<ArrowLeft />} disabled={index === 0} onClick={() => onMove(-1)}>Vorige</Button>
        <span className="rd-keys" aria-hidden="true"><kbd>←</kbd> <kbd>→</kbd> bladeren</span>
        {notesHere ? <span className="rd-notes-chip"><MessageSquare /> {notesHere}</span> : null}
        <Magnetic>
          <button type="button" className="rd-next" onClick={() => (next ? onMove(1) : onFinish())}>
            <span className="rd-next-text">
              <small>{next ? "Volgende" : "Laatste stuk"}</small>
              <b>{next ? next.title : "Klaar met lezen"}</b>
            </span>
            {next ? <ArrowRight /> : <Check />}
          </button>
        </Magnetic>
      </nav>
    </div>
  );
}

function SectionCard({ doc, section, className, style }: {
  doc: ReaderDocument; section: ReaderSection; className: string; style?: React.CSSProperties;
}) {
  const part = doc.parts.find((p) => p.id === section.part)!;
  const firstOfPart = doc.sections.find((s) => s.part === part.id)?.id === section.id;
  return (
    <article className={cx("rd-card", className)} style={style} aria-hidden={className === "is-leaving" || undefined}>
      <div className="rd-card-top">
        <span className="rd-part">{partLabel(part)}</span>
        {section.changed && <span className="rd-new"><Sparkles /> Nieuw in {doc.version}</span>}
        <span className="rd-min">± {minutes(section)} min</span>
      </div>
      <h2 className="rd-title"><Words text={section.title} /></h2>
      {firstOfPart && part.meta.length > 0 && <p className="rd-meta rd-block">{part.meta.join(" · ")}</p>}
      <div className="rd-body"><Blocks blocks={section.blocks} /></div>
    </article>
  );
}

function Blocks({ blocks }: { blocks: ReaderBlock[] }) {
  const out: ReactNode[] = [];
  let items: string[] = [];
  const flush = (key: number) => {
    if (!items.length) return;
    out.push(<ul className="rd-block" key={`ul-${key}`}>{items.map((t, i) => <li key={i}>{rich(t)}</li>)}</ul>);
    items = [];
  };
  blocks.forEach((b, i) => {
    if (b.t === "li") { items.push(b.text); return; }
    flush(i);
    if (b.t === "table") {
      out.push(
        <div className="rd-table rd-block" key={i}>
          <table>
            <thead><tr>{b.rows[0].map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
            <tbody>{b.rows.slice(1).map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{rich(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else if (b.t === "note") {
      out.push(<div className="rd-callout rd-block" key={i}><Info /> <p>{rich(b.text)}</p></div>);
    } else if (b.t === "meta") {
      out.push(<p className="rd-meta rd-block" key={i}>{b.text}</p>);
    } else {
      out.push(<p className="rd-block" key={i}>{rich(b.text)}</p>);
    }
  });
  flush(blocks.length);
  return <>{out}</>;
}

/** Bold lead-ins and links; everything else is plain text. */
function rich(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noreferrer">{part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="rd-w">{w}</span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

function NotesPanel({ doc, section, notes, draft, setDraft }: {
  doc: ReaderDocument; section: ReaderSection; notes: DocNote[]; draft: string; setDraft: (t: string) => void;
}) {
  const { user } = useAuth();
  const { add } = useNoteActions(doc.id);
  const here = notes.filter((n) => n.sectionId === section.id);
  const listRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());

  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>(".rd-note", listRef.current);
    const fresh = els.filter((el) => !seen.current.has(el.dataset.id!));
    els.forEach((el) => seen.current.add(el.dataset.id!));
    if (still() || !fresh.length) return;
    gsap.fromTo(fresh, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)" });
  }, { dependencies: [section.id, here.map((n) => n.id).join()], scope: listRef });

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    add.mutate({ sectionId: section.id, text }, { onSuccess: () => setDraft("") });
  };

  return (
    <aside className="rd-notes" aria-label="Notities bij dit stuk">
      <div className="rd-notes-head">
        <MessageSquare /> <b>Notities</b> {here.length ? <span className="rd-notes-count">{here.length}</span> : null}
      </div>
      <div className="rd-compose">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
          placeholder="Wat valt je op? Schrijf het kort op."
          rows={3}
          aria-label="Nieuwe notitie"
        />
        <div className="rd-compose-foot">
          <span className="rd-quiet"><kbd>Ctrl</kbd> <kbd>Enter</kbd></span>
          <Button variant="primary" size="sm" onClick={save} disabled={!draft.trim()} loading={add.isPending}>Opslaan</Button>
        </div>
      </div>
      <div className="rd-note-list" ref={listRef}>
        {here.map((n) => <NoteItem key={n.id} doc={doc} note={n} mine={n.authorId === user?.id} />)}
        {!here.length && <p className="rd-quiet">Nog geen notities bij dit stuk.</p>}
      </div>
    </aside>
  );
}

function NoteItem({ doc, note, mine }: { doc: ReaderDocument; note: DocNote; mine: boolean }) {
  const { edit, remove } = useNoteActions(doc.id);
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  return (
    <div className="rd-note" data-id={note.id}>
      <span className="rd-note-avatar" aria-hidden="true">{initials(note.authorName)}</span>
      <div className="rd-note-main">
        <div className="rd-note-head">
          <b>{note.authorName.split(" ")[0]}</b>
          <span className="rd-quiet">{ago(note.updatedAt)}</span>
          {mine && !editing && (
            <span className="rd-note-actions">
              <Button variant="ghost" size="sm" iconOnly aria-label="Notitie aanpassen" icon={<Pencil />} onClick={() => { setText(note.text); setEditing(true); }} />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Notitie verwijderen"
                icon={<Trash2 />}
                onClick={async () => {
                  if (await confirm({ title: "Notitie verwijderen?", body: "Deze notitie is daarna weg, ook voor de anderen.", confirm: "Verwijderen", danger: true })) remove.mutate(note.id);
                }}
              />
            </span>
          )}
        </div>
        {editing ? (
          <div className="rd-compose">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Notitie aanpassen" autoFocus />
            <div className="rd-compose-foot">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuleren</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!text.trim()}
                loading={edit.isPending}
                onClick={() => edit.mutate({ id: note.id, text: text.trim() }, { onSuccess: () => setEditing(false) })}
              >
                Opslaan
              </Button>
            </div>
          </div>
        ) : (
          <p className="rd-note-text">{note.text}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finish
// ---------------------------------------------------------------------------

function FinishView({ doc, state, onOpen, onOverview }: {
  doc: ReaderDocument; state: DocState; onOpen: (id: string) => void; onOverview: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const known = new Set(doc.sections.map((s) => s.id));
  const read = state.read.done.filter((id) => known.has(id)).length;
  const firstOpen = doc.sections.find((s) => !state.read.done.includes(s.id));

  useGSAP(() => {
    if (still()) return;
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(".rd-finish .rd-w", { opacity: 0.08, y: 24, duration: 1, stagger: 0.07 })
      .from(".rd-finish .rd-lead, .rd-finish .rd-ctas", { opacity: 0, y: 16, duration: 0.8, stagger: 0.1 }, 0.4)
      .fromTo(".rd-spark", { scale: 0, opacity: 1, x: 0, y: 0 }, {
        scale: () => gsap.utils.random(0.6, 1.4),
        x: () => gsap.utils.random(-320, 320),
        y: () => gsap.utils.random(-220, 160),
        rotate: () => gsap.utils.random(-180, 180),
        duration: () => gsap.utils.random(1.2, 2.2),
        ease: "power3.out",
        stagger: 0.012,
      }, 0.15)
      .to(".rd-spark", { opacity: 0, duration: 0.9, ease: "power1.in", stagger: 0.012 }, 0.9);
  }, { scope: root });

  return (
    <div className="rd rd-start" ref={root}>
      <Ambient />
      <section className="rd-hero rd-finish">
        <span className="rd-sparks" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <span key={i} className={cx("rd-spark", `c${i % 4}`)} />)}</span>
        <h1 className="rd-h1"><Words text={firstOpen ? "Je bent bij het einde." : "Je bent er doorheen."} /></h1>
        <p className="rd-lead">
          {read} van de {doc.sections.length} stukken gelezen.{" "}
          {state.notes.length === 1 ? "Er staat 1 notitie bij." : state.notes.length ? `Er staan ${state.notes.length} notities bij.` : "Er zijn nog geen notities."}
        </p>
        <div className="rd-ctas">
          {firstOpen ? (
            <button className="rd-cta dark" type="button" onClick={() => onOpen(firstOpen.id)}>Verder met wat je nog niet las <ArrowRight /></button>
          ) : (
            <a className="rd-cta dark" href="#rd-alle-notities">Bekijk alle notities <ArrowRight /></a>
          )}
          <button className="rd-cta light" type="button" onClick={onOverview}><RotateCcw /> Terug naar het overzicht</button>
        </div>
      </section>
      <AllNotes doc={doc} notes={state.notes} onOpen={onOpen} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

/** Soft, slowly drifting colour behind everything, with a little grain. */
function Ambient() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (still()) return;
    gsap.utils.toArray<HTMLElement>(".rd-blob", ref.current).forEach((el, i) => {
      gsap.to(el, {
        x: gsap.utils.random(-90, 90), y: gsap.utils.random(-70, 70), scale: gsap.utils.random(0.9, 1.2),
        duration: gsap.utils.random(16, 26), ease: "sine.inOut", repeat: -1, yoyo: true, delay: -i * 4,
      });
    });
  }, { scope: ref });
  return (
    <div className="rd-ambient" ref={ref} aria-hidden="true">
      <span className="rd-blob a" />
      <span className="rd-blob b" />
      <span className="rd-blob c" />
      <span className="rd-grain" />
    </div>
  );
}

/** Leans a little toward the pointer. */
function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || still() || !window.matchMedia("(hover: hover)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const moveTo = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.12);
      y((e.clientY - r.top - r.height / 2) * 0.2);
    };
    const reset = () => { x(0); y(0); };
    el.addEventListener("pointermove", moveTo);
    el.addEventListener("pointerleave", reset);
    return () => { el.removeEventListener("pointermove", moveTo); el.removeEventListener("pointerleave", reset); };
  }, { scope: ref });
  return <span className="rd-magnet" ref={ref}>{children}</span>;
}

function useStored(key: string, fallback: string): [string, (v: string) => void] {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  });
  const set = (v: string) => {
    setValue(v);
    try { localStorage.setItem(key, v); } catch { /* private window: keep it for this visit only */ }
  };
  return [value, set];
}

/** Reads a piece aloud with a Dutch voice, where the browser has one. */
function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);
  const speak = (text: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "nl-NL";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("nl"));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  useEffect(() => stop, [stop]);
  return { supported, speaking, speak, stop };
}
