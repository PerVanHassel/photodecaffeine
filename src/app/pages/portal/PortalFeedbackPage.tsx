import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { ArrowLeft, Check, Plus, X, Images, MessageSquare, Send } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

interface Project {
  id: string;
  title: string;
  galleryUrls?: string[];
}

/** A note the client has composed but not yet sent. */
interface DraftNote {
  key: string;
  photoUrls: string[];
  category: string;
  text: string;
}

// Starting points for remarks that aren't about a specific photo. The client
// can always type their own instead — the backend stores whatever comes in.
const GENERAL_CATEGORIES = [
  "Klantvriendelijkheid",
  "Communicatie",
  "Planning & tijden",
  "Prijs / kwaliteit",
  "Portaal & website",
  "Anders",
];

export function PortalFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState<DraftNote[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [photoText, setPhotoText] = useState("");
  const [category, setCategory] = useState(GENERAL_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [generalText, setGeneralText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!session || !id) return;
    setLoading(true);
    portalFetch(`/portal/project/${id}`, {}, session.access_token)
      .then((data) => setProject(data.project))
      .catch(() => setError("Dit project kon niet geladen worden."))
      .finally(() => setLoading(false));
  }, [session, id]);

  const photos = project?.galleryUrls ?? [];

  function togglePhoto(url: string) {
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  }

  function addPhotoNote() {
    if (!photoText.trim() || selected.length === 0) return;
    setNotes((prev) => [
      ...prev,
      { key: crypto.randomUUID(), photoUrls: selected, category: "", text: photoText.trim() },
    ]);
    setSelected([]);
    setPhotoText("");
  }

  function addGeneralNote() {
    if (!generalText.trim()) return;
    const label = category === "Anders" ? customCategory.trim() || "Anders" : category;
    setNotes((prev) => [
      ...prev,
      { key: crypto.randomUUID(), photoUrls: [], category: label, text: generalText.trim() },
    ]);
    setGeneralText("");
    setCustomCategory("");
  }

  async function submit() {
    if (!session || !id || notes.length === 0 || sending) return;
    setSending(true);
    setError("");
    try {
      await portalFetch(
        `/portal/project/${id}/feedback`,
        {
          method: "POST",
          body: JSON.stringify({
            items: notes.map((n) => ({ photoUrls: n.photoUrls, category: n.category, text: n.text })),
          }),
        },
        session.access_token
      );
      setSent(true);
      setNotes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setSending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,251,224,0.03)",
    border: "1px solid rgba(255,251,224,0.1)",
    color: "#fffbe0",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 300,
    padding: "13px 16px",
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
  };

  const eyebrow: React.CSSProperties = {
    color: "#c8905a",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const addButton: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "7px",
    backgroundColor: "rgba(200,144,90,0.12)", border: "1px solid rgba(200,144,90,0.3)",
    color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
    padding: "11px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif", marginTop: "12px",
  };

  const wrap: React.CSSProperties = {
    maxWidth: "900px",
    margin: "0 auto",
    padding: isMobile ? "28px 16px 60px" : "56px 40px 80px",
    fontFamily: "'Inter', sans-serif",
  };

  if (loading) {
    return <div style={{ ...wrap, color: "rgba(255,251,224,0.3)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase" }}>Laden…</div>;
  }

  if (!project) {
    return (
      <div style={wrap}>
        <div style={{ color: "#e07060", fontSize: "14px" }}>{error || "Project niet gevonden."}</div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <button
        onClick={() => navigate(`/portal/project/${id}`)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "8px",
          color: "rgba(255,251,224,0.3)", fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif", padding: 0, marginBottom: "40px",
        }}
      >
        <ArrowLeft size={12} />
        Terug naar project
      </button>

      <div style={{ marginBottom: "40px" }}>
        <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "12px" }}>
          Feedback
        </div>
        <h1 style={{ color: "#fffbe0", fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px", lineHeight: 1.15 }}>
          {project.title}
        </h1>
        <p style={{ color: "rgba(255,251,224,0.4)", fontSize: "14px", lineHeight: 1.75, margin: 0, maxWidth: "620px" }}>
          Laat opmerkingen achter bij losse foto&rsquo;s, bij meerdere foto&rsquo;s tegelijk, of over de samenwerking in het
          algemeen. Je kunt zoveel opmerkingen toevoegen als je wilt en verstuurt ze in één keer.
        </p>
      </div>

      {sent && (
        <div style={{
          border: "1px solid rgba(120,190,140,0.3)", backgroundColor: "rgba(120,190,140,0.07)",
          padding: "18px 20px", marginBottom: "32px",
          display: "flex", alignItems: "flex-start", gap: "12px",
        }}>
          <Check size={16} color="rgba(120,190,140,0.9)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ color: "rgba(120,190,140,0.95)", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Bedankt, je feedback is verstuurd.</div>
            <div style={{ color: "rgba(255,251,224,0.4)", fontSize: "12.5px", lineHeight: 1.6 }}>
              We nemen het door en komen er zo nodig op terug. Wil je later nog iets toevoegen, dan kan dat gewoon hieronder.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ border: "1px solid rgba(224,112,96,0.25)", color: "#e07060", fontSize: "13px", padding: "12px 16px", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Notes about photos */}
      {photos.length > 0 && (
        <section style={{ marginBottom: "48px" }}>
          <div style={eyebrow}><Images size={12} /> Opmerking bij foto&rsquo;s</div>
          <p style={{ color: "rgba(255,251,224,0.35)", fontSize: "13px", lineHeight: 1.7, margin: "0 0 18px" }}>
            Klik de foto&rsquo;s aan waar je opmerking over gaat — één foto of meerdere tegelijk.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "90px" : "116px"}, 1fr))`,
            gap: "8px", marginBottom: "18px",
          }}>
            {photos.map((url, i) => {
              const isSelected = selected.includes(url);
              return (
                <button
                  key={url}
                  onClick={() => togglePhoto(url)}
                  aria-pressed={isSelected}
                  aria-label={`Foto ${i + 1}${isSelected ? " (geselecteerd)" : ""}`}
                  style={{
                    position: "relative", padding: 0, cursor: "pointer",
                    border: isSelected ? "2px solid #c8905a" : "1px solid rgba(255,251,224,0.12)",
                    background: "none", aspectRatio: "1 / 1", overflow: "hidden",
                  }}
                >
                  <img src={url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isSelected ? 1 : 0.72, display: "block" }} />
                  {isSelected && (
                    <span style={{
                      position: "absolute", top: "5px", right: "5px",
                      backgroundColor: "#c8905a", color: "#0d0703",
                      width: "19px", height: "19px", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <textarea
            value={photoText}
            onChange={(e) => setPhotoText(e.target.value)}
            rows={3}
            placeholder={
              selected.length === 0
                ? "Selecteer eerst één of meer foto's hierboven…"
                : `Wat wil je kwijt over deze ${selected.length} foto${selected.length === 1 ? "" : "'s"}?`
            }
            style={inputStyle}
          />
          <button
            onClick={addPhotoNote}
            disabled={selected.length === 0 || !photoText.trim()}
            style={{
              ...addButton,
              opacity: selected.length === 0 || !photoText.trim() ? 0.4 : 1,
              cursor: selected.length === 0 || !photoText.trim() ? "not-allowed" : "pointer",
            }}
          >
            <Plus size={12} />
            Opmerking toevoegen
          </button>
        </section>
      )}

      {/* General notes */}
      <section style={{ marginBottom: "48px" }}>
        <div style={eyebrow}><MessageSquare size={12} /> Algemene opmerking</div>
        <p style={{ color: "rgba(255,251,224,0.35)", fontSize: "13px", lineHeight: 1.7, margin: "0 0 18px" }}>
          Over de samenwerking zelf — bijvoorbeeld klantvriendelijkheid, communicatie of planning.
        </p>

        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "14px" }}>
          {GENERAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                backgroundColor: category === cat ? "rgba(200,144,90,0.15)" : "transparent",
                border: `1px solid ${category === cat ? "rgba(200,144,90,0.45)" : "rgba(255,251,224,0.12)"}`,
                color: category === cat ? "#c8905a" : "rgba(255,251,224,0.45)",
                fontSize: "11px", fontWeight: 500, padding: "8px 13px",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {category === "Anders" && (
          <input
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Waar gaat het over?"
            style={{ ...inputStyle, marginBottom: "12px" }}
          />
        )}

        <textarea
          value={generalText}
          onChange={(e) => setGeneralText(e.target.value)}
          rows={3}
          placeholder="Wat wil je ons laten weten?"
          style={inputStyle}
        />
        <button
          onClick={addGeneralNote}
          disabled={!generalText.trim()}
          style={{ ...addButton, opacity: generalText.trim() ? 1 : 0.4, cursor: generalText.trim() ? "pointer" : "not-allowed" }}
        >
          <Plus size={12} />
          Opmerking toevoegen
        </button>
      </section>

      {/* Composed notes + send */}
      <section style={{ borderTop: "1px solid rgba(255,251,224,0.08)", paddingTop: "32px" }}>
        <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "16px" }}>
          Klaar om te versturen — {notes.length} opmerking{notes.length === 1 ? "" : "en"}
        </div>

        {notes.length === 0 ? (
          <p style={{ color: "rgba(255,251,224,0.25)", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
            Je hebt nog niets toegevoegd. Voeg hierboven een opmerking toe; hij verschijnt dan hier.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notes.map((n) => (
              <div
                key={n.key}
                style={{
                  border: "1px solid rgba(255,251,224,0.1)", backgroundColor: "rgba(255,251,224,0.02)",
                  padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
                    {n.photoUrls.length > 0
                      ? `${n.photoUrls.length} foto${n.photoUrls.length === 1 ? "" : "'s"}`
                      : n.category}
                  </div>
                  {n.photoUrls.length > 0 && (
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "9px" }}>
                      {n.photoUrls.map((url) => (
                        <img key={url} src={url} alt="" style={{ width: "44px", height: "44px", objectFit: "cover", border: "1px solid rgba(255,251,224,0.12)" }} />
                      ))}
                    </div>
                  )}
                  <div style={{ color: "rgba(255,251,224,0.65)", fontSize: "13.5px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.text}</div>
                </div>
                <button
                  onClick={() => setNotes((prev) => prev.filter((x) => x.key !== n.key))}
                  aria-label="Opmerking verwijderen"
                  style={{ background: "none", border: "none", color: "rgba(255,251,224,0.3)", cursor: "pointer", padding: "2px", flexShrink: 0 }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={submit}
          disabled={notes.length === 0 || sending}
          style={{
            display: "flex", alignItems: "center", gap: "9px",
            backgroundColor: notes.length === 0 || sending ? "rgba(255,251,224,0.08)" : "#fffbe0",
            color: notes.length === 0 || sending ? "rgba(255,251,224,0.3)" : "#080401",
            border: "none", padding: "15px 30px", marginTop: "28px",
            fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
            cursor: notes.length === 0 || sending ? "not-allowed" : "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Send size={13} />
          {sending ? "Versturen…" : "Feedback versturen"}
        </button>
      </section>
    </div>
  );
}
