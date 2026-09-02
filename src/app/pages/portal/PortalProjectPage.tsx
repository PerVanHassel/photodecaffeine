import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Circle, Images, Star, MessageSquare } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface Deliverable {
  id: string;
  name: string;
  count: number;
  done: boolean;
}

interface GallerySettings {
  title?: string;
  subtitle?: string;
  coverUrl?: string;
  accentColor?: string;
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
  galleryUrls?: string[];
  gallerySettings?: GallerySettings;
}

interface Review {
  id: string;
  rating: number;
  text: string;
  published: boolean;
  updatedAt: string;
}

interface Engagement {
  reviewRequested: boolean;
  feedbackRequested: boolean;
  review: Review | null;
  feedbackCount: number;
}

interface Message {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "pdc";
  content: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  in_review: "In Review",
  in_progress: "In Progress",
  delivered: "Delivered",
  on_hold: "On Hold",
};

const STATUS_COLORS: Record<string, string> = {
  in_review: "#c8905a",
  in_progress: "rgba(255,251,224,0.65)",
  delivered: "rgba(120,190,140,0.9)",
  on_hold: "rgba(255,251,224,0.25)",
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PortalProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");

  // Review + feedback requests
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [editingReview, setEditingReview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || !id) return;

    portalFetch(`/portal/project/${id}`, {}, session.access_token)
      .then((data) => {
        setProject(data.project);
        setLoadingProject(false);
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
        setError("Project not found or access denied.");
        setLoadingProject(false);
      });

    portalFetch(`/portal/project/${id}/messages`, {}, session.access_token)
      .then((data) => {
        setMessages(data.messages || []);
        setLoadingMessages(false);
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        setLoadingMessages(false);
      });
  }, [session, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // What the studio has asked this client for, and what they already answered.
  useEffect(() => {
    if (!session || !id) return;
    portalFetch(`/portal/project/${id}/engagement`, {}, session.access_token)
      .then((data: Engagement) => {
        setEngagement(data);
        if (data.review) {
          setReviewRating(data.review.rating);
          setReviewText(data.review.text);
        }
      })
      .catch(() => {});
  }, [session, id]);

  // Poll for new messages every 30 seconds
  useEffect(() => {
    if (!session || !id) return;
    const interval = setInterval(() => {
      portalFetch(`/portal/project/${id}/messages`, {}, session.access_token)
        .then((data) => setMessages(data.messages || []))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [session, id]);

  const galleryUrls = project?.galleryUrls ?? [];
  const gallerySettings = project?.gallerySettings;

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !id || reviewRating < 1 || !reviewText.trim() || savingReview) return;
    setSavingReview(true);
    setReviewError("");
    try {
      const data = await portalFetch(
        `/portal/project/${id}/review`,
        { method: "POST", body: JSON.stringify({ rating: reviewRating, text: reviewText.trim() }) },
        session.access_token
      );
      setEngagement((prev) => (prev ? { ...prev, review: data.review } : prev));
      setEditingReview(false);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Review opslaan mislukt.");
    } finally {
      setSavingReview(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !session || !id) return;
    setSending(true);
    try {
      const data = await portalFetch(
        `/portal/project/${id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: newMessage.trim() }),
        },
        session.access_token
      );
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    setSending(false);
  }

  if (loadingProject) {
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
        Loading project…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <p style={{ color: "#e07060", fontSize: "14px" }}>{error || "Project not found."}</p>
        <button
          onClick={() => navigate("/portal/dashboard")}
          style={{
            background: "none",
            border: "1px solid rgba(255,251,224,0.1)",
            color: "rgba(255,251,224,0.4)",
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.in_progress;
  const statusLabel = STATUS_LABELS[project.status] || project.status;
  const done = project.deliverables?.filter((d) => d.done).length ?? 0;
  const total = project.deliverables?.length ?? 0;

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: isMobile ? "28px 16px 60px" : "56px 40px 80px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate("/portal/dashboard")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "rgba(255,251,224,0.3)",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
          padding: 0,
          marginBottom: "48px",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.3)")}
      >
        <ArrowLeft size={12} />
        All Projects
      </button>

      {/* Project header */}
      <div style={{ marginBottom: "56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span
            style={{
              color: statusColor,
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              border: `1px solid ${statusColor}33`,
              padding: "5px 10px",
              backgroundColor: `${statusColor}0a`,
            }}
          >
            {statusLabel}
          </span>
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
        <h1
          style={{
            color: "#fffbe0",
            fontSize: "clamp(24px, 3.5vw, 44px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          {project.title}
        </h1>
        <p
          style={{
            color: "rgba(255,251,224,0.35)",
            fontSize: "11px",
            fontWeight: 400,
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          Due {formatDate(project.dueDate)}
        </p>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 420px)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* LEFT: Info + Deliverables */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Description */}
          <div
            style={{
              border: "1px solid rgba(255,251,224,0.06)",
              padding: "32px",
              backgroundColor: "rgba(255,251,224,0.01)",
            }}
          >
            <div
              style={{
                color: "rgba(255,251,224,0.25)",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              Project Brief
            </div>
            <p
              style={{
                color: "rgba(255,251,224,0.55)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              {project.description}
            </p>
          </div>

          {/* Meeting */}
          {project.meeting?.date && (
            <div
              style={{
                border: "1px solid rgba(200,144,90,0.2)",
                padding: "32px",
                backgroundColor: "rgba(200,144,90,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
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
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div
                  style={{
                    color: "#c8905a",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                  }}
                >
                  {new Date(project.meeting.date) < new Date() ? "Past Meeting" : "Upcoming Meeting"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div
                    style={{
                      color: "rgba(255,251,224,0.3)",
                      fontSize: "9px",
                      fontWeight: 500,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Date & Time
                  </div>
                  <div style={{ color: "#fffbe0", fontSize: "14px", fontWeight: 500 }}>
                    {new Date(project.meeting.date).toLocaleString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {project.meeting.location && (
                  <div>
                    <div
                      style={{
                        color: "rgba(255,251,224,0.3)",
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Location
                    </div>
                    <div style={{ color: "rgba(255,251,224,0.6)", fontSize: "13px" }}>
                      {project.meeting.location}
                    </div>
                  </div>
                )}
                {project.meeting.link && (
                  <div>
                    <div
                      style={{
                        color: "rgba(255,251,224,0.3)",
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Meeting Link
                    </div>
                    <a
                      href={project.meeting.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#c8905a",
                        fontSize: "13px",
                        textDecoration: "none",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#fffbe0")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#c8905a")}
                    >
                      {project.meeting.link}
                    </a>
                  </div>
                )}
                {project.meeting.notes && (
                  <div>
                    <div
                      style={{
                        color: "rgba(255,251,224,0.3)",
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Notes
                    </div>
                    <div
                      style={{
                        color: "rgba(255,251,224,0.5)",
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      {project.meeting.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review request — shown only once the studio has asked for one */}
          {engagement?.reviewRequested && (
            <div
              style={{
                border: "1px solid rgba(200,144,90,0.28)",
                backgroundColor: "rgba(200,144,90,0.05)",
                padding: isMobile ? "22px 18px" : "28px",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "14px" }}>
                <Star size={12} />
                {engagement.review && !editingReview ? "Je review" : "Review achterlaten"}
              </div>

              {engagement.review && !editingReview ? (
                <>
                  <div style={{ display: "flex", gap: "3px", marginBottom: "14px" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={18} color="#c8905a" fill={n <= engagement.review!.rating ? "#c8905a" : "none"} strokeWidth={2} />
                    ))}
                  </div>
                  <p style={{ color: "rgba(255,251,224,0.65)", fontSize: "14px", lineHeight: 1.75, margin: "0 0 18px", whiteSpace: "pre-wrap" }}>
                    {engagement.review.text}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setEditingReview(true)}
                      style={{
                        background: "none", border: "1px solid rgba(255,251,224,0.15)",
                        color: "rgba(255,251,224,0.5)", fontSize: "10px", fontWeight: 600,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        padding: "10px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Aanpassen
                    </button>
                    <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "11.5px", lineHeight: 1.6 }}>
                      Bedankt! {engagement.review.published
                        ? "Je review staat op onze site."
                        : "PDC bekijkt hem voordat hij op de site komt."}
                    </span>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmitReview}>
                  <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "13.5px", lineHeight: 1.7, margin: "0 0 18px", maxWidth: "560px" }}>
                    We zijn benieuwd hoe je de samenwerking hebt ervaren. Met jouw goedkeuring plaatsen we je review op onze site.
                  </p>

                  <div
                    style={{ display: "flex", gap: "4px", marginBottom: "18px" }}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        aria-label={`${n} van 5 sterren`}
                        style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", lineHeight: 0 }}
                      >
                        <Star
                          size={28}
                          color="#c8905a"
                          fill={n <= (hoverRating || reviewRating) ? "#c8905a" : "none"}
                          strokeWidth={1.8}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    placeholder="Wat wil je anderen over PDC vertellen?"
                    style={{
                      width: "100%", backgroundColor: "rgba(255,251,224,0.03)",
                      border: "1px solid rgba(255,251,224,0.1)", color: "#fffbe0",
                      fontSize: "14px", fontFamily: "'Inter', sans-serif", fontWeight: 300,
                      padding: "13px 16px", outline: "none", boxSizing: "border-box", resize: "vertical",
                    }}
                  />

                  {reviewError && (
                    <p style={{ color: "#e07060", fontSize: "12.5px", margin: "12px 0 0" }}>{reviewError}</p>
                  )}

                  <div style={{ display: "flex", gap: "10px", marginTop: "18px", flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      disabled={reviewRating < 1 || !reviewText.trim() || savingReview}
                      style={{
                        backgroundColor: reviewRating < 1 || !reviewText.trim() || savingReview ? "rgba(255,251,224,0.08)" : "#fffbe0",
                        color: reviewRating < 1 || !reviewText.trim() || savingReview ? "rgba(255,251,224,0.3)" : "#080401",
                        border: "none", padding: "13px 26px",
                        fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
                        cursor: reviewRating < 1 || !reviewText.trim() || savingReview ? "not-allowed" : "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {savingReview ? "Versturen…" : engagement.review ? "Review bijwerken" : "Review versturen"}
                    </button>
                    {engagement.review && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReview(false);
                          setReviewRating(engagement.review!.rating);
                          setReviewText(engagement.review!.text);
                          setReviewError("");
                        }}
                        style={{
                          background: "none", border: "1px solid rgba(255,251,224,0.12)",
                          color: "rgba(255,251,224,0.4)", fontSize: "10px", fontWeight: 600,
                          letterSpacing: "0.15em", textTransform: "uppercase",
                          padding: "13px 22px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Annuleren
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Feedback request */}
          {engagement?.feedbackRequested && (
            <div
              style={{
                border: "1px solid rgba(255,251,224,0.1)",
                padding: isMobile ? "22px 18px" : "26px 28px",
                marginBottom: "24px",
                display: "flex", gap: "18px", alignItems: "flex-start", flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "12px" }}>
                  <MessageSquare size={12} />
                  Feedback gevraagd
                </div>
                <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "13.5px", lineHeight: 1.7, margin: 0 }}>
                  Laat opmerkingen achter bij losse foto&rsquo;s, bij meerdere tegelijk, of over de samenwerking in het algemeen.
                  {engagement.feedbackCount > 0 && ` Je hebt al ${engagement.feedbackCount} keer feedback gestuurd — aanvullen mag altijd.`}
                </p>
              </div>
              <button
                onClick={() => navigate(`/portal/project/${id}/feedback`)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  backgroundColor: "rgba(200,144,90,0.12)", border: "1px solid rgba(200,144,90,0.3)",
                  color: "#c8905a", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.15em", textTransform: "uppercase",
                  padding: "13px 22px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Feedback geven <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Deliverables */}
          {project.deliverables && project.deliverables.length > 0 && (
            <div
              style={{
                border: "1px solid rgba(255,251,224,0.06)",
                padding: "32px",
                backgroundColor: "rgba(255,251,224,0.01)",
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
                <div
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                  }}
                >
                  Deliverables
                </div>
                <span style={{ color: "rgba(255,251,224,0.25)", fontSize: "11px" }}>
                  {done} / {total} complete
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: "2px",
                  backgroundColor: "rgba(255,251,224,0.06)",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${total > 0 ? (done / total) * 100 : 0}%`,
                    backgroundColor: "#c8905a",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {project.deliverables.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {d.done ? (
                      <CheckCircle2 size={15} color="#c8905a" />
                    ) : (
                      <Circle size={15} color="rgba(255,251,224,0.15)" />
                    )}
                    <span
                      style={{
                        color: d.done ? "rgba(255,251,224,0.6)" : "rgba(255,251,224,0.35)",
                        fontSize: "13px",
                        fontWeight: 300,
                        textDecoration: d.done ? "line-through" : "none",
                        textDecorationColor: "rgba(255,251,224,0.2)",
                      }}
                    >
                      {d.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Gallery preview — links out to the dedicated full gallery page */}
          {galleryUrls.length > 0 && (
            <div
              onClick={() => navigate(`/portal/project/${id}/gallery`)}
              style={{
                position: "relative",
                minHeight: "220px",
                overflow: "hidden",
                cursor: "pointer",
                border: "1px solid rgba(255,251,224,0.06)",
              }}
            >
              <img
                src={gallerySettings?.coverUrl || galleryUrls[0]}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.5s ease",
                }}
                onMouseEnter={(e) => ((e.target as HTMLImageElement).style.transform = "scale(1.04)")}
                onMouseLeave={(e) => ((e.target as HTMLImageElement).style.transform = "scale(1)")}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(8,4,1,0.92) 0%, rgba(8,4,1,0.35) 60%, rgba(8,4,1,0.15) 100%)",
                }}
              />
              <div style={{ position: "relative", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: "220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: gallerySettings?.accentColor || "#c8905a", fontSize: "9px", fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "10px" }}>
                  <Images size={12} />
                  Photo Gallery
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <div style={{ color: "#fffbe0", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.01em", marginBottom: "4px" }}>
                      {gallerySettings?.title || "View Your Gallery"}
                    </div>
                    <div style={{ color: "rgba(255,251,224,0.45)", fontSize: "12px" }}>
                      {galleryUrls.length} {galleryUrls.length === 1 ? "photo" : "photos"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#fffbe0",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      border: "1px solid rgba(255,251,224,0.25)",
                      padding: "10px 16px",
                      flexShrink: 0,
                    }}
                  >
                    View Gallery <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Messages */}
        <div
          style={{
            border: "1px solid rgba(255,251,224,0.06)",
            backgroundColor: "rgba(255,251,224,0.01)",
            display: "flex",
            flexDirection: "column",
            height: isMobile ? "480px" : "600px",
          }}
        >
          {/* Messages header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,251,224,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
              Project Messages
            </span>
            <span
              style={{
                color: "rgba(255,251,224,0.15)",
                fontSize: "10px",
              }}
            >
              {messages.length}
            </span>
          </div>

          {/* Messages list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {loadingMessages && (
              <div
                style={{
                  textAlign: "center",
                  color: "rgba(255,251,224,0.2)",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding: "20px 0",
                }}
              >
                Loading…
              </div>
            )}

            {!loadingMessages && messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "rgba(255,251,224,0.15)",
                  fontSize: "12px",
                  lineHeight: 1.7,
                  padding: "20px 0",
                }}
              >
                No messages yet.
                <br />
                <span style={{ fontSize: "11px" }}>
                  Start the conversation below.
                </span>
              </div>
            )}

            {messages.map((msg) => {
              const isPDC = msg.senderRole === "pdc";
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* Sender row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      justifyContent: isPDC ? "flex-start" : "flex-end",
                    }}
                  >
                    {isPDC && (
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: "#3e250a",
                          border: "1px solid rgba(200,144,90,0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: "#c8905a", fontSize: "8px", fontWeight: 800 }}>P</span>
                      </div>
                    )}
                    <span
                      style={{
                        color: isPDC ? "#c8905a" : "rgba(255,251,224,0.4)",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                      }}
                    >
                      {isPDC ? "PDC Studio" : msg.senderName}
                    </span>
                    <span style={{ color: "rgba(255,251,224,0.15)", fontSize: "9px" }}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    style={{
                      alignSelf: isPDC ? "flex-start" : "flex-end",
                      maxWidth: "88%",
                      backgroundColor: isPDC
                        ? "rgba(200,144,90,0.06)"
                        : "rgba(255,251,224,0.04)",
                      border: `1px solid ${isPDC ? "rgba(200,144,90,0.12)" : "rgba(255,251,224,0.07)"}`,
                      padding: "12px 16px",
                    }}
                  >
                    <p
                      style={{
                        color: "rgba(255,251,224,0.7)",
                        fontSize: "13px",
                        fontWeight: 300,
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px 24px 16px",
              borderTop: "1px solid rgba(255,251,224,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message…"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(255,251,224,0.03)",
                    border: "1px solid rgba(255,251,224,0.08)",
                    color: "#fffbe0",
                    fontSize: "13px",
                    fontWeight: 300,
                    fontFamily: "'Inter', sans-serif",
                    padding: "10px 14px",
                    resize: "none",
                    outline: "none",
                    lineHeight: 1.5,
                    transition: "border-color 0.2s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,90,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,251,224,0.08)")}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                style={{
                  backgroundColor: sending || !newMessage.trim() ? "rgba(255,251,224,0.05)" : "#c8905a",
                  border: "none",
                  color: sending || !newMessage.trim() ? "rgba(255,251,224,0.2)" : "#080401",
                  width: "40px",
                  height: "40px",
                  cursor: sending || !newMessage.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                <Send size={14} />
              </button>
            </div>
            <p style={{ color: "rgba(255,251,224,0.15)", fontSize: "10px", margin: 0, letterSpacing: "0.04em" }}>
              Enter to send · Shift + Enter for new line
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}