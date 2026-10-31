import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Check } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useSearchParams } from "react-router";
import { smallJpeg } from "../../lib/webPhoto";
import { api, ApiError, errorMessage } from "../api";
import { StudioFonts } from "../fonts";
import "../gallery/gallery.css";
import { accentOf, onAccent, styleOf } from "../gallery/styles";
import { usePortalLanguage, useT, type PortalText } from "../portal/i18n";
import { queryClient } from "../queries";
import "../studio.css";
import type { ConsentAnswer } from "../types";
import { LangSwitch } from "./LangSwitch";

// The page the consent link opens, /toestemming/<token>: per child, a parent
// says what may be done. No login. A saved answer gets a key of its own, in the
// mail and in the link on the last screen, to change or withdraw it later (?k=).

const ANSWERS: ConsentAnswer[] = ["full", "no_social", "no_photo"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Statement = { title: string; body: string };
type Reply = {
  title: string;
  shootDate: string;
  accentColor: string;
  /** The wording lives on the server: what is shown here is what an answer keeps as proof. */
  statements: Record<"nl" | "en", Record<ConsentAnswer, Statement>>;
  /** The parent's own answer, when they came back with its key. */
  answer: { childName: string; answer: ConsentAnswer; note: string; parentName: string; parentEmail: string; photoUrl: string } | null;
};
type Saved = { key: string; childName: string; answer: ConsentAnswer; parentName: string; parentEmail: string; changed: boolean; mailed: boolean };
type Lang = ReturnType<typeof usePortalLanguage>;

export function ConsentPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="studio">
        <StudioFonts />
        <Consent />
      </div>
    </QueryClientProvider>
  );
}

