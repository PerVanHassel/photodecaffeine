import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, AlertCircle, CheckCircle, Search } from "lucide-react";
import { projectId } from "/utils/supabase/info";

export function AdminRoleFixPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userStatus, setUserStatus] = useState<any>(null);

  async function handleCheckUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !secret) {
      setError("Please enter both email and admin secret");
      return;
    }

    setError("");
    setUserStatus(null);
    setChecking(true);

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/check-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            adminSecret: secret,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check user");
      }

      console.log("User status:", data);
      setUserStatus(data);
      setChecking(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Check failed";
      setError(msg);
      setChecking(false);
    }
  }

  async function handleFix(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/fix-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            adminSecret: secret,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fix role");
      }

      console.log("Role fix response:", data);
      setSuccess(true);
      setLoading(false);

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate("/admin/login");
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fix failed";
      setError(msg);
      setLoading(false);
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#060301",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <div
          style={{
            backgroundColor: "rgba(224,112,96,0.08)",
            border: "1px solid rgba(224,112,96,0.2)",
            padding: "20px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <AlertCircle size={20} color="#e07060" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div
              style={{
                color: "#e07060",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              Admin Role Fix Required
            </div>
            <div
              style={{
                color: "rgba(255,251,224,0.4)",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              Your admin account exists but doesn't have the admin role set. This causes
              "Unauthorized" errors when trying to access admin features.
              <br />
              <br />
              <strong style={{ color: "rgba(255,251,224,0.6)" }}>Steps:</strong>
              <br />
              1. Enter your admin email below
              <br />
              2. Enter your ADMIN_SECRET (from Supabase environment settings)
              <br />
              3. Click "Check Status" to verify your account
              <br />
              4. Click "Fix Admin Role" to update your account
              <br />
              5. Sign in again with your credentials
            </div>
          </div>
        </div>

        {!success ? (
          <form onSubmit={handleFix} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <ShieldCheck size={16} color="#c8905a" />
              <h2
                style={{
                  color: "#fffbe0",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                Fix Admin Role
              </h2>
            </div>

            <div>
              <label style={labelStyle}>Your Admin Email</label>
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
              <label style={labelStyle}>Admin Secret Key</label>
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
              <p
                style={{
                  color: "rgba(255,251,224,0.18)",
                  fontSize: "10px",
                  margin: "8px 0 0",
                  lineHeight: 1.5,
                }}
              >
                This is the ADMIN_SECRET you configured in your Supabase environment settings.
              </p>
            </div>

            {/* User Status */}
            {userStatus && (
              <div
                style={{
                  backgroundColor: userStatus.isAdmin
                    ? "rgba(120,190,140,0.08)"
                    : "rgba(224,112,96,0.08)",
                  border: userStatus.isAdmin
                    ? "1px solid rgba(120,190,140,0.2)"
                    : "1px solid rgba(224,112,96,0.2)",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  {userStatus.isAdmin ? (
                    <CheckCircle size={16} color="rgba(120,190,140,0.9)" />
                  ) : (
                    <AlertCircle size={16} color="#e07060" />
                  )}
                  <div
                    style={{
                      color: userStatus.isAdmin ? "rgba(120,190,140,0.9)" : "#e07060",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {userStatus.isAdmin ? "Already Admin" : "Not Admin"}
                  </div>
                </div>
                <div
                  style={{
                    color: "rgba(255,251,224,0.4)",
                    fontSize: "10px",
                    lineHeight: 1.5,
                  }}
                >
                  User ID: {userStatus.userId}
                  <br />
                  Current Role: {userStatus.role || "not set"}
                  <br />
                  Is Admin: {userStatus.isAdmin ? "Yes" : "No"}
                </div>
              </div>
            )}

            {error && (
              <p style={{ color: "#e07060", fontSize: "12px", margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={handleCheckUser}
                disabled={checking || !email || !secret}
                style={{
                  backgroundColor: checking ? "rgba(255,251,224,0.06)" : "rgba(200,144,90,0.15)",
                  color: checking ? "rgba(255,251,224,0.25)" : "#c8905a",
                  border: "1px solid rgba(200,144,90,0.3)",
                  padding: "14px 24px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: checking || !email || !secret ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif",
                  flex: 1,
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Search size={12} />
                {checking ? "Checking…" : "Check Status"}
              </button>

              <button
                type="submit"
                disabled={loading || (userStatus && userStatus.isAdmin)}
                style={{
                  backgroundColor: loading
                    ? "rgba(255,251,224,0.06)"
                    : userStatus && userStatus.isAdmin
                    ? "rgba(255,251,224,0.06)"
                    : "#c8905a",
                  color: loading || (userStatus && userStatus.isAdmin)
                    ? "rgba(255,251,224,0.25)"
                    : "#060301",
                  border: "none",
                  padding: "14px 24px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: loading || (userStatus && userStatus.isAdmin) ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif",
                  flex: 1,
                  transition: "all 0.2s ease",
                }}
              >
                {loading ? "Fixing Role…" : "Fix Admin Role"}
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              padding: "32px 24px",
              backgroundColor: "rgba(120,190,140,0.08)",
              border: "1px solid rgba(120,190,140,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
                justifyContent: "center",
              }}
            >
              <CheckCircle size={24} color="rgba(120,190,140,0.9)" />
              <div
                style={{
                  color: "rgba(120,190,140,0.9)",
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Admin Role Fixed!
              </div>
            </div>
            <div
              style={{
                color: "rgba(255,251,224,0.4)",
                fontSize: "12px",
                lineHeight: 1.7,
                textAlign: "center",
              }}
            >
              Your account has been updated with admin privileges.
              <br />
              <br />
              <strong style={{ color: "rgba(255,251,224,0.6)" }}>
                Redirecting to login page...
              </strong>
              <br />
              <br />
              <span style={{ fontSize: "11px", color: "rgba(255,251,224,0.3)" }}>
                Please sign in with your credentials to access the admin panel.
              </span>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a
            href="/admin/login"
            style={{
              color: "rgba(255,251,224,0.15)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.4)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.15)")}
          >
            ← Back to Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}
