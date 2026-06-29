import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, AlertTriangle, CheckCircle, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { projectId } from "/utils/supabase/info";

export function AdminSelfFixPage() {
  const navigate = useNavigate();
  const { user, session, signIn } = useAuth();
  const [step, setStep] = useState<"login" | "fix" | "success">(user ? "fix" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      setStep("fix");
      setLoading(false);
    }
  }

  async function handleFix(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !user) {
      setError("Je bent niet ingelogd. Log eerst in.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/fix-my-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ adminSecret: secret }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fout bij updaten role");
      }

      setStep("success");
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fix gefaald");
      setLoading(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#060301",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
    padding: "40px 20px",
  };

  const boxStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "500px",
    backgroundColor: "rgba(255,251,224,0.02)",
    border: "1px solid rgba(255,251,224,0.08)",
    padding: "40px",
  };

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

  const buttonStyle: React.CSSProperties = {
    backgroundColor: loading ? "rgba(200,144,90,0.3)" : "#c8905a",
    color: "#060301",
    border: "none",
    padding: "14px 24px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "'Inter', sans-serif",
    width: "100%",
    transition: "all 0.2s ease",
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <ShieldCheck size={32} color="#c8905a" />
            <h1
              style={{
                color: "#fffbe0",
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              Admin Role Fix
            </h1>
          </div>
          <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "12px", margin: 0, lineHeight: 1.6 }}>
            Los "Unauthorized" errors op
          </p>
        </div>

        {/* Alert */}
        <div
          style={{
            backgroundColor: "rgba(200,144,90,0.1)",
            border: "1px solid rgba(200,144,90,0.3)",
            padding: "16px",
            marginBottom: "32px",
            display: "flex",
            gap: "12px",
          }}
        >
          <AlertTriangle size={20} color="#c8905a" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "11px", lineHeight: 1.6, color: "rgba(255,251,224,0.5)" }}>
            <strong style={{ color: "#c8905a", display: "block", marginBottom: "6px" }}>
              Alternatieve Methode
            </strong>
            Deze methode werkt door in te loggen met je credentials en dan je eigen role te updaten.
          </div>
        </div>

        {/* Step 1: Login */}
        {step === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                backgroundColor: "rgba(255,251,224,0.03)",
                marginBottom: "8px",
              }}
            >
              <LogIn size={24} color="rgba(255,251,224,0.3)" style={{ marginBottom: "8px" }} />
              <div style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px" }}>
                Stap 1: Log in met je admin credentials
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@photodecaffeine.com"
                required
                autoFocus
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
              />
            </div>

            <div>
              <label style={labelStyle}>Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
              />
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(224,112,96,0.1)",
                  border: "1px solid rgba(224,112,96,0.3)",
                  padding: "12px",
                  color: "#e07060",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Inloggen..." : "Inloggen"}
            </button>
          </form>
        )}

        {/* Step 2: Fix */}
        {step === "fix" && (
          <form onSubmit={handleFix} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                backgroundColor: "rgba(120,190,140,0.08)",
                border: "1px solid rgba(120,190,140,0.2)",
                padding: "16px",
                marginBottom: "8px",
              }}
            >
              <CheckCircle size={20} color="rgba(120,190,140,0.9)" style={{ marginBottom: "8px" }} />
              <div style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px", lineHeight: 1.6 }}>
                <strong style={{ color: "rgba(120,190,140,0.9)" }}>✓ Ingelogd als:</strong>
                <br />
                {user?.email}
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                padding: "16px",
                backgroundColor: "rgba(255,251,224,0.03)",
                marginBottom: "8px",
              }}
            >
              <ShieldCheck size={24} color="rgba(255,251,224,0.3)" style={{ marginBottom: "8px" }} />
              <div style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px" }}>
                Stap 2: Voer je ADMIN_SECRET in om je role te updaten
              </div>
            </div>

            <div>
              <label style={labelStyle}>Admin Secret</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Je ADMIN_SECRET van Supabase"
                required
                autoFocus
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
              />
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(224,112,96,0.1)",
                  border: "1px solid rgba(224,112,96,0.3)",
                  padding: "12px",
                  color: "#e07060",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Admin Role Toevoegen..." : "Maak Mij Admin"}
            </button>
          </form>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div>
            <div
              style={{
                backgroundColor: "rgba(120,190,140,0.08)",
                border: "1px solid rgba(120,190,140,0.2)",
                padding: "32px",
                textAlign: "center",
              }}
            >
              <CheckCircle size={48} color="rgba(120,190,140,0.9)" style={{ marginBottom: "16px" }} />
              <div
                style={{
                  color: "rgba(120,190,140,0.9)",
                  fontSize: "18px",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                ✓ Gelukt!
              </div>
              <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                Je account heeft nu admin rechten.
                <br />
                Log opnieuw in om de wijzigingen te activeren.
              </p>
              <button
                onClick={() => {
                  window.location.href = "/admin/login";
                }}
                style={buttonStyle}
              >
                Ga naar Login
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <a
            href="/admin/login"
            style={{
              color: "rgba(255,251,224,0.15)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← Terug naar Login
          </a>
        </div>
      </div>
    </div>
  );
}
