import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Globe, ExternalLink, ArrowRight, Users, AlertCircle, Check, Save } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface DemoProject {
  id: string;
  title: string;
  status: string;
  type?: "photo" | "web";
  demoUrl?: string;
  demoNotes?: string;
  clientIds: string[];
  clientNames: string[];
  createdAt: string;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

/** A URL we are willing to put in an iframe and a link. */
function isUsableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function AdminDemosPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [projects, setProjects] = useState<DemoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    portalFetch("/admin/projects?type=web", {}, session.access_token)
      .then((data) => setProjects(data.projects || []))
      .catch(() => setError("Demo-projecten konden niet geladen worden."))
      .finally(() => setLoading(false));
  }, [session]);

  async function saveUrl(project: DemoProject) {
    if (!session) return;
    const next = (drafts[project.id] ?? project.demoUrl ?? "").trim();
    setSavingId(project.id);
    setError("");
    try {
      await portalFetch(
        `/admin/project/${project.id}`,
        { method: "PUT", body: JSON.stringify({ demoUrl: next }) },
        session.access_token
      );
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, demoUrl: next } : p)));
      setDrafts((d) => { const { [project.id]: _drop, ...rest } = d; return rest; });
      setSavedId(project.id);
      setTimeout(() => setSavedId(null), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setSavingId(null);
    }
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)",
    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))",
    padding: isMobile ? "18px" : "22px",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(var(--admin-fg-rgb),calc(0.03 * var(--admin-fg-boost)))",
    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))",
    color: "var(--admin-fg-solid)",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
    padding: "10px 12px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
          Websites voor klanten
        </div>
        <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
          Webdemo&rsquo;s
        </h1>
        <p style={{ color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.7, margin: "14px 0 0", maxWidth: "620px" }}>
          Elk project van het soort <strong style={{ color: "var(--admin-fg-solid)", fontWeight: 600 }}>Webdemo</strong> staat hier.
          Zet de demo online (bijvoorbeeld via Vercel) en plak de URL erbij — de klant ziet hem dan meteen in het portaal.
        </p>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", border: "1px solid rgba(224,112,96,0.25)", color: "#e07060", fontSize: "13px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Laden…
        </div>
      ) : projects.length === 0 ? (
        <div style={{ ...cardStyle, color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.8 }}>
          Nog geen webdemo&rsquo;s. Maak bij een klant een nieuw project aan en kies daar het soort{" "}
          <strong style={{ color: "var(--admin-fg-solid)", fontWeight: 600 }}>Webdemo</strong>.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {projects.map((p) => {
            const draft = drafts[p.id];
            const current = draft ?? p.demoUrl ?? "";
            const dirty = draft !== undefined && draft.trim() !== (p.demoUrl ?? "");
            const live = (p.demoUrl ?? "").trim();
            const valid = current.trim() === "" || isUsableUrl(current.trim());

            return (
              <div key={p.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      <Globe size={14} color="#c8905a" />
                      <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>{p.title}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "12px" }}>
                      <Users size={11} />
                      {p.clientNames.join(", ") || "Geen klant"}
                    </div>
                  </div>
                  <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "11px" }}>{formatDate(p.createdAt)}</span>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="url"
                    value={current}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder="https://demo-klantnaam.vercel.app"
                    style={{
                      ...inputStyle,
                      borderColor: valid
                        ? "rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))"
                        : "rgba(224,112,96,0.45)",
                    }}
                  />
                  <button
                    onClick={() => saveUrl(p)}
                    disabled={!dirty || !valid || savingId === p.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      backgroundColor: savedId === p.id ? "rgba(120,190,140,0.15)" : "rgba(200,144,90,0.12)",
                      border: `1px solid ${savedId === p.id ? "rgba(120,190,140,0.4)" : "rgba(200,144,90,0.3)"}`,
                      color: savedId === p.id ? "rgba(120,190,140,0.95)" : "#c8905a",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "10px 15px",
                      opacity: !dirty || !valid ? 0.45 : 1,
                      cursor: !dirty || !valid || savingId === p.id ? "not-allowed" : "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {savedId === p.id ? <Check size={12} /> : <Save size={12} />}
                    {savingId === p.id ? "Opslaan…" : savedId === p.id ? "Opgeslagen" : "Opslaan"}
                  </button>
                </div>

                {!valid && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e07060", fontSize: "11.5px", marginTop: "8px" }}>
                    <AlertCircle size={11} />
                    Begin met https:// zodat de link ook echt opent.
                  </div>
                )}

                {p.demoNotes && (
                  <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", fontSize: "12.5px", lineHeight: 1.65, marginTop: "12px", whiteSpace: "pre-wrap" }}>
                    {p.demoNotes}
                  </div>
                )}

                <div style={{
                  display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center",
                  borderTop: "1px solid rgba(var(--admin-fg-rgb),calc(0.07 * var(--admin-fg-boost)))",
                  marginTop: "16px", paddingTop: "14px",
                }}>
                  {live && isUsableUrl(live) ? (
                    <a
                      href={live}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        color: "#c8905a", fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none",
                      }}
                    >
                      Demo openen <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.28 * var(--admin-fg-boost)))", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Nog geen link — de klant ziet niets
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/admin/project/${p.id}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", fontSize: "10px",
                      fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Project openen <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
