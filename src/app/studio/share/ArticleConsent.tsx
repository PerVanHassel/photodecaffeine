import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { useState, type CSSProperties, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useSearchParams } from "react-router";
import { api, ApiError, errorMessage } from "../api";
import { StudioFonts } from "../fonts";
import "../gallery/gallery.css";
import { accentOf, fontHref, onAccent, styleOf } from "../gallery/styles";
import { usePortalLanguage, useT } from "../portal/i18n";
import { queryClient } from "../queries";
import "../studio.css";
import { LangSwitch } from "./LangSwitch";

// The page the portfolio link opens, /werk-toestemming/<token>: whoever is on a
// piece says where it may be shown, or that it may not. No login. A saved answer
// gets a key of its own, in the mail, to change or withdraw it later (?k=).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Place = "website" | "social" | "print" | "ads";
type NameUse = "none" | "first" | "full";
const PLACES: Place[] = ["website", "social", "print", "ads"];
const NAME_USES: NameUse[] = ["none", "first", "full"];

type Data = {
  title: string;
  photos: string[];
  statements: { nl: string; en: string };
  answer: { answer: "given" | "refused"; places: Place[]; nameUse: NameUse; limits: string; name: string; email: string; guardianOf: string } | null;
};
type Saved = { key: string; answer: "given" | "refused"; mailed: boolean };

const TEXT = {
  nl: {
    pageTitle: "Toestemming voor portfolio",
    title: "Mag dit in ons portfolio?",
    change: "Je keuze wijzigen",
    intro: (t: string) => `We willen "${t}" graag laten zien. Dat doen we alleen als jij het goed vindt. Het is vrijwillig en verandert niets aan je opdracht of prijs.`,
    places: "Waar mag het?",
    placeLabels: {
      website: ["Portfolio op de website van PDC", "photodecaffeine.com"],
      social: ["Social media van PDC", "Gewone berichten op Instagram, TikTok en LinkedIn"],
      print: ["Gedrukt portfolio van PDC", "Bijvoorbeeld een map of flyer"],
      ads: ["Betaalde advertenties van PDC", "Reclame die we betalen, online of op papier"],
    } as Record<Place, [string, string]>,
    nameQ: "Mag je naam erbij?",
    nameLabels: { none: "Nee, geen naam", first: "Alleen mijn voornaam", full: "Mijn volledige naam" } as Record<NameUse, string>,
    limits: "Iets anders dat we moeten weten? (mag leeg)",
    limitsHint: "Bijvoorbeeld een foto die niet mag, of een einddatum.",
    name: "Je naam",
    email: "Je e-mailadres",
    emailHint: "Hier sturen we een bevestiging naartoe, met een link om je keuze te wijzigen.",
    guardian: "Vul je dit in als ouder of voogd? Voor wie? (mag leeg)",
    guardianHint: "Is iemand jonger dan 16, dan vult een ouder of voogd dit in.",
    yes: "Toestemming geven",
    no: "Liever niet",
    needPlace: "Kies waar het mag, of kies Liever niet.",
    needDeclare: "Vink eerst deze tekst aan.",
    needName: "Vul je naam in.",
    needEmail: "Vul een geldig e-mailadres in.",
    privacy: "Meer over wat we met je gegevens doen, staat in onze",
    privacyLink: "privacyverklaring",
    thanksYes: "Dank je wel!",
    thanksNo: "Helder, dank je wel.",
    savedYes: "We hebben je toestemming opgeslagen.",
    savedNo: "We laten dit werk niet zien. Staat het al online, dan halen we het weg.",
    mailed: (m: string) => `Je krijgt een bevestiging op ${m}. Daarin staat een link om je keuze later te wijzigen.`,
    notMailed: "Je keuze is opgeslagen, maar de bevestiging kon niet verstuurd worden. Mail ons als je hem wilt wijzigen.",
    changeBtn: "Mijn keuze wijzigen",
    closed: "Deze link werkt niet (meer)",
    closedHint: "Vraag PhotoDeCaffeine om een nieuwe.",
    retry: "Opnieuw proberen",
    wait: "Even geduld…",
  },
  en: {
    pageTitle: "Consent for our portfolio",
    title: "May this go in our portfolio?",
    change: "Change your choice",
    intro: (t: string) => `We would like to show "${t}". We only do that if you are fine with it. It is voluntary and changes nothing about your booking or price.`,
    places: "Where may it go?",
    placeLabels: {
      website: ["Portfolio on PDC's website", "photodecaffeine.com"],
      social: ["PDC's social media", "Regular posts on Instagram, TikTok and LinkedIn"],
      print: ["PDC's printed portfolio", "For example a folder or flyer"],
      ads: ["PDC's paid advertising", "Ads we pay for, online or on paper"],
    } as Record<Place, [string, string]>,
    nameQ: "May your name go with it?",
    nameLabels: { none: "No name", first: "My first name only", full: "My full name" } as Record<NameUse, string>,
    limits: "Anything else we should know? (optional)",
    limitsHint: "For example a photo that may not be used, or an end date.",
    name: "Your name",
    email: "Your email address",
    emailHint: "We send a confirmation here, with a link to change your choice.",
    guardian: "Filling this in as a parent or guardian? For whom? (optional)",
    guardianHint: "If someone is under 16, a parent or guardian fills this in.",
    yes: "Give consent",
    no: "Rather not",
    needPlace: "Choose where it may go, or choose Rather not.",
    needDeclare: "Please tick this text first.",
    needName: "Please fill in your name.",
    needEmail: "Please fill in a valid email address.",
    privacy: "More about what we do with your details is in our",
    privacyLink: "privacy statement (in Dutch)",
    thanksYes: "Thank you!",
    thanksNo: "Clear, thank you.",
    savedYes: "We have saved your consent.",
    savedNo: "We will not show this work. If it is already online, we take it down.",
    mailed: (m: string) => `You will get a confirmation at ${m}, with a link to change your choice later.`,
    notMailed: "Your choice is saved, but the confirmation could not be sent. Email us if you want to change it.",
    changeBtn: "Change my choice",
    closed: "This link no longer works",
    closedHint: "Ask PhotoDeCaffeine for a new one.",
    retry: "Try again",
    wait: "One moment…",
  },
};

