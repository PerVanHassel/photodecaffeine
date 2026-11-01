import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { api } from "../studio/api";
import { QuoteDocument, QuoteFonts } from "../components/quote/QuoteDocument";
import { euroCents, sumLines, todayIso, vatSplit, type Business, type QuoteDoc } from "../components/quote/model";
import { LEGAL_VERSION } from "../lib/legalVersion";
import { policies } from "../lib/policies";
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
  // Each its own tick, none ticked beforehand: the terms ask for it this way.
  const [agreed, setAgreed] = useState(false);
  const [earlyStart, setEarlyStart] = useState(false);
  const [earlyStartEnd, setEarlyStartEnd] = useState(false);
  const [portfolio, setPortfolio] = useState(false);

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
    if (answer === "accepted" && !agreed) {
      setSendError("Vink eerst aan dat je akkoord gaat met de voorwaarden.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const data = await api<{ quote: Quote }>(`/quote/${id}/respond?t=${encodeURIComponent(token)}`, {
        method: "POST",
        anonymous: true,
        body: {
          answer, message, options: answer === "accepted" ? [...chosen] : [],
          termsAccepted: answer === "accepted" && agreed, earlyStart, earlyStartEnd, portfolio,
        },
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
  const expired = quote?.status === "sent" && !!quote.validUntil && quote.validUntil < todayIso();
  const open = quote?.status === "sent" && !expired;
  const consumer = quote?.details?.audience === "consumer";
  const withdrawn = quote?.details?.withdrawal;
  // The withdrawal link stays on the page during the 14 days of the cooling-off period.
  const canWithdraw = consumer && quote?.status === "accepted" && !withdrawn && !!quote.respondedAt && Date.now() - new Date(quote.respondedAt).getTime() < 14 * 86400000;
  const web = !!quote && (quote.type === "web" || !!quote.details?.services?.includes("web"));
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
                          ? "We hebben je een bevestiging gemaild. We nemen contact met je op om te starten. De eerste factuur volgt volgens de betaalafspraken hierboven."
                          : "Wil je toch iets aanpassen? Mail ons gerust, dan maken we een nieuwe versie."}
                      </p>
                      {withdrawn && <p className="pq-p">Je hebt deze overeenkomst herroepen op {new Date(withdrawn.at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}.</p>}
                      {canWithdraw && (
                        <p className="pq-p pq-quiet">
                          Je hebt 14 dagen bedenktijd.{" "}
                          <a className="pq-link" href={`/herroepen?offerte=${encodeURIComponent(quote.number || "")}&id=${quote.id}&t=${encodeURIComponent(token)}`}>Overeenkomst herroepen</a>
                        </p>
                      )}
                      <a className="pq-link" href={`mailto:${CONTACT}`}>{CONTACT}</a>
                    </>
                  ) : expired ? (
                    <>
                      <span className="pq-label">Verlopen</span>
                      <h2 id="pq-answer-title" className="pq-answer-title">Deze prijsopgave is verlopen.</h2>
                      <p className="pq-p pq-quiet">Wil je toch verder? Mail ons gerust, dan maken we een nieuwe.</p>
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
                          {answer === "accepted" && (
                            <div className="pq-consents">
                              <label className="pq-check">
                                <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setSendError(""); }} />
                                <span>Ik heb de prijsopgave en de voorwaarden gelezen en ga ermee akkoord.</span>
                              </label>
                              <p className="pq-p pq-quiet pq-small">
                                Voorwaarden, versie {LEGAL_VERSION}:{" "}
                                {[policies.terms, policies.rights, policies.cancel, policies.delivery, ...(web ? [policies.websites] : [])].map((p, i) => (
                                  <span key={p.path}>{i > 0 && " · "}<a className="pq-link" href={p.path} target="_blank" rel="noreferrer">{p.short}</a></span>
                                ))}
                              </p>
                              {consumer && (
                                <fieldset className="pq-fieldset">
                                  <legend>Bedenktijd (mag, hoeft niet)</legend>
                                  <p className="pq-p pq-quiet pq-small">Je hebt 14 dagen bedenktijd. Moeten we in die tijd al beginnen? Zet dan beide vinkjes. Zonder vinkjes beginnen we pas na de bedenktijd.</p>
                                  <label className="pq-check">
                                    <input type="checkbox" checked={earlyStart} onChange={(e) => setEarlyStart(e.target.checked)} />
                                    <span>Ik verzoek PDC uitdrukkelijk om vóór het einde van de bedenktijd van 14 dagen met de afgesproken diensten te beginnen. Ik begrijp dat ik bij herroeping tijdens die periode een evenredige vergoeding voor daadwerkelijk geleverde diensten verschuldigd kan zijn, voor zover de wet dat toestaat.</span>
                                  </label>
                                  <label className="pq-check">
                                    <input type="checkbox" checked={earlyStartEnd} onChange={(e) => setEarlyStartEnd(e.target.checked)} />
                                    <span>Ik begrijp dat mijn herroepingsrecht na volledige uitvoering van de diensten vervalt als aan de wettelijke voorwaarden voor vroege uitvoering is voldaan.</span>
                                  </label>
                                </fieldset>
                              )}
                              <fieldset className="pq-fieldset">
                                <legend>Portfolio (mag, hoeft niet)</legend>
                                <label className="pq-check">
                                  <input type="checkbox" checked={portfolio} onChange={(e) => setPortfolio(e.target.checked)} />
                                  <span>PDC mag het opgeleverde werk laten zien in het eigen portfolio op de website en op eigen social media. Dit is vrijwillig, verandert niets aan mijn prijs, en ik kan het altijd intrekken. Staan er anderen op, dan vraagt PDC hun toestemming apart.</span>
                                </label>
                              </fieldset>
                            </div>
                          )}
                          <div>
                            <button type="button" className="pq-btn" onClick={respond} disabled={sending} aria-busy={sending || undefined}>
                              {sending ? "Versturen…" : answer === "accepted" ? "Akkoord met betalingsverplichting" : "Antwoord versturen"}
                              <span className="pq-btn-ico" aria-hidden="true">→</span>
                            </button>
                          </div>
                          {answer === "accepted" && <p className="pq-p pq-quiet pq-small">Met deze knop ga je een overeenkomst aan waarvoor je moet betalen. Je krijgt meteen een bevestiging per mail.</p>}
                        </div>
                      )}
                      <p className="pq-p pq-quiet pq-small">Hoe we met je gegevens omgaan, lees je in onze <a className="pq-link" href={policies.privacy.path} target="_blank" rel="noreferrer">privacyverklaring</a>.</p>
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
