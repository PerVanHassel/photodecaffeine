import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, LogOut } from "lucide-react";
import { projectId } from "/utils/supabase/info";

// Helper to safely render any value as string
function safeString(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function AdminDiagnosticPage() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [showSecretInput, setShowSecretInput] = useState(false);

  useEffect(() => {
    runDiagnostic();
  }, []);

  async function runDiagnostic() {
    setLoading(true);
    const results: any = {
      hasUser: !!user,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userEmail: user?.email,
      userId: user?.id,
      userMetadata: user?.user_metadata,
      userRole: user?.user_metadata?.role,
      isAdmin: user?.user_metadata?.role === "admin",
      tests: [],
    };

    // Test 1: Check if we can reach the server
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/test`,
        {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        }
      );
      const data = await res.json();
      results.tests.push({
        name: "Server Reachable",
        passed: res.ok || res.status === 401,
        details: `Server responded (status ${res.status}). Auth: ${data.authenticated ? 'Yes' : 'No'}${data.role ? `, Role: ${data.role}` : ''}`,
      });
      results.serverResponse = data;
    } catch (err) {
      results.tests.push({
        name: "Server Reachable",
        passed: false,
        error: String(err),
      });
    }

    // Test 2: Token validation
    if (session?.access_token) {
      results.tests.push({
        name: "Has Access Token",
        passed: true,
        details: "Token present (first 20 chars): " + session.access_token.substring(0, 20) + "...",
      });
    } else {
      results.tests.push({
        name: "Has Access Token",
        passed: false,
        details: "No access token in session",
      });
    }

    // Test 3: Admin role check
    results.tests.push({
      name: "Has Admin Role",
      passed: results.isAdmin,
      details: `Current role: ${results.userRole || "NOT SET"}`,
    });

    setDiagnostic(results);
    setLoading(false);
  }

  async function handleFix() {
    if (!adminSecret) {
      setShowSecretInput(true);
      return;
    }

    if (!user?.email) {
      setFixError("No user email found");
      return;
    }

    setFixing(true);
    setFixError("");

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/auth/fix-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            adminSecret: adminSecret,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fix role");
      }

      alert(`✅ Success!\n\n${data.message}\n\nYou will now be signed out. Please sign in again.`);
      await signOut();
      navigate("/admin/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fix failed";
      setFixError(msg);
      setFixing(false);
    }
  }

  const buttonStyle = (color: string, disabled = false): React.CSSProperties => ({
    backgroundColor: disabled ? "rgba(255,251,224,0.06)" : `rgba(${color},0.15)`,
    border: `1px solid rgba(${color},0.3)`,
    color: disabled ? "rgba(255,251,224,0.25)" : `rgb(${color})`,
    padding: "10px 16px",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#060301",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              color: "#fffbe0",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: "0 0 8px 0",
            }}
          >
            Admin Authorization Diagnostic
          </h1>
          <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "13px", margin: 0 }}>
            This page helps identify and fix authorization issues.
          </p>
        </div>

        {/* Diagnostic Results */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <RefreshCw
              size={32}
              color="#c8905a"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "rgba(255,251,224,0.3)", marginTop: "16px" }}>
              Running diagnostics...
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div
              style={{
                backgroundColor: diagnostic.isAdmin
                  ? "rgba(120,190,140,0.08)"
                  : "rgba(224,112,96,0.08)",
                border: diagnostic.isAdmin
                  ? "1px solid rgba(120,190,140,0.2)"
                  : "1px solid rgba(224,112,96,0.2)",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                {diagnostic.isAdmin ? (
                  <CheckCircle size={24} color="rgba(120,190,140,0.9)" />
                ) : (
                  <XCircle size={24} color="#e07060" />
                )}
                <div>
                  <div
                    style={{
                      color: diagnostic.isAdmin ? "rgba(120,190,140,0.9)" : "#e07060",
                      fontSize: "16px",
                      fontWeight: 700,
                    }}
                  >
                    {diagnostic.isAdmin ? "Authorization OK" : "Authorization Failed"}
                  </div>
                  <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "11px" }}>
                    {diagnostic.isAdmin
                      ? "Your account has admin privileges"
                      : "Your account does NOT have admin privileges"}
                  </div>
                </div>
              </div>

              {!diagnostic.isAdmin && (
                <>
                  <div
                    style={{
                      backgroundColor: "rgba(0,0,0,0.2)",
                      padding: "12px",
                      marginBottom: "16px",
                      fontSize: "11px",
                      lineHeight: 1.6,
                      color: "rgba(255,251,224,0.5)",
                    }}
                  >
                    <strong>Problem:</strong> Your user account exists and you're signed in, but
                    your account doesn't have <code>role: "admin"</code> set in its metadata.
                    <br />
                    <br />
                    <strong>Solution:</strong> Use your ADMIN_SECRET to update your account role.
                  </div>

                  {!showSecretInput ? (
                    <button
                      onClick={() => setShowSecretInput(true)}
                      style={buttonStyle("200,144,90")}
                    >
                      Fix My Admin Role
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <input
                        type="password"
                        value={adminSecret}
                        onChange={(e) => setAdminSecret(e.target.value)}
                        placeholder="Enter your ADMIN_SECRET"
                        style={{
                          backgroundColor: "rgba(255,251,224,0.03)",
                          border: "1px solid rgba(255,251,224,0.08)",
                          color: "#fffbe0",
                          fontSize: "13px",
                          fontFamily: "'Inter', sans-serif",
                          padding: "10px 14px",
                          outline: "none",
                        }}
                      />
                      {fixError && (
                        <p style={{ color: "#e07060", fontSize: "11px", margin: 0 }}>{fixError}</p>
                      )}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={handleFix}
                          disabled={fixing || !adminSecret}
                          style={{
                            ...buttonStyle("200,144,90", fixing || !adminSecret),
                            flex: 1,
                          }}
                        >
                          {fixing ? "Fixing..." : "Fix Role"}
                        </button>
                        <button
                          onClick={() => {
                            setShowSecretInput(false);
                            setAdminSecret("");
                            setFixError("");
                          }}
                          style={{ ...buttonStyle("255,251,224"), opacity: 0.3 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* User Info */}
            <div
              style={{
                backgroundColor: "rgba(255,251,224,0.02)",
                border: "1px solid rgba(255,251,224,0.05)",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  color: "#fffbe0",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  margin: "0 0 12px 0",
                }}
              >
                Your Account
              </h3>
              <div style={{ fontSize: "11px", lineHeight: 2, color: "rgba(255,251,224,0.4)" }}>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Email:</strong>{" "}
                  {String(diagnostic.userEmail || "N/A")}
                </div>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>User ID:</strong>{" "}
                  {String(diagnostic.userId || "N/A")}
                </div>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Role:</strong>{" "}
                  <span
                    style={{
                      color: diagnostic.isAdmin ? "rgba(120,190,140,0.9)" : "#e07060",
                      fontWeight: 600,
                    }}
                  >
                    {String(diagnostic.userRole || "NOT SET")}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Is Admin:</strong>{" "}
                  {diagnostic.isAdmin ? "Yes ✓" : "No ✗"}
                </div>
                <div>
                  <strong style={{ color: "rgba(255,251,224,0.6)" }}>Metadata:</strong>{" "}
                  <code style={{ fontSize: "10px", color: "rgba(255,251,224,0.3)" }}>
                    {diagnostic.userMetadata ? JSON.stringify(diagnostic.userMetadata) : "{}"}
                  </code>
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div
              style={{
                backgroundColor: "rgba(255,251,224,0.02)",
                border: "1px solid rgba(255,251,224,0.05)",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  color: "#fffbe0",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  margin: "0 0 12px 0",
                }}
              >
                Diagnostic Tests
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {diagnostic.tests.map((test: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px",
                      backgroundColor: test.passed
                        ? "rgba(120,190,140,0.05)"
                        : "rgba(224,112,96,0.05)",
                    }}
                  >
                    {test.passed ? (
                      <CheckCircle size={14} color="rgba(120,190,140,0.9)" />
                    ) : (
                      <XCircle size={14} color="#e07060" />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fffbe0", fontSize: "11px", fontWeight: 600 }}>
                        {test.name}
                      </div>
                      <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "10px", whiteSpace: "pre-wrap" }}>
                        {safeString(test.error || test.details || "No details")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button onClick={runDiagnostic} style={buttonStyle("200,144,90")}>
                <RefreshCw size={12} />
                Re-run Diagnostic
              </button>
              <button onClick={() => navigate("/admin/dashboard")} style={buttonStyle("255,251,224")}>
                Back to Dashboard
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/admin/login");
                }}
                style={{ ...buttonStyle("224,112,96"), marginLeft: "auto" }}
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
