import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Select } from "../../components/portal/Select";
import { portalFetch } from "../../../lib/supabase";
import { Globe, ExternalLink, ArrowRight, Users, AlertCircle, Check, Save, Eye, X, Plus } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";
import { DEMOS } from "../../demos/registry";

interface ProjectDemo {
  slug: string;
  live: boolean;
}

interface DemoProject {
  id: string;
  title: string;
  status: string;
  type?: "photo" | "web";
  /** Demos built into this site. A project may carry several. */
  demos?: ProjectDemo[];
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

function demoName(slug: string) {
  return DEMOS.find((d) => d.slug === slug)?.name || slug;
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

const fg = (a: number) => `rgba(var(--admin-fg-rgb),calc(${a} * var(--admin-fg-boost)))`;

export function AdminDemosPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [projects, setProjects] = useState<DemoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    portalFetch("/admin/projects?type=web", {}, session.access_token)
      .then((data) => setProjects(data.projects || []))
      .catch(() => setError("Demo-projecten konden niet geladen worden."))
      .finally(() => setLoading(false));
  }, [session]);

  async function patch(project: DemoProject, body: Record<string, unknown>) {
    if (!session) return;
    setBusyId(project.id);
    setError("");
    try {
      const data = await portalFetch(
        `/admin/project/${project.id}`,
        { method: "PUT", body: JSON.stringify(body) },
        session.access_token
      );
      // The server normalises the list, so take what it sends back.
      const saved = data.project || {};
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id
            ? { ...p, ...body, demos: saved.demos ?? (body.demos as ProjectDemo[]) ?? p.demos }
            : p
        )
      );
      setSavedId(project.id);
      setTimeout(() => setSavedId(null), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  const demosOf = (p: DemoProject) => p.demos ?? [];

  const addDemo = (p: DemoProject, slug: string) =>
    slug && !demosOf(p).some((d) => d.slug === slug) &&
    patch(p, { demos: [...demosOf(p), { slug, live: false }] });

  const removeDemo = (p: DemoProject, slug: string) =>
    patch(p, { demos: demosOf(p).filter((d) => d.slug !== slug) });

  const toggleDemo = (p: DemoProject, slug: string) =>
    patch(p, {
      demos: demosOf(p).map((d) => (d.slug === slug ? { ...d, live: !d.live } : d)),
    });

  async function saveUrl(project: DemoProject) {
    const next = (urlDrafts[project.id] ?? project.demoUrl ?? "").trim();
    await patch(project, { demoUrl: next });
    setUrlDrafts((d) => {
      const { [project.id]: _drop, ...rest } = d;
      return rest;
    });
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)",
    border: `1px solid ${fg(0.1)}`,
    padding: isMobile ? "18px" : "22px",
  };

  const labelStyle: React.CSSProperties = {
    color: fg(0.3), fontSize: "9px", fontWeight: 600, letterSpacing: "0.24em",
    textTransform: "uppercase", display: "block", marginBottom: "9px",
  };

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ color: fg(0.2), fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
          Websites voor klanten
        </div>
        <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
          Webdemo&rsquo;s
        </h1>
        <p style={{ color: fg(0.35), fontSize: "13px", lineHeight: 1.7, margin: "14px 0 0", maxWidth: "640px" }}>
          Een project kan meerdere demo&rsquo;s hebben — handig als je een klant twee ontwerpen wilt
          laten zien. Zet ze los van elkaar aan of uit; wat uitstaat ziet de klant niet.
        </p>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", border: "1px solid rgba(224,112,96,0.25)", color: "#e07060", fontSize: "13px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: fg(0.3), fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Laden…
        </div>
      ) : projects.length === 0 ? (
        <div style={{ ...cardStyle, color: fg(0.35), fontSize: "13px", lineHeight: 1.8 }}>
          Nog geen webdemo&rsquo;s. Maak bij een klant een nieuw project aan en kies daar het soort{" "}
          <strong style={{ color: "var(--admin-fg-solid)", fontWeight: 600 }}>Webdemo</strong>.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {projects.map((p) => {
            const demos = demosOf(p);
            const liveCount = demos.filter((d) => d.live).length;
            const available = DEMOS.filter((d) => !demos.some((x) => x.slug === d.slug));
            const draft = urlDrafts[p.id];
            const currentUrl = draft ?? p.demoUrl ?? "";
            const urlDirty = draft !== undefined && draft.trim() !== (p.demoUrl ?? "");
            const urlValid = currentUrl.trim() === "" || isUsableUrl(currentUrl.trim());
            const busy = busyId === p.id;

            return (
              <div key={p.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
                      <Globe size={14} color="#c8905a" />
                      <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>{p.title}</span>
                      <span style={{ color: fg(0.35), fontSize: "11.5px" }}>
                        {demos.length === 0
                          ? "geen demo"
                          : `${demos.length} demo${demos.length === 1 ? "" : "'s"}, ${liveCount} online`}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: fg(0.35), fontSize: "12px" }}>
                      <Users size={11} />
                      {p.clientNames.join(", ") || "Geen klant"}
                    </div>
                  </div>
                  <span style={{ color: fg(0.25), fontSize: "11px" }}>{formatDate(p.createdAt)}</span>
                </div>

                <label style={labelStyle}>Demo&rsquo;s in deze site</label>
                {demos.length === 0 ? (
                  <p style={{ color: fg(0.3), fontSize: "12.5px", margin: "0 0 12px" }}>
                    Nog niets gekoppeld.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: fg(0.08), marginBottom: "12px" }}>
                    {demos.map((d) => (
                      <div
                        key={d.slug}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
                          backgroundColor: "rgba(var(--admin-bg-card-rgb),0.9)", padding: "11px 13px",
                        }}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: d.live ? "rgba(120,190,140,0.95)" : fg(0.28),
                        }} />
                        <span style={{ color: "var(--admin-fg-solid)", fontSize: "13px", flex: 1, minWidth: "140px" }}>
                          {demoName(d.slug)}
                        </span>

                        <button
                          onClick={() => toggleDemo(p, d.slug)}
                          disabled={busy}
                          style={{
                            background: "none",
                            border: `1px solid ${d.live ? "rgba(224,112,96,0.35)" : "rgba(120,190,140,0.4)"}`,
                            color: d.live ? "#e07060" : "rgba(120,190,140,0.95)",
                            fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                            padding: "8px 13px", cursor: busy ? "not-allowed" : "pointer",
                            opacity: busy ? 0.5 : 1, fontFamily: "'Space Grotesk', system-ui, sans-serif",
                          }}
                        >
                          {d.live ? "Offline halen" : "Online zetten"}
                        </button>

                        <a
                          href={`/demo/${d.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", gap: "6px", color: "#c8905a",
                            fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                            textTransform: "uppercase", textDecoration: "none",
                          }}
                        >
                          <Eye size={11} /> Bekijken
                        </a>

                        <button
                          onClick={() => removeDemo(p, d.slug)}
                          disabled={busy}
                          title="Loskoppelen van dit project"
                          aria-label={`${demoName(d.slug)} loskoppelen`}
                          style={{
                            background: "none", border: "none", padding: "6px", cursor: busy ? "not-allowed" : "pointer",
                            color: fg(0.35), display: "flex",
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {available.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                    <Plus size={12} color={fg(0.35)} />
                    <Select
                      value=""
                      onChange={(slug) => addDemo(p, slug)}
                      placeholder="Demo toevoegen…"
                      ariaLabel={`Demo toevoegen aan ${p.title}`}
                      disabled={busy}
                      block={false}
                      style={{ minWidth: "260px" }}
                      options={available.map((d) => ({ value: d.slug, label: d.name, hint: d.description }))}
                    />
                    {savedId === p.id && (
                      <span style={{ color: "rgba(120,190,140,0.95)", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Check size={11} /> Opgeslagen
                      </span>
                    )}
                  </div>
                )}

                <label style={labelStyle}>Of een demo die ergens anders staat</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="url"
                    value={currentUrl}
                    onChange={(e) => setUrlDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder="https://demo-klantnaam.vercel.app"
                    style={{
                      flex: 1, minWidth: "220px",
                      backgroundColor: fg(0.03),
                      border: `1px solid ${urlValid ? fg(0.1) : "rgba(224,112,96,0.45)"}`,
                      color: "var(--admin-fg-solid)", fontSize: "13px",
                      fontFamily: "'Space Grotesk', system-ui, sans-serif", padding: "10px 12px",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() => saveUrl(p)}
                    disabled={!urlDirty || !urlValid || busy}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      backgroundColor: "rgba(200,144,90,0.12)",
                      border: "1px solid rgba(200,144,90,0.3)", color: "#c8905a",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "10px 15px",
                      opacity: !urlDirty || !urlValid ? 0.45 : 1,
                      cursor: !urlDirty || !urlValid || busy ? "not-allowed" : "pointer",
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    }}
                  >
                    <Save size={12} /> Opslaan
                  </button>
                  {p.demoUrl && isUsableUrl(p.demoUrl) && (
                    <a
                      href={p.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: "6px", color: fg(0.45),
                        fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                        textTransform: "uppercase", textDecoration: "none",
                      }}
                    >
                      Openen <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {!urlValid && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e07060", fontSize: "11.5px", marginTop: "8px" }}>
                    <AlertCircle size={11} />
                    Begin met https:// zodat de link ook echt opent.
                  </div>
                )}

                {p.demoNotes && (
                  <div style={{ color: fg(0.4), fontSize: "12.5px", lineHeight: 1.65, marginTop: "12px", whiteSpace: "pre-wrap" }}>
                    {p.demoNotes}
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${fg(0.07)}`, marginTop: "16px", paddingTop: "14px" }}>
                  <button
                    onClick={() => navigate(`/admin/project/${p.id}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      color: fg(0.4), fontSize: "10px", fontWeight: 600,
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
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
