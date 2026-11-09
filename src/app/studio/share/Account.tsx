import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabase";
import { api, errorMessage } from "../api";
import type { PortalText } from "../portal/i18n";

// Signing in to buy photos and to download them again later (routes/account.ts
// in the edge function). A code by mail is the way in: it proves the address,
// and needs no password. Someone who set a password can use that instead.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The mock on the dev server has no real tokens: it stands in a session of its own. */
async function startSession(tokenHash: string, email: string, name: string) {
  if (import.meta.env.DEV && localStorage.getItem("pdc-mock") === "1") {
    const { mockSignIn } = await import("../dev/mock");
    mockSignIn(email, name);
    window.location.reload();
    return;
  }
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) throw new Error(error.message);
}

export function AccountSignIn({ email: startEmail = "", name = "", language, t, onDone, compact }: {
  email?: string;
  name?: string;
  language: "nl" | "en";
  t: PortalText;
  /** Signed in: the session is there. */
  onDone: () => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState(startEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const clean = email.trim().toLowerCase();

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    if (!EMAIL.test(clean)) return setError(t.emailInvalid);
    setBusy(true);
    setError("");
    try {
      await api("/account/code", { method: "POST", body: { email: clean, language }, anonymous: true });
      setMode("code");
      setCode("");
      requestAnimationFrame(() => codeInput.current?.focus());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: FormEvent) {
    e?.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) return setError(t.accountCodeInvalid);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ tokenHash: string }>("/account/verify", { method: "POST", body: { email: clean, code: digits, name }, anonymous: true });
      await startSession(r.tokenHash, clean, name);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function withPassword(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(clean)) return setError(t.emailInvalid);
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: clean, password });
    if (err) {
      setError(err.message === "Invalid login credentials" ? t.accountWrongLogin : err.message);
      setBusy(false);
      return;
    }
    onDone();
  }

  return (
    <div className={compact ? "g-account compact" : "g-account"}>
      {mode === "email" && (
        <form className="g-account-form" onSubmit={sendCode} noValidate>
          <div className="g-field">
            <label htmlFor="g-account-email">{t.accountEmail}</label>
            <input id="g-account-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254}
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} aria-invalid={error ? true : undefined} />
          </div>
          {error && <p className="g-gate-error" role="alert">{error}</p>}
          <button type="submit" className="g-btn primary" disabled={busy} aria-busy={busy || undefined}>{busy ? t.wait : t.accountSendCode}<ArrowRight /></button>
          <button type="button" className="g-link" onClick={() => { setMode("password"); setError(""); }}>{t.accountWithPassword}</button>
        </form>
      )}
      {mode === "code" && (
        <form className="g-account-form" onSubmit={verify} noValidate>
          <p className="g-account-sent"><MailCheck aria-hidden="true" />{t.accountCodeSent(clean)}</p>
          <div className="g-field">
            <label htmlFor="g-account-code">{t.accountCode}</label>
            <input ref={codeInput} id="g-account-code" className="g-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={7}
              value={code} onChange={(e) => { setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6)); setError(""); }} aria-invalid={error ? true : undefined}
              placeholder="000000" />
          </div>
          {error && <p className="g-gate-error" role="alert">{error}</p>}
          <button type="submit" className="g-btn primary" disabled={busy || code.length < 6} aria-busy={busy || undefined}>{busy ? t.wait : t.accountVerify}<ArrowRight /></button>
          <div className="g-account-links">
            <button type="button" className="g-link" disabled={busy} onClick={() => sendCode()}>{t.accountResend}</button>
            <button type="button" className="g-link" onClick={() => { setMode("email"); setError(""); }}><ArrowLeft aria-hidden="true" />{t.accountOtherEmail}</button>
          </div>
        </form>
      )}
      {mode === "password" && (
        <form className="g-account-form" onSubmit={withPassword} noValidate>
          <div className="g-field">
            <label htmlFor="g-account-email2">{t.accountEmail}</label>
            <input id="g-account-email2" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254}
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          </div>
          <div className="g-field">
            <label htmlFor="g-account-password">{t.accountPassword}</label>
            <input id="g-account-password" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
          </div>
          {error && <p className="g-gate-error" role="alert">{error}</p>}
          <button type="submit" className="g-btn primary" disabled={busy || !password} aria-busy={busy || undefined}>{busy ? t.wait : t.accountVerify}<ArrowRight /></button>
          <button type="button" className="g-link" onClick={() => { setMode("email"); setError(""); }}>{t.accountWithCode}</button>
        </form>
      )}
    </div>
  );
}
