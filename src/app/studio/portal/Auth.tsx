import { PdcLogo } from "../../components/PdcLogo";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { isAdmin, supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { api, errorMessage } from "../api";
import { StudioFonts } from "../fonts";
import "../studio.css";
import { Button, Segmented, TextField } from "../ui";
import { texts, usePortalLanguage, type PortalText } from "./i18n";

type Mode = "signin" | "activate" | "forgot";

function Frame({ tag, children, t, showLanguage }: { tag: string; children: React.ReactNode; t: PortalText; showLanguage?: boolean }) {
  const { language, choose } = usePortalLanguage();
  return (
    <div className="studio" style={{ display: "grid", placeItems: "center", padding: "40px 16px", background: "var(--sunken)" }}>
      <StudioFonts />
      <div className="s-card" style={{ width: "min(420px, 100%)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20, boxShadow: "var(--shadow)" }}>
        <div className="s-brand" style={{ alignItems: "center", alignSelf: "center" }}>
          <PdcLogo className="s-logo" label="PDC Productions" width={190} height={36} style={{ width: 190 }} />
          <span className="s-brand-tag">{tag}</span>
        </div>
        {children}
      </div>
      <div className="s-row" style={{ marginTop: 20 }}>
        <Link to="/" className="s-small s-muted">{t.backToSite}</Link>
        {showLanguage && (
          <div className="s-seg" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={language === "nl"} onClick={() => choose("nl")}>NL</button>
            <button type="button" aria-pressed={language === "en"} onClick={() => choose("en")}>EN</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete, error, t }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: string | null; t: PortalText }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <TextField label={label} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} error={error} style={{ paddingRight: 42 }} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t.hidePassword : t.showPassword}
        style={{ position: "absolute", right: 10, top: 31, border: 0, background: "none", color: "var(--faint)", padding: 4 }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** Sign-in for clients (/portal/login) and for the studio (/admin/login). */
export function LoginPage({ admin = false }: { admin?: boolean }) {
  const { signIn, signOut, session, user } = useAuth();
  const { language } = usePortalLanguage();
  const t = texts[admin || language !== "en" ? "nl" : "en"];
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invitedEmail = params.get("invite")?.trim() || "";
  const inviteToken = params.get("token")?.trim() || "";
  const [mode, setMode] = useState<Mode>(invitedEmail && !admin ? "activate" : "signin");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (isAdmin(user)) navigate(params.get("next")?.startsWith("/admin") ? params.get("next")! : "/admin", { replace: true });
    else if (!admin) navigate(params.get("next")?.startsWith("/portal") ? params.get("next")! : "/portal/dashboard", { replace: true });
  }, [session, user, admin, navigate, params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const r = await signIn(email.trim(), password);
        if (r.error) setError(r.error === "Invalid login credentials" ? t.wrongLogin : r.error);
      } else if (mode === "activate") {
        await api("/portal/signup", { method: "POST", anonymous: true, body: { email: email.trim(), password, name: name.trim(), company: company.trim(), token: inviteToken } });
        const r = await signIn(email.trim(), password);
        if (r.error) setError(r.error);
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/portal/reset` });
        if (err) setError(err.message);
        else setSent(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (session && !isAdmin(user) && admin) {
    return (
      <Frame tag="Studio" t={t}>
        <p className="s-small" style={{ textAlign: "center" }}>Je bent ingelogd als {user?.email}, maar dat account heeft geen toegang tot de studio.</p>
        <Button variant="primary" onClick={() => signOut()}>Uitloggen</Button>
      </Frame>
    );
  }

  return (
    <Frame tag={admin ? "Studio" : t.portal} t={t} showLanguage={!admin}>
      {!admin && (
        <Segmented<Mode> label="Kies" value={mode} onChange={(m) => { setMode(m); setError(null); setSent(false); }} options={[
          { value: "signin", label: t.signIn },
          { value: "activate", label: t.activate },
        ]} />
      )}
      {sent ? (
        <div className="s-stack" style={{ alignItems: "center", textAlign: "center" }}>
          <MailCheck size={28} style={{ color: "var(--ok)" }} />
          <b>{t.checkMail}</b>
          <p className="s-small s-muted">{t.checkMailBody(email)}</p>
          <Button onClick={() => { setMode("signin"); setSent(false); }}>{t.backToSignIn}</Button>
        </div>
      ) : (
        <form className="s-stack" onSubmit={submit}>
          {mode === "activate" && (
            invitedEmail && inviteToken
              ? <p className="s-small s-muted">{t.activateWelcome(invitedEmail)}</p>
              : <p className="s-small s-muted">{t.activateNeedsLink}</p>
          )}
          {mode === "forgot" && <p className="s-small s-muted">{t.forgotIntro}</p>}
          {mode === "activate" && (
            <div className="s-form-grid">
              <TextField label={t.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label={t.companyOptional} autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          )}
          <TextField label={t.email} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={mode === "activate" && !!invitedEmail} required />
          {mode !== "forgot" && (
            <PasswordField t={t} label={mode === "activate" ? t.choosePassword : t.password} autoComplete={mode === "activate" ? "new-password" : "current-password"} value={password} onChange={setPassword} />
          )}
          {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
          <Button type="submit" variant="primary" loading={busy} disabled={!email || (mode !== "forgot" && !password) || (mode === "activate" && (!inviteToken || !name.trim()))}>
            {mode === "signin" ? t.signIn : mode === "activate" ? t.activate : t.sendLink}
          </Button>
          {mode === "signin" && !admin && <button type="button" className="s-btn ghost sm" onClick={() => { setMode("forgot"); setError(null); }}>{t.forgot}</button>}
          {mode === "forgot" && <button type="button" className="s-btn ghost sm" onClick={() => setMode("signin")}>{t.backToSignIn}</button>}
        </form>
      )}
    </Frame>
  );
}

/** Where the reset email lands: Supabase has signed the person in; they pick a new password. */
export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { language } = usePortalLanguage();
  const t = texts[language === "en" ? "en" : "nl"];
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError(t.passwordTooShort);
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    navigate("/portal/dashboard", { replace: true });
  }

  return (
    <Frame tag={t.portal} t={t} showLanguage>
      {loading ? <p className="s-small s-muted">{t.wait}</p> : !session ? (
        <div className="s-stack">
          <p className="s-small">{t.resetExpired}</p>
          <Link className="s-btn" to="/portal/login">{t.resetAgain}</Link>
        </div>
      ) : (
        <form className="s-stack" onSubmit={submit}>
          <b>{t.resetTitle}</b>
          <PasswordField t={t} label={t.newPassword} autoComplete="new-password" value={pw} onChange={setPw} error={error} />
          <Button type="submit" variant="primary" loading={busy}>{t.resetSave}</Button>
        </form>
      )}
    </Frame>
  );
}
