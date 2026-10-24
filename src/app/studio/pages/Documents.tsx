import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Highlighter, Info, Lock, MessageSquare, MessageSquarePlus, Pencil, Plus, RotateCcw,
  Sparkles, Tablet, Trash2, Volume2, X,
} from "lucide-react";
import {
  Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject,
} from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { DOCUMENTS, minutes } from "../documents";
import { ReadAloudPlayer, useReadAloud, type SpeechSeg } from "../documents/ReadAloud";
import { useDocState, useNoteActions, useReadProgress } from "../documents/api";
import "../documents/reader.css";
import type { DocNote, DocQuote, DocState, ReaderBlock, ReaderDocument, ReaderPart, ReaderSection } from "../documents/types";
import { ago, initials } from "../format";
import { Button, cx, Empty, ErrorState, Textarea, useConfirm } from "../ui";
import { useSearchPatch } from "../urlState";

gsap.registerPlugin(useGSAP);

// A long document, one short piece at a time. Made for reading with ADHD and
// dyslexia: one thing on screen, large calm type, a clear way forward, notes
// right next to the text and the option to have it read aloud. Words can be
// marked by selecting them, by holding a sentence, or with a pencil.

const EMPTY: DocState = { notes: [], read: { done: [], at: null } };
const HOLD_MS = 450;
// Only WebKit on iPad and iPhone tells a finger from the Pencil in touch events.
const IOS_TOUCH = typeof Touch !== "undefined" && "touchType" in Touch.prototype;
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const looksLikeTablet = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) >= 700;

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
  // Drafts and marked-but-unsaved words survive paging back and forth, so a
  // half-written thought is never lost.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, DocQuote | null>>({});

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
    const id = list[index].id;
    return (
      <ReadingView
        doc={doc}
        list={list}
        index={index}
        state={state}
        onlyChanged={onlyChanged}
        draft={drafts[id] || ""}
        setDraft={(text) => setDrafts((d) => ({ ...d, [id]: text }))}
        pending={pending[id] || null}
        setPending={(q) => setPending((p) => ({ ...p, [id]: q }))}
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
  const lastText = lastNote ? lastNote.text || lastNote.quote?.text || "" : "";
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
      <Ambient moving />
      <section className="rd-hero">
        <p className="rd-by">Van {doc.author} · versie {doc.version}</p>
        <h1 className="rd-h1">
          <Words text={doc.subtitle + ","} />{" "}
          <span className="rd-pill" aria-hidden="true"><span className="rd-pill-fill" style={{ transform: `scaleX(${Math.max(share, 0.04)})` }} /></span>{" "}
          <Words text="stuk voor stuk." />
        </h1>
        <p className="rd-lead">
          {total} korte stukken. Je ziet er steeds maar één. Markeer wat je opvalt en schrijf er iets bij, dan ziet de rest van het team het ook.
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
          <span className="rd-tile-sub">{lastNote ? <>{lastNote.authorName.split(" ")[0]}: “{lastText.slice(0, 70)}{lastText.length > 70 ? "…" : ""}”</> : "Nog niets opgeschreven."}</span>
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
    .map((s) => ({ section: s, notes: inTextOrder(notes.filter((n) => n.sectionId === s.id)) }))
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
                <div className="rd-allnotes-note" key={n.id}>
                  {n.quote && <q className="rd-quote">{n.quote.text}</q>}
                  <p><b>{n.authorName.split(" ")[0]}</b> {n.text || <span className="rd-quiet">markeerde dit</span>}</p>
                </div>
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

/** What is being marked right now, before it is saved or attached to a note. */
type Selecting = { quote: DocQuote; source: "drag" | "hold" | "pen"; range?: Range; saving?: boolean; drawing?: boolean };

function ReadingView({ doc, list, index, state, onlyChanged, draft, setDraft, pending, setPending, onMove, onFinish, onExit }: {
  doc: ReaderDocument; list: ReaderSection[]; index: number; state: DocState; onlyChanged: boolean;
  draft: string; setDraft: (text: string) => void; pending: DocQuote | null; setPending: (q: DocQuote | null) => void;
  onMove: (delta: 1 | -1) => void; onFinish: () => void; onExit: () => void;
}) {
  const section = list[index];
  const next = list[index + 1];
  const root = useRef<HTMLDivElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const ink = useRef<SVGPathElement>(null);
  const [size, setSize] = useStored("pdc-reader-size", "m");
  const [tabletPref, setTablet] = useStored("pdc-reader-tablet", looksLikeTablet() ? "1" : "0");
  const tablet = tabletPref === "1";
  const [notesOpen, setNotesOpen] = useState(false);
  // The marker turns a finger into a highlighter; it is off at every visit, so scrolling always works first.
  const [marker, setMarker] = useState(false);
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);
  const { add } = useNoteActions(doc.id);
  const notesHere = useMemo(() => state.notes.filter((n) => n.sectionId === section.id), [state.notes, section.id]);
  const part = doc.parts.find((p) => p.id === section.part)!;
  const forward = () => (next ? onMove(1) : onFinish());
  const back = () => index > 0 && onMove(-1);

  // Reading aloud: what to say comes from the piece on screen, and the
  // sentence being read lights up in it.
  const dock = useRef<HTMLDivElement>(null);
  const segsRef = useRef<SpeechSeg[]>([]);
  const keepReading = useRef(false);
  const tabletRef = useRef(tablet);
  tabletRef.current = tablet;
  const paint = useCallback((seg: SpeechSeg | null, word: [number, number] | null) => {
    root.current?.querySelectorAll(".rd-speaking").forEach((el) => el.classList.remove("rd-speaking"));
    setHighlight("rd-say", null);
    setHighlight("rd-say-word", null);
    if (!seg) return;
    const card = body.current?.closest(".rd-card");
    const el = seg.note ? root.current?.querySelector(`.rd-note[data-id="${seg.note}"]`)
      : seg.row !== undefined ? body.current?.querySelector(`[data-t="${seg.block}"] tbody tr:nth-child(${seg.row + 1})`)
      : seg.block === -1 ? card?.querySelector(".rd-title")
      : body.current?.querySelector(`[data-b="${seg.block}"]`);
    if (!el) return;
    el.classList.add("rd-speaking");
    let range: Range | null = null;
    if (!seg.note && seg.row === undefined && seg.start !== undefined && seg.end !== undefined) {
      range = rangeIn(el, seg.start, seg.end);
      setHighlight("rd-say", range);
      if (word) setHighlight("rd-say-word", rangeIn(el, seg.start + word[0], seg.start + word[1]));
    }
    if (word || seg.note) return;
    // Keep the sentence between the top bar and the player.
    const rect = range?.getBoundingClientRect() || el.getBoundingClientRect();
    const top = 96, bottom = window.innerHeight - (dock.current?.offsetHeight ?? 160) - 36;
    if (rect.top >= top && rect.bottom <= bottom) return;
    const delta = rect.top - (top + (bottom - top) / 3);
    const behavior = still() ? "auto" : "smooth";
    if (tabletRef.current && root.current) root.current.scrollBy({ top: delta, behavior });
    else window.scrollBy({ top: delta, behavior });
  }, []);
  const latestRead = useRef({ follow: false, forward });
  const reader = useReadAloud({
    segments: () => segsRef.current,
    paint,
    onEnd: () => {
      if (!latestRead.current.follow) return;
      keepReading.current = true;
      latestRead.current.forward();
    },
  });
  const segs = useMemo(() => planSpeech(section, notesHere, reader.settings.notes), [section, notesHere, reader.settings.notes]);
  segsRef.current = segs;
  latestRead.current = { follow: reader.settings.follow && !!next, forward };

  // The card that was just on screen stays for a moment, so it can step back
  // while the new one comes up over it.
  const [shown, setShown] = useState({ id: section.id, index });
  const [leaving, setLeaving] = useState<{ section: ReaderSection; dir: 1 | -1 } | null>(null);
  if (shown.id !== section.id) {
    const before = doc.sections.find((s) => s.id === shown.id);
    setShown({ id: section.id, index });
    setLeaving(before ? { section: before, dir: index > shown.index ? 1 : -1 } : null);
  }

  const marking = useMarking(body, section.id, marker, ink);
  const sel = marking.sel;

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
        y: dir > 0 ? -36 : 110, scale: dir > 0 ? 0.9 : 1.02, opacity: 0, duration: 0.55, ease: "power3.inOut",
        onComplete: () => setLeaving((l) => (l?.section.id === id ? null : l)),
      }, 0);
    }
    tl.fromTo(card,
      { y: dir > 0 ? 140 : -60, scale: dir > 0 ? 1 : 0.93, opacity: 0, rotateX: dir > 0 ? 10 : -6 },
      { y: 0, scale: 1, opacity: 1, rotateX: 0, duration: 0.85, ease: "expo.out", clearProps: "transform,opacity" }, old ? 0.12 : 0)
      .fromTo(card.querySelectorAll(".rd-title .rd-w"), { opacity: 0.1, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: "power2.out" }, "<0.15")
      .fromTo(card.querySelectorAll(".rd-block"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: "power2.out", clearProps: "transform,opacity" }, "<0.1")
      .fromTo(deck.current!.querySelectorAll(".rd-ghost"), { y: 14 }, { y: 0, duration: 0.8, stagger: 0.06, ease: "back.out(2)" }, 0.1);
  }, { dependencies: [section.id], scope: deck });

  // A new piece: start over at its first sentence, and keep reading if it was.
  useEffect(() => {
    const go = reader.isLive() || keepReading.current;
    keepReading.current = false;
    reader.reset();
    if (!go) return;
    const t = setTimeout(() => reader.play(0), still() ? 100 : 950);
    return () => clearTimeout(t);
  }, [section.id]);

  useEffect(() => {
    setNotesOpen(false);
    const top = deck.current?.getBoundingClientRect().top ?? 0;
    if (top >= 0) return;
    const behavior = still() ? "auto" : "smooth";
    if (tablet && root.current) root.current.scrollTo({ top: root.current.scrollTop + top - 90, behavior });
    else window.scrollTo({ top: window.scrollY + top - 90, behavior });
  }, [section.id]);

  // Keys and swipes always call the latest handlers without re-binding.
  const latest = useRef({ forward, back, onExit, sel, clear: marking.clear, busy: marking.busy, reader });
  latest.current = { forward, back, onExit, sel, clear: marking.clear, busy: marking.busy, reader };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]") || e.ctrlKey || e.metaKey || e.altKey) return;
      const l = latest.current;
      if (e.key === "ArrowRight") { e.preventDefault(); l.forward(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); l.back(); }
      if (e.key === "Escape") { if (l.sel) l.clear(); else if (l.reader.open) l.reader.close(); else l.onExit(); }
      // Space always plays or pauses while the player is open, also when a button has focus.
      if (e.key === " " && l.reader.open) { e.preventDefault(); if (!e.repeat) l.reader.toggle(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // iPad: swipe the card sideways to page. The card follows the finger a
  // little, so it is clear something is happening.
  useEffect(() => {
    const el = deck.current;
    if (!tablet || marker || !el) return;
    let start: { x: number; y: number; id: number } | null = null;
    let dragging = false;
    const card = () => el.querySelector<HTMLElement>(".rd-card.is-current");
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      dragging = false;
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      if (latest.current.busy()) { if (dragging) gsap.to(card(), { x: 0, rotate: 0, duration: 0.3 }); start = null; dragging = false; return; }
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!dragging && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.5) dragging = true;
      if (dragging && !still()) gsap.set(card(), { x: dx * 0.4, rotate: dx * 0.008 });
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      start = null;
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dx) > 80) {
        gsap.set(card(), { x: 0, rotate: 0 });
        if (dx < 0) latest.current.forward(); else latest.current.back();
      } else {
        gsap.to(card(), { x: 0, rotate: 0, duration: 0.5, ease: "back.out(2)" });
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [tablet, marker]);

  // A mouse selection is drawn by the browser itself; re-rendering the text
  // for it would only throw that selection away.
  const selQuote = sel && sel.source !== "drag" ? sel.quote : null;
  const marks = useMemo(() => {
    const out = marksFor(section, notesHere);
    if (pending) out.push({ id: "pending", ...pending, kind: "pending" });
    if (selQuote) out.push({ id: "selecting", ...selQuote, kind: "selecting" });
    return out;
  }, [section, notesHere, pending, selQuote]);
  const leavingMarks = useMemo(
    () => (leaving ? marksFor(leaving.section, state.notes.filter((n) => n.sectionId === leaving.section.id)) : []),
    [leaving, state.notes],
  );

  // A new marking sweeps in like a highlighter.
  const fresh = useRef<string | null>(null);
  useEffect(() => {
    const id = fresh.current;
    if (!id || !body.current) return;
    const els = body.current.querySelectorAll(`[data-note="${id}"]`);
    if (!els.length) return;
    fresh.current = null;
    if (!still()) gsap.fromTo(els, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.45, stagger: 0.12, ease: "power2.out" });
  }, [marks]);

  const markOnly = () => {
    if (!sel) return;
    const quote = sel.quote;
    window.getSelection()?.removeAllRanges();
    marking.set({ ...sel, source: "hold", saving: true });
    add.mutate({ sectionId: section.id, text: "", quote }, {
      onSuccess: ({ note }) => { fresh.current = note.id; marking.clear(); },
      onError: () => marking.clear(),
    });
  };
  const noteOnIt = () => {
    if (!sel) return;
    setPending(sel.quote);
    window.getSelection()?.removeAllRanges();
    marking.clear();
    setNotesOpen(true);
    setTimeout(() => {
      composer.current?.focus({ preventScroll: true });
      composer.current?.scrollIntoView({ block: "center", behavior: still() ? "auto" : "smooth" });
    }, 80);
  };

  const flashNote = useCallback((id: string) => {
    const el = root.current?.querySelector<HTMLElement>(`.rd-note[data-id="${id}"]`);
    if (!el) return;
    setNotesOpen(true);
    el.scrollIntoView({ block: "nearest", behavior: still() ? "auto" : "smooth" });
    if (!still()) gsap.fromTo(el, { boxShadow: "0 0 0 4px rgba(176, 106, 44, 0.45)" }, { boxShadow: "0 0 0 0px rgba(176, 106, 44, 0)", duration: 1.4, ease: "power2.out" });
  }, []);
  const flashMark = useCallback((id: string) => {
    const els = body.current?.querySelectorAll<HTMLElement>(`[data-note="${id}"]`);
    if (!els?.length) return;
    setNotesOpen(false);
    els[0].scrollIntoView({ block: "center", behavior: still() ? "auto" : "smooth" });
    els.forEach((el) => { el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash"); });
  }, []);
  const hoverNote = useCallback((id: string | null) => {
    body.current?.querySelectorAll(".rd-hl.is-active").forEach((el) => el.classList.remove("is-active"));
    if (id) body.current?.querySelectorAll(`[data-note="${id}"]`).forEach((el) => el.classList.add("is-active"));
  }, []);

  const onBodyClick = useCallback((e: React.MouseEvent) => {
    if (window.getSelection()?.isCollapsed === false) return;
    const target = e.target as Element;
    const id = target.closest<HTMLElement>("mark[data-note]")?.dataset.note;
    if (id && id !== "pending" && id !== "selecting") { flashNote(id); return; }
    // While reading aloud, a tap on a sentence reads from there.
    const r = latest.current.reader;
    if (!r.open || !body.current) return;
    const at = e.detail ? posAt(body.current, e.clientX, e.clientY) : null;
    const block = at?.block ?? Number(target.closest<HTMLElement>("[data-b]")?.dataset.b ?? NaN);
    const list = segsRef.current;
    const i = at
      ? list.findIndex((s) => s.block === at.block && s.start !== undefined && at.offset >= s.start && at.offset <= (s.end ?? 0))
      : list.findIndex((s) => s.block === block);
    if (i >= 0) r.jump(i);
  }, [flashNote]);

  return (
    <div ref={root} className={cx("rd rd-reading", size === "l" && "is-large", tablet && "is-tablet", notesOpen && "notes-open", marker && "is-marker", reader.open && "is-reading-aloud", reader.open && reader.settings.dim && "is-dim")}>
      <Ambient />
      <header className="rd-bar">
        <button type="button" className="rd-exit" onClick={onExit}><X /> <span>Overzicht</span></button>
        <span className="rd-where s-truncate">{onlyChanged ? "Alleen de wijzigingen" : partLabel(part)}</span>
        <div className="rd-tools">
          {(tablet || coarse) && (
            <button
              type="button"
              className="rd-tool is-marker-tool"
              aria-pressed={marker}
              onClick={() => { setMarker(!marker); marking.clear(); }}
              title="Markeerstift: streep ook met je vinger over de tekst. De Pencil markeert altijd."
            >
              <Highlighter /> <span className="rd-tool-label">Markeerstift</span>
            </button>
          )}
          <button type="button" className="rd-tool" aria-pressed={tablet} onClick={() => setTablet(tablet ? "0" : "1")} title="iPad-modus: hele scherm, vegen om te bladeren">
            <Tablet /> <span className="rd-tool-label">iPad</span>
          </button>
          <button type="button" className="rd-tool" aria-pressed={size === "l"} onClick={() => setSize(size === "l" ? "m" : "l")} title="Grotere letters">
            <span className="rd-aa">Aa</span>
          </button>
          {reader.supported && (
            <button type="button" className="rd-tool" aria-pressed={reader.open} onClick={() => (reader.open ? reader.close() : reader.start())} title="Voorlezen">
              <Volume2 /> <span className="rd-tool-label">Voorlezen</span>
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
            <SectionCard key={`was-${leaving.section.id}`} doc={doc} section={leaving.section} marks={leavingMarks} className="is-leaving" z={leaving.dir > 0 ? 1 : 3} />
          )}
          <SectionCard key={section.id} doc={doc} section={section} marks={marks} className="is-current" z={2} bodyRef={body} onBodyClick={onBodyClick} />
        </div>
        <NotesPanel
          doc={doc}
          section={section}
          notes={notesHere}
          draft={draft}
          setDraft={setDraft}
          pending={pending}
          setPending={setPending}
          composer={composer}
          tablet={tablet}
          onClose={() => setNotesOpen(false)}
          onSaved={(id) => { fresh.current = id; }}
          onQuote={flashMark}
          onHover={hoverNote}
        />
      </div>
      <button type="button" className="rd-scrim" aria-label="Notities sluiten" tabIndex={-1} onClick={() => setNotesOpen(false)} />

      <div className="rd-dock" ref={dock}>
        {reader.open && <ReadAloudPlayer reader={reader} total={segs.length} />}
      <nav className="rd-nav" aria-label="Bladeren">
        <Button variant="ghost" icon={<ArrowLeft />} disabled={index === 0} onClick={back}>Vorige</Button>
        <span className="rd-keys" aria-hidden="true">{marker ? "Streep over de tekst om te markeren" : tablet ? "Veeg om te bladeren" : <><kbd>←</kbd> <kbd>→</kbd> bladeren</>}</span>
        <button type="button" className="rd-notes-toggle" onClick={() => setNotesOpen((o) => !o)} aria-expanded={notesOpen}>
          <MessageSquare /> Notities{notesHere.length ? <span className="rd-notes-count">{notesHere.length}</span> : null}
        </button>
        {notesHere.length && !tablet ? <span className="rd-notes-chip"><MessageSquare /> {notesHere.length}</span> : null}
        <Magnetic>
          <button type="button" className="rd-next" onClick={forward}>
            <span className="rd-next-text">
              <small>{next ? "Volgende" : "Laatste stuk"}</small>
              <b>{next ? next.title : "Klaar met lezen"}</b>
            </span>
            {next ? <ArrowRight /> : <Check />}
          </button>
        </Magnetic>
      </nav>
      </div>

      {sel && !sel.saving && !sel.drawing && (
        <MarkToolbar
          sel={sel}
          body={body}
          canGrow={!!grow(body.current, sel.quote)}
          onMark={markOnly}
          onNote={noteOnIt}
          onGrow={() => { const q = grow(body.current, sel.quote); if (q) { window.getSelection()?.removeAllRanges(); marking.set({ quote: q, source: "hold" }); } }}
          onClose={marking.clear}
        />
      )}
      <HoldRing ring={marking.ring} />
      <svg className="rd-ink" aria-hidden="true"><path ref={ink} /></svg>
    </div>
  );
}

type Mark = DocQuote & { id: string; kind: "saved" | "pending" | "selecting" };

function marksFor(section: ReaderSection, notes: DocNote[]): Mark[] {
  const out: Mark[] = [];
  for (const n of notes) {
    const at = n.quote && placeQuote(section, n.quote);
    if (at) out.push({ ...at, id: n.id, kind: "saved" });
  }
  return out;
}

/** Where a saved quote sits now; it follows its words if the text around them moved. */
function placeQuote(section: ReaderSection, q: DocQuote): DocQuote | null {
  const b = section.blocks[q.block];
  if (!b || b.t === "table" || b.t === "meta") return null;
  const text = displayText(b.text);
  if (text.slice(q.start, q.end) === q.text) return q;
  const at = text.indexOf(q.text);
  return at >= 0 ? { ...q, start: at, end: at + q.text.length } : null;
}

const SectionCard = memo(function SectionCard({ doc, section, marks, className, z, bodyRef, onBodyClick }: {
  doc: ReaderDocument; section: ReaderSection; marks: Mark[]; className: string; z: number;
  bodyRef?: RefObject<HTMLDivElement | null>; onBodyClick?: (e: React.MouseEvent) => void;
}) {
  const part = doc.parts.find((p) => p.id === section.part)!;
  const firstOfPart = doc.sections.find((s) => s.part === part.id)?.id === section.id;
  return (
    <article className={cx("rd-card", className)} style={{ zIndex: z }} aria-hidden={className === "is-leaving" || undefined}>
      <div className="rd-card-top">
        <span className="rd-part">{partLabel(part)}</span>
        {section.changed && <span className="rd-new"><Sparkles /> Nieuw in {doc.version}</span>}
        <span className="rd-min">± {minutes(section)} min</span>
      </div>
      <h2 className="rd-title"><Words text={section.title} /></h2>
      {firstOfPart && part.meta.length > 0 && <p className="rd-meta rd-block">{part.meta.join(" · ")}</p>}
      <div className="rd-body" ref={bodyRef} onClick={onBodyClick}><Blocks blocks={section.blocks} marks={marks} /></div>
    </article>
  );
});

function Blocks({ blocks, marks }: { blocks: ReaderBlock[]; marks: Mark[] }) {
  const out: ReactNode[] = [];
  let items: { i: number; text: string }[] = [];
  const own = (i: number) => marks.filter((m) => m.block === i);
  const flush = (key: number) => {
    if (!items.length) return;
    out.push(<ul className="rd-block" key={`ul-${key}`}>{items.map((it) => <li key={it.i} data-b={it.i}><Rich text={it.text} marks={own(it.i)} /></li>)}</ul>);
    items = [];
  };
  blocks.forEach((b, i) => {
    if (b.t === "li") { items.push({ i, text: b.text }); return; }
    flush(i);
    if (b.t === "table") {
      out.push(
        <div className="rd-table rd-block" key={i} data-t={i}>
          <table>
            <thead><tr>{b.rows[0].map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
            <tbody>{b.rows.slice(1).map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Rich text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else if (b.t === "note") {
      out.push(<div className="rd-callout rd-block" key={i}><Info /> <p data-b={i}><Rich text={b.text} marks={own(i)} /></p></div>);
    } else if (b.t === "meta") {
      out.push(<p className="rd-meta rd-block" key={i}>{b.text}</p>);
    } else {
      out.push(<p className="rd-block" key={i} data-b={i}><Rich text={b.text} marks={own(i)} /></p>);
    }
  });
  flush(blocks.length);
  return <>{out}</>;
}

type Token = { text: string; bold?: boolean; href?: string };

/** Bold lead-ins and links; everything else is plain text. Offsets of marks count these display strings. */
function tokens(src: string): Token[] {
  return src.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).filter(Boolean).map((part) => {
    if (part.startsWith("**")) return { text: part.slice(2, -2), bold: true };
    if (/^https?:\/\//.test(part)) return { text: part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: part };
    return { text: part };
  });
}
const displayText = (src: string) => tokens(src).map((t) => t.text).join("");

function Rich({ text, marks = [] }: { text: string; marks?: Mark[] }) {
  const out: ReactNode[] = [];
  const cuts = [...new Set(marks.flatMap((m) => [m.start, m.end]))];
  let pos = 0;
  tokens(text).forEach((t, ti) => {
    const end = pos + t.text.length;
    const points = [pos, ...cuts.filter((c) => c > pos && c < end).sort((a, b) => a - b), end];
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const piece = t.text.slice(a - pos, b - pos);
      let node: ReactNode = t.href ? <a href={t.href} target="_blank" rel="noreferrer">{piece}</a> : t.bold ? <strong>{piece}</strong> : piece;
      const cover = marks.filter((m) => m.start <= a && m.end >= b);
      if (cover.length) {
        const top = cover.find((m) => m.kind !== "saved") || cover[0];
        node = (
          <mark className={cx("rd-hl", top.kind !== "saved" && `is-${top.kind}`, cover.length > 1 && "is-double")} data-note={top.id}>
            {node}
          </mark>
        );
      }
      out.push(<Fragment key={`${ti}-${k}`}>{node}</Fragment>);
    }
    pos = end;
  });
  return <>{out}</>;
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
// Marking: select with the mouse, hold a sentence, or draw with a pencil
// ---------------------------------------------------------------------------

type RingApi = { el: RefObject<HTMLSpanElement | null>; show: (x: number, y: number) => void; hide: () => void; done: () => void };

function useMarking(body: RefObject<HTMLDivElement | null>, key: string, marker: boolean, ink: RefObject<SVGPathElement | null>) {
  const [sel, setSel] = useState<Selecting | null>(null);
  const holding = useRef(false);
  const ringEl = useRef<HTMLSpanElement>(null);
  const ring = useMemo<RingApi>(() => {
    const circle = () => ringEl.current?.querySelector("circle");
    return {
      el: ringEl,
      show(x, y) {
        const el = ringEl.current;
        if (!el || still()) return;
        gsap.killTweensOf([el, circle()]);
        gsap.set(el, { x: x - 28, y: y - 28, opacity: 0, scale: 0.6 });
        gsap.to(el, { opacity: 1, scale: 1, duration: 0.2, delay: 0.12, ease: "power2.out" });
        gsap.fromTo(circle()!, { strokeDashoffset: 151 }, { strokeDashoffset: 0, duration: HOLD_MS / 1000, ease: "none" });
      },
      hide() {
        const el = ringEl.current;
        if (!el) return;
        gsap.killTweensOf([el, circle()]);
        gsap.to(el, { opacity: 0, duration: 0.15 });
      },
      done() {
        const el = ringEl.current;
        if (el && !still()) gsap.to(el, { scale: 1.5, opacity: 0, duration: 0.35, ease: "power2.out" });
      },
    };
  }, []);

  const clear = useCallback(() => {
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => setSel(null), [key]);

  // Mouse or keyboard selection: the browser selects, we offer to mark it.
  useEffect(() => {
    let t = 0;
    const onChange = () => {
      clearTimeout(t);
      t = window.setTimeout(() => {
        if (holding.current) return;
        const s = window.getSelection();
        const root = body.current;
        if (!s || !root || !s.rangeCount || s.isCollapsed) {
          setSel((cur) => (cur?.source === "drag" ? null : cur));
          return;
        }
        const range = s.getRangeAt(0);
        if (!root.contains(range.commonAncestorContainer) && !root.contains(range.startContainer)) return;
        const quote = quoteFromRange(range, root);
        if (quote) setSel({ quote, source: "drag", range: range.cloneRange() });
      }, 120);
    };
    document.addEventListener("selectionchange", onChange);
    return () => { clearTimeout(t); document.removeEventListener("selectionchange", onChange); };
  }, [key]);

  // Holding a sentence still marks it (mouse and finger). A pencil always
  // draws over words, and so does a finger once the marker is on. On iPad the
  // touch events say whether it is a finger or the Pencil, and cancelling them
  // is the one way to stop Safari from scrolling under the Pencil. Positions
  // are measured from the text itself: Safari gives none for text that cannot
  // be selected.
  useEffect(() => {
    const root = body.current;
    if (!root) return;
    let timer = 0;
    let holdAt: { x: number; y: number } | null = null;
    let draw: { block: number; offset: number; id: number | "touch"; x: number; y: number; moved: boolean; target: Element } | null = null;
    let lastType = "mouse";
    let frame = 0;
    let trail = "";

    const release = () => setTimeout(() => { holding.current = false; }, 50);
    const cancelHold = () => { clearTimeout(timer); timer = 0; holdAt = null; ring.hide(); };
    const startHold = (x: number, y: number) => {
      const at = posAt(root, x, y);
      if (!at) return;
      cancelHold();
      holdAt = { x, y };
      ring.show(x, y);
      timer = window.setTimeout(() => {
        timer = 0;
        holdAt = null;
        const text = blockText(root, at.block);
        const [a, b] = sentenceAt(text, at.offset);
        if (b - a < 2) { ring.hide(); return; }
        holding.current = true;
        window.getSelection()?.removeAllRanges();
        navigator.vibrate?.(12);
        ring.done();
        setSel({ quote: { block: at.block, start: a, end: b, text: text.slice(a, b) }, source: "hold" });
      }, HOLD_MS);
    };

    const beginDraw = (x: number, y: number, id: number | "touch", target: Element) => {
      const at = posAt(root, x, y);
      if (!at) return false;
      cancelHold();
      holding.current = true;
      draw = { ...at, id, x, y, moved: false, target };
      setSel(null);
      // The stroke shows as ink while you draw, then fades into the marking.
      trail = `M${x} ${y}`;
      if (ink.current) { gsap.killTweensOf(ink.current); ink.current.setAttribute("d", trail); gsap.set(ink.current, { opacity: 1 }); }
      return true;
    };
    const moveDraw = (x: number, y: number) => {
      if (!draw) return;
      trail += ` L${Math.round(x)} ${Math.round(y)}`;
      ink.current?.setAttribute("d", trail);
      if (!draw.moved && Math.hypot(x - draw.x, y - draw.y) > 4) draw.moved = true;
      if (!draw.moved) return;
      // Kept apart, so the last bit of a stroke still lands after the pencil lifts.
      const d = draw;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const at = posAt(root, x, y, d.block);
        if (!at) return;
        const text = blockText(root, d.block);
        const [a, b] = snapWords(text, Math.min(d.offset, at.offset), Math.max(d.offset, at.offset));
        if (b - a >= 2) setSel({ quote: { block: d.block, start: a, end: b, text: text.slice(a, b) }, source: "pen", drawing: true });
      });
    };
    const endDraw = () => {
      if (!draw) return;
      const { moved, target } = draw;
      draw = null;
      if (ink.current) gsap.to(ink.current, { opacity: 0, duration: still() ? 0 : 0.6, ease: "power2.out" });
      // A tap without a stroke still opens the note of a marking.
      if (!moved && target instanceof HTMLElement) target.click();
      requestAnimationFrame(() => setSel((s) => (s?.drawing ? { ...s, drawing: false } : s)));
      release();
    };

    const down = (e: PointerEvent) => {
      lastType = e.pointerType;
      if (e.button !== 0 || (e.target as Element).closest("a")) return;
      if (e.pointerType === "mouse") { startHold(e.clientX, e.clientY); return; }
      if (IOS_TOUCH) return;
      if ((e.pointerType === "pen" || marker) && beginDraw(e.clientX, e.clientY, e.pointerId, e.target as Element)) e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (draw && draw.id === e.pointerId) { moveDraw(e.clientX, e.clientY); return; }
      if (holdAt && e.pointerType === "mouse" && Math.hypot(e.clientX - holdAt.x, e.clientY - holdAt.y) > 8) cancelHold();
    };
    const up = (e: PointerEvent) => {
      if (draw && draw.id === e.pointerId) endDraw();
      if (e.pointerType === "mouse") { if (timer) cancelHold(); release(); }
    };

    const touchStart = (e: TouchEvent) => {
      lastType = "touch";
      if (e.touches.length !== 1) { cancelHold(); return; }
      const t = e.touches[0] as Touch & { touchType?: string };
      if (t.touchType === "stylus" || (marker && IOS_TOUCH)) {
        if (!(e.target as Element).closest("a") && beginDraw(t.clientX, t.clientY, "touch", e.target as Element)) e.preventDefault();
        return;
      }
      if (!marker) startHold(t.clientX, t.clientY);
    };
    const touchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (draw?.id === "touch") {
        e.preventDefault();
        if (t) moveDraw(t.clientX, t.clientY);
        return;
      }
      if (holdAt && t && Math.hypot(t.clientX - holdAt.x, t.clientY - holdAt.y) > 10) cancelHold();
    };
    const touchEnd = () => {
      if (draw?.id === "touch") endDraw();
      if (timer) cancelHold();
      release();
    };
    const onScroll = () => { if (timer) cancelHold(); };
    const noMenu = (e: Event) => { if (lastType !== "mouse" || holding.current) e.preventDefault(); };
    const noSelect = (e: Event) => { if (holding.current) e.preventDefault(); };

    root.addEventListener("pointerdown", down);
    root.addEventListener("touchstart", touchStart, { passive: false });
    root.addEventListener("touchmove", touchMove, { passive: false });
    root.addEventListener("touchend", touchEnd);
    root.addEventListener("touchcancel", touchEnd);
    root.addEventListener("contextmenu", noMenu);
    document.addEventListener("selectstart", noSelect);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      cancelHold();
      cancelAnimationFrame(frame);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("touchstart", touchStart);
      root.removeEventListener("touchmove", touchMove);
      root.removeEventListener("touchend", touchEnd);
      root.removeEventListener("touchcancel", touchEnd);
      root.removeEventListener("contextmenu", noMenu);
      document.removeEventListener("selectstart", noSelect);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [key, ring, body, marker, ink]);

  // True while a sentence is held or a stroke is drawn, so swiping stays out of the way.
  const busy = useCallback(() => holding.current, []);
  return { sel, set: setSel, clear, ring, busy };
}

function HoldRing({ ring }: { ring: RingApi }) {
  return (
    <span className="rd-holdring" ref={ring.el} aria-hidden="true">
      <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" strokeDasharray="151" strokeDashoffset="151" /></svg>
    </span>
  );
}

/** Floats above what you marked: keep it, or write something about it. */
function MarkToolbar({ sel, body, canGrow, onMark, onNote, onGrow, onClose }: {
  sel: Selecting; body: RefObject<HTMLDivElement | null>; canGrow: boolean;
  onMark: () => void; onNote: () => void; onGrow: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      const rect = sel.range ? sel.range.getBoundingClientRect() : unionRect(body.current?.querySelectorAll(`[data-note="selecting"]`));
      if (!rect || (!rect.width && !rect.height)) return;
      const below = rect.top < 120;
      const half = (ref.current?.offsetWidth || 300) / 2 + 12;
      const x = Math.min(Math.max(rect.left + rect.width / 2, half), window.innerWidth - half);
      setPos({ x, y: below ? rect.bottom + 12 : rect.top - 12, below });
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    place();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [sel, body]);

  useGSAP(() => {
    if (!pos || still()) return;
    gsap.from(ref.current, { opacity: 0, y: pos.below ? -8 : 8, scale: 0.94, duration: 0.35, ease: "back.out(2)" });
  }, { dependencies: [!!pos, sel.quote.start, sel.quote.block] });

  // Rendered hidden at first, so its width is known before it is placed.
  return (
    <div
      ref={ref}
      className={cx("rd-marker", pos?.below && "below")}
      style={pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: "hidden" }}
      role="toolbar"
      aria-label="Markeren"
      onPointerDown={(e) => e.preventDefault()}
    >
      <button type="button" onClick={onMark}><Highlighter /> Markeer</button>
      <button type="button" onClick={onNote}><MessageSquarePlus /> Notitie</button>
      {canGrow && <button type="button" onClick={onGrow} title="Ook de volgende zin"><Plus /> Langer</button>}
      <button type="button" className="icon" onClick={onClose} aria-label="Niet markeren"><X /></button>
    </div>
  );
}

function unionRect(els: NodeListOf<Element> | undefined): DOMRect | null {
  if (!els?.length) return null;
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  els.forEach((el) => {
    for (const x of el.getClientRects()) { l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom); }
  });
  return Number.isFinite(l) ? new DOMRect(l, t, r - l, b - t) : null;
}

const blockEl = (n: Node, root: Element) => {
  const el = (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement)?.closest<HTMLElement>("[data-b]");
  return el && root.contains(el) ? el : null;
};
const blockText = (root: Element, block: number) => root.querySelector(`[data-b="${block}"]`)?.textContent || "";

/** Characters from the start of `el` up to a point inside it. */
function offsetIn(el: Element, node: Node, offset: number) {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(node, offset);
  return r.toString().length;
}

function trimSpan(text: string, a: number, b: number): [number, number] {
  while (a < b && /\s/.test(text[a])) a++;
  while (b > a && /\s/.test(text[b - 1])) b--;
  return [a, b];
}

function quoteFromRange(range: Range, root: Element): DocQuote | null {
  const first = blockEl(range.startContainer, root);
  if (!first) return null;
  const text = first.textContent || "";
  const a0 = offsetIn(first, range.startContainer, range.startOffset);
  const b0 = blockEl(range.endContainer, root) === first ? offsetIn(first, range.endContainer, range.endOffset) : text.length;
  const [a, b] = trimSpan(text, a0, b0);
  return b - a >= 2 ? { block: Number(first.dataset.b), start: a, end: b, text: text.slice(a, b) } : null;
}

/**
 * Which block and which character sit under a point. With `block` given, the
 * point is held to that block (above it is its start, below it its end), so a
 * stroke that wanders off the paragraph keeps marking it.
 */
function posAt(root: Element, x: number, y: number, block?: number): { block: number; offset: number } | null {
  let el: HTMLElement | null;
  if (block === undefined) {
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-b]") ?? null;
    el = hit && root.contains(hit) ? hit : null;
  } else {
    el = root.querySelector<HTMLElement>(`[data-b="${block}"]`);
  }
  if (!el) return null;
  if (block !== undefined) {
    const r = el.getBoundingClientRect();
    if (y < r.top) return { block, offset: 0 };
    if (y > r.bottom) return { block, offset: (el.textContent || "").length };
  }
  return { block: Number(el.dataset.b), offset: charAt(el, x, y) };
}

/**
 * The caret position under a point, found by measuring characters: a binary
 * search in reading order, about ten measurements for a long paragraph.
 */
function charAt(el: Element, x: number, y: number): number {
  const nodes: { node: Text; start: number }[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let total = 0;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    nodes.push({ node: n as Text, start: total });
    total += (n as Text).length;
  }
  if (!total) return 0;
  const range = document.createRange();
  const rectOf = (i: number) => {
    let lo = 0, hi = nodes.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (nodes[mid].start <= i) lo = mid; else hi = mid - 1; }
    const { node, start } = nodes[lo];
    range.setStart(node, i - start);
    range.setEnd(node, i - start + 1);
    const rects = range.getClientRects();
    return rects[rects.length - 1] || range.getBoundingClientRect();
  };
  let lo = 0, hi = total;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const r = rectOf(mid);
    const before = r.bottom <= y || (r.top <= y && r.left + r.width / 2 <= x);
    if (before) lo = mid + 1; else hi = mid;
  }
  return lo;
}

