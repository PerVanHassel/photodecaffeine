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

/** Client-facing full-page gallery for a single project. Requires portal auth. */
export function PortalGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !id) return;
    portalFetch(`/portal/project/${id}`, {}, session.access_token)
      .then((data) => {
        setProject(data.project);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load gallery:", err);
        setError("Gallery not found or access denied.");
        setLoading(false);
      });
  }, [session, id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,251,224,0.2)",
          fontSize: "10px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Loading gallery…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <p style={{ color: "#e07060", fontSize: "14px" }}>{error || "Gallery not found."}</p>
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
      backHref={`/portal/project/${id}`}
      backLabel="Back to Project"
    />
  );
}
