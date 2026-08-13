import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { GalleryView } from "../../components/portal/GalleryView";

interface GallerySettings {
  title?: string;
  subtitle?: string;
  coverUrl?: string;
  accentColor?: string;
}

interface Project {
  id: string;
  title: string;
  galleryUrls?: string[];
  gallerySettings?: GallerySettings;
}

/** Admin preview of a client's gallery page, rendered exactly as the client sees it. */
export function AdminGalleryPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !id) return;
    portalFetch(`/admin/project/${id}`, {}, session.access_token)
      .then((data) => {
        setProject(data.project);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load gallery preview:", err);
        setError("Project not found.");
        setLoading(false);
      });
  }, [session, id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(var(--admin-fg-rgb),0.2)",
          fontSize: "10px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Loading preview…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ padding: "48px 40px", color: "#e07060", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
        {error || "Project not found."}
      </div>
    );
  }

  const settings = project.gallerySettings || {};

  return (
    <GalleryView
      title={settings.title || project.title}
      subtitle={settings.subtitle}
      coverUrl={settings.coverUrl || project.galleryUrls?.[0]}
      accentColor={settings.accentColor}
      photoUrls={project.galleryUrls ?? []}
      backHref={`/admin/project/${id}`}
      backLabel="Back to Project"
      badge="Preview Mode"
    />
  );
}
