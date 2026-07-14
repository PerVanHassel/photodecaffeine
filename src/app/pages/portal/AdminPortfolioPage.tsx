import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Edit2, Trash2, X, Upload, Check, Eye, Sparkles, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { projectId } from "/utils/supabase/info";

const BUCKET = "portfolio-images-0951c59e";

type Article = {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    email: string;
    name: string;
  };
  updatedBy?: {
    id: string;
    email: string;
    name: string;
  };
};

type FormData = {
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
};

export function AdminPortfolioPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    category: "",
    coverUrl: "",
    coverType: "image",
    description: "",
    galleryUrls: [],
    published: false,
    featured: false,
  });
  const [uploading, setUploading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (session) {
      ensureBucket();
      fetchArticles();
    }
  }, [session]);

  async function ensureBucket() {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/storage/ensure-bucket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bucketName: BUCKET }),
        }
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Invalid JSON response:", text);
        return; // Silently fail
      }

      if (!res.ok) {
        console.error("Bucket setup failed:", data.error);
        return; // Silently fail - will retry on upload
      }

      console.log("Bucket setup success:", data);
    } catch (err) {
      console.error("Bucket setup error:", err);
      // Silently fail - will retry on upload
    }
  }

  async function fetchArticles() {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      setArticles((data.articles || []).filter((a: Article) => a.id !== "__automotive_gallery__"));
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File): Promise<string> {
    if (!session) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucketName", BUCKET);

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/storage/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");

    return data.url;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFormData((prev) => ({ ...prev, coverUrl: url }));
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Failed to upload file", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadFile(f)));
      setFormData((prev) => ({ ...prev, galleryUrls: [...prev.galleryUrls, ...urls] }));
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Failed to upload files", "error");
    } finally {
      setUploading(false);
    }
  }

  function moveGalleryImage(index: number, dir: -1 | 1) {
    setFormData((prev) => {
      const urls = [...prev.galleryUrls];
      const target = index + dir;
      if (target < 0 || target >= urls.length) return prev;
      [urls[index], urls[target]] = [urls[target], urls[index]];
      return { ...prev, galleryUrls: urls };
    });
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function removeGalleryImage(index: number) {
    setFormData((prev) => ({
      ...prev,
      galleryUrls: prev.galleryUrls.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    if (!formData.title.trim() || !session) return;

    try {
      const url = editingId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio/${editingId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save article");

      await fetchArticles();
      resetForm();
      showToast(editingId ? "Article updated" : "Article created", "success");
    } catch (err) {
      console.error("Save error:", err);
      showToast(`Failed to save: ${err}`, "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !session) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteTarget(null);
      await fetchArticles();
      showToast("Article deleted", "success");
    } catch (err) {
      setDeleteError(String(err));
    } finally {
      setDeleting(false);
    }
  }

  async function toggleFeatured(article: Article) {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/portfolio/${article.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ featured: !article.featured }),
        }
      );
      if (!res.ok) throw new Error("Failed to toggle featured");
      await fetchArticles();
    } catch (err) {
      console.error("Toggle featured error:", err);
      showToast(`Failed to toggle featured: ${err}`, "error");
    }
  }

  function startEdit(article: Article) {
    setEditingId(article.id);
    setFormData({
      title: article.title,
      category: article.category,
      coverUrl: article.coverUrl,
      coverType: article.coverType,
      description: article.description,
      galleryUrls: article.galleryUrls,
      published: article.published,
      featured: article.featured || false,
    });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      category: "",
      coverUrl: "",
      coverType: "image",
      description: "",
      galleryUrls: [],
      published: false,
      featured: false,
    });
  }

  async function generateDescription() {
    if (!session || !formData.title.trim()) return;

    setGeneratingDescription(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/ai/generate-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            category: formData.category || "General",
            keywords: "",
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate description");

      setFormData((prev) => ({ ...prev, description: data.description }));
    } catch (err) {
      console.error("Generate description error:", err);
      showToast(`Failed to generate description: ${err}`, "error");
    } finally {
      setGeneratingDescription(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "rgba(255,251,224,0.4)" }}>Loading portfolio...</div>
    );
  }

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              color: "#fffbe0",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Portfolio Management
          </h1>
          <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "13px", marginTop: "8px" }}>
            {articles.length} article{articles.length !== 1 ? "s" : ""} • {articles.filter(a => a.featured).length} featured on homepage (max 6 shown)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: "#fffbe0",
            color: "#1a0c04",
            border: "none",
            padding: "12px 24px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#c8905a";
            e.currentTarget.style.color = "#fffbe0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fffbe0";
            e.currentTarget.style.color = "#1a0c04";
          }}
        >
          <Plus size={16} />
          New Article
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 10000,
          backgroundColor: toast.type === "success" ? "rgba(122,184,122,0.12)" : "rgba(224,112,96,0.12)",
          border: `1px solid ${toast.type === "success" ? "rgba(122,184,122,0.35)" : "rgba(224,112,96,0.35)"}`,
          color: toast.type === "success" ? "#7ab87a" : "#e07060",
          padding: "12px 18px", fontSize: "13px",
          display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          maxWidth: "320px",
        }}>
          {toast.type === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Articles List */}
      <div style={{ display: "grid", gap: "16px" }}>
        {articles.map((article) => (
          <div
            key={article.id}
            style={{
              backgroundColor: "rgba(13,7,3,0.6)",
              border: "1px solid rgba(255,251,224,0.1)",
              padding: "20px",
              display: "flex",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "80px",
                flexShrink: 0,
                overflow: "hidden",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              {article.coverUrl && (
                article.coverType === "video" ? (
                  <video
                    src={article.coverUrl}
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={article.coverUrl}
                    alt={article.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                <h3
                  style={{
                    color: "#fffbe0",
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {article.title}
                </h3>
                {article.published ? (
                  <span
                    style={{
                      backgroundColor: "rgba(200,144,90,0.2)",
                      color: "#c8905a",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                    }}
                  >
                    Published
                  </span>
                ) : (
                  <span
                    style={{
                      backgroundColor: "rgba(255,251,224,0.05)",
                      color: "rgba(255,251,224,0.3)",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                    }}
                  >
                    Draft
                  </span>
                )}
                {article.featured && (
                  <span
                    style={{
                      backgroundColor: "rgba(255,251,224,0.1)",
                      color: "#fffbe0",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Sparkles size={10} />
                    Featured
                  </span>
                )}
              </div>
              <div
                style={{
                  color: "rgba(255,251,224,0.35)",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                {article.category || "No category"} • {article.galleryUrls.length} image
                {article.galleryUrls.length !== 1 ? "s" : ""}
              </div>
              {article.createdBy && (
                <div
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "10px",
                    marginBottom: "8px",
                  }}
                >
                  Aangemaakt door: {article.createdBy.name}
                  {article.updatedBy && article.updatedBy.id !== article.createdBy.id && (
                    <span> • Bewerkt door: {article.updatedBy.name}</span>
                  )}
                </div>
              )}
              {article.description && (
                <p
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "12px",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {article.description.slice(0, 120)}
                  {article.description.length > 120 ? "..." : ""}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => navigate(`/portfolio/${article.id}`)}
                style={{
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.1)",
                  color: "rgba(255,251,224,0.6)",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
                  e.currentTarget.style.color = "#fffbe0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)";
                  e.currentTarget.style.color = "rgba(255,251,224,0.6)";
                }}
                title="View"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => toggleFeatured(article)}
                style={{
                  backgroundColor: article.featured ? "rgba(255,251,224,0.1)" : "rgba(255,251,224,0.05)",
                  border: `1px solid ${article.featured ? "rgba(255,251,224,0.3)" : "rgba(255,251,224,0.1)"}`,
                  color: article.featured ? "#fffbe0" : "rgba(255,251,224,0.6)",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
                  e.currentTarget.style.color = "#fffbe0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = article.featured ? "rgba(255,251,224,0.3)" : "rgba(255,251,224,0.1)";
                  e.currentTarget.style.color = article.featured ? "#fffbe0" : "rgba(255,251,224,0.6)";
                }}
                title={article.featured ? "Remove from homepage" : "Feature on homepage"}
              >
                <Sparkles size={16} />
              </button>
              <button
                onClick={() => startEdit(article)}
                style={{
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.1)",
                  color: "rgba(255,251,224,0.6)",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
                  e.currentTarget.style.color = "#fffbe0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)";
                  e.currentTarget.style.color = "rgba(255,251,224,0.6)";
                }}
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => { setDeleteTarget({ id: article.id, title: article.title }); setDeleteError(null); }}
                style={{
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.1)",
                  color: "rgba(255,100,100,0.6)",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,100,100,0.3)";
                  e.currentTarget.style.color = "rgba(255,100,100,1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)";
                  e.currentTarget.style.color = "rgba(255,100,100,0.6)";
                }}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {articles.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "rgba(255,251,224,0.2)",
              fontSize: "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            No portfolio articles yet
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setDeleteTarget(null); setDeleteError(null); } }}
        >
          <div style={{ backgroundColor: "#0d0703", border: "1px solid rgba(255,251,224,0.15)", padding: "32px", maxWidth: "440px", width: "100%" }}>
            <h3 style={{ color: "#fffbe0", fontSize: "18px", fontWeight: 700, margin: "0 0 12px 0" }}>Delete Article</h3>
            <p style={{ color: "rgba(255,251,224,0.5)", fontSize: "14px", margin: "0 0 24px 0", lineHeight: 1.6 }}>
              Delete <strong style={{ color: "#fffbe0" }}>{deleteTarget.title}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ backgroundColor: "rgba(224,112,96,0.1)", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060", padding: "10px 14px", fontSize: "12px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
                <AlertCircle size={14} />
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ flex: 1, backgroundColor: deleting ? "rgba(224,112,96,0.3)" : "rgba(224,112,96,0.15)", border: "1px solid rgba(224,112,96,0.4)", color: "#e07060", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Trash2 size={14} />
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                style={{ flex: 1, backgroundColor: "transparent", border: "1px solid rgba(255,251,224,0.15)", color: "rgba(255,251,224,0.5)", padding: "12px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(4,2,0,0.92)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            overflow: "auto",
            padding: "40px",
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "32px",
              }}
            >
              <h2
                style={{
                  color: "#fffbe0",
                  fontSize: "24px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {editingId ? "Edit Article" : "New Article"}
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,251,224,0.4)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Title */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.6)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(13,7,3,0.8)",
                    border: "1px solid rgba(255,251,224,0.15)",
                    color: "#fffbe0",
                    padding: "12px",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                  placeholder="Project title"
                />
              </div>

              {/* Category */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.6)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(13,7,3,0.8)",
                    border: "1px solid rgba(255,251,224,0.15)",
                    color: "#fffbe0",
                    padding: "12px",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                  placeholder="e.g. Brand Identity, Product, Editorial"
                />
              </div>

              {/* Description */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label
                    style={{
                      color: "rgba(255,251,224,0.6)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Description
                  </label>
                  <button
                    onClick={generateDescription}
                    disabled={generatingDescription || !formData.title.trim()}
                    style={{
                      backgroundColor: "rgba(200,144,90,0.15)",
                      border: "1px solid rgba(200,144,90,0.3)",
                      color: generatingDescription ? "rgba(200,144,90,0.4)" : "#c8905a",
                      padding: "6px 12px",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: generatingDescription || !formData.title.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!generatingDescription && formData.title.trim()) {
                        e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.25)";
                        e.currentTarget.style.borderColor = "rgba(200,144,90,0.5)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(200,144,90,0.15)";
                      e.currentTarget.style.borderColor = "rgba(200,144,90,0.3)";
                    }}
                  >
                    <Sparkles size={12} />
                    {generatingDescription ? "Generating..." : "Generate with AI"}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(13,7,3,0.8)",
                    border: "1px solid rgba(255,251,224,0.15)",
                    color: "#fffbe0",
                    padding: "12px",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                    resize: "vertical",
                  }}
                  placeholder="Project description"
                />
              </div>

              {/* Cover Image */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.6)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Cover Image
                </label>
                {formData.coverUrl ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={formData.coverUrl}
                      alt="Cover"
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        marginBottom: "8px",
                      }}
                    />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, coverUrl: "" }))}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        backgroundColor: "rgba(255,100,100,0.8)",
                        border: "none",
                        color: "#fff",
                        padding: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      backgroundColor: "rgba(13,7,3,0.8)",
                      border: "2px dashed rgba(255,251,224,0.2)",
                      color: "rgba(255,251,224,0.4)",
                      padding: "40px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!uploading) e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)";
                    }}
                  >
                    <Upload size={20} />
                    {uploading ? "Uploading..." : "Upload Cover Image"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleCoverUpload}
                      style={{ display: "none" }}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {/* Gallery Images */}
              <div>
                <label
                  style={{
                    color: "rgba(255,251,224,0.6)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Gallery Images ({formData.galleryUrls.length})
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {formData.galleryUrls.map((url, idx) => (
                    <div key={idx} style={{ position: "relative" }}>
                      <img
                        src={url}
                        alt={`Gallery ${idx + 1}`}
                        style={{ width: "100%", height: "100px", objectFit: "cover" }}
                      />
                      <button
                        onClick={() => removeGalleryImage(idx)}
                        style={{ position: "absolute", top: "4px", right: "4px", backgroundColor: "rgba(255,100,100,0.9)", border: "none", color: "#fff", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <X size={14} />
                      </button>
                      <div style={{ position: "absolute", bottom: "4px", left: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <button
                          onClick={() => moveGalleryImage(idx, -1)}
                          disabled={idx === 0}
                          style={{ backgroundColor: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,251,224,0.2)", color: idx === 0 ? "rgba(255,251,224,0.2)" : "rgba(255,251,224,0.8)", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: idx === 0 ? "not-allowed" : "pointer", padding: 0 }}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveGalleryImage(idx, 1)}
                          disabled={idx === formData.galleryUrls.length - 1}
                          style={{ backgroundColor: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,251,224,0.2)", color: idx === formData.galleryUrls.length - 1 ? "rgba(255,251,224,0.2)" : "rgba(255,251,224,0.8)", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: idx === formData.galleryUrls.length - 1 ? "not-allowed" : "pointer", padding: 0 }}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    backgroundColor: "rgba(13,7,3,0.8)",
                    border: "2px dashed rgba(255,251,224,0.2)",
                    color: "rgba(255,251,224,0.4)",
                    padding: "24px",
                    cursor: uploading ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)";
                  }}
                >
                  <Upload size={18} />
                  {uploading ? "Uploading..." : "Add Gallery Images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    style={{ display: "none" }}
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* Published */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData((prev) => ({ ...prev, published: e.target.checked }))}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span
                  style={{
                    color: "rgba(255,251,224,0.6)",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Publish this article (make it visible on the website)
                </span>
              </label>

              {/* Featured */}
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    marginTop: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      color: "rgba(255,251,224,0.6)",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    Feature on homepage (max 6 items shown)
                  </span>
                </label>
                {(() => {
                  const featuredCount = articles.filter(a => a.featured && a.id !== editingId).length;
                  if (formData.featured && featuredCount >= 6) {
                    return (
                      <p style={{
                        color: "#c8905a",
                        fontSize: "11px",
                        marginTop: "6px",
                        marginLeft: "30px",
                        marginBottom: 0,
                      }}>
                        ⚠ You already have {featuredCount} featured items. Only the first 6 will be shown on the homepage.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    backgroundColor: uploading ? "rgba(255,251,224,0.3)" : "#fffbe0",
                    color: "#1a0c04",
                    border: "none",
                    padding: "14px 24px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: uploading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.currentTarget.style.backgroundColor = "#c8905a";
                      e.currentTarget.style.color = "#fffbe0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading) {
                      e.currentTarget.style.backgroundColor = "#fffbe0";
                      e.currentTarget.style.color = "#1a0c04";
                    }
                  }}
                >
                  <Check size={16} />
                  {editingId ? "Update Article" : "Create Article"}
                </button>
                <button
                  onClick={resetForm}
                  style={{
                    backgroundColor: "transparent",
                    color: "rgba(255,251,224,0.4)",
                    border: "1px solid rgba(255,251,224,0.2)",
                    padding: "14px 24px",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,251,224,0.4)";
                    e.currentTarget.style.color = "rgba(255,251,224,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,251,224,0.2)";
                    e.currentTarget.style.color = "rgba(255,251,224,0.4)";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
