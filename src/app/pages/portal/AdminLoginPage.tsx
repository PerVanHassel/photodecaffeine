import image_PDClogo2_0_12_1 from '@/imports/PDClogo2.0-12-1.png';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../../lib/supabase";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

// Admin accounts are created by an admin on the Team page; there is no
// self-service sign-up here.
export function AdminLoginPage() {
  const { signIn, signOut, session, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && isAdmin(user)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [session, user, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn(email, password);
    if (res.error) setError(res.error);
    setLoading(false);
  }

  const signedInAsClient = !!session && !isAdmin(user);

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
              Admin
            </span>
          </div>
        </div>

        {signedInAsClient ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
            <p style={{ color: "rgba(255,251,224,0.6)", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              Je bent ingelogd als {user?.email}, maar dat account heeft geen admintoegang.
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              style={{
                backgroundColor: "#fffbe0", color: "#060301", border: "none", padding: "14px 24px",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Uitloggen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle} htmlFor="admin-email">E-mail</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="admin-password">Wachtwoord</label>
              <div style={{ position: "relative" }}>
                <input
                  id="admin-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: "48px" }}
                />
                <button
                  type="button"
                  aria-label={showPass ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
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
            {error && <p role="alert" style={{ color: "#e07060", fontSize: "12px", margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? "rgba(255,251,224,0.06)" : "#fffbe0",
                color: loading ? "rgba(255,251,224,0.25)" : "#060301",
                border: "none",
                padding: "14px 24px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                width: "100%",
                marginTop: "4px",
              }}
            >
              {loading ? "Inloggen…" : "Inloggen"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <a
            href="/"
            style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}
          >
            ← Terug naar de site
          </a>
        </div>
      </div>
    </div>
  );
}