/** Widen a span to whole words, so a rough stroke still marks clean words. */
function snapWords(text: string, a: number, b: number): [number, number] {
  while (a > 0 && /\S/.test(text[a - 1])) a--;
  while (b < text.length && /\S/.test(text[b])) b++;
  return trimSpan(text, a, b);
}

function sentences(text: string): [number, number][] {
  const spans: [number, number][] = [];
  if (typeof Intl.Segmenter === "function") {
    for (const s of new Intl.Segmenter("nl", { granularity: "sentence" }).segment(text)) spans.push(trimSpan(text, s.index, s.index + s.segment.length));
  } else {
    for (const m of text.matchAll(/[^.!?]+[.!?]*\s*/g)) spans.push(trimSpan(text, m.index ?? 0, (m.index ?? 0) + m[0].length));
  }
  return spans.filter(([a, b]) => b > a);
}

function sentenceAt(text: string, offset: number): [number, number] {
  const spans = sentences(text);
  return spans.find(([a, b]) => offset >= a && offset <= b) || spans.find(([a]) => a >= offset) || [0, 0];
}

/** The same marking, one sentence longer. */
function grow(root: Element | null, q: DocQuote): DocQuote | null {
  if (!root) return null;
  const text = blockText(root, q.block);
  const nextSpan = sentences(text).find(([a]) => a >= q.end);
  return nextSpan ? { ...q, end: nextSpan[1], text: text.slice(q.start, nextSpan[1]) } : null;
}

