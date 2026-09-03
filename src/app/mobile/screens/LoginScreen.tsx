import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { MobileThemeProvider } from "../useMobileTheme";
import { applyAppMeta, isIOS, isStandalone } from "../pwa";
import { c, GUTTER, radius, safeBottom, safeTop, spring } from "../theme";
import { haptic } from "../haptics";
import { Press } from "../ui/base";
import { Button } from "../ui/form";
import "../mobile.css";

/**
 * Sign-in for the app.
 *
 * Lives outside the shell's auth gate (it is what the gate redirects *to*), so
 * it brings its own theme provider and stylesheet rather than inheriting them.
 */
export function LoginScreen() {
  return (
    <MobileThemeProvider>
      <LoginInner />
    </MobileThemeProvider>
  );
}

function LoginInner() {
  const { signIn, session, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { from?: string; denied?: boolean };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(state.denied ? "Dit account heeft geen adminrechten." : "");

  const shake = useAnimationControls();

  useEffect(() => {
    const restore = applyAppMeta();
    return restore;
  }, []);

  // Already signed in as an admin — skip straight through.
  if (!loading && session && user?.user_metadata?.role === "admin") {
    return <Navigate to={state.from && state.from !== "/app/login" ? state.from : "/app"} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setBusy(false);
      setError(
        signInError.toLowerCase().includes("invalid")
          ? "E-mailadres of wachtwoord klopt niet."
          : signInError
      );
      haptic("error");
      shake.start({
        x: [0, -9, 8, -6, 4, 0],
        transition: { duration: 0.42 },
      });
      return;
    }

    haptic("success");
    navigate(state.from && state.from !== "/app/login" ? state.from : "/app", { replace: true });
  }

  return (
    <div className="m-app" style={{ justifyContent: "space-between" }}>
      <div
        className="m-scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${safeTop(28)} ${GUTTER}px ${safeBottom(24)}`,
        }}
      >
        <motion.div animate={shake} style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -18 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 30 }}
          >
            <Mark />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: 0.12 }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: c.fg4,
                marginBottom: 10,
              }}
            >
              Photo De Caffeine
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                color: c.fg,
              }}
            >
              Welkom terug.
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: c.fg3, lineHeight: 1.5 }}>
              Log in om je admin panel te openen.
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 30 }}
          >
            <IconField icon={<Mail size={16} />}>
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="E-mailadres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </IconField>

            <IconField
              icon={<Lock size={16} />}
              trailing={
                <Press
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  style={{
                    width: 44,
                    height: 44,
                    display: "grid",
                    placeItems: "center",
                    color: c.fg4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Press>
              }
            >
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </IconField>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{
                  fontSize: 12.5,
                  color: c.danger,
                  padding: "10px 13px",
                  borderRadius: radius.md,
                  backgroundColor: `color-mix(in srgb, ${c.danger} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${c.danger} 26%, transparent)`,
                  lineHeight: 1.45,
                }}
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              full
              busy={busy}
              icon={busy ? undefined : <ArrowRight size={17} />}
              style={{ marginTop: 6, flexDirection: "row-reverse" }}
            >
              {busy ? "Inloggen…" : "Inloggen"}
            </Button>
          </motion.form>
        </motion.div>
      </div>

      {isIOS() && !isStandalone() && <InstallHint />}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "none",
  border: "none",
  outline: "none",
  padding: "16px 0",
  fontSize: 16,
  fontWeight: 500,
  color: c.fg,
};

function IconField({
  icon,
  trailing,
  children,
}: {
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="m-glass"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        paddingLeft: 15,
        paddingRight: trailing ? 4 : 15,
        borderRadius: radius.md,
      }}
    >
      <span style={{ color: c.fg4, display: "grid", flexShrink: 0 }}>{icon}</span>
      {children}
      {trailing}
    </div>
  );
}

/** Tells iOS users how to install, because Safari offers no install prompt. */
function InstallHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, ...spring.smooth }}
      style={{
        flexShrink: 0,
        margin: `0 ${GUTTER}px`,
        marginBottom: safeBottom(14),
        padding: "13px 15px",
        borderRadius: radius.md,
        backgroundColor: c.surface,
        border: `1px solid ${c.line}`,
        fontSize: 12,
        color: c.fg3,
        lineHeight: 1.55,
      }}
    >
      <strong style={{ color: c.fg2, fontWeight: 700 }}>Tip —</strong> tik op{" "}
      <ShareGlyph /> Deel en kies{" "}
      <span style={{ color: c.fg2, fontWeight: 600 }}>Zet op beginscherm</span> om PDC als app te
      openen.
    </motion.div>
  );
}

function ShareGlyph() {
  return (
    <svg
      width="11"
      height="13"
      viewBox="0 0 12 14"
      fill="none"
      style={{ display: "inline", verticalAlign: "-1px", margin: "0 1px" }}
      aria-hidden
    >
      <path
        d="M6 1v8M6 1L3.4 3.6M6 1l2.6 2.6"
        stroke={c.copper}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.2 6.4H1.4v6.2h9.2V6.4h-.8"
        stroke={c.copper}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Mark() {
  return (
    <svg width="46" height="46" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="pdc-login-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--m-copper-hi)" />
          <stop offset="60%" stopColor="var(--m-copper)" />
          <stop offset="100%" stopColor="var(--m-copper-lo)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#pdc-login-ring)" strokeWidth="6" />
      <path
        d="M50 26 L70.8 38 L70.8 62 L50 74 L29.2 62 L29.2 38 Z"
        fill="none"
        stroke="var(--m-copper)"
        strokeWidth="2.5"
        opacity="0.75"
      />
    </svg>
  );
}
