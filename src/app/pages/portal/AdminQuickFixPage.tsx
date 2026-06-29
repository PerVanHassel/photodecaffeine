import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, AlertTriangle, CheckCircle, Loader } from "lucide-react";
import { projectId } from "/utils/supabase/info";

export function AdminQuickFixPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"input" | "checking" | "needsFix" | "fixing" | "success">("input");
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);

  async function handleCheck() {
    if (!email || !secret) {
      setError("Voer zowel email als admin secret in");
      return;
    }

    setError("");
    setStep("checking");

    try {
      console.log("Checking user:", email);
      console.log("Project ID:", projectId);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/check-user`;
      console.log("Request URL:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, adminSecret: secret }),
      });

      console.log("Response status:", res.status);

      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        // Geef meer details over de fout
        if (res.status === 403) {
          throw new Error("ADMIN_SECRET is onjuist. Controleer je secret in Supabase settings.");
        } else if (res.status === 404) {
          throw new Error(`Geen gebruiker gevonden met email: ${email}`);
        } else {
          throw new Error(data.error || `Fout bij checken gebruiker (status ${res.status})`);
        }
      }

      setUserInfo(data);

      if (data.isAdmin) {
        // Already admin, just need to sign in
        alert("✅ Je account heeft al admin rechten!\n\nLog gewoon in op /admin/login");
        navigate("/admin/login");
      } else {
        // Needs fix
        setStep("needsFix");
      }
    } catch (err: unknown) {
      console.error("Check user error:", err);
      const errorMsg = err instanceof Error ? err.message : "Check gefaald";
      setError(errorMsg);
      setStep("input");
    }
  }

  async function handleFix() {
    setError("");
    setStep("fixing");

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/fix-role`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, adminSecret: secret }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fix role");
      }

      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fix failed");
      setStep("needsFix");
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
    backgroundColor: "#c8905a",
    color: "#060301",
    border: "none",
    padding: "14px 24px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    width: "100%",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
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
              Admin Quick Fix
            </h1>
          </div>
          <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "12px", margin: 0, lineHeight: 1.6 }}>
            Fix "Unauthorized" errors in 2 steps
          </p>
        </div>

        {/* Alert */}
        <div
          style={{
            backgroundColor: "rgba(224,112,96,0.08)",
            border: "1px solid rgba(224,112,96,0.2)",
            padding: "16px",
            marginBottom: "32px",
            display: "flex",
            gap: "12px",
          }}
        >
          <AlertTriangle size={20} color="#e07060" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "11px", lineHeight: 1.6, color: "rgba(255,251,224,0.4)" }}>
            <strong style={{ color: "#e07060", display: "block", marginBottom: "6px" }}>
              Problem Detected:
            </strong>
            Your admin account exists but doesn't have the admin role set. This causes "Unauthorized" errors throughout the admin panel.
          </div>
        </div>

        {/* Step 1: Input */}
        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Your Admin Email</label>
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
              <label style={labelStyle}>Admin Secret</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="From your ADMIN_SECRET env var"
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
                  marginBottom: "12px",
                }}
              >
                <p style={{ color: "#e07060", fontSize: "12px", margin: "0 0 8px 0", fontWeight: 600 }}>
                  Fout:
                </p>
                <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "11px", margin: 0, lineHeight: 1.6 }}>
                  {error}
                </p>
              </div>
            )}

            <button onClick={handleCheck} style={buttonStyle} disabled={!email || !secret}>
              Check & Fix
            </button>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <details style={{ cursor: "pointer" }}>
                <summary
                  style={{
                    color: "rgba(255,251,224,0.3)",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Help / Veelgestelde vragen
                </summary>
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "rgba(255,251,224,0.02)",
                    textAlign: "left",
                    fontSize: "11px",
                    lineHeight: 1.7,
                    color: "rgba(255,251,224,0.4)",
                  }}
                >
                  <p style={{ margin: "0 0 12px 0" }}>
                    <strong style={{ color: "rgba(255,251,224,0.6)" }}>
                      Waar vind ik mijn ADMIN_SECRET?
                    </strong>
                    <br />
                    1. Ga naar je Supabase project dashboard
                    <br />
                    2. Klik op Settings (tandwiel icoon)
                    <br />
                    3. Klik op Edge Functions
                    <br />
                    4. Zoek naar Secrets sectie
                    <br />
                    5. Kopieer de waarde van ADMIN_SECRET
                  </p>
                  <p style={{ margin: "0 0 12px 0" }}>
                    <strong style={{ color: "rgba(255,251,224,0.6)" }}>
                      Welk email adres moet ik gebruiken?
                    </strong>
                    <br />
                    Het email adres waarmee je je admin account hebt aangemaakt.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "rgba(255,251,224,0.6)" }}>
                      Foutmelding "ADMIN_SECRET is onjuist"?
                    </strong>
                    <br />
                    Controleer of je de juiste secret uit Supabase hebt gekopieerd (geen spaties
                    voor/achter).
                  </p>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* Step 2: Checking */}
        {step === "checking" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader size={32} color="#c8905a" style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "rgba(255,251,224,0.4)", marginTop: "16px" }}>
              Checking your account...
            </p>
          </div>
        )}

        {/* Step 3: Needs Fix */}
        {step === "needsFix" && userInfo && (
          <div>
            <div
              style={{
                backgroundColor: "rgba(224,112,96,0.08)",
                border: "1px solid rgba(224,112,96,0.2)",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <div style={{ fontSize: "11px", lineHeight: 1.8, color: "rgba(255,251,224,0.4)" }}>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Email:</strong> {userInfo.email}
                </div>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Current Role:</strong>{" "}
                  <span style={{ color: "#e07060", fontWeight: 600 }}>
                    {userInfo.role || "NOT SET"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Is Admin:</strong>{" "}
                  <span style={{ color: "#e07060", fontWeight: 600 }}>NO</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px", lineHeight: 1.6 }}>
                Your account needs to be updated with admin privileges.
                <br />
                Click below to fix this automatically.
              </p>
            </div>

            {error && (
              <p style={{ color: "#e07060", fontSize: "12px", margin: "0 0 20px 0" }}>{error}</p>
            )}

            <button onClick={handleFix} style={buttonStyle}>
              Fix Admin Role Now
            </button>
          </div>
        )}

        {/* Step 4: Fixing */}
        {step === "fixing" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader size={32} color="#c8905a" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: "rgba(255,251,224,0.4)", marginTop: "16px" }}>
              Updating your account...
            </p>
          </div>
        )}

        {/* Step 5: Success */}
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
                ✓ Fixed!
              </div>
              <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                Your account now has admin privileges.
                <br />
                Sign in to access the admin panel.
              </p>
              <button
                onClick={() => navigate("/admin/login")}
                style={buttonStyle}
              >
                Go to Admin Login
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
            ← Back to Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}