function inTextOrder(notes: DocNote[]) {
  return [...notes].sort((a, b) => {
    if (a.quote && b.quote) return a.quote.block - b.quote.block || a.quote.start - b.quote.start;
    if (a.quote || b.quote) return a.quote ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

function NotesPanel({ doc, section, notes, draft, setDraft, pending, setPending, composer, tablet, onClose, onSaved, onQuote, onHover }: {
  doc: ReaderDocument; section: ReaderSection; notes: DocNote[]; draft: string; setDraft: (t: string) => void;
  pending: DocQuote | null; setPending: (q: DocQuote | null) => void; composer: RefObject<HTMLTextAreaElement | null>; tablet: boolean;
  onClose: () => void; onSaved: (id: string) => void; onQuote: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const { user } = useAuth();
  const actions = useNoteActions(doc.id);
  const ordered = useMemo(() => inTextOrder(notes), [notes]);
  const listRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());

  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>(".rd-note", listRef.current);
    const fresh = els.filter((el) => !seen.current.has(el.dataset.id!));
    els.forEach((el) => seen.current.add(el.dataset.id!));
    if (still() || !fresh.length) return;
    gsap.fromTo(fresh, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)", clearProps: "transform" });
  }, { dependencies: [section.id, ordered.map((n) => n.id).join()], scope: listRef });

  const save = () => {
    const text = draft.trim();
    if (!text && !pending) return;
    actions.add.mutate({ sectionId: section.id, text, quote: pending }, {
      onSuccess: ({ note }) => { setDraft(""); setPending(null); onSaved(note.id); },
    });
  };

  return (
    <aside className="rd-notes" aria-label="Notities bij dit stuk">
      <div className="rd-notes-head">
        <MessageSquare /> <b>Notities</b> {notes.length ? <span className="rd-notes-count">{notes.length}</span> : null}
        <button type="button" className="rd-notes-close" onClick={onClose} aria-label="Notities sluiten"><X /></button>
      </div>
      <div className="rd-compose">
        {pending && (
          <div className="rd-compose-quote">
            <Highlighter />
            <q className="rd-quote">{pending.text}</q>
            <button type="button" onClick={() => setPending(null)} aria-label="Markering weghalen"><X /></button>
          </div>
        )}
        <Textarea
          ref={composer}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
          placeholder={pending ? "Wat wil je hierover zeggen?" : "Wat valt je op? Schrijf het kort op."}
          rows={3}
          aria-label="Nieuwe notitie"
        />
        <div className="rd-compose-foot">
          {tablet ? <span /> : <span className="rd-quiet"><kbd>Ctrl</kbd> <kbd>Enter</kbd></span>}
          <Button variant="primary" size="sm" onClick={save} disabled={!draft.trim() && !pending} loading={actions.add.isPending}>
            {pending && !draft.trim() ? "Alleen markeren" : "Opslaan"}
          </Button>
        </div>
      </div>
      <div className="rd-note-list" ref={listRef}>
        {ordered.map((n) => (
          <NoteItem key={n.id} note={n} mine={n.authorId === user?.id} actions={actions} onQuote={onQuote} onHover={onHover} />
        ))}
        {!ordered.length && (
          <p className="rd-quiet rd-hint">
            <Highlighter /> {tablet ? "Streep met je Pencil over de tekst om te markeren. Met je vinger: houd een zin even vast, of zet de markeerstift aan." : "Selecteer tekst of houd een zin even vast om te markeren."}
          </p>
        )}
      </div>
    </aside>
  );
}

function NoteItem({ note, mine, actions, onQuote, onHover }: {
  note: DocNote; mine: boolean; actions: ReturnType<typeof useNoteActions>;
  onQuote: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  return (
    <div
      className="rd-note"
      data-id={note.id}
      onMouseEnter={note.quote ? () => onHover(note.id) : undefined}
      onMouseLeave={note.quote ? () => onHover(null) : undefined}
    >
      <span className="rd-note-avatar" aria-hidden="true">{initials(note.authorName)}</span>
      <div className="rd-note-main">
        <div className="rd-note-head">
          <b>{note.authorName.split(" ")[0]}</b>
          <span className="rd-quiet">{ago(note.updatedAt)}</span>
          {mine && !editing && (
            <span className="rd-note-actions">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={note.text ? "Notitie aanpassen" : "Notitie toevoegen"}
                icon={<Pencil />}
                onClick={() => { setText(note.text); setEditing(true); }}
              />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Notitie verwijderen"
                icon={<Trash2 />}
                onClick={async () => {
                  const what = note.text ? "Deze notitie" : "Deze markering";
                  if (await confirm({ title: note.text ? "Notitie verwijderen?" : "Markering weghalen?", body: `${what} is daarna weg, ook voor de anderen.`, confirm: "Verwijderen", danger: true })) {
                    actions.remove.mutate(note.id);
                  }
                }}
              />
            </span>
          )}
        </div>
        {note.quote && (
          <button type="button" className="rd-note-quote" onClick={() => onQuote(note.id)} title="Laat zien in de tekst">
            <q className="rd-quote">{note.quote.text}</q>
          </button>
        )}
        {editing ? (
          <div className="rd-compose">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Notitie aanpassen" autoFocus />
            <div className="rd-compose-foot">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuleren</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!text.trim() && !note.quote}
                loading={actions.edit.isPending}
                onClick={() => actions.edit.mutate({ id: note.id, text: text.trim() }, { onSuccess: () => setEditing(false) })}
              >
                Opslaan
              </Button>
            </div>
          </div>
        ) : note.text ? (
          <p className="rd-note-text">{note.text}</p>
        ) : (
          <p className="rd-quiet">Gemarkeerd</p>
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
      <Ambient moving />
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

/**
 * Soft colour behind everything, with a little grain. It only drifts on the
 * overview and the end screen, as a CSS animation the compositor runs without
 * JavaScript; while reading it stands still, so nothing redraws behind the text.
 */
function Ambient({ moving = false }: { moving?: boolean }) {
  return (
    <div className={cx("rd-ambient", moving && "is-moving")} aria-hidden="true">
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

// ---------------------------------------------------------------------------
// Reading aloud: what to say, and how to light it up
// ---------------------------------------------------------------------------

const URLISH = /\bhttps?:\/\/\S+|\b[\w-]+(?:\.[\w-]+)+\/[^\s)]*/g;

/** The piece as sentences to speak: title, text, table rows, and the notes if asked. */
function planSpeech(section: ReaderSection, notes: DocNote[], withNotes: boolean): SpeechSeg[] {
  const out: SpeechSeg[] = [{ key: "title", block: -1, start: 0, end: section.title.length, say: section.title, words: true }];
  section.blocks.forEach((b, i) => {
    if (b.t === "meta") return;
    if (b.t === "table") {
      const [head, ...rows] = b.rows;
      rows.forEach((r, k) => out.push({ key: `t${i}-${k}`, block: i, row: k, words: false, say: r.map((c, j) => `${head[j]}: ${displayText(c)}`).join(". ") }));
      return;
    }
    const text = displayText(b.text);
    for (const [from, to] of sentences(text)) {
      const t = text.slice(from, to);
      // Web addresses are noise read aloud; such a sentence lights up as a whole.
      const say = t.replace(URLISH, "link");
      out.push({ key: `${i}-${from}`, block: i, start: from, end: to, say, words: say === t });
    }
  });
  if (withNotes) {
    for (const n of inTextOrder(notes)) {
      const who = n.authorName.split(" ")[0];
      out.push({ key: `n-${n.id}`, note: n.id, words: false, say: `Notitie van ${who}. ${n.quote ? `Bij: ${n.quote.text}. ` : ""}${n.text || "Alleen gemarkeerd."}` });
    }
  }
  return out;
}

/** A range over characters `start` to `end` of an element's text. */
function rangeIn(el: Element, start: number, end: number): Range | null {
  const r = document.createRange();
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let started = false;
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    const len = n.length;
    if (!started && start <= pos + len) { r.setStart(n, Math.max(0, start - pos)); started = true; }
    if (started && end <= pos + len) { r.setEnd(n, Math.max(0, end - pos)); return r; }
    pos += len;
  }
  return null;
}

// The CSS Custom Highlight API paints over text without touching the page, so
// lighting up word after word costs next to nothing.
type HighlightApi = { highlights?: Map<string, unknown> };
const HIGHLIGHTS = typeof CSS !== "undefined" ? (CSS as unknown as HighlightApi).highlights : undefined;
const HighlightCtor = typeof window !== "undefined" ? (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight : undefined;

function setHighlight(name: string, range: Range | null) {
  if (!HIGHLIGHTS || !HighlightCtor) return;
  if (range) HIGHLIGHTS.set(name, new HighlightCtor(range));
  else HIGHLIGHTS.delete(name);
}