function Consent() {
  const { token = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const key = params.get("k") || "";
  const t = useT();
  const lang = usePortalLanguage();
  const path = `/consent/${encodeURIComponent(token)}`;
  const query = useQuery({
    queryKey: ["consent-form", token, key],
    queryFn: ({ signal }) => api<Reply>(key ? `${path}?key=${encodeURIComponent(key)}` : path, { signal, anonymous: true }),
    retry: false,
    // A half-filled form stays as it is when someone comes back to the tab.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [saved, setSaved] = useState<Saved | null>(null);
  // A second child starts with the parent's details already there.
  const [parent, setParent] = useState({ name: "", email: "" });
  const [round, setRound] = useState(0);

  const data = query.data;
  const accent = accentOf({ gallerySettings: { accentColor: data?.accentColor } });
  const page = { "--g-accent": accent, "--g-on-accent": onAccent(accent) } as CSSProperties;

  if (query.isError) {
    const gone = query.error instanceof ApiError && query.error.status === 404;
    return (
      <main className="g-page g-closed" style={page}>
        <Head t={t} />
        <div className="g-empty">
          <LangSwitch lang={lang} t={t} />
          <p className="g-title">{gone ? t.linkClosed : errorMessage(query.error)}</p>
          {gone ? <p>{t.linkClosedHint}</p> : <button type="button" className="g-btn" onClick={() => query.refetch()}>{t.tryAgain}</button>}
          <a className="g-btn" href="/">{t.toSite}</a>
        </div>
      </main>
    );
  }

  function another() {
    setSaved(null);
    setRound((n) => n + 1);
    if (key) setParams({}, { replace: true });
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="g-page g-gate no-cover g-consent" data-tone="light" style={page} aria-busy={!data || undefined}>
      <Head t={t} />
      <div className="g-gate-top g-guest-top"><span className="g-brand">PhotoDeCaffeine</span><LangSwitch lang={lang} t={t} /></div>
      <div className="g-gate-body">
        {!data ? <span className="s-sr">{t.wait}</span> : saved ? (
          <Done saved={saved} data={data} lang={lang} t={t} onAnother={another} onChange={() => {
            setSaved(null);
            setRound((n) => n + 1);
            setParams({ k: saved.key }, { replace: true });
            window.scrollTo({ top: 0 });
          }} />
        ) : (
          <AnswerForm key={`${key}-${round}`} path={path} answerKey={key} data={data} parent={parent} lang={lang} t={t} onSaved={(s) => {
            setParent({ name: s.parentName, email: s.parentEmail });
            setSaved(s);
            window.scrollTo({ top: 0 });
          }} />
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

type Errors = { child?: string; answer?: string; photo?: string; parentName?: string; parentEmail?: string; declared?: string; form?: string };

function AnswerForm({ path, answerKey, data, parent, lang, t, onSaved }: {
  path: string; answerKey: string; data: Reply; parent: { name: string; email: string }; lang: Lang; t: PortalText; onSaved: (s: Saved) => void;
}) {
  const before = data.answer;
  const [child, setChild] = useState(before?.childName || "");
  const [answer, setAnswer] = useState<ConsentAnswer | "">(before?.answer || "");
  const [note, setNote] = useState(before?.note || "");
  const [parentName, setParentName] = useState(before?.parentName || parent.name);
  const [parentEmail, setParentEmail] = useState(before?.parentEmail || parent.email);
  const [declared, setDeclared] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [reading, setReading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const childInput = useRef<HTMLInputElement>(null);
  const answerField = useRef<HTMLFieldSetElement>(null);
  const photoField = useRef<HTMLDivElement>(null);
  const parentInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const declaredInput = useRef<HTMLInputElement>(null);

  const restricted = answer === "no_social" || answer === "no_photo";
  const shownPhoto = preview || before?.photoUrl || "";
  const statements = data.statements[lang.language === "en" ? "en" : "nl"];
  // In the language on screen right now, and the day it is in the Netherlands.
  const when = data.shootDate
    ? new Date(data.shootDate).toLocaleDateString(lang.language === "en" ? "en-GB" : "nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" })
    : "";

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(file?: File) {
    if (!file) return;
    setReading(true);
    const small = await smallJpeg(file);
    setReading(false);
    if (!small) return setErrors((e) => ({ ...e, photo: t.consentPhotoUnreadable }));
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
    setErrors((e) => ({ ...e, photo: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: Errors = {
      child: child.trim() ? undefined : t.consentChildRequired,
      answer: answer ? undefined : t.consentAnswerRequired,
      // A refusal must always go through, also from someone who has no photo at hand.
      photo: restricted && !shownPhoto && !note.trim() ? t.consentNeedPhoto : undefined,
      parentName: parentName.trim() ? undefined : t.nameRequired,
      parentEmail: EMAIL.test(parentEmail.trim()) ? undefined : t.emailInvalid,
      declared: declared ? undefined : t.consentDeclareRequired,
    };
    setErrors(found);
    if (found.child) return childInput.current?.focus();
    if (found.answer) return answerField.current?.querySelector("input")?.focus();
    if (found.photo) return photoField.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (found.parentName) return parentInput.current?.focus();
    if (found.parentEmail) return emailInput.current?.focus();
    if (found.declared) return declaredInput.current?.focus();

    const form = new FormData();
    if (answerKey) form.append("key", answerKey);
    form.append("childName", child.trim());
    form.append("answer", answer);
    form.append("note", restricted ? note.trim() : "");
    form.append("parentName", parentName.trim());
    form.append("parentEmail", parentEmail.trim());
    form.append("declared", "yes");
    form.append("language", lang.language === "en" ? "en" : "nl");
    if (restricted && photo) form.append("photo", photo, "foto.jpg");

    setSending(true);
    try {
      onSaved(await api<Saved>(path, { method: "POST", form, anonymous: true }));
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {data.title && <p className="g-kicker">{data.title}</p>}
      <h1 className="g-title">{before ? t.consentEditTitle : t.consentTitle}</h1>
      <p className="g-intro">{before ? t.consentEditIntro : t.consentIntro(data.title, when)}</p>

      <form className="g-gate-form" onSubmit={submit} noValidate>
        <div className="g-field">
          <label htmlFor="c-child">{t.consentChildName}</label>
          <input ref={childInput} id="c-child" name="child" autoComplete="off" autoCapitalize="words" maxLength={120} value={child}
            onChange={(e) => setChild(e.target.value)} aria-invalid={errors.child ? true : undefined} aria-describedby={errors.child ? "c-child-error" : undefined} />
          {errors.child && <span id="c-child-error" className="g-gate-error" role="alert">{errors.child}</span>}
        </div>

        <fieldset ref={answerField} className="g-choices" aria-describedby={errors.answer ? "c-answer-error" : undefined}>
          <legend>{t.consentQuestion}</legend>
          {ANSWERS.map((a) => (
            <label key={a} className="g-choice">
              <input type="radio" name="answer" value={a} checked={answer === a} onChange={() => { setAnswer(a); setErrors((e) => ({ ...e, answer: undefined })); }} />
              <span><b>{statements[a].title}</b><span>{statements[a].body}</span></span>
            </label>
          ))}
          {errors.answer && <span id="c-answer-error" className="g-gate-error" role="alert">{errors.answer}</span>}
        </fieldset>

        {restricted && (
          <div ref={photoField} className="g-consent-photo">
            <div className="g-consent-photo-row">
              {shownPhoto && <img src={shownPhoto} alt={t.consentPhotoAlt} />}
              <div className="g-consent-photo-text">
                <b>{t.consentPhoto}</b>
                <p>{t.consentPhotoWhy}</p>
                <button type="button" className="g-btn" disabled={reading} onClick={() => fileInput.current?.click()}>
                  <Camera />{reading ? t.wait : shownPhoto ? t.consentPhotoOther : t.consentPhotoPick}
                </button>
                <input ref={fileInput} type="file" accept="image/*" hidden aria-label={t.consentPhoto} onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </div>
            <div className="g-field">
              <label htmlFor="c-note">{t.consentNote}</label>
              <input id="c-note" name="note" autoComplete="off" maxLength={300} value={note} onChange={(e) => { setNote(e.target.value); setErrors((x) => ({ ...x, photo: undefined })); }} />
              {!shownPhoto && <span className="g-field-hint">{t.consentNoteHint}</span>}
            </div>
            {errors.photo && <span className="g-gate-error" role="alert">{errors.photo}</span>}
          </div>
        )}

        <div className="g-field">
          <label htmlFor="c-parent">{t.consentParentName}</label>
          <input ref={parentInput} id="c-parent" name="name" autoComplete="name" maxLength={120} value={parentName}
            onChange={(e) => setParentName(e.target.value)} aria-invalid={errors.parentName ? true : undefined} aria-describedby={errors.parentName ? "c-parent-error" : undefined} />
          {errors.parentName && <span id="c-parent-error" className="g-gate-error" role="alert">{errors.parentName}</span>}
        </div>
        <div className="g-field">
          <label htmlFor="c-email">{t.consentParentEmail}</label>
          <input ref={emailInput} id="c-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)} aria-invalid={errors.parentEmail ? true : undefined} aria-describedby={errors.parentEmail ? "c-email-error" : "c-email-hint"} />
          {errors.parentEmail
            ? <span id="c-email-error" className="g-gate-error" role="alert">{errors.parentEmail}</span>
            : <span id="c-email-hint" className="g-field-hint">{t.consentParentEmailHint}</span>}
        </div>

        <label className="g-check">
          <input ref={declaredInput} type="checkbox" checked={declared} onChange={(e) => { setDeclared(e.target.checked); setErrors((x) => ({ ...x, declared: undefined })); }}
            aria-invalid={errors.declared ? true : undefined} aria-describedby={errors.declared ? "c-declared-error" : undefined} />
          <span>{t.consentDeclare}</span>
        </label>
        {errors.declared && <span id="c-declared-error" className="g-gate-error" role="alert">{errors.declared}</span>}

        {errors.form && <p className="g-gate-error" role="alert">{errors.form}</p>}
        <button type="submit" className="g-btn primary g-gate-go" disabled={sending || reading} aria-busy={sending || undefined}>
          {sending ? t.wait : before ? t.consentSaveChange : t.consentSend}<ArrowRight />
        </button>
      </form>
      <p className="g-small">{t.consentPrivacy} <a href="/privacybeleid" target="_blank" rel="noreferrer">{t.privacyPolicy}</a>.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Saved
// ---------------------------------------------------------------------------

function Done({ saved, data, lang, t, onAnother, onChange }: {
  saved: Saved; data: Reply; lang: Lang; t: PortalText; onAnother: () => void; onChange: () => void;
}) {
  const statement = data.statements[lang.language === "en" ? "en" : "nl"][saved.answer];
  return (
    <div className="g-consent-done">
      <span className="g-consent-tick" aria-hidden="true"><Check /></span>
      <h1 className="g-title">{t.consentThanks(saved.parentName.split(" ")[0])}</h1>
      <p className="g-intro" role="status">{t.consentSaved(saved.childName)}</p>
      <div className="g-consent-choice"><b>{statement.title}</b><span>{statement.body}</span></div>
      <p className="g-small">{saved.mailed ? t.consentMailed(saved.parentEmail) : t.consentNotMailed}</p>
      <div className="g-consent-actions">
        <button type="button" className="g-btn primary" onClick={onAnother}>{t.consentAnother}<ArrowRight /></button>
        <button type="button" className="g-btn" onClick={onChange}>{t.consentChange}</button>
      </div>
    </div>
  );
}

/** Consent forms stay out of search engines, like the rest of the pages behind a token. */
function Head({ t }: { t: PortalText }) {
  const font = styleOf({ gallerySettings: {} }).font;
  return (
    <Helmet>
      <title>{`${t.consentTitle} · PhotoDeCaffeine`}</title>
      <meta name="robots" content="noindex, nofollow" />
      {font && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${font}&display=swap`} />}
    </Helmet>
  );
}
