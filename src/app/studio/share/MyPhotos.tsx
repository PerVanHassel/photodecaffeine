import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, ExternalLink, LogOut, Receipt } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { toast, Toaster } from "sonner";
import { isAdmin, supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { api, errorMessage, get, post, put } from "../api";
import { StudioFonts } from "../fonts";
import { euro, fmtDate } from "../format";
import { savePhoto, saveZip, type SaveFile } from "../gallery/download";
import "../gallery/gallery.css";
import { accentOf, fontHref, onAccent, styleOf } from "../gallery/styles";
import { usePortalLanguage, useT, type PortalText } from "../portal/i18n";
import { queryClient } from "../queries";
import "../studio.css";
import type { GalleryImage } from "../types";
import { AccountSignIn } from "./Account";
import { LangSwitch } from "./LangSwitch";

// Mijn foto's (/mijn-fotos): everything someone bought, or got first with
// voorrang, per gallery, to download again while downloading is open. They
// come in with a code by mail (routes/account.ts in the edge function).

type Gallery = {
  id: string; title: string; subtitle: string; style: string; accentColor: string; link: string; open: boolean; until: string;
  photos: GalleryImage[];
  orders: { id: string; number: string; amount: number; count: number; paidAt: string; invoiceLink: string }[];
};
type Account = { email: string; name: string; buyerOnly: boolean };

export function MyPhotosPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="studio">
        <StudioFonts />
        <Mine />
        <Toaster position="bottom-center" richColors toastOptions={{ style: { fontFamily: "var(--ui)" } }} />
      </div>
    </QueryClientProvider>
  );
}

function Mine() {
  const t = useT();
  const lang = usePortalLanguage();
  const language = lang.language === "en" ? "en" : "nl";
  const { user, loading } = useAuth();
  const signedIn = !!user && !isAdmin(user);
  const look = { gallerySettings: { style: "atelier" } };
  const style = styleOf(look);
  const accent = accentOf(look);

  return (
    <main className="g-page g-mine" data-style={style.id} data-tone="light" style={{ "--g-accent": accent, "--g-on-accent": onAccent(accent) } as CSSProperties}>
      <Helmet>
        <title>{`${t.mineTitle} · PhotoDeCaffeine`}</title>
        <meta name="robots" content="noindex, nofollow" />
        {style.font && <link rel="stylesheet" href={fontHref(style.font)} />}
      </Helmet>
      <div className="g-guest-top"><a className="g-brand" href="/">PhotoDeCaffeine</a><LangSwitch lang={lang} t={t} /></div>
      {loading ? <p className="g-mine-wait" aria-busy="true">{t.wait}</p>
        : user && isAdmin(user) ? (
          <section className="g-mine-door">
            <h1 className="g-title">{t.mineTitle}</h1>
            <p className="g-intro">Je bent ingelogd als de studio. Log uit, of open deze pagina in een privévenster om hem als koper te zien.</p>
            <a className="g-btn" href="/admin">Naar de studio</a>
          </section>
        ) : !signedIn ? (
          <section className="g-mine-door">
            <h1 className="g-title">{t.mineTitle}</h1>
            <p className="g-intro">{t.mineSignInIntro} {t.accountIntro}</p>
            <AccountSignIn language={language} t={t} onDone={() => queryClient.invalidateQueries({ queryKey: ["account"] })} />
          </section>
        ) : <Signed t={t} />}
    </main>
  );
}

function Signed({ t }: { t: PortalText }) {
  const me = useQuery({ queryKey: ["account", "me"], queryFn: ({ signal }) => get<{ account: Account }>("/account/me", signal).then((r) => r.account) });
  const photos = useQuery({ queryKey: ["account", "photos"], queryFn: ({ signal }) => get<{ galleries: Gallery[] }>("/account/photos", signal).then((r) => r.galleries) });
  const name = me.data?.name || "";
  return (
    <>
      <header className="g-mine-head">
        <p className="g-kicker">{me.data?.email}</p>
        <h1 className="g-title">{t.accountWelcome(name.split(" ")[0])}</h1>
        <p className="g-intro">{t.mineIntro}</p>
      </header>
      {photos.isError ? <p className="g-mine-wait">{errorMessage(photos.error)}</p>
        : !photos.data ? <p className="g-mine-wait" aria-busy="true">{t.wait}</p>
        : photos.data.length === 0 ? (
          <div className="g-empty"><p className="g-title">{t.mineEmpty}</p><p>{t.mineEmptyHint}</p></div>
        ) : photos.data.map((g) => <GallerySection key={g.id} gallery={g} t={t} />)}
      {me.data && <AccountSection account={me.data} t={t} />}
    </>
  );
}

