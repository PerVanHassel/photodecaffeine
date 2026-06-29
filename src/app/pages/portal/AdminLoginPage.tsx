import image_PDClogo2_0_12_1 from '@/imports/PDClogo2.0-12-1.png';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

type Tab = "signin" | "setup";

export function AdminLoginPage() {
  const { signIn, session, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("signin");

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [signinError, setSigninError] = useState("");
  const [signinLoading, setSigninLoading] = useState(false);

  // Setup
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [showSetupPass, setShowSetupPass] = useState(false);
  const [showSetupSecret, setShowSetupSecret] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    if (session && user?.user_metadata?.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [session, user, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigninError("");
    setSigninLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      console.log("Sign in error:", error);
      setSigninError(error);
      setSigninLoading(false);
    } else {
      console.log("Sign in successful, checking redirect...");
      // auth state will trigger useEffect redirect
      setSigninLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setSetupError("");
    setSetupLoading(true);
    try {
      await portalFetch("/admin/signup", {
        method: "POST",
        body: JSON.stringify({
          email: setupEmail,
          password: setupPassword,
          name: setupName,
          adminSecret: setupSecret,
        }),
      });
      setSetupSuccess(true);
      setSetupLoading(false);
      // Auto sign in
      const { error } = await signIn(setupEmail, setupPassword);
      if (error) {
        setSetupError(error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      setSetupError(msg);
      setSetupLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,251,224,0.03)",
    border: "1px solid rgba(255,251,224,0.08)",
    color: "#fffbe0",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 300,
    padding: "13px 16px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,251,224,0.3)",
    fontSize: "9px",
    fontWeight: 500,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: "8px",
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#060301",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "40px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <img
            src={image_PDClogo2_0_12_1}
            alt="Photo De Caffeine"
            style={{ height: "160px", width: "auto", display: "block", objectFit: "contain", margin: "0 auto 10px" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <ShieldCheck size={10} color="rgba(200,144,90,0.5)" />
            <span style={{
              color: "rgba(255,251,224,0.2)",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
            }}>
              Admin Access
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          marginBottom: "32px",
        }}>
          {([["signin", "Sign In"], ["setup", "Create Admin"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSigninError(""); setSetupError(""); }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: tab === t ? "1px solid #c8905a" : "1px solid transparent",
                color: tab === t ? "#fffbe0" : "rgba(255,251,224,0.25)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                padding: "11px 0",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s ease",
                marginBottom: "-1px",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sign In */}
        {tab === "signin" && (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@photodecaffeine.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: "48px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,251,224,0.25)", padding: 0, display: "flex",
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {signinError && (
              <div>
                <p style={{ color: "#e07060", fontSize: "12px", margin: 0, marginBottom: "12px" }}>{signinError}</p>
                <p style={{ color: "rgba(255,251,224,0.3)", fontSize: "11px", margin: 0 }}>
                  Having authorization issues?{" "}
                  <a
                    href="/admin/diagnostic"
                    style={{ color: "#c8905a", textDecoration: "underline", fontWeight: 600 }}
                  >
                    Run diagnostic
                  </a>
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={signinLoading}
              style={{
                backgroundColor: signinLoading ? "rgba(255,251,224,0.06)" : "#fffbe0",
                color: signinLoading ? "rgba(255,251,224,0.25)" : "#060301",
                border: "none",
                padding: "14px 24px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: signinLoading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                width: "100%",
                transition: "all 0.2s ease",
                marginTop: "4px",
              }}
            >
              {signinLoading ? "Signing In…" : "Sign In"}
            </button>
          </form>
        )}

        {/* Setup — create admin account */}
        {tab === "setup" && !setupSuccess && (
          <form onSubmit={handleSetup} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>Your Name</label>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Majd Kazan"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                placeholder="admin@photodecaffeine.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showSetupPass ? "text" : "password"}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  style={{ ...inputStyle, paddingRight: "48px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
                <button type="button" onClick={() => setShowSetupPass(!showSetupPass)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.25)", padding: 0, display: "flex" }}>
                  {showSetupPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Admin Secret Key</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showSetupSecret ? "text" : "password"}
                  value={setupSecret}
                  onChange={(e) => setSetupSecret(e.target.value)}
                  placeholder="From your ADMIN_SECRET env var"
                  required
                  style={{ ...inputStyle, paddingRight: "48px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
                <button type="button" onClick={() => setShowSetupSecret(!showSetupSecret)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,251,224,0.25)", padding: 0, display: "flex" }}>
                  {showSetupSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p style={{ color: "rgba(255,251,224,0.18)", fontSize: "10px", margin: "8px 0 0", lineHeight: 1.5 }}>
                Enter the ADMIN_SECRET you configured in your environment settings.
              </p>
            </div>
            {setupError && (
              <p style={{ color: "#e07060", fontSize: "12px", margin: 0 }}>{setupError}</p>
            )}
            <button
              type="submit"
              disabled={setupLoading}
              style={{
                backgroundColor: setupLoading ? "rgba(255,251,224,0.06)" : "#c8905a",
                color: setupLoading ? "rgba(255,251,224,0.25)" : "#060301",
                border: "none",
                padding: "14px 24px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: setupLoading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                width: "100%",
                transition: "all 0.2s ease",
              }}
            >
              {setupLoading ? "Creating Admin…" : "Create Admin Account"}
            </button>
          </form>
        )}

        {tab === "setup" && setupSuccess && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(120,190,140,0.8)", fontSize: "13px", lineHeight: 1.7 }}>
            Admin account created. Signing you in…
          </div>
        )}

        {/* Quick Fix Banner */}
        <div
          style={{
            backgroundColor: "rgba(200,144,90,0.08)",
            border: "1px solid rgba(200,144,90,0.2)",
            padding: "16px",
            marginTop: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#c8905a", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
            "Unauthorized" Errors?
          </div>
          <a
            href="/admin/self-fix"
            style={{
              color: "#c8905a",
              fontSize: "11px",
              fontWeight: 600,
              textDecoration: "underline",
              display: "inline-block",
            }}
          >
            → Fix Je Admin Role (Werkt Gegarandeerd)
          </a>
        </div>

        {/* Back to site */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a
            href="/"
            style={{ color: "rgba(255,251,224,0.15)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.4)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.15)")}
          >
            ← Back to PDC Studio
          </a>
        </div>
      </div>
    </div>
  );
}
