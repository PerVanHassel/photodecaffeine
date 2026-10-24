import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Info, Pause, Play, SkipBack, SkipForward, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx, Select } from "../ui";

// Reading a piece aloud, one sentence at a time. Short utterances keep every
// browser going (Chrome stops long ones after about fifteen seconds), give a
// sentence to light up, and let pause, skip and "read from here" work the
// same everywhere. Where the voice reports word boundaries, the word lights
// up too.

/** One thing to say, and where it sits on screen. */
export type SpeechSeg = {
  key: string;
  say: string;
  /** The spoken text is the text on screen, so word positions line up. */
  words: boolean;
  /** Block in the piece; -1 is the title. */
  block?: number;
  start?: number;
  end?: number;
  /** Row of a table block. */
  row?: number;
  /** Id of a note being read. */
  note?: string;
};

export type ReadSettings = { rate: number; voice: string; words: boolean; dim: boolean; follow: boolean; notes: boolean };

const KEY = "pdc-reader-voice";
const DEFAULTS: ReadSettings = { rate: 1, voice: "", words: true, dim: true, follow: true, notes: false };
const RATES = [0.8, 0.9, 1, 1.15, 1.3, 1.5];
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function loadSettings(): ReadSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULTS; }
}

export const fmtRate = (r: number) => `${r.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}×`;

function voiceLabel(v: SpeechSynthesisVoice) {
  const name = v.name.replace(/^Microsoft\s+/, "").replace(/\s*[-(].*(Dutch|Nederlands|Netherlands|Belgium|België).*$/i, "").trim();
  const where = /be/i.test(v.lang.slice(3)) ? "Vlaams" : "Nederlands";
  return `${name} · ${where}${v.localService ? "" : " · online"}`;
}

function voiceTip() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPad|iPhone/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "Een mooiere stem: Instellingen › Toegankelijkheid › Gesproken materiaal › Stemmen › Nederlands, en download een stem met ‘verbeterd’.";
  }
  if (/Macintosh/.test(ua)) return "Meer stemmen: Systeeminstellingen › Toegankelijkheid › Gesproken materiaal › Systeemstem.";
  if (/Windows/.test(ua)) return "Meer stemmen: Windows-instellingen › Tijd en taal › Spraak › Stemmen toevoegen › Nederlands.";
  return "";
}

export type ReadAloud = ReturnType<typeof useReadAloud>;

export function useReadAloud({ segments, paint, onEnd }: {
  segments: () => SpeechSeg[];
  paint: (seg: SpeechSeg | null, word: [number, number] | null) => void;
  onEnd: () => void;
}) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  const [settings, setSettings] = useState(loadSettings);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const cb = useRef({ segments, paint, onEnd });
  cb.current = { segments, paint, onEnd };
  const cfg = useRef(settings);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [supported]);

  // Dutch voices, the ones on the device first: they start at once and report words.
  const dutch = useMemo(
    () => voices
      .filter((v) => /^nl([-_]|$)/i.test(v.lang))
      .sort((a, b) => Number(b.localService) - Number(a.localService) || Number(/nl.nl/i.test(b.lang)) - Number(/nl.nl/i.test(a.lang))),
    [voices],
  );
  const voice = dutch.find((v) => v.voiceURI === settings.voice) || dutch[0] || null;
  voiceRef.current = voice;

  const engine = useMemo(() => {
    let run = 0;
    let pos = 0;
    let live = false;
    let current: SpeechSynthesisUtterance | null = null;

    const halt = () => {
      run++;
      live = false;
      if (supported) window.speechSynthesis.cancel();
    };
    const show = (i: number) => {
      const segs = cb.current.segments();
      pos = Math.max(0, Math.min(i, segs.length - 1));
      setIndex(pos);
      cb.current.paint(segs[pos] || null, null);
    };
    const speakAt = (i: number) => {
      if (!supported) return;
      const segs = cb.current.segments();
      halt();
      const id = run;
      if (i >= segs.length) {
        setPlaying(false);
        pos = 0;
        setIndex(0);
        cb.current.paint(null, null);
        cb.current.onEnd();
        return;
      }
      pos = Math.max(0, i);
      const seg = segs[pos];
      const at = pos;
      setIndex(pos);
      setPlaying(true);
      live = true;
      cb.current.paint(seg, null);
      const u = new SpeechSynthesisUtterance(seg.say);
      const v = voiceRef.current;
      if (v) u.voice = v;
      u.lang = v?.lang || "nl-NL";
      u.rate = cfg.current.rate;
      u.onboundary = (e) => {
        if (id !== run || e.name !== "word" || !seg.words || !cfg.current.words) return;
        const len = e.charLength || seg.say.slice(e.charIndex).match(/^\S+/)?.[0].length || 0;
        if (len) cb.current.paint(seg, [e.charIndex, e.charIndex + len]);
      };
      u.onend = () => { if (id === run) speakAt(at + 1); };
      u.onerror = (e) => {
        if (id !== run || e.error === "interrupted" || e.error === "canceled") return;
        live = false;
        setPlaying(false);
      };
      // Held on to, or Chrome may collect it and never call onend.
      current = u;
      // Chrome can drop an utterance spoken in the same tick as cancel().
      window.setTimeout(() => { if (id === run && current === u) window.speechSynthesis.speak(u); }, 40);
    };

    return {
      play: (from?: number) => speakAt(from ?? pos),
      pause: () => { halt(); setPlaying(false); },
      toggle: () => (live ? (halt(), setPlaying(false)) : speakAt(pos)),
      next: () => (live ? speakAt(pos + 1 < cb.current.segments().length ? pos + 1 : pos) : show(pos + 1)),
      prev: () => (live ? speakAt(Math.max(0, pos - 1)) : show(pos - 1)),
      jump: (i: number) => speakAt(i),
      /** Back to the first sentence, quietly: for a new piece. */
      reset: () => { halt(); setPlaying(false); pos = 0; setIndex(0); cb.current.paint(null, null); },
      restart: () => { if (live) speakAt(pos); },
      isLive: () => live,
      stop: () => { halt(); setPlaying(false); cb.current.paint(null, null); },
    };
  }, [supported]);

  useEffect(() => engine.stop, [engine]);

  const update = (patch: Partial<ReadSettings>) => {
    const nextSettings = { ...cfg.current, ...patch };
    cfg.current = nextSettings;
    setSettings(nextSettings);
    try { localStorage.setItem(KEY, JSON.stringify(nextSettings)); } catch { /* keep it for this visit */ }
    if ("rate" in patch || "voice" in patch) {
      if ("voice" in patch) voiceRef.current = dutch.find((v) => v.voiceURI === patch.voice) || voiceRef.current;
      engine.restart();
    }
  };

  return {
    supported, open, playing, index, settings, voices: dutch, voice, update,
    start: () => { setOpen(true); engine.play(); },
    close: () => { engine.stop(); setOpen(false); },
    ...engine,
  };
}