function GallerySection({ gallery: g, t }: { gallery: Gallery; t: PortalText }) {
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);
  const style = styleOf({ gallerySettings: { style: g.style } });
  const accent = accentOf({ gallerySettings: { style: g.style, accentColor: g.accentColor } });

  async function links(ids: string[]) {
    return (await post<{ files: SaveFile[] }>("/account/downloads", { projectId: g.id, imageIds: ids })).files;
  }
  async function one(img: GalleryImage) {
    try {
      const [f] = await links([img.id]);
      if (f) await savePhoto(f.url, f.fileName, { ready: t.toPhotosReady, save: t.toPhotosSave });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  async function all() {
    setZip({ done: 0, total: g.photos.length });
    try {
      const files = await links(g.photos.map((x) => x.id));
      const how = await saveZip(files, g.title, { onProgress: (done) => setZip({ done, total: files.length }), text: { ready: t.toPhotosReady, save: t.toPhotosSave } });
      if (how === "zip") toast.success(t.downloadStarted);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setZip(null);
    }
  }

  return (
    <section className="g-mine-gallery" aria-labelledby={`mine-${g.id}`} style={{ "--g-accent": accent, "--g-on-accent": onAccent(accent) } as CSSProperties}>
      <Helmet>{style.font && <link rel="stylesheet" href={fontHref(style.font)} />}</Helmet>
      <div className="g-mine-gallery-head">
        <div>
          {g.subtitle && <p className="g-kicker">{g.subtitle}</p>}
          <h2 id={`mine-${g.id}`} className="g-title">{g.title}</h2>
          <p className="g-small">{g.open ? (g.until ? t.mineUntil(fmtDate(g.until)) : "") : t.mineClosed(fmtDate(g.until))}</p>
        </div>
        <div className="g-prio-actions">
          {g.link && <a className="g-btn" href={new URL(g.link).pathname}><ExternalLink />{t.mineToGallery}</a>}
          {g.open && (
            <button type="button" className="g-btn primary" disabled={!!zip} onClick={all}>
              <Download />{zip ? t.zipping(zip.done, zip.total) : t.mineDownloadAll(g.photos.length)}
            </button>
          )}
        </div>
      </div>
      <ul className="g-mine-grid">
        {g.photos.map((img) => (
          <li key={img.id}>
            <img src={img.url} alt={img.fileName} loading="lazy" decoding="async" />
            {g.open && (
              <button type="button" className="g-dl" onClick={() => one(img)} aria-label={`${t.download}: ${img.fileName}`}><Download aria-hidden="true" /><span>{t.download}</span></button>
            )}
          </li>
        ))}
      </ul>
      {g.orders.length > 0 && (
        <ul className="g-mine-receipts">
          {g.orders.map((o) => (
            <li key={o.id}>
              <Receipt aria-hidden="true" />
              <a href={o.invoiceLink} target="_blank" rel="noreferrer">{t.mineReceipt(o.number)}</a>
              <span>{t.saleCount(o.count)} · {euro(o.amount)} · {fmtDate(o.paidAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AccountSection({ account, t }: { account: Account; t: PortalText }) {
  const qc = useQueryClient();
  const [name, setName] = useState(account.name);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => setName(account.name), [account.name]);

  async function saveName() {
    setBusy("name");
    try {
      await put("/account/me", { name: name.trim() });
      await qc.invalidateQueries({ queryKey: ["account"] });
      toast.success(t.mineSaved);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy("");
    }
  }
  async function savePassword() {
    if (password.length < 8) return toast.error(t.minePasswordShort);
    setBusy("password");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy("");
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success(t.minePasswordSaved);
  }
  async function remove() {
    if (!window.confirm(t.mineDeleteConfirm)) return;
    setBusy("delete");
    try {
      await api("/account", { method: "DELETE" });
      await supabase.auth.signOut();
      toast.success(t.mineDeleted);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy("");
    }
  }

  return (
    <section className="g-mine-account" aria-labelledby="mine-account">
      <h2 id="mine-account" className="g-title">{t.mineAccount}</h2>
      <div className="g-mine-account-grid">
        <form className="g-account-form" onSubmit={(e) => { e.preventDefault(); if (name.trim() && name.trim() !== account.name) saveName(); }}>
          <div className="g-field">
            <label htmlFor="mine-name">{t.accountName}</label>
            <input id="mine-name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="g-btn" disabled={busy === "name" || !name.trim() || name.trim() === account.name}>{t.mineSaveName}</button>
        </form>
        <form className="g-account-form" onSubmit={(e) => { e.preventDefault(); savePassword(); }}>
          <div className="g-field">
            <label htmlFor="mine-password">{t.minePasswordNew}</label>
            <input id="mine-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="g-field-hint">{t.minePasswordHint}</span>
          </div>
          <button type="submit" className="g-btn" disabled={busy === "password" || !password}>{t.minePassword}</button>
        </form>
      </div>
      {!account.buyerOnly && <p className="g-small">{t.minePortal} <a href="/portal/dashboard">{t.minePortalLink}<ArrowRight aria-hidden="true" /></a></p>}
      <div className="g-mine-account-foot">
        <button type="button" className="g-btn" onClick={() => supabase.auth.signOut()}><LogOut />{t.accountSignOut}</button>
        {account.buyerOnly && (
          <span className="g-mine-delete">
            <button type="button" className="g-link danger" disabled={busy === "delete"} onClick={remove}>{t.mineDelete}</button>
            <span className="g-small">{t.mineDeleteHint}</span>
          </span>
        )}
      </div>
    </section>
  );
}
