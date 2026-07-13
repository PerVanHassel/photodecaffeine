import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { ArrowRight, Clock, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface Deliverable {
  id: string;
  name: string;
  count: number;
  done: boolean;
}

interface Project {
  id: string;
  title: string;
  status: "in_progress" | "in_review" | "delivered" | "on_hold";
  phase: string;
  description: string;
  dueDate: string;
  createdAt: string;
  deliverables?: Deliverable[];
  meeting?: {
    date: string;
    location?: string;
    link?: string;
    notes?: string;
  };
}

const STATUS_CONFIG = {
  in_review: {
    label: "In Review",
    color: "#c8905a",
    bg: "rgba(200,144,90,0.08)",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    color: "rgba(255,251,224,0.7)",
    bg: "rgba(255,251,224,0.05)",
    icon: Circle,
  },
  delivered: {
    label: "Delivered",
    color: "rgba(120,190,140,0.9)",
    bg: "rgba(120,190,140,0.07)",
    icon: CheckCircle,
  },
  on_hold: {
    label: "On Hold",
    color: "rgba(255,251,224,0.3)",
    bg: "rgba(255,251,224,0.03)",
    icon: AlertCircle,
  },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isMobile = useMobile();
  const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.in_progress;
  const StatusIcon = cfg.icon;

  const done = project.deliverables?.filter((d) => d.done).length ?? 0;
  const total = project.deliverables?.length ?? 0;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,251,224,0.025)" : "rgba(255,251,224,0.015)",
        border: `1px solid ${hovered ? "rgba(255,251,224,0.12)" : "rgba(255,251,224,0.06)"}`,
        padding: isMobile ? "20px 16px" : "32px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        fontFamily: "'Inter', sans-serif",
        transition: "all 0.25s ease",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Status badge + phase */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.color}22`,
            padding: "5px 10px",
            color: cfg.color,
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          <StatusIcon size={10} />
          {cfg.label}
        </div>
        <span
          style={{
            color: "rgba(255,251,224,0.2)",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {project.phase}
        </span>
      </div>

      {/* Title */}
      <div>
        <h3
          style={{
            color: "#fffbe0",
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: 0,
            lineHeight: 1.25,
            transition: "color 0.2s ease",
          }}
        >
          {project.title}
        </h3>
      </div>

      {/* Description */}
      <p
        style={{
          color: "rgba(255,251,224,0.4)",
          fontSize: "13px",
          fontWeight: 300,
          lineHeight: 1.65,
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {project.description}
      </p>

      {/* Meeting Alert */}
      {project.meeting?.date && (
        <div
          style={{
            backgroundColor: "rgba(200,144,90,0.08)",
            border: "1px solid rgba(200,144,90,0.2)",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c8905a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Meeting
            </div>
            <div style={{ color: "rgba(255,251,224,0.6)", fontSize: "11px", marginTop: "2px" }}>
              {new Date(project.meeting.date).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {project.meeting.location && ` • ${project.meeting.location}`}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {total > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Deliverables
            </span>
            <span style={{ color: "rgba(255,251,224,0.4)", fontSize: "10px" }}>
              {done}/{total}
            </span>
          </div>
          <div style={{ height: "2px", backgroundColor: "rgba(255,251,224,0.06)", width: "100%" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: "#c8905a",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "4px",
          borderTop: "1px solid rgba(255,251,224,0.04)",
        }}
      >
        <span
          style={{
            color: "rgba(255,251,224,0.2)",
            fontSize: "10px",
            fontWeight: 400,
            letterSpacing: "0.04em",
          }}
        >
          Due {formatDate(project.dueDate)}
        </span>
        <span
          style={{
            color: hovered ? "#c8905a" : "rgba(255,251,224,0.2)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "color 0.2s ease",
          }}
        >
          View Project <ArrowRight size={11} />
        </span>
      </div>
    </button>
  );
}

export function PortalDashboardPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const name = user?.user_metadata?.name || user?.email || "Client";
  const firstName = name.split(" ")[0];

  function loadProjects(isRefresh = false) {
    if (!session) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    portalFetch("/portal/projects", {}, session.access_token)
      .then((data) => {
        setProjects(data.projects || []);
        setError("");
      })
      .catch(() => {
        setError("Failed to load projects. Please try again.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    loadProjects();
  }, [session]);

  return (
    <div style={{
      maxWidth: "900px",
      margin: "0 auto",
      padding: isMobile ? "28px 16px 60px" : "56px 40px 80px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "72px" }}>
        <div
          style={{
            color: "rgba(255,251,224,0.2)",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          Client Dashboard
        </div>
        <h1
          style={{
            color: "#fffbe0",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Welcome back,<br />
          <span style={{ color: "#c8905a" }}>{firstName}.</span>
        </h1>
        {user?.user_metadata?.company && (
          <p
            style={{
              color: "rgba(255,251,224,0.3)",
              fontSize: "14px",
              fontWeight: 300,
              marginTop: "12px",
              letterSpacing: "0.04em",
            }}
          >
            {user.user_metadata.company}
          </p>
        )}
      </div>

      {/* Section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <span
          style={{
            color: "rgba(255,251,224,0.25)",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Active Projects
        </span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,251,224,0.05)" }} />
        <span style={{ color: "rgba(255,251,224,0.2)", fontSize: "10px" }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => loadProjects(true)}
          disabled={refreshing}
          title="Refresh projects"
          style={{
            background: "none",
            border: "1px solid rgba(255,251,224,0.08)",
            color: refreshing ? "rgba(255,251,224,0.15)" : "rgba(255,251,224,0.3)",
            cursor: refreshing ? "default" : "pointer",
            padding: "4px 8px",
            fontSize: "10px",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.1em",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { if (!refreshing) e.currentTarget.style.color = "#fffbe0"; }}
          onMouseLeave={(e) => { if (!refreshing) e.currentTarget.style.color = "rgba(255,251,224,0.3)"; }}
        >
          {refreshing ? "…" : "↻"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "rgba(255,251,224,0.2)",
            fontSize: "10px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Loading projects…
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "20px",
            border: "1px solid rgba(224,112,96,0.2)",
            color: "#e07060",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <p style={{ color: "rgba(255,251,224,0.2)", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
            No projects yet.
          </p>
          <p style={{ color: "rgba(255,251,224,0.15)", fontSize: "11px", letterSpacing: "0.1em", margin: 0 }}>
            Your PDC team will add projects here once your brief is confirmed.
          </p>
          <a
            href="mailto:contact@photodecaffeine.com"
            style={{
              color: "#c8905a",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
              border: "1px solid rgba(200,144,90,0.25)",
              padding: "10px 20px",
              transition: "all 0.2s ease",
              display: "inline-block",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(200,144,90,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
          >
            Contact PDC Studio →
          </a>
        </div>
      )}

      {/* Projects grid */}
      {!loading && !error && projects.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
            gap: "16px",
          }}
        >
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/portal/project/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}