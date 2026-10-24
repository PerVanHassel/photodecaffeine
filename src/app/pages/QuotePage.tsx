import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { api } from "../studio/api";
import { QuoteDocument, QuoteFonts } from "../components/quote/QuoteDocument";
import { euroCents, sumLines, vatSplit, type Business, type QuoteDoc } from "../components/quote/model";
import "../components/quote/quote.css";

interface Quote extends QuoteDoc {
  id: string;
  status: "draft" | "sent" | "accepted" | "declined" | "replaced";
  respondedAt?: string;
  replacedBy?: { number: string; link: string } | null;
}

const CONTACT = "contact@photodecaffeine.com";

/**
 * The page the emailed quote links to, at /offerte/<id>?t=<token>.
 *
 * Quotes go to people who usually have no portal account, so the token in the
 * link is what stands in for a login. From here the client ticks the options
 * they want, says yes or no, or prints the quote; the answer lands in the
 * admin panel and in the studio's inbox.
 */
export function QuotePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const preview = params.get("preview") === "1";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState<"accepted" | "declined" | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ quote: Quote; business?: Business }>(`/quote/${id}?t=${encodeURIComponent(token)}${preview ? "&preview=1" : ""}`, { anonymous: true })
      .then((data) => {
        if (cancelled) return;
        setQuote(data.quote);
        setBusiness(data.business || null);
        setChosen(new Set(data.quote.details?.accepted?.options || []));
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
  }, [id, token, preview]);

  async function respond() {
    if (!answer || sending) return;
    setSending(true);
    setSendError("");
    try {
      const data = await api<{ quote: Quote }>(`/quote/${id}/respond?t=${encodeURIComponent(token)}`, {
        method: "POST",
        anonymous: true,
        body: { answer, message, options: answer === "accepted" ? [...chosen] : [] },
      });
      setQuote((q) => ({ ...data.quote, replacedBy: q?.replacedBy ?? null }));
      setAnswer(null);
      setMessage("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Je reactie kon niet verstuurd worden.");
    } finally {
      setSending(false);
    }
  }

  const answered = quote?.status === "accepted" || quote?.status === "declined";
  const open = quote?.status === "sent";
  const hasOptions = !!quote && [...quote.oneTime, ...quote.monthly].some((l) => l.optional);
  const toggle = (key: string) => setChosen((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });
  const totals = useMemo(() => {
    if (!quote) return null;
    const rate = typeof quote.vatRate === "number" ? quote.vatRate : 21;
    const basis = quote.vatBasis === "incl" ? "incl" : "excl";
    return {
      oneTime: vatSplit(sumLines(quote.oneTime, "o", chosen), basis, rate),
      monthly: vatSplit(sumLines(quote.monthly, "m", chosen), basis, rate),
    };
  }, [quote, chosen]);

  return (
    <div className="pq-page">
      <Helmet>
        <title>{quote ? `Prijsopgave ${quote.number} | PhotoDeCaffeine` : "Prijsopgave | PhotoDeCaffeine"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <QuoteFonts />
      <div className="pq-grain" aria-hidden="true" />

      <header className="pq-island pq-no-print">
        <span className="pq-island-mark">PhotoDeCaffeine</span>
        {quote && (
          <button type="button" className="pq-btn ghost sm" onClick={() => window.print()}>
            Printen of opslaan als pdf
            <span className="pq-btn-ico" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z" /></svg>
            </span>
          </button>
        )}
      </header>

      <main className="pq-main">
        {loading && (
          <div className="pq pq-loading" role="status" aria-busy="true">
            <span className="pq-skel" style={{ width: 140 }} />
            <span className="pq-skel" style={{ width: "62%", height: 44, marginTop: 64 }} />
            <span className="pq-skel" style={{ width: "40%", marginTop: 16 }} />
            <span className="pq-skel" style={{ width: "100%", height: 220, marginTop: 48, borderRadius: 22 }} />
          </div>
        )}

        {!loading && error && (
          <div className="pq pq-msg" role="alert">
            <span className="pq-label">Prijsopgave</span>
            <h1 className="pq-title" style={{ fontSize: 34 }}>{error}</h1>
            <p className="pq-p pq-quiet" style={{ marginTop: 14 }}>
              Klopt er iets niet? Mail <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          </div>
        )}

        {!loading && quote && (
          <>
            {quote.status === "replaced" && (
              <div className="pq-banner pq-no-print" role="status">
                <span>Deze prijsopgave is vervangen{quote.replacedBy ? ` door ${quote.replacedBy.number}` : ""}. Je kunt hem nog lezen, maar niet meer accepteren.</span>
                {quote.replacedBy && (
                  <a className="pq-btn sm" href={new URL(quote.replacedBy.link).pathname + new URL(quote.replacedBy.link).search}>
                    Naar de nieuwe<span className="pq-btn-ico" aria-hidden="true">→</span>
                  </a>
                )}
              </div>
            )}

            <QuoteDocument quote={quote} business={business} animate chosen={chosen} onToggleOption={open ? toggle : undefined} />

            <section className="pq-answer pq-no-print" aria-labelledby="pq-answer-title">
              <div className="pq-bezel">
                <div className="pq-core pq-answer-core">
                  {answered ? (
                    <>
                      <span className="pq-label">Jouw antwoord</span>
                      <h2 id="pq-answer-title" className="pq-answer-title">
                        {quote.status === "accepted" ? "Je bent akkoord. Dank je wel!" : "Je gaat nog niet akkoord."}
                      </h2>
                      <p className="pq-p pq-quiet">
                        {quote.status === "accepted"
                          ? "We nemen contact met je op om te starten. De eerste factuur volgt volgens de betaalafspraken hierboven."
                          : "Wil je toch iets aanpassen? Mail ons gerust, dan maken we een nieuwe versie."}
                      </p>
                      <a className="pq-link" href={`mailto:${CONTACT}`}>{CONTACT}</a>
                    </>
                  ) : open ? (
                    <>
                      <span className="pq-label">Jouw antwoord</span>
                      <h2 id="pq-answer-title" className="pq-answer-title">Wat vind je ervan?</h2>
                      <p className="pq-p pq-quiet">Je kunt er een bericht bij zetten. Een vraag of een aanpassing mag ook.</p>

                      {hasOptions && totals && (() => {
                        // A business reads prices without VAT, a private client with.
                        const side = quote.details?.audience === "consumer" ? "incl" : "excl";
                        return (
                          <div className="pq-chosen">
                            <span>Met je keuzes</span>
                            <b>{euroCents(totals.oneTime[side])} <small>eenmalig {side}. btw</small></b>
                            {totals.monthly.incl > 0 && <b>{euroCents(totals.monthly[side])} <small>per maand {side}. btw</small></b>}
                          </div>
                        );
                      })()}

                      <div className="pq-answer-buttons" role="group" aria-label="Je antwoord">
                        <button type="button" className={`pq-choice${answer === "accepted" ? " on" : ""}`} aria-pressed={answer === "accepted"} onClick={() => setAnswer("accepted")}>
                          <span className="pq-choice-dot" aria-hidden="true" />Ik ga akkoord
                        </button>
                        <button type="button" className={`pq-choice${answer === "declined" ? " on" : ""}`} aria-pressed={answer === "declined"} onClick={() => setAnswer("declined")}>
                          <span className="pq-choice-dot" aria-hidden="true" />Nog niet
                        </button>
                      </div>

                      {answer && (
                        <div className="pq-answer-form">
                          <label htmlFor="pq-message" className="pq-label">Bericht (optioneel)</label>
                          <textarea
                            id="pq-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            name="message"
                            autoComplete="off"
                            placeholder={answer === "accepted" ? "Bijvoorbeeld: wanneer kunnen we starten?" : "Bijvoorbeeld: wat er anders moet"}
                          />
                          <div>
                            <button type="button" className="pq-btn" onClick={respond} disabled={sending} aria-busy={sending || undefined}>
                              {sending ? "Versturen…" : answer === "accepted" ? "Akkoord versturen" : "Antwoord versturen"}
                              <span className="pq-btn-ico" aria-hidden="true">→</span>
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="pq-p pq-quiet pq-small">Met je akkoord ga je ook akkoord met onze <a className="pq-link" href="/algemene-voorwaarden" target="_blank" rel="noreferrer">algemene voorwaarden</a> en het beleid op de website.</p>
                      {sendError && <p role="alert" className="pq-error">{sendError}</p>}
                    </>
                  ) : (
                    <>
                      <span className="pq-label">Vragen?</span>
                      <p className="pq-p pq-quiet">Mail <a className="pq-link" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