export function ArticleConsentPage() {
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
  const x = TEXT[lang.language === "en" ? "en" : "nl"];
  const path = `/article-consent/${encodeURIComponent(token)}`;
  const query = useQuery({
    queryKey: ["article-consent-form", token, key],
    queryFn: ({ signal }) => api<Data>(key ? `${path}?key=${encodeURIComponent(key)}` : path, { signal, anonymous: true }),
    retry: false,
    // A half-filled form stays as it is when someone comes back to the tab.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [saved, setSaved] = useState<(Saved & { email: string }) | null>(null);
  const [round, setRound] = useState(0);
  const data = query.data;
  const accent = accentOf({ gallerySettings: {} });
  const page = { "--g-accent": accent, "--g-on-accent": onAccent(accent) } as CSSProperties;
  const font = styleOf({ gallerySettings: {} }).font;

  return (
    <main className="g-page g-gate no-cover g-consent" data-tone="light" style={page} aria-busy={!data && !query.isError ? true : undefined}>
      <Helmet>
        <title>{`${x.pageTitle} · PhotoDeCaffeine`}</title>
        <meta name="robots" content="noindex, nofollow" />
        {font && <link rel="stylesheet" href={fontHref(font)} />}
      </Helmet>
      <div className="g-gate-top g-guest-top"><span className="g-brand">PhotoDeCaffeine</span><LangSwitch lang={lang} t={t} /></div>
      <div className="g-gate-body">
        {query.isError ? (
          query.error instanceof ApiError && query.error.status === 404 ? (
            <>
              <p className="g-title">{x.closed}</p>
              <p className="g-intro">{x.closedHint}</p>
            </>
          ) : (
            <>
              <p className="g-title">{errorMessage(query.error)}</p>
              <button type="button" className="g-btn" onClick={() => query.refetch()}>{x.retry}</button>
            </>
          )
        ) : !data ? <span className="s-sr">{x.wait}</span> : saved ? (
          <div className="g-consent-done">
            <span className="g-consent-tick" aria-hidden="true"><Check /></span>
            <h1 className="g-title">{saved.answer === "given" ? x.thanksYes : x.thanksNo}</h1>
            <p className="g-intro" role="status">{saved.answer === "given" ? x.savedYes : x.savedNo}</p>
            <p className="g-small">{saved.mailed ? x.mailed(saved.email) : x.notMailed}</p>
            <div className="g-consent-actions">
              <button type="button" className="g-btn" onClick={() => {
                setSaved(null);
                setRound((n) => n + 1);
                setParams({ k: saved.key }, { replace: true });
                window.scrollTo({ top: 0 });
              }}>{x.changeBtn}</button>
            </div>
          </div>
        ) : (
          <Form key={`${key}-${round}`} path={path} answerKey={key} data={data} language={lang.language === "en" ? "en" : "nl"} onSaved={(s) => {
            setSaved(s);
            window.scrollTo({ top: 0 });
          }} />
        )}
      </div>
    </main>
  );
}

function Form({ path, answerKey, data, language, onSaved }: {
  path: string; answerKey: string; data: Data; language: "nl" | "en"; onSaved: (s: Saved & { email: string }) => void;
}) {
  const x = TEXT[language];
  const before = data.answer;
  const [places, setPlaces] = useState<Place[]>(before?.places || []);
  const [nameUse, setNameUse] = useState<NameUse>(before?.nameUse || "none");
  const [limits, setLimits] = useState(before?.limits || "");
  const [name, setName] = useState(before?.name || "");
  const [email, setEmail] = useState(before?.email || "");
  const [guardianOf, setGuardianOf] = useState(before?.guardianOf || "");
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState<"given" | "refused" | null>(null);

  async function send(answer: "given" | "refused") {
    if (!name.trim()) return setError(x.needName);
    if (!EMAIL.test(email.trim())) return setError(x.needEmail);
    if (answer === "given" && places.length === 0) return setError(x.needPlace);
    if (answer === "given" && !declared) return setError(x.needDeclare);
    setError("");
    setSending(answer);
    try {
      const res = await api<Saved>(path, {
        method: "POST",
        anonymous: true,
        body: { key: answerKey || undefined, answer, places, nameUse, limits: limits.trim(), name: name.trim(), email: email.trim(), guardianOf: guardianOf.trim(), declared, language },
      });
      onSaved({ ...res, email: email.trim() });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(null);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send("given");
  };

  return (
    <>
      <p className="g-kicker">{data.title}</p>
      <h1 className="g-title">{before ? x.change : x.title}</h1>
      <p className="g-intro">{x.intro(data.title)}</p>
      {data.photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 6, margin: "4px 0 20px" }}>
          {data.photos.map((src) => <img key={src} src={src} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />)}
        </div>
      )}
      <form className="g-gate-form" onSubmit={submit} noValidate>
        <fieldset className="g-choices">
          <legend>{x.places}</legend>
          {PLACES.map((p) => (
            <label key={p} className="g-choice">
              <input type="checkbox" checked={places.includes(p)} onChange={(e) => setPlaces((now) => (e.target.checked ? [...now, p] : now.filter((v) => v !== p)))} />
              <span><b>{x.placeLabels[p][0]}</b><span>{x.placeLabels[p][1]}</span></span>
            </label>
          ))}
        </fieldset>
        <fieldset className="g-choices">
          <legend>{x.nameQ}</legend>
          {NAME_USES.map((n) => (
            <label key={n} className="g-choice">
              <input type="radio" name="name-use" value={n} checked={nameUse === n} onChange={() => setNameUse(n)} />
              <span><b>{x.nameLabels[n]}</b></span>
            </label>
          ))}
        </fieldset>
        <div className="g-field">
          <label htmlFor="ac-limits">{x.limits}</label>
          <input id="ac-limits" name="limits" autoComplete="off" maxLength={500} value={limits} onChange={(e) => setLimits(e.target.value)} aria-describedby="ac-limits-hint" />
          <span id="ac-limits-hint" className="g-field-hint">{x.limitsHint}</span>
        </div>
        <div className="g-field">
          <label htmlFor="ac-name">{x.name}</label>
          <input id="ac-name" name="name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="g-field">
          <label htmlFor="ac-email">{x.email}</label>
          <input id="ac-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="ac-email-hint" />
          <span id="ac-email-hint" className="g-field-hint">{x.emailHint}</span>
        </div>
        <div className="g-field">
          <label htmlFor="ac-guardian">{x.guardian}</label>
          <input id="ac-guardian" name="guardian" autoComplete="off" maxLength={120} value={guardianOf} onChange={(e) => setGuardianOf(e.target.value)} aria-describedby="ac-guardian-hint" />
          <span id="ac-guardian-hint" className="g-field-hint">{x.guardianHint}</span>
        </div>
        <label className="g-check">
          <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
          <span>{data.statements[language]}</span>
        </label>
        {error && <p className="g-gate-error" role="alert">{error}</p>}
        <button type="submit" className="g-btn primary g-gate-go" disabled={!!sending} aria-busy={sending === "given" || undefined}>
          {sending === "given" ? x.wait : x.yes}<ArrowRight />
        </button>
        <button type="button" className="g-btn" disabled={!!sending} aria-busy={sending === "refused" || undefined} onClick={() => send("refused")}>
          {sending === "refused" ? x.wait : x.no}
        </button>
      </form>
      <p className="g-small">{x.privacy} <a href="/privacybeleid" target="_blank" rel="noreferrer">{x.privacyLink}</a>.</p>
    </>
  );
}
