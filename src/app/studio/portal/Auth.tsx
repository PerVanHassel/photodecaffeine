import logo from "@/imports/pdc-logo-dark.png";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { isAdmin, supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { api, errorMessage } from "../api";
import { StudioFonts } from "../fonts";
import "../studio.css";
import { Button, Segmented, TextField } from "../ui";

type Mode = "signin" | "activate" | "forgot";

function Frame({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="studio" style={{ display: "grid", placeItems: "center", padding: "40px 16px", background: "var(--sunken)" }}>
      <StudioFonts />
      <div className="s-card" style={{ width: "min(420px, 100%)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20, boxShadow: "var(--shadow)" }}>
        <div className="s-brand" style={{ alignItems: "center", alignSelf: "center" }}>
          <img src={logo} alt="PDC Productions" style={{ width: 190 }} />
          <span className="s-brand-tag">{tag}</span>
        </div>
        {children}
      </div>
      <Link to="/" className="s-small s-muted" style={{ marginTop: 20 }}>Terug naar photodecaffeine.com</Link>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete, error }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: string | null }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <TextField label={label} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} error={error} style={{ paddingRight: 42 }} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
        style={{ position: "absolute", right: 10, top: 31, border: 0, background: "none", color: "var(--faint)", padding: 4 }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** Sign-in for clients (/portal/login) and for the studio (/admin/login). */
export function LoginPage({ admin = false }: { admin?: boolean }) {
  const { signIn, signOut, session, user } = useAuth();
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
        if (r.error) setError(r.error === "Invalid login credentials" ? "E-mailadres of wachtwoord klopt niet." : r.error);
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
      <Frame tag="Studio">
        <p className="s-small" style={{ textAlign: "center" }}>Je bent ingelogd als {user?.email}, maar dat account heeft geen toegang tot de studio.</p>
        <Button variant="primary" onClick={() => signOut()}>Uitloggen</Button>
      </Frame>
    );
  }

  return (
    <Frame tag={admin ? "Studio" : "Klantportaal"}>
      {!admin && (
        <Segmented<Mode> label="Kies" value={mode} onChange={(m) => { setMode(m); setError(null); setSent(false); }} options={[
          { value: "signin", label: "Inloggen" },
          { value: "activate", label: "Account activeren" },
        ]} />
      )}
      {sent ? (
        <div className="s-stack" style={{ alignItems: "center", textAlign: "center" }}>
          <MailCheck size={28} style={{ color: "var(--ok)" }} />
          <b>Kijk in je mail</b>
          <p className="s-small s-muted">Als {email} bij ons bekend is, staat er een link klaar om een nieuw wachtwoord te kiezen.</p>
          <Button onClick={() => { setMode("signin"); setSent(false); }}>Terug naar inloggen</Button>
        </div>
      ) : (
        <form className="s-stack" onSubmit={submit}>
          {mode === "activate" && (
            invitedEmail && inviteToken
              ? <p className="s-small s-muted">Welkom! Kies een wachtwoord voor <b>{invitedEmail}</b>, dan staat je portaal klaar.</p>
              : <p className="s-small s-muted">Je opent een account met de link uit de uitnodigingsmail. Geen mail gehad? Vraag ons om een nieuwe.</p>
          )}
          {mode === "forgot" && <p className="s-small s-muted">Vul je e-mailadres in. Je krijgt een link om een nieuw wachtwoord te kiezen.</p>}
          {mode === "activate" && (
            <div className="s-form-grid">
              <TextField label="Naam" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Bedrijf (optioneel)" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          )}
          <TextField label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={mode === "activate" && !!invitedEmail} required />
          {mode !== "forgot" && (
            <PasswordField label={mode === "activate" ? "Kies een wachtwoord" : "Wachtwoord"} autoComplete={mode === "activate" ? "new-password" : "current-password"} value={password} onChange={setPassword} />
          )}
          {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
          <Button type="submit" variant="primary" loading={busy} disabled={!email || (mode !== "forgot" && !password) || (mode === "activate" && (!inviteToken || !name.trim()))}>
            {mode === "signin" ? "Inloggen" : mode === "activate" ? "Account activeren" : "Stuur link"}
          </Button>
          {mode === "signin" && !admin && <button type="button" className="s-btn ghost sm" onClick={() => { setMode("forgot"); setError(null); }}>Wachtwoord vergeten?</button>}
          {mode === "forgot" && <button type="button" className="s-btn ghost sm" onClick={() => setMode("signin")}>Terug naar inloggen</button>}
        </form>
      )}
    </Frame>
  );
}

/** Where the reset email lands: Supabase has signed the person in; they pick a new password. */
export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("Kies minstens 8 tekens.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    navigate("/portal/dashboard", { replace: true });
  }

  return (
    <Frame tag="Klantportaal">
      {loading ? <p className="s-small s-muted">Even geduld…</p> : !session ? (
        <div className="s-stack">
          <p className="s-small">Deze link is verlopen of al gebruikt.</p>
          <Link className="s-btn" to="/portal/login">Vraag een nieuwe aan</Link>
        </div>
      ) : (
        <form className="s-stack" onSubmit={submit}>
          <b>Kies een nieuw wachtwoord</b>
          <PasswordField label="Nieuw wachtwoord" autoComplete="new-password" value={pw} onChange={setPw} error={error} />
          <Button type="submit" variant="primary" loading={busy}>Opslaan en inloggen</Button>
        </form>
      )}
    </Frame>
  );
}
