import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { portalFetch } from "../../lib/supabase";
import { QuoteDocument, type QuoteDoc } from "../components/quote/QuoteDocument";
import { useMobile } from "../hooks/useMobile";

interface Quote extends QuoteDoc {
  id: string;
  status: "draft" | "sent" | "accepted" | "declined";
  respondedAt?: string;
}

const ACCENT = "#c8905a";
const GREEN = "rgba(120,190,140,0.95)";

/**
 * The page the emailed quote links to, at /offerte/<id>?t=<token>.
 *
 * Quotes go to people who usually have no portal account, so the token in the
 * link is what stands in for a login. From here the client can say yes or no;
 * that answer lands in the admin panel and in the studio's inbox.
 */
export function QuotePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const isMobile = useMobile();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [answer, setAnswer] = useState<"accepted" | "declined" | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    portalFetch(`/quote/${id}?t=${encodeURIComponent(token)}`)
      .then((data) => {
        if (!cancelled) setQuote(data.quote);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Deze prijsopgave kon niet geladen worden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function respond() {
    if (!answer || sending) return;
    setSending(true);
    setSendError("");
    try {
      const data = await portalFetch(
        `/quote/${id}/respond?t=${encodeURIComponent(token)}`,
        { method: "POST", body: JSON.stringify({ answer, message }) }
      );
      setQuote(data.quote);
      setAnswer(null);
      setMessage("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Je reactie kon niet verstuurd worden.");
    } finally {
      setSending(false);
    }
  }

  const answered = quote?.status === "accepted" || quote?.status === "declined";

  const buttonBase: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    padding: "13px 24px",
    cursor: "pointer",
    background: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080401",
        padding: isMobile ? "28px 16px 60px" : "56px 24px 90px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Helmet>
        <title>Prijsopgave — PhotoDeCaffeine</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div style={{ maxWidth: "660px", margin: "0 auto" }}>
        <div
          style={{
            color: "rgba(255,251,224,0.25)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: "28px",
          }}
        >
          PhotoDeCaffeine
        </div>

        {loading && (
          <p style={{ color: "rgba(255,251,224,0.25)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Laden…
          </p>
        )}

        {!loading && error && (
          <div style={{ border: "1px solid rgba(224,112,96,0.25)", padding: "22px", color: "#e07060", fontSize: "14px", lineHeight: 1.7 }}>
            {error}
            <div style={{ color: "rgba(255,251,224,0.3)", fontSize: "13px", marginTop: "10px" }}>
              Klopt er iets niet? Mail{" "}
              <a href="mailto:contact@photodecaffeine.com" style={{ color: ACCENT }}>
                contact@photodecaffeine.com
              </a>
              .
            </div>
          </div>
        )}

        {!loading && quote && (
          <>
            <QuoteDocument quote={quote} />

            <section style={{ marginTop: "32px", borderTop: "1px solid rgba(255,251,224,0.07)", paddingTop: "26px" }}>
              {answered ? (
                <div
                  style={{
                    border: `1px solid ${quote.status === "accepted" ? "rgba(120,190,140,0.25)" : "rgba(255,251,224,0.1)"}`,
                    backgroundColor: quote.status === "accepted" ? "rgba(120,190,140,0.07)" : "rgba(255,251,224,0.02)",
                    padding: "20px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: quote.status === "accepted" ? GREEN : "rgba(255,251,224,0.55)" }}>
                    {quote.status === "accepted"
                      ? "Je bent akkoord gegaan. We nemen contact met je op om te starten."
                      : "Je hebt aangegeven niet akkoord te gaan. Wil je toch iets aanpassen? Mail ons gerust."}
                  </p>
                  <a
                    href="mailto:contact@photodecaffeine.com"
                    style={{ color: ACCENT, fontSize: "12px", textDecoration: "none", display: "inline-block", marginTop: "12px" }}
                  >
                    contact@photodecaffeine.com
                  </a>
                </div>
              ) : (
                <>
                  <p style={{ color: "rgba(255,251,224,0.45)", fontSize: "13px", lineHeight: 1.7, margin: "0 0 16px" }}>
                    Laat hieronder weten wat je ervan vindt. Je kunt er een bericht bij zetten — een vraag of een aanpassing mag ook.
                  </p>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                    <button
                      type="button"
                      onClick={() => setAnswer("accepted")}
                      style={{
                        ...buttonBase,
                        border: `1px solid ${answer === "accepted" ? "rgba(120,190,140,0.7)" : "rgba(120,190,140,0.3)"}`,
                        backgroundColor: answer === "accepted" ? "rgba(120,190,140,0.14)" : "transparent",
                        color: GREEN,
                      }}
                    >
                      Ik ga akkoord
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer("declined")}
                      style={{
                        ...buttonBase,
                        border: `1px solid ${answer === "declined" ? "rgba(255,251,224,0.35)" : "rgba(255,251,224,0.12)"}`,
                        backgroundColor: answer === "declined" ? "rgba(255,251,224,0.06)" : "transparent",
                        color: "rgba(255,251,224,0.6)",
                      }}
                    >
                      Nog niet
                    </button>
                  </div>

                  {answer && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <label htmlFor="quote-message" style={{ color: "rgba(255,251,224,0.3)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase" }}>
                        Bericht (optioneel)
                      </label>
                      <textarea
                        id="quote-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Bijvoorbeeld: wanneer kunnen we starten?"
                        style={{
                          width: "100%",
                          backgroundColor: "rgba(255,251,224,0.03)",
                          border: "1px solid rgba(255,251,224,0.1)",
                          color: "#fffbe0",
                          fontSize: "14px",
                          fontFamily: "'Inter', sans-serif",
                          padding: "12px 14px",
                          outline: "none",
                          boxSizing: "border-box",
                          resize: "vertical",
                        }}
                      />
                      <div>
                        <button
                          type="button"
                          onClick={respond}
                          disabled={sending}
                          style={{
                            ...buttonBase,
                            border: "none",
                            backgroundColor: ACCENT,
                            color: "#0d0703",
                            opacity: sending ? 0.6 : 1,
                            cursor: sending ? "not-allowed" : "pointer",
                          }}
                        >
                          {sending ? "Versturen…" : "Versturen"}
                        </button>
                      </div>
                    </div>
                  )}

                  {sendError && (
                    <p style={{ color: "#e07060", fontSize: "13px", marginTop: "12px" }}>{sendError}</p>
                  )}
                </>
              )}
            </section>

            <p style={{ color: "rgba(255,251,224,0.2)", fontSize: "11px", lineHeight: 1.8, marginTop: "36px" }}>
              PhotoDeCaffeine Productions · contact@photodecaffeine.com
            </p>
          </>
        )}
      </div>
    </div>
  );
}
