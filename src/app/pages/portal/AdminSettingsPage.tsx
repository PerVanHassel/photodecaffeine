import { useState, useEffect } from "react";
import { Settings, Save, Image as ImageIcon, Upload, X, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { projectId } from "/utils/supabase/info";

const BUCKET = "portfolio-images-0951c59e";

type SiteSettings = {
  heroImageUrl: string;
  heroImageMobileUrl: string;
  frameImageUrl: string;
};

type PortfolioArticle = {
  id: string;
  title: string;
  coverUrl: string;
  coverType: "image" | "video";
  published: boolean;
};

export function AdminSettingsPage() {
  const { session } = useAuth();
  const isMobile = useMobile();
  const [settings, setSettings] = useState<SiteSettings>({
    heroImageUrl: "",
    heroImageMobileUrl: "",
    frameImageUrl: "",
  });
  const [portfolioArticles, setPortfolioArticles] = useState<PortfolioArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<"desktop" | "mobile" | "frame" | null>(null);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | "frame" | null>(null);

  useEffect(() => {
    if (session) {
      ensureBucket();
      Promise.all([fetchSettings(), fetchPortfolioArticles()]).then(() => {
        setLoading(false);
      });
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
        return;
      }

      if (!res.ok) {
        console.error("Bucket setup failed:", data.error);
        return;
      }

      console.log("Bucket setup success:", data);
    } catch (err) {
      console.error("Bucket setup error:", err);
    }
  }

  async function fetchSettings() {
    if (!session) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/settings`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      setSettings(data.settings || { heroImageUrl: "", heroImageMobileUrl: "" });
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }

  async function fetchPortfolioArticles() {
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
      setPortfolioArticles(data.articles || []);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    }
  }

  async function saveToServer(updatedSettings: SiteSettings): Promise<boolean> {
    if (!session) return false;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/settings`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updatedSettings),
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${res.status}: ${errorText}`);
    }
    return true;
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      await saveToServer(settings);
      await fetchSettings();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, type: "desktop" | "mobile" | "frame") {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";

    setUploading(type);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucketName", BUCKET);

      const uploadRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/admin/storage/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Upload mislukt (${uploadRes.status}): ${errorText}`);
      }

      const { url } = await uploadRes.json();
      if (!url) throw new Error("Server gaf geen URL terug na upload");

      const key = type === "desktop" ? "heroImageUrl" : type === "mobile" ? "heroImageMobileUrl" : "frameImageUrl";
      const updatedSettings: SiteSettings = { ...settings, [key]: url };

      await saveToServer(updatedSettings);

      // Confirm from server that it's saved
      await fetchSettings();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(String(err));
    } finally {
      setUploading(null);
    }
  }


  async function selectPortfolioImage(url: string) {
    if (!session) return;
    const type = showImagePicker;
    setShowImagePicker(null);
    setSaveStatus("idle");
    setSaveError(null);

    try {
      const key = type === "desktop" ? "heroImageUrl" : type === "mobile" ? "heroImageMobileUrl" : "frameImageUrl";
      const updatedSettings: SiteSettings = { ...settings, [key]: url };
      await saveToServer(updatedSettings);
      await fetchSettings();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(String(err));
    }
  }

  if (loading) {
    return (
      <div style={{ padding: isMobile ? "24px 16px" : "40px", color: "rgba(255,251,224,0.4)" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "40px", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              color: "rgba(255,251,224,0.2)",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Site Configuration
          </div>
          <h1
            style={{
              color: "#fffbe0",
              fontSize: "clamp(22px, 3vw, 38px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.1,
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Settings size={32} style={{ color: "#c8905a" }} />
            Site Settings
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? "rgba(255,251,224,0.3)" : "#fffbe0",
            color: "#1a0c04",
            border: "none",
            padding: isMobile ? "10px 20px" : "12px 24px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.backgroundColor = "#c8905a";
              e.currentTarget.style.color = "#fffbe0";
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.currentTarget.style.backgroundColor = "#fffbe0";
              e.currentTarget.style.color = "#1a0c04";
            }
          }}
        >
          <Save size={16} />
          {saving ? "Opslaan…" : saveStatus === "success" ? "Opgeslagen ✓" : "Save Changes"}
        </button>
      </div>

      {/* Inline status feedback */}
      {saveStatus === "error" && saveError && (
        <div style={{
          backgroundColor: "rgba(224,112,96,0.1)",
          border: "1px solid rgba(224,112,96,0.3)",
          color: "#e07060",
          padding: "12px 16px",
          fontSize: "13px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          <span><strong>Fout bij opslaan:</strong> {saveError}</span>
        </div>
      )}
      {saveStatus === "success" && (
        <div style={{
          backgroundColor: "rgba(122,184,122,0.1)",
          border: "1px solid rgba(122,184,122,0.3)",
          color: "#7ab87a",
          padding: "12px 16px",
          fontSize: "13px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <Check size={16} />
          Opgeslagen — de homepage hero wordt nu bijgewerkt.
        </div>
      )}

      {/* Hero Images Section */}
      <div
        style={{
          backgroundColor: "rgba(13,7,3,0.6)",
          border: "1px solid rgba(255,251,224,0.1)",
          padding: isMobile ? "20px" : "32px",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            color: "#fffbe0",
            fontSize: "18px",
            fontWeight: 700,
            margin: "0 0 8px 0",
            textTransform: "uppercase",
          }}
        >
          Homepage Hero Images
        </h2>
        <p
          style={{
            color: "rgba(255,251,224,0.4)",
            fontSize: "13px",
            margin: "0 0 24px 0",
            lineHeight: 1.6,
          }}
        >
          Select images for the hero section. Desktop image is shown on large screens, mobile image on small screens.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Desktop Hero Image */}
          <div>
            <label
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "12px",
              }}
            >
              Desktop Hero Image
            </label>
            {settings.heroImageUrl ? (
              <div style={{ position: "relative" }}>
                <img
                  src={settings.heroImageUrl}
                  alt="Desktop hero"
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    display: "block",
                    border: "1px solid rgba(255,251,224,0.1)",
                  }}
                />
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, heroImageUrl: "" }))}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    border: "1px solid rgba(255,100,100,0.5)",
                    color: "#ff6464",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  border: "2px dashed rgba(255,251,224,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,251,224,0.3)",
                  fontSize: "13px",
                }}
              >
                No image selected
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button
                onClick={() => setShowImagePicker("desktop")}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.15)",
                  color: "rgba(255,251,224,0.6)",
                  padding: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <ImageIcon size={14} />
                Choose from Portfolio
              </button>
              <label
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.15)",
                  color: "rgba(255,251,224,0.6)",
                  padding: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: uploading === "desktop" ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Upload size={14} />
                {uploading === "desktop" ? "Uploaden…" : "Upload New"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "desktop")}
                  style={{ display: "none" }}
                  disabled={uploading !== null}
                />
              </label>
            </div>
          </div>

          {/* Mobile Hero Image */}
          <div>
            <label
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "12px",
              }}
            >
              Mobile Hero Image
            </label>
            {settings.heroImageMobileUrl ? (
              <div style={{ position: "relative" }}>
                <img
                  src={settings.heroImageMobileUrl}
                  alt="Mobile hero"
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    display: "block",
                    border: "1px solid rgba(255,251,224,0.1)",
                  }}
                />
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, heroImageMobileUrl: "" }))}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    border: "1px solid rgba(255,100,100,0.5)",
                    color: "#ff6464",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  border: "2px dashed rgba(255,251,224,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,251,224,0.3)",
                  fontSize: "13px",
                }}
              >
                No image selected
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button
                onClick={() => setShowImagePicker("mobile")}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.15)",
                  color: "rgba(255,251,224,0.6)",
                  padding: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <ImageIcon size={14} />
                Choose from Portfolio
              </button>
              <label
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,251,224,0.05)",
                  border: "1px solid rgba(255,251,224,0.15)",
                  color: "rgba(255,251,224,0.6)",
                  padding: "10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: uploading === "mobile" ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Upload size={14} />
                {uploading === "mobile" ? "Uploaden…" : "Upload New"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "mobile")}
                  style={{ display: "none" }}
                  disabled={uploading !== null}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Frame Image */}
        <div style={{ marginTop: "24px", borderTop: "1px solid rgba(255,251,224,0.06)", paddingTop: "24px" }}>
          <label style={{
            color: "rgba(255,251,224,0.5)", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "12px",
          }}>
            Portret foto (filmstrip frame)
          </label>
          <p style={{ color: "rgba(255,251,224,0.25)", fontSize: "12px", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            De staande foto in het filmstrip-kader naast de tekst op de homepage.
          </p>
          {settings.frameImageUrl ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={settings.frameImageUrl} alt="Frame" style={{ width: "160px", height: "213px", objectFit: "cover", display: "block", border: "1px solid rgba(255,251,224,0.1)" }} />
              <button
                onClick={() => setSettings((prev) => ({ ...prev, frameImageUrl: "" }))}
                style={{ position: "absolute", top: "8px", right: "8px", backgroundColor: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,100,100,0.5)", color: "#ff6464", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ width: "160px", height: "213px", border: "2px dashed rgba(255,251,224,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,251,224,0.3)", fontSize: "12px" }}>
              Geen foto
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", maxWidth: "360px" }}>
            <button
              onClick={() => setShowImagePicker("frame")}
              style={{ flex: 1, backgroundColor: "rgba(255,251,224,0.05)", border: "1px solid rgba(255,251,224,0.15)", color: "rgba(255,251,224,0.6)", padding: "10px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ImageIcon size={14} />
              Portfolio
            </button>
            <label style={{ flex: 1, backgroundColor: "rgba(255,251,224,0.05)", border: "1px solid rgba(255,251,224,0.15)", color: "rgba(255,251,224,0.6)", padding: "10px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: uploading === "frame" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <Upload size={14} />
              {uploading === "frame" ? "Uploaden…" : "Upload"}
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "frame")} style={{ display: "none" }} disabled={uploading !== null} />
            </label>
          </div>
        </div>
      </div>

      {/* Portfolio Image Picker Modal */}
      {showImagePicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowImagePicker(null);
          }}
        >
          <div
            style={{
              backgroundColor: "#0d0703",
              border: "1px solid rgba(255,251,224,0.2)",
              padding: isMobile ? "24px" : "32px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  color: "#fffbe0",
                  fontSize: "18px",
                  fontWeight: 700,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Select Image from Portfolio
              </h2>
              <button
                onClick={() => setShowImagePicker(null)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255,251,224,0.4)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
                gap: "12px",
              }}
            >
              {portfolioArticles
                .filter((a) => a.coverType === "image")
                .map((article) => (
                  <div
                    key={article.id}
                    onClick={() => selectPortfolioImage(article.coverUrl)}
                    style={{
                      cursor: "pointer",
                      border: "2px solid rgba(255,251,224,0.1)",
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#c8905a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,251,224,0.1)";
                    }}
                  >
                    <img
                      src={article.coverUrl}
                      alt={article.title}
                      style={{
                        width: "100%",
                        height: "150px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        padding: "8px",
                        backgroundColor: "rgba(0,0,0,0.6)",
                      }}
                    >
                      <div
                        style={{
                          color: "#fffbe0",
                          fontSize: "11px",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {article.title}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {portfolioArticles.filter((a) => a.coverType === "image").length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "rgba(255,251,224,0.3)",
                  fontSize: "13px",
                }}
              >
                No portfolio images available. Add some in the Portfolio section first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
