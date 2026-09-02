import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Star, Eye, EyeOff, Trash2, MessageSquare, Images, ArrowRight } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface Review {
  id: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  rating: number;
  text: string;
  portfolioArticleId: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackItem {
  id: string;
  scope: "photos" | "general";
  photoUrls: string[];
  category: string;
  text: string;
}

interface FeedbackEntry {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  items: FeedbackItem[];
  createdAt: string;
}

interface PortfolioOption {
  id: string;
  title: string;
  category: string;
}

type Tab = "reviews" | "feedback";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

/** Five stars, filled up to `rating`. Purely presentational. */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }} aria-label={`${rating} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color="#c8905a"
          fill={n <= rating ? "#c8905a" : "none"}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

export function AdminReviewsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [articles, setArticles] = useState<PortfolioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError("");
    Promise.all([
      portalFetch("/admin/reviews", {}, session.access_token),
      portalFetch("/admin/feedback", {}, session.access_token),
      portalFetch("/admin/portfolio", {}, session.access_token),
    ])
      .then(([r, f, p]) => {
        setReviews(r.reviews || []);
        setFeedback(f.feedback || []);
        setArticles(
          (p.articles || [])
            // Internal/system entries (category starting with "_") aren't real
            // portfolio pieces and shouldn't be linkable.
            .filter((a: any) => !String(a.category || "").startsWith("_"))
            .map((a: any) => ({ id: a.id, title: a.title, category: a.category }))
        );
      })
      .catch(() => setError("Reviews en feedback konden niet geladen worden."))
      .finally(() => setLoading(false));
  }, [session]);

  async function patchReview(id: string, updates: Partial<Review>) {
    if (!session) return;
    setSavingId(id);
    try {
      const data = await portalFetch(
        `/admin/reviews/${id}`,
        { method: "PUT", body: JSON.stringify(updates) },
        session.access_token
      );
      setReviews((prev) => prev.map((r) => (r.id === id ? data.review : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !session) return;
    const id = deleteTarget.id;
    setSavingId(id);
    try {
      await portalFetch(`/admin/reviews/${id}`, { method: "DELETE" }, session.access_token);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt.");
    } finally {
      setSavingId(null);
    }
  }

  const publishedCount = reviews.filter((r) => r.published).length;
  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)",
    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))",
    padding: isMobile ? "18px" : "22px",
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: "rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))",
    border: "1px solid rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))",
    color: "var(--admin-fg-solid)",
    fontSize: "12px",
    padding: "8px 10px",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    maxWidth: "100%",
  };

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1000px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.2 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
          Wat klanten zeggen
        </div>
        <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
          Reviews &amp; Feedback
        </h1>
        {avg && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
            <Stars rating={Math.round(Number(avg))} />
            <span style={{ color: "var(--admin-fg-solid)", fontSize: "13px", fontWeight: 600 }}>{avg}</span>
            <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "12px" }}>
              gemiddeld over {reviews.length} review{reviews.length === 1 ? "" : "s"} · {publishedCount} gepubliceerd
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))", marginBottom: "24px" }}>
        {([["reviews", `Reviews (${reviews.length})`], ["feedback", `Feedback (${feedback.length})`]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === key ? "1px solid #c8905a" : "1px solid transparent",
              color: tab === key ? "var(--admin-fg-solid)" : "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))",
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
              padding: "12px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: "-1px",
            }}
          >
            {label}
          </button>
        ))}
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
      ) : tab === "reviews" ? (
        reviews.length === 0 ? (
          <div style={{ ...cardStyle, color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.7 }}>
            Nog geen reviews. Vraag er een aan bij een project — open het project en klik op “Vraag review”.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {reviews.map((r) => (
              <div key={r.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <Stars rating={r.rating} size={15} />
                    <div style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700, marginTop: "8px" }}>{r.clientName}</div>
                    <button
                      onClick={() => navigate(`/admin/project/${r.projectId}`)}
                      style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer",
                        color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "12px",
                        fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "5px", marginTop: "3px",
                      }}
                    >
                      {r.projectTitle} <ArrowRight size={11} />
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      backgroundColor: r.published ? "rgba(120,190,140,0.12)" : "rgba(var(--admin-fg-rgb),calc(0.05 * var(--admin-fg-boost)))",
                      color: r.published ? "rgba(120,190,140,0.95)" : "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
                      border: `1px solid ${r.published ? "rgba(120,190,140,0.3)" : "rgba(var(--admin-fg-rgb),calc(0.12 * var(--admin-fg-boost)))"}`,
                      fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 10px",
                    }}>
                      {r.published ? "Op de site" : "Niet zichtbaar"}
                    </span>
                    <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "11px" }}>{formatDate(r.createdAt)}</span>
                  </div>
                </div>

                <div style={{
                  color: "rgba(var(--admin-fg-rgb),calc(0.7 * var(--admin-fg-boost)))",
                  fontSize: "14px", lineHeight: 1.75, whiteSpace: "pre-wrap",
                  borderLeft: "2px solid rgba(200,144,90,0.5)", paddingLeft: "14px", marginBottom: "18px",
                }}>
                  {r.text}
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
                  borderTop: "1px solid rgba(var(--admin-fg-rgb),calc(0.07 * var(--admin-fg-boost)))", paddingTop: "16px",
                }}>
                  <label style={{ color: "rgba(var(--admin-fg-rgb),calc(0.3 * var(--admin-fg-boost)))", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    Portfoliostuk
                  </label>
                  <select
                    value={r.portfolioArticleId || ""}
                    disabled={savingId === r.id}
                    onChange={(e) => patchReview(r.id, { portfolioArticleId: e.target.value || null })}
                    style={selectStyle}
                  >
                    <option value="" style={{ backgroundColor: "#1a0c04", color: "#fffbe0" }}>Geen koppeling</option>
                    {articles.map((a) => (
                      <option key={a.id} value={a.id} style={{ backgroundColor: "#1a0c04", color: "#fffbe0" }}>
                        {a.title}
                      </option>
                    ))}
                  </select>

                  <div style={{ flex: 1 }} />

                  <button
                    onClick={() => patchReview(r.id, { published: !r.published })}
                    disabled={savingId === r.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      backgroundColor: r.published ? "transparent" : "rgba(200,144,90,0.12)",
                      border: `1px solid ${r.published ? "rgba(var(--admin-fg-rgb),calc(0.15 * var(--admin-fg-boost)))" : "rgba(200,144,90,0.3)"}`,
                      color: r.published ? "rgba(var(--admin-fg-rgb),calc(0.5 * var(--admin-fg-boost)))" : "#c8905a",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                      padding: "9px 14px", cursor: savingId === r.id ? "not-allowed" : "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {r.published ? <EyeOff size={12} /> : <Eye size={12} />}
                    {savingId === r.id ? "Bezig…" : r.published ? "Van site halen" : "Publiceren"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    title="Review verwijderen"
                    style={{ background: "none", border: "none", color: "rgba(224,112,96,0.55)", cursor: "pointer", padding: "6px" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : feedback.length === 0 ? (
        <div style={{ ...cardStyle, color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.7 }}>
          Nog geen feedback. Vraag erom bij een project — open het project en klik op “Vraag feedback”.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {feedback.map((f) => (
            <div key={f.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                <div>
                  <div style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>{f.clientName}</div>
                  <button
                    onClick={() => navigate(`/admin/project/${f.projectId}`)}
                    style={{
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      color: "rgba(var(--admin-fg-rgb),calc(0.35 * var(--admin-fg-boost)))", fontSize: "12px",
                      fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "5px", marginTop: "3px",
                    }}
                  >
                    {f.projectTitle} <ArrowRight size={11} />
                  </button>
                </div>
                <span style={{ color: "rgba(var(--admin-fg-rgb),calc(0.25 * var(--admin-fg-boost)))", fontSize: "11px" }}>{formatDate(f.createdAt)}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {f.items.map((item) => (
                  <div key={item.id} style={{ borderTop: "1px solid rgba(var(--admin-fg-rgb),calc(0.07 * var(--admin-fg-boost)))", paddingTop: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
                      {item.scope === "photos" ? <Images size={11} /> : <MessageSquare size={11} />}
                      {item.scope === "photos"
                        ? `${item.photoUrls.length} foto${item.photoUrls.length === 1 ? "" : "'s"}`
                        : item.category || "Algemeen"}
                    </div>
                    {item.photoUrls.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                        {item.photoUrls.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            style={{
                              width: "62px", height: "62px", objectFit: "cover",
                              border: "1px solid rgba(var(--admin-fg-rgb),calc(0.12 * var(--admin-fg-boost)))",
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ color: "rgba(var(--admin-fg-rgb),calc(0.65 * var(--admin-fg-boost)))", fontSize: "13.5px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(8,4,1,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{ backgroundColor: "var(--admin-bg-card)", border: "1px solid rgba(224,112,96,0.25)", padding: isMobile ? "24px 20px" : "32px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ color: "var(--admin-fg-solid)", fontSize: "17px", fontWeight: 700, margin: "0 0 12px" }}>Review verwijderen?</h3>
            <p style={{ color: "rgba(var(--admin-fg-rgb),calc(0.5 * var(--admin-fg-boost)))", fontSize: "13px", lineHeight: 1.7, margin: "0 0 22px" }}>
              De review van {deleteTarget.clientName} wordt definitief verwijderd. Het reviewverzoek vervalt ook, zodat je dit project opnieuw om een review kunt vragen.
            </p>
            <div style={{ display: "flex", gap: "10px", flexDirection: isMobile ? "column" : "row" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: "12px", background: "none",
                  border: "1px solid rgba(var(--admin-fg-rgb),calc(0.1 * var(--admin-fg-boost)))",
                  color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))",
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                disabled={savingId === deleteTarget.id}
                style={{
                  flex: 1, padding: "12px",
                  backgroundColor: "rgba(224,112,96,0.12)", border: "1px solid rgba(224,112,96,0.3)",
                  color: "#e07060", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: savingId === deleteTarget.id ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                {savingId === deleteTarget.id ? "Bezig…" : "Verwijderen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
