import { keepPreviousData, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useSearchParams } from "react-router";
import { toast, Toaster } from "sonner";
import { isAdmin } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError, errorMessage } from "../api";
import { StudioFonts } from "../fonts";
import { fmt } from "../format";
import { ClientGallery } from "../gallery/ClientGallery";
import { saveUrl, saveZip } from "../gallery/download";
import { shareLink } from "../gallery/share";
import { ShareDialog } from "../gallery/ShareDialog";
import { accentOf, onAccent, styleOf } from "../gallery/styles";
import { usePortalLanguage, useT, type PortalText } from "../portal/i18n";
import { queryClient } from "../queries";
import "../studio.css";
import type { GalleryImage, GalleryProject } from "../types";
import { cx } from "../ui";
import { ConsentStep, type ConsentFormData } from "./ConsentForm";
import { LangSwitch } from "./LangSwitch";

// The page a group link opens, /galerij/<token>. No login: a name and an
// e-mail address at the door get a key that this browser keeps, and with it
// the gallery, the hearts and (when the studio allows it) the downloads.

type Gate = { title: string; subtitle: string; shootDate: string; style: string; accentColor: string; cover: string; photos: number; videos: number };
type Inside = {
  guest: { name: string } | null;
  /** A studio admin looking without being counted. */
  preview: boolean;
  project: GalleryProject & { id: string };
  /** Hearts per photo, from everyone. */
  hearts: Record<string, number>;
  /** This guest's own hearts. */
  mine: string[];
  guests: number;
  /** At a shoot with a consent form: this guest's own children and the photos they pointed them out on. */
  kids: { names: string[]; tags: Record<string, string[]>; consentUrl: string } | null;
};
/** The studio asks for consent first, and this guest has not given it yet. */
type OwesConsent = { consent: ConsentFormData & { token: string }; guest: { name: string; email: string } };
type Reply = { gate: Gate } | OwesConsent | Inside;
type Lang = ReturnType<typeof usePortalLanguage>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const stored = (token: string) => `pdc-galerij:${token}`;

function readKey(token: string): string {
  try {
    return localStorage.getItem(stored(token)) || "";
  } catch {
    return "";
  }
}

function writeKey(token: string, key: string) {
  try {
    if (key) localStorage.setItem(stored(token), key);
    else localStorage.removeItem(stored(token));
  } catch {
    // Storage blocked: the key lasts for this visit only.
  }
}

export function GuestGalleryPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="studio">
        <StudioFonts />
        <GuestGallery />
        <Toaster position="bottom-center" richColors toastOptions={{ style: { fontFamily: "var(--ui)" } }} />
      </div>
    </QueryClientProvider>
  );
}

