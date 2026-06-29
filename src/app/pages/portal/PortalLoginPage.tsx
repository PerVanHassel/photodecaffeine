import image_PDClogo2_0_12_1 from '@/imports/PDClogo2.0-12-1.png'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Eye, EyeOff } from "lucide-react";

type Tab = "signin" | "signup";

export function PortalLoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("signin");

  // Sign in form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [signinError, setSigninError] = useState("");
  const [signinLoading, setSigninLoading] = useState(false);

  // Sign up form
  const [suName, setSuName] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [showSuPass, setShowSuPass] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    if (session) navigate("/portal/dashboard", { replace: true });
  }, [session, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigninError("");
    setSigninLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setSigninError(error);
      setSigninLoading(false);
    } else {
      navigate("/portal/dashboard");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    try {
      await portalFetch("/portal/signup", {
        method: "POST",
        body: JSON.stringify({
          email: suEmail,
          password: suPassword,
          name: suName,
          company: suCompany,
        }),
      });
      // Auto sign in after signup
      const { error } = await signIn(suEmail, suPassword);
      if (error) {
        setSignupError(error);
        setSignupLoading(false);
      } else {
        navigate("/portal/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      setSignupError(msg);
      setSignupLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,251,224,0.03)",
    border: "1px solid rgba(255,251,224,0.1)",
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
    color: "rgba(255,251,224,0.35)",
    fontSize: "9px",
    fontWeight: 500,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: "8px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080401",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <img
            src={image_PDClogo2_0_12_1}
            alt="Photo De Caffeine"
            style={{
              height: "160px",
              width: "auto",
              display: "block",
              objectFit: "contain",
              margin: "0 auto 8px",
            }}
          />
          <div
            style={{
              color: "rgba(255,251,224,0.25)",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
            }}
          >
            Photo De Caffeine — Client Portal
          </div>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,251,224,0.08)",
            marginBottom: "36px",
          }}
        >
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSigninError("");
                setSignupError("");
              }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: tab === t ? "1px solid #c8905a" : "1px solid transparent",
                color: tab === t ? "#fffbe0" : "rgba(255,251,224,0.3)",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                padding: "12px 0",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s ease",
                marginBottom: "-1px",
              }}
            >
              {t === "signin" ? "Sign In" : "Request Access"}
            </button>
          ))}
        </div>

        {/* Sign In Form */}
        {tab === "signin" && (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brand.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)")}
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
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,251,224,0.3)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {signinError && (
              <p style={{ color: "#e07060", fontSize: "12px", margin: 0, letterSpacing: "0.02em" }}>
                {signinError}
              </p>
            )}

            <button
              type="submit"
              disabled={signinLoading}
              style={{
                backgroundColor: signinLoading ? "rgba(255,251,224,0.1)" : "#fffbe0",
                color: signinLoading ? "rgba(255,251,224,0.3)" : "#080401",
                border: "none",
                padding: "14px 24px",
                fontSize: "11px",
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

        {/* Sign Up Form */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Your Name</label>
                <input
                  type="text"
                  value={suName}
                  onChange={(e) => setSuName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)")}
                />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input
                  type="text"
                  value={suCompany}
                  onChange={(e) => setSuCompany(e.target.value)}
                  placeholder="Brand Co."
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)")}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                placeholder="you@brand.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)")}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showSuPass ? "text" : "password"}
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  style={{ ...inputStyle, paddingRight: "48px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)")}
                />
                <button
                  type="button"
                  onClick={() => setShowSuPass(!showSuPass)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,251,224,0.3)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showSuPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {signupError && (
              <p style={{ color: "#e07060", fontSize: "12px", margin: 0, letterSpacing: "0.02em" }}>
                {signupError}
              </p>
            )}

            <button
              type="submit"
              disabled={signupLoading}
              style={{
                backgroundColor: signupLoading ? "rgba(255,251,224,0.1)" : "#fffbe0",
                color: signupLoading ? "rgba(255,251,224,0.3)" : "#080401",
                border: "none",
                padding: "14px 24px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: signupLoading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                width: "100%",
                transition: "all 0.2s ease",
                marginTop: "4px",
              }}
            >
              {signupLoading ? "Creating Account…" : "Request Access"}
            </button>
          </form>
        )}

        {/* Back to site */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <a
            href="/"
            style={{
              color: "rgba(255,251,224,0.2)",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.5)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.2)")}
          >
            ← Back to PDC Studio
          </a>
        </div>
      </div>
    </div>
  );
}