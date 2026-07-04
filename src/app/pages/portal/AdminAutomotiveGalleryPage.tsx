import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { projectId } from "/utils/supabase/info";
import { Upload, X, Save } from "lucide-react";

const BUCKET = "portfolio-images-0951c59e";
const GALLERY_CATEGORY = "_automotive-gallery";
const GALLERY_TITLE = "__automotive_gallery__";

export function AdminAutomotiveGalleryPage() {
  const { session } = useAuth();
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session) fetchGallery();
  }, [session]);

  async function fetchGallery() {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      const article = (data.articles || []).find(
        (a: { title: string; id: string; galleryUrls: string[] }) => a.title === GALLERY_TITLE
      );
      if (article) {
        setArticleId(article.id);
        setGalleryUrls(article.galleryUrls || []);
      }
    } catch (err) {
      console.error("Failed to fetch automotive gallery:", err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File): Promise<string> {
    if (!session) throw new Error("Not authenticated");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucketName", BUCKET);
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/storage/upload`,
      { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: fd }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setGalleryUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      alert(`Upload failed: ${err}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveGallery() {
    if (!session) return;
    setSaving(true);
    try {
      const payload = {
        title: GALLERY_TITLE,
        category: GALLERY_CATEGORY,
        coverUrl: galleryUrls[0] || "",
        coverType: "image",
        description: "",
        galleryUrls,
        published: true,
        featured: false,
      };
      const url = articleId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio/${articleId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio`;
      const res = await fetch(url, {
        method: articleId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (!articleId && data.article?.id) setArticleId(data.article.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(`Failed to save: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "rgba(255,251,224,0.4)", fontFamily: "'Inter', sans-serif" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', sans-serif", maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ color: "rgba(255,251,224,0.2)", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
          Services › Automotive
        </div>
        <h1 style={{ color: "#fffbe0", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.1, textTransform: "uppercase" }}>
          Gallery beheren
        </h1>
        <p style={{ color: "rgba(255,251,224,0.35)", fontSize: "13px", fontWeight: 300, margin: 0 }}>
          De foto's die je hier uploadt verschijnen op de automotive pagina van de website. Sleep ze in de gewenste volgorde.
        </p>
      </div>

      {/* Current gallery */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
          Huidige foto's ({galleryUrls.length})
        </div>

        {galleryUrls.length === 0 ? (
          <div style={{
            border: "1px dashed rgba(255,251,224,0.1)",
            padding: "48px",
            textAlign: "center",
            color: "rgba(255,251,224,0.2)",
            fontSize: "13px",
          }}>
            Nog geen foto's geüpload
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "8px",
          }}>
            {galleryUrls.map((url, i) => (
              <div key={i} style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                <img
                  src={url}
                  alt={`Gallery ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {/* Order badge */}
                <div style={{
                  position: "absolute", top: "8px", left: "8px",
                  backgroundColor: "rgba(8,4,1,0.8)",
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "10px", fontWeight: 600,
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: "0.1em",
                  padding: "3px 7px",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                {/* Remove button */}
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: "absolute", top: "8px", right: "8px",
                    backgroundColor: "rgba(220,80,80,0.85)",
                    border: "none", color: "#fff",
                    width: "28px", height: "28px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload zone */}
      <div style={{ marginBottom: "32px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            backgroundColor: "rgba(13,7,3,0.8)",
            border: `2px dashed ${uploading ? "rgba(200,144,90,0.4)" : "rgba(255,251,224,0.15)"}`,
            color: uploading ? "#c8905a" : "rgba(255,251,224,0.4)",
            padding: "36px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 400,
            letterSpacing: "0.05em",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!uploading) e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
          }}
          onMouseLeave={(e) => {
            if (!uploading) e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)";
          }}
        >
          <Upload size={18} />
          {uploading ? "Bezig met uploaden…" : "Foto's uploaden (meerdere tegelijk mogelijk)"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* Save button */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={saveGallery}
          disabled={saving || uploading}
          style={{
            backgroundColor: saved ? "rgba(100,200,100,0.15)" : saving ? "rgba(255,251,224,0.2)" : "#fffbe0",
            color: saved ? "#80c880" : saving ? "rgba(255,251,224,0.4)" : "#1a0c04",
            border: saved ? "1px solid rgba(100,200,100,0.3)" : "none",
            padding: "14px 32px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: saving || uploading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            if (!saving && !uploading && !saved) {
              e.currentTarget.style.backgroundColor = "#c8905a";
              e.currentTarget.style.color = "#fffbe0";
            }
          }}
          onMouseLeave={(e) => {
            if (!saving && !uploading && !saved) {
              e.currentTarget.style.backgroundColor = "#fffbe0";
              e.currentTarget.style.color = "#1a0c04";
            }
          }}
        >
          <Save size={14} />
          {saved ? "Opgeslagen ✓" : saving ? "Opslaan…" : "Opslaan & publiceren"}
        </button>
        <p style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px", margin: 0 }}>
          Wijzigingen zijn direct zichtbaar op de website na opslaan.
        </p>
      </div>
    </div>
  );
}