function GuestGallery() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const t = useT();
  const lang = usePortalLanguage();
  const { user } = useAuth();
  const [key, setKeyState] = useState(() => readKey(token));
  const [preview, setPreview] = useState(false);
  const setKey = (next: string) => {
    writeKey(token, next);
    setKeyState(next);
  };
  const queryKey = ["share", token, preview ? "preview" : key];
  const path = `/share/${encodeURIComponent(token)}`;
  const query = useQuery({
    queryKey,
    // An admin's preview goes with their session; guests never send one.
    queryFn: ({ signal }) => preview
      ? api<Reply>(`${path}?preview=1`, { signal })
      : api<Reply>(key ? `${path}?key=${key}` : path, { signal, anonymous: true }),
    retry: false,
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  // A key the server no longer knows (the studio removed this guest) is dropped.
  useEffect(() => {
    if (data && "gate" in data && key && !query.isPlaceholderData) setKey("");
  }, [data, key, query.isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (query.isError) {
    const gone = query.error instanceof ApiError && query.error.status === 404;
    return <Closed t={t} lang={lang} error={gone ? null : query.error} retry={() => query.refetch()} />;
  }
  if (!data) return <main className="g-page" aria-busy="true"><span className="s-sr">{t.wait}</span></main>;
  if ("consent" in data) return <ConsentStep form={data.consent} guest={data.guest} lang={lang} t={t} onContinue={() => query.refetch()} />;
  if ("gate" in data) {
    // While the gallery loads after the door, the door stays up with its button busy.
    return <Door path={path} gate={data.gate} busy={query.isPlaceholderData} onEnter={setKey} admin={isAdmin(user)} onPreview={() => setPreview(true)} t={t} lang={lang} />;
  }
  return (
    <Gallery path={path} token={token} data={data} guestKey={key} queryKey={queryKey} onLeave={() => setKey("")}
      openId={params.get("foto") || undefined} t={t} lang={lang} />
  );
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

function Door({ path, gate, busy, onEnter, admin, onPreview, t, lang }: {
  path: string; gate: Gate; busy: boolean; onEnter: (key: string) => void; admin: boolean; onPreview: () => void; t: PortalText; lang: Lang;
}) {
  const look = { gallerySettings: { style: gate.style, accentColor: gate.accentColor } };
  const style = styleOf(look);
  const accent = accentOf(look);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const kicker = gate.subtitle || (gate.shootDate ? fmt(gate.shootDate, "d MMMM yyyy") : "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = { name: name.trim() ? undefined : t.nameRequired, email: EMAIL.test(email.trim()) ? undefined : t.emailInvalid };
    setErrors(found);
    if (found.name) return nameInput.current?.focus();
    if (found.email) return emailInput.current?.focus();
    setSending(true);
    try {
      const r = await api<{ key: string }>(`${path}/guest`, { method: "POST", body: { name: name.trim(), email: email.trim() }, anonymous: true });
      onEnter(r.key);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={cx("g-page g-gate", !gate.cover && "no-cover")} data-style={style.id} data-tone={style.dark ? "dark" : "light"}
      style={{ "--g-accent": accent, "--g-on-accent": onAccent(accent) } as CSSProperties}>
      <Head title={gate.title} font={style.font} dark={style.dark} />
      <div className="g-gate-top g-guest-top"><span className="g-brand">PhotoDeCaffeine</span><LangSwitch lang={lang} t={t} /></div>
      {gate.cover && <figure className="g-gate-cover"><img src={gate.cover} alt="" /></figure>}
      <div className="g-gate-body">
        {kicker && <p className="g-kicker"><span>{kicker}</span></p>}
        <h1 className="g-title">{gate.title}</h1>
        <p className="g-intro">{t.gateIntro(gate.photos, gate.videos)}</p>
        <form className="g-gate-form" onSubmit={submit} noValidate>
          <div className="g-field">
            <label htmlFor="g-guest-name">{t.name}</label>
            <input ref={nameInput} id="g-guest-name" name="name" autoComplete="name" maxLength={120} value={name}
              onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "g-guest-name-error" : undefined} />
            {errors.name && <span id="g-guest-name-error" className="g-gate-error" role="alert">{errors.name}</span>}
          </div>
          <div className="g-field">
            <label htmlFor="g-guest-email">{t.email}</label>
            <input ref={emailInput} id="g-guest-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "g-guest-email-error" : undefined} />
            {errors.email && <span id="g-guest-email-error" className="g-gate-error" role="alert">{errors.email}</span>}
          </div>
          {errors.form && <p className="g-gate-error" role="alert">{errors.form}</p>}
          <button type="submit" className="g-btn primary g-gate-go" disabled={sending || busy} aria-busy={sending || busy || undefined}>
            {sending || busy ? t.wait : t.gateEnter}<ArrowRight />
          </button>
        </form>
        <p className="g-small">{t.gatePrivacy} <a href="/privacybeleid" target="_blank" rel="noreferrer">{t.privacyPolicy}</a>.</p>
        {admin && (
          <div className="g-gate-admin"><span>{t.gateAdmin}</span><button type="button" onClick={onPreview}>{t.gatePreview}</button></div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inside
// ---------------------------------------------------------------------------

function Gallery({ path, token, data, guestKey, queryKey, onLeave, openId, t, lang }: {
  path: string; token: string; data: Inside; guestKey: string; queryKey: unknown[]; onLeave: () => void; openId?: string; t: PortalText; lang: Lang;
}) {
  const qc = useQueryClient();
  const [sharing, setSharing] = useState(false);
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);
  const [addedKids, setAddedKids] = useState<string[]>([]);
  const [activeKid, setActiveKid] = useState("");
  const kidNames = [...new Set([...(data.kids?.names || []), ...addedKids])];
  const kid = kidNames.includes(activeKid) ? activeKid : kidNames[0] || "";
  const p = data.project;
  const title = p.gallerySettings.title || p.title;
  const url = `${window.location.origin}/galerij/${token}`;
  const favs = new Set(data.mine);
  const send = <R,>(route: string, body: Record<string, unknown>) => api<R>(`${path}/${route}`, { method: "POST", body: { key: guestKey, ...body }, anonymous: true });

  function failed(err: unknown) {
    // This guest is no longer known: back to the door.
    if (err instanceof ApiError && err.status === 401) return onLeave();
    toast.error(errorMessage(err));
  }

  async function toggle(img: GalleryImage) {
    const on = !favs.has(img.id);
    const before = qc.getQueryData(queryKey);
    const patch = (fn: (d: Inside) => Partial<Inside>) => qc.setQueryData(queryKey, (d: Inside | undefined) => d && { ...d, ...fn(d) });
    patch((d) => ({
      mine: on ? [...d.mine, img.id] : d.mine.filter((x) => x !== img.id),
      hearts: { ...d.hearts, [img.id]: Math.max(0, (d.hearts[img.id] || 0) + (on ? 1 : -1)) },
    }));
    try {
      const r = await send<{ count: number }>("heart", { imageId: img.id, on });
      patch((d) => ({ hearts: { ...d.hearts, [img.id]: r.count } }));
    } catch (err) {
      qc.setQueryData(queryKey, before);
      failed(err);
    }
  }

  async function tagKid(img: GalleryImage) {
    const on = !data.kids?.tags[img.id]?.includes(kid);
    const before = qc.getQueryData(queryKey);
    qc.setQueryData(queryKey, (d: Inside | undefined) => {
      if (!d?.kids) return d;
      const current = d.kids.tags[img.id] || [];
      return { ...d, kids: { ...d.kids, tags: { ...d.kids.tags, [img.id]: on ? [...current, kid] : current.filter((x) => x !== kid) } } };
    });
    try {
      await send("child", { imageId: img.id, child: kid, on });
    } catch (err) {
      qc.setQueryData(queryKey, before);
      failed(err);
    }
  }

  async function downloadOne(img: GalleryImage) {
    try {
      const r = await send<{ url: string; fileName: string }>("download", { imageId: img.id });
      saveUrl(r.url, r.fileName);
    } catch (err) {
      failed(err);
    }
  }

  async function downloadAll(all: GalleryImage[]) {
    const list = all.filter((g) => g.download !== false);
    if (!list.length) return;
    setZip({ done: 0, total: list.length });
    try {
      await saveZip(list, title, { watermarked: p.downloads === "watermark", onProgress: (done) => setZip({ done, total: list.length }) });
      send("downloaded", { count: list.length }).catch(() => {});
      toast.success(t.downloadStarted);
    } catch (err) {
      failed(err);
    } finally {
      setZip(null);
    }
  }

  async function sharePhoto(img: GalleryImage) {
    if ((await shareLink({ title, text: t.shareText(title), url: `${url}?foto=${img.id}` })) === "copied") toast.success(t.linkCopied);
  }

  const share = () => setSharing(true);
  return (
    <>
      <Head title={title} />
      <ClientGallery
        project={p}
        favs={favs}
        counts={data.hearts}
        kids={data.kids && !data.preview ? {
          names: kidNames, active: kid, tags: data.kids.tags, consentUrl: data.kids.consentUrl, onChoose: setActiveKid, onTag: tagKid,
          onAdd: (name) => { setAddedKids((old) => [...old, name]); setActiveKid(name); },
        } : undefined}
        guest={{ name: data.guest?.name || "", guests: data.guests }}
        actions={data.preview ? { share, sharePhoto } : { toggle, downloadOne, downloadAll, zip, share, sharePhoto }}
        back={
          <>
            <div className="g-guest-top"><span className="g-brand">PhotoDeCaffeine</span><LangSwitch lang={lang} t={t} /></div>
            {data.preview && <p className="g-preview-note">{t.previewBanner}</p>}
          </>
        }
        after={<Invite t={t} />}
        openId={openId}
      />
      <ShareDialog open={sharing} onClose={() => setSharing(false)} url={url} title={title} guests={data.guests} forGuest />
    </>
  );
}

/** Under the photos: the studio, for anyone who wants a shoot of their own. */
function Invite({ t }: { t: PortalText }) {
  return (
    <section className="g-cta" aria-labelledby="g-cta-title">
      <div className="g-cta-inner">
        <div>
          <p className="g-kicker">PhotoDeCaffeine</p>
          <h2 id="g-cta-title" className="g-title">{t.ctaTitle}</h2>
          <p className="g-intro">{t.ctaBody}</p>
        </div>
        <a className="g-btn primary" href="/#contact">{t.ctaButton}<ArrowRight /></a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bits
// ---------------------------------------------------------------------------

function Closed({ t, lang, error, retry }: { t: PortalText; lang: Lang; error: unknown; retry: () => void }) {
  return (
    <main className="g-page g-closed">
      <Head title="PhotoDeCaffeine" font={styleOf({ gallerySettings: {} }).font} />
      <div className="g-empty">
        <LangSwitch lang={lang} t={t} />
        <p className="g-title">{error ? errorMessage(error) : t.linkClosed}</p>
        {error ? <button type="button" className="g-btn" onClick={retry}>{t.tryAgain}</button> : <p>{t.linkClosedHint}</p>}
        <a className="g-btn" href="/">{t.toSite}</a>
      </div>
    </main>
  );
}

/** Group galleries stay out of search engines, like the rest of the portal. */
function Head({ title, font, dark }: { title: string; font?: string; dark?: boolean }) {
  return (
    <Helmet>
      <title>{`${title} · PhotoDeCaffeine`}</title>
      <meta name="robots" content="noindex, nofollow" />
      {font && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${font}&display=swap`} />}
      {dark && <meta name="theme-color" content="#0f0e0d" />}
    </Helmet>
  );
}