/** The player above the paging bar: big play button, skip by sentence, speed and settings. */
export function ReadAloudPlayer({ reader, total }: { reader: ReadAloud; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(false);
  const s = reader.settings;
  const nextRate = RATES.find((r) => r > s.rate + 0.01) ?? RATES[0];
  const tip = voiceTip();

  useGSAP(() => {
    if (!still()) gsap.from(ref.current, { y: 24, opacity: 0, duration: 0.5, ease: "back.out(1.6)" });
  }, { scope: ref });
  useGSAP(() => {
    if (panel && panelRef.current && !still()) gsap.from(panelRef.current, { height: 0, opacity: 0, duration: 0.45, ease: "power3.out", clearProps: "height,opacity" });
  }, { dependencies: [panel] });

  return (
    <div className={cx("rd-player", reader.playing && "is-playing")} ref={ref} role="region" aria-label="Voorlezen">
      <div className="rd-player-row">
        <button type="button" className="rd-pbtn" onClick={reader.prev} disabled={reader.index === 0} aria-label="Vorige zin" title="Vorige zin">
          <SkipBack />
        </button>
        <button type="button" className="rd-play" onClick={reader.toggle} aria-label={reader.playing ? "Pauzeren" : "Voorlezen"} title="Spatiebalk">
          {reader.playing ? <Pause /> : <Play />}
        </button>
        <button type="button" className="rd-pbtn" onClick={reader.next} disabled={reader.index >= total - 1} aria-label="Volgende zin" title="Volgende zin">
          <SkipForward />
        </button>
        <div className="rd-player-info" aria-live="polite">
          <b>{reader.playing ? "Leest voor" : "Gepauzeerd"} · zin {Math.min(reader.index + 1, total)} van {total}</b>
          <span className="rd-player-track" aria-hidden="true"><span style={{ transform: `scaleX(${total ? (reader.index + 1) / total : 0})` }} /></span>
        </div>
        <button type="button" className="rd-pbtn rd-rate" onClick={() => reader.update({ rate: nextRate })} title="Sneller of langzamer">
          {fmtRate(s.rate)}
        </button>
        <button type="button" className="rd-pbtn" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-label="Instellingen voor voorlezen" title="Instellingen">
          <SlidersHorizontal />
        </button>
        <button type="button" className="rd-pbtn" onClick={reader.close} aria-label="Voorlezen sluiten" title="Sluiten">
          <X />
        </button>
      </div>
      {panel && (
        <div className="rd-player-panel" ref={panelRef}>
          <label className="rd-pfield">
            <span>Snelheid <b>{fmtRate(s.rate)}</b></span>
            <input type="range" min={0.6} max={1.6} step={0.05} value={s.rate} onChange={(e) => reader.update({ rate: Number(e.target.value) })} />
            <span className="rd-pscale" aria-hidden="true"><i>langzaam</i><i>snel</i></span>
          </label>
          <label className="rd-pfield">
            <span>Stem</span>
            {reader.voices.length ? (
              <Select value={reader.voice?.voiceURI || ""} onChange={(e) => reader.update({ voice: e.target.value })}>
                {reader.voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>)}
              </Select>
            ) : (
              <em className="rd-quiet">Geen Nederlandse stem op dit apparaat. De standaardstem leest voor.</em>
            )}
          </label>
          <div className="rd-pswitches">
            <Toggle on={s.words} onChange={(v) => reader.update({ words: v })} label="Woord voor woord meelezen" />
            <Toggle on={s.dim} onChange={(v) => reader.update({ dim: v })} label="De rest van de tekst dimmen" />
            <Toggle on={s.follow} onChange={(v) => reader.update({ follow: v })} label="Daarna doorlezen naar het volgende stuk" />
            <Toggle on={s.notes} onChange={(v) => reader.update({ notes: v })} label="Notities ook voorlezen" />
          </div>
          <p className="rd-quiet rd-ptip"><Info /> <span>Tik of klik op een zin om vanaf daar te lezen. {tip}</span></p>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="rd-switch" onClick={() => onChange(!on)}>
      <span className="rd-switch-track" aria-hidden="true"><span /></span>
      {label}
    </button>
  );
}
