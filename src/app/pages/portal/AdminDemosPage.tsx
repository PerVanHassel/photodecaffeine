import { useEffect, useState } from "react";
import { Select } from "../../components/portal/Select";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Globe, ExternalLink, ArrowRight, Users, AlertCircle, Check, Save, Eye } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";
import { DEMOS } from "../../demos/registry";

interface DemoProject {
  id: string;
  title: string;
  status: string;
  type?: "photo" | "web";
  /** A demo built into this site, addressed as /demo/<slug>. */
  demoSlug?: string;
  /** Whether visitors may see it. Only meaningful together with demoSlug. */
  demoLive?: boolean;
  /** A demo hosted somewhere else. We cannot switch that one on or off. */
  demoUrl?: string;
  demoNotes?: string;
  clientIds: string[];
  clientNames: string[];
  createdAt: string;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

/** A URL we are willing to put in a link. */
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
  const [drafts, setDrafts] = useState<Record<string, { demoSlug: string; demoUrl: string }>>({});
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

  function draftFor(p: DemoProject) {
    return drafts[p.id] ?? { demoSlug: p.demoSlug ?? "", demoUrl: p.demoUrl ?? "" };
  }

  async function patch(project: DemoProject, body: Record<string, unknown>) {
    if (!session) return;
    setSavingId(project.id);
    setError("");
    try {
      await portalFetch(
        `/admin/project/${project.id}`,
        { method: "PUT", body: JSON.stringify(body) },
        session.access_token
      );
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...body } : p)));
      setSavedId(project.id);
      setTimeout(() => setSavedId(null), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setSavingId(null);
    }
  }

  async function save(project: DemoProject) {
    const draft = draftFor(project);
    const body: Record<string, unknown> = {
      demoSlug: draft.demoSlug,
      demoUrl: draft.demoUrl.trim(),
    };
    // Dropping the built-in demo takes the page offline with it, otherwise the
    // switch would claim a demo is live that no longer has anything to show.
    if (!draft.demoSlug) body.demoLive = false;
    await patch(project, body);
    setDrafts((d) => {
      const { [project.id]: _drop, ...rest } = d;
      return rest;
    });
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)",
    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))",
    padding: isMobile ? "18px" : "22px",
  };

  const fieldStyle: React.CSSProperties = {
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

  const labelStyle: React.CSSProperties = {
    color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))",
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.24em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "7px",
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
        <p style={{ color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.7, margin: "14px 0 0", maxWidth: "640px" }}>
          Elk project van het soort <strong style={{ color: "var(--admin-fg-solid)", fontWeight: 600 }}>Webdemo</strong> staat hier.
          Kies welke demo erbij hoort en zet hem aan of uit — staat hij uit, dan ziet de klant niets.
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
            const draft = draftFor(p);
            const dirty =
              draft.demoSlug !== (p.demoSlug ?? "") || draft.demoUrl.trim() !== (p.demoUrl ?? "");
            const urlValid = draft.demoUrl.trim() === "" || isUsableUrl(draft.demoUrl.trim());
            const live = Boolean(p.demoLive && p.demoSlug);
            const busy = savingId === p.id;

            return (
              <div key={p.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
                      <Globe size={14} color="#c8905a" />
                      <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>{p.title}</span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                        padding: "3px 8px",
                        color: live ? "rgba(120,190,140,0.95)" : "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))",
                        border: `1px solid ${live ? "rgba(120,190,140,0.4)" : "rgba(var(--admin-fg-rgb),calc(0.12 * var(--admin-fg-boost)))"}`,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: live ? "rgba(120,190,140,0.95)" : "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))" }} />
                        {live ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "12px" }}>
                      <Users size={11} />
                      {p.clientNames.join(", ") || "Geen klant"}
                    </div>
                  </div>
                  <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "11px" }}>{formatDate(p.createdAt)}</span>
                </div>

                <div style={{ display: "grid", gap: "16px", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                  <div>
                    <label style={labelStyle} htmlFor={`demo-${p.id}`}>Demo in deze site</label>
                    <Select
                      id={`demo-${p.id}`}
                      value={draft.demoSlug}
                      onChange={(v) =>
                        setDrafts((d) => ({ ...d, [p.id]: { ...draft, demoSlug: v } }))
                      }
                      placeholder="Geen"
                      options={[
                        { value: "", label: "Geen" },
                        ...DEMOS.map((d) => ({ value: d.slug, label: d.name, hint: d.description })),
                      ]}
                    />
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor={`url-${p.id}`}>Of een demo die ergens anders staat</label>
                    <input
                      id={`url-${p.id}`}
                      type="url"
                      value={draft.demoUrl}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [p.id]: { ...draft, demoUrl: e.target.value } }))
                      }
                      placeholder="https://demo-klantnaam.vercel.app"
                      style={{
                        ...fieldStyle,
                        width: "100%",
                        borderColor: urlValid
                          ? "rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))"
                          : "rgba(224,112,96,0.45)",
                      }}
                    />
                  </div>
                </div>

                {!urlValid && (
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
                  display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center",
                  borderTop: "1px solid rgba(var(--admin-fg-rgb),calc(0.07 * var(--admin-fg-boost)))",
                  marginTop: "18px", paddingTop: "16px",
                }}>
                  <button
                    onClick={() => save(p)}
                    disabled={!dirty || !urlValid || busy}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      backgroundColor: savedId === p.id ? "rgba(120,190,140,0.15)" : "rgba(200,144,90,0.12)",
                      border: `1px solid ${savedId === p.id ? "rgba(120,190,140,0.4)" : "rgba(200,144,90,0.3)"}`,
                      color: savedId === p.id ? "rgba(120,190,140,0.95)" : "#c8905a",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "10px 15px",
                      opacity: !dirty || !urlValid ? 0.45 : 1,
                      cursor: !dirty || !urlValid || busy ? "not-allowed" : "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {savedId === p.id ? <Check size={12} /> : <Save size={12} />}
                    {busy ? "Opslaan…" : savedId === p.id ? "Opgeslagen" : "Opslaan"}
                  </button>

                  {p.demoSlug && (
                    <>
                      <button
                        onClick={() => patch(p, { demoLive: !live })}
                        disabled={busy || dirty}
                        title={dirty ? "Sla eerst je keuze op" : undefined}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          background: "none",
                          border: `1px solid ${live ? "rgba(224,112,96,0.35)" : "rgba(120,190,140,0.4)"}`,
                          color: live ? "#e07060" : "rgba(120,190,140,0.95)",
                          fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                          padding: "10px 15px",
                          opacity: busy || dirty ? 0.45 : 1,
                          cursor: busy || dirty ? "not-allowed" : "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {live ? "Offline halen" : "Online zetten"}
                      </button>

                      <a
                        href={`/demo/${p.demoSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          color: "#c8905a", fontSize: "10px", fontWeight: 700,
                          letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none",
                        }}
                      >
                        <Eye size={11} /> Bekijken
                      </a>
                    </>
                  )}

                  {p.demoUrl && isUsableUrl(p.demoUrl) && (
                    <a
                      href={p.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        color: "rgba(var(--admin-fg-rgb),calc(0.45 * var(--admin-fg-boost)))", fontSize: "10px",
                        fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none",
                      }}
                    >
                      Externe demo <ExternalLink size={11} />
                    </a>
                  )}

                  {!p.demoSlug && !p.demoUrl && (
                    <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.28 * var(--admin-fg-boost)))", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Nog geen demo gekoppeld
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/admin/project/${p.id}`)}
                    style={{
                      marginLeft: "auto",
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
